import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useBranding } from '../contexts/BrandingContext';
import { ThemeToggleCompact } from '../components/ThemeToggle';

const ROLES: { value: UserRole; label: string; blurb: string }[] = [
  {
    value: 'chat',
    label: 'Chat User',
    blurb: 'Access only the Chat User Interface for conversations.'
  },
  {
    value: 'viewer',
    label: 'Viewer',
    blurb: 'Observe policies, routes, and audit trails without making changes.'
  },
  {
    value: 'developer',
    label: 'Developer',
    blurb: 'Dry-run new routes, adjust rules, and test gating behaviour.'
  },
  {
    value: 'compliance',
    label: 'Compliance Officer',
    blurb: 'Publish authoritative policies, approve overrides, review evidence.'
  },
  {
    value: 'admin',
    label: 'Administrator',
    blurb: 'Manage model pools, residency requirements, spend guardrails.'
  }
];

export function Login() {
  const { brandName, poweredBySuffix, setOrgId } = useBranding();
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');
  const [orgId, setOrg] = useState(() => localStorage.getItem('auzguard_org_id') || '');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setOrgId?.(orgId || undefined);
    await login(selectedRole, orgId || undefined);
    if (selectedRole === 'chat') {
      navigate('/chat-ui');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="hero-backdrop" />
      <div className="hero-orb hero-orb--login" />
      
      {/* Theme toggle in top-right corner */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggleCompact />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_420px] items-center">
          <section className="space-y-8">
            <h1 className="text-4xl font-semibold leading-tight">
              Welcome to {brandName} — your sovereign AI command centre.
            </h1>
            {brandName !== 'AuzGuard' && (
              <div className="text-sm text-gray-400">{poweredBySuffix || 'powered by AuzGuard'}</div>
            )}
            <p className="text-lg text-gray-300 max-w-xl">
              Pick a role to explore. We'll mint a scoped session with pre-baked permissions so you can experience the gateway from that perspective.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {ROLES.map(role => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelectedRole(role.value)}
                  className={`role-card ${selectedRole === role.value ? 'role-card--active' : ''}`}
                >
                  <div className="role-card__title">{role.label}</div>
                  <div className="role-card__blurb">{role.blurb}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="glass-card p-8 space-y-6">
            <header className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 tracking-wide">
                Demo environment
              </span>
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="text-sm text-gray-400">
                Choose a role, optionally add an organisation ID, then enter the console.
              </p>
            </header>

            <form className="space-y-5" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium text-gray-300">
                  Selected role
                </label>
                <div className="input-like">{ROLES.find(r => r.value === selectedRole)?.label}</div>
              </div>

              <div className="space-y-2">
                <label htmlFor="orgId" className="text-sm font-medium text-gray-300">
                  Organisation ID <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="orgId"
                  name="orgId"
                  type="text"
                  value={orgId}
                  onChange={(event) => setOrg(event.target.value)}
                  placeholder="e.g. bank-anz or fintech-42"
                  className="form-input"
                />
                <div className="flex gap-2 mt-1">
                  <button type="button" onClick={() => setOrgId?.(orgId || undefined)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Apply Brand</button>
                  <button type="button" onClick={() => { setOrg(''); setOrgId?.(undefined); }} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Clear</button>
                </div>
              </div>

              <button
                type="submit"
                className="cta-button w-full"
              >
                Enter console
              </button>
            </form>

            <p className="text-xs text-gray-400 text-center">
              No passwords required. This preview mints demo tokens for the role you select.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
