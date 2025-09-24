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
    if (expr.includes(' >= ')) {
      return this.evaluateComparison(expr, '>=');
    }
    if (expr.includes(' <= ')) {
      return this.evaluateComparison(expr, '<=');
    }
    if (expr.includes(' > ')) {
      return this.evaluateComparison(expr, '>');
    }
    if (expr.includes(' < ')) {
      return this.evaluateComparison(expr, '<');
    }
    if (expr.includes(' == ')) {
      return this.evaluateEquality(expr);
    }

    if (expr.includes(' != ')) {
      return !this.evaluateEquality(expr);
    }

    if (expr.includes(' in ')) {
      return this.evaluateInOperator(expr);
    }

    // Handle functions: has(), contains(), regex_match(), starts_with(), ends_with(), length()
    if (expr.endsWith(')')) {
      if (expr.startsWith('has(')) return this.evaluateHasFunction(expr);
      if (expr.startsWith('contains(')) return this.evaluateContainsFunction(expr);
      if (expr.startsWith('regex_match(')) return this.evaluateRegexMatchFunction(expr);
      if (expr.startsWith('starts_with(')) return this.evaluateStartsWithFunction(expr);
      if (expr.startsWith('ends_with(')) return this.evaluateEndsWithFunction(expr);
      if (expr.startsWith('length(')) return this.evaluateLengthFunction(expr);
    }

    // Handle simple boolean literals
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Handle field access
    return this.evaluateFieldAccess(expr);
  }

  private evaluateComparison(expr: string, op: '>=' | '<=' | '>' | '<'): boolean {
    const sep = ` ${op} `;
    const parts = this.splitByOperator(expr, sep);
    if (parts.length !== 2) throw new Error('Invalid comparison expression');
    const left = this.resolveValue(parts[0].trim());
    const right = this.resolveValue(parts[1].trim());
    if (typeof left === 'number' && typeof right === 'number') {
      switch (op) {
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '>': return left > right;
        case '<': return left < right;
      }
    }
    if (typeof left === 'string' && typeof right === 'string') {
      switch (op) {
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '>': return left > right;
        case '<': return left < right;
      }
    }
    return false;
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
    for (const raw of parts) {
      const part = raw.trim();
      const val = this.evaluateExpression(part);
      if (!val) return false; // short-circuit
    }
    return true;
  }

  private evaluateLogicalOr(expr: string): boolean {
    const parts = this.splitByOperator(expr, ' || ');
    for (const raw of parts) {
      const part = raw.trim();
      if (this.evaluateExpression(part)) return true; // short-circuit
    }
    return false;
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
      // Treat non-array RHS as empty collection to avoid noisy errors in compound AND conditions
      return false;
    }

    return collection.some(item => this.deepEqual(item, value));
  }

  private evaluateHasFunction(expr: string): boolean {
    const field = expr.slice(4, -1).trim().replace(/^['"]|['"]$/g, '');
    return this.hasField(field);
  }

  private evaluateContainsFunction(expr: string): boolean {
    // contains(value, needle)
    const args = this.parseFunctionArgs(expr, 'contains');
    if (args.length !== 2) throw new Error('contains() expects 2 arguments');
    const hay = this.resolveValue(args[0]);
    const needle = this.resolveValue(args[1]);
    if (typeof hay !== 'string' || typeof needle !== 'string') return false;
    return hay.toLowerCase().includes(needle.toLowerCase());
  }

  private evaluateRegexMatchFunction(expr: string): boolean {
    // regex_match(value, pattern)
    const args = this.parseFunctionArgs(expr, 'regex_match');
    if (args.length !== 2) throw new Error('regex_match() expects 2 arguments');
    const value = this.resolveValue(args[0]);
    const pattern = this.resolveValue(args[1]);
    if (typeof value !== 'string' || typeof pattern !== 'string') return false;
    try {
      const re = new RegExp(pattern, 'i');
      return re.test(value);
    } catch (e) {
      throw new Error('Invalid regex pattern');
    }
  }

  private evaluateStartsWithFunction(expr: string): boolean {
    const args = this.parseFunctionArgs(expr, 'starts_with');
    if (args.length !== 2) throw new Error('starts_with() expects 2 arguments');
    const value = this.resolveValue(args[0]);
    const prefix = this.resolveValue(args[1]);
    if (typeof value !== 'string' || typeof prefix !== 'string') return false;
    return value.toLowerCase().startsWith(prefix.toLowerCase());
  }

  private evaluateEndsWithFunction(expr: string): boolean {
    const args = this.parseFunctionArgs(expr, 'ends_with');
    if (args.length !== 2) throw new Error('ends_with() expects 2 arguments');
    const value = this.resolveValue(args[0]);
    const suffix = this.resolveValue(args[1]);
    if (typeof value !== 'string' || typeof suffix !== 'string') return false;
    return value.toLowerCase().endsWith(suffix.toLowerCase());
  }

  private evaluateLengthFunction(expr: string): boolean {
    const args = this.parseFunctionArgs(expr, 'length');
    if (args.length !== 1) throw new Error('length() expects 1 argument');
    const value = this.resolveValue(args[0]);
    let len = 0;
    if (typeof value === 'string' || Array.isArray(value)) len = (value as any).length;
    else if (value && typeof value === 'object') len = Object.keys(value as Record<string, unknown>).length;
    // Non-zero length considered true, zero is false (consistent with evaluator booleanization)
    return len > 0;
  }

  private parseFunctionArgs(expr: string, name: string): string[] {
    const inner = expr.slice(name.length + 1, -1); // remove name(
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(inner.substring(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(inner.substring(start).trim());
    return parts;
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
