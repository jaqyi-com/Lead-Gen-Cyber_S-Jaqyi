import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export const dynamic = 'force-dynamic';

const PIPELINE_ROOT = process.env.PIPELINE_ROOT ? path.resolve(process.env.PIPELINE_ROOT) : path.resolve(process.cwd(), '..');
const STATUS_FILE = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR, 'pipeline-config.json') : path.resolve(PIPELINE_ROOT, 'pipeline-config.json');
const LOG_FILE = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR, 'pipeline-run.log') : path.resolve(os.tmpdir(), 'pipeline-run.log');

let runningPid: number | null = null;

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
    return NextResponse.json({
      lastRun: config.lastRun,
      lastRunStatus: config.lastRunStatus,
      progress: runningPid !== null ? config.progress : null,
      isRunning: runningPid !== null,
      pid: runningPid,
    });
  } catch {
    return NextResponse.json({ lastRun: null, lastRunStatus: null, progress: null, isRunning: false });
  }
}

export async function POST() {
  if (runningPid !== null) {
    return NextResponse.json({ ok: false, message: 'Pipeline already running', pid: runningPid });
  }

  try {
    // Write fresh start message to log file
    fs.writeFileSync(
      LOG_FILE,
      `========================================\n` +
      `  JAQYI Pipeline Manual Triggered\n` +
      `  Started: ${new Date().toISOString()}\n` +
      `========================================\n\n`,
      'utf-8'
    );

    const logStream = fs.openSync(LOG_FILE, 'a');

    // Spawn pipeline and pipe stdout/stderr directly to log file
    const proc = spawn('npm', ['run', 'start'], {
      cwd: PIPELINE_ROOT,
      detached: true,
      stdio: ['ignore', logStream, logStream],
    });

    runningPid = proc.pid ?? null;
    proc.unref();

    // Clear PID when process closes
    proc.on('close', () => {
      runningPid = null;
    });

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
