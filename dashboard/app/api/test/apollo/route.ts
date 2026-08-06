import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return NextResponse.json({ ok: false, message: '❌ APOLLO_API_KEY not set' });

  try {
    // Apollo /people/search — minimal query
    const res = await axios.post(
      'https://api.apollo.io/api/v1/mixed_people/search',
      { q_organization_domains: 'google.com', page: 1, per_page: 1 },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': key,
        },
        timeout: 15_000,
      }
    );
    const total = res.data?.pagination?.total_entries ?? '?';
    return NextResponse.json({
      ok: true,
      message: `✅ Apollo connected — API key valid`,
      detail: `Test query returned ${total} entries`,
    });
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : null;
    const msg = axios.isAxiosError(err) ? (err.response?.data?.error ?? err.message) : String(err);
    return NextResponse.json({ ok: false, message: `❌ Apollo error (${status ?? 'network'})`, detail: String(msg) }, { status: 500 });
  }
}
