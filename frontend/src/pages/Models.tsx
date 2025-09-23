import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool, RouteTarget } from '../types';
import { PageLayout, Panel } from '../components/PageLayout';

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
  const { data: pools, isLoading, isError, error } = useQuery<ModelPool[]>({
    queryKey: ['model-pools'],
    queryFn: () => apiClient.getModelPools()
  });

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

  return (
    <PageLayout
      title="Model Garden"
      subtitle="Compare models grouped by provider with residency, strengths and relative cost at-a-glance."
    >
      <Panel
        title="How to choose"
        description="Pick models based on residency, certifications, latency/cost and your task type. Route policies can enforce residency and auto-select from preferred pools."
      >
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li>Residency: AU and AU‑Local/Onsite for sovereign workloads.</li>
          <li>Strengths: Lite/Standard/Strong based on quality and tags.</li>
          <li>Cost: $ (low), $$ (balanced), $$$ (premium) relative to peers.</li>
          <li>Capabilities: JSON mode, function calling, streaming, vision.</li>
        </ul>
      </Panel>

      {isLoading && <Panel><div className="text-sm text-slate-400">Loading model providers…</div></Panel>}
      {isError && <Panel className="panel--alert"><div className="text-sm text-red-400">{(error as Error)?.message || 'Failed to load data'}</div></Panel>}

      {!isLoading && providerKeys.map(provider => {
        const items = byProvider[provider] || [];
        if (!items.length) return null;

        // Compute provider-level indicators
        const residencies = new Set<string>();
        const strengths = new Set<string>();
        let minCtx = Infinity, maxCtx = 0;
        let avgCost = 0, nCost = 0;
        const hasCap = (t: RouteTarget, name: string) => t.profile?.capabilities?.some(c => String(c).toLowerCase().includes(name)) || (t.profile?.tags && (t.profile.tags as any)[name] === true);

        for (const t of items) {
          const residency = t.profile?.compliance?.data_residency || 'unknown';
          const deployment = (t.profile?.tags as any)?.deployment as string | undefined;
          if (residency === 'AU' && (deployment === 'local' || deployment === 'onsite' || deployment === 'onprem')) residencies.add('AU_LOCAL');
          residencies.add(residency);
          const s = t.profile?.quality?.strength;
          if (s) strengths.add(s);
          const ctx = t.profile?.limits?.context_window_tokens ?? 8192;
          minCtx = Math.min(minCtx, ctx);
          maxCtx = Math.max(maxCtx, ctx);
          const cost = Number(t.profile?.cost?.per_1k_tokens ?? NaN);
          if (Number.isFinite(cost)) { avgCost += cost; nCost++; }
        }
        avgCost = nCost ? avgCost / nCost : 0;
        const costBand = avgCost <= costThresholds.low ? '$' : avgCost >= costThresholds.high ? '$$$' : '$$';

        return (
          <Panel key={provider} title={provider} description={`Residency: ${Array.from(residencies).join(', ')} • Strengths: ${Array.from(strengths).join(', ') || 'n/a'} • Context window: ${isFinite(minCtx) ? minCtx : 0}–${maxCtx} tokens • Cost: ${costBand}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(target => (
                <div key={target.id} className="rounded border border-gray-700 bg-gray-900/40 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white">{target.endpoint}</div>
                      <div className="text-xs text-gray-400">Pool {target.pool_id} • Region {target.region} • {target.is_active ? 'Active' : 'Inactive'}</div>
                    </div>
                    <div className="flex gap-2">
                      <ResidencyBadge target={target} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {hasCap(target, 'json') && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">JSON</span>}
                    {hasCap(target, 'function') && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Functions</span>}
                    {hasCap(target, 'stream') && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Streaming</span>}
                    {(hasCap(target, 'vision') || hasCap(target, 'multimodal')) && <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">Vision</span>}
                    {target.profile?.quality?.strength && <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/40 text-sky-200">{target.profile.quality.strength}</span>}
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">Ctx {target.profile?.limits?.context_window_tokens ?? 8192}</span>
                    <span className="px-2 py-0.5 rounded bg-gray-900/60 border border-gray-700">{(target.profile?.cost?.per_1k_tokens ?? 0).toFixed(3)} {target.profile?.cost?.currency}/1k</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-300">
                    <div>
                      <div className="text-gray-400 text-[10px] mb-1">Performance</div>
                      <div>Avg {target.profile?.performance.avg_latency_ms} ms | p95 {target.profile?.performance.p95_latency_ms} ms</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-[10px] mb-1">Best for</div>
                      <div>{bestFor(target).join(', ') || 'general'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-[10px] mb-1">Certs</div>
                      <div className="flex flex-wrap gap-1">
                        {(target.profile?.compliance?.certifications || []).map(cert => (
                          <span key={cert} className="px-1.5 py-0.5 rounded bg-gray-900/60 border border-gray-700 whitespace-nowrap leading-tight">{cert}</span>
                        ))}
                        {!(target.profile?.compliance?.certifications || []).length && <span className="text-gray-500">n/a</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </PageLayout>
  );
}

export default Models;
