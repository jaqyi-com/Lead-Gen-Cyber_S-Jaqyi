import 'dotenv/config';

import { fetchLeads as fetchFreelancer } from './sources/freelancer';
import { fetchLeads as fetchUpwork } from './sources/upwork';
import { fetchLeads as fetchReddit } from './sources/reddit';
import { fetchLeads as fetchTwitter } from './sources/twitter';
import { fetchLeads as fetchLinkedIn } from './sources/linkedin-public';

import { normalizeLeads, RawLead, SourceName } from './pipeline/normalize';
import { dedupeLeads } from './pipeline/dedupe';
import { classifyLeads } from './pipeline/classify';
import { enrichLeads } from './pipeline/enrich';
import { appendLeadsToSheet } from './storage/sheets';
import { sendDigest } from './delivery/digest';
import { updateLastRun } from './config/keywords';
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
 * Full pipeline run:
 *   sources → normalize → dedupe → classify → enrich → store → digest
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

  // ── Stage 1: Fetch (per-source fault isolation) ───────────────────────────
  const allRaw: RawLead[] = [];

  for (const source of SOURCES) {
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

  if (fresh0.length === 0) {
    console.log('[run] No fresh leads fetched. Exiting.');
    updateLastRun('failed', 'No fresh leads from any source');
    return;
  }

  if (allRaw.length === 0) {
    console.log('[run] No leads fetched. Exiting.');
    updateLastRun('failed', 'No leads fetched from any source');
    return;
  }

  // ── Stage 2: Dedupe (before enrichment to protect Apollo credits) ─────────
  console.log('\n[run] ▶ Deduplicating…');
  const fresh = dedupeLeads(fresh0);
  console.log(`[run] ${fresh.length} fresh leads after dedup (${fresh0.length - fresh.length} dupes removed)`);

  if (fresh.length === 0) {
    console.log('[run] All leads already seen. Nothing new to process.');
    updateLastRun('success', 'No new leads — all already processed');
    return;
  }

  // ── Stage 3: Classify via Claude ─────────────────────────────────────────
  console.log('\n[run] ▶ Classifying with Claude…');
  const classified = await classifyLeads(fresh);
  console.log(`[run] ${classified.length} leads passed classification`);

  if (classified.length === 0) {
    console.log('[run] No leads passed classification filter. Exiting.');
    updateLastRun('failed', `0/${fresh.length} leads passed classifier`);
    return;
  }

  // ── Stage 4: Enrich via Apollo.io ────────────────────────────────────────
  console.log('\n[run] ▶ Enriching with Apollo.io…');
  const enriched = await enrichLeads(classified);

  // ── Stage 5: Store to Google Sheets ──────────────────────────────────────
  console.log('\n[run] ▶ Appending to Google Sheets…');
  try {
    await appendLeadsToSheet(enriched);
    console.log(`[run] ✓ Wrote ${enriched.length} leads to sheet`);
  } catch (err) {
    console.error('[run] ✖ Sheets storage failed:', err);
  }

  // ── Stage 6: Send digest email ────────────────────────────────────────────
  console.log('\n[run] ▶ Sending digest email…');
  try {
    await sendDigest(enriched);
    console.log('[run] ✓ Digest email sent');
  } catch (err) {
    console.error('[run] ✖ Digest delivery failed:', err);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log('\n========================================');
  console.log(`  Run complete. ${enriched.length} leads processed in ${elapsed}s`);
  console.log('========================================\n');

  updateLastRun('success', `${enriched.length} leads processed in ${elapsed}s`);
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
  const path = require('path');
  const configPath = path.resolve(__dirname, '../../pipeline-config.json');

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
    process.exit(1);
  });
}
