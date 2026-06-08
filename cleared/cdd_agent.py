"""The CDD agent: screen -> grounded risk assessment -> audit-ready record."""

from __future__ import annotations

from . import audit, config, knowledge, professions, screening
from .llm import cached_system, run_structured
from .models import CDDRecord, Customer, RiskAssessment, ScreeningHit

BASE_INSTRUCTIONS = """You are Cleared, an AML/CTF customer due diligence (CDD) agent for Australian businesses captured by the AUSTRAC regime (Tranche 2, effective 1 July 2026).

Your job: assess the money-laundering / terrorism-financing risk of a customer, and produce an audit-ready, defensible assessment.

Hard rules you must follow:
- Ground EVERY risk factor in the AUSTRAC rule pack provided below. For each factor, cite the specific rule ID(s) (e.g. RE-CDD-01) it relates to.
- ONLY cite rule IDs that appear verbatim in the rule pack. Never invent or guess an ID. If no rule fits, do not cite one.
- Be specific and factual. Do not speculate beyond the facts given. Where required information is missing (e.g. no identity documents, unknown source of funds, unverified beneficial owners), treat that as a gap that RAISES risk and requires enhanced CDD, and say which rule requires it.
- Apply these risk principles: a true sanctions match is UNACCEPTABLE risk; a PEP (especially foreign) requires enhanced CDD; opaque ownership/control, unexplained source of funds or wealth, large cash components, third-party funding, high-risk jurisdictions, and behaviour inconsistent with the customer profile all raise risk.
- Set smr_consideration = true when the facts indicate a suspicious matter (e.g. attempted overpayment, refusal to provide ID, structuring, funds inconsistent with the profile).
- recommended_actions must be concrete next steps for the business (what to collect, verify, escalate, or report).

You will receive the customer details and any sanctions/PEP screening hits. Produce the structured assessment."""


def _format_customer(c: Customer) -> str:
    lines = [
        "CUSTOMER UNDER ASSESSMENT",
        f"- Name: {c.name}",
        f"- Entity type: {c.entity_type.value}",
        f"- Role in transaction: {c.role.value}",
        f"- Country: {c.country}",
    ]
    if c.date_of_birth:
        lines.append(f"- Date of birth: {c.date_of_birth}")
    if c.address:
        lines.append(f"- Address: {c.address}")
    if c.abn_or_acn:
        lines.append(f"- ABN/ACN: {c.abn_or_acn}")
    lines.append(
        f"- Identification provided: {', '.join(c.identification_provided) if c.identification_provided else 'NONE YET'}"
    )
    if c.property_address:
        lines.append(f"- Property: {c.property_address}")
    if c.transaction_value_aud is not None:
        lines.append(f"- Transaction value (AUD): {c.transaction_value_aud:,.0f}")
    if c.cash_component_aud is not None:
        lines.append(f"- Cash component (AUD): {c.cash_component_aud:,.0f}")
    lines.append(f"- Stated source of funds/wealth: {c.funds_source or 'NOT PROVIDED'}")
    if c.beneficial_owners:
        lines.append("- Beneficial owners:")
        for bo in c.beneficial_owners:
            pep = " [flagged PEP]" if bo.is_pep else ""
            pct = f", {bo.ownership_percent:.0f}%" if bo.ownership_percent is not None else ""
            ctry = f", {bo.country}" if bo.country else ""
            extra = f" — {bo.notes}" if bo.notes else ""
            lines.append(f"    * {bo.name} ({bo.role}{pct}{ctry}){pep}{extra}")
    else:
        lines.append("- Beneficial owners: none declared")
    if c.notes:
        lines.append(f"- Notes / observed behaviour: {c.notes}")
    return "\n".join(lines)


def _format_hits(hits: list[ScreeningHit]) -> str:
    if not hits:
        return "SCREENING RESULT: no sanctions or PEP matches found."
    lines = ["SCREENING RESULT: matches found (review for true/false positive):"]
    for h in hits:
        lines.append(
            f"- '{h.query_name}' matched '{h.matched_name}' on {h.list_name} "
            f"(score {h.score}). {h.details or ''}"
        )
    return "\n".join(lines)


def assess_customer(customer: Customer, profession: str = professions.DEFAULT_PROFESSION) -> CDDRecord:
    hits = screening.screen_customer(customer)
    if config.mock_enabled():
        from . import mock

        assessment = mock.mock_assessment(customer, hits)
    else:
        label, service = professions.framing(profession)
        context = f"You are advising an Australian {label}, which provides a designated service by {service}.\n\n"
        system = cached_system(context + BASE_INSTRUCTIONS, knowledge.rules_as_prompt_text())
        user_text = f"{_format_customer(customer)}\n\n{_format_hits(hits)}"
        assessment, _usage = run_structured(
            system=system,
            user_text=user_text,
            output_model=RiskAssessment,
            model=config.GEN_MODEL,
        )
    return audit.build_cdd_record(customer, hits, assessment)
