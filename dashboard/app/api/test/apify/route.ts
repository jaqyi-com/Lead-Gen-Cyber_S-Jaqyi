import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const token = process.env.APIFY_TOKEN;
  if (!token) return NextResponse.json({ ok: false, message: '❌ APIFY_TOKEN not set' });

  try {
    // Check account/user endpoint — no credits consumed
    const res = await axios.get(`https://api.apify.com/v2/users/me?token=${token}`, { timeout: 10_000 });
    const user = res.data?.data;
    return NextResponse.json({
      ok: true,
      message: `✅ Apify connected — account: ${user?.username ?? user?.email ?? 'verified'}`,
      detail: `Plan: ${user?.plan?.id ?? '?'} · Runs: ${user?.usageCycle?.actorRunsTotal ?? '?'}`,
    });
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : null;
    return NextResponse.json({ ok: false, message: `❌ Apify error (${status ?? 'network'})`, detail: String(err) }, { status: 500 });
  }
}
