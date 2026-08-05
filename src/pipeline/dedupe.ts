import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { RawLead } from './normalize';

const CACHE_PATH = path.resolve(process.cwd(), 'seen-hashes.json');

/** SHA-256 of `source:url` — stable, compact dedup key */
function hashLead(lead: Pick<RawLead, 'source' | 'url'>): string {
  return crypto
    .createHash('sha256')
    .update(`${lead.source}:${lead.url}`)
    .digest('hex');
}

/** Load the current set of seen hashes from disk */
function loadCache(): Set<string> {
  try {
    if (!fs.existsSync(CACHE_PATH)) return new Set();
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    console.warn('[dedupe] Could not read seen-hashes.json — starting fresh');
    return new Set();
  }
}

/** Persist updated hash set to disk */
function saveCache(seen: Set<string>): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify([...seen], null, 2), 'utf-8');
  } catch (err) {
    console.error('[dedupe] Could not write seen-hashes.json:', err);
  }
}

/**
 * Filters out leads already seen in previous runs.
 * Updates the on-disk cache with newly-seen hashes after filtering.
 *
 * T must extend RawLead (works for RawLead, ClassifiedLead, etc.)
 */
export function dedupeLeads<T extends Pick<RawLead, 'source' | 'url'>>(
  leads: T[]
): T[] {
  const seen = loadCache();
  const fresh: T[] = [];
  const newHashes: string[] = [];

  for (const lead of leads) {
    const hash = hashLead(lead);
    if (seen.has(hash)) {
      console.log(`[dedupe] Skipping already-seen: ${lead.url}`);
      continue;
    }
    seen.add(hash);
    newHashes.push(hash);
    fresh.push(lead);
  }

  if (newHashes.length > 0) saveCache(seen);

  console.log(
    `[dedupe] ${leads.length} in → ${fresh.length} new (${leads.length - fresh.length} dupes dropped)`
  );
  return fresh;
}
