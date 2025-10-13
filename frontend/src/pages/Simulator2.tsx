import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  Policy,
  SimulationInput,
  SimulationResult,
  RoutingResponse,
  UserGroup,
} from '../types';

const effectColors: Record<string, string> = {
  ALLOW: 'text-emerald-300',
  BLOCK: 'text-red-300',
  ROUTE: 'text-sky-300',
  REQUIRE_OVERRIDE: 'text-amber-300',
  WARN_ROUTE: 'text-purple-300'
};

const effectLabels: Record<string, string> = {
  ALLOW: 'Allow',
  BLOCK: 'Block',
  ROUTE: 'Route',
  REQUIRE_OVERRIDE: 'Override required',
  WARN_ROUTE: 'Warn & route'
};

const defaultRequest = `{
  "org_id": "hospital-123",
  "data_class": "health_record",
  "personal_information": true,
  "destination_region": "US",
  "processing_region": "US",
  "purpose": "inference"
}`;

export function Simulator() {
  const location = useLocation() as { state?: { policyId?: string; request?: Record<string, unknown> } };

  const [selectedPolicy, setSelectedPolicy] = useState<string>('AuzGuard_AU_Base_v1');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [requestJson, setRequestJson] = useState<string>(defaultRequest);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [routingResult, setRoutingResult] = useState<RoutingResponse | null>(null);

  // Load data
  const { data: policies } = useQuery({ queryKey: ['policies'], queryFn: () => apiClient.getPolicies() });
  const { data: groups } = useQuery<Array<UserGroup & { route_profile_id?: string }>>({
    queryKey: ['user-groups'],
    queryFn: () => apiClient.getUserGroups()
  });

  // Prefill from Chat handoff or localStorage
  useEffect(() => {
    try {
      const lsPolicy = localStorage.getItem('auzguard_sim_policy') || undefined;
      const lsRequest = localStorage.getItem('auzguard_sim_request') || undefined;
      const statePolicy = location?.state?.policyId;
      const stateReq = location?.state?.request ? JSON.stringify(location.state.request, null, 2) : undefined;

      if (statePolicy || lsPolicy) setSelectedPolicy(statePolicy || (lsPolicy as string));
      if (stateReq || lsRequest) setRequestJson(stateReq || (lsRequest as string));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulateMutation = useMutation({
    mutationFn: (input: SimulationInput) => apiClient.simulate(input),
    onSuccess: (result) => setSimulationResult(result)
  });

  const routeMutation = useMutation<RoutingResponse, Error, { policy_id: string; request: Record<string, unknown> }>({
    mutationFn: (payload) =>
      apiClient.executeRouting({
        policy_id: payload.policy_id,
        request: payload.request,
        org_id: (payload.request.org_id as string) || 'simulator-org',
        actor_id: 'simulator-user'
      }),
    onSuccess: (result) => setRoutingResult(result)
  });

  const parseRequest = (): Record<string, unknown> | null => {
    try {
      return JSON.parse(requestJson);
    } catch (error) {
      alert('Invalid JSON in request payload.');
      return null;
    }
  };

  const handleSimulate = () => {
    const request = parseRequest();
    if (!request) return;
    simulateMutation.mutate({ policy_id: selectedPolicy, request });
  };

  const handleExecuteRouting = () => {
    const request = parseRequest();
    if (!request) return;
    routeMutation.mutate({ policy_id: selectedPolicy, request });
  };

  // Resolution Path summary (best-effort)
  const selectedGroup = useMemo(() => (groups || []).find(g => g.id === selectedGroupId), [groups, selectedGroupId]);
  const effectivePolicy = useMemo(() => {
    return selectedPolicy || selectedGroup?.default_policy_id;
  }, [selectedPolicy, selectedGroup]);

  const effectivePool = useMemo(() => {
    return routingResult?.route_decision?.pool_id || selectedGroup?.default_pool_id;
  }, [routingResult, selectedGroup]);

  const policyTitle = useMemo(() => (policies || []).find(p => p.policy_id === effectivePolicy)?.title, [policies, effectivePolicy]);

  const renderTrace = (trace: SimulationResult['trace']) => (
    <div className="space-y-2">
      {trace.map((step, index) => (
        <div key={step.rule_id} className={`p-3 rounded border text-sm ${step.matched ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100' : step.skipped ? 'border-gray-700 bg-gray-800/60 text-gray-400' : 'border-gray-700 bg-gray-900/50 text-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{index + 1}. {step.rule_id}</span>
            <span className="uppercase text-xs">{step.skipped ? 'Skipped' : step.matched ? 'Matched' : 'No match'}</span>
          </div>
          {step.reason && (<p className="text-xs text-gray-300 mt-1">{step.reason}</p>)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Request Simulator</h1>
        <p className="text-gray-400 text-sm max-w-3xl">
          See how a specific payload flows: Group → Route Profile → Pool → Policy → Rule → Route. Compare the simulated policy decision and the live router outcome.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left controls */}
        <section className="xl:col-span-1 bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Policy</label>
            <select
              value={selectedPolicy}
              onChange={(event) => setSelectedPolicy(event.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-testid="sim-policy-select"
            >
              {(policies || []).map((policy: Policy) => (
                <option key={policy.policy_id} value={policy.policy_id}>
                  {policy.title} ({policy.policy_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">User Group (context)</label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-testid="sim-group-select"
            >
              <option value="">None</option>
              {(groups || []).map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Request JSON</label>
            <textarea
              value={requestJson}
              onChange={(event) => setRequestJson(event.target.value)}
              rows={14}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-testid="sim-request-textarea"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSimulate}
              disabled={simulateMutation.isPending}
              className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors disabled:opacity-50"
              data-testid="sim-run-simulate"
            >
              {simulateMutation.isPending ? 'Simulating…' : 'Run Simulation'}
            </button>
            <button
              onClick={handleExecuteRouting}
              disabled={routeMutation.isPending}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50"
              data-testid="sim-run-route"
            >
              {routeMutation.isPending ? 'Routing…' : 'Execute Core Router'}
            </button>
          </div>
        </section>

        {/* Right side: Resolution Path + Results */}
        <section className="xl:col-span-2 space-y-6">
          {/* Resolution Path */}
          <div className="bg-gray-800 border border-gray-800 rounded-lg p-6">
            <header className="mb-4">
              <h2 className="text-lg font-semibold text-white">Resolution Path</h2>
              <p className="text-sm text-gray-400">How this request resolves before and after calling the router.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-400">User Group</h3>
                <p>{selectedGroup ? `${selectedGroup.name} (${selectedGroup.id})` : 'None selected'}</p>
                {selectedGroup && (
                  <div className="text-xs text-gray-400 mt-1 space-y-1">
                    {selectedGroup.default_pool_id && <div>Default pool: {selectedGroup.default_pool_id}</div>}
                    {selectedGroup.default_policy_id && <div>Default policy: {selectedGroup.default_policy_id}</div>}
                    {selectedGroup.allowed_pools?.length ? <div>Allowed pools: {selectedGroup.allowed_pools.join(', ')}</div> : null}
                    {selectedGroup.allowed_policies?.length ? <div>Allowed policies: {selectedGroup.allowed_policies.join(', ')}</div> : null}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-400">Policy Applied</h3>
                <p>{policyTitle ? `${policyTitle} (${effectivePolicy})` : effectivePolicy || '-'}</p>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-400">Pool (preference)</h3>
                <p>{effectivePool || '-'}</p>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wide text-gray-400">Request Payload</h3>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words max-h-40 overflow-auto">{requestJson}</pre>
              </div>
            </div>
          </div>

          {/* Simulation */}
          {simulationResult ? (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
              <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Simulation Result</h2>
                  <p className="text-sm text-gray-400">Policy evaluation using simulation endpoint.</p>
                </div>
                <div className={`text-sm font-semibold ${effectColors[simulationResult.decision]}`}>{effectLabels[simulationResult.decision]}</div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400">Matched rule</h3>
                  <p>{simulationResult.matched_rule || 'Default rule'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400">Audit log ID</h3>
                  <p>{simulationResult.audit_log_id || 'n/a'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Trace</h3>
                {renderTrace(simulationResult.trace)}
              </div>

              {simulationResult.obligations_applied.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-2">Obligations applied</h3>
                  <ul className="list-disc list-inside text-sm text-gray-200">
                    {simulationResult.obligations_applied.map(obligation => (
                      <li key={obligation}>{obligation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 text-sm text-gray-400">
              Run a simulation to see rule evaluation details.
            </div>
          )}

          {/* Live Router */}
          {routingResult && (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
              <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Core Router Result</h2>
                  <p className="text-sm text-gray-400">Live routing endpoint with model scoring.</p>
                </div>
                <div className={`text-sm font-semibold ${effectColors[routingResult.decision]}`}>{effectLabels[routingResult.decision]}</div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400">Matched rule</h3>
                  <p>{routingResult.matched_rule || 'Default rule'}</p>
                </div>
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400">Audit log ID</h3>
                  <p>{routingResult.audit_log_id || 'n/a'}</p>
                </div>
                {routingResult.route_decision?.pool_id && (
                  <div>
                    <h3 className="text-xs uppercase tracking-wide text-gray-400">Routed to</h3>
                    <p>{routingResult.route_decision.pool_id}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Trace</h3>
                {renderTrace(routingResult.trace)}
              </div>

              {routingResult.route_decision && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-2">Route candidates</h3>
                  <div className="space-y-2 text-sm">
                    {routingResult.route_decision.candidates.map(candidate => (
                      <div key={candidate.target.id} className={`p-3 rounded border ${candidate.selected ? 'border-sky-500/40 bg-sky-500/10 text-sky-100' : 'border-gray-700 bg-gray-900/50 text-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{candidate.target.provider} · {candidate.target.endpoint}</span>
                          <span className="text-xs">Score {candidate.score.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">Reasons: {candidate.reasons.join('; ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Simulator;

