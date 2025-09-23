import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy, ModelPool, RouteTarget } from '../types';
import { DecisionTree, TreeNode } from '../components/DecisionTree';
import { CartChart } from '../components/CartChart';
import { GatewayDashboardMetrics } from '../types';

function sortByPriority(rules: Policy['rules']) {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

export function Decisions() {
  const { data: policies } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies(),
  });

  const [selectedPolicyId, setSelectedPolicyId] = React.useState<string | ''>('');

  const selectedPolicy = React.useMemo(() => {
    if (!policies?.length) return undefined;
    const id = selectedPolicyId || policies[0].policy_id;
    return policies.find(p => p.policy_id === id) || policies[0];
  }, [policies, selectedPolicyId]);

  const { data: pools } = useQuery<ModelPool[]>({
    queryKey: ['model-pools'],
    queryFn: () => apiClient.getModelPools(),
  });

  const { data: metrics } = useQuery<GatewayDashboardMetrics>({
    queryKey: ['gateway-metrics'],
    queryFn: () => apiClient.getRoutingMetrics(),
  });

  const [viewMode, setViewMode] = React.useState<'list' | 'cart'>('list');

  const [targetsByPool, setTargetsByPool] = React.useState<Record<string, RouteTarget[]>>({});

  React.useEffect(() => {
    async function loadTargets() {
      if (!pools) return;
      const map: Record<string, RouteTarget[]> = {};
      for (const pool of pools) {
        map[pool.pool_id] = await apiClient.getRouteTargetsForPool(pool.pool_id).catch(() => []);
      }
      setTargetsByPool(map);
    }
    loadTargets();
  }, [pools]);

  const ruleTree: TreeNode[] = React.useMemo(() => {
    if (!selectedPolicy) return [];
    const ordered = sortByPriority(selectedPolicy.rules);
    const children: TreeNode[] = ordered.map((r, idx) => ({
      id: r.rule_id,
      title: `${idx + 1}. ${r.title}`,
      subtitle: `${r.rule_id} • if (${r.condition}) → ${r.effect}`,
      badge: r.enabled === false ? 'DISABLED' : r.effect,
      badgeClassName: r.enabled === false ? 'badge--disabled' : effectClass(r.effect),
      children: r.route_to ? [{
        id: `${r.rule_id}__route`,
        title: `Route to pool: ${r.route_to}`,
        subtitle: r.obligations?.length ? `Obligations: ${r.obligations.join(', ')}` : undefined,
        badge: 'ROUTE',
        badgeClassName: effectClass('ROUTE'),
      }] : undefined
    }));

    // Final default effect leaf
    const end: TreeNode = {
      id: 'default_effect',
      title: `Default: ${selectedPolicy.evaluation_strategy.default_effect}`,
      subtitle: 'Applied when no rule matches',
      badge: selectedPolicy.evaluation_strategy.default_effect,
      badgeClassName: effectClass(selectedPolicy.evaluation_strategy.default_effect),
    };

    return [{
      id: 'policy_root',
      title: `${selectedPolicy.title}`,
      subtitle: `${selectedPolicy.policy_id} • ${selectedPolicy.jurisdiction}`,
      badge: 'RULES',
      children: [...children, end]
    }];
  }, [selectedPolicy]);

  const routingTree: TreeNode[] = React.useMemo(() => {
    if (!pools?.length) return [];
    return [{
      id: 'routing_root',
      title: 'Model Pools',
      subtitle: 'Active pools and targets',
      badge: 'ROUTING',
      children: pools.map(pool => ({
        id: pool.pool_id,
        title: `${pool.pool_id} • ${pool.region}`,
        subtitle: pool.description,
        badge: pool.health?.status || 'unknown',
        badgeClassName: pool.health?.status === 'healthy' ? 'badge--ok' : pool.health?.status === 'degraded' ? 'badge--warn' : 'badge--err',
        children: (targetsByPool[pool.pool_id] || []).map(t => ({
          id: t.id,
          title: `${t.provider} / ${t.endpoint}`,
          subtitle: `${t.region} • weight ${t.weight} • ${t.is_active ? 'active' : 'inactive'}`,
          badge: t.is_active ? 'ACTIVE' : 'INACTIVE',
          badgeClassName: t.is_active ? 'badge--ok' : 'badge--disabled',
        }))
      }))
    }];
  }, [pools, targetsByPool]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Decision Trees</h1>
          <p className="text-gray-400 text-sm">Visual flow for guardrail evaluation and routing.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPolicyId}
            onChange={(e) => setSelectedPolicyId(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white"
          >
            {policies?.map(p => (
              <option key={p.policy_id} value={p.policy_id}>{p.title} ({p.policy_id})</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm">
            <label className={`px-3 py-1 rounded-md border cursor-pointer ${viewMode === 'list' ? 'bg-white/10 border-white/20' : 'bg-gray-900/60 border-gray-700'}`}
              onClick={() => setViewMode('list')}>Tree</label>
            <label className={`px-3 py-1 rounded-md border cursor-pointer ${viewMode === 'cart' ? 'bg-white/10 border-white/20' : 'bg-gray-900/60 border-gray-700'}`}
              onClick={() => setViewMode('cart')}>CART Chart</label>
          </div>
        </div>
      </header>

      <section className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-white">Rules Decision Tree</h2>
          <span className="text-xs text-gray-400">First match wins • ASC priority</span>
        </div>
        {viewMode === 'list' ? (
          <DecisionTree nodes={ruleTree} emptyText="No rules available" />
        ) : (
          <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
            <CartChart
              root={ruleTree[0]}
              width={1200}
              height={600}
              metrics={buildRuleMetricsMap(metrics, selectedPolicy?.policy_id)}
            />
          </div>
        )}
      </section>

      <section className="bg-gray-800 bg-opacity-80 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-white">Routing Tree</h2>
          <span className="text-xs text-gray-400">Pools and active targets</span>
        </div>
        <DecisionTree nodes={routingTree} emptyText="No routing configuration" />
      </section>
    </div>
  );
}

function buildRuleMetricsMap(metrics: GatewayDashboardMetrics | undefined, policyId?: string): Record<string, { violations: number }> {
  const map: Record<string, { violations: number }> = {};
  if (!metrics || !policyId) return map;
  for (const item of metrics.policy_violation_breakdown) {
    if (item.policy_id === policyId && item.rule_id) {
      map[item.rule_id] = { violations: (map[item.rule_id]?.violations || 0) + item.count };
    }
  }
  return map;
}

function effectClass(effect: string): string {
  switch (effect) {
    case 'BLOCK': return 'badge--err';
    case 'ALLOW': return 'badge--ok';
    case 'ROUTE': return 'badge--info';
    case 'WARN_ROUTE': return 'badge--warn';
    case 'REQUIRE_OVERRIDE': return 'badge--warn';
    default: return '';
  }
}
