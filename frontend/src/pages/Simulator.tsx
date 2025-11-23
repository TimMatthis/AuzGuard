import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy, SimulationInput, SimulationResult, RoutingResponse, RuleInsight } from '../types';

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

const residencyLabels: Record<string, string> = {
  AUTO: 'Auto (router decides)',
  AU_ONSHORE: 'Australian onshore',
  ON_PREMISE: 'On-prem / local only'
};

const defaultRequest = `{
  "org_id": "hospital-123",
  "data_class": "health_record",
  "personal_information": true,
  "destination_region": "US",
  "processing_region": "US",
  "purpose": "inference"
}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (typeof error === 'string' && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object') {
    const payload = error as { message?: string; code?: string; error?: { message?: string } };
    if (payload.message) return payload.message;
    if (payload.error?.message) return payload.error.message;
    if (payload.code) return `Error ${payload.code}`;
  }
  return fallback;
};

export function Simulator() {
  const [selectedPolicy, setSelectedPolicy] = useState<string>('AuzGuard_AU_Base_v1');
  const [requestJson, setRequestJson] = useState<string>(defaultRequest);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [routingResult, setRoutingResult] = useState<RoutingResponse | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messageOptions, setMessageOptions] = useState({
    destination_region: 'US',
    environment: 'production',
    audience: 'customer'
  });
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);

  const messagePayload = useMemo(() => {
    const base: Record<string, unknown> = {
      org_id: 'simulator-org',
      destination_region: messageOptions.destination_region,
      environment: messageOptions.environment,
      audience: messageOptions.audience
    };
    if (messageInput.trim()) {
      base.messages = [
        {
          role: 'user',
          content: messageInput.trim()
        }
      ];
    }
    return base;
  }, [messageInput, messageOptions]);

  const { data: policies } = useQuery({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies()
  });

  const simulateMutation = useMutation({
    mutationFn: (input: SimulationInput) => apiClient.simulate(input),
    onSuccess: (result) => {
      setSimulationResult(result);
      setSimulationError(null);
    },
    onError: (error) => {
      setSimulationError(getErrorMessage(error, 'Simulation failed. Check request payload and try again.'));
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
      setRoutingError(null);
    },
    onError: (error) => {
      setRoutingError(getErrorMessage(error, 'Core router call failed. Check API server logs for details.'));
    }
  });

  const parseRequest = (): Record<string, unknown> | null => {
    try {
      return JSON.parse(requestJson);
    } catch {
      return null;
    }
  };

  const handleSimulate = () => {
    const request = parseRequest();
    if (!request) {
      setSimulationError('Invalid JSON in request payload.');
      return;
    }
    setSimulationError(null);
    simulateMutation.mutate({
      policy_id: selectedPolicy,
      request
    });
  };

  const handleExecuteRouting = () => {
    const request = parseRequest();
    if (!request) {
      setRoutingError('Invalid JSON in request payload.');
      return;
    }
    setRoutingError(null);
    routeMutation.mutate({ policy_id: selectedPolicy, request });
  };

  const handleSimulateMessage = () => {
    if (!messageInput.trim()) {
      setSimulationError('Enter a message to evaluate.');
      return;
    }
    setSimulationError(null);
    simulateMutation.mutate({
      policy_id: selectedPolicy,
      request: messagePayload
    });
    setRequestJson(JSON.stringify(messagePayload, null, 2));
  };

  const handleExecuteMessageRouting = () => {
    if (!messageInput.trim()) {
      setRoutingError('Enter a message to evaluate.');
      return;
    }
    setRoutingError(null);
    routeMutation.mutate({ policy_id: selectedPolicy, request: messagePayload });
    setRequestJson(JSON.stringify(messagePayload, null, 2));
  };

  const handleLoadMessageIntoJson = () => {
    setRequestJson(JSON.stringify(messagePayload, null, 2));
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

  const renderRuleInsights = (insights?: RuleInsight[]) => {
    if (!insights || !insights.length) {
      return <p className="text-xs text-gray-500">No derived rule insights for this payload.</p>;
    }

    return (
      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={`${insight.rule_id}-${index}`}
            className={`p-3 rounded border text-xs ${
              insight.matched ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-100' : 'border-gray-700 bg-gray-900/40 text-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">{insight.rule_id}</span>
              <span className="text-gray-400">{Math.round((insight.confidence ?? 0) * 100)}% confidence</span>
            </div>
            {insight.notes && <p className="text-gray-300 mb-1">{insight.notes}</p>}
            {insight.signals?.length > 0 && (
              <p className="text-gray-400">
                Signals: <span className="text-gray-200">{insight.signals.slice(0, 5).join(', ')}</span>
              </p>
            )}
            {insight.missing_fields?.length ? (
              <p className="text-amber-200">Needs fields: {insight.missing_fields.join(', ')}</p>
            ) : null}
            {insight.suggested_fields && (
              <pre className="mt-2 bg-gray-950/40 border border-gray-800 rounded p-2 text-gray-200">
                {JSON.stringify(insight.suggested_fields, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Request Simulator</h1>
        <p className="text-gray-400 text-sm max-w-3xl">
          Test policies against sample requests and compare simulated evaluation with the live routing engine.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6 xl:col-span-1">
          <section className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
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
            {(simulationError || routingError) && (
              <div className="space-y-2">
                {simulationError && (
                  <p className="text-sm text-red-200 bg-red-900/40 border border-red-700 rounded px-3 py-2">
                    {simulationError}
                  </p>
                )}
                {routingError && (
                  <p className="text-sm text-amber-200 bg-amber-900/30 border border-amber-600 rounded px-3 py-2">
                    {routingError}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
            <header>
              <h2 className="text-lg font-semibold text-white">Message Payload Builder</h2>
              <p className="text-sm text-gray-400">Paste a transcript to auto-generate a request payload.</p>
            </header>
            <textarea
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              rows={8}
              placeholder="Describe the message or conversation you want to test…"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Destination Region</label>
                <input
                  value={messageOptions.destination_region}
                  onChange={(event) =>
                    setMessageOptions(opts => ({ ...opts, destination_region: event.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Environment</label>
                <select
                  value={messageOptions.environment}
                  onChange={(event) =>
                    setMessageOptions(opts => ({ ...opts, environment: event.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {['production', 'staging', 'development', 'sandbox'].map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Audience</label>
                <select
                  value={messageOptions.audience}
                  onChange={(event) =>
                    setMessageOptions(opts => ({ ...opts, audience: event.target.value }))
                  }
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {['customer', 'external', 'internal', 'staff'].map(audience => (
                    <option key={audience} value={audience}>{audience}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSimulateMessage}
                className="flex-1 min-w-[140px] px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors disabled:opacity-50"
                disabled={simulateMutation.isPending}
              >
                {simulateMutation.isPending ? 'Simulating…' : 'Simulate Message'}
              </button>
              <button
                onClick={handleExecuteMessageRouting}
                className="flex-1 min-w-[140px] px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50"
                disabled={routeMutation.isPending}
              >
                {routeMutation.isPending ? 'Routing…' : 'Execute Router'}
              </button>
              <button
                onClick={handleLoadMessageIntoJson}
                className="flex-1 min-w-[140px] px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Load into JSON editor
              </button>
            </div>
            <div>
              <h3 className="text-xs uppercase tracking-wide text-gray-400 mb-1">Payload preview</h3>
              <pre className="bg-gray-900 border border-gray-700 rounded-md text-xs text-gray-200 p-3 max-h-56 overflow-auto">
                {JSON.stringify(messagePayload, null, 2)}
              </pre>
            </div>
          </section>
        </div>

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
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400">Residency outcome</h3>
                  <p>{residencyLabels[simulationResult.residency_requirement || 'AUTO']}</p>
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
                  <p>Authorized roles: {simulationResult.overrides_required.roles.join(', ') || '�'}</p>
                  <p>Justification: {simulationResult.overrides_required.require_justification ? 'Required' : 'Optional'}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Derived rule insights</h3>
                {renderRuleInsights(simulationResult.rule_insights)}
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 text-sm text-gray-400">
              {simulationError ? (
                <div className="text-red-200">
                  <p className="font-semibold mb-1">Simulation failed</p>
                  <p className="text-sm text-red-100">{simulationError}</p>
                </div>
              ) : (
                'Run a simulation to see rule evaluation details.'
              )}
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
                <div>
                  <h3 className="text-xs uppercase tracking-wide text-gray-400">Residency outcome</h3>
                  <p>{residencyLabels[routingResult.residency_requirement || 'AUTO']}</p>
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
                            {candidate.target.provider} � {candidate.target.endpoint}
                          </span>
                          <span className="text-xs">Score {candidate.score.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">Reasons: {candidate.reasons.join('; ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Derived rule insights</h3>
                {renderRuleInsights(routingResult.rule_insights)}
              </div>
            </div>
          )}
          {!routingResult && routingError && (
            <div className="bg-gray-800 border border-gray-800 rounded-lg p-6 text-sm text-amber-200">
              <p className="font-semibold mb-1">Router call failed</p>
              <p className="text-amber-100">{routingError}</p>
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
