import React, { useState } from 'react';
import { Rule, Effect, Severity, Category } from '../types';

interface RuleBuilderProps {
  onRuleCreate: (rule: Rule) => void;
  onCancel: () => void;
  initialRule?: Partial<Rule>;
}

const CATEGORIES: Category[] = [
  'PRIVACY', 'HEALTH', 'AI_RISK', 'CDR', 'ANTI_DISCRIM', 
  'TELECOM', 'COPYRIGHT', 'EXPORT', 'CONSUMER'
];

const EFFECTS: Effect[] = [
  'ALLOW', 'BLOCK', 'ROUTE', 'REQUIRE_OVERRIDE', 'WARN_ROUTE'
];

const SEVERITIES: Severity[] = [
  'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
];

const JURISDICTIONS = [
  'AU', 'NSW', 'VIC', 'ACT', 'QLD', 'SA', 'WA', 'TAS', 'NT'
];

const DATA_CLASSES = [
  'health_record', 'medical_data', 'patient_data',
  'financial', 'banking', 'payment_data',
  'sensitive_personal', 'demographic_data',
  'general', 'public', 'cdr_data'
];

const REGIONS = ['AU', 'US', 'EU', 'UK', 'SG', 'JP'];

const ENVIRONMENTS = ['production', 'staging', 'development', 'testing', 'sandbox'];

export function RuleBuilder({ onRuleCreate, onCancel, initialRule }: RuleBuilderProps) {
  const [rule, setRule] = useState<Partial<Rule>>({
    rule_id: '',
    version: 'v1.0.0',
    title: '',
    description: '',
    category: 'PRIVACY',
    jurisdiction: 'AU',
    legal_basis: [''],
    applies_to: {
      data_class: [],
      domains: [],
      destinations: [],
      models: [],
      org_ids: []
    },
    condition: '',
    effect: 'BLOCK',
    route_to: '',
    obligations: [],
    priority: 10,
    severity: 'MEDIUM',
    audit_log_fields: ['org_id', 'data_class', 'destination_region'],
    overrides: {
      allowed: true,
      roles: ['admin'],
      require_justification: true
    },
    tests: [],
    enabled: true,
    metadata: {
      owner: '',
      last_reviewed: new Date().toISOString().split('T')[0],
      notes: ''
    },
    ...initialRule
  });

  const [conditionBuilder, setConditionBuilder] = useState({
    field: 'data_class',
    operator: 'in',
    value: '',
    logicalOperator: 'AND'
  });

  const [testCase, setTestCase] = useState({
    name: '',
    request: '{}',
    expect: 'BLOCK' as Effect
  });

  const updateRule = (field: keyof Rule, value: any) => {
    setRule(prev => ({ ...prev, [field]: value }));
  };

  const updateAppliesTo = (field: keyof NonNullable<Rule['applies_to']>, value: string[]) => {
    setRule(prev => {
      const appliesTo = prev.applies_to ?? {};
      return {
        ...prev,
        applies_to: {
          ...appliesTo,
          [field]: value
        }
      };
    });
  };

  const updateOverrides = (field: keyof NonNullable<Rule['overrides']>, value: any) => {
    setRule(prev => {
      const overrides = prev.overrides ?? { allowed: false };
      return {
        ...prev,
        overrides: {
          ...overrides,
          [field]: value
        }
      };
    });
  };

  const updateMetadata = (field: keyof NonNullable<Rule['metadata']>, value: string) => {
    setRule(prev => {
      const metadata = prev.metadata ?? {};
      return {
        ...prev,
        metadata: {
          ...metadata,
          [field]: value
        }
      };
    });
  };

  const generateCondition = () => {
    const { field, operator, value } = conditionBuilder;
    let condition = '';

    switch (operator) {
      case 'in':
        const values = value.split(',').map(v => `'${v.trim()}'`).join(', ');
        condition = `${field} in [${values}]`;
        break;
      case 'equals':
        condition = `${field} == '${value}'`;
        break;
      case 'not_equals':
        condition = `${field} != '${value}'`;
        break;
      case 'contains':
        condition = `'${value}' in ${field}`;
        break;
      default:
        condition = `${field} ${operator} '${value}'`;
    }

    if (rule.condition) {
      const connector = conditionBuilder.logicalOperator === 'AND' ? ' && ' : ' || ';
      updateRule('condition', rule.condition + connector + condition);
    } else {
      updateRule('condition', condition);
    }

    setConditionBuilder({ field: 'data_class', operator: 'in', value: '', logicalOperator: 'AND' });
  };

  const addTestCase = () => {
    try {
      const request = JSON.parse(testCase.request);
      const newTest = {
        name: testCase.name,
        request,
        expect: testCase.expect
      };
      
      updateRule('tests', [...(rule.tests || []), newTest]);
      setTestCase({ name: '', request: '{}', expect: 'BLOCK' });
    } catch (error) {
      alert('Invalid JSON in test request');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!rule.rule_id || !rule.title || !rule.condition) {
      alert('Please fill in required fields: Rule ID, Title, and Condition');
      return;
    }

    // Convert rule ID to uppercase with underscores
    const formattedRuleId = rule.rule_id.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    
    const completeRule: Rule = {
      ...rule,
      rule_id: formattedRuleId,
      legal_basis: rule.legal_basis?.filter(basis => basis.trim()) || [],
      obligations: rule.obligations?.filter(obligation => obligation.trim()) || [],
      audit_log_fields: rule.audit_log_fields?.filter(field => field.trim()) || []
    } as Rule;

    onRuleCreate(completeRule);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg space-y-8">
      <div className="border-b border-gray-700 pb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Rule Builder</h2>
        <p className="text-gray-400 text-sm">Create a new compliance rule with guided form inputs</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <section className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="rule_id" className="block text-sm font-medium text-gray-200">Rule ID *</label>
              <input
                type="text"
                id="rule_id"
                value={rule.rule_id}
                onChange={(e) => updateRule('rule_id', e.target.value)}
                placeholder="e.g., FINANCIAL_DATA_ONSHORE"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-400">Will be automatically formatted (uppercase, underscores)</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="version" className="block text-sm font-medium text-gray-200">Version</label>
              <input
                type="text"
                id="version"
                value={rule.version}
                onChange={(e) => updateRule('version', e.target.value)}
                placeholder="v1.0.0"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-200">Title *</label>
            <input
              type="text"
              id="title"
              value={rule.title}
              onChange={(e) => updateRule('title', e.target.value)}
              placeholder="e.g., Financial Data Must Stay Onshore"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-200">Description</label>
            <textarea
              id="description"
              value={rule.description}
              onChange={(e) => updateRule('description', e.target.value)}
              placeholder="Detailed description of what this rule does..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-200">Category</label>
              <select
                id="category"
                value={rule.category}
                onChange={(e) => updateRule('category', e.target.value as Category)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-200">Jurisdiction</label>
              <select
                id="jurisdiction"
                value={rule.jurisdiction}
                onChange={(e) => updateRule('jurisdiction', e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {JURISDICTIONS.map(jur => (
                  <option key={jur} value={jur}>{jur}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="block text-sm font-medium text-gray-200">Priority</label>
              <input
                type="number"
                id="priority"
                value={rule.priority}
                onChange={(e) => updateRule('priority', parseInt(e.target.value))}
                min="1"
                max="1000"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-400">Lower numbers = higher priority</p>
            </div>

            <div className="form-group">
              <label htmlFor="severity">Severity</label>
              <select
                id="severity"
                value={rule.severity}
                onChange={(e) => updateRule('severity', e.target.value as Severity)}
              >
                {SEVERITIES.map(sev => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Legal Basis */}
        <section className="form-section">
          <h3>Legal Basis</h3>
          <div className="form-group">
            <label>Legal Acts/Regulations</label>
            <textarea
              value={rule.legal_basis?.join('\n')}
              onChange={(e) => updateRule('legal_basis', e.target.value.split('\n'))}
              placeholder="Privacy Act 2025&#10;Banking Act&#10;Internal Policy"
              rows={3}
            />
            <small>One per line</small>
          </div>
        </section>

        {/* Scope */}
        <section className="form-section">
          <h3>Applies To (Scope)</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Data Classes</label>
              <div className="checkbox-group">
                {DATA_CLASSES.map(dataClass => (
                  <label key={dataClass} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rule.applies_to?.data_class?.includes(dataClass) || false}
                      onChange={(e) => {
                        const current = rule.applies_to?.data_class || [];
                        if (e.target.checked) {
                          updateAppliesTo('data_class', [...current, dataClass]);
                        } else {
                          updateAppliesTo('data_class', current.filter(dc => dc !== dataClass));
                        }
                      }}
                    />
                    {dataClass}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Organization IDs (patterns)</label>
            <input
              type="text"
              value={rule.applies_to?.org_ids?.join(', ')}
              onChange={(e) => updateAppliesTo('org_ids', e.target.value.split(',').map(s => s.trim()))}
              placeholder="bank-*, fintech-abc, hospital-123"
            />
            <small>Comma-separated. Use * for wildcards</small>
          </div>

          <div className="form-group">
            <label>Domains/Environments</label>
            <input
              type="text"
              value={rule.applies_to?.domains?.join(', ')}
              onChange={(e) => updateAppliesTo('domains', e.target.value.split(',').map(s => s.trim()))}
              placeholder="production, staging, development"
            />
          </div>
        </section>

        {/* Condition Builder */}
        <section className="form-section">
          <h3>Condition Builder</h3>
          
          <div className="condition-builder">
            <div className="form-row">
              <div className="form-group">
                <label>Field</label>
                <select
                  value={conditionBuilder.field}
                  onChange={(e) => setConditionBuilder(prev => ({ ...prev, field: e.target.value }))}
                >
                  <option value="data_class">data_class</option>
                  <option value="destination_region">destination_region</option>
                  <option value="processing_region">processing_region</option>
                  <option value="environment">environment</option>
                  <option value="purpose">purpose</option>
                  <option value="org_id">org_id</option>
                  <option value="personal_information">personal_information</option>
                </select>
              </div>

              <div className="form-group">
                <label>Operator</label>
                <select
                  value={conditionBuilder.operator}
                  onChange={(e) => setConditionBuilder(prev => ({ ...prev, operator: e.target.value }))}
                >
                  <option value="in">in (list)</option>
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                </select>
              </div>

              <div className="form-group">
                <label>Value</label>
                <input
                  type="text"
                  value={conditionBuilder.value}
                  onChange={(e) => setConditionBuilder(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="health_record, medical_data"
                />
              </div>

              <div className="form-group">
                <label>Connect with</label>
                <select
                  value={conditionBuilder.logicalOperator}
                  onChange={(e) => setConditionBuilder(prev => ({ ...prev, logicalOperator: e.target.value }))}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>

              <div className="form-group">
                <button type="button" onClick={generateCondition} className="btn btn--secondary">
                  Add Condition
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="condition">Generated Condition *</label>
            <textarea
              id="condition"
              value={rule.condition}
              onChange={(e) => updateRule('condition', e.target.value)}
              placeholder="data_class in ['health_record'] && destination_region != 'AU'"
              rows={3}
              required
            />
            <small>CEL-like expression. You can edit this directly or use the builder above.</small>
          </div>
        </section>

        {/* Effect and Routing */}
        <section className="form-section">
          <h3>Effect and Routing</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="effect">Effect</label>
              <select
                id="effect"
                value={rule.effect}
                onChange={(e) => updateRule('effect', e.target.value as Effect)}
              >
                {EFFECTS.map(effect => (
                  <option key={effect} value={effect}>{effect}</option>
                ))}
              </select>
            </div>

            {(rule.effect === 'ROUTE' || rule.effect === 'WARN_ROUTE') && (
              <div className="form-group">
                <label htmlFor="route_to">Route To Pool</label>
                <select
                  id="route_to"
                  value={rule.route_to}
                  onChange={(e) => updateRule('route_to', e.target.value)}
                >
                  <option value="">Select pool...</option>
                  <option value="onshore_default_pool">Onshore Default Pool</option>
                  <option value="sandbox_no_persist_pool">Sandbox No Persist Pool</option>
                  <option value="bias_audited_pool">Bias Audited Pool</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Overrides */}
        <section className="form-section">
          <h3>Override Settings</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rule.overrides?.allowed || false}
                  onChange={(e) => updateOverrides('allowed', e.target.checked)}
                />
                Allow Overrides
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rule.overrides?.require_justification || false}
                  onChange={(e) => updateOverrides('require_justification', e.target.checked)}
                />
                Require Justification
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Roles that can override</label>
            <div className="checkbox-group">
              {['admin', 'compliance', 'developer'].map(role => (
                <label key={role} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rule.overrides?.roles?.includes(role) || false}
                    onChange={(e) => {
                      const current = rule.overrides?.roles || [];
                      if (e.target.checked) {
                        updateOverrides('roles', [...current, role]);
                      } else {
                        updateOverrides('roles', current.filter(r => r !== role));
                      }
                    }}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Test Cases */}
        <section className="form-section">
          <h3>Test Cases</h3>
          
          <div className="test-case-builder">
            <div className="form-row">
              <div className="form-group">
                <label>Test Name</label>
                <input
                  type="text"
                  value={testCase.name}
                  onChange={(e) => setTestCase(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Block financial data to US"
                />
              </div>

              <div className="form-group">
                <label>Expected Result</label>
                <select
                  value={testCase.expect}
                  onChange={(e) => setTestCase(prev => ({ ...prev, expect: e.target.value as Effect }))}
                >
                  {EFFECTS.map(effect => (
                    <option key={effect} value={effect}>{effect}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <button type="button" onClick={addTestCase} className="btn btn--secondary">
                  Add Test
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Test Request (JSON)</label>
              <textarea
                value={testCase.request}
                onChange={(e) => setTestCase(prev => ({ ...prev, request: e.target.value }))}
                placeholder='{"org_id": "bank-abc", "data_class": "financial", "destination_region": "US"}'
                rows={3}
              />
            </div>
          </div>

          {rule.tests && rule.tests.length > 0 && (
            <div className="test-cases-list">
              <h4>Added Test Cases:</h4>
              {rule.tests.map((test, index) => (
                <div key={index} className="test-case-item">
                  <strong>{test.name}</strong> - Expect: {test.expect}
                  <button
                    type="button"
                    onClick={() => {
                      const newTests = rule.tests?.filter((_, i) => i !== index);
                      updateRule('tests', newTests);
                    }}
                    className="btn btn--danger btn--small"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Metadata */}
        <section className="form-section">
          <h3>Metadata</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Owner</label>
              <input
                type="text"
                value={rule.metadata?.owner}
                onChange={(e) => updateMetadata('owner', e.target.value)}
                placeholder="compliance-team"
              />
            </div>

            <div className="form-group">
              <label>Last Reviewed</label>
              <input
                type="date"
                value={rule.metadata?.last_reviewed}
                onChange={(e) => updateMetadata('last_reviewed', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={rule.metadata?.notes}
              onChange={(e) => updateMetadata('notes', e.target.value)}
              placeholder="Additional notes about this rule..."
              rows={3}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn--primary">
            Create Rule
          </button>
          <button type="button" onClick={onCancel} className="btn btn--secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
