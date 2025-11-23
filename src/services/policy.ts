// Policy service for CRUD operations and validation

import { PrismaClient, Prisma } from '@prisma/client';
import basePolicyJson from '../../schemas/auzguard_ruleset_au_base_v1.json';
import { Policy, Rule, ValidationError } from '../types';
import { PreprocessorService } from './preprocessor';

export class PolicyService {
  private readonly samplePolicies: Policy[];

  constructor(
    private prisma: PrismaClient,
    private validator: any
  ) {
    this.samplePolicies = [this.normalizeSamplePolicy(basePolicyJson as Policy)];
  }

  async getAllPolicies(): Promise<Policy[]> {
    try {
      const policies = await this.prisma.policy.findMany({
        orderBy: { updated_at: 'desc' }
      });

      if (!policies.length) {
        return this.cloneSamplePolicies();
      }

      return policies.map((policy) => this.mapDbPolicyToPolicy(policy));
    } catch (error) {
      console.warn('[PolicyService] Falling back to bundled sample policies due to database error:', error);
      return this.cloneSamplePolicies();
    }
  }

  async getPolicyById(policyId: string): Promise<Policy | null> {
    try {
      const policy = await this.prisma.policy.findUnique({
        where: { policy_id: policyId }
      });

      if (policy) {
        return this.mapDbPolicyToPolicy(policy);
      }
    } catch (error) {
      console.warn('[PolicyService] Database lookup failed; checking sample policies instead.', error);
    }

    const fallback = this.samplePolicies.find(p => p.policy_id === policyId);
    return fallback ? this.clonePolicy(fallback) : null;
  }

  async createPolicy(policy: Policy, publishedBy: string): Promise<Policy> {
    // Ensure rules is an array (empty allowed)
    if (!Array.isArray(policy.rules)) {
      (policy as any).rules = [];
    }

    const isValid = this.validator(policy);
    if (!isValid) {
      const details = (this.validator.errors || []).map((e: any) => `${e.instancePath || e.schemaPath}: ${e.message}`).join('; ');
      throw new Error(`Policy validation failed: ${details}`);
    }

    const created = await this.prisma.policy.create({
      data: {
        policy_id: policy.policy_id,
        version: policy.version,
        title: policy.title,
        jurisdiction: policy.jurisdiction,
        evaluation_strategy: policy.evaluation_strategy as unknown as Prisma.InputJsonValue,
        rules: this.prepareRulesForPersistence(policy.rules),
        residency_requirement_default: policy.residency_requirement_default,
        residency_override: policy.residency_override,
        published_by: publishedBy
      }
    });

    return this.mapDbPolicyToPolicy(created);
  }

  async updatePolicy(policyId: string, policy: Policy, publishedBy: string): Promise<Policy> {
    if (!Array.isArray(policy.rules)) {
      (policy as any).rules = [];
    }

    const isValid = this.validator(policy);
    if (!isValid) {
      const details = (this.validator.errors || []).map((e: any) => `${e.instancePath || e.schemaPath}: ${e.message}`).join('; ');
      throw new Error(`Policy validation failed: ${details}`);
    }

    const updated = await this.prisma.policy.update({
      where: { policy_id: policyId },
      data: {
        version: policy.version,
        title: policy.title,
        jurisdiction: policy.jurisdiction,
        evaluation_strategy: policy.evaluation_strategy as unknown as Prisma.InputJsonValue,
        rules: this.prepareRulesForPersistence(policy.rules),
        residency_requirement_default: policy.residency_requirement_default,
        residency_override: policy.residency_override,
        published_by: publishedBy
      }
    });

    return this.mapDbPolicyToPolicy(updated);
  }

  async deletePolicy(policyId: string): Promise<void> {
    try {
      // Best-effort cascade: remove dependent records that may reference the policy
      if ((this.prisma as any).modelInvocation) {
        await (this.prisma as any).modelInvocation.deleteMany({ where: { policy_id: policyId } });
      }

      await this.prisma.policy.delete({
        where: { policy_id: policyId }
      });
    } catch (err: any) {
      const code = err?.code || err?.name;
      if (code === 'P2025') {
        throw new Error('Policy not found');
      }
      if (code === 'P2003') {
        throw new Error('Cannot delete policy due to dependent records. Remove related invocations or disable the policy.');
      }
      throw new Error(err?.message || 'Failed to delete policy');
    }
  }

  async validatePolicy(policy: Policy): Promise<{ valid: boolean; errors: ValidationError[] }> {
    const isValid = this.validator(policy);

    if (isValid) {
      return { valid: true, errors: [] };
    }

    const errors: ValidationError[] = this.validator.errors?.map((error: any) => ({
      field: error.instancePath || error.schemaPath,
      message: error.message,
      code: error.keyword
    })) || [];

    return { valid: false, errors };
  }

  async testRule(policyId: string, ruleId: string, testRequest: Record<string, unknown>): Promise<{
    pass: boolean;
    results: Array<{
      name: string;
      passed: boolean;
      expected: string;
      actual: string;
      trace?: Array<{ rule_id: string; matched: boolean; reason?: string }>;
    }>;
  }> {
    const policy = await this.getPolicyById(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    const rule = policy.rules.find(r => r.rule_id === ruleId);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const { evaluatePolicy } = await import('../evaluator/cel');

    const results: Array<{
      name: string;
      passed: boolean;
      expected: string;
      actual: string;
      trace?: Array<{ rule_id: string; matched: boolean; reason?: string }>;
    }> = [];

    const preprocessor = new PreprocessorService();

    for (const test of rule.tests || []) {
      const enriched = preprocessor.enrich(test.request as Record<string, unknown>);
      const evaluation = evaluatePolicy(policy as any, enriched);
      const matchedThisRule = evaluation.matched_rule === rule.rule_id;
      const passed = matchedThisRule && evaluation.decision === test.expect;

      results.push({
        name: test.name,
        passed,
        expected: test.expect,
        actual: evaluation.decision,
        trace: evaluation.trace
      });
    }

    return {
      pass: results.length > 0 && results.every(r => r.passed),
      results
    };
  }

  private mapDbPolicyToPolicy(dbPolicy: any): Policy {
    const normalizedRules: Rule[] = Array.isArray(dbPolicy.rules)
      ? dbPolicy.rules.map((rule: Rule) => this.normalizeRule(rule))
      : [];

    return {
      policy_id: dbPolicy.policy_id,
      version: dbPolicy.version,
      title: dbPolicy.title,
      jurisdiction: dbPolicy.jurisdiction,
      evaluation_strategy: dbPolicy.evaluation_strategy,
      residency_requirement_default: dbPolicy.residency_requirement_default || undefined,
      residency_override: dbPolicy.residency_override || undefined,
      rules: normalizedRules
    };
  }

  private prepareRulesForPersistence(rules: Rule[]): Prisma.InputJsonValue {
    return rules.map(rule => this.prepareRuleForPersistence(rule)) as unknown as Prisma.InputJsonValue;
  }

  private prepareRuleForPersistence(rule: Rule): Rule {
    return {
      ...rule,
      enabled: rule.enabled === false ? false : true,
      metadata: rule.metadata || undefined
    };
  }

  private normalizeRule(rule: Rule): Rule {
    return {
      ...rule,
      enabled: rule.enabled === false ? false : true,
      metadata: rule.metadata || undefined
    };
  }

  private normalizeSamplePolicy(raw: Policy): Policy {
    const policy: Policy = {
      policy_id: raw.policy_id || 'AuzGuard_AU_Base_v1',
      version: raw.version || 'v1.0.0',
      title: raw.title || 'Sample Policy',
      jurisdiction: raw.jurisdiction || 'AU',
      evaluation_strategy: raw.evaluation_strategy,
      residency_requirement_default: raw.residency_requirement_default || 'AUTO',
      residency_override: raw.residency_override || undefined,
      rules: Array.isArray(raw.rules) ? raw.rules.map(rule => this.normalizeRule(rule)) : []
    };

    return policy;
  }

  private cloneSamplePolicies(): Policy[] {
    return this.samplePolicies.map(policy => this.clonePolicy(policy));
  }

  private clonePolicy(policy: Policy): Policy {
    return JSON.parse(JSON.stringify(policy)) as Policy;
  }
}
