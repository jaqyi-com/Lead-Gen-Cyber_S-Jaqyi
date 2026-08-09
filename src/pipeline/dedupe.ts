/**
 * dedupe.ts
 *
 * Dedup Engine — spec §2.2
 *
 * Hash key: sha256(client_name + project_url) as per spec.
 * Primary store: SQLite DB (leads.db)
 * Fallback: seen-hashes.json (kept for backward compat / DB-unavailable scenarios)
 *
 * Behavior:
 *   - Found in DB → update last_seen, stop pipeline for this item (return null)
 *   - Not found → insert as status='new', continue pipeline (return lead)
 */

import * as fs from 'fs';
import * as path from 'path';
import { RawLead } from './normalize';
import {
  computeDedupHash,
  insertNewLead,
  getDb,
} from '../storage/db';

const CACHE_PATH = path.resolve(process.cwd(), 'seen-hashes.json');

// ─── File-based fallback cache (backward compat) ──────────────────────────────

function loadFileCache(): Set<string> {
  try {
    if (!fs.existsSync(CACHE_PATH)) return new Set();
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveFileCache(seen: Set<string>): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify([...seen], null, 2), 'utf-8');
  } catch (err) {
    console.error('[dedupe] Could not write seen-hashes.json:', err);
  }
}

// ─── DB availability check ────────────────────────────────────────────────────

function isDbAvailable(): boolean {
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
}

// ─── Main dedup function ──────────────────────────────────────────────────────

/**
 * Deduplicates leads using the spec hash key: sha256(client_name + project_url).
 *
 * When DB is available (primary path):
 *   - New leads are inserted into the DB with status='new'
 *   - Duplicate leads update last_seen only
 *   - Returns only the new (non-duplicate) leads
 *
 * When DB is unavailable (fallback):
 *   - Falls back to seen-hashes.json file-based dedup (source:url hash)
 *
 * Idempotent: safe to call multiple times on the same batch.
 */
export function dedupeLeads<T extends Pick<RawLead, 'source' | 'url' | 'title'> & {
  authorName?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string;
  budget?: string;
  description?: string;
  postedAt?: string;
  client_profile_url?: string;
}>(leads: T[]): T[] {
  const dbAvailable = isDbAvailable();

  if (!dbAvailable) {
    console.warn('[dedupe] DB unavailable — falling back to file-based dedup');
    return dedupeWithFileCache(leads as unknown as RawLead[]) as unknown as T[];
  }

  const fresh: T[] = [];
  let dupes = 0;

  for (const lead of leads) {
    const hash = computeDedupHash(lead.authorName, lead.url);

    const inserted = insertNewLead({
      dedup_hash: hash,
      source: lead.source,
      project_url: lead.url,
      title: lead.title,
      description: (lead as { description?: string }).description,
      budget_min: lead.budget_min,
      budget_max: lead.budget_max,
      currency: lead.currency,
      budget_raw: lead.budget,
      client_name: lead.authorName,
      client_profile_url: lead.client_profile_url,
    });

    if (inserted === null) {
      // Existing lead — last_seen updated in DB by insertNewLead
      dupes++;
      console.log(`[dedupe] Existing: ${lead.url}`);
    } else {
      fresh.push(lead);
    }
  }

  console.log(
    `[dedupe] ${leads.length} in → ${fresh.length} new (${dupes} dupes — last_seen updated)`
  );
  return fresh;
}

// ─── File-based fallback ──────────────────────────────────────────────────────

function dedupeWithFileCache(leads: RawLead[]): RawLead[] {
  const seen = loadFileCache();
  const fresh: RawLead[] = [];

  for (const lead of leads) {
    // Use source:url hash as fallback (original behavior)
    const { createHash } = require('crypto') as typeof import('crypto');
    const hash = createHash('sha256').update(`${lead.source}:${lead.url}`).digest('hex');
    if (seen.has(hash)) {
      console.log(`[dedupe] Skipping already-seen: ${lead.url}`);
      continue;
    }
    seen.add(hash);
    fresh.push(lead);
  }

  if (fresh.length > 0) saveFileCache(seen);

  console.log(
    `[dedupe] ${leads.length} in → ${fresh.length} new (${leads.length - fresh.length} dupes dropped) [file cache]`
  );
  return fresh;
}

