// CEL-like expression evaluator for AuzGuard rules

import { Effect, Rule, SimulationTraceStep } from '../types';

export interface EvaluationContext {
  [key: string]: unknown;
}

export interface EvaluationResult {
  matched: boolean;
  reason?: string;
}

export class CELExpressionEvaluator {
  private context: EvaluationContext;

  constructor(context: EvaluationContext) {
    this.context = context;
  }

  /**
   * Evaluate a CEL-like expression against the context
   */
  evaluate(expression: string): EvaluationResult {
    try {
      // Clean and parse the expression
      const cleaned = this.cleanExpression(expression);
      const result = this.evaluateExpression(cleaned);

      return {
        matched: Boolean(result),
        reason: result ? undefined : `Expression '${expression}' evaluated to false`
      };
    } catch (error) {
      return {
        matched: false,
        reason: `Expression evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private cleanExpression(expr: string): string {
    return expr.trim().replace(/\s+/g, ' ');
  }

  private evaluateExpression(expr: string): boolean {
    // Handle parentheses first
    if (expr.includes('(')) {
      return this.evaluateWithParentheses(expr);
    }

    // Handle logical operators
    if (expr.includes(' && ')) {
      return this.evaluateLogicalAnd(expr);
    }

    if (expr.includes(' || ')) {
      return this.evaluateLogicalOr(expr);
    }

    // Handle negation
    if (expr.startsWith('!')) {
      return !this.evaluateExpression(expr.substring(1).trim());
    }

    // Handle comparison operators
    if (expr.includes(' == ')) {
      return this.evaluateEquality(expr);
    }

    if (expr.includes(' != ')) {
      return !this.evaluateEquality(expr);
    }

    if (expr.includes(' in ')) {
      return this.evaluateInOperator(expr);
    }

    // Handle has() function
    if (expr.startsWith('has(') && expr.endsWith(')')) {
      return this.evaluateHasFunction(expr);
    }

    // Handle simple boolean literals
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Handle field access
    return this.evaluateFieldAccess(expr);
  }

  private evaluateWithParentheses(expr: string): boolean {
    let depth = 0;
    let start = -1;

    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') {
        if (depth === 0) start = i;
        depth++;
      } else if (expr[i] === ')') {
        depth--;
        if (depth === 0 && start !== -1) {
          const innerExpr = expr.substring(start + 1, i);
          const innerResult = this.evaluateExpression(innerExpr);
          const newExpr = expr.substring(0, start) + (innerResult ? 'true' : 'false') + expr.substring(i + 1);
          return this.evaluateExpression(newExpr);
        }
      }
    }

    throw new Error('Mismatched parentheses');
  }

  private evaluateLogicalAnd(expr: string): boolean {
    const parts = this.splitByOperator(expr, ' && ');
    return parts.every(part => this.evaluateExpression(part.trim()));
  }

  private evaluateLogicalOr(expr: string): boolean {
    const parts = this.splitByOperator(expr, ' || ');
    return parts.some(part => this.evaluateExpression(part.trim()));
  }

  private evaluateEquality(expr: string): boolean {
    const parts = this.splitByOperator(expr, ' == ');
    if (parts.length !== 2) {
      throw new Error('Invalid equality expression');
    }

    const left = this.resolveValue(parts[0].trim());
    const right = this.resolveValue(parts[1].trim());

    return this.deepEqual(left, right);
  }

  private evaluateInOperator(expr: string): boolean {
    const parts = this.splitByOperator(expr, ' in ');
    if (parts.length !== 2) {
      throw new Error('Invalid in expression');
    }

    const value = this.resolveValue(parts[0].trim());
    const collection = this.resolveValue(parts[1].trim());

    if (!Array.isArray(collection)) {
      throw new Error('Right-hand side of in operator must be an array');
    }

    return collection.some(item => this.deepEqual(item, value));
  }

  private evaluateHasFunction(expr: string): boolean {
    const field = expr.slice(4, -1).trim().replace(/^['"]|['"]$/g, '');
    return this.hasField(field);
  }

  private evaluateFieldAccess(field: string): boolean {
    const value = this.resolveValue(field);
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      return value.length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }

    return false;
  }

  private resolveValue(token: string): unknown {
    if (token.startsWith("'")) {
      return token.slice(1, -1);
    }

    if (token.startsWith('"')) {
      return token.slice(1, -1);
    }

    if (token === 'true') return true;
    if (token === 'false') return false;

    if (!Number.isNaN(Number(token))) {
      return Number(token);
    }

    if (token.startsWith('[') && token.endsWith(']')) {
      try {
        return JSON.parse(token.replace(/'/g, '"'));
      } catch (error) {
        throw new Error('Invalid array literal');
      }
    }

    // Handle field access
    return this.getFieldValue(token);
  }

  private getFieldValue(fieldPath: string): unknown {
    const parts = fieldPath.split('.');
    let current: unknown = this.context;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private hasField(fieldPath: string): boolean {
    const value = this.getFieldValue(fieldPath);
    return value !== undefined;
  }

  private splitByOperator(expr: string, operator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i <= expr.length - operator.length; i++) {
      if (expr.substring(i, i + operator.length) === operator && depth === 0) {
        parts.push(expr.substring(start, i));
        start = i + operator.length;
        i += operator.length - 1;
      } else if (expr[i] === '(') {
        depth++;
      } else if (expr[i] === ')') {
        depth--;
      }
    }

    parts.push(expr.substring(start));
    return parts;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (a == null || b == null) return a === b;

    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => this.deepEqual(item, b[index]));
      }

      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;
      const aKeys = Object.keys(aObj);
      const bKeys = Object.keys(bObj);

      if (aKeys.length !== bKeys.length) return false;

      return aKeys.every(key => this.deepEqual(aObj[key], bObj[key]));
    }

    return false;
  }
}

/**
 * Evaluate a rule against a request context
 */
export function evaluateRule(
  rule: Pick<Rule, 'condition' | 'priority' | 'rule_id'>,
  context: EvaluationContext
): EvaluationResult {
  const evaluator = new CELExpressionEvaluator(context);
  return evaluator.evaluate(rule.condition);
}

/**
 * Evaluate a policy against a request context
 */
export function evaluatePolicy(
  policy: {
    rules: Array<Rule>;
    evaluation_strategy: { order: string; conflict_resolution: string; default_effect: Effect };
  },
  context: EvaluationContext
): {
  decision: Effect;
  matched_rule?: string;
  trace: SimulationTraceStep[];
} {
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
}
