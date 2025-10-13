import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool, RouteTarget, ModelProfile } from '../types';
import { PageLayout, Panel } from '../components/PageLayout';
import MODEL_CATALOG from '../data/modelCatalog';

const healthColors: Record<string, string> = {
  healthy: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
  degraded: 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
  unhealthy: 'text-red-300 bg-red-500/10 border border-red-500/30'
};

function bestFor(target: RouteTarget): string[] {
  const out: string[] = [];
  const caps = target.profile?.capabilities || [];
  const tags = (target.profile?.tags || {}) as Record<string, unknown>;
  const taskTypes = Array.isArray(tags['task_types']) ? (tags['task_types'] as string[]) : [];
  if (taskTypes.length) out.push(...taskTypes.map(t => t.replace(/_/g, ' ')));
  if (caps.includes('multimodal')) out.push('multimodal');
  if (caps.includes('json-mode')) out.push('structured output');
  if ((tags['bias_audited'] as boolean)) out.push('sensitive/high-risk workloads');
  if ((tags['sandbox'] as boolean)) out.push('development/testing');
  return Array.from(new Set(out));
}

function ResidencyBadge({ target }: { target: RouteTarget }) {
  const residency = target.profile?.compliance?.data_residency || 'unknown';
  return (
    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded border border-gray-600 bg-gray-800 text-gray-300">
      Residency: {residency}
    </span>
  );
}

function Certs({ target }: { target: RouteTarget }) {
  const certs = target.profile?.compliance?.certifications || [];
  if (!certs.length) return null;
  return (
    <div className="text-xs text-gray-400">Certifications: {certs.join(', ')}</div>
  );
}

export function Models() {
  const queryClient = useQueryClient();
  const { data: pools, isLoading, isError, error } = useQuery<ModelPool[]>({
    queryKey: ['model-pools'],
    queryFn: () => apiClient.getModelPools()
  });
  const [selectedPoolId, setSelectedPoolId] = React.useState<string | null>(null);
  const [targetPoolId, setTargetPoolId] = React.useState<string>('');
  React.useEffect(() => {
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

  const allTargets = useMemo<RouteTarget[]>(() => {
    if (!pools) return [];
    const out: RouteTarget[] = [];
    for (const p of pools) out.push(...(p.target_profiles || []));
    return out;
  }, [pools]);

  const costs = useMemo<number[]>(() => allTargets.map(t => Number(t.profile?.cost?.per_1k_tokens ?? 0)).filter(n => Number.isFinite(n)), [allTargets]);
  const costThresholds = useMemo(() => {
    const arr = [...costs].sort((a, b) => a - b);
    if (arr.length === 0) return { low: 0, high: 0 };
    const lowIdx = Math.floor(arr.length / 3);
    const highIdx = Math.floor((arr.length * 2) / 3);
    return { low: arr[lowIdx] ?? arr[0], high: arr[highIdx] ?? arr[arr.length - 1] };
  }, [costs]);

  const byProvider = useMemo<Record<string, RouteTarget[]>>(() => {
    const map: Record<string, RouteTarget[]> = {};
    for (const t of allTargets) {
      (map[t.provider] = map[t.provider] || []).push(t);
    }
    return map;
  }, [allTargets]);

  const providerKeys = useMemo(() => Object.keys(byProvider).sort(), [byProvider]);

  // Mutations: create pool, add/remove/toggle targets
  const createPoolMutation = useMutation({
    mutationFn: (payload: Omit<ModelPool, 'health'>) => apiClient.createModelPool(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['model-pools'] })
  });
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

  const [showCreate, setShowCreate] = React.useState(false);
  const [newPool, setNewPool] = React.useState<{ pool_id: string; region: string; description: string }>({ pool_id: '', region: 'AU', description: '' });
  const handleCreatePool = () => {
    if (!newPool.pool_id.trim() || !newPool.region.trim() || !newPool.description.trim()) return;
    createPoolMutation.mutate({ ...newPool, tags: { region: newPool.region }, targets: [] as any });
    setShowCreate(false);
  };

  const addCatalogToPool = (item: typeof MODEL_CATALOG[number], pool: ModelPool | undefined) => {
    if (!pool) return;
    const payload: Omit<RouteTarget, 'id'> = {
      pool_id: pool.pool_id,
      provider: item.provider,
      endpoint: item.endpoint,
      weight: 50,
      region: pool.region,
      is_active: true,
      profile: item.profile as unknown as ModelProfile,
    };
    addTargetMutation.mutate(payload);
  };

  // Inline weight editor state
  const [weights, setWeights] = React.useState<Record<string, string>>({});
  const setWeight = (id: string, value: string) => setWeights(prev => ({ ...prev, [id]: value }));
  const saveWeight = (t: RouteTarget) => {
    const raw = weights[t.id];
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    if (next === t.weight) return;
    updateTargetMutation.mutate({ id: t.id, patch: { weight: next } });
  };

  const poolTargets = useMemo<RouteTarget[]>(() => {
    if (!selectedPool) return [];
    const enriched = selectedPool.target_profiles || [];
    if (enriched.length) return enriched;
    return allTargets.filter(t => t.pool_id === selectedPool.pool_id);
  }, [selectedPool, allTargets]);

  return (
    <>
    <PageLayout
      title="Model Gardens"
      subtitle="Compare models grouped by provider with residency, strengths and relative cost at-a-glance."
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pools list */}
        <section className="bg-gray-800 border border-gray-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-white">Model Pools</h2>
              <p className="text-sm text-gray-400">Create and select a pool to manage its targets.</p>
            </div>
            <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">New Pool</button>
          </div>
          <div className="space-y-3">
            {pools?.map(pool => {
              const isActive = selectedPool?.pool_id === pool.pool_id;
              const health = pool.health?.status || 'healthy';
              return (
                <button key={pool.pool_id} onClick={() => { setSelectedPoolId(pool.pool_id); setTargetPoolId(pool.pool_id); }} className={`w-full text-left rounded-lg border p-4 transition-colors ${isActive ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-gray-700 bg-gray-900/70 text-gray-200 hover:border-gray-600'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">{pool.region}</p>
                      <h3 className="text-base font-semibold">{pool.pool_id}</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{pool.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${healthColors[health] || healthColors.healthy}`}>{health}</span>
                      <span className="text-xs text-gray-400">{pool.targets.length} configured targets</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right side: split targets and catalog */}
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
                          <div className="text-xs text-gray-400">Region {target.region} â€¢ {target.is_active ? 'Active' : 'Inactive'} â€¢ Weight {target.weight}</div>
                        </div>
                        <ResidencyBadge target={target} />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        {target.profile?.capabilities?.includes('multimodal') && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Multimodal</span>}
                        {target.profile?.capabilities?.some(c => String(c).toLowerCase().includes('json')) && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">JSON</span>}
                        {(target.profile?.capabilities?.includes('vision') || target.profile?.capabilities?.includes('image-generation')) && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Vision</span>}
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
                  {!poolTargets.length && <p className="text-sm text-gray-400">No targets yet. Add models from the catalog â†’</p>}
                </div>
              )}
            </div>

            {/* Model Gardens Catalog */}
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6">
              <header className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white">Model Gardens Catalog</h2>
                  <p className="text-sm text-gray-400">Add described models as targets to the selected pool.</p>
                </div>
                <select value={targetPoolId} onChange={(e) => setTargetPoolId(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white text-sm">
                  {(pools || []).map(p => (<option key={p.pool_id} value={p.pool_id}>{p.pool_id} ({p.region})</option>))}
                </select>
              </header>
              <div className="grid grid-cols-1 gap-3 max-h-[560px] overflow-auto pr-1">
                {MODEL_CATALOG.map(item => (
                  <div key={`${item.provider}-${item.endpoint}`} className="rounded border border-gray-700 bg-gray-900/60 p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-white">{item.display_name || `${item.provider} / ${item.endpoint}`}</div>
                        <div className="text-xs text-gray-400">{item.provider} / {item.endpoint}</div>
                      </div>
                      <span className="px-2 py-0.5 text-xs rounded bg-sky-500/10 border border-sky-500/30 text-sky-200">{item.profile.quality?.strength || 'n/a'}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-300 grid grid-cols-2 gap-2">
                      <div>Ctx: <span className="text-white">{item.profile.limits?.context_window_tokens}</span></div>
                      <div>Cost/1k: <span className="text-white">{item.profile.cost?.per_1k_tokens?.toFixed(3)} {item.profile.cost?.currency}</span></div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {item.profile.capabilities?.includes('multimodal') && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Multimodal</span>}
                      {item.profile.capabilities?.includes('image-generation') && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Images</span>}
                      {item.profile.capabilities?.some(c => String(c).toLowerCase().includes('json')) && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">JSON</span>}
                    </div>
                    <div className="mt-3">
                      <button disabled={!targetPoolId || addTargetMutation.isPending} onClick={() => addCatalogToPool(item, (pools || []).find(p => p.pool_id === targetPoolId))} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md disabled:opacity-50">{addTargetMutation.isPending ? 'Adding…' : 'Add to Pool'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>

    {showCreate && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 border border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">New Pool</h2>
              <p className="text-sm text-gray-400">Define a routing pool then add models from the catalog.</p>
            </div>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">X</button>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <label className="block text-gray-300 mb-1">Pool ID</label>
              <input value={newPool.pool_id} onChange={(e) => setNewPool(p => ({ ...p, pool_id: e.target.value }))} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" placeholder="my_onshore_pool" />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Region</label>
              <input value={newPool.region} onChange={(e) => setNewPool(p => ({ ...p, region: e.target.value }))} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" placeholder="AU" />
            </div>
            <div>
              <label className="block text-gray-300 mb-1">Description</label>
              <input value={newPool.description} onChange={(e) => setNewPool(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" placeholder="Purpose of this pool" />
            </div>
            {createPoolMutation.isError && (
              <div className="bg-red-900/20 border border-red-600 text-red-300 text-sm rounded-md p-3">{(createPoolMutation.error as Error)?.message || 'Failed to create pool'}</div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-300 hover:text-white" disabled={createPoolMutation.isPending}>Cancel</button>
            <button onClick={handleCreatePool} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md disabled:opacity-50" disabled={!newPool.pool_id || !newPool.region || createPoolMutation.isPending}>{createPoolMutation.isPending ? 'Creating…' : 'Create Pool'}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Models;
