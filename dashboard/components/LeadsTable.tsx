'use client';

import { useState, useMemo } from 'react';
import { Lead, SOURCE_ICONS, CATEGORY_COLORS } from '@/lib/types';

interface Props { leads: Lead[]; }

const ALL = 'All';
const SCORE_LABELS: Record<string, string> = {
  '5': '🔥 Ready', '4': '🔴 Hot', '3': '🟠 Interested', '2': '🟡 Warm', '1': '🔵 Cold',
};

export default function LeadsTable({ leads }: Props) {
  const [search, setSearch] = useState('');
  const [catFilter, setCat] = useState(ALL);
  const [srcFilter, setSrc] = useState(ALL);
  const [scoreFilter, setScore] = useState(ALL);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const cats = useMemo(() => [ALL, ...new Set(leads.map(l => l.category).filter(Boolean))], [leads]);
  const srcs = useMemo(() => [ALL, ...new Set(leads.map(l => l.source).filter(Boolean))], [leads]);

  const filtered = useMemo(() => leads.filter(l => {
    if (catFilter !== ALL && l.category !== catFilter) return false;
    if (srcFilter !== ALL && l.source !== srcFilter) return false;
    if (scoreFilter !== ALL && String(l.buyingIntentScore) !== scoreFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.company?.toLowerCase().includes(q) ||
        l.contactName?.toLowerCase().includes(q) ||
        l.link?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q) ||
        l.reasoning?.toLowerCase().includes(q)
      );
    }
    return true;
  }), [leads, catFilter, srcFilter, scoreFilter, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function FilterChip({ value, current, onSet, label }: { value: string; current: string; onSet: (v: string) => void; label?: string }) {
    const active = value === current;
    return (
      <button
        onClick={() => { onSet(value); setPage(1); }}
        style={{
          padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          border: active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.08)',
          background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
          color: active ? '#c4b5fd' : 'rgba(241,240,255,0.45)',
          transition: 'all 0.15s',
        }}
      >
        {label ?? value}
      </button>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, pointerEvents: 'none', color: 'rgba(241,240,255,0.3)' }}>🔍</span>
          <input
            className="input-field"
            style={{ paddingLeft: 36 }}
            placeholder="Search company, contact, URL, email, reasoning…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {/* Category */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(241,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>Category</span>
            {cats.map(c => <FilterChip key={c} value={c} current={catFilter} onSet={setCat} />)}
          </div>
          {/* Source */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(241,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>Source</span>
            {srcs.map(s => <FilterChip key={s} value={s} current={srcFilter} onSet={setSrc} label={s === ALL ? ALL : `${SOURCE_ICONS[s] ?? '📌'} ${s}`} />)}
          </div>
          {/* Score */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(241,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>Score</span>
            {[ALL,'5','4','3','2','1'].map(s => <FilterChip key={s} value={s} current={scoreFilter} onSet={setScore} label={s === ALL ? ALL : SCORE_LABELS[s]} />)}
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(241,240,255,0.3)' }}>
          {filtered.length} of {leads.length} leads · Page {page} of {totalPages || 1}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {['Date','Src','Company / Link','Budget','Category','Score','Email','Status','Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 16px', fontSize: 11, fontWeight: 600, color: 'rgba(241,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(241,240,255,0.25)', fontSize: 14 }}>
                  No leads match your filters
                </td></tr>
              )}
              {paginated.map((lead, i) => (
                <tr key={i} className="lead-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '11px 16px', fontSize: 11, color: 'rgba(241,240,255,0.4)', whiteSpace: 'nowrap' }}>{lead.date}</td>
                  <td style={{ padding: '11px 16px', fontSize: 18 }}>{SOURCE_ICONS[lead.source] ?? '📌'}</td>
                  <td style={{ padding: '11px 16px', maxWidth: 220 }}>
                    {lead.link ? (
                      <a href={lead.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#f1f0ff')}>
                        {lead.company || lead.contactName || (() => { try { return new URL(lead.link).hostname; } catch { return lead.link; } })()}
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff' }}>{lead.company || lead.contactName || '—'}</span>
                    )}
                    {lead.domain && <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.3)', marginTop: 1 }}>{lead.domain}</p>}
                    {lead.reasoning && (
                      <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={lead.reasoning}>
                        {lead.reasoning}
                      </p>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 12, fontWeight: 700, color: '#6ee7b7', whiteSpace: 'nowrap' }}>{lead.budget || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    {lead.category && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                        background: (CATEGORY_COLORS[lead.category] ?? '#6b7280') + '22',
                        color: CATEGORY_COLORS[lead.category] ?? '#6b7280',
                        border: `1px solid ${(CATEGORY_COLORS[lead.category] ?? '#6b7280')}44`,
                      }}>{lead.category}</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`score-badge score-${lead.buyingIntentScore}`}>{SCORE_LABELS[String(lead.buyingIntentScore)] ?? lead.buyingIntentScore}</span>
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} style={{ fontSize: 12, color: '#67e8f9', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                        {lead.email}
                      </a>
                    ) : <span style={{ fontSize: 12, color: 'rgba(241,240,255,0.2)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <span className={`pill pill-${(lead.status || 'new').toLowerCase()}`}>{lead.status || 'New'}</span>
                  </td>
                  <td style={{ padding: '11px 16px', maxWidth: 200 }}>
                    <span style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 180 }} title={lead.notes}>{lead.notes || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: page === p ? 'rgba(124,58,237,0.3)' : 'transparent',
                    color: page === p ? '#c4b5fd' : 'rgba(241,240,255,0.4)',
                    border: page === p ? '1px solid rgba(124,58,237,0.4)' : '1px solid transparent',
                  }}>
                  {p}
                </button>
              );
            })}
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
