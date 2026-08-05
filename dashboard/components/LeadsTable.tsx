'use client';

import { useState, useMemo } from 'react';
import { Lead, SOURCE_ICONS, CATEGORY_COLORS } from '@/lib/types';
import { ScoreBadge, CategoryBadge, StatusBadge } from '@/components/Badges';

interface Props { leads: Lead[]; }

const ALL = 'All';

export default function LeadsTable({ leads }: Props) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(ALL);
  const [srcFilter, setSrcFilter] = useState(ALL);
  const [scoreFilter, setScoreFilter] = useState(ALL);

  const categories = useMemo(() => [ALL, ...new Set(leads.map(l => l.category).filter(Boolean))], [leads]);
  const sources    = useMemo(() => [ALL, ...new Set(leads.map(l => l.source).filter(Boolean))], [leads]);

  const filtered = useMemo(() => leads.filter(l => {
    if (catFilter !== ALL && l.category !== catFilter) return false;
    if (srcFilter !== ALL && l.source !== srcFilter) return false;
    if (scoreFilter !== ALL && String(l.buyingIntentScore) !== scoreFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !l.company?.toLowerCase().includes(q) &&
        !l.contactName?.toLowerCase().includes(q) &&
        !l.link?.toLowerCase().includes(q) &&
        !l.category?.toLowerCase().includes(q) &&
        !l.reasoning?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  }), [leads, catFilter, srcFilter, scoreFilter, search]);

  const FilterBtn = ({ value, current, set, label }: { value: string; current: string; set: (v: string) => void; label?: string }) => (
    <button
      onClick={() => set(value)}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        current === value
          ? 'bg-violet-600/30 text-violet-300 border border-violet-500/40'
          : 'text-white/40 hover:text-white/70 border border-transparent hover:border-white/10'
      }`}
    >
      {label ?? value}
    </button>
  );

  return (
    <div className="glass overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-white/[0.06] space-y-3">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search company, contact, URL, reasoning…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-white/30 self-center mr-1">Category:</span>
            {categories.map(c => <FilterBtn key={c} value={c} current={catFilter} set={setCatFilter} />)}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-white/30 self-center mr-1">Source:</span>
            {sources.map(s => <FilterBtn key={s} value={s} current={srcFilter} set={setSrcFilter} label={s === ALL ? ALL : `${SOURCE_ICONS[s] ?? ''} ${s}`} />)}
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-white/30 self-center mr-1">Score:</span>
            {[ALL,'5','4','3','2','1'].map(s => <FilterBtn key={s} value={s} current={scoreFilter} set={setScoreFilter} />)}
          </div>
        </div>

        <p className="text-xs text-white/30">{filtered.length} of {leads.length} leads</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Date','Source','Company / Contact','Budget','Category','Score','Email','Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-white/40 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-white/30 text-sm">No leads match your filters.</td></tr>
            )}
            {filtered.map((lead, i) => (
              <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3 text-white/50 whitespace-nowrap text-xs">{lead.date}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5 text-white/60 text-xs">
                    <span>{SOURCE_ICONS[lead.source] ?? '📌'}</span>
                    <span className="capitalize">{lead.source}</span>
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[220px]">
                  <div>
                    {lead.link ? (
                      <a href={lead.link} target="_blank" rel="noopener noreferrer"
                        className="font-medium text-white truncate block hover:text-violet-300 transition-colors max-w-[200px]"
                        title={lead.link}
                      >
                        {lead.company || lead.contactName || new URL(lead.link).hostname}
                      </a>
                    ) : (
                      <span className="font-medium text-white">{lead.company || lead.contactName || '—'}</span>
                    )}
                    {lead.domain && <p className="text-xs text-white/30 mt-0.5">{lead.domain}</p>}
                  </div>
                </td>
                <td className="px-4 py-3 text-emerald-400 font-medium text-xs whitespace-nowrap">{lead.budget || '—'}</td>
                <td className="px-4 py-3"><CategoryBadge category={lead.category} /></td>
                <td className="px-4 py-3"><ScoreBadge score={lead.buyingIntentScore} /></td>
                <td className="px-4 py-3">
                  {lead.email ? (
                    <a href={`mailto:${lead.email}`} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">{lead.email}</a>
                  ) : <span className="text-xs text-white/20">—</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
