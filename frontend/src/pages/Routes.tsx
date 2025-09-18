import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool, RouteTarget } from '../types';

const healthColors: Record<string, string> = {
  healthy: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
  degraded: 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
  unhealthy: 'text-red-300 bg-red-500/10 border border-red-500/30'
};

function formatNumber(value: number, digits = 1) {
  return Number.parseFloat(value.toString()).toFixed(digits);
}

export function Routes() {
  const { data: pools, isLoading: poolsLoading } = useQuery({
    queryKey: ['modelPools'],
    queryFn: () => apiClient.getModelPools()
  });

  const { data: targets } = useQuery({
    queryKey: ['routeTargets'],
    queryFn: () => apiClient.getRouteTargets()
  });

  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);

  const selectedPool = useMemo<ModelPool | undefined>(() => {
    if (!pools?.length) return undefined;
    if (selectedPoolId) {
      return pools.find(pool => pool.pool_id === selectedPoolId) || pools[0];
    }
    return pools[0];
  }, [pools, selectedPoolId]);

  const poolTargets = useMemo<RouteTarget[]>(() => {
    if (!selectedPool) return [];
    const enriched = selectedPool.target_profiles || [];
    if (enriched.length) {
      return enriched;
    }
    return (targets || []).filter(target => target.pool_id === selectedPool.pool_id);
  }, [selectedPool, targets]);

  if (poolsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-white">Loading model pools...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Model Garden</h1>
        <p className="text-gray-400 text-sm max-w-3xl">
          Compare and profile the sovereign-ready model targets backing each routing pool. These profiles drive the
          router&apos;s scoring so you always know why a request was dispatched to a particular provider.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-gray-800 border border-gray-800 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-white">Model Pools</h2>
            <p className="text-sm text-gray-400">Each pool represents a routed destination governed by prioritised rules.</p>
          </div>

          <div className="space-y-3">
            {pools?.map(pool => {
              const isActive = selectedPool?.pool_id === pool.pool_id;
              const health = pool.health?.status || 'healthy';

              return (
                <button
                  key={pool.pool_id}
                  onClick={() => setSelectedPoolId(pool.pool_id)}
                  className={`w-full text-left rounded-lg border p-4 transition-colors ${
                    isActive
                      ? 'border-sky-500 bg-sky-500/10 text-white'
                      : 'border-gray-700 bg-gray-900/70 text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">{pool.region}</p>
                      <h3 className="text-base font-semibold">{pool.pool_id}</h3>
                      <p className="text-xs text-gray-400 mt-1 leading-normal">{pool.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${healthColors[health] || healthColors.healthy}`}>
                        {health}
                      </span>
                      <span className="text-xs text-gray-400">{pool.targets.length} configured targets</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="xl:col-span-2 space-y-6">
          {selectedPool ? (
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-800 rounded-lg p-6">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-medium text-white">{selectedPool.pool_id}</h2>
                    <p className="text-sm text-gray-400 max-w-2xl">{selectedPool.description}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10">
                      Region {selectedPool.region}
                    </span>
                    <span className="px-3 py-1 rounded-full border border-gray-600 bg-gray-700/60">
                      Health {selectedPool.health?.status || 'healthy'}
                    </span>
                    <span className="px-3 py-1 rounded-full border border-gray-600 bg-gray-700/60">
                      Last check {selectedPool.health?.last_check?.split('T')[0] || '—'}
                    </span>
                  </div>
                </header>

                <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                  {Object.entries(selectedPool.tags || {}).map(([key, value]) => (
                    <span key={key} className="px-2 py-1 rounded bg-gray-900/70 border border-gray-700">
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 border border-gray-800 rounded-lg p-6">
                <h3 className="text-md font-medium text-white mb-4">Target Profiles</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {poolTargets.map(target => {
                    const profile = target.profile;
                    return (
                      <div key={target.id} className="border border-gray-700 bg-gray-900/60 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">{target.provider}</p>
                            <h4 className="text-base font-semibold text-white">{target.endpoint}</h4>
                            <p className="text-xs text-gray-400">Weight {target.weight} · Region {target.region}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${target.is_active ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/30' : 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
                            {target.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        {profile ? (
                          <div className="space-y-3 text-xs text-gray-300">
                            <div className="flex flex-wrap gap-2">
                              {profile.capabilities.map(capability => (
                                <span key={capability} className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/40 text-sky-200">
                                  {capability}
                                </span>
                              ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-gray-400">Avg latency</p>
                                <p className="text-white text-sm">{formatNumber(profile.performance.avg_latency_ms)} ms</p>
                              </div>
                              <div>
                                <p className="text-gray-400">p95 latency</p>
                                <p className="text-white text-sm">{formatNumber(profile.performance.p95_latency_ms)} ms</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Availability</p>
                                <p className="text-white text-sm">{formatNumber(profile.performance.availability * 100, 2)}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400">Throughput</p>
                                <p className="text-white text-sm">{profile.performance.throughput_tps} TPS</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-gray-400">Cost per 1k tokens</p>
                                <p className="text-white text-sm">
                                  {profile.cost.currency} {profile.cost.per_1k_tokens}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400">Benchmarked</p>
                                <p className="text-white text-sm">
                                  {profile.last_benchmarked?.split('T')[0] || 'unknown'}
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="text-gray-400">Compliance posture</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                                  Data residency: {profile.compliance.data_residency}
                                </span>
                                {profile.compliance.certifications?.map(cert => (
                                  <span key={cert} className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">
                                    {cert}
                                  </span>
                                ))}
                              </div>
                              {profile.compliance.notes && (
                                <p className="mt-2 text-gray-400">{profile.compliance.notes}</p>
                              )}
                            </div>

                            {Object.keys(profile.tags || {}).length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(profile.tags).map(([key, value]) => (
                                  <span key={key} className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No profile metadata recorded yet.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 text-center text-gray-400">
              <p>Select a pool to review profiling details.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
