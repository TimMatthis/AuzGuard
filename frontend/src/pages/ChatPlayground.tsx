import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { RoutingResponse, Policy, Rule, Effect, UserGroup } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ConversationMessage {
  id: string;
  role: 'user' | 'router';
  content: string;
  annotation?: string;
}

const initialContext = `{
  "data_class": "cdr_data",
  "destination_region": "US",
  "environment": "production",
  "request_type": "chat_completion"
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

export function ChatPlayground() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Fetch user's group to get assigned policies
  const { data: userGroup } = useQuery<UserGroup>({
    queryKey: ['userGroup', user?.user_group_id],
    queryFn: () => user?.user_group_id ? apiClient.getUserGroup(user.user_group_id) : Promise.resolve(null),
    enabled: !!user?.user_group_id,
  });

  const { data: policies } = useQuery({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies()
  });

  // Filter policies based on user's group permissions
  const availablePolicies = useMemo(() => {
    if (isAdmin || !userGroup) return policies || [];
    if (userGroup.allowed_policies && userGroup.allowed_policies.length > 0) {
      return (policies || []).filter(p => userGroup.allowed_policies?.includes(p.policy_id));
    }
    return policies || [];
  }, [policies, userGroup, isAdmin]);

  // Auto-select default policy from user's group or first available
  const defaultPolicyId = userGroup?.default_policy_id || availablePolicies[0]?.policy_id || 'AuzGuard_AU_Base_v1';

  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(defaultPolicyId);

  // Update policy when default changes
  useEffect(() => {
    if (defaultPolicyId && !isAdmin) {
      setSelectedPolicyId(defaultPolicyId);
    }
  }, [defaultPolicyId, isAdmin]);
  const [orgId, setOrgId] = useState<string>('demo-org');
  const [actorId, setActorId] = useState<string>('developer-123');
  const [contextJson, setContextJson] = useState<string>(initialContext);
  const [message, setMessage] = useState<string>('Requesting a completion for CDR data.');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [lastResult, setLastResult] = useState<RoutingResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<Record<string, unknown> | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [comparePolicyId, setComparePolicyId] = useState<string>('');
  const [compareA, setCompareA] = useState<RoutingResponse | null>(null);
  const [compareB, setCompareB] = useState<RoutingResponse | null>(null);
  const [compareNote, setCompareNote] = useState<string | null>(null);

  const appendRouterMessage = (result: RoutingResponse | null, error?: string) => {
    setMessages((current) => {
      const next = [...current];
      if (result) {
        const invocationHint = result.model_invocation
          ? result.model_invocation.provider + ':' + result.model_invocation.model_identifier + ' (' + result.model_invocation.latency_ms + 'ms)'
          : result.route_decision?.pool_id
            ? 'Pool ' + result.route_decision.pool_id
            : undefined;

        next.push({
          id: `router-${Date.now()}`,
          role: 'router',
          content: `Decision: ${result.decision}`,
          annotation: result.matched_rule
            ? invocationHint
              ? `Matched rule ${result.matched_rule} -> ${invocationHint}`
              : `Matched rule ${result.matched_rule}`
            : invocationHint ?? 'Default policy effect'
        });
      } else if (error) {
        next.push({
          id: `router-${Date.now()}`,
          role: 'router',
          content: 'Routing failed',
          annotation: error
        });
      }
      return next;
    });
  };

  const executeMutation = useMutation<RoutingResponse, Error, { policyId: string; request: Record<string, unknown> }>({
    mutationFn: (payload) =>
      apiClient.executeRouting({
        policy_id: payload.policyId,
        request: payload.request,
        org_id: orgId,
        actor_id: actorId
      }),
    onSuccess: (result) => {
      setLastResult(result);
      setErrorMessage(null);
      appendRouterMessage(result);
    },
    onError: (err) => {
      const message = getErrorMessage(err, 'Failed to execute router');
      setErrorMessage(message);
      appendRouterMessage(null, message);
    }
  });

  const handleSend = () => {
    if (!message.trim()) {
      return;
    }

    let parsedContext: Record<string, unknown> = {};
    try {
      parsedContext = contextJson ? JSON.parse(contextJson) : {};
    } catch (_error) {
      setErrorMessage('Context JSON is invalid. Please correct it before sending.');
      return;
    }

    const requestPayload: Record<string, unknown> = {
      ...parsedContext,
      org_id: orgId,
      actor_id: actorId,
      message,
      message_timestamp: new Date().toISOString(),
      channel: 'chat'
    };
    setLastRequest(requestPayload);

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message
      }
    ]);
    setMessage('');

    executeMutation.mutate({ policyId: selectedPolicyId, request: requestPayload });
  };

  const openInSimulator = () => {
    // Prefer the last executed request; otherwise build from current fields
    let request = lastRequest;
    if (!request) {
      try {
        const base = contextJson ? JSON.parse(contextJson) : {};
        request = {
          ...base,
          org_id: orgId,
          actor_id: actorId,
          message: message || undefined,
          channel: 'chat'
        } as Record<string, unknown>;
      } catch {
        request = { org_id: orgId, actor_id: actorId } as Record<string, unknown>;
      }
    }
    try { localStorage.setItem('auzguard_sim_policy', selectedPolicyId); localStorage.setItem('auzguard_sim_request', JSON.stringify(request)); } catch {} navigate('/simulator', { state: { policyId: selectedPolicyId, request } });
  };

  const runAB = async () => {
    setCompareNote(null);
    try {
      if (!comparePolicyId) {
        setCompareNote('Select a second policy to compare.');
        return;
      }
      // Build a request similar to last send or current fields
      let request = lastRequest;
      if (!request) {
        try {
          request = JSON.parse(contextJson || '{}');
        } catch {
          setCompareNote('Invalid context JSON. Fix it or send once.');
          return;
        }
        request = {
          ...(request as Record<string, unknown>),
          org_id: orgId,
          actor_id: actorId,
          message: message || undefined,
          channel: 'chat'
        } as Record<string, unknown>;
      }
      const [a, b] = await Promise.all([
        apiClient.executeRouting({ policy_id: selectedPolicyId, request, org_id: orgId, actor_id: actorId }),
        apiClient.executeRouting({ policy_id: comparePolicyId, request, org_id: orgId, actor_id: actorId })
      ]);
      setCompareA(a);
      setCompareB(b);
      const diffs: string[] = [];
      if (a.decision !== b.decision) diffs.push(`Decision: ${a.decision} vs ${b.decision}`);
      if ((a.matched_rule || '') !== (b.matched_rule || '')) diffs.push(`Rule: ${a.matched_rule || '-'} vs ${b.matched_rule || '-'}`);
      const poolA = a.route_decision?.pool_id || '-';
      const poolB = b.route_decision?.pool_id || '-';
      if (poolA !== poolB) diffs.push(`Pool: ${poolA} vs ${poolB}`);
      setCompareNote(diffs.length ? diffs.join(' • ') : 'No differences detected.');
    } catch (e) {
      setCompareNote(getErrorMessage(e, 'Failed to run A/B compare.'));
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Chat Router Sandbox</h1>
        <p className="text-gray-400 text-sm max-w-3xl">
          Experiment with chat-style requests and observe how AuzGuard evaluates policies, scores model targets, and logs
          the routing trail in real time.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-gray-800 border border-gray-800 rounded-lg flex flex-col">
          <div className="border-b border-gray-700 px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Policy (Admin Only)</label>
                <select
                  value={selectedPolicyId}
                  onChange={(event) => setSelectedPolicyId(event.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  data-testid="policy-select"
                >
                  {availablePolicies?.map(policy => (
                    <option key={policy.policy_id} value={policy.policy_id}>
                      {policy.title} ({policy.policy_id})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isAdmin && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Org ID (Admin Only)</label>
                  <input
                    value={orgId}
                    onChange={(event) => setOrgId(event.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="org-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Actor ID (Admin Only)</label>
                  <input
                    value={actorId}
                    onChange={(event) => setActorId(event.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    data-testid="actor-input"
                  />
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-b border-gray-700">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Context JSON</label>
            <textarea
              value={contextJson}
              onChange={(event) => setContextJson(event.target.value)}
              rows={6}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
              data-testid="context-textarea"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm">
                Send a message to see the router decision trail.
              </div>
            )}
            {messages.map(entry => (
              <div
                key={entry.id}
                className={`max-w-xl ${entry.role === 'user' ? 'ml-auto text-right' : ''}`}
              >
                <div
                  className={`inline-flex flex-col gap-1 px-4 py-3 rounded-lg text-sm ${
                    entry.role === 'user'
                      ? 'bg-sky-500/20 border border-sky-500/40 text-sky-100'
                      : 'bg-gray-900/70 border border-gray-700 text-gray-100'
                  }`}
                >
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    {entry.role === 'user' ? 'You' : 'Router'}
                  </span>
                  <span>{entry.content}</span>
                  {entry.annotation && (
                    <span className="text-xs text-gray-400">{entry.annotation}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-700 px-6 py-4">
            {errorMessage && (
              <div className="mb-3 text-sm text-red-300">{errorMessage}</div>
            )}
            <div className="flex gap-3">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask something to route…"
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                data-testid="message-input"
              />
              <button
                onClick={handleSend}
                disabled={executeMutation.isPending}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md transition-colors disabled:opacity-50"
                data-testid="send-button"
              >
                {executeMutation.isPending ? 'Routing...' : 'Send & Route'}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-gray-800 border border-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-medium text-white">Decision Trace</h2>
            <p className="text-sm text-gray-400">Latest router execution, including rule ladder and model scoring.</p>
          </div>

          {lastResult && (
            <div className="flex gap-3 items-center">
              <button
                onClick={async () => {
                  setSaveStatus(null);
                  try {
                    if (!lastResult?.matched_rule) {
                      setSaveStatus('No matched rule to attach test.');
                      return;
                    }
                    const fullPolicy: Policy = await apiClient.getPolicy(selectedPolicyId);
                    const rules: Rule[] = fullPolicy.rules || [];
                    const idx = rules.findIndex(r => r.rule_id === lastResult.matched_rule);
                    if (idx === -1) {
                      setSaveStatus(`Rule ${lastResult.matched_rule} not found in policy.`);
                      return;
                    }
                    const test = {
                      name: `Chat case ${new Date().toISOString()}`,
                      request: (lastRequest || lastResult.request_payload || {}),
                      expect: (lastResult.decision as Effect),
                    };
                    const updatedRule: Rule = { ...rules[idx], tests: [...(rules[idx].tests || []), test] };
                    const updated: Policy = { ...fullPolicy, rules: [...rules.slice(0, idx), updatedRule, ...rules.slice(idx + 1)] };
                    await apiClient.updatePolicy(updated.policy_id, updated);
                    setSaveStatus('Saved to matched rule tests.');
                  } catch (e: any) {
                    setSaveStatus(e?.message || 'Failed to save test.');
                  }
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs"
                data-testid="save-as-test"
              >
                Save as rule test
              </button>
              <button
                onClick={async () => {
                  try {
                    const toCopy = JSON.stringify(lastRequest || lastResult?.request_payload || {}, null, 2);
                    await navigator.clipboard.writeText(toCopy);
                    setSaveStatus('Request copied to clipboard.');
                  } catch {
                    setSaveStatus('Failed to copy to clipboard.');
                  }
                }}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                data-testid="copy-request"
              >
                Copy request JSON
              </button>
              {saveStatus && (
                <span className="text-xs text-gray-300">{saveStatus}</span>
              )}
              <button
                onClick={openInSimulator}
                className="ml-auto px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-xs"
                data-testid="open-simulator"
              >
                Open in Simulator
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 bg-gray-900/40 border border-gray-800 rounded p-3">
            <div className="text-xs text-gray-300">A/B compare</div>
            <div className="flex gap-2 items-center">
              <select
                value={comparePolicyId}
                onChange={e => setComparePolicyId(e.target.value)}
                className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100"
                data-testid="compare-policy-select"
              >
                <option value="">Select policy B…</option>
                {(policies || []).filter(p => p.policy_id !== selectedPolicyId).map(p => (
                  <option key={p.policy_id} value={p.policy_id}>{p.title} ({p.policy_id})</option>
                ))}
              </select>
              <button
                onClick={runAB}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs"
                data-testid="run-ab"
              >
                Run A/B
              </button>
              {compareNote && <span className="text-xs text-gray-300">{compareNote}</span>}
            </div>
            {(compareA && compareB) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-900/60 border border-gray-700 rounded p-3">
                  <div className="font-semibold text-gray-100 mb-1">Policy A: {selectedPolicyId}</div>
                  <div>Decision: {compareA.decision}</div>
                  <div>Rule: {compareA.matched_rule || '-'}</div>
                  <div>Pool: {compareA.route_decision?.pool_id || '-'}</div>
                </div>
                <div className="bg-gray-900/60 border border-gray-700 rounded p-3">
                  <div className="font-semibold text-gray-100 mb-1">Policy B: {comparePolicyId}</div>
                  <div>Decision: {compareB.decision}</div>
                  <div>Rule: {compareB.matched_rule || '-'}</div>
                  <div>Pool: {compareB.route_decision?.pool_id || '-'}</div>
                </div>
              </div>
            )}
          </div>

          {lastResult ? (
            <div className="space-y-4">
              <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-4 text-sm text-gray-200">
                <p className="font-semibold text-white">Decision {lastResult.decision}</p>
                <p className="text-gray-400">
                  {lastResult.matched_rule ? `Matched rule ${lastResult.matched_rule}` : 'Default policy effect'}
                </p>
                {lastResult.route_decision?.pool_id && (
                  <p className="text-gray-400">Routed to {lastResult.route_decision.pool_id}</p>
                )}
                {lastResult.audit_log_id && (
                  <p className="text-gray-500 text-xs mt-2">Audit log ID {lastResult.audit_log_id}</p>
                )}
              </div>

              {lastResult.model_invocation && (
                <div className="bg-gray-900/60 border border-sky-500/30 rounded-lg p-4 text-sm text-gray-200 space-y-1">
                  <p className="font-semibold text-white">Model Invocation</p>
                  <p>Provider: {lastResult.model_invocation.provider}</p>
                  <p>Model: {lastResult.model_invocation.model_identifier}</p>
                  <p>Latency: {lastResult.model_invocation.latency_ms}ms</p>
                  {typeof lastResult.model_invocation.estimated_cost_aud === 'number' && (
                    <p>Estimated cost: ${lastResult.model_invocation.estimated_cost_aud.toFixed(6)} AUD</p>
                  )}
                  {lastResult.model_invocation.response_excerpt && (
                    <p className="text-gray-400">Excerpt: {lastResult.model_invocation.response_excerpt}</p>
                  )}
                  {lastResult.model_invocation.error_message && (
                    <p className="text-red-300">Error: {lastResult.model_invocation.error_message}</p>
                  )}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Rule evaluation</h3>
                <div className="space-y-2">
                  {lastResult.trace.map((step, index) => (
                    <div
                      key={step.rule_id}
                      className={`p-3 rounded border text-xs ${
                        step.matched
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                          : step.skipped
                            ? 'border-gray-700 bg-gray-800/70 text-gray-400'
                            : 'border-gray-700 bg-gray-900/50 text-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{index + 1}. {step.rule_id}</span>
                        <span className="uppercase">
                          {step.skipped ? 'Skipped' : step.matched ? 'Matched' : 'No match'}
                        </span>
                      </div>
                      {step.reason && (
                        <p className="mt-1 text-gray-300">{step.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {lastResult.route_decision && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-200 mb-2">Model scoring</h3>
                  <div className="space-y-2 text-xs">
                    {lastResult.route_decision.candidates.map(candidate => (
                      <div
                        key={candidate.target.id}
                        className={`p-3 rounded border ${
                          candidate.selected
                            ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                            : 'border-gray-700 bg-gray-900/60 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">
                            {candidate.target.provider} / {candidate.target.endpoint}
                          </p>
                          <p>Score {candidate.score.toFixed(1)}</p>
                        </div>
                        <p className="text-gray-300 mt-1">Reasons: {candidate.reasons.join('; ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Payload & response</h3>
                <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Request payload</p>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">{JSON.stringify(lastResult.request_payload ?? {}, null, 2)}</pre>
                </div>
                {typeof lastResult.model_response !== 'undefined' && (
                  <div className="bg-gray-900/70 border border-gray-700 rounded-lg p-3">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Model response</p>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words">
                      {typeof lastResult.model_response === 'string'
                        ? lastResult.model_response
                        : JSON.stringify(lastResult.model_response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              Send a message to populate the decision trace. The router response will appear here.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
