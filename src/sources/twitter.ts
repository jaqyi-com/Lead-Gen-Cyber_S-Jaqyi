import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Twitter/X — founders and decision makers looking for dev agencies/partners.
 * Uses tbs=qdr:d2 for strictly recent results.
 * Targets /status/ URLs (individual tweets) only.
 */

const QUERIES = [
  'site:twitter.com "looking for" dev agency OR dev shop OR software studio -"for hire"',
  'site:twitter.com "agency to build" SaaS OR app OR MVP -"for hire"',
  'site:twitter.com "recommend" "development agency" OR "dev shop" OR "custom software company" -"for hire"',
  'site:x.com "looking for" dev agency OR dev shop OR software studio -"for hire"',
  'site:x.com "agency to build" SaaS OR app OR MVP -"for hire"',
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
    // Individual tweets only via /status/
    return (url.includes('twitter.com/') || url.includes('x.com/')) && url.includes('/status/');
  });

  console.log(`[twitter] ${items.length} results → ${filtered.length} tweets (last 2 days)`);
  return filtered;
}
