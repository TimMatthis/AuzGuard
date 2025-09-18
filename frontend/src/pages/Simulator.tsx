import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy, SimulationInput, SimulationResult, RoutingResponse } from '../types';

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
  const [selectedPolicy, setSelectedPolicy] = useState<string>('AuzGuard_AU_Base_v1');
  const [requestJson, setRequestJson] = useState<string>(defaultRequest);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [routingResult, setRoutingResult] = useState<RoutingResponse | null>(null);

  const { data: policies } = useQuery({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies()
  });

  const simulateMutation = useMutation({
    mutationFn: (input: SimulationInput) => apiClient.simulate(input),
    onSuccess: (result) => {
      setSimulationResult(result);
    }
  });

  const routeMutation = useMutation<RoutingResponse, Error, { policy_id: string; request: Record<string, unknown> }>({
    mutationFn: (payload) =>
      apiClient.executeRouting({
        policy_id: payload.policy_id,
        request: payload.request,
        org_id: (payload.request.org_id as string) || 'simulator-org',
        actor_id: 'simulator-user'
      }),
    onSuccess: (result) => {
      setRoutingResult(result);
    }
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
    simulateMutation.mutate({
      policy_id: selectedPolicy,
      request
    });
  };

  const handleExecuteRouting = () => {
    const request = parseRequest();
    if (!request) return;
    routeMutation.mutate({ policy_id: selectedPolicy, request });
  };

  const renderTrace = (trace: SimulationResult['trace']) => (
    <div className="space-y-2">
      {trace.map((step, index) => (
        <div
          key={step.rule_id}
          className={`p-3 rounded border text-sm ${
            step.matched
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
              : step.skipped
                ? 'border-gray-700 bg-gray-800/60 text-gray-400'
                : 'border-gray-700 bg-gray-900/50 text-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">{index + 1}. {step.rule_id}</span>
            <span className="uppercase text-xs">
              {step.skipped ? 'Skipped' : step.matched ? 'Matched' : 'No match'}
            </span>
          </div>
          {step.reason && (
            <p className="text-xs text-gray-300 mt-1">{step.reason}</p>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Request Simulator</h1>
        <p className="text-gray-400 text-sm max-w-3xl">
          Test policies against sample requests and compare simulated evaluation with the live routing engine.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-1 bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-2">Policy</label>
            <select
              value={selectedPolicy}
              onChange={(event) => setSelectedPolicy(event.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {policies?.map(policy => (
                <option key={policy.policy_id} value={policy.policy_id}>
                  {policy.title} ({policy.policy_id})
                </option>
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
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSimulate}
              disabled={simulateMutation.isPending}
              className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {simulateMutation.isPending ? 'Simulating…' : 'Run Simulation'}
            </button>
            <button
              onClick={handleExecuteRouting}
              disabled={routeMutation.isPending}
              className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {routeMutation.isPending ? 'Routing…' : 'Execute Core Router'}
            </button>
          </div>
        </section>

        <section className="xl:col-span-2 space-y-6">
          {simulationResult ? (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
              <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Simulation Result</h2>
                  <p className="text-sm text-gray-400">Policy evaluation using simulation endpoint.</p>
                </div>
                <div className={`text-sm font-semibold ${effectColors[simulationResult.decision]}`}>
                  {effectLabels[simulationResult.decision]}
                </div>
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

              {simulationResult.overrides_required && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-lg p-3 text-sm text-amber-100">
                  <p className="font-semibold">Override required</p>
                  <p>Authorized roles: {simulationResult.overrides_required.roles.join(', ') || '—'}</p>
                  <p>Justification: {simulationResult.overrides_required.require_justification ? 'Required' : 'Optional'}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 text-sm text-gray-400">
              Run a simulation to see rule evaluation details.
            </div>
          )}

          {routingResult && (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
              <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Core Router Result</h2>
                  <p className="text-sm text-gray-400">Live routing endpoint with model scoring.</p>
                </div>
                <div className={`text-sm font-semibold ${effectColors[routingResult.decision]}`}>
                  {effectLabels[routingResult.decision]}
                </div>
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
                      <div
                        key={candidate.target.id}
                        className={`p-3 rounded border ${
                          candidate.selected
                            ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                            : 'border-gray-700 bg-gray-900/50 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">
                            {candidate.target.provider} · {candidate.target.endpoint}
                          </span>
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

      <section className="bg-gray-800 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sample Requests</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              name: 'Health data offshore',
              description: 'Health data being sent to US',
              request: {
                org_id: 'hospital-123',
                data_class: 'health_record',
                destination_region: 'US',
                processing_region: 'US'
              }
            },
            {
              name: 'Personal info cross-border',
              description: 'Personal information to US requiring override',
              request: {
                org_id: 'company-456',
                personal_information: true,
                destination_region: 'US',
                purpose: 'inference'
              }
            },
            {
              name: 'CDR data routing',
              description: 'Consumer data routed to AU pool',
              request: {
                org_id: 'bank-789',
                data_class: 'cdr_data',
                destination_region: 'US'
              }
            }
          ].map((sample) => (
            <button
              key={sample.name}
              onClick={() => setRequestJson(JSON.stringify(sample.request, null, 2))}
              className="text-left p-4 bg-gray-900/70 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
            >
              <h3 className="font-medium text-white mb-1">{sample.name}</h3>
              <p className="text-xs text-gray-400">{sample.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
