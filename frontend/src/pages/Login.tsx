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
  const [companyName, setCompanyName] = useState('');
  const [companyAdminEmail, setCompanyAdminEmail] = useState('');
  const [companyAdminName, setCompanyAdminName] = useState('');
  const [companyAdminPassword, setCompanyAdminPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerStep, setRegisterStep] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

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
    } catch (error: any) {
      // Check for email verification error
      if (error?.code === 'EMAIL_NOT_VERIFIED' || error?.message?.includes('verify your email')) {
        setLoginError('⚠️ Please verify your email address before logging in. Check your inbox for the verification link.');
      } else {
        setLoginError(error instanceof Error ? error.message : 'Login failed');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterError('');

    // Validate email
    if (!companyAdminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyAdminEmail)) {
      setRegisterError('Please enter a valid email address');
      return;
    }

    // Validate password strength
    if (companyAdminPassword.length < 8) {
      setRegisterError('Password must be at least 8 characters');
      return;
    }

    // Validate company name
    if (!companyName || companyName.trim().length < 2) {
      setRegisterError('Company name must be at least 2 characters');
      return;
    }

    // Auto-generate slug from company name
    const companySlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

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

      // Check if email verification is required
      if (response.email_verification_required) {
        setRegisterSuccess(response.message || 'Company created! Please check your email to verify your account.');
        setRegisterStep('verification-sent');
        // Store verification URL if provided (development mode)
        if (response.verification_url) {
          setVerificationUrl(response.verification_url);
        }
        // DON'T store token or navigate yet - user must verify email first
      } else {
        // Fallback for older flow (shouldn't happen with current backend)
        localStorage.setItem('auzguard_token', response.token);
        apiClient.setToken(response.token);
        navigate('/dashboard');
      }
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
                    <div className="relative">
                      <input
                        id="loginPassword"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="form-input pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
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
                {registerStep === 'verification-sent' ? (
                  // Success message after registration
                  <div className="space-y-6 text-center">
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center">
                      <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                      </svg>
                    </div>
                    <header className="space-y-3">
                      <h2 className="text-2xl font-semibold text-green-400">✅ Check Your Email!</h2>
                      <p className="text-gray-300">
                        {registerSuccess}
                      </p>
                    </header>
                    <div className="px-4 py-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-left space-y-2">
                      <p className="text-sm text-blue-300">
                        <strong>📧 Email sent to:</strong> {companyAdminEmail}
                      </p>
                      <p className="text-sm text-gray-400">
                        Please click the verification link in your email to activate your account.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        ⏰ The verification link will expire in 24 hours.
                      </p>
                    </div>
                    
                    {verificationUrl && (
                      <div className="px-4 py-4 rounded-lg bg-green-500/10 border border-green-500/30 text-left space-y-2">
                        <p className="text-sm text-green-300 font-semibold">
                          🔗 Development Mode - Verification Link:
                        </p>
                        <a 
                          href={verificationUrl}
                          className="text-xs text-blue-400 hover:text-blue-300 break-all block underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {verificationUrl}
                        </a>
                        <p className="text-xs text-gray-400 mt-2">
                          Click the link above to verify your email instantly (for testing)
                        </p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">
                        Didn't receive the email? Check your spam folder.
                      </p>
                      <button
                        onClick={() => {
                          setRegisterStep('');
                          setRegisterSuccess('');
                          setCompanyName('');
                          setCompanyAdminEmail('');
                          setCompanyAdminName('');
                          setCompanyAdminPassword('');
                        }}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        ← Try again with a different email
                      </button>
                    </div>
                  </div>
                ) : (
                  // Registration form
                  <>
                    <header className="space-y-2">
                      <h2 className="text-2xl font-semibold">Create Your Account</h2>
                      <p className="text-sm text-gray-400">
                        Get started with just a few details. We'll set up everything for you.
                      </p>
                    </header>

                    <form className="space-y-5" onSubmit={handleRegister}>
                      {registerError && (
                        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                          {registerError}
                        </div>
                      )}

                  <div className="space-y-2">
                    <label htmlFor="companyName" className="text-sm font-medium text-gray-300">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      minLength={2}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corporation"
                      className="form-input"
                    />
                    <p className="text-xs text-gray-500">Your organization or company name</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyAdminName" className="text-sm font-medium text-gray-300">
                      Your Name <span className="text-gray-500">(optional)</span>
                    </label>
                    <input
                      id="companyAdminName"
                      name="adminName"
                      type="text"
                      value={companyAdminName}
                      onChange={(e) => setCompanyAdminName(e.target.value)}
                      placeholder="John Doe"
                      className="form-input"
                      autoComplete="name"
                    />
                    <p className="text-xs text-gray-500">We'll use this to personalize your experience</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyAdminEmail" className="text-sm font-medium text-gray-300">
                      Email Address
                    </label>
                    <input
                      id="companyAdminEmail"
                      name="adminEmail"
                      type="email"
                      required
                      value={companyAdminEmail}
                      onChange={(e) => setCompanyAdminEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="form-input"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="companyAdminPassword" className="text-sm font-medium text-gray-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="companyAdminPassword"
                        name="adminPassword"
                        type={showRegisterPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={companyAdminPassword}
                        onChange={(e) => setCompanyAdminPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="form-input pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                        aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegisterPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
                  </div>

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="cta-button w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registerLoading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>

                    <p className="text-xs text-gray-400 text-center">
                      By signing up, you agree to our Terms of Service and Privacy Policy.
                    </p>
                  </>
                )}
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
