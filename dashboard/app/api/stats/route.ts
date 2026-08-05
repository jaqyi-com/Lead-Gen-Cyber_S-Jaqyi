import { NextResponse } from 'next/server';
import { fetchAllLeads } from '@/lib/sheets';
import { CATEGORY_COLORS, Stats } from '@/lib/types';

export const revalidate = 300;

export async function GET() {
  try {
    const leads = await fetchAllLeads();

    const today = new Date().toISOString().split('T')[0];
    const newToday = leads.filter((l) => l.date === today).length;
    const avgScore =
      leads.length > 0
        ? Math.round((leads.reduce((s, l) => s + l.buyingIntentScore, 0) / leads.length) * 10) / 10
        : 0;

    // By category
    const catMap = new Map<string, number>();
    for (const l of leads) {
      catMap.set(l.category, (catMap.get(l.category) ?? 0) + 1);
    }
    const byCategory = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, color: CATEGORY_COLORS[name] ?? '#6b7280' }));

    const topCategory = byCategory[0]?.name ?? '—';

    // By source
    const srcMap = new Map<string, number>();
    for (const l of leads) {
      srcMap.set(l.source, (srcMap.get(l.source) ?? 0) + 1);
    }
    const bySource = [...srcMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // By score distribution
    const scoreMap = new Map<string, number>();
    for (let i = 1; i <= 5; i++) scoreMap.set(String(i), 0);
    for (const l of leads) {
      const k = String(Math.min(5, Math.max(1, l.buyingIntentScore)));
      scoreMap.set(k, (scoreMap.get(k) ?? 0) + 1);
    }
    const byScore = [...scoreMap.entries()].map(([score, count]) => ({ score, count }));

    // Leads over time (last 14 days)
    const dateMap = new Map<string, { count: number; totalScore: number }>();
    const now = new Date();
    for (let d = 13; d >= 0; d--) {
      const dt = new Date(now);
      dt.setDate(now.getDate() - d);
      dateMap.set(dt.toISOString().split('T')[0], { count: 0, totalScore: 0 });
    }
    for (const l of leads) {
      if (dateMap.has(l.date)) {
        const entry = dateMap.get(l.date)!;
        entry.count++;
        entry.totalScore += l.buyingIntentScore;
      }
    }
    const scoreOverTime = [...dateMap.entries()].map(([date, { count, totalScore }]) => ({
      date,
      count,
      avgScore: count > 0 ? Math.round((totalScore / count) * 10) / 10 : 0,
    }));

    const stats: Stats = {
      totalLeads: leads.length,
      newToday,
      avgScore,
      topCategory,
      byCategory,
      bySource,
      byScore,
      scoreOverTime,
    };

    return NextResponse.json(stats);
  } catch (err) {
    console.error('[api/stats] Error:', err);
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
  }
}
