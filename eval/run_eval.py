"""Grounding eval for the CDD agent. Run from the project root: python eval/run_eval.py

Two layers, mirroring the project's eval philosophy:
  1. Automatic, deterministic checks  - citation validity (no hallucinated rule IDs) +
     expectation checks (rating band, enhanced-CDD / SMR flags).
  2. LLM-as-judge (Opus) - grades, on a 0..1 scale, whether each cited rule genuinely
     supports its factor (citation relevance) and whether claims are grounded.

Prints an honest scoreboard. The point is real numbers, not vibes.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from pydantic import BaseModel, Field

# Make the `cleared` package importable when run as a script from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cleared import config, knowledge, sample_data  # noqa: E402
from cleared.cdd_agent import _format_customer, assess_customer  # noqa: E402
from cleared.llm import cached_system, run_structured  # noqa: E402
from cleared.models import CDDRecord  # noqa: E402

CASES_PATH = Path(__file__).parent / "cases.json"
RATING_ORDER = {"low": 0, "medium": 1, "high": 2, "unacceptable": 3}


class JudgeVerdict(BaseModel):
    citation_relevance: float = Field(
        description="0..1: fraction of cited rule IDs that genuinely support the factor they are attached to"
    )
    groundedness: float = Field(
        description="0..1: are the assessment's claims supported by the customer facts and the rule pack, with no fabricated facts or rules"
    )
    hallucinated_citations: bool = Field(description="True if any cited rule ID is not a real rule")
    notes: str


JUDGE_INSTRUCTIONS = """You are a strict AML/CTF compliance reviewer. You are grading another model's CDD risk assessment of an Australian real-estate customer.

Using ONLY the rule pack provided below, grade the assessment:
- citation_relevance (0..1): of the rule IDs cited against each risk factor, what fraction genuinely support that factor? A citation is irrelevant if the rule has nothing to do with the stated factor.
- groundedness (0..1): are the assessment's claims supported by the customer facts and the rule pack, with no invented facts or invented rules?
- hallucinated_citations: true if any cited ID is not a real rule in the pack.
Be strict and specific in your notes."""


def _resolve_customer(sample_key: str):
    return sample_data.ALL_SAMPLES[sample_key]()


def _check_expectations(record: CDDRecord, expect: dict) -> tuple[int, int, list[str]]:
    passed, total, fails = 0, 0, []
    a = record.risk_assessment
    if "enhanced_cdd" in expect:
        total += 1
        if a.enhanced_cdd_required == expect["enhanced_cdd"]:
            passed += 1
        else:
            fails.append(f"enhanced_cdd expected {expect['enhanced_cdd']} got {a.enhanced_cdd_required}")
    if "smr" in expect:
        total += 1
        if a.smr_consideration == expect["smr"]:
            passed += 1
        else:
            fails.append(f"smr expected {expect['smr']} got {a.smr_consideration}")
    if "min_rating" in expect:
        total += 1
        if RATING_ORDER[a.rating.value] >= RATING_ORDER[expect["min_rating"]]:
            passed += 1
        else:
            fails.append(f"rating {a.rating.value} below min {expect['min_rating']}")
    if "max_rating" in expect:
        total += 1
        if RATING_ORDER[a.rating.value] <= RATING_ORDER[expect["max_rating"]]:
            passed += 1
        else:
            fails.append(f"rating {a.rating.value} above max {expect['max_rating']}")
    return passed, total, fails


def _judge(record: CDDRecord) -> JudgeVerdict:
    a = record.risk_assessment
    factors = "\n".join(
        f"- factor: {f.factor}\n  direction: {f.direction.value}\n  cited: {', '.join(f.rule_ids) or '(none)'}"
        f"\n  explanation: {f.explanation}"
        for f in a.risk_factors
    )
    user = (
        f"{_format_customer(record.customer)}\n\n"
        f"ASSESSMENT TO GRADE\nrating: {a.rating.value}\nsummary: {a.summary}\n\n"
        f"risk factors and their citations:\n{factors}\n\n"
        f"all cited rule IDs: {', '.join(a.cited_rule_ids) or '(none)'}"
    )
    system = cached_system(JUDGE_INSTRUCTIONS, knowledge.rules_as_prompt_text())
    verdict, _usage = run_structured(
        system=system,
        user_text=user,
        output_model=JudgeVerdict,
        model=config.JUDGE_MODEL,
        thinking=True,
    )
    return verdict


def main() -> None:
    if config.mock_enabled():
        print("Eval needs a real API key. The agent and the Opus judge both call Claude, and the "
              "judge cannot be mocked without faking the scores. Set ANTHROPIC_API_KEY (and unset "
              "CLEARED_MOCK) to run the eval. Aborting.")
        sys.exit(1)

    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    print(f"CLEARED eval  |  gen={config.GEN_MODEL}  judge={config.JUDGE_MODEL}  cases={len(cases)}\n")

    rows = []
    cite_valid_count = 0
    exp_passed = exp_total = 0
    rel_sum = grd_sum = 0.0

    for case in cases:
        record = assess_customer(_resolve_customer(case["sample"]))
        cite_valid = len(record.citation_warnings) == 0
        cite_valid_count += int(cite_valid)
        p, t, fails = _check_expectations(record, case.get("expect", {}))
        exp_passed += p
        exp_total += t
        verdict = _judge(record)
        rel_sum += verdict.citation_relevance
        grd_sum += verdict.groundedness
        rows.append(
            {
                "id": case["id"],
                "rating": record.risk_assessment.rating.value,
                "cite_valid": cite_valid,
                "exp": f"{p}/{t}",
                "exp_fails": fails,
                "relevance": verdict.citation_relevance,
                "grounded": verdict.groundedness,
                "halluc": verdict.hallucinated_citations,
            }
        )

    n = len(cases)
    print(f"{'case':22} {'rating':12} {'cites_ok':9} {'expect':7} {'relevance':10} {'grounded':9} halluc")
    print("-" * 86)
    for r in rows:
        print(
            f"{r['id']:22} {r['rating']:12} {str(r['cite_valid']):9} {r['exp']:7} "
            f"{r['relevance']:<10.2f} {r['grounded']:<9.2f} {r['halluc']}"
        )
        for f in r["exp_fails"]:
            print(f"    ! {f}")

    print("-" * 86)
    print("SCOREBOARD")
    print(f"  citation validity (no hallucinated IDs) : {cite_valid_count}/{n} "
          f"({100*cite_valid_count/n:.0f}%)")
    print(f"  expectations passed                     : {exp_passed}/{exp_total} "
          f"({(100*exp_passed/exp_total) if exp_total else 0:.0f}%)")
    print(f"  mean citation relevance (Opus judge)    : {rel_sum/n:.2f}")
    print(f"  mean groundedness (Opus judge)          : {grd_sum/n:.2f}")


if __name__ == "__main__":
    main()
