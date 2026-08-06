import { runApifyActor } from './apifyClient';

/**
 * LinkedIn-PUBLIC source — uses Google Search actor to surface
 * publicly-indexed LinkedIn posts with buying intent.
 *
 * ⚠️ COMPLIANCE: Never authenticates against LinkedIn directly.
 * Only surfaces content already indexed by Google.
 *
 * Actor: apify/google-search-scraper — verified working ✅
 */

const LINKEDIN_QUERIES = [
  'site:linkedin.com/posts "looking for" "AI agent developer"',
  'site:linkedin.com/posts "looking for" "automation developer"',
  'site:linkedin.com/posts "hiring" "software developer" AI',
  'site:linkedin.com/posts "need a developer" SaaS',
  'site:linkedin.com/posts "looking for" "mobile app developer"',
  'site:linkedin.com/posts "looking for" "full stack developer"',
  'site:linkedin.com/posts "build" "AI chatbot" hire',
  'site:linkedin.com/posts "developer needed" "web app"',
].join('\n');

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: LINKEDIN_QUERIES,
    maxPagesPerQuery: 2,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  // Filter to only LinkedIn results from the Google search
  const linked = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? (item as Record<string, unknown>).link ?? '');
    return url.includes('linkedin.com');
  });

  console.log(`[linkedin-public] Fetched ${items.length} search results, ${linked.length} LinkedIn`);
  return linked;
}
