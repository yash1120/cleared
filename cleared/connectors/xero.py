"""Xero connector — maps a Xero Accounting API Contact to a Cleared customer.

Push a Xero Contact object (as returned by GET /api.xro/2.0/Contacts) to
POST /api/integrations/xero/assess. OAuth2 token handling lives on the caller's side.
"""

from __future__ import annotations

from ..models import Customer, EntityType, PartyRole

NAME = "xero"
LABEL = "Xero"
DESCRIPTION = "Map a Xero Contact (Accounting API) to a customer and assess it."


def _address(contact: dict) -> str | None:
    for a in contact.get("Addresses", []) or []:
        parts = [a.get("AddressLine1"), a.get("City"), a.get("Region"), a.get("PostalCode"), a.get("Country")]
        joined = ", ".join(p for p in parts if p)
        if joined:
            return joined
    return None


def to_customer(contact: dict) -> Customer:
    first, last = contact.get("FirstName"), contact.get("LastName")
    org_name = contact.get("Name")
    is_individual = bool(first or last) and not (org_name and org_name != f"{first or ''} {last or ''}".strip())
    name = org_name or " ".join(p for p in [first, last] if p) or "Unknown contact"
    email = contact.get("EmailAddress")
    return Customer(
        name=name,
        entity_type=EntityType.individual if is_individual else EntityType.company,
        role=PartyRole.client,
        address=_address(contact),
        abn_or_acn=contact.get("CompanyNumber") or contact.get("TaxNumber"),
        notes=f"Imported from Xero{f'; contact email {email}' if email else ''}.",
        external_ref=contact.get("ContactID"),
        source="xero",
    )
