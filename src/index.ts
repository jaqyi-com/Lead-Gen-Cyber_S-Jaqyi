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
  console.log('\n========================================');
  console.log('  JAQYI Lead Pipeline — Starting Run');
  console.log(`  ${new Date().toISOString()}`);
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

  if (allRaw.length === 0) {
    console.log('[run] No leads fetched. Exiting.');
    return;
  }

  // ── Stage 2: Dedupe (before enrichment to protect Apollo credits) ─────────
  console.log('\n[run] ▶ Deduplicating…');
  const fresh = dedupeLeads(allRaw);

  if (fresh.length === 0) {
    console.log('[run] All leads already seen. Nothing new to process.');
    return;
  }

  // ── Stage 3: Classify via Claude ─────────────────────────────────────────
  console.log('\n[run] ▶ Classifying with Claude…');
  const classified = await classifyLeads(fresh);

  if (classified.length === 0) {
    console.log('[run] No leads passed classification filter. Exiting.');
    return;
  }

  // ── Stage 4: Enrich via Apollo.io ────────────────────────────────────────
  console.log('\n[run] ▶ Enriching with Apollo.io…');
  const enriched = await enrichLeads(classified);

  // ── Stage 5: Store to Google Sheets ──────────────────────────────────────
  console.log('\n[run] ▶ Appending to Google Sheets…');
  try {
    await appendLeadsToSheet(enriched);
  } catch (err) {
    console.error('[run] ✖ Sheets storage failed:', err);
  }

  // ── Stage 6: Send digest email ────────────────────────────────────────────
  console.log('\n[run] ▶ Sending digest email…');
  try {
    await sendDigest(enriched);
  } catch (err) {
    console.error('[run] ✖ Digest delivery failed:', err);
  }

  console.log('\n========================================');
  console.log(`  Run complete. ${enriched.length} leads processed.`);
  console.log('========================================\n');
}

// ─── Direct invocation entrypoint ────────────────────────────────────────────

run().catch((err) => {
  console.error('[run] Unhandled fatal error:', err);
  process.exit(1);
});
