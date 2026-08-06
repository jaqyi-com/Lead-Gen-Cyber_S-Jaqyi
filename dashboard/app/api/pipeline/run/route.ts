import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export const dynamic = 'force-dynamic';

const PIPELINE_ROOT = path.resolve(process.cwd(), '..');
const STATUS_FILE = path.resolve(PIPELINE_ROOT, 'pipeline-config.json');

let runningPid: number | null = null;

export async function GET() {
  // Return current run status
  try {
    const config = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    return NextResponse.json({
      lastRun: config.lastRun,
      lastRunStatus: config.lastRunStatus,
      isRunning: runningPid !== null,
      pid: runningPid,
    });
  } catch {
    return NextResponse.json({ lastRun: null, lastRunStatus: null, isRunning: false });
  }
}

export async function POST() {
  if (runningPid !== null) {
    return NextResponse.json({ ok: false, message: 'Pipeline already running', pid: runningPid });
  }

  try {
    // Spawn pipeline as detached background process
    const proc = spawn('npm', ['run', 'start'], {
      cwd: PIPELINE_ROOT,
      detached: true,
      stdio: 'ignore',
    });

    runningPid = proc.pid ?? null;
    proc.unref();

    // Clear PID when done (best effort)
    proc.on('close', () => { runningPid = null; });

    return NextResponse.json({
      ok: true,
      message: `Pipeline started (PID ${runningPid})`,
      pid: runningPid,
      startedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
