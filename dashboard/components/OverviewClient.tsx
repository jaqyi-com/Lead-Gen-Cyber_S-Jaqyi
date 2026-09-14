'use client';

import { Lead, CATEGORY_COLORS, SOURCE_ICONS } from '@/lib/types';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import Link from 'next/link';

interface Props {
  stats: { total: number; newToday: number; avgScore: number; topCategory: string };
  byCategory: { name: string; count: number; color: string }[];
  bySource: { name: string; count: number }[];
  byScore: { score: string; count: number }[];
  scoreOverTime: { date: string; count: number; avgScore: number }[];
  topLeads: Lead[];
}

const SCORE_LABELS: Record<string, string> = {
  '5': '🔥 Ready', '4': '🔴 Hot', '3': '🟠 Interested', '2': '🟡 Warm', '1': '🔵 Cold',
};
const SCORE_COLORS = ['#6b7280', '#3b82f6', '#eab308', '#f97316', '#ef4444'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#13131f', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 12, fontWeight: 600, color: p.color ?? '#fff' }}>
          {p.name === 'count' ? '● Leads' : '● Avg Score'}: {p.value}
        </p>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: string }) {
  const colorMap: Record<string, string> = {
    violet: 'stat-violet glow-violet', cyan: 'stat-cyan glow-cyan',
    green: 'stat-green glow-green', orange: 'stat-orange glow-orange',
  };
  const textColor: Record<string, string> = {
    violet: '#a78bfa', cyan: '#67e8f9', green: '#6ee7b7', orange: '#fcd34d',
  };
  return (
    <div className={`card ${colorMap[color]} fade-up`} style={{ padding: '20px 22px', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(241,240,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 18, opacity: 0.8 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: textColor[color], lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(241,240,255,0.35)' }}>{sub}</div>}
    </div>
  );
}

export default function OverviewClient({ stats, byCategory, bySource, byScore, scoreOverTime, topLeads }: Props) {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f0ff', letterSpacing: '-0.02em' }}>Lead Pipeline</h1>
          <p style={{ fontSize: 13, color: 'rgba(241,240,255,0.4)', marginTop: 4 }}>
            Real-time data · Freelancer · Upwork · Reddit · Twitter/X · LinkedIn
          </p>
        </div>
        <Link href="/leads" className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          View All Leads
        </Link>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <StatCard label="Total Leads" value={stats.total} sub="All time" color="violet" icon="🎯" />
        <StatCard label="New Today" value={stats.newToday} sub={new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'})} color="cyan" icon="⚡" />
        <StatCard label="Avg Intent Score" value={`${stats.avgScore}/5`} sub="Scored by Claude AI" color="orange" icon="🧠" />
        <StatCard label="Top Category" value={stats.topCategory === '—' ? '—' : stats.topCategory.split(' ')[0]} sub={`${stats.topCategory} · most leads`} color="green" icon="📊" />
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>

        {/* Area Chart */}
        <div className="card fade-up-1" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff' }}>📈 Leads Over Last 14 Days</p>
              <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', marginTop: 2 }}>Daily lead count + avg intent score</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'rgba(241,240,255,0.4)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#7c3aed', display: 'inline-block' }}/> Leads
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#06b6d4', display: 'inline-block' }}/> Score
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={scoreOverTime} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Area type="monotone" dataKey="count" name="count" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gCount)" dot={false} activeDot={{ r: 5, fill: '#7c3aed' }}/>
              <Area type="monotone" dataKey="avgScore" name="avgScore" stroke="#06b6d4" strokeWidth={2} fill="url(#gScore)" dot={false} activeDot={{ r: 5, fill: '#06b6d4' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Score Donut */}
        <div className="card fade-up-2" style={{ padding: '22px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff', marginBottom: 4 }}>🎯 Intent Distribution</p>
          <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', marginBottom: 20 }}>Score 1 (cold) → 5 (ready)</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={byScore.filter(s => s.count > 0)} dataKey="count" nameKey="score"
                cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={3} startAngle={90} endAngle={450}>
                {byScore.map((_, i) => <Cell key={i} fill={SCORE_COLORS[i]} fillOpacity={0.85}/>)}
              </Pie>
              <Tooltip formatter={(val, name) => [`${val} leads`, `Score ${name}`]}
                contentStyle={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)' }} itemStyle={{ color: '#f1f0ff' }}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {byScore.map((s, i) => (
              <div key={s.score} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: SCORE_COLORS[i] }}/>
                <span style={{ fontSize: 12, color: 'rgba(241,240,255,0.5)', flex: 1 }}>{SCORE_LABELS[s.score] ?? `Score ${s.score}`}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f0ff' }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category + Source row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Category Bar */}
        <div className="card fade-up-3" style={{ padding: '22px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff', marginBottom: 4 }}>🗂 Leads by Category</p>
          <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', marginBottom: 20 }}>JAQYI service verticals</p>
          {byCategory.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              No data yet — run pipeline first
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byCategory} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={130}/>
                <Tooltip contentStyle={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} itemStyle={{ color: '#f1f0ff' }} labelStyle={{ color: 'rgba(255,255,255,0.5)' }}/>
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {byCategory.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source Breakdown */}
        <div className="card fade-up-4" style={{ padding: '22px 24px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff', marginBottom: 4 }}>🌐 Leads by Source</p>
          <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', marginBottom: 20 }}>Distribution across platforms</p>
          {bySource.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
              No data yet — run pipeline first
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bySource.map(({ name, count }) => {
                const total = bySource.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const srcColors: Record<string, string> = {
                  freelancer: '#7c3aed',
                  upwork: '#06b6d4',
                  reddit: '#f59e0b',
                  twitter: '#38bdf8',
                  'linkedin-public': '#10b981',
                  facebook: '#3b82f6',
                  threads: '#ec4899',
                  indiehackers: '#059669',
                  producthunt: '#f97316',
                  hackernews: '#ea580c',
                  bluesky: '#0284c7',
                  github: '#8b5cf6',
                  mastodon: '#6366f1',
                  quora: '#ef4444',
                  devto: '#14b8a6',
                  youtube: '#dc2626',
                  telegram: '#0ea5e9',
                  clutch: '#f43f5e',
                  craigslist: '#84cc16',
                  fiverr: '#10b981',
                  contra: '#eab308',
                  wellfound: '#d97706',
                  guru: '#9333ea',
                  peopleperhour: '#f59e0b',
                };
                const color = srcColors[name] ?? '#6b7280';
                return (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: 'rgba(241,240,255,0.65)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{SOURCE_ICONS[name] ?? '📌'}</span>
                        <span style={{ textTransform: 'capitalize' }}>{name}</span>
                      </span>
                      <span style={{ fontWeight: 700, color: '#f1f0ff' }}>{count} <span style={{ fontWeight: 400, color: 'rgba(241,240,255,0.4)' }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 999, opacity: 0.85, transition: 'width 1s ease' }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Leads Table */}
      <div className="card fade-up" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff' }}>🔥 Top Leads by Intent Score</p>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', marginTop: 2 }}>Sorted by buying intent · Claude-classified</p>
          </div>
          <Link href="/leads" className="btn-ghost" style={{ fontSize: 12 }}>View all →</Link>
        </div>

        {topLeads.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
            <p style={{ color: 'rgba(241,240,255,0.4)', fontSize: 14, fontWeight: 500 }}>No leads yet — run the pipeline to get started</p>
            <p style={{ color: 'rgba(241,240,255,0.25)', fontSize: 12, marginTop: 6 }}>Run <code style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: 6 }}>npm run start</code> from the pipeline directory</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['Source','Company / Link','Category','Budget','Score','Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, color: 'rgba(241,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topLeads.map((lead, i) => (
                <tr key={i} className="lead-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ fontSize: 18 }}>{SOURCE_ICONS[lead.source] ?? '📌'}</span>
                  </td>
                  <td style={{ padding: '12px 20px', maxWidth: 240 }}>
                    {lead.link ? (
                      <a href={lead.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#a78bfa')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#f1f0ff')}>
                        {lead.company || lead.contactName || new URL(lead.link).hostname}
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, color: '#f1f0ff' }}>{lead.company || lead.contactName || '—'}</span>
                    )}
                    {lead.domain && <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.3)', marginTop: 2 }}>{lead.domain}</p>}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    {lead.category && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                        background: (CATEGORY_COLORS[lead.category] ?? '#6b7280') + '22',
                        color: CATEGORY_COLORS[lead.category] ?? '#6b7280',
                        border: `1px solid ${(CATEGORY_COLORS[lead.category] ?? '#6b7280')}44`,
                      }}>{lead.category}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: '#6ee7b7' }}>
                    {lead.budget || '—'}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span className={`score-badge score-${lead.buyingIntentScore}`}>{SCORE_LABELS[String(lead.buyingIntentScore)] ?? lead.buyingIntentScore}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span className={`pill pill-${(lead.status || 'new').toLowerCase()}`}>{lead.status || 'New'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
