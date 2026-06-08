"""The SMR drafter: turn a flagged scenario into a grounded Suspicious Matter Report narrative."""

from __future__ import annotations

from . import config, knowledge, professions
from .cdd_agent import _format_customer
from .llm import cached_system, run_structured
from .models import SMR, Customer

BASE_INSTRUCTIONS = """You are Cleared, drafting a Suspicious Matter Report (SMR) for an Australian business under the AUSTRAC regime.

Given a customer and a description of what occurred, draft a clear, factual SMR narrative suitable for submission to AUSTRAC.

Hard rules:
- Ground each suspicious indicator in the AUSTRAC rule pack provided. Cite only rule IDs that appear verbatim in the pack; never invent one.
- The narrative must be factual, specific and chronological: who, what, when, amounts, and exactly what raised the suspicion. Do not invent facts not provided.
- Set recommended = true only if the facts give reasonable grounds to suspect money laundering, terrorism financing, proceeds of crime, or an offence.
- Do NOT advise tipping off the customer (see the tipping-off rule)."""


def draft_smr(customer: Customer, scenario: str, profession: str = professions.DEFAULT_PROFESSION) -> SMR:
    if config.mock_enabled():
        from . import mock

        return mock.mock_smr(customer, scenario)
    label, _service = professions.framing(profession)
    system = cached_system(f"You are advising an Australian {label}.\n\n" + BASE_INSTRUCTIONS, knowledge.rules_as_prompt_text())
    user_text = (
        f"{_format_customer(customer)}\n\n"
        f"WHAT OCCURRED (basis for the report):\n{scenario}"
    )
    smr, _usage = run_structured(
        system=system,
        user_text=user_text,
        output_model=SMR,
        model=config.GEN_MODEL,
    )
    return smr
