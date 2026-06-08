"""MYOB connector — maps a MYOB AccountRight/Essentials Contact to a Cleared customer."""

from __future__ import annotations

from ..models import Customer, EntityType, PartyRole

NAME = "myob"
LABEL = "MYOB"
DESCRIPTION = "Map a MYOB Contact to a customer and assess it."


def to_customer(contact: dict) -> Customer:
    is_individual = bool(contact.get("IsIndividual"))
    first, last = contact.get("FirstName"), contact.get("LastName")
    company = contact.get("CompanyName")
    name = (company if not is_individual else " ".join(p for p in [first, last] if p)) or company or "Unknown contact"
    addr = contact.get("Addresses", [{}])
    a = addr[0] if addr else {}
    address_parts = [a.get("Street"), a.get("City"), a.get("State"), a.get("PostCode"), a.get("Country")]
    address = ", ".join(p for p in address_parts if p) or None
    return Customer(
        name=name,
        entity_type=EntityType.individual if is_individual else EntityType.company,
        role=PartyRole.client,
        address=address,
        abn_or_acn=contact.get("ABN"),
        notes="Imported from MYOB.",
        external_ref=contact.get("UID"),
        source="myob",
    )
