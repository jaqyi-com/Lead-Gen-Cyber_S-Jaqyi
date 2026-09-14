import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

function getActiveApifyToken(customToken?: string | null): string {
  if (customToken && customToken.trim()) return customToken.trim();

  // Try reading from pipeline-config.json
  const configPaths = process.env.DATA_DIR 
    ? [path.resolve(process.env.DATA_DIR, 'pipeline-config.json')] 
    : [
        path.resolve(process.cwd(), '../pipeline-config.json'),
        path.resolve(process.cwd(), 'pipeline-config.json'),
      ];

  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (cfg.apifyToken && typeof cfg.apifyToken === 'string' && cfg.apifyToken.trim()) {
          return cfg.apifyToken.trim();
        }
      } catch {}
    }
  }

  return process.env.APIFY_TOKEN ?? '';
}

export async function GET(req: NextRequest) {
  const urlToken = req.nextUrl.searchParams.get('token');
  const token = getActiveApifyToken(urlToken);

  if (!token) return NextResponse.json({ ok: false, message: '❌ Apify token is not configured' });

  try {
    // Check account/user endpoint — no credits consumed
    const res = await axios.get(`https://api.apify.com/v2/users/me?token=${token}`, { timeout: 10_000 });
    const user = res.data?.data;
    return NextResponse.json({
      ok: true,
      message: `✅ Apify connected — account: ${user?.username ?? user?.email ?? 'verified'}`,
      detail: `Plan: ${user?.plan?.id ?? 'Active'} · Runs: ${user?.usageCycle?.actorRunsTotal ?? 0}`,
    });
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : null;
    return NextResponse.json({
      ok: false,
      message: status === 401 ? '❌ Invalid Apify Token (401 Unauthorized)' : `❌ Apify error (${status ?? 'network'})`,
      detail: String(err),
    }, { status: 500 });
  }
}

