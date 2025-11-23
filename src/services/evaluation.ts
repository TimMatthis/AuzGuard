// Evaluation service for rule processing and simulation

import { PolicyService } from './policy';
import { AuditService } from './audit';
import { evaluatePolicy } from '../evaluator/cel';
import {
  SimulationInput,
  SimulationResult,
  OverrideRequest,
  OverrideResponse,
  Effect,
  RuleInsight,
  ResidencyRequirement
} from '../types';

export class EvaluationService {
  constructor() {}

  async evaluate(
    policyId: string,
    request: Record<string, unknown>,
    policyService: PolicyService,
    auditService: AuditService,
    orgId?: string,
    actorId?: string
  ): Promise<SimulationResult> {
    // Get the policy
    const policy = await policyService.getPolicyById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Evaluate the policy
    const evaluation = evaluatePolicy(policy, request);

    // Log the decision
    const auditEntry = await auditService.logDecision(
      orgId,
      evaluation.matched_rule || 'no_match',
      evaluation.decision,
      actorId,
      request,
      this.extractAuditFields(policy.rules, evaluation.matched_rule)
    );

    // Build response
    const result: SimulationResult = {
      decision: evaluation.decision,
      trace: evaluation.trace,
      obligations_applied: this.extractObligations(policy.rules, evaluation.matched_rule),
      route_to: this.extractRouteTarget(policy.rules, evaluation.matched_rule),
      matched_rule: evaluation.matched_rule,
      audit_log_id: auditEntry.id
    };

    result.residency_requirement = this.resolveResidencyRequirement(policy, evaluation.matched_rule);

    const ruleInsights = this.extractRuleInsights(request, evaluation.matched_rule);
    if (ruleInsights.length > 0) {
      result.rule_insights = ruleInsights;
    }

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

    return result;
  }

  async simulate(
    input: SimulationInput,
    policyService: PolicyService,
    auditService: AuditService
  ): Promise<SimulationResult> {
    return this.evaluate(
      input.policy_id,
      input.request,
      policyService,
      auditService,
      'simulator', // Special org ID for simulator
      'simulator'  // Special actor ID for simulator
    );
  }

  async executeOverride(
    overrideRequest: OverrideRequest,
    policyService: PolicyService,
    auditService: AuditService
  ): Promise<OverrideResponse> {
    // Get the policy
    const policy = await policyService.getPolicyById(overrideRequest.policy_id);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Find the rule
    const rule = policy.rules.find(r => r.rule_id === overrideRequest.rule_id);
    if (!rule) {
      throw new Error('Rule not found');
    }

    // Check if override is allowed
    if (!rule.overrides?.allowed) {
      throw new Error('Override not allowed for this rule');
    }

    // Check if actor role is authorized
    if (rule.overrides.roles && !rule.overrides.roles.includes(overrideRequest.actor_role)) {
      throw new Error('Actor role not authorized for override');
    }

    // Check justification requirement
    if (rule.overrides.require_justification && !overrideRequest.justification) {
      throw new Error('Justification required for override');
    }

    // Evaluate the policy (this will still match the rule)
    const evaluation = evaluatePolicy(policy, overrideRequest.request);

    // Log the override decision
    const overrideEffect: Effect = rule.effect === 'ROUTE' ? 'ROUTE' : 'ALLOW';
    await auditService.logDecision(
      'override_org', // Special org ID for overrides
      rule.rule_id,
      overrideEffect,
      overrideRequest.actor_id,
      {
        ...overrideRequest.request,
        override_justification: overrideRequest.justification,
        override_actor_role: overrideRequest.actor_role
      },
      this.extractAuditFields(policy.rules, rule.rule_id)
    );

    return {
      decision: rule.effect === 'ROUTE' ? 'ROUTE_WITH_OVERRIDE' : 'ALLOW_WITH_OVERRIDE',
      trace: evaluation.trace,
      obligations_applied: this.extractObligations(policy.rules, rule.rule_id)
    };
  }

  private extractAuditFields(rules: any[], matchedRuleId?: string): string[] {
    const rule = rules.find(r => r.rule_id === matchedRuleId);
    return rule?.audit_log_fields || ['org_id', 'data_class', 'destination_region'];
  }

  private extractObligations(rules: any[], matchedRuleId?: string): string[] {
    const rule = rules.find(r => r.rule_id === matchedRuleId);
    return rule?.obligations || [];
  }

  private extractRouteTarget(rules: any[], matchedRuleId?: string): string | undefined {
    const rule = rules.find(r => r.rule_id === matchedRuleId);
    return rule?.route_to;
  }

  private resolveResidencyRequirement(
    policy: { residency_override?: ResidencyRequirement; residency_requirement_default?: ResidencyRequirement; rules: Array<{ rule_id: string; residency_requirement?: ResidencyRequirement }> },
    matchedRuleId?: string
  ): ResidencyRequirement {
    if (policy.residency_override && policy.residency_override !== 'AUTO') {
      return policy.residency_override;
    }

    const rule = policy.rules.find(r => r.rule_id === matchedRuleId);
    if (rule?.residency_requirement && rule.residency_requirement !== 'AUTO') {
      return rule.residency_requirement;
    }

    return policy.residency_requirement_default || 'AUTO';
  }

  private extractRuleInsights(
    request: Record<string, unknown>,
    matchedRuleId?: string
  ): RuleInsight[] {
    const insights = Array.isArray((request as any)?.__rule_insights)
      ? ((request as any).__rule_insights as RuleInsight[])
      : [];

    if (!insights.length) return [];

    return insights.map(insight =>
      matchedRuleId && insight.rule_id === matchedRuleId
        ? { ...insight, matched: true }
        : { ...insight, matched: insight.matched === true }
    );
  }
}





