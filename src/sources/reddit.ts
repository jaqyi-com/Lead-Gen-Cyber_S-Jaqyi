import axios from 'axios';
import { SOCIAL_KEYWORDS } from '../config/keywords';
import { TARGET_SUBREDDITS } from '../config/subreddits';

const ACTOR_ID = 'trudax/reddit-scraper';
const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/**
 * Fetches posts from target subreddits matching buying-intent keywords.
 * Uses the Reddit actor in `search` mode (not a full sub crawl).
 * Returns untouched raw items — normalization happens in normalize.ts.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  // Build search requests: cross-product of subreddits × keywords (sampled)
  const searchRequests = TARGET_SUBREDDITS.slice(0, 10).map((sub) => ({
    type: 'search',
    subreddit: sub,
    query: SOCIAL_KEYWORDS.slice(0, 6).join(' OR '),
    sort: 'new',
    time: 'week',
    maxItems: 15,
  }));

  const input = {
    startUrls: searchRequests,
    maxItems: 150,
    skipComments: true,
  };

  const response = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 180_000,
  });

  const items: Record<string, unknown>[] = Array.isArray(response.data)
    ? response.data
    : [];

  console.log(`[reddit] Fetched ${items.length} raw items`);
  return items;
}
