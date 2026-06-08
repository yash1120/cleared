"""Audit-record assembly + the citation verifier (the audit-safety guarantee).

Every risk factor the model produces must cite a rule ID that actually exists in the
pack. We verify that post-generation and surface any hallucinated IDs as warnings on
the record — this is what makes the output defensible in an AUSTRAC review.
"""

from __future__ import annotations

import datetime
import uuid

from . import config, knowledge
from .models import CDDRecord, Customer, RiskAssessment, ScreeningHit


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def verify_citations(assessment: RiskAssessment) -> list[str]:
    """Return human-readable warnings for any cited rule IDs not present in the pack."""
    valid = knowledge.valid_rule_ids()
    cited: set[str] = set(assessment.cited_rule_ids)
    for factor in assessment.risk_factors:
        cited.update(factor.rule_ids)
    invalid = sorted(cited - valid)
    warnings: list[str] = []
    if invalid:
        warnings.append(
            f"Citation check: {len(invalid)} cited rule ID(s) are not in the rule pack "
            f"and were flagged: {', '.join(invalid)}"
        )
    return warnings


def build_cdd_record(
    customer: Customer, hits: list[ScreeningHit], assessment: RiskAssessment
) -> CDDRecord:
    return CDDRecord(
        record_id=str(uuid.uuid4()),
        created_at=_now_iso(),
        gen_model=config.GEN_MODEL,
        rules_version=knowledge.load_rules()["version"],
        agent_version=config.AGENT_VERSION,
        customer=customer,
        screening_hits=hits,
        risk_assessment=assessment,
        citation_warnings=verify_citations(assessment),
    )


def render_cdd_record(record: CDDRecord) -> str:
    """Human-readable rendering for the CLI demo."""
    a = record.risk_assessment
    out: list[str] = []
    out.append("=" * 72)
    out.append(f"CDD RECORD  {record.record_id}")
    out.append(f"  customer : {record.customer.name} ({record.customer.entity_type.value}, "
               f"{record.customer.role.value})")
    out.append(f"  created  : {record.created_at}")
    out.append(f"  model    : {record.gen_model}   rules: {record.rules_version}")
    out.append("-" * 72)
    out.append(f"RISK RATING: {a.rating.value.upper()}    "
               f"enhanced CDD: {'YES' if a.enhanced_cdd_required else 'no'}    "
               f"SMR consideration: {'YES' if a.smr_consideration else 'no'}")
    out.append(f"\n{a.summary}")

    if record.screening_hits:
        out.append("\nSCREENING HITS:")
        for h in record.screening_hits:
            out.append(f"  ! {h.query_name} ~ {h.matched_name}  [{h.list_name}, score {h.score}]")
    else:
        out.append("\nSCREENING HITS: none")

    out.append("\nRISK FACTORS (each grounded in the rule pack):")
    for f in a.risk_factors:
        arrow = "^" if f.direction.value == "increases" else "v"
        cites = ", ".join(f.rule_ids) if f.rule_ids else "(uncited)"
        out.append(f"  [{arrow}] {f.factor}")
        out.append(f"        {f.explanation}")
        out.append(f"        cited: {cites}")

    out.append("\nRECOMMENDED ACTIONS:")
    for step in a.recommended_actions:
        out.append(f"  - {step}")

    if record.citation_warnings:
        out.append("\nCITATION WARNINGS:")
        for w in record.citation_warnings:
            out.append(f"  * {w}")
    else:
        out.append("\nCITATION CHECK: passed - every cited rule ID exists in the pack.")
    out.append("=" * 72)
    return "\n".join(out)
