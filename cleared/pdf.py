"""Render a CDD record (and SMR) as an audit-ready PDF.

Uses fpdf2 (pure-Python, no system deps). Core fonts are latin-1, so text is sanitised
to latin-1 to avoid crashes on stray unicode. The `line` helper returns the cursor to the
left margin after each block (otherwise fpdf2's full-width multi_cell leaves x at the right
margin and the next call has no horizontal space).
"""

from __future__ import annotations

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from .models import SMR, CDDRecord

RATING_RGB = {"low": (22, 163, 74), "medium": (217, 119, 6), "high": (234, 88, 12), "unacceptable": (220, 38, 38)}


def _s(text) -> str:
    return ("" if text is None else str(text)).encode("latin-1", "replace").decode("latin-1")


def _fmt_aud(n) -> str:
    return "" if n is None else f"A${n:,.0f}"


def record_to_pdf(rec: CDDRecord, smr: SMR | None = None) -> bytes:
    a = rec.risk_assessment
    c = rec.customer
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)
    pdf.add_page()

    def line(h: float, txt: str) -> None:
        pdf.multi_cell(0, h, _s(txt), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "B", 16)
    line(8, "Customer Due Diligence Record")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120)
    line(5, f"Cleared - AML/CTF - generated {rec.created_at}")
    line(5, f"Record {rec.record_id}  |  model {rec.gen_model}  |  rules {rec.rules_version}")
    pdf.set_text_color(0)
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 11)
    line(6, "Customer")
    pdf.set_font("Helvetica", "", 10)
    line(5, f"{c.name}  ({c.entity_type.value}, {c.role.value})")
    if c.transaction_value_aud is not None:
        line(5, f"Transaction: {_fmt_aud(c.transaction_value_aud)}"
                + (f"  |  cash {_fmt_aud(c.cash_component_aud)}" if c.cash_component_aud else ""))
    line(5, f"Source of funds: {c.funds_source or 'not provided'}")
    line(5, "ID provided: " + (", ".join(c.identification_provided) or "none"))
    for bo in c.beneficial_owners:
        line(5, f"  - beneficial owner: {bo.name} ({bo.role}{', PEP' if bo.is_pep else ''})")
    pdf.ln(1)

    rgb = RATING_RGB.get(a.rating.value, (217, 119, 6))
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*rgb)
    line(7, f"RISK RATING: {a.rating.value.upper()}")
    pdf.set_text_color(0)
    pdf.set_font("Helvetica", "", 10)
    line(5, f"Enhanced CDD: {'required' if a.enhanced_cdd_required else 'no'}    "
            f"SMR consideration: {'yes' if a.smr_consideration else 'no'}")
    line(5, a.summary)
    pdf.ln(1)

    if rec.screening_hits:
        pdf.set_font("Helvetica", "B", 11)
        line(6, "Screening matches")
        pdf.set_font("Helvetica", "", 10)
        for h in rec.screening_hits:
            line(5, f"  - {h.query_name} ~ {h.matched_name} ({h.list_name}, score {h.score})")
        pdf.ln(1)

    pdf.set_font("Helvetica", "B", 11)
    line(6, "Risk factors (grounded in the rule pack)")
    for f in a.risk_factors:
        arrow = "[+]" if f.direction.value == "increases" else "[-]"
        pdf.set_font("Helvetica", "B", 10)
        line(5, f"{arrow} {f.factor}")
        pdf.set_font("Helvetica", "", 9)
        line(5, f.explanation)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(90)
        line(5, "Cited: " + (", ".join(f.rule_ids) or "(none)"))
        pdf.set_text_color(0)
        pdf.ln(1)

    pdf.set_font("Helvetica", "B", 11)
    line(6, "Recommended actions")
    pdf.set_font("Helvetica", "", 10)
    for step in a.recommended_actions:
        line(5, f"  - {step}")
    pdf.ln(1)

    pdf.set_font("Helvetica", "", 10)
    if rec.citation_warnings:
        pdf.set_text_color(*RATING_RGB["medium"])
        line(5, "Citation check: " + " ".join(rec.citation_warnings))
    else:
        pdf.set_text_color(*RATING_RGB["low"])
        line(5, "Citation check: passed - every cited rule ID exists in the pack.")
    pdf.set_text_color(0)

    if smr:
        pdf.ln(2)
        pdf.set_font("Helvetica", "B", 12)
        line(7, f"Suspicious Matter Report (draft) - {'recommended' if smr.recommended else 'not recommended'}")
        pdf.set_font("Helvetica", "", 10)
        line(5, f"Grounds: {smr.grounds_for_suspicion}")
        for ind in smr.indicators:
            line(5, f"  - {ind.indicator}  [cited: {', '.join(ind.rule_ids)}]")
        pdf.ln(1)
        line(5, smr.narrative)

    pdf.ln(3)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(120)
    line(4, "Retain for 7 years per AUSTRAC record-keeping requirements. Prototype output - the rule pack "
            "is an MVP subset and not legal advice; verify against the AML/CTF Act 2006 and current AUSTRAC guidance.")
    return bytes(pdf.output())
