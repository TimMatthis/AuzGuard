import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool, RouteTarget, RoutingDecision, RoutingPreference, ModelProfile, RouteProfile } from '../types';
import { Tooltip } from '../components/Tooltip';

export function RoutingConfigurator() {
  const queryClient = useQueryClient();
  const { data: pools } = useQuery<ModelPool[]>({ queryKey: ['modelPools'], queryFn: () => apiClient.getModelPools() });
  const { data: profiles } = useQuery<RouteProfile[]>({ queryKey: ['routeProfiles'], queryFn: () => apiClient.getRouteProfiles() });
  const [selectedPoolId, setSelectedPoolId] = React.useState<string>('');
  const selectedPool = React.useMemo(() => pools?.find(p => p.pool_id === (selectedPoolId || pools?.[0]?.pool_id)) || pools?.[0], [pools, selectedPoolId]);

  const [profileName, setProfileName] = React.useState('');
  const [basic, setBasic] = React.useState<RouteProfile['basic']>({
    optimize_speed: false,
    optimize_cost: false,
    optimize_performance: false,
    keep_onshore: false,
    dynamic_by_context: true,
  });

  const [prefs, setPrefs] = React.useState<RoutingPreference>({
    info_types: [],
    model_strength: undefined,
    required_context_window_tokens: undefined,
    required_data_residency: undefined,
    requires_json_mode: false,
    requires_function_calling: false,
    requires_streaming: false,
    requires_vision: false,
    latency_budget_ms: undefined,
    max_cost_per_1k_aud: undefined,
    min_quality_score: undefined,
    required_output_tokens: undefined
  });
  const [preview, setPreview] = React.useState<RoutingDecision | null>(null);

  // Map basic toggles to sensible defaults in advanced preferences
  React.useEffect(() => {
    setPrefs((prev: RoutingPreference) => {
      const next: RoutingPreference = { ...prev };
      if (basic?.optimize_speed) {
        (next as any).minimize_latency = true;
        next.latency_budget_ms = next.latency_budget_ms ?? 300;
      } else {
        (next as any).minimize_latency = (next as any).minimize_latency && true; // leave as-is if previously set manually
      }
      if (basic?.optimize_cost) {
        next.max_cost_per_1k_aud = typeof next.max_cost_per_1k_aud === 'number' ? next.max_cost_per_1k_aud : 0.012;
      }
      if (basic?.optimize_performance) {
        next.model_strength = next.model_strength || 'strong';
        next.min_quality_score = typeof next.min_quality_score === 'number' ? next.min_quality_score : 8;
      }
      if (basic?.keep_onshore) {
        next.required_data_residency = next.required_data_residency || 'AU';
      }
      return next;
    });
  }, [basic?.optimize_speed, basic?.optimize_cost, basic?.optimize_performance, basic?.keep_onshore]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPool) throw new Error('Select a pool');
      const result = await apiClient.previewRanking(selectedPool.pool_id, prefs);
      setPreview(result);
      return result;
    }
  });

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      const payload = { name: profileName || `Route ${new Date().toLocaleString()}`, basic, preferences: prefs };
      return apiClient.createRouteProfile(payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['routeProfiles'] }); setProfileName(''); }
  });

  // no group editing on this page

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Routing Configurator</h1>
          <p className="text-gray-400 text-sm">Select parameters to determine which models are used under which circumstances.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedPoolId} onChange={(e) => setSelectedPoolId(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
            {pools?.map(p => (<option key={p.pool_id} value={p.pool_id}>{p.pool_id} ({p.region})</option>))}
          </select>
        </div>
      </header>

      {/* Basic section */}
      <section className="bg-gray-800 border border-gray-800 rounded-lg p-6">
        <header className="mb-4">
          <h2 className="text-lg font-medium text-white">Basic Options</h2>
          <p className="text-sm text-gray-400">Tick the strategies that best fit this route.</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <label className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${basic?.optimize_speed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/60'}`}
            onClick={() => setBasic(prev => ({ ...(prev||{}), optimize_speed: !prev?.optimize_speed }))}>
            <input type="checkbox" checked={!!basic?.optimize_speed} readOnly /> Optimise for speed
          </label>
          <label className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${basic?.optimize_cost ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/60'}`}
            onClick={() => setBasic(prev => ({ ...(prev||{}), optimize_cost: !prev?.optimize_cost }))}>
            <input type="checkbox" checked={!!basic?.optimize_cost} readOnly /> Optimise for cost
          </label>
          <label className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${basic?.optimize_performance ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/60'}`}
            onClick={() => setBasic(prev => ({ ...(prev||{}), optimize_performance: !prev?.optimize_performance, optimize_speed: false, optimize_cost: false }))}>
            <input type="checkbox" checked={!!basic?.optimize_performance} readOnly /> Optimise for performance
          </label>
          <label className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${basic?.keep_onshore ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/60'}`}
            onClick={() => setBasic(prev => ({ ...(prev||{}), keep_onshore: !prev?.keep_onshore, }))}>
            <input type="checkbox" checked={!!basic?.keep_onshore} readOnly /> Keep all data onshore
          </label>
          <label className={`flex items-center gap-2 p-3 rounded border cursor-pointer ${basic?.dynamic_by_context ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-gray-700 bg-gray-900/60'}`}
            onClick={() => setBasic(prev => ({ ...(prev||{}), dynamic_by_context: !prev?.dynamic_by_context }))}>
            <input type="checkbox" checked={!!basic?.dynamic_by_context} readOnly /> Dynamically decide (context & modality)
          </label>
        </div>
      </section>

      {/* Advanced section */}
      <section className="bg-gray-800 border border-gray-800 rounded-lg p-6">
        <header className="mb-4">
          <h2 className="text-lg font-medium text-white">Advanced Parameters</h2>
          <p className="text-sm text-gray-400">Information type, content window, and model strength steer selection.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <label className="block text-gray-300 mb-1">
              Information Types
              <span className="ml-2 align-middle"><Tooltip label="Data categories present in your prompt or inputs. Helps select models certified or tuned for that data. Examples: PII (personally identifiable information), health data, financial records, source code." /></span>
            </label>
            <div className="flex flex-wrap gap-2">
              {['general','pii','health','financial','code','demographic','sensitive_personal'].map(t => (
                <label key={t} className={`px-2 py-1 rounded border cursor-pointer ${prefs.info_types?.includes(t) ? 'bg-sky-500/10 border-sky-500/40 text-sky-200' : 'bg-gray-900/60 border-gray-700 text-gray-300'}`}
                  onClick={() => {
                    setPrefs(prev => {
                      const set = new Set(prev.info_types || []);
                      if (set.has(t)) set.delete(t); else set.add(t);
                      return { ...prev, info_types: Array.from(set) };
                    });
                  }}
                >
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Required Context Window (tokens)
              <span className="ml-2 align-middle"><Tooltip label="Minimum tokens the model must be able to read (prompt + history). Examples: 4,096 (classic chat), 32,000 (long docs), 200,000+ (contract analysis). Estimate ~4 chars per token." /></span>
            </label>
            <input type="number" placeholder="e.g. 32000" value={prefs.required_context_window_tokens ?? ''}
              onChange={(e) => setPrefs(prev => ({ ...prev, required_context_window_tokens: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
            <p className="text-xs text-gray-500 mt-1">How much prompt + chat history the model can read at once. Examples: 4,096 (classic), 32,000 (long), 200,000+ (ultra‑long). Choose the minimum your job needs.</p>
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Model Strength
              <span className="ml-2 align-middle"><Tooltip label="Overall capability tier. Lite: small/fast, Standard: balanced, Strong: highest quality. Used to bias selection when quality matters." /></span>
            </label>
            <select value={prefs.model_strength ?? ''} onChange={(e) => setPrefs(prev => ({ ...prev, model_strength: (e.target.value || undefined) as any }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
              <option value="">No preference</option>
              <option value="lite">Lite</option>
              <option value="standard">Standard</option>
              <option value="strong">Strong</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Required Data Residency
              <span className="ml-2 align-middle"><Tooltip label="Where inference is performed and data handled. AU requires Australian residency; AU - Local/Onsite also requires deployment tags like local/onsite/onprem for sovereign workloads." /></span>
            </label>
            <select value={prefs.required_data_residency ?? ''} onChange={(e) => setPrefs(prev => ({ ...prev, required_data_residency: (e.target.value || undefined) as any }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
              <option value="">Any</option>
              <option value="AU">AU</option>
              <option value="AU_LOCAL">AU - Local / Onsite</option>
              <option value="EU">EU</option>
              <option value="US">US</option>
              <option value="UK">UK</option>
              <option value="SG">SG</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Hard requirement; mismatches are disqualified.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-4">
          <div>
            <label className="block text-gray-300 mb-1">
              Latency Budget (p95 ms)
              <span className="ml-2 align-middle"><Tooltip label="Target 95th percentile latency. Models above this receive penalties; faster models get a boost. Example: 400ms for chat UX, 1500ms for batch." /></span>
            </label>
            <input type="number" placeholder="e.g. 400" value={prefs.latency_budget_ms ?? ''}
              onChange={(e) => setPrefs(prev => ({ ...prev, latency_budget_ms: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Max Cost per 1k tokens (AUD)
              <span className="ml-2 align-middle"><Tooltip label="Upper bound for price. Example: 0.015 AUD/1k tokens. More expensive targets are penalized or disqualified." /></span>
            </label>
            <input type="number" step="0.001" placeholder="e.g. 0.015" value={prefs.max_cost_per_1k_aud ?? ''}
              onChange={(e) => setPrefs(prev => ({ ...prev, max_cost_per_1k_aud: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Min Quality Score
              <span className="ml-2 align-middle"><Tooltip label="Minimum acceptable quality score (0–10). Scores can come from internal evals. Example: 7.5 for high‑risk tasks." /></span>
            </label>
            <input type="number" step="0.1" placeholder="e.g. 7.5" value={prefs.min_quality_score ?? ''}
              onChange={(e) => setPrefs(prev => ({ ...prev, min_quality_score: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Required Output Tokens
              <span className="ml-2 align-middle"><Tooltip label="Minimum tokens the model must be able to generate for one response. Example: 2048 for long summaries." /></span>
            </label>
            <input type="number" placeholder="e.g. 2048" value={prefs.required_output_tokens ?? ''}
              onChange={(e) => setPrefs(prev => ({ ...prev, required_output_tokens: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-4">
          {[
            { key: 'requires_json_mode', label: 'Requires JSON mode', tip: 'Select if the model must return strict JSON (e.g., for structured extraction).' },
            { key: 'requires_function_calling', label: 'Requires function calling', tip: 'Select if you need tools/functions with schema arguments.' },
            { key: 'requires_streaming', label: 'Requires streaming', tip: 'Select for real-time tokens (typing effect) or low-latency UX.' },
            { key: 'requires_vision', label: 'Requires vision/multimodal', tip: 'Select if inputs include images and the model must support multimodal.' },
          ].map(item => (
            <label key={item.key} className="inline-flex items-center gap-2 text-gray-300">
              <input type="checkbox" checked={Boolean((prefs as any)[item.key])}
                onChange={(e) => setPrefs(prev => ({ ...prev, [item.key]: e.target.checked } as any))} />
              {item.label}
              <Tooltip label={item.tip} />
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={() => previewMutation.mutate()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">
            {previewMutation.isPending ? 'Previewing…' : 'Preview Ranking'}
          </button>
          <div className="flex items-center gap-2">
            <input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Route name (e.g., Default, Developers)" className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
            <select value={selectedPoolId} onChange={(e) => setSelectedPoolId(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white">
              {pools?.map(p => (<option key={p.pool_id} value={p.pool_id}>{p.pool_id}</option>))}
            </select>
            <button onClick={() => createProfileMutation.mutate()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md" disabled={createProfileMutation.isPending}>
              {createProfileMutation.isPending ? 'Saving…' : 'Save as Route'}
            </button>
          </div>
          {preview && (
            <span className="text-xs text-gray-400">Top candidate: {preview.candidates[0]?.target.provider} / {preview.candidates[0]?.target.endpoint}</span>
          )}
        </div>
      </section>

      {/* Saved profiles */}
      <section className="bg-gray-800 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-2">Saved Routes</h2>
        <div className="space-y-2">
          {(profiles || []).map(p => (
            <div key={p.id} className="rounded border border-gray-700 bg-gray-900/60 p-3 flex items-center justify-between">
              <div className="text-sm text-white">{p.name}</div>
              <div className="text-xs text-gray-400">Pool: {p.pool_id || 'any'} • {Object.keys(p.preferences || {}).length} prefs</div>
            </div>
          ))}
          {!(profiles||[]).length && <div className="text-sm text-gray-400">No routes saved yet.</div>}
        </div>
      </section>

      {/* Removed Pool Targets listing to reduce overlap with Models */}

      {preview && (
        <section className="bg-gray-800 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium text-white mb-4">Preview Ranking</h2>
          <div className="space-y-2">
            {preview.candidates.map((c, i) => (
              <div key={`${c.target.id}-${i}`} className={`p-3 rounded border ${c.selected ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-white/5'}`}>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-white">{c.target.provider} / {c.target.endpoint}</div>
                  <div className="text-gray-300">score {c.score.toFixed(1)} {c.selected && <span className="ml-2 text-emerald-300">(selected)</span>}</div>
                </div>
                <div className="mt-1 text-xs text-gray-400">{c.reasons.join(' • ')}</div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="text-white font-medium mb-2">Supported Targets (meet hard constraints)</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {preview.candidates
                .filter(c => meetsConstraints(c.target.profile, prefs))
                .map(c => (
                  <span key={c.target.id} className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                    {c.target.provider} / {c.target.endpoint}
                  </span>
                ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
// Helper to list supported targets meeting hard constraints
function meetsConstraints(profile: ModelProfile | undefined, prefs: RoutingPreference): boolean {
  if (!profile) return false;
  // Residency hard requirement
  if (prefs.required_data_residency) {
    const residency = profile.compliance?.data_residency || 'unknown';
    const deployment = (profile.tags as any)?.deployment as string | undefined;
    if (prefs.required_data_residency === 'AU_LOCAL') {
      if (!(residency === 'AU' && (deployment === 'local' || deployment === 'onsite' || deployment === 'onprem'))) return false;
    } else if (residency !== prefs.required_data_residency) {
      return false;
    }
  }
  if (prefs.required_context_window_tokens && (profile.limits?.context_window_tokens ?? 0) < prefs.required_context_window_tokens) return false;
  if (prefs.required_output_tokens && (profile.limits?.max_output_tokens ?? 0) < prefs.required_output_tokens) return false;
  const hasCap = (name: string) => !!(profile.capabilities?.some(c => String(c).toLowerCase().includes(name)) || (profile.tags && (profile.tags as any)[name] === true));
  if (prefs.requires_json_mode && !hasCap('json')) return false;
  if (prefs.requires_function_calling && !hasCap('function')) return false;
  if (prefs.requires_streaming && !hasCap('stream')) return false;
  if (prefs.requires_vision && !(hasCap('vision') || hasCap('multimodal'))) return false;
  if (typeof prefs.max_cost_per_1k_aud === 'number' && (Number(profile.cost?.per_1k_tokens ?? 0) > prefs.max_cost_per_1k_aud)) return false;
  if (typeof prefs.min_quality_score === 'number' && (profile.quality?.score ?? 0) < prefs.min_quality_score) return false;
  return true;
}

// Lightweight group manager UI
function GroupManager({ groups, profiles, onCreate, onAssign }: {
  groups: Array<{ id: string; name: string; route_profile_id?: string }>;
  profiles: RouteProfile[];
  onCreate: (name: string) => void;
  onAssign: (groupId: string, profileId: string) => void;
}) {
  const [name, setName] = React.useState('');
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g., Developers)" className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white" />
        <button onClick={() => { if (name.trim()) { onCreate(name.trim()); setName(''); } }} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">Add Group</button>
      </div>
      <div className="space-y-2">
        {groups.map(g => (
          <div key={g.id} className="rounded border border-gray-700 bg-gray-900/60 p-3 flex items-center justify-between">
            <div className="text-sm text-white">{g.name}</div>
            <select value={g.route_profile_id || ''} onChange={(e) => onAssign(g.id, e.target.value)} className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-sm text-white">
              <option value="">-- Assign route --</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        ))}
        {!groups.length && <div className="text-sm text-gray-400">No groups yet. Create one above.</div>}
      </div>
    </div>
  );
}
