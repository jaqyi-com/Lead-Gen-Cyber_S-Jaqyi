import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * YouTube — community posts, video descriptions, and comment requests seeking developers/agencies.
 */

const QUERIES = [
  'site:youtube.com/post "looking for a developer" OR "looking for an agency to build"',
  'site:youtube.com "need someone to build" SaaS OR "custom software" OR "mobile app" build',
  'site:youtube.com "hiring agency to build" OR "dev shop recommendation"',
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
    return url.includes('youtube.com');
  });

  console.log(`[youtube] ${items.length} results → ${filtered.length} leads (last 2 days)`);
  return filtered;
}
