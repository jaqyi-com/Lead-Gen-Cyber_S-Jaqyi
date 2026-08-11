import 'dotenv/config';

// ─── Patch console.error and console.warn to prevent Axios segfaults ──────
// Axios errors contain massive circular structures including the raw TLSSocket.
// Printing them in Node.js can cause a Segmentation fault deep in util.inspect
// or trigger Railway's log rate limit. We patch the logger to only print the message.
const originalError = console.error;
console.error = (...args: any[]) => {
  originalError(...args.map(a => a?.isAxiosError ? `AxiosError: ${a.message} (status: ${a.response?.status})` : a));
};
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  originalWarn(...args.map(a => a?.isAxiosError ? `AxiosError: ${a.message} (status: ${a.response?.status})` : a));
};

import { fetchLeads as fetchFreelancer } from './sources/freelancer';
import { fetchLeads as fetchUpwork } from './sources/upwork';
import { fetchLeads as fetchReddit } from './sources/reddit';
import { fetchLeads as fetchTwitter } from './sources/twitter';
import { fetchLeads as fetchLinkedIn } from './sources/linkedin-public';

import { normalizeLeads, RawLead, SourceName } from './pipeline/normalize';
import { dedupeLeads } from './pipeline/dedupe';
import { classifyLeads } from './pipeline/classify';
import { enrichLeads } from './pipeline/enrich';
import { runVerificationStage } from './pipeline/verify';
import { runScoringStage } from './pipeline/score';
import { runAssignmentStage } from './pipeline/assign';
import { appendLeadsToSheet } from './storage/sheets';
import { seedRepsFromConfig } from './storage/db';
import { sendDigest } from './delivery/digest';
import { sendSlackNotifications } from './delivery/slack';
import { updateLastRun, updateProgress, clearProgress, getEnabledSources } from './config/keywords';
import { isFresh, FRESHNESS_DAYS, afterDateString } from './utils/freshness';

// ─── Source registry ──────────────────────────────────────────────────────────

const SOURCES: Array<{
  name: SourceName;
  fetch: () => Promise<Record<string, unknown>[]>;
}> = [
  { name: 'freelancer', fetch: fetchFreelancer },
  { name: 'upwork', fetch: fetchUpwork },
  { name: 'reddit', fetch: fetchReddit },
  { name: 'twitter', fetch: fetchTwitter },
  { name: 'linkedin-public', fetch: fetchLinkedIn },
];

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Full pipeline run (pull-based, spec §3):
 *
 *   sources → normalize → dedupe(DB) → classify → enrich
 *           → verify → score → assign → slack → sheet → digest
 *
 * Each stage after enrich is pull-based — it reads from the DB by status
 * and writes to the next status. This means each stage can fail and retry
 * independently without re-running the entire pipeline.
 *
 * Each source is fault-isolated: failures are logged and skipped without
 * crashing the entire run.
 */
export async function run(): Promise<void> {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log('  JAQYI Lead Pipeline — Starting Run');
  console.log(`  ${new Date().toISOString()}`);
  console.log(`  Freshness window: last ${FRESHNESS_DAYS} days (after:${afterDateString()})`);
  console.log('========================================\n');

  // Seed reps table from pipeline-config.json (idempotent)
  seedRepsFromConfig();
  updateProgress('Starting pipeline run...', 0, 10);

  // ── Stage 1: Fetch (per-source fault isolation) ───────────────────────────
  updateProgress('Fetching sources...', 1, 10);
  const enabledSources = getEnabledSources();
  const allRaw: RawLead[] = [];

  for (const source of SOURCES) {
    if (enabledSources[source.name] === false) {
      console.log(`\n[run] ⏸ Source "${source.name}" disabled in config — skipping`);
      continue;
    }
    try {
      console.log(`\n[run] ▶ Fetching source: ${source.name}`);
      const rawItems = await source.fetch();
      const normalized = normalizeLeads(source.name, rawItems);
      allRaw.push(...normalized);
    } catch (err) {
      console.error(`[run] ✖ Source "${source.name}" failed — skipping:`, err);
    }
  }

  console.log(`\n[run] Total normalized leads: ${allRaw.length}`);

  // ── Stage 1.5: Freshness filter ───────────────────────────────────────────
  // Drop leads whose postedAt date is older than FRESHNESS_DAYS.
  // Sources already inject after: into queries; this is a second-pass safety net.
  const fresh0 = allRaw.filter((lead) => isFresh(lead.postedAt));
  if (fresh0.length < allRaw.length) {
    console.log(`[run] ▶ Freshness filter: kept ${fresh0.length}/${allRaw.length} (dropped ${allRaw.length - fresh0.length} stale leads)`);
  }

  if (allRaw.length === 0) {
    console.log('[run] No leads fetched. Running downstream stages on any queued DB leads…');
    // Don't exit — downstream stages may still have queued work
  }

  if (fresh0.length === 0 && allRaw.length > 0) {
    console.log('[run] No fresh leads. Running downstream stages on any queued DB leads…');
  }

  // ── Stage 2: Dedupe (DB-backed — inserts new leads with status='new') ─────
  let enriched: Awaited<ReturnType<typeof enrichLeads>> = [];

  if (fresh0.length > 0) {
    updateProgress('Deduplicating leads...', 2, 10);
    console.log('\n[run] ▶ Deduplicating…');
    const fresh = dedupeLeads(fresh0);
    console.log(`[run] ${fresh.length} fresh leads after dedup (${fresh0.length - fresh.length} dupes removed)`);

    if (fresh.length > 0) {
      // ── Stage 3: Classify via Claude (pre-enrichment filter) ───────────
      updateProgress('Classifying with Claude...', 3, 10);
      console.log('\n[run] ▶ Classifying with Claude…');
      const classified = await classifyLeads(fresh);
      console.log(`[run] ${classified.length} leads passed classification`);

      // ── Stage 4: Enrich via Apollo.io (+ Hunter.io fallback) ───────────
      if (classified.length > 0) {
        updateProgress('Enriching with Apollo...', 4, 10);
        console.log('\n[run] ▶ Enriching with Apollo.io…');
        enriched = await enrichLeads(classified);
      } else {
        console.log('[run] No leads passed classification — skipping enrichment');
      }
    } else {
      console.log('[run] All leads already seen. Running downstream stages on previously queued leads…');
    }
  }

  // ── Stage 5: Email Verification (pull-based — reads 'enriched' from DB) ──
  updateProgress('Verifying emails...', 5, 10);
  console.log('\n[run] ▶ Running email verification stage…');
  try {
    await runVerificationStage();
  } catch (err: any) {
    console.error('[run] ✖ Verification stage error:', err?.message || err);
  }

  // ── Stage 6: Scoring (pull-based — reads 'verified' from DB) ─────────────
  updateProgress('Scoring leads...', 6, 10);
  console.log('\n[run] ▶ Running scoring stage…');
  await runScoringStage();

  // ── Stage 7: Assignment (pull-based — reads 'scored' from DB) ────────────
  updateProgress('Assigning leads...', 7, 10);
  console.log('\n[run] ▶ Running assignment stage…');
  const assignments = await runAssignmentStage();

  // ── Stage 8: Slack notifications for newly assigned leads ────────────────
  if (assignments.length > 0) {
    updateProgress('Sending Slack notifications...', 8, 10);
    console.log('\n[run] ▶ Sending Slack notifications…');
    await sendSlackNotifications(assignments);
  }

  // ── Stage 9: Store to Google Sheets ──────────────────────────────────────
  if (enriched.length > 0) {
    updateProgress('Writing to Google Sheets...', 9, 10);
    console.log('\n[run] ▶ Appending to Google Sheets…');
    try {
      await appendLeadsToSheet(enriched);
      console.log(`[run] ✓ Wrote ${enriched.length} leads to sheet`);
    } catch (err) {
      console.error('[run] ✖ Sheets storage failed:', err);
    }
  }

  // ── Stage 10: Send digest email ───────────────────────────────────────────
  if (enriched.length > 0) {
    updateProgress('Sending digest email...', 10, 10);
    console.log('\n[run] ▶ Sending digest email…');
    try {
      await sendDigest(enriched);
      console.log('[run] ✓ Digest email sent');
    } catch (err) {
      console.error('[run] ✖ Digest delivery failed:', err);
    }
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n========================================');
  console.log(`  Run complete. ${enriched.length} new leads + ${assignments.length} assigned in ${elapsed}s`);
  console.log('========================================\n');

  updateLastRun('success', `${enriched.length} leads processed, ${assignments.length} assigned in ${elapsed}s`);
  clearProgress();
}

// ─── Scheduler mode vs single-run mode ───────────────────────────────────────
// Run with: npm run start          → single run
//           npm run schedule       → stays alive with cron

const IS_SCHEDULE_MODE = process.argv.includes('--schedule');

if (IS_SCHEDULE_MODE) {
  // Load config for schedule
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cron = require('node-cron');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDataFile } = require('./utils/paths');
  const configPath = getDataFile('pipeline-config.json');

  let cronExpression = '0 6 * * *'; // default: daily 6am
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    cronExpression = cfg.schedule?.cron ?? cronExpression;
    console.log(`[scheduler] Started — cron: "${cronExpression}" (${cfg.schedule?.label ?? ''})`);
  } catch {
    console.log(`[scheduler] Started with default cron: "${cronExpression}"`);
  }

  // Run immediately on start, then on schedule
  run().catch(console.error);

  cron.schedule(cronExpression, () => {
    console.log(`\n[scheduler] Cron triggered at ${new Date().toISOString()}`);
    run().catch(console.error);
  });

  console.log('[scheduler] Press Ctrl+C to stop.\n');
} else {
  // Single run mode
  run().catch((err) => {
    console.error('[run] Unhandled fatal error:', err);
    updateLastRun('failed', String(err));
    clearProgress();
    process.exit(1);
  });
}
