import { fetchAllLeads } from '@/lib/sheets';
import { CATEGORY_COLORS, SOURCE_ICONS } from '@/lib/types';
import { ScoreBadge, CategoryBadge, StatusBadge } from '@/components/Badges';
import OverviewCharts from '@/components/OverviewCharts';
import Link from 'next/link';

export const revalidate = 300;

function StatCard({
  label, value, sub, gradient,
}: {
  label: string; value: string | number; sub?: string; gradient: string;
}) {
  return (
    <div className={`glass p-6 fade-up`}>
      <p className="text-xs uppercase tracking-widest text-white/40 mb-1">{label}</p>
      <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
        {value}
      </p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

export default async function OverviewPage() {
  let leads = await fetchAllLeads().catch(() => []);

  const today = new Date().toISOString().split('T')[0];
  const newToday = leads.filter((l) => l.date === today).length;
  const avgScore =
    leads.length > 0
      ? (leads.reduce((s, l) => s + l.buyingIntentScore, 0) / leads.length).toFixed(1)
      : '0';

  const catMap = new Map<string, number>();
  for (const l of leads) catMap.set(l.category, (catMap.get(l.category) ?? 0) + 1);
  const topCategory = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const byCategory = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, color: CATEGORY_COLORS[name] ?? '#6b7280' }));

  const srcMap = new Map<string, number>();
  for (const l of leads) srcMap.set(l.source, (srcMap.get(l.source) ?? 0) + 1);
  const bySource = [...srcMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  // Score distribution
  const scoreMap: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const l of leads) scoreMap[String(Math.min(5, Math.max(1, l.buyingIntentScore)))]++;
  const byScore = Object.entries(scoreMap).map(([score, count]) => ({ score, count }));

  // Last 14 days timeline
  const dateMap = new Map<string, { count: number; totalScore: number }>();
  const now = new Date();
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(now); dt.setDate(now.getDate() - d);
    dateMap.set(dt.toISOString().split('T')[0], { count: 0, totalScore: 0 });
  }
  for (const l of leads) {
    if (dateMap.has(l.date)) {
      const e = dateMap.get(l.date)!;
      e.count++; e.totalScore += l.buyingIntentScore;
    }
  }
  const scoreOverTime = [...dateMap.entries()].map(([date, { count, totalScore }]) => ({
    date: date.slice(5), count,
    avgScore: count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0,
  }));

  // Top 5 leads by score
  const topLeads = [...leads].sort((a, b) => b.buyingIntentScore - a.buyingIntentScore).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Lead Pipeline Overview</h1>
          <p className="text-sm text-white/40 mt-1">
            Real-time data from Freelancer · Upwork · Reddit · Twitter/X · LinkedIn
          </p>
        </div>
        <Link
          href="/leads"
          className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          View All Leads →
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={leads.length} sub="All time" gradient="from-violet-400 to-cyan-400" />
        <StatCard label="New Today" value={newToday} sub={today} gradient="from-emerald-400 to-cyan-400" />
        <StatCard label="Avg Intent Score" value={`${avgScore}/5`} sub="Scored by Claude AI" gradient="from-orange-400 to-rose-400" />
        <StatCard label="Top Category" value={topCategory} sub={`${catMap.get(topCategory) ?? 0} leads`} gradient="from-violet-400 to-pink-400" />
      </div>

      {/* Charts */}
      <OverviewCharts byCategory={byCategory} bySource={bySource} byScore={byScore} scoreOverTime={scoreOverTime} />

      {/* Top leads */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">🔥 Top Leads by Intent Score</h2>
          <Link href="/leads" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</Link>
        </div>
        <div className="space-y-2">
          {topLeads.length === 0 && (
            <p className="text-sm text-white/30 py-4 text-center">No leads yet — run the pipeline to get started.</p>
          )}
          {topLeads.map((lead, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-sm flex-shrink-0">
                {SOURCE_ICONS[lead.source] ?? '📌'}
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={lead.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white truncate block hover:text-violet-300 transition-colors"
                >
                  {lead.link ? (
                    <span title={lead.link}>{lead.company || lead.contactName || new URL(lead.link).hostname}</span>
                  ) : (
                    <span>—</span>
                  )}
                </a>
                <p className="text-xs text-white/40 truncate">{lead.reasoning || lead.category}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {lead.budget && <span className="text-xs text-emerald-400 font-medium">{lead.budget}</span>}
                <CategoryBadge category={lead.category} />
                <ScoreBadge score={lead.buyingIntentScore} />
                <StatusBadge status={lead.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
