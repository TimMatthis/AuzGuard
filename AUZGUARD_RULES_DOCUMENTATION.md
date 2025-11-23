# AuzGuard Rules Documentation

## Overview

AuzGuard is a compliance and governance system for AI/ML model routing and access control. Rules are evaluated using a CEL-like expression language against enriched request contexts. This document explains each rule component and how the evaluation logic works.

---

## Rule Evaluation Process

### 1. Request Enrichment (Preprocessing)

Before rule evaluation, incoming requests are enriched by the `PreprocessorService`:

**Location**: `src/services/preprocessor.ts`

**Logic Flow**:
1. **Text Extraction**: Extracts message text from `messages` array (last user message) or `message` field
2. **Content Inspection**: Analyzes text for:
   - **PII Detection**: Emails, phone numbers, ID numbers, credit cards, addresses, ABNs, TFNs, SSNs
   - **Risk Flags**: Violence, hate speech, self-harm, adult content, profanity
   - **Copyright Indicators**: Copyright symbols, long quoted passages
3. **Enrichment**: Adds fields to request context:
   - `contains_pii` (boolean)
   - `pii_types` (array: ['email', 'phone', 'id_number', 'credit_card', etc.])
   - `risk_flags` (array: ['violence', 'hate', 'self_harm', 'adult', 'profanity'])
   - `possible_copyrighted` (boolean)
   - `personal_information` (boolean, set if PII detected)
   - `detected` (object with specific detected values)

**Example**:
```typescript
// Input request
{ "message": "Contact me at john@example.com" }

// After enrichment
{
  "message": "Contact me at john@example.com",
  "contains_pii": true,
  "pii_types": ["email"],
  "personal_information": true,
  "detected": { "emails": ["john@example.com"] }
}
```

### 1b. Rule Detector Insights

- **Location**: `src/services/ruleDetectors.ts`
- **Purpose**: Evaluate the enriched payload (including raw message text) against heuristics for every catalogued rule. Each detector can:
  - Suggest additional context fields (e.g. set `data_class: 'health_record'` when clinical terms are detected)
  - Emit a `RuleInsight` entry with `rule_id`, `confidence`, detected `signals`, and any missing fields required for the CEL condition
- **Output**: Detectors append two artifacts to the payload returned by `PreprocessorService`:
  1. Derived context fields (merged directly onto the request before policy evaluation)
  2. `__rule_insights`: internal array consumed by `EvaluationService` and surfaced to clients as `rule_insights`, enabling the UI/simulator to explain why a rule is likely to match even before the formal CEL condition fires.

This ensures the system parses the actual chat payload, highlights candidate rule matches, and keeps the CEL expressions unchanged.

### 2. Rule Evaluation Order

**Location**: `src/evaluator/cel.ts` → `evaluatePolicy()`

**Logic**:
1. Rules are sorted by `priority` (ascending - lower numbers evaluated first)
2. Each rule is evaluated sequentially until one matches
3. **First Match Wins**: When a rule's condition evaluates to `true`, evaluation stops and that rule's `effect` is returned
4. **Disabled Rules**: Rules with `enabled: false` are skipped (logged in trace but not evaluated)
5. **Default Effect**: If no rules match, the policy's `default_effect` is returned

**Code Reference**:
```432:469:src/evaluator/cel.ts
  // Sort rules by priority (ASC)
  const sortedRules = [...policy.rules].sort((a, b) => a.priority - b.priority);

  const trace: SimulationTraceStep[] = [];

  for (const rule of sortedRules) {
    if (rule.enabled === false) {
      trace.push({
        rule_id: rule.rule_id,
        matched: false,
        skipped: true,
        reason: 'Rule disabled'
      });
      continue;
    }

    const result = evaluateRule(rule, context);
    trace.push({
      rule_id: rule.rule_id,
      matched: result.matched,
      reason: result.reason
    });

    if (result.matched) {
      return {
        decision: rule.effect,
        matched_rule: rule.rule_id,
        trace
      };
    }
  }

  // No rules matched, return default effect
  return {
    decision: policy.evaluation_strategy.default_effect,
    trace
  };
```

---

## Rule Components

### 1. Rule Structure

Each rule contains the following components:

**Schema**: `schemas/auzguard_rule_schema_v1.json`

**Required Fields**:
- `rule_id`: Unique identifier (pattern: `^[A-Z_][A-Z0-9_]*$`)
- `version`: Semantic version (pattern: `^v\d+\.\d+\.\d+$`)
- `title`: Human-readable title (1-200 chars)
- `category`: One of: `PRIVACY`, `HEALTH`, `AI_RISK`, `CDR`, `ANTI_DISCRIM`, `TELECOM`, `COPYRIGHT`, `EXPORT`, `CONSUMER`
- `jurisdiction`: One of: `AU`, `NSW`, `VIC`, `ACT`, `QLD`, `SA`, `WA`, `TAS`, `NT`
- `legal_basis`: Array of legal references
- `condition`: CEL-like expression (evaluated against request context)
- `effect`: One of: `ALLOW`, `BLOCK`, `ROUTE`, `REQUIRE_OVERRIDE`, `WARN_ROUTE`
- `priority`: Integer 1-1000 (lower = evaluated first)
- `severity`: One of: `INFO`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

**Optional Fields**:
- `description`: Detailed description (max 1000 chars)
- `applies_to`: Scope filters (data_class, domains, destinations, models, org_ids)
- `route_to`: Model pool identifier (required if effect is `ROUTE` or `WARN_ROUTE`)
- `obligations`: Array of compliance obligations
- `evidence_requirements`: Array of evidence requirements
- `overrides`: Override configuration
- `audit_log_fields`: Fields to include in audit logs
- `tests`: Test cases for validation
- `enabled`: Boolean (defaults to `true`)
- `metadata`: Operational metadata (owner, last_reviewed, notes)

---

## CEL Expression Evaluator Logic

**Location**: `src/evaluator/cel.ts` → `CELExpressionEvaluator`

### Expression Evaluation Order

1. **Parentheses**: Nested expressions evaluated first
2. **Logical Operators**: `&&` (AND), `||` (OR), `!` (NOT)
3. **Comparison Operators**: `==`, `!=`, `>`, `<`, `>=`, `<=`
4. **Membership**: `in` operator
5. **Functions**: `has()`, `contains()`, `regex_match()`, `starts_with()`, `ends_with()`, `length()`
6. **Field Access**: Direct field references

### Supported Operators

#### 1. Logical Operators

**AND (`&&`)**:
- Short-circuits: Returns `false` on first `false` operand
- All operands must be `true` for result to be `true`

**OR (`||`)**:
- Short-circuits: Returns `true` on first `true` operand
- At least one operand must be `true` for result to be `true`

**NOT (`!`)**:
- Negates the expression result

**Example**:
```cel
data_class == 'financial' && destination_region != 'AU'
```

#### 2. Comparison Operators

**Equality (`==`)**:
- Uses deep equality comparison
- Handles objects, arrays, primitives
- Case-sensitive for strings

**Inequality (`!=`)**:
- Negation of equality

**Numeric/String Comparisons (`>`, `<`, `>=`, `<=`)**:
- Numeric: Compares as numbers
- String: Lexicographic comparison

**Example**:
```cel
priority >= 5 && priority <= 10
```

#### 3. Membership Operator (`in`)

**Logic**:
- Left operand: Value to check
- Right operand: Array to search
- Returns `true` if value exists in array (deep equality)
- If right operand is not an array, returns `false` (silent failure for compound conditions)

**Example**:
```cel
data_class in ['financial', 'banking', 'payment_data']
```

#### 4. Functions

**`has(field_path)`**:
- Checks if field exists in context (not `undefined`)
- Returns `boolean`

**Example**:
```cel
has('org_id') && org_id == 'bank-123'
```

**`contains(haystack, needle)`**:
- Case-insensitive substring search
- Both arguments must be strings
- Returns `boolean`

**Example**:
```cel
contains(message, 'credit card')
```

**`regex_match(value, pattern)`**:
- Case-insensitive regex matching
- Both arguments must be strings
- Returns `boolean`

**Example**:
```cel
regex_match(org_id, '^bank-.*')
```

**`starts_with(value, prefix)`**:
- Case-insensitive prefix check
- Both arguments must be strings
- Returns `boolean`

**Example**:
```cel
starts_with(org_id, 'fintech-')
```

**`ends_with(value, suffix)`**:
- Case-insensitive suffix check
- Both arguments must be strings
- Returns `boolean`

**`length(value)`**:
- Returns `true` if length > 0, `false` otherwise
- Works with: strings, arrays, objects
- For objects: counts keys
- For arrays/strings: counts elements/characters

**Example**:
```cel
length(pii_types) > 0
```

#### 5. Field Access

**Logic**:
- Dot notation: `field.subfield.nested`
- Returns `undefined` if path doesn't exist
- Booleanization rules:
  - `boolean`: Returns as-is
  - `undefined`/`null`: Returns `false`
  - `number`: Returns `true` if `!== 0`
  - `string`: Returns `true` if `length > 0`
  - `array`: Returns `true` if `length > 0`
  - `object`: Returns `true` if has keys

**Example**:
```cel
risk_flags && 'violence' in risk_flags
```

---

## Rule Effects

### 1. ALLOW

**Behavior**: Request proceeds without restrictions

**Use Cases**: Default allow, low-risk scenarios

**Example Rule**:
```json
{
  "rule_id": "LOW_RISK_ALLOW",
  "condition": "risk_level == 'low' && destination_region == 'AU'",
  "effect": "ALLOW"
}
```

### 2. BLOCK

**Behavior**: Request is denied, no processing occurs

**Use Cases**: Compliance violations, high-risk content, prohibited data transfers

**Example Rule**:
```json
{
  "rule_id": "HEALTH_NO_OFFSHORE",
  "condition": "data_class in ['health_record', 'medical_data'] && destination_region != 'AU'",
  "effect": "BLOCK"
}
```

**Logic**: When `BLOCK` is returned, the evaluation service stops processing and returns the decision immediately.

### 3. ROUTE

**Behavior**: Request is routed to a specific model pool

**Requirements**: Must specify `route_to` field

**Use Cases**: Data sovereignty, specialized processing, compliance routing

**Example Rule**:
```json
{
  "rule_id": "CDR_DATA_SOVEREIGNTY",
  "condition": "data_class in ['cdr_data', 'banking_data']",
  "effect": "ROUTE",
  "route_to": "onshore_default_pool"
}
```

**Logic**: The `route_to` value is extracted and included in the evaluation result.

## Residency Outcomes

- **Rule-level**: Each rule can now set `residency_requirement` (`AUTO`, `AU_ONSHORE`, `ON_PREMISE`). When the rule matches, that value is attached to the evaluation result.
- **Policy default**: `residency_requirement_default` applies whenever a rule omits the field.
- **Policy override**: `residency_override` forces every evaluation to honour the specified outcome, even if the matched rule asked for something weaker.

**Routing enforcement**
- `/api/routes/execute` converts the resolved requirement into strict routing preferences:
  - `AU_ONSHORE` → `required_data_residency = 'AU_LOCAL'`
  - `ON_PREMISE` → `requires_on_prem = true` (+ `required_data_residency` if unset)
- `RouteService.rankTargets` uses those flags to disqualify any target that doesn’t meet the residency rule (e.g., a public-cloud OpenAI endpoint will never be picked for an `ON_PREMISE` rule).
- `residency_requirement` is echoed back to the client so UIs and audits show which residency guardrail was enforced.

### 4. REQUIRE_OVERRIDE

**Behavior**: Request requires manual override approval before proceeding

**Requirements**: Should specify `overrides` configuration

**Use Cases**: High-risk scenarios requiring human review, exceptions to strict rules

**Example Rule**:
```json
{
  "rule_id": "PRIV_APP8_CROSS_BORDER",
  "condition": "personal_information == true && destination_region != 'AU'",
  "effect": "REQUIRE_OVERRIDE",
  "overrides": {
    "allowed": true,
    "roles": ["Privacy Officer", "Compliance Manager"],
    "require_justification": true
  }
}
```

**Logic**: When `REQUIRE_OVERRIDE` is returned, the evaluation service extracts override requirements (roles, justification flag) and includes them in the result.

### 5. WARN_ROUTE

**Behavior**: Request is routed with a warning (proceeds but flagged for review)

**Requirements**: Must specify `route_to` field

**Use Cases**: Moderate-risk scenarios that should proceed but need monitoring

**Example Rule**:
```json
{
  "rule_id": "PROFANITY_WARN_INTERNAL",
  "condition": "risk_flags && 'profanity' in risk_flags && audience in ['internal', 'staff']",
  "effect": "WARN_ROUTE",
  "route_to": "onshore_default_pool"
}
```

**Logic**: Similar to `ROUTE` but indicates the request should be flagged for review.

---

## Rule Examples from Base Policy

### Example 1: Health Data Offshore Block

**Rule ID**: `HEALTH_NO_OFFSHORE`

**Condition**: `data_class in ['health_record', 'medical_data', 'patient_data'] && destination_region != 'AU'`

**Logic**:
1. Checks if `data_class` field exists in the request context
2. Evaluates if `data_class` value is in the array `['health_record', 'medical_data', 'patient_data']`
3. Checks if `destination_region` is not equal to `'AU'`
4. Both conditions must be `true` (AND operator)
5. If matched: Returns `BLOCK` effect

**Priority**: 9 (evaluated relatively early)

**Severity**: CRITICAL

### Example 2: Credit Card Offshore Block

**Rule ID**: `CREDIT_CARD_OFFSHORE_BLOCK`

**Condition**: `contains_pii == true && 'credit_card' in pii_types && destination_region != 'AU'`

**Logic**:
1. Checks if `contains_pii` is `true` (set by preprocessor if PII detected)
2. Checks if `'credit_card'` is in the `pii_types` array (set by preprocessor)
3. Checks if `destination_region` is not `'AU'`
4. All three conditions must be `true`
5. If matched: Returns `BLOCK` effect

**Priority**: 6 (evaluated before lower priority rules)

**Severity**: CRITICAL

### Example 3: Sensitive IDs Strict Block

**Rule ID**: `SENSITIVE_IDS_STRICT`

**Condition**: `contains_pii == true && 'id_number' in pii_types && destination_region != 'AU'`

**Logic**:
1. Checks if PII is present (`contains_pii == true`)
2. Checks if ID numbers were detected (`'id_number' in pii_types`)
3. Checks if destination is outside Australia
4. If matched: Returns `BLOCK` effect

**Priority**: 1 (highest priority - evaluated first)

**Severity**: HIGH

### Example 4: Risk Content Guard

**Rule ID**: `RISK_CONTENT_GUARD`

**Condition**: `risk_flags && ('hate' in risk_flags || 'violence' in risk_flags || 'adult' in risk_flags || 'self_harm' in risk_flags)`

**Logic**:
1. Checks if `risk_flags` exists and is truthy (has elements)
2. Checks if any of the high-risk flags are present:
   - `'hate'` OR
   - `'violence'` OR
   - `'adult'` OR
   - `'self_harm'`
3. Uses OR operator - any one match triggers the rule
4. If matched: Returns `BLOCK` effect

**Priority**: 8

**Severity**: HIGH

### Example 5: Profanity Strict Block

**Rule ID**: `PROFANITY_BLOCK_STRICT`

**Condition**: `risk_flags && ('profanity' in risk_flags) && environment in ['prod', 'production'] && (audience == 'customer' || audience == 'external')`

**Logic**:
1. Checks if `risk_flags` exists
2. Checks if `'profanity'` is in risk flags
3. Checks if `environment` is production (`'prod'` or `'production'`)
4. Checks if `audience` is customer-facing (`'customer'` OR `'external'`)
5. All conditions must be `true` (multiple AND operators)
6. If matched: Returns `BLOCK` effect

**Priority**: 4

**Severity**: MEDIUM

### Example 6: Privacy Act APP8 Cross-Border

**Rule ID**: `PRIV_APP8_CROSS_BORDER`

**Condition**: `personal_information == true && destination_region != 'AU'`

**Logic**:
1. Checks if personal information is present (`personal_information == true`)
2. Checks if destination is outside Australia
3. If matched: Returns `REQUIRE_OVERRIDE` effect
4. Override configuration specifies:
   - Allowed roles: `["General Counsel", "Privacy Officer", "Compliance Manager"]`
   - Requires justification: `true`

**Priority**: 2 (very high priority)

**Severity**: HIGH

### Example 7: CDR Data Sovereignty

**Rule ID**: `CDR_DATA_SOVEREIGNTY`

**Condition**: `data_class in ['cdr_data', 'banking_data', 'financial_data']`

**Logic**:
1. Checks if `data_class` is CDR-related
2. If matched: Returns `ROUTE` effect to `onshore_default_pool`
3. No destination check - always routes CDR data onshore

**Priority**: 3

**Severity**: HIGH

### Example 8: PII Redaction Route

**Rule ID**: `PII_REDACT_ROUTE`

**Condition**: `contains_pii == true && environment in ['prod', 'default']`

**Logic**:
1. Checks if PII is detected
2. Checks if environment is production or default
3. If matched: Returns `ROUTE` effect to `onshore_default_pool`
4. Lower priority (10) - catches general PII cases not covered by stricter rules

**Priority**: 10 (low priority - evaluated last)

**Severity**: LOW

### Example 9: Copyright Summarization Warning

**Rule ID**: `COPYRIGHT_SUMMARIZATION_WARN_ROUTE`

**Condition**: `possible_copyrighted == true && purpose == 'summarization'`

**Logic**:
1. Checks if content may be copyrighted (`possible_copyrighted` set by preprocessor)
2. Checks if purpose is summarization
3. If matched: Returns `WARN_ROUTE` effect to `onshore_default_pool`
4. Allows processing but flags for review

**Priority**: 7

**Severity**: LOW

---

## Evaluation Trace

Each evaluation produces a trace showing which rules were evaluated:

**Structure**:
```typescript
{
  rule_id: string;
  matched: boolean;
  skipped?: boolean;
  reason?: string;
}
```

**Logic**:
- Every rule in priority order is logged
- Disabled rules show `skipped: true`
- Matched rules show `matched: true`
- Unmatched rules show `matched: false` with reason

**Example Trace**:
```json
[
  {
    "rule_id": "SENSITIVE_IDS_STRICT",
    "matched": false,
    "reason": "Expression 'contains_pii == true && 'id_number' in pii_types && destination_region != 'AU'' evaluated to false"
  },
  {
    "rule_id": "PRIV_APP8_CROSS_BORDER",
    "matched": true
  }
]
```

---

## Obligations

When a rule matches, its `obligations` array is extracted and included in the evaluation result.

**Common Obligations**:
- `LOG_IMMUTABLE`: Log decision to immutable audit log
- `NOTIFY_DPO`: Notify Data Protection Officer
- `NOTIFY_COMPLIANCE`: Notify compliance team
- `NOTIFY_MANAGER`: Notify manager
- `BIAS_AUDIT`: Require bias audit
- `MASK_AT_REST`: Mask data at rest
- `OBTAIN_CONSENT`: Obtain user consent
- `RISK_REVIEW`: Flag for risk review
- `NOTIFY_ACMA`: Notify Australian Communications and Media Authority

**Logic**: Obligations are extracted from the matched rule and included in the evaluation result for downstream processing.

---

## Override Handling

**Location**: `src/services/evaluation.ts`

**Logic**:
1. When `REQUIRE_OVERRIDE` effect is returned, the evaluation service checks the rule's `overrides` configuration
2. Extracts:
   - `roles`: Array of roles allowed to override
   - `require_justification`: Boolean flag
3. Includes in result as `overrides_required`

**Code Reference**:
```54:63:src/services/evaluation.ts
    // Add override requirements if needed
    if (evaluation.decision === 'REQUIRE_OVERRIDE') {
      const rule = policy.rules.find(r => r.rule_id === evaluation.matched_rule);
      if (rule?.overrides) {
        result.overrides_required = {
          roles: rule.overrides.roles || [],
          require_justification: rule.overrides.require_justification || false
        };
      }
    }
```

---

## Audit Logging

**Location**: `src/services/evaluation.ts` → `evaluate()`

**Logic**:
1. After evaluation, an audit entry is created
2. Fields logged:
   - `org_id`: Organization identifier
   - `rule_id`: Matched rule (or `'no_match'`)
   - `decision`: Effect returned
   - `actor_id`: User/actor making request
   - `request`: Full request context
   - `audit_fields`: Fields specified in `audit_log_fields` from matched rule

**Code Reference**:
```34:42:src/services/evaluation.ts
    // Log the decision
    const auditEntry = await auditService.logDecision(
      orgId,
      evaluation.matched_rule || 'no_match',
      evaluation.decision,
      actorId,
      request,
      this.extractAuditFields(policy.rules, evaluation.matched_rule)
    );
```

---

## Summary

AuzGuard's rule evaluation system:

1. **Enriches** requests with PII detection, risk flags, and copyright indicators
2. **Evaluates** rules in priority order using CEL-like expressions
3. **Stops** at first matching rule (first-match-wins strategy)
4. **Returns** decision with effect, trace, obligations, and routing information
5. **Logs** all decisions to audit trail
6. **Supports** overrides for high-risk scenarios requiring human approval

The system is designed to be deterministic, traceable, and compliant with Australian privacy and AI governance requirements.







