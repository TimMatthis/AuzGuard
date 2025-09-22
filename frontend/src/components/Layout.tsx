import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_LINKS = [
  { name: 'Dashboard', href: '/dashboard', icon: 'DB' },
  { name: 'Policies', href: '/policies', icon: 'POL' },
  { name: 'Models', href: '/models', icon: 'MDL' },
  { name: 'Simulator', href: '/simulator', icon: 'SIM' },
  { name: 'Chat Router', href: '/chat', icon: 'CHAT' },
  { name: 'Chat User Interface', href: '/chat-ui', icon: 'UI' },
  { name: 'Audit Log', href: '/audit', icon: 'AUD' },
  { name: 'Routes', href: '/routes', icon: 'RTS' },
  { name: 'Settings', href: '/settings', icon: 'CFG' }
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
            {NAV_LINKS.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`app-nav__link ${isActive(item.href) ? 'app-nav__link--active' : ''}`}
              >
                <span className="app-nav__icon" aria-hidden>{item.icon}</span>
                <span>{item.name}</span>
              </Link>
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
