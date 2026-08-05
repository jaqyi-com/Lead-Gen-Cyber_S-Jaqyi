'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/',       label: 'Overview',   icon: '📊' },
  { href: '/leads',  label: 'All Leads',  icon: '🎯' },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-[#0d0d15] border-r border-white/[0.06] flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-sm font-bold">J</div>
          <div>
            <p className="font-bold text-white text-sm tracking-wide">JAQYI</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Lead Pipeline</p>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="px-6 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot"></span>
          <span className="text-xs text-white/40">Pipeline active</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {nav.map((item) => {
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Sources legend */}
      <div className="p-4 border-t border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3 px-1">Sources</p>
        {[
          ['💼', 'Freelancer'],
          ['🔺', 'Upwork'],
          ['🤖', 'Reddit'],
          ['𝕏', 'Twitter/X'],
          ['🔗', 'LinkedIn'],
        ].map(([icon, label]) => (
          <div key={label} className="flex items-center gap-2 px-1 py-1">
            <span className="text-xs">{icon}</span>
            <span className="text-xs text-white/40">{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
