import { NextResponse } from 'next/server';
import { fetchAllLeads } from '@/lib/sheets';

export const revalidate = 300; // cache for 5 minutes

export async function GET() {
  try {
    const leads = await fetchAllLeads();
    return NextResponse.json({ leads, total: leads.length });
  } catch (err) {
    console.error('[api/leads] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
