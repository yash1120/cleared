"""Generic connector — a normalized contact shape any system can map to.

Send JSON like:
  {"name": "...", "entity_type": "company", "role": "client", "address": "...",
   "abn_or_acn": "...", "transaction_value_aud": 0, "funds_source": "...", "notes": "...",
   "external_ref": "crm-123", "source": "my-crm", "beneficial_owners": [...] }
Only `name` is required; everything else has sensible defaults.
"""

from __future__ import annotations

from ..models import BeneficialOwner, Customer, EntityType, PartyRole

_ENTITY = {e.value for e in EntityType}
_ROLE = {r.value for r in PartyRole}


def _coerce_owners(raw) -> list[BeneficialOwner]:
    owners = []
    for o in raw or []:
        if isinstance(o, dict) and o.get("name"):
            owners.append(
                BeneficialOwner(
                    name=o["name"], role=o.get("role", "beneficial owner"),
                    ownership_percent=o.get("ownership_percent"), country=o.get("country"),
                    is_pep=bool(o.get("is_pep", False)), notes=o.get("notes"),
                )
            )
    return owners


NAME = "generic"
LABEL = "Generic CRM / contact"
DESCRIPTION = "A normalized contact shape — map any system (CRM, spreadsheet, webhook) to this."


def to_customer(c: dict) -> Customer:
    et = c.get("entity_type", "individual")
    role = c.get("role", "client")
    return Customer(
        name=c.get("name") or "Unknown contact",
        entity_type=EntityType(et) if et in _ENTITY else EntityType.individual,
        role=PartyRole(role) if role in _ROLE else PartyRole.client,
        country=c.get("country", "Australia"),
        address=c.get("address"),
        abn_or_acn=c.get("abn_or_acn"),
        identification_provided=c.get("identification_provided", []) or [],
        beneficial_owners=_coerce_owners(c.get("beneficial_owners")),
        transaction_value_aud=c.get("transaction_value_aud"),
        cash_component_aud=c.get("cash_component_aud"),
        funds_source=c.get("funds_source"),
        notes=c.get("notes"),
        external_ref=c.get("external_ref"),
        source=c.get("source", "generic"),
    )
