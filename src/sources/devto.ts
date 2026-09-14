import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Dev.to — collaboration, hiring, and project requests from makers & founders.
 */

const QUERIES = [
  'site:dev.to "looking for a developer" OR "looking for an agency" build',
  'site:dev.to "need a team to build" OR "looking to outsource" SaaS OR app',
  'site:dev.to "recommend a dev shop" OR "development agency"',
  'site:dev.to/t/collab "building a project" OR "need developers"',
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
    return url.includes('dev.to');
  });

  console.log(`[devto] ${items.length} results → ${filtered.length} posts (last 2 days)`);
  return filtered;
}
