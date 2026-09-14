import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * PeoplePerHour — buyer project proposals and contract development listings.
 */

const QUERIES = [
  'site:peopleperhour.com/freelance-jobs "full stack" OR "AI" OR "SaaS" build',
  'site:peopleperhour.com/freelance-jobs "web application" OR "automation" developer',
  'site:peopleperhour.com/freelance-jobs "custom software" OR "mobile app" project',
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
    return url.includes('peopleperhour.com/freelance-jobs');
  });

  console.log(`[peopleperhour] ${items.length} results → ${filtered.length} projects (last 2 days)`);
  return filtered;
}
