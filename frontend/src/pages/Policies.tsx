import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Policy, Rule, Effect, CatalogRuleSummary } from '../types';
import { CatalogAddModal } from '../components/CatalogAddModal';
import { useAuth } from '../contexts/AuthContext';
// Import Policy JSON and frontend rule editor removed

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500/10 text-red-300 border border-red-500/30',
  HIGH: 'bg-orange-500/10 text-orange-300 border border-orange-500/30',
  MEDIUM: 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30',
  LOW: 'bg-blue-500/10 text-blue-300 border border-blue-500/30',
  INFO: 'bg-gray-500/10 text-gray-200 border border-gray-500/30'
};

const effectColors: Record<string, string> = {
  ALLOW: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  BLOCK: 'bg-red-500/10 text-red-300 border border-red-500/30',
  ROUTE: 'bg-sky-500/10 text-sky-300 border border-sky-500/30',
  WARN_ROUTE: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  REQUIRE_OVERRIDE: 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
};

const enabledStyles = {
  on: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40',
  off: 'bg-gray-700 text-gray-400 border border-gray-600'
};

const EFFECT_OPTIONS: Effect[] = ['ALLOW', 'BLOCK', 'ROUTE', 'REQUIRE_OVERRIDE', 'WARN_ROUTE'];

interface CreatePolicyForm {
  policy_id: string;
  title: string;
  version: string;
  jurisdiction: string;
  default_effect: Effect;
}

const evaluationOrderDescriptions: Record<string, string> = {
  ASC_PRIORITY: 'Start at the highest priority number and walk down the ladder until something matches.',
  DESC_PRIORITY: 'Start at the lowest priority number and walk up the ladder until something matches.',
  DECLARED_ORDER: 'Check the rules in the exact order they appear in the policy.',
};

const conflictResolutionDescriptions: Record<string, string> = {
  FIRST_MATCH: 'Stop at the first rule that matches and use its outcome.',
  COLLECT_ALL: 'Collect every rule that matches before applying downstream logic.',
  MOST_SPECIFIC: 'Pick the rule with the most specific scope when more than one matches.',
};

const effectPlainLanguage: Record<string, string> = {
  ALLOW: 'Allow the request to continue',
  BLOCK: 'Block the request before it leaves the guarded region',
  ROUTE: 'Send the request to a safer model pool',
  WARN_ROUTE: 'Warn the team and reroute the request to a safer model pool',
  REQUIRE_OVERRIDE: 'Pause the request until an authorised manager records an override',
};

const effectActionCopy: Record<string, string> = {
  ALLOW: 'allow the request to continue',
  BLOCK: 'block the request from proceeding',
  ROUTE: 'send the request to the designated model pool',
  WARN_ROUTE: 'warn the team and reroute the request',
  REQUIRE_OVERRIDE: 'require a recorded override before the request can continue',
};

export function Policies() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEditRules = hasPermission('edit_rules');
  const canPublishRules = hasPermission('publish_rules');
  const canManageSettings = hasPermission('manage_settings');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  // const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [showAddFromCatalog, setShowAddFromCatalog] = useState(false);
  const [preselectCatalogRule, setPreselectCatalogRule] = useState<CatalogRuleSummary | null>(null);
  // UI mode: build (add rules) or ladder (view evaluation ladder)
  const [mode, setMode] = useState<'build' | 'ladder'>('build');

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies()
  });

  const { data: catalogRules } = useQuery({
    queryKey: ['ruleCatalog'],
    queryFn: () => apiClient.getRuleCatalog()
  });

  const createPolicyMutation = useMutation({
    mutationFn: async (form: CreatePolicyForm) => {
      const newPolicy: Policy = {
        policy_id: form.policy_id.trim(),
        version: form.version.trim(),
        title: form.title.trim(),
        jurisdiction: form.jurisdiction.trim(),
        evaluation_strategy: {
          order: 'ASC_PRIORITY',
          conflict_resolution: 'FIRST_MATCH',
          default_effect: form.default_effect
        },
        rules: []
      };
      return apiClient.createPolicy(newPolicy);
    },
    onSuccess: (createdPolicy) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      setSelectedPolicyId(createdPolicy.policy_id);
      setShowCreateModal(false);
      setMode('build');
    }
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (policyId: string) => apiClient.deletePolicy(policyId),
    onSuccess: (_, policyId) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      if (selectedPolicyId === policyId) {
        setSelectedPolicyId(null);
      }
      setPolicyToDelete(null);
    }
  });

  const selectedPolicy = useMemo<Policy | undefined>(() => {
    if (!policies || policies.length === 0) return undefined;
    if (selectedPolicyId) {
      return policies.find(policy => policy.policy_id === selectedPolicyId) || policies[0];
    }
    return policies[0];
  }, [policies, selectedPolicyId]);

  const orderedRules = useMemo<Rule[]>(() => {
    if (!selectedPolicy) return [];
    return [...selectedPolicy.rules].sort((a, b) => a.priority - b.priority);
  }, [selectedPolicy]);

  const selectedRule = useMemo<Rule | undefined>(() => {
    if (!orderedRules.length) return undefined;
    if (selectedRuleId) {
      return orderedRules.find(rule => rule.rule_id === selectedRuleId) || orderedRules[0];
    }
    return orderedRules[0];
  }, [orderedRules, selectedRuleId]);

  const createPolicyError = createPolicyMutation.error instanceof Error ? createPolicyMutation.error.message : null;
  const deletePolicyError = deletePolicyMutation.error instanceof Error ? deletePolicyMutation.error.message : null;

  const handleCloseCreateModal = () => {
    createPolicyMutation.reset();
    setShowCreateModal(false);
  };

  const handleCancelDelete = () => {
    deletePolicyMutation.reset();
    setPolicyToDelete(null);
  };

  const updatePolicyMutation = useMutation({
    mutationFn: (policy: Policy) => apiClient.updatePolicy(policy.policy_id, policy),
    onSuccess: (_, updatedPolicy) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', updatedPolicy.policy_id] });
    }
  });

  const toggleRule = (rule: Rule, enabled: boolean) => {
    if (!selectedPolicy) return;

    const updatedPolicy: Policy = {
      ...selectedPolicy,
      rules: selectedPolicy.rules.map(existingRule =>
        existingRule.rule_id === rule.rule_id
          ? { ...existingRule, enabled }
          : existingRule
      )
    };

    updatePolicyMutation.mutate(updatedPolicy);
  };

  const removeRule = (ruleId: string) => {
    if (!selectedPolicy) return;
    const updated = removeRuleFromPolicy(selectedPolicy, ruleId);
    updatePolicyMutation.mutate(updated);
  };

  const handleExportPolicy = (policy: Policy) => {
    const data = JSON.stringify(policy, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${policy.policy_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const policyEnabledCount = useMemo(() => {
    if (!orderedRules.length) return { on: 0, total: 0 };
    const on = orderedRules.filter(rule => rule.enabled !== false).length;
    return { on, total: orderedRules.length };
  }, [orderedRules]);

  const evaluationExplainer = useMemo(() => {
    if (!selectedPolicy) return null;
    const strategy = selectedPolicy.evaluation_strategy;
    const order =
      evaluationOrderDescriptions[strategy.order] ||
      (strategy.order
        ? `Rules run using ${strategy.order.replace(/_/g, ' ').toLowerCase()}.`
        : 'Rules run in the configured order.');
    const conflict =
      conflictResolutionDescriptions[strategy.conflict_resolution] ||
      (strategy.conflict_resolution
        ? `When more than one rule applies we use ${strategy.conflict_resolution.replace(/_/g, ' ').toLowerCase()}.`
        : 'When more than one rule applies we use the policy default.');
    const defaultEffect = strategy.default_effect;
    const defaultEffectLabel = effectPlainLanguage[defaultEffect] || defaultEffect;
    return { order, conflict, defaultEffect, defaultEffectLabel };
  }, [selectedPolicy]);

  const selectedRuleStep = useMemo(() => {
    if (!selectedRule) return null;
    const index = orderedRules.findIndex(rule => rule.rule_id === selectedRule.rule_id);
    return index >= 0 ? index : null;
  }, [orderedRules, selectedRule]);

  const selectedRuleEnabled = selectedRule?.enabled !== false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white">Loading policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Laws, Rules & Policies</h1>
          <p className="text-gray-400 text-sm">
            Configure sovereignty controls and understand how requests flow through your guardrails.
          </p>
        </div>
        <div className="flex gap-3">
          {canPublishRules && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
            >
              New Policy
            </button>
          )}
          {/* Create Rule and Import JSON removed; rules are authored server-side */}
          {selectedPolicy && (
            <button
              onClick={() => handleExportPolicy(selectedPolicy)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Export Policy
            </button>
          )}
          {selectedPolicy && (
            <button
              onClick={() => setMode(mode === 'build' ? 'ladder' : 'build')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
            >
              {mode === 'build' ? 'Show Rules Ladder' : 'Back to Add Rules'}
            </button>
          )}
          {canManageSettings && selectedPolicy && (
            <button
              onClick={() => setPolicyToDelete(selectedPolicy)}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
              disabled={deletePolicyMutation.isPending}
            >
              {deletePolicyMutation.isPending ? 'Deleting�' : 'Delete Policy'}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-white">Policy Catalogue</h2>
            <p className="text-sm text-gray-400">Select an instance to inspect and configure its execution path.</p>
          </div>

          <div className="space-y-3">
            {policies?.map(policy => {
              const isActive = selectedPolicy?.policy_id === policy.policy_id;
              return (
                <button
                  key={policy.policy_id}
                  onClick={() => {
                    setSelectedPolicyId(policy.policy_id);
                    setSelectedRuleId(null);
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    isActive
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-gray-700 bg-gray-800/80 text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-gray-400">{policy.jurisdiction}</p>
                      <h3 className="text-base font-semibold">{policy.title}</h3>
                      <p className="text-xs text-gray-400 mt-1">{policy.policy_id} | v{policy.version}</p>
                    </div>
                    <div className="flex flex-col items-end text-xs text-gray-300">
                      <span>{policy.rules.length} rules</span>
                      <span>default: {policy.evaluation_strategy.default_effect}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="xl:col-span-2 space-y-6">
          {/* Build mode: split screen with Rule Catalog and Policy Builder */}
          {mode === 'build' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Rule Catalog</h2>
                  <p className="text-sm text-gray-400">Add described rules to the selected policy.</p>
                </div>
              </div>
              {!catalogRules?.length ? (
                <p className="text-gray-400 text-sm">No catalog rules available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {catalogRules.map((r: CatalogRuleSummary) => (
                    <div key={r.rule_id} className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">{r.category} • {r.jurisdiction}</p>
                          <h3 className="text-sm font-semibold text-white">{r.title}</h3>
                          <p className="text-xs text-gray-400 mt-1">{r.rule_id}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-md ${effectColors[r.effect] || 'bg-gray-700 text-gray-200'}`}>{r.effect}</span>
                      </div>
                      {r.description && (
                        <p className="text-sm text-gray-300 mt-3 line-clamp-3">{r.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-400">Priority: {r.priority}</div>
                        <button
                          disabled={!selectedPolicy || !canEditRules}
                          onClick={() => { setPreselectCatalogRule(r); setShowAddFromCatalog(true); }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md disabled:opacity-50"
                        >
                          Add to Policy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>

              {/* Policy Builder: quick view of rules currently in policy with ability to remove/enable */}
              <div className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-white">Policy Builder</h2>
                    <p className="text-sm text-gray-400">Current rules in this policy. Remove or toggle as needed.</p>
                  </div>
                  <div>
                    <button
                      onClick={() => setMode('ladder')}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-md"
                    >
                      Show Rules Ladder
                    </button>
                  </div>
                </div>

                {!selectedPolicy || selectedPolicy.rules.length === 0 ? (
                  <p className="text-gray-400 text-sm">No rules added yet. Use the Rule Catalog to add rules.</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedPolicy.rules
                      .slice()
                      .sort((a, b) => a.priority - b.priority)
                      .map((r) => (
                        <li key={r.rule_id} className="rounded border border-gray-700 bg-gray-900/60 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{r.title || r.rule_id}</div>
                              <div className="text-xs text-gray-400">Priority: {r.priority} • Effect: {r.effect}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-300 flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={r.enabled !== false}
                                  onChange={(e) => toggleRule(r, e.target.checked)}
                                />
                                Enabled
                              </label>
                              <button
                                onClick={() => removeRule(r.rule_id)}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Ladder mode: show full evaluation ladder and details */}
          {mode === 'ladder' && (
          <>
          <div className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-6">
            <div className="space-y-5 mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Evaluation Ladder</h2>
                  <p className="text-sm text-gray-400">
                    Requests start at step one and move downward until a rule applies. Each step below explains in plain language what it does.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
                    {policyEnabledCount.on} active
                  </span>
                  <span className="px-3 py-1 rounded-full border border-gray-600 bg-gray-700/60 text-gray-300">
                    {policyEnabledCount.total} total
                  </span>
                </div>
              </div>
              {evaluationExplainer && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100">
                    <p className="text-xs uppercase tracking-wide text-sky-200">Step order</p>
                    <p className="mt-2">{evaluationExplainer.order}</p>
                  </div>
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100">
                    <p className="text-xs uppercase tracking-wide text-sky-200">If more than one matches</p>
                    <p className="mt-2">{evaluationExplainer.conflict}</p>
                  </div>
                  <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sky-100">
                    <p className="text-xs uppercase tracking-wide text-sky-200">If nothing matches</p>
                    <p className="mt-2">Default effect: {evaluationExplainer.defaultEffectLabel} ({evaluationExplainer.defaultEffect})</p>
                  </div>
                </div>
              )}
            </div>

            <ol className="relative border-l border-gray-700/60 pl-6 space-y-4">
              {orderedRules.map((rule, index) => {
                const enabled = rule.enabled !== false;
                const appliesEntries = Object.entries(rule.applies_to || {});
                const plainSummary =
                  rule.description || `If this rule matches we ${effectActionCopy[rule.effect] || 'apply the configured outcome.'}`;
                const statusCopy = enabled ? 'Currently active in the ladder.' : 'Paused - requests skip this step.';
                return (
                  <li key={rule.rule_id} className="relative">
                    <span className="absolute -left-[29px] flex items-center justify-center w-6 h-6 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-300">
                      {index + 1}
                    </span>
                    <div
                      className={`rounded-lg border p-4 transition-colors cursor-pointer ${
                        selectedRule?.rule_id === rule.rule_id
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-gray-700 bg-gray-800/80 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedRuleId(rule.rule_id)}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Step {index + 1} - Priority {rule.priority}</p>
                          <h3 className="text-base font-semibold text-white flex items-center gap-2 mt-1">
                            {rule.title}
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${enabled ? enabledStyles.on : enabledStyles.off}`}
                            >
                              {enabled ? 'On' : 'Off'}
                            </span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">{rule.rule_id}</p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 text-xs text-gray-400">
                        <div className="flex flex-wrap gap-2 justify-end">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[rule.severity]}`}>
                            {rule.severity}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${effectColors[rule.effect]}`}>
                            {rule.effect}
                          </span>
                        </div>
                          <p className="text-[11px] text-gray-500 sm:text-right">{statusCopy}</p>
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-gray-200 leading-relaxed">
                        {plainSummary}
                      </div>
                      {appliesEntries.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400">It looks at</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-200">
                            {appliesEntries.map(([key, value]) => (
                              <span
                                key={key}
                                className="px-2 py-1 rounded bg-gray-900/60 border border-gray-700"
                              >
                                {key.replace(/_/g, ' ')}: {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {rule.route_to && (
                        <div className="mt-3 rounded border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
                          Matching requests are routed to {rule.route_to}.
                        </div>
                      )}
                      {rule.legal_basis.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Grounded in</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-200">
                            {rule.legal_basis.map(basis => (
                              <span key={basis} className="px-2 py-1 rounded bg-gray-700/70 border border-gray-600">
                                {basis}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRule(rule, !enabled);
                          }}
                          disabled={updatePolicyMutation.isPending || !canPublishRules}
                          className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                            enabled ? 'border-emerald-500 text-emerald-200 hover:bg-emerald-500/20' : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          } ${!canPublishRules ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {enabled ? 'Disable' : 'Enable'}
                        </button>
                        {canEditRules && selectedPolicy && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/policies/${selectedPolicy.policy_id}/rules/${rule.rule_id}`);
                            }}
                            className="text-xs px-3 py-1 rounded-md border border-sky-500 text-sky-200 hover:bg-sky-500/10 transition-colors"
                          >
                            View / Edit
                          </button>
                        )}
                      </div>
                      {canEditRules && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          Opening the editor captures every change in the audit log.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
          
          <div className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-6">
            {selectedRule ? (
              <div className="space-y-4">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-white">{selectedRule.title}</h3>
                    <p className="text-sm text-gray-400">{selectedRule.rule_id} - Step {selectedRuleStep !== null ? `${selectedRuleStep + 1} of ${orderedRules.length}` : '-'} - Priority {selectedRule.priority}</p>
                  </div>
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end lg:items-end">
                    <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[selectedRule.severity]}`}>
                        Severity {selectedRule.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${effectColors[selectedRule.effect]}`}>
                        Effect {selectedRule.effect}
                      </span>
                    </div>
                    {canEditRules && selectedPolicy && (
                      <div className="flex flex-col items-start gap-1 sm:items-end">
                        <button
                          onClick={() => navigate(`/policies/${selectedPolicy.policy_id}/rules/${selectedRule.rule_id}`)}
                          className="text-xs px-3 py-1 rounded-md border border-sky-500 text-sky-200 hover:bg-sky-500/10 transition-colors"
                        >
                          Open rule editor
                        </button>
                        <span className="text-[11px] text-gray-500">Every change is captured in the audit log.</span>
                      </div>
                    )}
                  </div>
                </header>

                <div className="rounded-md border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-50">
                  <p className="font-medium text-sky-100">What this step does</p>
                  <p className="mt-1">{effectPlainLanguage[selectedRule.effect] || `Outcome: ${selectedRule.effect}`}</p>
                  <p className="mt-1">{selectedRuleEnabled ? 'Status: Active - matching requests stop here.' : 'Status: Paused - matching requests skip this step.'}</p>
                  {selectedRule.route_to && (
                    <p className="mt-1">Routes traffic to <span className="font-mono text-sky-100">{selectedRule.route_to}</span>.</p>
                  )}
                  <p className="mt-1 text-sky-200">If a request moves past this step, the next rule in the ladder is evaluated.</p>
                </div>

                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-200">Legal basis</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                    {selectedRule.legal_basis.map((item) => (
                      <span key={item} className="px-2 py-1 rounded bg-gray-700/70 border border-gray-600">
                        {item}
                      </span>
                    ))}
                  </div>
                </section>

                {selectedRule.description && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-200">Description</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{selectedRule.description}</p>
                  </section>
                )}

                <section className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-200">Condition</h4>
                  <pre className="bg-gray-900/70 rounded-md p-3 text-xs text-gray-100 overflow-x-auto">
{selectedRule.condition}
                  </pre>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                  <div>
                    <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Applies to</h5>
                    <div className="space-y-1">
                      {selectedRule.applies_to ? (
                        Object.entries(selectedRule.applies_to).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-xs text-gray-400">{key.replace(/_/g, ' ')}</span>
                            <p>{Array.isArray(value) ? value.join(', ') : 'not specified'}</p>
                          </div>
                        ))
                      ) : (
                        <p>No specific scope configured.</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Obligations</h5>
                    {selectedRule.obligations?.length ? (
                      <ul className="list-disc list-inside space-y-1 text-gray-200">
                        {selectedRule.obligations.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No obligations enforced.</p>
                    )}
                  </div>
                </section>

                {selectedRule.overrides && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-200">Override flow</h4>
                    {selectedRule.overrides.allowed ? (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
                        <p className="font-medium">Override permitted</p>
                        <p>Roles: {selectedRule.overrides.roles?.join(', ') || 'not specified'}</p>
                        <p>Justification required: {selectedRule.overrides.require_justification ? 'Yes' : 'No'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-300">Override is not permitted for this rule.</p>
                    )}
                  </section>
                )}

                {selectedRule.metadata && (
                  <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                    {selectedRule.metadata.owner && (
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-400">Owner</span>
                        <p>{selectedRule.metadata.owner}</p>
                      </div>
                    )}
                    {selectedRule.metadata.last_reviewed && (
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-400">Last reviewed</span>
                        <p>{selectedRule.metadata.last_reviewed}</p>
                      </div>
                    )}
                    {selectedRule.metadata.notes && (
                      <div className="md:col-span-2">
                        <span className="text-xs uppercase tracking-wide text-gray-400">Notes</span>
                        <p>{selectedRule.metadata.notes}</p>
                      </div>
                    )}
                  </section>
                )}

                {selectedRule.tests && selectedRule.tests.length > 0 && (
                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-200">Regression tests</h4>
                    <div className="space-y-2">
                      {selectedRule.tests.map(test => (
                        <div key={test.name} className="p-3 rounded border border-gray-700 bg-gray-900/60 text-xs text-gray-200">
                          <p className="font-medium">{test.name}</p>
                          <p className="text-gray-400">Expect: {test.expect}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-16">
                <p>Select a rule from the evaluation ladder to inspect its flow.</p>
              </div>
            )}
          </div>
          </>
          )}
        </section>
      </div>

      <CreatePolicyModal
        isOpen={showCreateModal}
        onClose={handleCloseCreateModal}
        onSubmit={(form) => createPolicyMutation.mutate(form)}
        isSubmitting={createPolicyMutation.isPending}
        errorMessage={createPolicyError}
      />
      <DeletePolicyDialog
        policy={policyToDelete}
        onCancel={handleCancelDelete}
        onConfirm={(policyId) => deletePolicyMutation.mutate(policyId)}
        isDeleting={deletePolicyMutation.isPending}
        errorMessage={deletePolicyError}
      />
      {/* Import Policy JSON removed */}

      {selectedPolicy && (
        <CatalogAddModal
          isOpen={showAddFromCatalog}
          onClose={() => setShowAddFromCatalog(false)}
          policyId={selectedPolicy.policy_id}
          preselectRule={preselectCatalogRule || undefined}
          catalogRules={catalogRules}
          onAdded={(ruleId) => setSelectedRuleId(ruleId)}
        />
      )}
    </div>
  );
}

// Helper to remove a rule from the currently selected policy (by id)
function removeRuleFromPolicy(policy: Policy, ruleId: string): Policy {
  return {
    ...policy,
    rules: policy.rules.filter(r => r.rule_id !== ruleId)
  };
}



interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: CreatePolicyForm) => void;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

function CreatePolicyModal({ isOpen, onClose, onSubmit, isSubmitting, errorMessage }: CreatePolicyModalProps) {
  const [form, setForm] = React.useState<CreatePolicyForm>({
    policy_id: '',
    title: '',
    version: 'v1.0.0',
    jurisdiction: 'AU',
    default_effect: 'ALLOW'
  });

  React.useEffect(() => {
    if (isOpen) {
      setForm({
        policy_id: '',
        title: '',
        version: 'v1.0.0',
        jurisdiction: 'AU',
        default_effect: 'ALLOW'
      });
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const canSubmit = form.policy_id.trim().length > 0 && form.title.trim().length > 0 && form.version.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 border border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">New Policy</h2>
            <p className="text-sm text-gray-400">Define a shell policy ready for rule authoring.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">X</button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-gray-300 mb-1">Policy ID</label>
            <input
              value={form.policy_id}
              onChange={(event) => setForm((prev: CreatePolicyForm) => ({ ...prev, policy_id: event.target.value }))}
              placeholder="Finance_Onshore_v1"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-xs text-gray-500 mt-1">Use snake_case or kebab-case. This becomes the stable identifier.</p>
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(event) => setForm((prev: CreatePolicyForm) => ({ ...prev, title: event.target.value }))}
              placeholder="Financial Sovereignty Policy"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Version</label>
              <input
                value={form.version}
                onChange={(event) => setForm((prev: CreatePolicyForm) => ({ ...prev, version: event.target.value }))}
                placeholder="v1.0.0"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Jurisdiction</label>
              <input
                value={form.jurisdiction}
                onChange={(event) => setForm((prev: CreatePolicyForm) => ({ ...prev, jurisdiction: event.target.value }))}
                placeholder="AU"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Default Effect</label>
            <select
              value={form.default_effect}
              onChange={(event) => setForm((prev: CreatePolicyForm) => ({ ...prev, default_effect: event.target.value as Effect }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {EFFECT_OPTIONS.map(effect => (
                <option key={effect} value={effect}>{effect}</option>
              ))}
            </select>
          </div>

          {errorMessage && (
            <div className="bg-red-900/20 border border-red-600 text-red-300 text-sm rounded-md p-3">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(form)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Creating�' : 'Create Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DeletePolicyDialogProps {
  policy: Policy | null;
  onCancel: () => void;
  onConfirm: (policyId: string) => void;
  isDeleting: boolean;
  errorMessage?: string | null;
}

function DeletePolicyDialog({ policy, onCancel, onConfirm, isDeleting, errorMessage }: DeletePolicyDialogProps) {
  if (!policy) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 border border-gray-700">
        <h2 className="text-xl font-semibold text-white">Delete policy?</h2>
        <p className="text-sm text-gray-300">You are about to delete <span className="font-semibold">{policy.title}</span>. This action cannot be undone.</p>

        {errorMessage && (
          <div className="bg-red-900/20 border border-red-600 text-red-300 text-sm rounded-md p-3">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-300 hover:text-white" disabled={isDeleting}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(policy.policy_id)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting�' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
