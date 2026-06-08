"""60-second CLI demo. Run from the project root: python -m cleared.demo

Runs the CDD agent over four sample customers (clean / PEP / opaque SMSF / suspicious),
then drafts an SMR for the suspicious one.
"""

from __future__ import annotations

from . import config, sample_data
from .audit import render_cdd_record
from .cdd_agent import assess_customer
from .models import SMR
from .smr_agent import draft_smr


def _render_smr(smr: SMR) -> str:
    out = ["-" * 72, "DRAFT SUSPICIOUS MATTER REPORT (SMR)",
           f"  recommend submission: {'YES' if smr.recommended else 'no'}", ""]
    out.append(f"Grounds for suspicion:\n  {smr.grounds_for_suspicion}\n")
    out.append("Indicators:")
    for ind in smr.indicators:
        cites = ", ".join(ind.rule_ids) if ind.rule_ids else "(uncited)"
        out.append(f"  - {ind.indicator}  [cited: {cites}]")
    out.append(f"\nNarrative:\n{smr.narrative}")
    out.append("-" * 72)
    return "\n".join(out)


def main() -> None:
    if config.mock_enabled():
        print("CLEARED - AML/CTF CDD agent demo   [MOCK MODE - no API key; "
              "canned/heuristic output, no API calls]")
    else:
        print(f"CLEARED - AML/CTF CDD agent demo   (generation model: {config.GEN_MODEL})")

    for key, factory in sample_data.ALL_SAMPLES.items():
        print(f"\n\n### SAMPLE: {key}")
        record = assess_customer(factory())
        print(render_cdd_record(record))

    print("\n\n### SMR DRAFT (suspicious overpayment scenario)")
    scenario = (
        "Buyer offered $1.45m on a $1.2m listing to close within 5 days, insisted on paying a "
        "$400k cash deposit through an unrelated third party, declined to provide identification, "
        "and asked the agent to keep the paperwork light."
    )
    smr = draft_smr(sample_data.overpayment_smr(), scenario)
    print(_render_smr(smr))


if __name__ == "__main__":
    main()
