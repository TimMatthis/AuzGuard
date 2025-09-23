// Catalog service for reusable, described rule templates

import path from 'path';
import fs from 'fs';
import { Rule } from '../types';

export interface CatalogRuleSummary {
  rule_id: string;
  title: string;
  description?: string;
  category: string;
  jurisdiction: string;
  effect: string;
  priority: number;
  legal_basis?: string[];
}

export class CatalogService {
  private baseRules: Rule[] = [];

  constructor() {
    try {
      const schemaPath = path.join(__dirname, '..', '..', 'schemas', 'auzguard_ruleset_au_base_v1.json');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      const json = JSON.parse(content);
      const rules = Array.isArray(json?.rules) ? json.rules : [];
      this.baseRules = rules as Rule[];
    } catch (e) {
      this.baseRules = [];
    }
  }

  listRules(): CatalogRuleSummary[] {
    return this.baseRules.map(r => ({
      rule_id: r.rule_id,
      title: r.title,
      description: r.description,
      category: r.category,
      jurisdiction: r.jurisdiction,
      effect: r.effect,
      priority: r.priority,
      legal_basis: r.legal_basis
    }));
  }

  getRule(ruleId: string): Rule | undefined {
    return this.baseRules.find(r => r.rule_id === ruleId);
  }
}

