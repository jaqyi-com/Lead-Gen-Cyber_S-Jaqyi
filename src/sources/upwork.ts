import axios from 'axios';
import { ALL_KEYWORDS } from '../config/keywords';

const ACTOR_ID = 'getdataforme/upwork-actor';
const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/**
 * Fetches raw job listings from Upwork via the Apify actor.
 * Returns untouched raw items — normalization happens in normalize.ts.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  // Upwork actor accepts a `searchKeywords` array or a single `query` string.
  // Joining with OR gives broad coverage in a single run.
  const input = {
    searchKeywords: ALL_KEYWORDS.slice(0, 15),
    maxJobs: 60,
    jobType: 'hourly,fixed',
  };

  const response = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 180_000, // Upwork runs can be slower
  });

  const items: Record<string, unknown>[] = Array.isArray(response.data)
    ? response.data
    : [];

  console.log(`[upwork] Fetched ${items.length} raw items`);
  return items;
}
