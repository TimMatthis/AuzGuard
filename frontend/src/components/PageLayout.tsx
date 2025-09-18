import React, { ReactNode } from 'react';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  heroAdornment?: ReactNode;
}

export function PageLayout({ title, subtitle, actions, children, heroAdornment }: PageLayoutProps) {
  return (
    <div className="page-shell">
      <div className="page-shell__backdrop" />
      <div className="page-shell__orb page-shell__orb--one" />
      <div className="page-shell__orb page-shell__orb--two" />

      <div className="page-shell__inner">
        <header className="page-header">
          <div className="page-header__titles">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="page-header__actions">{actions}</div>}
          {heroAdornment && <div className="page-header__hero">{heroAdornment}</div>}
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}

interface PanelProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, description, actions, children, className }: PanelProps) {
  return (
    <section className={`panel ${className ?? ''}`}>
      {(title || actions) && (
        <header className="panel__header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className="panel__content">{children}</div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: 'default' | 'positive' | 'warning';
}

export function StatCard({ label, value, helper, tone = 'default' }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {helper && <span className="stat-card__helper">{helper}</span>}
    </div>
  );
}

interface GridProps {
  columns?: 1 | 2 | 3 | 4;
  children: ReactNode;
}

export function ResponsiveGrid({ columns = 3, children }: GridProps) {
  return <div className={`responsive-grid responsive-grid--${columns}`}>{children}</div>;
}
