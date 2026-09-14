import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Wellfound (formerly AngelList Talent) — startup contract and project listings.
 */

const QUERIES = [
  'site:wellfound.com "contract" OR "freelance" "build our MVP" OR "development agency"',
  'site:wellfound.com "looking for agency" OR "development partner" SaaS OR app',
  'site:wellfound.com "founding engineer contractor" OR "build project" budget',
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
    return url.includes('wellfound.com');
  });

  console.log(`[wellfound] ${items.length} results → ${filtered.length} leads (last 2 days)`);
  return filtered;
}
