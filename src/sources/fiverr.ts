import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Fiverr — client buyer requests and enterprise project briefs for custom software & AI.
 */

const QUERIES = [
  'site:fiverr.com "looking for developer" "full stack" OR "AI agent" OR "SaaS" build',
  'site:fiverr.com "need someone to build" "custom web app" OR "mobile app"',
  'site:fiverr.com "custom software" "build platform" budget',
];

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: buildDatedQueries(QUERIES),
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const filtered = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    return url.includes('fiverr.com');
  });

  console.log(`[fiverr] ${items.length} results → ${filtered.length} briefs (last 2 days)`);
  return filtered;
}
