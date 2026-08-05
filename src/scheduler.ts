import 'dotenv/config';
import cron from 'node-cron';

/**
 * Scheduler entrypoint — runs the full pipeline on a cron schedule.
 *
 * Default: once daily at 09:00 local time.
 * Override via CRON_SCHEDULE env var (standard 5-field cron expression).
 *
 * Usage: npm run schedule
 */

const CRON_EXPRESSION = process.env.CRON_SCHEDULE ?? '0 9 * * *';

console.log(`[scheduler] JAQYI Lead Pipeline scheduler starting…`);
console.log(`[scheduler] Schedule: "${CRON_EXPRESSION}" (${describeCron(CRON_EXPRESSION)})`);
console.log(`[scheduler] Next run: ${getNextRun(CRON_EXPRESSION)}`);

function describeCron(expr: string): string {
  const map: Record<string, string> = {
    '0 9 * * *': 'daily at 09:00',
    '0 6 * * 1-5': 'weekdays at 06:00',
    '0 */6 * * *': 'every 6 hours',
    '0 */12 * * *': 'twice daily',
    '0 8 * * 1': 'Mondays at 08:00',
  };
  return map[expr] ?? expr;
}

function getNextRun(expr: string): string {
  // Simple heuristic — node-cron doesn't expose nextDate natively
  try {
    const parts = expr.split(' ');
    if (parts.length !== 5) return 'unknown';
    return `(see cron expression: ${expr})`;
  } catch {
    return 'unknown';
  }
}

// Validate expression before scheduling
if (!cron.validate(CRON_EXPRESSION)) {
  console.error(`[scheduler] Invalid cron expression: "${CRON_EXPRESSION}"`);
  process.exit(1);
}

cron.schedule(CRON_EXPRESSION, async () => {
  console.log(`\n[scheduler] ⏰ Triggered at ${new Date().toISOString()}`);
  try {
    // Dynamically import the run function to get a fresh module each time
    // (avoids stale closures on long-running processes)
    const { run } = await import('./index');
    // Note: index.ts also calls run() on direct import — we import only run
    // but since index exports run and also calls it, we use a wrapper approach:
    await runPipeline();
  } catch (err) {
    console.error('[scheduler] Pipeline run failed:', err);
  }
});

/** Import run without triggering index.ts self-invocation */
async function runPipeline(): Promise<void> {
  // We re-use the same pipeline stages that index.ts uses,
  // but call them directly here so the scheduler controls invocation.
  const { fetchLeads: fetchFreelancer } = await import('./sources/freelancer');
  const { fetchLeads: fetchUpwork } = await import('./sources/upwork');
  const { fetchLeads: fetchReddit } = await import('./sources/reddit');
  const { fetchLeads: fetchTwitter } = await import('./sources/twitter');
  const { fetchLeads: fetchLinkedIn } = await import('./sources/linkedin-public');
  const { normalizeLeads } = await import('./pipeline/normalize');
  const { dedupeLeads } = await import('./pipeline/dedupe');
  const { classifyLeads } = await import('./pipeline/classify');
  const { enrichLeads } = await import('./pipeline/enrich');
  const { appendLeadsToSheet } = await import('./storage/sheets');
  const { sendDigest } = await import('./delivery/digest');

  type SourceEntry = { name: import('./pipeline/normalize').SourceName; fetch: () => Promise<Record<string, unknown>[]> };

  const SOURCES: SourceEntry[] = [
    { name: 'freelancer', fetch: fetchFreelancer },
    { name: 'upwork', fetch: fetchUpwork },
    { name: 'reddit', fetch: fetchReddit },
    { name: 'twitter', fetch: fetchTwitter },
    { name: 'linkedin-public', fetch: fetchLinkedIn },
  ];

  console.log('\n========================================');
  console.log('  JAQYI Lead Pipeline — Scheduled Run');
  console.log(`  ${new Date().toISOString()}`);
  console.log('========================================\n');

  const allRaw: import('./pipeline/normalize').RawLead[] = [];

  for (const source of SOURCES) {
    try {
      const rawItems = await source.fetch();
      const normalized = normalizeLeads(source.name, rawItems);
      allRaw.push(...normalized);
    } catch (err) {
      console.error(`[scheduler] Source "${source.name}" failed:`, err);
    }
  }

  if (allRaw.length === 0) { console.log('[scheduler] No leads.'); return; }

  const fresh = dedupeLeads(allRaw);
  if (fresh.length === 0) { console.log('[scheduler] No new leads.'); return; }

  const classified = await classifyLeads(fresh);
  if (classified.length === 0) { console.log('[scheduler] None passed filter.'); return; }

  const enriched = await enrichLeads(classified);

  try { await appendLeadsToSheet(enriched); } catch (e) { console.error('[scheduler] Sheets error:', e); }
  try { await sendDigest(enriched); } catch (e) { console.error('[scheduler] Digest error:', e); }

  console.log(`\n[scheduler] Run complete. ${enriched.length} leads.`);
}

console.log('[scheduler] Waiting for next scheduled run… (Ctrl+C to stop)');
