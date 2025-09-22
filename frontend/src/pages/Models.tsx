import React from 'react';
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

  return (
    <PageLayout
      title="Model Garden"
      subtitle="Profiles of onshore model pools and targets with residency, certifications, performance and cost."
    >
      <Panel
        title="How to choose"
        description="Pick models based on residency, certifications, latency/cost and your task type. Route policies can enforce residency and auto-select from preferred pools."
      >
        <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
          <li>Residency: Use AU-only for restricted data classes (e.g., health/CDR).</li>
          <li>Certifications: Prefer IRAP/ISO27001 for regulated workloads.</li>
          <li>Performance: Latency and p95 guide interactive workloads; throughput for batch.</li>
          <li>Cost: Balance token cost vs. quality; use sandbox pools for dev/test.</li>
          <li>Tags: task_types and bias_audited guide “best for” use-cases.</li>
        </ul>
      </Panel>

      {isLoading && <Panel><div className="text-sm text-slate-400">Loading model pools…</div></Panel>}
      {isError && <Panel className="panel--alert"><div className="text-sm text-red-400">{(error as Error)?.message || 'Failed to load pools'}</div></Panel>}

      {!isLoading && pools?.map(pool => (
        <Panel
          key={pool.pool_id}
          title={`${pool.pool_id} — ${pool.region}`}
          description={pool.description}
        >
          <div className="space-y-3">
            {(pool.target_profiles || []).map(target => (
              <div key={target.id} className="rounded border border-gray-700 bg-gray-900/40 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">
                      {target.provider} / {target.endpoint}
                    </div>
                    <div className="text-xs text-gray-400">
                      Weight {target.weight} • Region {target.region} • {target.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ResidencyBadge target={target} />
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-200">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Performance</div>
                    <div>
                      Avg {target.profile?.performance.avg_latency_ms} ms •
                      p95 {target.profile?.performance.p95_latency_ms} ms •
                      Availability {(target.profile?.performance.availability ?? 0).toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Cost</div>
                    <div>
                      {(target.profile?.cost?.per_1k_tokens ?? 0).toFixed(3)} {target.profile?.cost?.currency} / 1k tokens
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Best for</div>
                    <div>{bestFor(target).join(', ') || 'general'}</div>
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-300">
                  <Certs target={target} />
                  {target.profile?.tags && (
                    <div className="text-xs text-gray-500 mt-1">
                      Tags: {Object.keys(target.profile.tags).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </PageLayout>
  );
}

export default Models;

