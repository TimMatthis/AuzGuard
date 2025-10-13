import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy, RoutingResponse } from '../types';

type ChatRole = 'user' | 'assistant';

interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
}

export function ChatUI() {
  const { data: policies } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies(),
  });

  const [policyId, setPolicyId] = useState<string>('AuzGuard_AU_Base_v1');
  const [orgId, setOrgId] = useState<string>('tenant-demo');
  const [actorId, setActorId] = useState<string>('agent-001');
  const [environment, setEnvironment] = useState<'production'|'staging'|'development'|'sandbox'>('production');
  const [audience, setAudience] = useState<'customer'|'external'|'internal'|'staff'>('customer');
  const [context, setContext] = useState<Record<string, unknown>>({
    data_class: 'general',
    destination_region: 'AU',
    environment: 'production',
    audience: 'customer',
  });

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [lastResult, setLastResult] = useState<RoutingResponse | null>(null);
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const execute = useMutation<RoutingResponse, Error, { payload: Record<string, unknown> }>({
    mutationFn: ({ payload }) => apiClient.executeRouting({
      policy_id: policyId,
      request: payload,
      org_id: orgId,
      actor_id: actorId,
    }),
    onSuccess: (res) => {
      setLastResult(res);
      setError(null);

      const assistantText = extractAssistantText(res);
      if (assistantText) {
        setMsgs((cur) => [...cur, { id: `a-${Date.now()}`, role: 'assistant', content: assistantText }]);
      }
    },
    onError: (err) => {
      setError(err.message || 'Routing failed');
    }
  });

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const nextMsgs: ChatMsg[] = [...msgs, { id: `u-${Date.now()}`, role: 'user' as ChatRole, content: text }];
    setMsgs(nextMsgs);
    setInput('');

    const payload: Record<string, unknown> = {
      ...context,
      environment,
      audience,
      messages: nextMsgs.map(m => ({ role: m.role, content: m.content })),
      channel: 'chat-ui'
    };
    setLastPayload(payload);
    execute.mutate({ payload });
  };

  const selectedPolicy = useMemo(() => policies?.find(p => p.policy_id === policyId), [policies, policyId]);

  return (
    <div className="flex h-[calc(100vh-160px)] gap-4">
      {/* Center chat */}
      <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div>
            <div className="text-white font-semibold">Chat User Interface</div>
            <div className="text-xs text-gray-400">OpenAI/Gemini-like UI with policy routing & audit</div>
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={policyId}
              onChange={e => setPolicyId(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1"
            >
              {(policies || []).map(p => (
                <option key={p.policy_id} value={p.policy_id}>{p.title}</option>
              ))}
            </select>
            <input value={orgId} onChange={e=>setOrgId(e.target.value)} placeholder="org_id"
                   className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1 w-32"/>
            <input value={actorId} onChange={e=>setActorId(e.target.value)} placeholder="actor_id"
                   className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1 w-32"/>
            <select value={environment} onChange={e=>setEnvironment(e.target.value as any)}
                    className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1">
              <option value="production">production</option>
              <option value="staging">staging</option>
              <option value="development">development</option>
              <option value="sandbox">sandbox</option>
            </select>
            <select value={audience} onChange={e=>setAudience(e.target.value as any)}
                    className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1">
              <option value="customer">customer</option>
              <option value="external">external</option>
              <option value="internal">internal</option>
              <option value="staff">staff</option>
            </select>
          </div>
        </div>

        {lastResult && (
          <div className="px-4 py-2 border-b border-gray-700 text-sm">
            <span className="text-gray-300">Compliance:</span> <span className="text-white font-medium">{lastResult.decision}</span>
            {lastResult.matched_rule && <span className="text-gray-400"> • Rule {lastResult.matched_rule}</span>}
            {lastResult.overrides_required && (
              <span className="text-purple-300"> • Override roles: {lastResult.overrides_required.roles.join(', ')}</span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl rounded-2xl px-4 py-3 text-sm border ${m.role === 'user' ? 'bg-sky-500/15 border-sky-500/30 text-sky-100' : 'bg-gray-900/70 border-gray-700 text-gray-100'}`}>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="border-t border-gray-700 p-3">
          {error && <div className="text-xs text-red-300 mb-2">{error}</div>}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Send a message"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-500"/>
            <button onClick={send} disabled={execute.isPending}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-sm disabled:opacity-50">
              {execute.isPending ? 'Routing...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* Right details */}
      <div className="w-[360px] bg-gray-800 rounded-lg border border-gray-700 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="text-white font-semibold">Decision Details</div>
          <div className="text-xs text-gray-400">Rules parsing, model scoring, payloads</div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {selectedPolicy && (
            <div className="text-xs text-gray-300">
              <div className="font-semibold text-gray-200 mb-1">Policy</div>
              <div>{selectedPolicy.title} ({selectedPolicy.policy_id})</div>
            </div>
          )}

          {lastResult ? (
            <>
              {lastResult.model_invocation && (
                <div className="text-xs text-gray-300 bg-gray-900/60 border border-sky-500/30 rounded p-3">
                  <div className="font-semibold text-gray-100 mb-1">Model Invocation</div>
                  <div>Provider: {lastResult.model_invocation.provider}</div>
                  <div>Model: {lastResult.model_invocation.model_identifier}</div>
                  <div>Latency: {lastResult.model_invocation.latency_ms} ms</div>
                  {typeof lastResult.model_invocation.estimated_cost_aud === 'number' && (
                    <div>Est. Cost: ${lastResult.model_invocation.estimated_cost_aud.toFixed(6)} AUD</div>
                  )}
                  {lastResult.audit_log_id && (
                    <div className="text-gray-400 mt-1">Audit ID: {lastResult.audit_log_id}</div>
                  )}
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-100 mb-2">Rule Evaluation</div>
                <div className="space-y-2">
                  {lastResult.trace.map((t, idx) => (
                    <div key={t.rule_id} className={`p-2 rounded border text-xs ${t.matched ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100' : t.skipped ? 'border-gray-700 bg-gray-800/70 text-gray-400' : 'border-gray-700 bg-gray-900/50 text-gray-200'}`}>
                      <div className="flex justify-between"><span>{idx+1}. {t.rule_id}</span><span>{t.skipped ? 'Skipped' : t.matched ? 'Matched' : 'No match'}</span></div>
                      {t.reason && <div className="mt-1 text-gray-300">{t.reason}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {lastResult.route_decision && (
                <div>
                  <div className="text-xs font-semibold text-gray-100 mb-2">Model Scoring</div>
                  <div className="space-y-2 text-xs">
                    {lastResult.route_decision.candidates.map(c => (
                      <div key={c.target.id} className={`p-2 rounded border ${c.selected ? 'border-sky-500/40 bg-sky-500/10 text-sky-100' : 'border-gray-700 bg-gray-900/60 text-gray-200'}`}>
                        <div className="flex justify-between"><span>{c.target.provider} / {c.target.endpoint}</span><span>Score {c.score.toFixed(1)}</span></div>
                        <div className="text-gray-300">{c.reasons.join('; ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-gray-400">Send a message to view evaluation details.</div>
          )}

          {/* API I/O panel */}
          <div className="bg-gray-800 border border-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold">API I/O</div>
              <div className="text-xs text-gray-400">POST /api/routes/execute</div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Request payload</div>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    className="px-2 py-0.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(JSON.stringify(lastPayload ?? {}, null, 2)); } catch {}
                    }}
                  >Copy</button>
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words max-h-48 overflow-auto bg-gray-900/60 border border-gray-700 rounded p-2">
                  {JSON.stringify(lastPayload ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Router response</div>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    className="px-2 py-0.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(JSON.stringify(lastResult ?? {}, null, 2)); } catch {}
                    }}
                  >Copy</button>
                </div>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words max-h-56 overflow-auto bg-gray-900/60 border border-gray-700 rounded p-2">
                  {JSON.stringify(lastResult ?? {}, null, 2)}
                </pre>
              </div>
              {typeof lastResult?.model_response !== 'undefined' && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Model response</div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap break-words max-h-56 overflow-auto bg-gray-900/60 border border-gray-700 rounded p-2">
                    {typeof lastResult.model_response === 'string'
                      ? lastResult.model_response
                      : JSON.stringify(lastResult.model_response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractAssistantText(res: RoutingResponse): string | undefined {
  const raw = res.model_response as any;
  if (!raw) return res.model_invocation?.response_excerpt;
  // OpenAI-style
  const oai = raw?.choices?.[0]?.message?.content;
  if (typeof oai === 'string' && oai.trim()) return oai;
  // Gemini-style
  const gtxt = raw?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof gtxt === 'string' && gtxt.trim()) return gtxt;
  // Ollama-style
  const oll = raw?.message?.content;
  if (typeof oll === 'string' && oll.trim()) return oll;
  // Fallback
  return res.model_invocation?.response_excerpt;
}

export default ChatUI;
