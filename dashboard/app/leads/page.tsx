import { fetchAllLeads } from '@/lib/sheets';
import { SOURCE_ICONS } from '@/lib/types';
import { ScoreBadge, CategoryBadge, StatusBadge } from '@/components/Badges';
import LeadsTable from '@/components/LeadsTable';

export const revalidate = 300;

export default async function LeadsPage() {
  const leads = await fetchAllLeads().catch(() => []);
  const sorted = [...leads].sort((a, b) => {
    if (b.buyingIntentScore !== a.buyingIntentScore) return b.buyingIntentScore - a.buyingIntentScore;
    return b.date.localeCompare(a.date);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Leads</h1>
          <p className="text-sm text-white/40 mt-1">{leads.length} total · sorted by intent score</p>
        </div>
        <a
          href={`https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm transition-all"
        >
          📊 Open Sheet →
        </a>
      </div>

      <LeadsTable leads={sorted} />
    </div>
  );
}
