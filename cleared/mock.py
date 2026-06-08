"""Offline mock provider — lets the demo and API run end-to-end with no API key / no cost.

Returns grounded, hand-authored assessments for the sample customers, and a light
heuristic assessment for anything else. Output flows through the SAME citation verifier
and renderer as the live agent, so the audit-safety behaviour is identical — only the
generation step is canned. Eval is intentionally NOT mocked (a judge can't be faked
without faking the numbers).
"""

from __future__ import annotations

from .models import (
    SMR,
    Customer,
    RiskAssessment,
    RiskDirection,
    RiskFactor,
    RiskRating,
    ScreeningHit,
    SMRIndicator,
)


def _f(factor: str, direction: RiskDirection, rule_ids: list[str], explanation: str) -> RiskFactor:
    return RiskFactor(factor=factor, direction=direction, rule_ids=rule_ids, explanation=explanation)


def _cited(factors: list[RiskFactor], extra: list[str]) -> list[str]:
    ids: set[str] = set(extra)
    for f in factors:
        ids.update(f.rule_ids)
    return sorted(ids)


UP = RiskDirection.increases
DOWN = RiskDirection.decreases


def _sarah() -> RiskAssessment:
    factors = [
        _f("Owner-occupier selling their own home; identity documents provided", DOWN,
           ["RE-CDD-01", "RE-VERIFY-01"],
           "Full name, DOB and address supplied with driver's licence and Medicare; verifiable from reliable sources."),
        _f("Source of funds consistent with profile", DOWN, ["RE-ECDD-02"],
           "Proceeds of an owner-occupier sale by a long-term salaried resident; no unexplained wealth."),
    ]
    return RiskAssessment(
        rating=RiskRating.low,
        summary="Low risk: a long-standing owner-occupier vendor with verified identity and a transaction consistent with profile. Standard CDD applies; no enhanced measures indicated.",
        risk_factors=factors,
        recommended_actions=[
            "Complete standard CDD and retain the verification record (RE-CDD-01, RE-VERIFY-01).",
            "Keep CDD and transaction records for 7 years (RE-RECORD-01).",
        ],
        enhanced_cdd_required=False,
        smr_consideration=False,
        cited_rule_ids=_cited(factors, ["RE-RECORD-01"]),
    )


def _citadel() -> RiskAssessment:
    factors = [
        _f("Foreign politically exposed person among beneficial owners", UP,
           ["RE-PEP-01", "RE-ECDD-01"],
           "A 60% ultimate owner is a flagged foreign PEP; foreign PEPs are high risk and require enhanced CDD and senior-management approval."),
        _f("Layered offshore ownership with no clear commercial rationale", UP,
           ["RE-BO-01", "RE-BO-02"],
           "Ownership is held through two intermediate offshore entities, obscuring beneficial ownership and control."),
        _f("Source of funds asserted but not evidenced", UP, ["RE-ECDD-02"],
           "'Overseas family investment funds' is stated but unverified for an A$8.9m purchase."),
    ]
    return RiskAssessment(
        rating=RiskRating.high,
        summary="High risk: company purchaser with a foreign PEP beneficial owner, layered offshore ownership, and an unevidenced overseas source of funds. Enhanced CDD and senior-management approval are required before proceeding.",
        risk_factors=factors,
        recommended_actions=[
            "Obtain senior-management approval before continuing (RE-PEP-01).",
            "Identify and verify all beneficial owners through the offshore layers (RE-BO-01, RE-VERIFY-01).",
            "Establish and evidence source of funds and wealth (RE-ECDD-02).",
        ],
        enhanced_cdd_required=True,
        smr_consideration=False,
        cited_rule_ids=_cited(factors, ["RE-VERIFY-01"]),
    )


def _goldhill() -> RiskAssessment:
    factors = [
        _f("No identity documents provided", UP, ["RE-CDD-01", "RE-VERIFY-01"],
           "Identity has not been collected or verified for the SMSF or its members."),
        _f("Refusal to identify other member and source of the overseas transfer", UP,
           ["RE-BO-01", "RE-SMR-02"],
           "Beneficial ownership of the SMSF cannot be established; refusal to explain fund flows is a suspicious indicator."),
        _f("Inbound international transfer from an undisclosed jurisdiction", UP,
           ["RE-ECDD-01", "RE-ECDD-02"],
           "Large overseas funding from a jurisdiction the buyer will not name; source of funds not established."),
        _f("Rushed settlement requested", UP, ["RE-SMR-02"],
           "Pressure to settle quickly with little regard to process is a recognised real-estate indicator."),
    ]
    return RiskAssessment(
        rating=RiskRating.high,
        summary="High risk: an SMSF purchaser with no verified identity, opaque membership, an unexplained overseas transfer, and a rushed settlement. Do not proceed pending CDD; consider whether an SMR is required.",
        risk_factors=factors,
        recommended_actions=[
            "Do not provide the designated service until CDD is completed (RE-CDD-01).",
            "Establish source of funds and the identity of all members/beneficial owners (RE-ECDD-02, RE-BO-01).",
            "Consider submitting a Suspicious Matter Report if suspicion is formed (RE-SMR-01).",
        ],
        enhanced_cdd_required=True,
        smr_consideration=True,
        cited_rule_ids=_cited(factors, ["RE-SMR-01"]),
    )


def _overpayment() -> RiskAssessment:
    factors = [
        _f("Attempted overpayment to close quickly", UP, ["RE-SMR-02"],
           "Offering well above the listing price with little regard to value is a classic laundering indicator."),
        _f("Large cash deposit via an unrelated third party", UP, ["RE-SMR-02", "RE-TTR-01"],
           "A$400k cash from an unrelated third party; cash of A$10k+ also triggers threshold reporting."),
        _f("Refusal to provide identification", UP, ["RE-CDD-01", "RE-SMR-02"],
           "Identity cannot be established and refusal itself is a suspicious indicator."),
        _f("Request to keep paperwork minimal", UP, ["RE-SMR-02"],
           "Attempting to avoid a record trail is a recognised indicator of suspicious activity."),
    ]
    return RiskAssessment(
        rating=RiskRating.high,
        summary="High risk and likely suspicious: attempted overpayment, a large third-party cash deposit, refusal to provide ID, and a request to minimise paperwork. An SMR should be considered and the transaction should not proceed without CDD.",
        risk_factors=factors,
        recommended_actions=[
            "Do not proceed without completing CDD (RE-CDD-01).",
            "Submit a Suspicious Matter Report to AUSTRAC, within 3 business days of forming suspicion (RE-SMR-01).",
            "If cash of A$10k or more is accepted, lodge a Threshold Transaction Report (RE-TTR-01).",
            "Do not tip off the customer that a report has been or will be made (RE-TIPOFF-01).",
        ],
        enhanced_cdd_required=True,
        smr_consideration=True,
        cited_rule_ids=_cited(factors, ["RE-SMR-01", "RE-TIPOFF-01"]),
    )


_CANNED = {
    "Sarah Thompson": _sarah,
    "Citadel Holdings Pty Ltd": _citadel,
    "Goldhill Super Fund": _goldhill,
    "Igor / 'cash buyer' (introduced third party)": _overpayment,
}


def _heuristic(customer: Customer, hits: list[ScreeningHit]) -> RiskAssessment:
    factors: list[RiskFactor] = []
    sanctions_hit = any("sanction" in h.list_name.lower() for h in hits)
    pep_hit = any("pep" in h.list_name.lower() for h in hits) or any(
        bo.is_pep for bo in customer.beneficial_owners
    )

    if sanctions_hit:
        factors.append(_f("Possible sanctions match", UP, ["RE-SANCTIONS-01"],
                          "A name matched a sanctions list; providing the service may be prohibited."))
    if pep_hit:
        factors.append(_f("Politically exposed person involved", UP, ["RE-PEP-01", "RE-ECDD-01"],
                          "A customer or beneficial owner is a PEP; enhanced CDD applies."))
    if not customer.identification_provided:
        factors.append(_f("No identity documents provided yet", UP, ["RE-CDD-01", "RE-VERIFY-01"],
                          "Identity has not been collected or verified."))
    if customer.entity_type.value != "individual":
        factors.append(_f("Non-individual customer", UP, ["RE-BO-01", "RE-BO-02"],
                          "Beneficial owners and the control structure must be identified and verified."))
    if not customer.funds_source:
        factors.append(_f("Source of funds not established", UP, ["RE-ECDD-02"],
                          "Source of funds/wealth has not been provided."))
    if customer.cash_component_aud and customer.cash_component_aud >= 10_000:
        factors.append(_f("Cash component of A$10,000 or more", UP, ["RE-TTR-01"],
                          "A threshold transaction report is required for cash of A$10k or more."))
    if not factors:
        factors.append(_f("Standard customer due diligence", DOWN, ["RE-CDD-01", "RE-VERIFY-01"],
                          "No elevated risk indicators identified on the information provided."))

    if sanctions_hit:
        rating = RiskRating.unacceptable
    elif pep_hit or (not customer.identification_provided and customer.entity_type.value != "individual"):
        rating = RiskRating.high
    elif sum(1 for f in factors if f.direction == UP) >= 1:
        rating = RiskRating.medium
    else:
        rating = RiskRating.low

    enhanced = rating in (RiskRating.high, RiskRating.unacceptable) or pep_hit
    return RiskAssessment(
        rating=rating,
        summary=f"[mock heuristic] Assessed as {rating.value} risk based on the indicators below. "
                "Run with an API key for a full model-generated assessment.",
        risk_factors=factors,
        recommended_actions=[
            "Complete and record CDD before providing the designated service (RE-CDD-01).",
            "Keep records for 7 years (RE-RECORD-01).",
        ],
        enhanced_cdd_required=enhanced,
        smr_consideration=sanctions_hit,
        cited_rule_ids=_cited(factors, ["RE-RECORD-01"]),
    )


def mock_assessment(customer: Customer, hits: list[ScreeningHit]) -> RiskAssessment:
    builder = _CANNED.get(customer.name)
    if builder is not None:
        return builder()
    return _heuristic(customer, hits)


def mock_smr(customer: Customer, scenario: str) -> SMR:
    s = scenario.lower()
    indicators: list[SMRIndicator] = []
    if "overpay" in s or "above" in s or "1.45" in s:
        indicators.append(SMRIndicator(indicator="Attempted overpayment relative to listing price", rule_ids=["RE-SMR-02"]))
    if "cash" in s:
        indicators.append(SMRIndicator(indicator="Large cash deposit", rule_ids=["RE-SMR-02", "RE-TTR-01"]))
    if "third party" in s or "third-party" in s:
        indicators.append(SMRIndicator(indicator="Funds offered by an unrelated third party", rule_ids=["RE-SMR-02"]))
    if "refus" in s or "declin" in s or "without id" in s or "identif" in s:
        indicators.append(SMRIndicator(indicator="Refusal or reluctance to provide identification", rule_ids=["RE-CDD-01", "RE-SMR-02"]))
    if "light" in s or "paperwork" in s or "rush" in s or "fast" in s or "quick" in s:
        indicators.append(SMRIndicator(indicator="Attempt to minimise records / rush the transaction", rule_ids=["RE-SMR-02"]))
    if not indicators:
        indicators.append(SMRIndicator(indicator="Activity inconsistent with the customer's profile", rule_ids=["RE-SMR-02"]))

    cited = sorted({rid for ind in indicators for rid in ind.rule_ids} | {"RE-SMR-01", "RE-TIPOFF-01"})
    return SMR(
        grounds_for_suspicion=(
            f"The conduct of {customer.name} in connection with the property at "
            f"{customer.property_address or 'the listed property'} gives reasonable grounds to suspect "
            "an attempt to use the transaction to launder funds."
        ),
        indicators=indicators,
        narrative=(
            f"[mock] On the facts provided, {customer.name} engaged in the following: {scenario} "
            "Taken together, these are recognised money-laundering indicators in real estate. "
            "The agency has not provided the designated service and is reporting the matter to AUSTRAC. "
            "Run with an API key for a full model-drafted narrative."
        ),
        recommended=True,
        cited_rule_ids=cited,
    )
