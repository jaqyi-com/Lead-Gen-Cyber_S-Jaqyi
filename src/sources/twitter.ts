import { runApifyActor } from './apifyClient';

/**
 * Fetches tweets via Apify Twitter scraper.
 * Uses searchTerms[] input format for apify/twitter-scraper.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  // Use Google Search as Twitter scraper requires auth/subscription
  const QUERIES = [
    'site:twitter.com "looking for" "AI developer" hire',
    'site:twitter.com "need" "AI agent" developer budget',
    'site:twitter.com "hiring" "automation developer" OR "n8n developer"',
    'site:twitter.com "need developer" "web app" OR "SaaS"',
    'site:twitter.com "looking for" "React" OR "Next.js" developer',
  ].join('\n');

  const items = await runApifyActor('apify/google-search-scraper', {
    queries: QUERIES,
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const tweets = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? (item as Record<string, unknown>).link ?? '');
    return url.includes('twitter.com') || url.includes('x.com');
  });

  console.log(`[twitter] ${items.length} Google results → ${tweets.length} Twitter/X posts`);
  return tweets;
}
