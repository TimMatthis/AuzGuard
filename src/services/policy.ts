// Policy service for CRUD operations and validation

import { PrismaClient, Prisma } from '@prisma/client';
import { Policy, Rule, ValidationError } from '../types';
import { PreprocessorService } from './preprocessor';

export class PolicyService {
  constructor(
    private prisma: PrismaClient,
    private validator: any
  ) {}

  async getAllPolicies(): Promise<Policy[]> {
    const policies = await this.prisma.policy.findMany({
      orderBy: { updated_at: 'desc' }
    });

    return policies.map((policy) => this.mapDbPolicyToPolicy(policy));
  }

  async getPolicyById(policyId: string): Promise<Policy | null> {
    const policy = await this.prisma.policy.findUnique({
      where: { policy_id: policyId }
    });

    return policy ? this.mapDbPolicyToPolicy(policy) : null;
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
        published_by: publishedBy
      }
    });

    return this.mapDbPolicyToPolicy(updated);
  }

  async deletePolicy(policyId: string): Promise<void> {
    await this.prisma.policy.delete({
      where: { policy_id: policyId }
    });
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
}
