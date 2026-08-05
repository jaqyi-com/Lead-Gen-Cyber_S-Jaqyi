import axios from 'axios';
import { SOCIAL_KEYWORDS } from '../config/keywords';

// Using apify/twitter-scraper — most actively maintained X actor on Apify.
const ACTOR_ID = 'apify/twitter-scraper';
const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/**
 * Fetches tweets matching buying-intent search queries via the Apify Twitter/X actor.
 * No authentication against X is performed by this module — the actor handles that.
 * Returns untouched raw items — normalization happens in normalize.ts.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  // Build one search query per keyword (X search supports natural-language queries)
  const searchTerms = SOCIAL_KEYWORDS.map(
    (kw) => `"${kw}" -is:retweet lang:en`
  );

  const input = {
    searchTerms,
    maxTweets: 100,
    queryType: 'Latest',
    onlyVerifiedUsers: false,
  };

  const response = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 180_000,
  });

  const items: Record<string, unknown>[] = Array.isArray(response.data)
    ? response.data
    : [];

  console.log(`[twitter] Fetched ${items.length} raw items`);
  return items;
}
