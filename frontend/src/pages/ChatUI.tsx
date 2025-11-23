import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Policy, RoutingResponse, UserGroup, User, ChatSession, ChatMessage, ChatRole } from '../types';
import { useBranding } from '../contexts/BrandingContext';
import { useAuth } from '../contexts/AuthContext';

export function ChatUI() {
  const { brandName, poweredBySuffix } = useBranding();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const residencyLabels: Record<string, string> = {
    AUTO: 'Auto (router decides)',
    AU_ONSHORE: 'Australian onshore',
    ON_PREMISE: 'On-prem / local model'
  };

  // Fetch user's group to get assigned policies
  const { data: userGroup } = useQuery<UserGroup>({
    queryKey: ['userGroup', user?.user_group_id],
    queryFn: () => user?.user_group_id ? apiClient.getUserGroup(user.user_group_id) : Promise.resolve(null),
    enabled: !!user?.user_group_id,
  });

  const { data: policies } = useQuery<Policy[]>({
    queryKey: ['policies'],
    queryFn: () => apiClient.getPolicies(),
  });

  // Fetch chat sessions
  const { data: chatSessions, isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ['chatSessions'],
    queryFn: () => apiClient.getChatSessions(),
    enabled: !!user, // Only fetch if user is authenticated
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

  const [policyId, setPolicyId] = useState<string>(defaultPolicyId);
  const [orgId, setOrgId] = useState<string>(user?.org_id || 'tenant-demo');
  const [actorId, setActorId] = useState<string>(user?.id || 'agent-001');
  const [environment, setEnvironment] = useState<'production'|'staging'|'development'|'sandbox'>('production');
  const [audience, setAudience] = useState<'customer'|'external'|'internal'|'staff'>('customer');
  const [context, setContext] = useState<Record<string, unknown>>({
    data_class: 'general',
    destination_region: 'AU',
    environment: 'production',
    audience: 'customer',
  });

  // Current chat session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [lastResult, setLastResult] = useState<RoutingResponse | null>(null);
  const [lastPayload, setLastPayload] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);


  // Mutations for chat operations
  const createSessionMutation = useMutation({
    mutationFn: (input: any) => apiClient.createChatSession(input),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setCurrentSessionId(newSession.id);
      setCurrentMessages(newSession.messages);
    },
  });

  const addMessageMutation = useMutation({
    mutationFn: ({ sessionId, role, content }: { sessionId: string; role: ChatRole; content: string }) =>
      apiClient.addChatMessage(sessionId, role, content),
    onSuccess: (newMessage, { sessionId }) => {
      if (sessionId === currentSessionId) {
        setCurrentMessages(prev => [...prev, newMessage]);
      }
      // Update the session in the cache
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.deleteChatSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      if (currentSessionId) {
        setCurrentSessionId(null);
        setCurrentMessages([]);
      }
    },
  });

  const clearChat = () => {
    setCurrentSessionId(null);
    setCurrentMessages([]);
    setLastResult(null);
    setLastPayload(null);
    setError(null);
  };

  const startNewChat = () => {
    clearChat();
  };

  const loadChatSession = async (session: ChatSession) => {
    setCurrentSessionId(session.id);
    setCurrentMessages(session.messages);
    if (isAdmin && session.policy_id) {
      setPolicyId(session.policy_id);
    }
  };

  const deleteChatSession = (sessionId: string) => {
    deleteSessionMutation.mutate(sessionId);
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentMessages]);

  const execute = useMutation<RoutingResponse, Error, { payload: Record<string, unknown> }>({
    mutationFn: ({ payload }) => apiClient.executeRouting({
      policy_id: policyId,
      request: payload,
      org_id: orgId,
      actor_id: actorId,
    }),
    onSuccess: async (res) => {
      setLastResult(res);
      setError(null);

      const assistantText = extractAssistantText(res);
      if (assistantText) {
        // Add user message first if this is a new session
        if (!currentSessionId) {
          const sessionInput = {
            title: currentMessages.length > 0 ? currentMessages[0].content.substring(0, 50) + '...' : 'New Chat',
            policy_id: policyId,
            messages: currentMessages
          };
          const newSession = await createSessionMutation.mutateAsync(sessionInput);
          // Add the assistant message
          addMessageMutation.mutate({
            sessionId: newSession.id,
            role: 'assistant',
            content: assistantText
          });
        } else {
          // Add assistant message to existing session
          addMessageMutation.mutate({
            sessionId: currentSessionId,
            role: 'assistant',
            content: assistantText
          });
        }
      }
    },
    onError: (err) => {
      setError(err.message || 'Routing failed');
    }
  });

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    // Create user message
    const userMessage = { id: `u-${Date.now()}`, role: 'user' as ChatRole, content: text, created_at: new Date().toISOString() };
    const nextMessages = [...currentMessages, userMessage];
    setCurrentMessages(nextMessages);
    setInput('');

    const payload: Record<string, unknown> = {
      ...context,
      environment,
      audience,
      messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
      channel: 'chat-ui'
    };
    setLastPayload(payload);

    try {
      // If this is the first message, create a new session
      if (!currentSessionId) {
        const sessionInput = {
          title: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          policy_id: policyId,
          messages: nextMessages
        };
        const newSession = await createSessionMutation.mutateAsync(sessionInput);
        // Now execute the routing with the session created
        execute.mutate({ payload });
      } else {
        // Add user message to existing session and then execute
        await addMessageMutation.mutateAsync({
          sessionId: currentSessionId,
          role: 'user',
          content: text
        });
        execute.mutate({ payload });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  };

  const selectedPolicy = useMemo(() => availablePolicies?.find(p => p.policy_id === policyId), [availablePolicies, policyId]);

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left sidebar - Chat History */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="text-white font-semibold text-lg">{brandName}</div>
          <div className="text-xs text-gray-400 mt-1">{poweredBySuffix || 'Chat Interface'}</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-2 px-2">Chat History</div>
          {sessionsLoading ? (
            <div className="text-gray-500 text-sm px-2">Loading...</div>
          ) : !chatSessions || chatSessions.length === 0 ? (
            <div className="text-gray-500 text-sm px-2">No chat sessions yet</div>
          ) : (
            chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => loadChatSession(session)}
                className={`p-2 mb-1 border rounded cursor-pointer hover:border-gray-600 group relative ${
                  currentSessionId === session.id
                    ? 'bg-blue-900/60 border-blue-500'
                    : 'bg-gray-900/60 border-gray-700 hover:bg-gray-900'
                }`}
              >
                <div className="text-xs text-gray-300 mb-1">
                  {new Date(session.created_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-gray-400 line-clamp-2">
                  {session.title || session.messages[0]?.content?.substring(0, 40) + '...' || 'Untitled'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatSession(session.id);
                  }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-gray-700">
          <button
            onClick={startNewChat}
            className="w-full px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-sm font-medium"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Top header */}
        <div className="px-6 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-white font-semibold">Chat</div>
              <div className="text-xs text-gray-400">Powered by AuzGuard</div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {isAdmin && (
              <>
                <select
                  value={policyId}
                  onChange={e => setPolicyId(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1"
                  title="Policy (Admin Only)"
                >
                  {(availablePolicies || []).map(p => (
                    <option key={p.policy_id} value={p.policy_id}>{p.title}</option>
                  ))}
                </select>
                <input value={orgId} onChange={e=>setOrgId(e.target.value)} placeholder="org_id"
                       className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1 w-24"/>
                <input value={actorId} onChange={e=>setActorId(e.target.value)} placeholder="actor_id"
                       className="bg-gray-900 border border-gray-700 text-sm text-gray-100 rounded px-2 py-1 w-24"/>
              </>
            )}
          </div>
        </div>

        {/* Center chat */}
        <div className="flex-1 flex gap-4 p-4">
          <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 flex flex-col">
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
          {currentMessages.map(m => (
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

          {/* Right details - only show for admin users */}
          {isAdmin && (
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

                {lastResult.residency_requirement && (
                  <div className="text-xs text-gray-300 bg-gray-900/60 border border-emerald-500/30 rounded p-3">
                    <div className="font-semibold text-gray-100 mb-1">Residency outcome</div>
                    <div>{residencyLabels[lastResult.residency_requirement] || lastResult.residency_requirement}</div>
                  </div>
                )}

                {lastResult.rule_insights?.length ? (
                  <div>
                    <div className="text-xs font-semibold text-gray-100 mb-2">Rule Insights</div>
                    <div className="space-y-2">
                      {lastResult.rule_insights.map((insight, idx) => (
                        <div
                          key={`${insight.rule_id}-${idx}`}
                          className={`p-2 rounded border text-xs ${
                            insight.matched ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100' : 'border-gray-700 bg-gray-900/60 text-gray-200'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span>{insight.rule_id}</span>
                            <span>{Math.round(insight.confidence * 100)}%</span>
                          </div>
                          {insight.notes && <div className="text-gray-300 mt-1">{insight.notes}</div>}
                          {insight.signals?.length ? (
                            <div className="text-gray-400 mt-1">Signals: {insight.signals.slice(0, 4).join(', ')}</div>
                          ) : null}
                          {insight.missing_fields?.length ? (
                            <div className="text-amber-200 mt-1">Needs: {insight.missing_fields.join(', ')}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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
          )}
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
