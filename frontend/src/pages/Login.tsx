import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { useBranding } from '../contexts/BrandingContext';
import { ThemeToggleCompact } from '../components/ThemeToggle';

type TabType = 'login' | 'register' | 'demo';

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
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const { login, register, loginMock } = useAuth();
  const navigate = useNavigate();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register/Company signup form state
  const [companySlug, setCompanySlug] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAdminEmail, setCompanyAdminEmail] = useState('');
  const [companyAdminName, setCompanyAdminName] = useState('');
  const [companyAdminPassword, setCompanyAdminPassword] = useState('');
  const [companyConfirmPassword, setCompanyConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // Demo form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('viewer');
  const [demoOrgId, setDemoOrgId] = useState(() => localStorage.getItem('auzguard_org_id') || '');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate('/dashboard');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError('');

    // Validate passwords match
    if (companyAdminPassword !== companyConfirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (companyAdminPassword.length < 8) {
      setRegisterError('Password must be at least 8 characters');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(companySlug)) {
      setRegisterError('Company ID must contain only lowercase letters, numbers, and hyphens');
      return;
    }

    setRegisterLoading(true);

    try {
      const { apiClient } = await import('../api/client');
      const response = await apiClient.registerCompany({
        slug: companySlug,
        company_name: companyName,
        admin_email: companyAdminEmail,
        admin_name: companyAdminName,
        admin_password: companyAdminPassword
      });

      // Store token and navigate
      localStorage.setItem('auzguard_token', response.token);
      apiClient.setToken(response.token);
      navigate('/dashboard');
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Company registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDemoLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setOrgId?.(demoOrgId || undefined);
    await loginMock(selectedRole, demoOrgId || undefined);
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
              Sign in to your account, create a new account, or explore with a demo role.
            </p>

            {activeTab === 'demo' && (
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
            )}
          </section>

          <section className="glass-card p-8 space-y-6">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-800/50 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'login' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'register' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('demo')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'demo' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Demo
              </button>
            </div>

            {/* Login Form */}
            {activeTab === 'login' && (
              <>
                <header className="space-y-2">
                  <h2 className="text-2xl font-semibold">Sign in</h2>
                  <p className="text-sm text-gray-400">
                    Enter your credentials to access your account.
                  </p>
                </header>

                <form className="space-y-5" onSubmit={handleLogin}>
                  {loginError && (
                    <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="loginEmail" className="text-sm font-medium text-gray-300">
                      Email
                    </label>
                    <input
                      id="loginEmail"
                      name="email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="form-input"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="loginPassword" className="text-sm font-medium text-gray-300">
                      Password
                    </label>
                    <input
                      id="loginPassword"
                      name="password"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="form-input"
                      autoComplete="current-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="cta-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? 'Signing in...' : 'Sign in'}
                  </button>
                </form>
              </>
            )}

            {/* Register Form (Company Signup) */}
            {activeTab === 'register' && (
              <>
                <header className="space-y-2">
                  <h2 className="text-2xl font-semibold">Create Your Company</h2>
                  <p className="text-sm text-gray-400">
                    Set up a new company with its own isolated database and admin account.
                  </p>
                </header>

                <form className="space-y-5" onSubmit={handleRegister}>
                  {registerError && (
                    <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                      {registerError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="companySlug" className="text-sm font-medium text-gray-300">
                      Company ID <span className="text-slate-400 font-normal">(unique identifier)</span>
                    </label>
                    <input
                      id="companySlug"
                      name="slug"
                      type="text"
                      required
                      value={companySlug}
                      onChange={(e) => setCompanySlug(e.target.value.toLowerCase())}
                      placeholder="acme-corp"
                      className="form-input"
                      pattern="[a-z0-9-]+"
                    />
                    <p className="text-xs text-gray-500">Lowercase letters, numbers, and hyphens only</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium text-gray-300">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corporation"
                      className="form-input"
                    />
                  </div>

                  <div className="border-t border-gray-700 pt-4">
                    <h3 className="text-sm font-medium text-gray-300 mb-3">Admin Account</h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="companyAdminName" className="text-sm font-medium text-gray-300">
                          Admin Name <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <input
                          id="companyAdminName"
                          name="adminName"
                          type="text"
                          value={companyAdminName}
                          onChange={(e) => setCompanyAdminName(e.target.value)}
                          placeholder="John Doe"
                          className="form-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="companyAdminEmail" className="text-sm font-medium text-gray-300">
                          Admin Email
                        </label>
                        <input
                          id="companyAdminEmail"
                          name="adminEmail"
                          type="email"
                          required
                          value={companyAdminEmail}
                          onChange={(e) => setCompanyAdminEmail(e.target.value)}
                          placeholder="admin@acme.com"
                          className="form-input"
                          autoComplete="email"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="companyAdminPassword" className="text-sm font-medium text-gray-300">
                          Admin Password
                        </label>
                        <input
                          id="companyAdminPassword"
                          name="adminPassword"
                          type="password"
                          required
                          value={companyAdminPassword}
                          onChange={(e) => setCompanyAdminPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="form-input"
                          autoComplete="new-password"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="companyConfirmPassword" className="text-sm font-medium text-gray-300">
                          Confirm Password
                        </label>
                        <input
                          id="companyConfirmPassword"
                          name="confirmPassword"
                          type="password"
                          required
                          value={companyConfirmPassword}
                          onChange={(e) => setCompanyConfirmPassword(e.target.value)}
                          placeholder="Confirm admin password"
                          className="form-input"
                          autoComplete="new-password"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="cta-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? 'Creating company...' : 'Create Company & Admin Account'}
                  </button>
                </form>

                <p className="text-xs text-gray-400 text-center">
                  Creates an isolated database for your company with complete data separation.
                </p>
              </>
            )}

            {/* Demo Form */}
            {activeTab === 'demo' && (
              <>
                <header className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 tracking-wide">
                    Demo environment
                  </span>
                  <h2 className="text-2xl font-semibold">Demo mode</h2>
                  <p className="text-sm text-gray-400">
                    Choose a role, optionally add an organisation ID, then enter the console.
                  </p>
                </header>

                <form className="space-y-5" onSubmit={handleDemoLogin}>
                  <div className="space-y-2">
                    <label htmlFor="role" className="text-sm font-medium text-gray-300">
                      Selected role
                    </label>
                    <div className="input-like">{ROLES.find(r => r.value === selectedRole)?.label}</div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="demoOrgId" className="text-sm font-medium text-gray-300">
                      Organisation ID <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="demoOrgId"
                      name="orgId"
                      type="text"
                      value={demoOrgId}
                      onChange={(e) => setDemoOrgId(e.target.value)}
                      placeholder="e.g. bank-anz or fintech-42"
                      className="form-input"
                    />
                    <div className="flex gap-2 mt-1">
                      <button type="button" onClick={() => setOrgId?.(demoOrgId || undefined)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Apply Brand</button>
                      <button type="button" onClick={() => { setDemoOrgId(''); setOrgId?.(undefined); }} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Clear</button>
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
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
