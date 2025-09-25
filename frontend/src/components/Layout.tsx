import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

type NavItem = 
  | { type: 'section'; name: string }
  | { type: 'link'; name: string; href: string; icon: string };

const NAV_LINKS: NavItem[] = [
  { type: 'link', name: 'Dashboard', href: '/dashboard', icon: 'DB' },
  { type: 'section', name: 'Guardrails' },
  { type: 'link', name: 'Policies', href: '/policies', icon: 'POL' },
  { type: 'link', name: 'Simulator', href: '/simulator', icon: 'SIM' },
  { type: 'link', name: 'Audit Log', href: '/audit', icon: 'AUD' },
  { type: 'section', name: 'Visualize' },
  { type: 'link', name: 'Decision Trees', href: '/decisions', icon: 'FLOW' },
  { type: 'section', name: 'Routing' },
  { type: 'link', name: 'Routing Config', href: '/routing-config', icon: 'CFG' },
  { type: 'link', name: 'User Groups', href: '/user-groups', icon: 'USR' },
  { type: 'link', name: 'Routes', href: '/routes', icon: 'RTS' },
  { type: 'link', name: 'Models', href: '/models', icon: 'MDL' },
  { type: 'link', name: 'Chat Router', href: '/chat', icon: 'CHAT' },
  { type: 'link', name: 'Chat User Interface', href: '/chat-ui', icon: 'UI' },
  { type: 'section', name: 'System' },
  { type: 'link', name: 'Settings', href: '/settings', icon: 'CFG' }
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="app-shell">
      <div className="app-shell__background" />
      <div className="app-shell__inner">
        <aside className="app-sidebar">
          <div className="app-sidebar__brand">
            <Link to="/dashboard">
              <span>AuzGuard</span>
              <small>Sovereign AI Gateway</small>
            </Link>
          </div>

          <nav className="app-nav">
            {NAV_LINKS.map((item, idx) => (
              item.type === 'section' ? (
                <div key={`section-${item.name}-${idx}`} className="app-nav__section">
                  <span className="app-nav__section-label">{item.name}</span>
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`app-nav__link ${isActive(item.href) ? 'app-nav__link--active' : ''}`}
                >
                  <span className="app-nav__icon" aria-hidden>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            ))}
          </nav>
        </aside>

        <div className="app-main">
          <header className="app-navbar">
            <div className="app-navbar__user">
              <div className="app-navbar__avatar" aria-hidden>
                {user?.email?.slice(0, 2).toUpperCase() ?? 'AU'}
              </div>
              <div>
                <p>{user?.email ?? 'guest@auzguard.com'}</p>
                <small>{user?.role ?? 'viewer'} role</small>
              </div>
            </div>
            <button onClick={logout} className="app-navbar__logout">
              Logout
            </button>
          </header>

          <div className="app-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
