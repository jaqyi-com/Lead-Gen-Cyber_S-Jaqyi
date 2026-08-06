import { fetchAllLeads } from '@/lib/sheets';
import LeadsTable from '@/components/LeadsTable';

// Force dynamic — never pre-rendered at build time
export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const leads = await fetchAllLeads().catch(() => []);
  const sorted = [...leads].sort((a, b) => {
    if (b.buyingIntentScore !== a.buyingIntentScore) return b.buyingIntentScore - a.buyingIntentScore;
    return b.date.localeCompare(a.date);
  });

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f0ff', letterSpacing: '-0.02em' }}>All Leads</h1>
          <p style={{ fontSize: 13, color: 'rgba(241,240,255,0.4)', marginTop: 4 }}>
            {leads.length} total · sorted by intent score · 5-min cache
          </p>
        </div>
        <a
          href={`https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}/edit`}
          target="_blank" rel="noopener noreferrer"
          className="btn-ghost"
          style={{ textDecoration: 'none', fontSize: 13 }}
        >
          📊 Open Google Sheet →
        </a>
      </div>
      <LeadsTable leads={sorted} />
    </div>
  );
}
