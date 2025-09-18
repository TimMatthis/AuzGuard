import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { GatewayDashboardMetrics } from '../types';
import { PageLayout, Panel, StatCard, ResponsiveGrid } from '../components/PageLayout';

function formatLatency(value: number | undefined): string {
  if (!value || Number.isNaN(value)) {
    return '0 ms';
  }
  return `${Math.round(value)} ms`;
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function Dashboard() {
  const { data: metrics, isLoading, isError, error } = useQuery<GatewayDashboardMetrics>({
    queryKey: ['gateway-metrics'],
    queryFn: () => apiClient.getRoutingMetrics()
  });

  const stats = metrics ? [
    {
      name: 'Requests today',
      value: metrics.requests_today.toLocaleString(),
      helper: 'Policy evaluations across tenants'
    },
    {
      name: 'Block rate',
      value: formatPercentage(metrics.block_rate),
      helper: 'Requests stopped by guardrails'
    },
    {
      name: 'Overrides required',
      value: metrics.overrides_required.toLocaleString(),
      helper: 'Sessions escalated for approval'
    },
    {
      name: 'Average latency',
      value: formatLatency(metrics.average_latency_ms),
      helper: `P95 ${formatLatency(metrics.p95_latency_ms)}`
    }
  ] : [];

  return (
    <PageLayout
      title="Gateway dashboard"
      subtitle="Live view of routing, compliance, and residency guardrails across your tenants."
    >
      {isLoading && (
        <Panel>
          <div className="text-sm text-slate-500">Loading metrics.</div>
        </Panel>
      )}

      {isError && (
        <Panel className="panel--alert">
          <div className="text-sm text-red-500">
            Failed to load metrics: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </Panel>
      )}

      {!isLoading && metrics && (
        <>
          <ResponsiveGrid columns={4}>
            {stats.map((stat) => (
              <StatCard
                key={stat.name}
                label={stat.name}
                value={stat.value}
                helper={stat.helper}
              />
            ))}
          </ResponsiveGrid>

          <div className="responsive-grid responsive-grid--2">
            <Panel
              title="Top model usage"
              description="Aggregated model invocations over the last 24 hours."
            >
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

            <Panel
              title="Policy violations"
              description="Most frequent BLOCK / REQUIRE_OVERRIDE decisions."
            >
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
        </>
      )}
    </PageLayout>
  );
}
