import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { GatewayDashboardMetrics } from '../types';
import { PageLayout, Panel, StatCard, ResponsiveGrid } from '../components/PageLayout';
import { FlowChartWeighted } from '../components/FlowChartWeighted';
import { useNavigate } from 'react-router-dom';

function formatLatency(value?: number): string { return !value || Number.isNaN(value) ? '0 ms' : `${Math.round(value)} ms`; }
function formatPercentage(value: number): string { return `${(value * 100).toFixed(2)}%`; }

export function Dashboard2() {
  const { data: metrics, isLoading, isError, error } = useQuery<GatewayDashboardMetrics>({
    queryKey: ['gateway-metrics'],
    queryFn: () => apiClient.getRoutingMetrics()
  });

  const [range, setRange] = React.useState<'today'|'7d'|'30d'>('today');
  const dateRange = React.useMemo(() => {
    const to = new Date();
    let from = new Date();
    if (range === 'today') from.setHours(0,0,0,0);
    else if (range === '7d') from = new Date(to.getTime() - 7*24*60*60*1000);
    else if (range === '30d') from = new Date(to.getTime() - 30*24*60*60*1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [range]);

  const { data: pathGraph } = useQuery({
    queryKey: ['routing-paths', dateRange.from, dateRange.to],
    queryFn: () => apiClient.getRoutingPaths({ from: dateRange.from, to: dateRange.to }),
  });

  const stats = metrics ? [
    { name: 'Requests today', value: metrics.requests_today.toLocaleString(), helper: 'Policy evaluations across tenants' },
    { name: 'Block rate', value: formatPercentage(metrics.block_rate), helper: 'Requests stopped by guardrails' },
    { name: 'Overrides required', value: metrics.overrides_required.toLocaleString(), helper: 'Sessions escalated for approval' },
    { name: 'Average latency', value: formatLatency(metrics.average_latency_ms), helper: `P95 ${formatLatency(metrics.p95_latency_ms)}` }
  ] : [];

  const navigate = useNavigate();

  const handleNodeClick = React.useCallback((node: { id: string; type: 'policy'|'rule'|'pool'|'target'; label: string }) => {
    try {
      const [kind, rest] = node.id.split(':', 2);
      if (kind === 'policy') {
        navigate(`/policies/${rest}`);
      } else if (kind === 'rule') {
        // find a policy source for this rule
        const edges = (pathGraph as any)?.edges as Array<{ source: string; target: string }>|undefined;
        const policyEdge = edges?.find(e => e.target === node.id && e.source.startsWith('policy:'));
        const policyId = policyEdge ? policyEdge.source.split(':',2)[1] : undefined;
        if (policyId) navigate(`/policies/${policyId}/rules/${rest}`); else navigate('/policies');
      } else if (kind === 'pool') {
        navigate('/routing-config');
      } else if (kind === 'target') {
        navigate('/models');
      }
    } catch {}
  }, [navigate, pathGraph]);

  return (
    <PageLayout title="Gateway dashboard" subtitle="Live view of routing, compliance, and residency guardrails across your tenants.">
      {isLoading && (
        <Panel><div className="text-sm text-slate-500">Loading metrics.</div></Panel>
      )}
      {isError && (
        <Panel className="panel--alert"><div className="text-sm text-red-500">{error instanceof Error ? error.message : 'Unknown error'}</div></Panel>
      )}

      {!isLoading && metrics && (
        <>
          <ResponsiveGrid columns={4}>
            {stats.map((s) => (<StatCard key={s.name} label={s.name} value={s.value} helper={s.helper} />))}
          </ResponsiveGrid>

          <div className="responsive-grid responsive-grid--2">
            <Panel title="Top model usage" description="Aggregated model invocations over the selected window.">
              {metrics.model_usage.length === 0 ? (
                <p className="text-sm text-slate-500">No model invocations recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.model_usage.map((item) => (
                    <div key={`${item.provider}-${item.model_identifier}`} className="metrics-row">
                      <div>
                        <p className="metrics-row__title">{item.provider} / {item.model_identifier}</p>
                        <p className="metrics-row__meta">Average latency {formatLatency(item.average_latency_ms)}</p>
                      </div>
                      <span className="metrics-row__value">{item.count.toLocaleString()} calls</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Policy violations" description="Most frequent BLOCK / REQUIRE_OVERRIDE decisions.">
              {metrics.policy_violation_breakdown.length === 0 ? (
                <p className="text-sm text-slate-500">No policy violations recorded for the window.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.policy_violation_breakdown.map((item) => (
                    <div key={`${item.policy_id}-${item.rule_id}-${item.decision}`} className="metrics-row">
                      <div>
                        <p className="metrics-row__title">{item.rule_id ?? 'Unspecified rule'}</p>
                        <p className="metrics-row__meta">Policy {item.policy_id} • Decision {item.decision}</p>
                      </div>
                      <span className="metrics-row__value">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="panel mt-4">
            <div className="panel__header">
              <div>
                <h2>Routing Flow</h2>
                <p>Policy → Rule → Pool → Target with edge thickness proportional to volume.</p>
              </div>
              <div className="panel__actions text-sm">
                <select value={range} onChange={(e) => setRange(e.target.value as any)} className="px-2 py-1 bg-gray-900 border border-gray-700 rounded-md text-gray-200">
                  <option value="today">Today</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
            <div className="panel__content">
              {pathGraph && (pathGraph as any).nodes?.length ? (
                <div className="overflow-auto">
                  <FlowChartWeighted nodes={(pathGraph as any).nodes} edges={(pathGraph as any).edges} nodeCounts={(pathGraph as any).node_counts} width={1200} height={420} onNodeClick={handleNodeClick} />
                </div>
              ) : (
                <p className="text-sm text-slate-500">No routing paths recorded for the selected range.</p>
              )}
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}

export default Dashboard2;

