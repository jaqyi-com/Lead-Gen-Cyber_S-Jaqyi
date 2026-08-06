import { NextResponse } from 'next/server';
import { fetchAllLeads } from '@/lib/sheets';

export async function GET() {
  try {
    const leads = await fetchAllLeads();
    return NextResponse.json({
      ok: true,
      message: `✅ Connected — ${leads.length} leads in Sheet1`,
      detail: `Spreadsheet ID: ${process.env.GOOGLE_SHEET_ID?.slice(0, 8)}…`,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, message: `❌ ${String(err)}` }, { status: 500 });
  }
}
