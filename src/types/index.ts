// Core types for AuzGuard API with routing and profiling metadata

export type Effect = "ALLOW" | "BLOCK" | "ROUTE" | "REQUIRE_OVERRIDE" | "WARN_ROUTE";

export type Category =
  | "PRIVACY"
  | "HEALTH"
  | "AI_RISK"
  | "CDR"
  | "ANTI_DISCRIM"
  | "TELECOM"
  | "COPYRIGHT"
  | "EXPORT"
  | "CONSUMER";

export type Jurisdiction =
  | "AU"
  | "NSW"
  | "VIC"
  | "ACT"
  | "QLD"
  | "SA"
  | "WA"
  | "TAS"
  | "NT";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type UserRole = "admin" | "compliance" | "developer" | "viewer";

export interface Rule {
  rule_id: string;
  version: string;
  title: string;
  description?: string;
  category: Category;
  jurisdiction: Jurisdiction;
  legal_basis: string[];
  applies_to?: {
    data_class?: string[];
    domains?: string[];
    destinations?: string[];
    models?: string[];
    org_ids?: string[];
  };
  match?: Record<string, unknown>;
  condition: string; // CEL-ish expression
  effect: Effect;
  route_to?: string;
  obligations?: string[];
  evidence_requirements?: string[];
  overrides?: {
    allowed: boolean;
    roles?: string[];
    require_justification?: boolean;
  };
  priority: number; // ASC evaluates first
  severity: Severity;
  audit_log_fields?: string[];
  tests?: {
    name: string;
    request: Record<string, unknown>;
    expect: Effect;
  }[];
  enabled?: boolean; // Optional toggle, defaults to true when undefined
  metadata?: {
    owner?: string;
    last_reviewed?: string;
    notes?: string;
  };
}

export interface Policy {
  policy_id: string;
  version: string;
  title: string;
  jurisdiction: string;
  evaluation_strategy: {
    order: "ASC_PRIORITY";
    conflict_resolution: "FIRST_MATCH";
    default_effect: Effect;
  };
  rules: Rule[];
}

export interface SimulationInput {
  policy_id: string;
  request: Record<string, unknown>;
}

export interface SimulationTraceStep {
  rule_id: string;
  matched: boolean;
  reason?: string;
  skipped?: boolean;
}

export interface SimulationResult {
  decision: Effect;
  route_to?: string;
  matched_rule?: string;
  trace: SimulationTraceStep[];
  obligations_applied: string[];
  overrides_required?: {
    roles: string[];
    require_justification: boolean;
  };
  audit_log_id?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  org_id?: string;
  rule_id: string;
  effect: Effect;
  actor_id?: string;
  fields_hashed: Record<string, string>; // fieldName -> sha256
}

export interface ModelProfile {
  profile_id: string;
  provider: string;
  endpoint: string;
  capabilities: string[];
  supported_data_classes?: string[];
  compliance: {
    data_residency: string;
    certifications?: string[];
    notes?: string;
  };
  performance: {
    avg_latency_ms: number;
    p95_latency_ms: number;
    availability: number;
    throughput_tps: number;
  };
  cost: {
    currency: string;
    per_1k_tokens: number;
  };
  limits?: {
    context_window_tokens?: number;
    max_input_tokens?: number;
    max_output_tokens?: number;
  };
  quality?: {
    strength?: 'lite' | 'standard' | 'strong';
    score?: number;
  };
  last_benchmarked: string;
  tags: Record<string, unknown>;
}

export interface ModelPool {
  pool_id: string;
  region: string;
  description: string;
  tags: Record<string, unknown>;
  targets: Array<{
    provider: string;
    endpoint: string;
    weight: number;
  }>;
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    last_check: string;
    errors?: string[];
  };
  target_profiles?: RouteTarget[];
}

export interface RouteTarget {
  id: string;
  pool_id: string;
  provider: string;
  endpoint: string;
  weight: number;
  region: string;
  is_active: boolean;
  profile?: ModelProfile;
}

export interface RoutingPreference {
  prefer_region?: string;
  provider?: string;
  minimize_latency?: boolean;
  compliance_tags?: string[];
  task_type?: string;
  max_latency_ms?: number;
  cost_sensitivity?: 'low' | 'balanced' | 'quality';
  info_types?: string[]; // e.g., ['pii','health','financial','code']
  required_context_window_tokens?: number;
  model_strength?: 'lite' | 'standard' | 'strong';
  required_data_residency?: string; // e.g., 'AU'
  preferred_data_residency?: string[]; // boost if matches
  requires_json_mode?: boolean;
  requires_function_calling?: boolean;
  requires_streaming?: boolean;
  requires_vision?: boolean;
  latency_budget_ms?: number; // prefer under this p95
  max_cost_per_1k_aud?: number; // disqualify if above
  min_quality_score?: number; // prefer models scoring above
  required_output_tokens?: number; // ensure model can produce at least this
}

// Routing profile (saved route config that can be assigned to groups)
export interface RouteProfile {
  id: string;
  name: string;
  pool_id?: string;
  // Basic toggles for simplified setup
  basic?: {
    optimize_speed?: boolean;
    optimize_cost?: boolean;
    optimize_performance?: boolean;
    keep_onshore?: boolean; // AU residency
    dynamic_by_context?: boolean;
  };
  // Full advanced preferences powering ranking
  preferences: RoutingPreference;
  created_at: string;
  updated_at: string;
}

export interface UserGroup {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  // Optional assignments/preferences
  default_pool_id?: string;
  allowed_pools?: string[];
  default_policy_id?: string;
  allowed_policies?: string[];
}

export interface GroupRouteBinding {
  id: string;
  group_id: string;
  route_profile_id: string;
  created_at: string;
}

export interface RoutingCandidate {
  target: RouteTarget;
  score: number;
  reasons: string[];
  selected: boolean;
}

export interface ModelInvocationSummary {
  invocation_id: string;
  provider: string;
  model_identifier: string;
  latency_ms: number;
  estimated_cost_aud?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  response_excerpt?: string;
  error_message?: string;
}

export interface RoutingDecision {
  pool_id: string;
  pool_region: string;
  pool_description: string;
  candidates: RoutingCandidate[];
}

export interface RoutingRequest {
  policy_id: string;
  request: Record<string, unknown>;
  org_id?: string;
  actor_id?: string;
  preferences?: RoutingPreference;
}

export interface RoutingResponse extends SimulationResult {
  route_decision?: RoutingDecision;
  model_invocation?: ModelInvocationSummary;
  request_payload?: Record<string, unknown>;
  model_response?: unknown;
  latency_ms?: number;
}

export interface OverrideRequest {
  policy_id: string;
  rule_id: string;
  request: Record<string, unknown>;
  justification: string;
  actor_role: string;
  actor_id: string;
}

export interface OverrideResponse {
  decision: "ALLOW_WITH_OVERRIDE" | "ROUTE_WITH_OVERRIDE";
  trace: Array<{ rule_id: string; matched: boolean; reason?: string }>;
  obligations_applied: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface TestResult {
  name: string;
  passed: boolean;
  expected: Effect;
  actual: Effect;
  trace?: Array<{ rule_id: string; matched: boolean; reason?: string }>;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  org_id?: string;
  created_at: string;
  last_login?: string;
}



export interface PolicyViolationSlice {
  policy_id: string;
  rule_id?: string;
  decision: Effect;
  count: number;
}

export interface ModelUsageSlice {
  provider: string;
  model_identifier: string;
  count: number;
  average_latency_ms: number;
  total_latency_ms: number;
}

export interface GatewayDashboardMetrics {
  requests_today: number;
  block_rate: number;
  overrides_required: number;
  average_latency_ms: number;
  p95_latency_ms: number;
  policy_violation_breakdown: PolicyViolationSlice[];
  model_usage: ModelUsageSlice[];
}

