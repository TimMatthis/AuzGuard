import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { ModelPool, RouteTarget, RoutingDecision, RoutingPreference, ModelProfile, RouteProfile } from '../types';
import { Tooltip } from '../components/Tooltip';

// Reusable stepper input for numeric advanced parameters
function StepperInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  placeholder,
  inputProps = {},
  'aria-label': ariaLabel
}: {
  value: number | undefined;
  onChange: (next: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  'aria-label'?: string;
}) {
  const dec = () => {
    const base = typeof value === 'number' ? value : (typeof min === 'number' ? min : 0);
    let next = Number((base - step).toFixed(6));
    if (typeof min === 'number' && next < min) next = min;
    onChange(next);
  };
  const inc = () => {
    const base = typeof value === 'number' ? value : (typeof min === 'number' ? min : 0);
    let next = Number((base + step).toFixed(6));
    if (typeof max === 'number' && next > max) next = max;
    onChange(next);
  };

  const buttonBase = 'px-3 py-2 text-sm border select-none focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const off = 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600';

  return (
    <div className="flex items-stretch">
      <button type="button" aria-label={`decrease ${ariaLabel || ''}`.trim()} className={`${buttonBase} ${off} rounded-l-md`} onClick={dec}>
        −
      </button>
      <input
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="w-full text-center px-3 py-2 bg-gray-900 border-t border-b border-gray-700 text-white focus:outline-none"
        aria-label={ariaLabel}
        {...inputProps}
      />
      <button type="button" aria-label={`increase ${ariaLabel || ''}`.trim()} className={`${buttonBase} ${off} -ml-px rounded-r-md`} onClick={inc}>
        +
      </button>
    </div>
  );
}

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
      } else {
        if (next.required_data_residency === 'AU') {
          next.required_data_residency = undefined;
        }
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
        <header className="mb-4 flex items-center gap-2">
          <h2 className="text-lg font-medium text-white">Basic Options</h2>
          <Tooltip label="Choose one priority: Speed, Cost, or Performance. Onshore is an independent toggle." />
        </header>

        {(() => {
          const priority = basic?.optimize_speed
            ? 'speed'
            : basic?.optimize_cost
            ? 'cost'
            : basic?.optimize_performance
            ? 'performance'
            : null;

          const setPriority = (p: 'speed' | 'cost' | 'performance') => {
            setBasic(prev => {
              const next: any = { ...(prev || {}) };
              const currently = priority;
              if (currently === p) {
                // toggle off -> none selected
                next.optimize_speed = false;
                next.optimize_cost = false;
                next.optimize_performance = false;
              } else {
                next.optimize_speed = p === 'speed';
                next.optimize_cost = p === 'cost';
                next.optimize_performance = p === 'performance';
              }
              return next;
            });
          };

          const baseBtn = 'px-3 py-2 text-sm border select-none focus:outline-none focus:ring-2 focus:ring-emerald-500';
          const off = 'bg-gray-900/60 border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600';
          const on = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200';

          return (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-400 mb-2">Priority (single-select)</div>
                <div role="group" aria-label="Priority" className="inline-flex rounded-md overflow-hidden">
                  <button
                    type="button"
                    aria-pressed={priority === 'speed'}
                    onClick={() => setPriority('speed')}
                    className={`${baseBtn} ${priority === 'speed' ? on : off} rounded-l-md`}
                  >
                    Speed
                  </button>
                  <button
                    type="button"
                    aria-pressed={priority === 'cost'}
                    onClick={() => setPriority('cost')}
                    className={`${baseBtn} ${priority === 'cost' ? on : off} -ml-px`}
                  >
                    Cost
                  </button>
                  <button
                    type="button"
                    aria-pressed={priority === 'performance'}
                    onClick={() => setPriority('performance')}
                    className={`${baseBtn} ${priority === 'performance' ? on : off} -ml-px rounded-r-md`}
                  >
                    Performance
                  </button>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Constraint</div>
                <button
                  type="button"
                  aria-pressed={!!basic?.keep_onshore}
                  onClick={() => setBasic(prev => ({ ...(prev||{}), keep_onshore: !prev?.keep_onshore }))}
                  className={`${baseBtn} ${basic?.keep_onshore ? on : off} rounded-md`}
                >
                  Keep all data onshore
                </button>
              </div>
            </div>
          );
        })()}
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
            <StepperInput
              aria-label="latency budget"
              value={prefs.latency_budget_ms}
              onChange={(next) => setPrefs(prev => ({ ...prev, latency_budget_ms: next }))}
              step={50}
              min={50}
              placeholder="e.g. 400"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Max Cost per 1k tokens (AUD)
              <span className="ml-2 align-middle"><Tooltip label="Upper bound for price. Example: 0.015 AUD/1k tokens. More expensive targets are penalized or disqualified." /></span>
            </label>
            <StepperInput
              aria-label="max cost per 1k tokens"
              value={prefs.max_cost_per_1k_aud}
              onChange={(next) => setPrefs(prev => ({ ...prev, max_cost_per_1k_aud: next }))}
              step={0.001}
              min={0}
              placeholder="e.g. 0.015"
              inputProps={{ step: 0.001 }}
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Min Quality Score
              <span className="ml-2 align-middle"><Tooltip label="Minimum acceptable quality score (0–10). Scores can come from internal evals. Example: 7.5 for high‑risk tasks." /></span>
            </label>
            <StepperInput
              aria-label="minimum quality score"
              value={prefs.min_quality_score}
              onChange={(next) => setPrefs(prev => ({ ...prev, min_quality_score: next }))}
              step={0.1}
              min={0}
              max={10}
              placeholder="e.g. 7.5"
              inputProps={{ step: 0.1 }}
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-1">
              Required Output Tokens
              <span className="ml-2 align-middle"><Tooltip label="Minimum tokens the model must be able to generate for one response. Example: 2048 for long summaries." /></span>
            </label>
            <StepperInput
              aria-label="required output tokens"
              value={prefs.required_output_tokens}
              onChange={(next) => setPrefs(prev => ({ ...prev, required_output_tokens: next }))}
              step={256}
              min={0}
              placeholder="e.g. 2048"
            />
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
