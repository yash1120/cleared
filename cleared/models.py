"""Typed domain models.

Two groups:
- Input / assembled records (Customer, ScreeningHit, CDDRecord) - used by the API and audit trail.
- LLM output schemas (RiskAssessment, SMR) - passed to the Anthropic SDK as structured-output
  formats. These deliberately avoid Optional fields and numeric/length constraints so the schema
  is simple and strict for the model to fill.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class EntityType(str, Enum):
    individual = "individual"
    company = "company"
    trust = "trust"
    smsf = "smsf"
    partnership = "partnership"
    other = "other"


class PartyRole(str, Enum):
    vendor = "vendor"        # seller — the customer of a listing/selling agent
    purchaser = "purchaser"  # buyer — the customer of a buyer's agent
    lessor = "lessor"
    lessee = "lessee"
    client = "client"        # generic client (non-real-estate professions)


class RiskRating(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    unacceptable = "unacceptable"


class RiskDirection(str, Enum):
    increases = "increases"
    decreases = "decreases"


# --------------------------------------------------------------------------- #
# Input models (the agency / API supplies these)
# --------------------------------------------------------------------------- #
class BeneficialOwner(BaseModel):
    name: str
    role: str = Field(description="e.g. director, shareholder >=25%, trustee, settlor, beneficiary")
    ownership_percent: float | None = None
    country: str | None = None
    is_pep: bool = False
    notes: str | None = None


class Customer(BaseModel):
    name: str
    entity_type: EntityType
    role: PartyRole
    date_of_birth: str | None = None
    address: str | None = None
    country: str = "Australia"
    abn_or_acn: str | None = None
    identification_provided: list[str] = Field(
        default_factory=list,
        description="Documents/data supplied so far, e.g. ['passport','medicare']. Empty means none yet.",
    )
    beneficial_owners: list[BeneficialOwner] = Field(default_factory=list)
    property_address: str | None = None
    transaction_value_aud: float | None = None
    funds_source: str | None = Field(default=None, description="Stated source of funds / wealth")
    cash_component_aud: float | None = None
    notes: str | None = Field(
        default=None, description="Free-text context, observed behaviour, anything unusual"
    )
    external_ref: str | None = Field(default=None, description="The source system's contact/record ID")
    source: str | None = Field(default=None, description="Originating system, e.g. 'xero'")


class ScreeningHit(BaseModel):
    query_name: str
    matched_name: str
    list_name: str
    score: float
    source: str
    details: str | None = None


# --------------------------------------------------------------------------- #
# LLM output schemas (structured outputs)
# --------------------------------------------------------------------------- #
class RiskFactor(BaseModel):
    factor: str = Field(description="The specific risk indicator observed")
    direction: RiskDirection
    rule_ids: list[str] = Field(
        description="IDs of rules from the provided AUSTRAC rule pack this factor relates to. "
        "Only use IDs that appear verbatim in the pack."
    )
    explanation: str


class RiskAssessment(BaseModel):
    rating: RiskRating
    summary: str
    risk_factors: list[RiskFactor]
    recommended_actions: list[str]
    enhanced_cdd_required: bool
    smr_consideration: bool = Field(
        description="True if the facts suggest a Suspicious Matter Report may be required"
    )
    cited_rule_ids: list[str] = Field(description="All distinct rule IDs cited across the assessment")


class SMRIndicator(BaseModel):
    indicator: str
    rule_ids: list[str]


class SMR(BaseModel):
    grounds_for_suspicion: str
    indicators: list[SMRIndicator]
    narrative: str = Field(
        description="An SMR narrative suitable for AUSTRAC submission: factual, specific, chronological"
    )
    recommended: bool = Field(description="Whether an SMR should be submitted on these facts")
    cited_rule_ids: list[str]


# --------------------------------------------------------------------------- #
# Assembled, audit-ready record
# --------------------------------------------------------------------------- #
class CDDRecord(BaseModel):
    record_id: str
    created_at: str
    gen_model: str
    rules_version: str
    agent_version: str
    customer: Customer
    screening_hits: list[ScreeningHit]
    risk_assessment: RiskAssessment
    citation_warnings: list[str] = Field(
        description="Invalid/hallucinated rule IDs caught by post-generation verification"
    )


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class RegisterRequest(BaseModel):
    email: str
    password: str
    profession: str = "real_estate"
    firm_name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    id: str
    email: str
    profession: str
    firm_name: str | None = None
    is_admin: bool = False


class TokenResponse(BaseModel):
    token: str
    user: UserPublic


class ApiKeyCreateRequest(BaseModel):
    name: str = "Integration key"


class ApiKeyInfo(BaseModel):
    id: str
    name: str | None = None
    prefix: str
    created_at: str
    last_used_at: str | None = None


class ApiKeyCreated(ApiKeyInfo):
    key: str


class WebhookSetRequest(BaseModel):
    url: str


class WebhookInfo(BaseModel):
    url: str
    created_at: str


class WebhookCreated(WebhookInfo):
    secret: str


class BetaSignupRequest(BaseModel):
    email: str
    name: str | None = None
    firm: str | None = None
    profession: str | None = None
    message: str | None = None
