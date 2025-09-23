import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { CatalogRuleSummary, Rule } from '../types';

interface CatalogAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  policyId: string;
  preselectRule?: CatalogRuleSummary | null;
  catalogRules?: CatalogRuleSummary[];
  onAdded?: (ruleId: string) => void;
}

export function CatalogAddModal({ isOpen, onClose, policyId, preselectRule, catalogRules, onAdded }: CatalogAddModalProps) {
  const queryClient = useQueryClient();

  const { data: fetchedCatalog } = useQuery({
    queryKey: ['ruleCatalog'],
    queryFn: () => apiClient.getRuleCatalog(),
    enabled: isOpen && !catalogRules,
  });

  const rules = catalogRules || fetchedCatalog || [];

  const [selectedRuleId, setSelectedRuleId] = React.useState<string | ''>(preselectRule?.rule_id || '');
  const [behavior, setBehavior] = React.useState<'replace' | 'skip' | 'duplicate'>('replace');
  const [overridePriority, setOverridePriority] = React.useState<string>('');
  const [overrideRouteTo, setOverrideRouteTo] = React.useState<string>('');
  const [overrideEnabled, setOverrideEnabled] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedRuleId(preselectRule?.rule_id || '');
      setBehavior('replace');
      setOverridePriority('');
      setOverrideRouteTo('');
      setOverrideEnabled(true);
      setError(null);
    }
  }, [isOpen, preselectRule]);

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRuleId) throw new Error('Please select a rule');
      const overrides: Record<string, Partial<Rule>> = {};
      const partial: Partial<Rule> = {};
      if (overridePriority.trim()) partial.priority = Number(overridePriority.trim());
      if (overrideRouteTo.trim()) partial.route_to = overrideRouteTo.trim();
      partial.enabled = overrideEnabled;
      overrides[selectedRuleId] = partial;
      return apiClient.addRulesFromCatalog(policyId, { rule_ids: [selectedRuleId], overrides, behavior });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
      if (onAdded && selectedRuleId) onAdded(selectedRuleId);
      onClose();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Failed to add rule';
      setError(msg);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6 space-y-4 border border-gray-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Add Rule from Catalog</h2>
            <p className="text-sm text-gray-400">Choose a rule and optionally override key fields before adding.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">X</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-gray-300 text-sm">Select Rule</label>
            <select
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">-- Choose a rule --</option>
              {rules.map((r) => (
                <option key={r.rule_id} value={r.rule_id}>
                  {r.rule_id} — {r.title}
                </option>
              ))}
            </select>

            <label className="block text-gray-300 text-sm mt-3">Behavior</label>
            <select
              value={behavior}
              onChange={(e) => setBehavior(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="replace">Replace existing</option>
              <option value="skip">Skip if exists</option>
              <option value="duplicate">Duplicate</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-gray-300 text-sm">Override Priority (optional)</label>
            <input
              value={overridePriority}
              onChange={(e) => setOverridePriority(e.target.value)}
              placeholder="e.g. 5"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />

            <label className="block text-gray-300 text-sm mt-3">Override Route To (optional)</label>
            <input
              value={overrideRouteTo}
              onChange={(e) => setOverrideRouteTo(e.target.value)}
              placeholder="e.g. onshore_default_pool"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />

            <div className="flex items-center gap-2 mt-3">
              <input id="overrideEnabled" type="checkbox" checked={overrideEnabled} onChange={(e) => setOverrideEnabled(e.target.checked)} />
              <label htmlFor="overrideEnabled" className="text-gray-300 text-sm">Enabled</label>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-600 text-red-300 text-sm rounded-md p-3">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white" disabled={addMutation.isPending}>Cancel</button>
          <button
            onClick={() => addMutation.mutate()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50"
            disabled={!selectedRuleId || addMutation.isPending}
          >
            {addMutation.isPending ? 'Adding…' : 'Add Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

