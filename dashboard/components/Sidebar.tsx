'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from './ThemeProvider';

const NAV = [
  {
    href: '/',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/leads',
    label: 'All Leads',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Pipeline & Keywords',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
      </svg>
    ),
  },
  {
    href: '/test',
    label: 'API Health',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

const SOURCES = [
  { icon: '💼', label: 'Freelancer', color: '#7c3aed' },
  { icon: '🔺', label: 'Upwork',     color: '#06b6d4' },
  { icon: '🤖', label: 'Reddit',     color: '#f59e0b' },
  { icon: '𝕏',  label: 'Twitter/X', color: '#e2e8f0' },
  { icon: '🔗', label: 'LinkedIn',   color: '#10b981' },
];

export default function Sidebar() {
  const path = usePathname();
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, height: '100vh', width: '220px',
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--sidebar-border)',
      display: 'flex', flexDirection: 'column', zIndex: 50,
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: '#fff',
            boxShadow: '0 4px 16px rgba(124,58,237,0.4)',
          }}>J</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '0.02em' }}>JAQYI</div>
            <div style={{ fontSize: 10, color: 'var(--subtle)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lead Pipeline</div>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="pulse-live" style={{
            width: 7, height: 7, borderRadius: '50%', background: '#10b981',
          }}/>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Pipeline active · 9am daily</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, color: 'var(--subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px 6px' }}>Menu</div>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={`sidebar-link ${path === item.href ? 'active' : ''}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Sources legend */}
      <div style={{ padding: '12px 10px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--subtle)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 6px 8px' }}>Sources</div>
        {SOURCES.map(({ icon, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px' }}>
            <span style={{ fontSize: 12 }}>{icon}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
            <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: color, opacity: 0.7 }}/>
          </div>
        ))}
      </div>

      {/* Theme toggle + Footer */}
      <div style={{ padding: '10px 16px 16px', borderTop: '1px solid var(--border)' }}>
        {/* Toggle button */}
        <button
          onClick={toggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderRadius: 10,
            cursor: 'pointer',
            background: 'var(--ghost-bg)',
            border: '1px solid var(--ghost-border)',
            color: 'var(--muted)',
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 10,
            transition: 'all 0.2s',
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 14 }}>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          <div style={{
            marginLeft: 'auto',
            width: 30, height: 16, borderRadius: 999,
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(124,58,237,0.7)',
            position: 'relative', transition: 'background 0.2s',
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: isDark ? 2 : 16,
              transition: 'left 0.2s',
            }} />
          </div>
        </button>

        <div style={{ fontSize: 10, color: 'var(--subtle)', textAlign: 'center' }}>
          JAQYI © 2026 · jaqyi.com
        </div>
      </div>
    </aside>
  );
}


