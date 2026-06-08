export type EntityType = 'individual' | 'company' | 'trust' | 'smsf' | 'partnership' | 'other'
export type PartyRole = 'vendor' | 'purchaser' | 'lessor' | 'lessee'
export type RiskRating = 'low' | 'medium' | 'high' | 'unacceptable'

export interface BeneficialOwner {
  name: string
  role: string
  ownership_percent?: number | null
  country?: string | null
  is_pep: boolean
  notes?: string | null
}

export interface Customer {
  name: string
  entity_type: EntityType
  role: PartyRole
  date_of_birth?: string | null
  address?: string | null
  country: string
  abn_or_acn?: string | null
  identification_provided: string[]
  beneficial_owners: BeneficialOwner[]
  property_address?: string | null
  transaction_value_aud?: number | null
  cash_component_aud?: number | null
  funds_source?: string | null
  notes?: string | null
  _key?: string
}

export interface RiskFactor {
  factor: string
  direction: 'increases' | 'decreases'
  rule_ids: string[]
  explanation: string
}

export interface RiskAssessment {
  rating: RiskRating
  summary: string
  risk_factors: RiskFactor[]
  recommended_actions: string[]
  enhanced_cdd_required: boolean
  smr_consideration: boolean
  cited_rule_ids: string[]
}

export interface ScreeningHit {
  query_name: string
  matched_name: string
  list_name: string
  score: number
  source: string
  details?: string | null
}

export interface CDDRecord {
  record_id: string
  created_at: string
  gen_model: string
  rules_version: string
  agent_version: string
  customer: Customer
  screening_hits: ScreeningHit[]
  risk_assessment: RiskAssessment
  citation_warnings: string[]
}

export interface SMRIndicator {
  indicator: string
  rule_ids: string[]
}

export interface SMR {
  grounds_for_suspicion: string
  indicators: SMRIndicator[]
  narrative: string
  recommended: boolean
  cited_rule_ids: string[]
}

export interface RecordSummary {
  id: string
  created_at: string
  customer_name: string
  entity_type: string
  role: string
  rating: RiskRating
  enhanced_cdd: boolean
  smr_consideration: boolean
  retain_until: string
  external_ref?: string | null
  source?: string | null
  review_due?: string | null
  has_smr: boolean
}

export interface ReviewItem {
  id: string
  customer_name: string
  rating: RiskRating
  review_due: string
  overdue: boolean
}

export interface AuditEvent {
  id: string
  record_id?: string | null
  action: string
  detail?: string | null
  at: string
}

export interface TimeseriesPoint {
  date: string
  total: number
  low: number
  medium: number
  high: number
  unacceptable: number
}

export interface TopRule {
  rule_id: string
  count: number
}

export interface WeekBucket {
  week_start: string
  count: number
  overdue_count: number
}

export interface LookupHit {
  id: string
  customer_name: string
  entity_type: string
  role: string
  rating: RiskRating
  created_at: string
  review_due?: string | null
  external_ref?: string | null
  source?: string | null
}

export interface SampleEntry {
  label: string
  customer: Customer
}

export interface Health {
  status: string
  mode: string
  gen_model: string
}

export interface User {
  id: string
  email: string
  profession: string
  firm_name?: string | null
  is_admin?: boolean
}

export interface AdminOverview {
  users: number
  admins: number
  records: number
  smrs: number
  signups_open: number
  signups_total: number
  last_7_days: { records: number; signups: number; users: number }
}

export interface AdminUserRow {
  id: string
  email: string
  profession: string
  firm_name?: string | null
  created_at: string
  is_admin: boolean
  records_count: number
}

export interface AdminSignupRow {
  id: string
  email: string
  name?: string | null
  firm?: string | null
  profession?: string | null
  message?: string | null
  created_at: string
  contacted_at?: string | null
  archived_at?: string | null
}

export interface AdminAuditEvent {
  id: string
  user_id?: string | null
  user_email?: string | null
  record_id?: string | null
  action: string
  detail?: string | null
  at: string
}

export interface TokenResponse {
  token: string
  user: User
}

export interface ApiKeyInfo {
  id: string
  name?: string | null
  prefix: string
  created_at: string
  last_used_at?: string | null
}

export interface ApiKeyCreated extends ApiKeyInfo {
  key: string
}

export interface Connector {
  name: string
  label: string
  description: string
}

export interface Stats {
  records: number
  smr_flagged: number
  by_rating: Partial<Record<RiskRating, number>>
  last_7_days: number
  reviews_due: number
  overdue: number
}

export interface WebhookInfo {
  url: string
  created_at: string
}

export interface WebhookCreated extends WebhookInfo {
  secret: string
}
