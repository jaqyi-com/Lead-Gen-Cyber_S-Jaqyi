import { fetchAllLeads } from '@/lib/sheets';
import { CATEGORY_COLORS } from '@/lib/types';
import OverviewClient from '@/components/OverviewClient';

export const revalidate = 300;

export default async function OverviewPage() {
  let leads = await fetchAllLeads().catch(() => []);

  const today = new Date().toISOString().split('T')[0];
  const newToday = leads.filter((l) => l.date === today).length;
  const scores = leads.map((l) => l.buyingIntentScore).filter(Boolean);
  const avgScore = scores.length ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;

  const catMap = new Map<string, number>();
  for (const l of leads) if (l.category) catMap.set(l.category, (catMap.get(l.category) ?? 0) + 1);
  const byCategory = [...catMap.entries()].sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, color: CATEGORY_COLORS[name] ?? '#6b7280' }));
  const topCategory = byCategory[0]?.name ?? '—';

  const srcMap = new Map<string, number>();
  for (const l of leads) if (l.source) srcMap.set(l.source, (srcMap.get(l.source) ?? 0) + 1);
  const bySource = [...srcMap.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  const scoreMap: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const l of leads) {
    const k = String(Math.min(5, Math.max(1, l.buyingIntentScore || 1)));
    scoreMap[k]++;
  }
  const byScore = Object.entries(scoreMap).map(([score, count]) => ({ score, count }));

  const now = new Date();
  const dateMap = new Map<string, { count: number; totalScore: number }>();
  for (let d = 13; d >= 0; d--) {
    const dt = new Date(now); dt.setDate(now.getDate() - d);
    dateMap.set(dt.toISOString().split('T')[0], { count: 0, totalScore: 0 });
  }
  for (const l of leads) {
    if (dateMap.has(l.date)) {
      const e = dateMap.get(l.date)!;
      e.count++; e.totalScore += (l.buyingIntentScore || 0);
    }
  }
  const scoreOverTime = [...dateMap.entries()].map(([date, { count, totalScore }]) => ({
    date: date.slice(5), count,
    avgScore: count > 0 ? +(totalScore / count).toFixed(1) : 0,
  }));

  const topLeads = [...leads].sort((a, b) => b.buyingIntentScore - a.buyingIntentScore).slice(0, 8);

  return (
    <OverviewClient
      stats={{ total: leads.length, newToday, avgScore, topCategory }}
      byCategory={byCategory}
      bySource={bySource}
      byScore={byScore}
      scoreOverTime={scoreOverTime}
      topLeads={topLeads}
    />
  );
}
