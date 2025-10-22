import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../contexts/BrandingContext';

interface LayoutProps {
  children: React.ReactNode;
}

type NavItem = 
  | { type: 'section'; name: string }
  | { type: 'link'; name: string; href: string; icon: string };

const NAV_LINKS: NavItem[] = [
  { type: 'link', name: 'Dashboard', href: '/dashboard', icon: 'DB' },

  { type: 'section', name: 'Policies & Rules' },
  { type: 'link', name: 'Policies', href: '/policies', icon: 'POL' },
  { type: 'link', name: 'Simulator', href: '/simulator', icon: 'SIM' },
  { type: 'link', name: 'Audit Log', href: '/audit', icon: 'AUD' },

  { type: 'section', name: 'Routing' },
  { type: 'link', name: 'Routing Config', href: '/routing-config', icon: 'CFG' },
  { type: 'link', name: 'Model Gardens', href: '/models', icon: 'MDL' },

  { type: 'section', name: 'Decision Tree' },
  { type: 'link', name: 'Decision Tree', href: '/decisions', icon: 'FLOW' },

  { type: 'section', name: 'Chat Interface' },
  { type: 'link', name: 'Chat Router', href: '/chat', icon: 'CHAT' },
  { type: 'link', name: 'Chat User Interface', href: '/chat-ui', icon: 'UI' },

  { type: 'section', name: 'User Settings' },
  { type: 'link', name: 'User Groups', href: '/user-groups', icon: 'USR' },
  { type: 'link', name: 'Settings', href: '/settings', icon: 'CFG' }
];

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { brandName, logoUrl } = useBranding();

  const isActive = (href: string) => location.pathname === href;

  const links = React.useMemo<NavItem[]>(() => {
    if (user?.role === 'chat') {
      return [
        { type: 'section', name: 'Chat Interface' },
        { type: 'link', name: 'Chat User Interface', href: '/chat-ui', icon: 'UI' },
      ];
    }
    // Insert Product Access Groups under user settings
    const base = [...NAV_LINKS];
    const insertIdx = base.findIndex(x => x.type === 'link' && x.name === 'User Groups');
    if (insertIdx !== -1) {
      base.splice(insertIdx + 2, 0, { type: 'link', name: 'Product Access Groups', href: '/product-access-groups', icon: 'PAG' });
    }
    return base;
  }, [user?.role]);

  return (
    <div className="app-shell">
      <div className="app-shell__background" />
      <div className="app-shell__inner">
        <aside className="app-sidebar">
          <div className="app-sidebar__brand">
            <Link to={user?.role === 'chat' ? '/chat-ui' : '/dashboard'}>
              {logoUrl ? (
                <img src={logoUrl} alt={`${brandName} logo`} style={{ maxHeight: 28, marginBottom: 6 }} />
              ) : null}
              <span>{brandName}</span>
              <small>Sovereign AI Gateway</small>
            </Link>
          </div>

          <nav className="app-nav">
            {links.map((item, idx) => (
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
