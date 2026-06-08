# Integrating with Cleared

Cleared is API-first. Push a contact from Xero, MYOB, a CRM, a spreadsheet or your own
code, and get back a cited, audit-ready CDD record. Adding a new system is one mapper file.

## 1. Get an API key

Sign in → **Integrations** → **Create key** (or `POST /api/keys`). The key is shown once.
Authenticate machine-to-machine calls with the `X-API-Key` header:

```
X-API-Key: cak_xxxxxxxxxxxxxxxxxxxxxxxx
```

(The web app uses a JWT bearer token instead; the API accepts either.)

## 2. Assess a contact from a connector

```
POST /api/integrations/{provider}/assess     # provider: xero | myob | generic
```

Send the provider's contact object as the JSON body. Cleared maps it to a customer, runs
CDD (screening + grounded risk assessment), saves the record, and returns it.

```bash
curl -X POST http://localhost:8000/api/integrations/xero/assess \
  -H "X-API-Key: $CLEARED_KEY" -H "Content-Type: application/json" \
  -d '{"ContactID":"abc-123","Name":"Acme Pty Ltd","CompanyNumber":"600111222"}'
```

Bulk import a list of contacts:

```
POST /api/integrations/{provider}/import      # body: [ {contact}, {contact}, ... ]
```

## 3. Correlate back to your system

Every record carries the source system's id (`external_ref`) and `source`. Look up later:

```
GET /api/records?external_ref=abc-123
```

## Connectors

| name      | maps from                                  |
|-----------|--------------------------------------------|
| `xero`    | Xero Accounting API Contact                |
| `myob`    | MYOB AccountRight / Essentials Contact     |
| `generic` | a normalized contact shape (any system)    |

The `generic` shape (only `name` is required):

```json
{
  "name": "Acme Pty Ltd",
  "entity_type": "company",
  "role": "client",
  "address": "1 Example St, Sydney NSW 2000",
  "abn_or_acn": "600 111 222",
  "transaction_value_aud": 8900000,
  "funds_source": "...",
  "notes": "...",
  "external_ref": "crm-123",
  "source": "my-crm",
  "beneficial_owners": [{"name": "...", "role": "director", "is_pep": false}]
}
```

## Add a new connector

Drop a module in `cleared/cleared/connectors/` exposing `NAME`, `LABEL`, `DESCRIPTION` and
`to_customer(payload: dict) -> Customer`, then register it in `connectors/__init__.py`.
That's the whole integration — the assess/import endpoints and key auth come for free.

## Notes

- OAuth token handling (e.g. Xero's OAuth2) stays on the caller's side; Cleared receives the
  contact payload. A future release can add server-side OAuth + scheduled sync + outbound
  webhooks (notify your system when an assessment completes).
- Full interactive API reference: **`/docs`** (OpenAPI).
