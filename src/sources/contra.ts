import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Contra — independent client briefs and project opportunities.
 */

const QUERIES = [
  'site:contra.com "looking for" developer OR engineer OR agency build',
  'site:contra.com/opportunity "build" SaaS OR app OR "AI agent" OR "full stack"',
  'site:contra.com "project brief" "development" budget',
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
    return url.includes('contra.com');
  });

  console.log(`[contra] ${items.length} results → ${filtered.length} opportunities (last 2 days)`);
  return filtered;
}
