"""Sample customers that exercise the spread of risk outcomes, for the demo + eval."""

from __future__ import annotations

from .models import BeneficialOwner, Customer, EntityType, PartyRole


def clean_individual() -> Customer:
    """Low risk: local salaried vendor selling the family home, ID provided."""
    return Customer(
        name="Sarah Thompson",
        entity_type=EntityType.individual,
        role=PartyRole.vendor,
        date_of_birth="1981-04-12",
        address="14 Wattle St, Marrickville NSW 2204",
        country="Australia",
        identification_provided=["drivers_licence", "medicare"],
        property_address="14 Wattle St, Marrickville NSW 2204",
        transaction_value_aud=1_450_000,
        funds_source="Owner-occupier sale; salaried nurse, 11 years at one address",
        notes="Long-standing owner-occupier. Routine sale via mortgage discharge.",
    )


def company_with_offshore_owner() -> Customer:
    """Higher risk: company purchaser with an offshore beneficial owner who is a flagged PEP."""
    return Customer(
        name="Citadel Holdings Pty Ltd",
        entity_type=EntityType.company,
        role=PartyRole.purchaser,
        country="Australia",
        abn_or_acn="ACN 600 111 222",
        identification_provided=["asic_extract"],
        property_address="Penthouse, 1 Circular Quay, Sydney NSW 2000",
        transaction_value_aud=8_900_000,
        funds_source="Stated as 'overseas family investment funds' — not evidenced",
        beneficial_owners=[
            BeneficialOwner(
                name="Mariana Costa Ribeiro",
                role="ultimate shareholder >=25%",
                ownership_percent=60,
                country="Overseas",
                is_pep=True,
                notes="Holds via two intermediate offshore entities",
            ),
            BeneficialOwner(
                name="Daniel Osei",
                role="director",
                ownership_percent=40,
                country="Australia",
            ),
        ],
        notes="Layered offshore ownership; source of funds asserted but not evidenced.",
    )


def smsf_overseas_funds() -> Customer:
    """High risk: SMSF purchaser, opaque structure, large unexplained overseas transfer."""
    return Customer(
        name="Goldhill Super Fund",
        entity_type=EntityType.smsf,
        role=PartyRole.purchaser,
        country="Australia",
        identification_provided=[],
        property_address="22 Beach Rd, Surfers Paradise QLD 4217",
        transaction_value_aud=3_200_000,
        cash_component_aud=0,
        funds_source="Inbound international transfer from a jurisdiction the buyer would not name",
        beneficial_owners=[
            BeneficialOwner(
                name="Wei Zhang",
                role="trustee / member",
                country="Australia",
                notes="Declined to identify the other member or the source of the transfer",
            )
        ],
        notes="No ID yet. Rushed settlement requested. Reluctant to explain fund flows.",
    )


def overpayment_smr() -> Customer:
    """Suspicious: vendor-side, purchaser attempts to grossly overpay in cash via a third party."""
    return Customer(
        name="Igor / 'cash buyer' (introduced third party)",
        entity_type=EntityType.individual,
        role=PartyRole.purchaser,
        country="Australia",
        identification_provided=[],
        property_address="9 Lygon St, Carlton VIC 3053",
        transaction_value_aud=1_200_000,
        cash_component_aud=400_000,
        funds_source="Unclear; payment offered by a third party unrelated to the buyer",
        notes=(
            "Offered $1.45m on a $1.2m listing to 'close fast', insisted on a $400k cash deposit "
            "paid by an unrelated third party, refused to provide ID, asked that paperwork be kept light."
        ),
    )


ALL_SAMPLES = {
    "clean_individual": clean_individual,
    "company_offshore_pep": company_with_offshore_owner,
    "smsf_overseas_funds": smsf_overseas_funds,
    "overpayment_smr": overpayment_smr,
}
