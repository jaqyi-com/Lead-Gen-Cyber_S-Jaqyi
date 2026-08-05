import axios from 'axios';
import { ALL_KEYWORDS } from '../config/keywords';

const ACTOR_ID = 'piotrv1001/freelancer-jobs-scraper';
const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/**
 * Fetches raw job listings from Freelancer.com via the Apify actor.
 * Returns untouched raw items — normalization happens in normalize.ts.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  // Build one query per keyword set (actor supports a `query` field)
  // We batch all keywords into a single run to minimise actor invocations.
  const input = {
    queries: ALL_KEYWORDS.slice(0, 20), // cap to avoid overly long runs
    maxResults: 50,
    country: 'US', // broaden to all if desired — Freelancer is global
  };

  const response = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120_000,
  });

  const items: Record<string, unknown>[] = Array.isArray(response.data)
    ? response.data
    : [];

  console.log(`[freelancer] Fetched ${items.length} raw items`);
  return items;
}
