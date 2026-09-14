import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Quora — questions and requests from entrepreneurs looking for agency recommendations
 * to build applications, MVPs, and custom platforms.
 */

const QUERIES = [
  'site:quora.com "recommend a development agency" OR "recommend a dev shop" build',
  'site:quora.com "how to find an agency to build" SaaS OR app OR MVP',
  'site:quora.com "looking for someone to build" app OR website OR "software system"',
  'site:quora.com "best development agency to build" SaaS OR platform',
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
    return url.includes('quora.com');
  });

  console.log(`[quora] ${items.length} results → ${filtered.length} questions/answers (last 2 days)`);
  return filtered;
}
