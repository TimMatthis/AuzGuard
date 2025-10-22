import React, { useMemo, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool, RouteTarget, ModelProfile } from '../types';
import MODEL_CATALOG from '../data/modelCatalog';

type Rag = 'green' | 'amber' | 'red';
const ragStyles: Record<Rag, string> = {
  green: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
  amber: 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
  red: 'text-red-300 bg-red-500/10 border border-red-500/30'
};

const healthStyles: Record<string, string> = {
  healthy: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
  degraded: 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
  unhealthy: 'text-red-300 bg-red-500/10 border border-red-500/30'
};

function quantileThresholds(values: number[]): { low: number; high: number } {
  const arr = [...values].filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (arr.length === 0) return { low: 0, high: 0 };
  const lowIdx = Math.floor(arr.length / 3);
  const highIdx = Math.floor((arr.length * 2) / 3);
  return { low: arr[lowIdx] ?? arr[0], high: arr[highIdx] ?? arr[arr.length - 1] };
}

function ragForLowerIsBetter(value: number | undefined, thresholds: { low: number; high: number }): Rag {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'amber';
  if (value <= thresholds.low) return 'green';
  if (value <= thresholds.high) return 'amber';
  return 'red';
}

function ragForHigherIsBetter(value: number | undefined, thresholds: { low: number; high: number }): Rag {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'amber';
  if (value >= thresholds.high) return 'green';
  if (value >= thresholds.low) return 'amber';
  return 'red';
}

function ResidencyBadge({ target }: { target: RouteTarget }) {
  const residency = target.profile?.compliance?.data_residency || 'unknown';
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-gray-600 bg-gray-800 text-gray-300">
      Residency: {residency}
    </span>
  );
}

export function Models() {
  const queryClient = useQueryClient();
  const { data: pools } = useQuery<ModelPool[]>({
    queryKey: ['model-pools'],
    queryFn: () => apiClient.getModelPools()
  });
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [targetPoolId, setTargetPoolId] = useState<string>('');
  useEffect(() => {
    if (pools && pools.length) {
      if (!selectedPoolId) setSelectedPoolId(pools[0].pool_id);
      if (!targetPoolId) setTargetPoolId(pools[0].pool_id);
    }
  }, [pools, selectedPoolId, targetPoolId]);

  const selectedPool = useMemo<ModelPool | undefined>(() => {
    if (!pools?.length) return undefined;
    if (selectedPoolId) return pools.find(p => p.pool_id === selectedPoolId) || pools[0];
    return pools[0];
  }, [pools, selectedPoolId]);

  const poolTargets = useMemo<RouteTarget[]>(() => selectedPool?.target_profiles || [], [selectedPool]);

  // Mutations
  const addTargetMutation = useMutation({
    mutationFn: (payload: Omit<RouteTarget, 'id'>) => apiClient.createRouteTarget(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['model-pools'] })
  });
  const updateTargetMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<RouteTarget> }) => apiClient.updateRouteTarget(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['model-pools'] })
  });
  const deleteTargetMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteRouteTarget(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['model-pools'] })
  });

  const [weights, setWeights] = useState<Record<string, string>>({});
  const setWeight = (id: string, val: string) => setWeights(prev => ({ ...prev, [id]: val }));
  const saveWeight = (target: RouteTarget) => updateTargetMutation.mutate({ id: target.id, patch: { weight: Number(weights[target.id] ?? target.weight) } });

  // Catalog thresholds
  const catalogLatencies = useMemo(() => MODEL_CATALOG.map(c => c.profile.performance?.p95_latency_ms ?? c.profile.performance?.avg_latency_ms ?? 0), []);
  const catalogCosts = useMemo(() => MODEL_CATALOG.map(c => Number(c.profile.cost?.per_1k_tokens ?? 0)), []);
  const catalogQuality = useMemo(() => MODEL_CATALOG.map(c => Number(c.profile.quality?.score ?? (c.profile.quality?.strength === 'strong' ? 8.5 : c.profile.quality?.strength === 'standard' ? 7.5 : 6.5))), []);
  const latencyThresh = useMemo(() => quantileThresholds(catalogLatencies), [catalogLatencies]);
  const costThresh = useMemo(() => quantileThresholds(catalogCosts), [catalogCosts]);
  const qualityThresh = useMemo(() => quantileThresholds(catalogQuality), [catalogQuality]);

  function perfBreakdownRag(p: ModelProfile) {
    const caps = (p.capabilities || []).map(c => String(c).toLowerCase());
    const tags = (p.tags || {}) as Record<string, unknown>;
    const taskTypes = Array.isArray(tags['task_types']) ? (tags['task_types'] as string[]) : [];
    const has = (k: string) => caps.some(c => c.includes(k));
    const quality = (typeof p.quality?.score === 'number') ? p.quality?.score : (p.quality?.strength === 'strong' ? 8.5 : p.quality?.strength === 'standard' ? 7.5 : 6.5);
    const language = ragForHigherIsBetter(quality, qualityThresh);
    const reasoningSignal = (tags['reasoning'] === true) ? 9 : quality;
    const reasoning = ragForHigherIsBetter(reasoningSignal, qualityThresh);
    const codeSignal = taskTypes.includes('code') ? 9 : has('function') ? 8.5 : has('json') ? 7.5 : 6;
    const code = ragForHigherIsBetter(codeSignal, qualityThresh);
    const multiSignal = (has('multimodal') || has('vision') || has('image') || has('audio')) ? 9 : 6;
    const multimodal = ragForHigherIsBetter(multiSignal, qualityThresh);
    return { language, reasoning, code, multimodal } as const;
  }

  const addCatalogToPool = (item: { provider: string; endpoint: string; profile: ModelProfile }, pool?: ModelPool) => {
    if (!pool) return;
    const payload: Omit<RouteTarget, 'id'> = {
      pool_id: pool.pool_id,
      provider: item.provider,
      endpoint: item.endpoint,
      weight: 100,
      region: pool.region,
      is_active: true,
      profile: item.profile
    } as any;
    addTargetMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Models</h1>
        <select value={selectedPoolId} onChange={(e) => setSelectedPoolId(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm">
          {(pools || []).map(p => (<option key={p.pool_id} value={p.pool_id}>{p.pool_id} ({p.region})</option>))}
        </select>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pools list */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">Pools</h2>
              <p className="text-sm text-gray-400">Select a pool to view and edit targets.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {(pools || []).map(pool => {
              const health = pool.health?.status || 'healthy';
              return (
                <button key={pool.pool_id} onClick={() => setSelectedPoolId(pool.pool_id)}
                  className={`text-left rounded p-3 transition border ${selectedPoolId === pool.pool_id ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-gray-700 bg-gray-900/70 text-gray-200 hover:border-gray-600'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">{pool.region}</p>
                      <h3 className="text-base font-semibold">{pool.pool_id}</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{pool.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${healthStyles[health] || healthStyles.healthy}`}>{health}</span>
                      <span className="text-xs text-gray-400">{pool.targets.length} configured targets</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right side: targets and catalog */}
        <section className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pool targets */}
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6">
              <header className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Pool Targets</h2>
                  <p className="text-sm text-gray-400">Edit weights, pause or remove targets.</p>
                </div>
                {selectedPool && (
                  <span className="px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-xs text-sky-200">{selectedPool.pool_id}</span>
                )}
              </header>
              {!selectedPool ? (
                <p className="text-gray-400 text-sm">Select a pool to view its targets.</p>
              ) : (
                <div className="space-y-3">
                  {poolTargets.map(target => (
                    <div key={target.id} className="rounded border border-gray-700 bg-gray-900/40 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white">{target.provider} / {target.endpoint}</div>
                          <div className="text-xs text-gray-400">Region {target.region} • {target.is_active ? 'Active' : 'Inactive'} • Weight {target.weight}</div>
                        </div>
                        <ResidencyBadge target={target} />
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs">
                        <label className="flex items-center gap-1">
                          <span className="text-gray-400">Weight</span>
                          <input type="number" min={0} max={1000} value={weights[target.id] ?? String(target.weight)} onChange={(e) => setWeight(target.id, e.target.value)} className="w-20 px-2 py-1 rounded bg-gray-900 border border-gray-700 text-white text-xs" />
                          <button onClick={() => saveWeight(target)} disabled={updateTargetMutation.isPending} className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white">Save</button>
                        </label>
                        <button onClick={() => updateTargetMutation.mutate({ id: target.id, patch: { is_active: !target.is_active } })} className="px-2 py-1 rounded border border-gray-600 hover:bg-gray-700">{target.is_active ? 'Pause' : 'Activate'}</button>
                        <button onClick={() => deleteTargetMutation.mutate(target.id)} className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white">Remove</button>
                      </div>
                    </div>
                  ))}
                  {!poolTargets.length && <p className="text-sm text-gray-400">No targets yet. Add models from the catalog →</p>}
                </div>
              )}
            </div>

            {/* Model Catalog with RAG */}
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6">
              <header className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Model Gardens Catalog</h2>
                  <p className="text-sm text-gray-400">RAG rankings for Speed, Cost, and Performance breakdown.</p>
                </div>
                <select value={targetPoolId} onChange={(e) => setTargetPoolId(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm">
                  {(pools || []).map(p => (<option key={p.pool_id} value={p.pool_id}>{p.pool_id} ({p.region})</option>))}
                </select>
              </header>
              <div className="grid grid-cols-1 gap-3 max-h-[560px] overflow-auto pr-1">
                {MODEL_CATALOG.map(item => {
                  const speedRag = ragForLowerIsBetter(item.profile.performance?.p95_latency_ms ?? item.profile.performance?.avg_latency_ms, latencyThresh);
                  const costRag = ragForLowerIsBetter(item.profile.cost?.per_1k_tokens, costThresh);
                  const perfRag = ragForHigherIsBetter(item.profile.quality?.score ?? (item.profile.quality?.strength === 'strong' ? 8.5 : item.profile.quality?.strength === 'standard' ? 7.5 : 6.5), qualityThresh);
                  const breakdown = perfBreakdownRag(item.profile);
                  return (
                    <div key={`${item.provider}-${item.endpoint}`} className="rounded border border-gray-700 bg-gray-900/60 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-white">{item.display_name || `${item.provider} / ${item.endpoint}`}</div>
                          <div className="text-xs text-gray-400">{item.provider} / {item.endpoint}</div>
                        </div>
                        <span className="px-2 py-0.5 text-xs rounded bg-sky-500/10 border border-sky-500/30 text-sky-200">{item.profile.quality?.strength || 'n/a'}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-300 grid grid-cols-3 gap-2">
                        <div>Ctx: <span className="text-white">{item.profile.limits?.context_window_tokens}</span></div>
                        <div>Cost/1k: <span className="text-white">{item.profile.cost?.per_1k_tokens?.toFixed(3)} {item.profile.cost?.currency}</span></div>
                        <div>p95: <span className="text-white">{item.profile.performance?.p95_latency_ms ?? item.profile.performance?.avg_latency_ms} ms</span></div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className={`px-2 py-0.5 rounded ${ragStyles[speedRag]}`}>Speed</span>
                          <span className={`px-2 py-0.5 rounded ${ragStyles[costRag]}`}>Cost</span>
                          <span className={`px-2 py-0.5 rounded ${ragStyles[perfRag]}`}>Performance</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                          <span className={`px-2 py-0.5 rounded ${ragStyles[breakdown.code]}`}>Code</span>
                          <span className={`px-2 py-0.5 rounded ${ragStyles[breakdown.multimodal]}`}>Multimodal</span>
                          <span className={`px-2 py-0.5 rounded ${ragStyles[breakdown.language]}`}>Language</span>
                          <span className={`px-2 py-0.5 rounded ${ragStyles[breakdown.reasoning]}`}>Reasoning</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <button disabled={!targetPoolId || addTargetMutation.isPending} onClick={() => addCatalogToPool(item, (pools || []).find(p => p.pool_id === targetPoolId))} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md disabled:opacity-50">{addTargetMutation.isPending ? 'Adding…' : 'Add to Pool'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Models;

