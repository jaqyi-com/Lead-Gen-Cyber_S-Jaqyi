import axios from 'axios';

/**
 * LinkedIn-PUBLIC source — uses a Google Search Apify actor to surface
 * publicly-indexed LinkedIn posts/profiles that show buying intent.
 *
 * ⚠️  COMPLIANCE NOTE:
 *  - This module NEVER authenticates against LinkedIn directly.
 *  - It NEVER uses a LinkedIn session cookie or OAuth token.
 *  - It only surfaces content already indexed by Google and publicly visible.
 *  - This is the only permissible LinkedIn data collection per the spec.
 */

// Generic Google Search actor — widely available on Apify
const ACTOR_ID = 'apify/google-search-scraper';
const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/** Google queries that surface buying-intent LinkedIn public posts */
const LINKEDIN_QUERIES: string[] = [
  'site:linkedin.com/posts "looking for" "AI agent developer"',
  'site:linkedin.com/posts "looking for" "automation developer"',
  'site:linkedin.com/posts "hiring" "software developer" "AI"',
  'site:linkedin.com/posts "need a developer" "SaaS"',
  'site:linkedin.com/posts "looking for" "mobile app developer"',
  'site:linkedin.com/posts "hiring" "n8n" OR "workflow automation"',
  'site:linkedin.com/posts "looking for" "full stack developer" budget',
  'site:linkedin.com/posts "build" "AI chatbot" "hire"',
  'site:linkedin.com/posts "developer needed" "web app"',
  'site:linkedin.com/posts "looking for" "React" OR "Next.js" developer',
];

/**
 * Fetches publicly-indexed LinkedIn posts via Google Search actor.
 * Returns untouched raw items — normalization happens in normalize.ts.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const input = {
    queries: LINKEDIN_QUERIES.join('\n'),
    maxPagesPerQuery: 2,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    // Instruct the actor to return organic results only
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  };

  const response = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 120_000,
  });

  const items: Record<string, unknown>[] = Array.isArray(response.data)
    ? response.data
    : [];

  console.log(`[linkedin-public] Fetched ${items.length} raw search result items`);
  return items;
}
