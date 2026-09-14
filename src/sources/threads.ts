import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Threads (Meta) — tech founders, creators, and business owners looking for developers & dev agencies.
 * Targets /post/ URLs on threads.net.
 */

const QUERIES = [
  'site:threads.net "looking for a developer" OR "looking for an agency" to build -"for hire"',
  'site:threads.net "recommend a dev shop" OR "recommend a development agency" -"for hire"',
  'site:threads.net "need someone to build" SaaS OR MVP OR app OR website -"for hire"',
  'site:threads.net "building my MVP" "need a developer" OR "looking for a team"',
  'site:threads.net "agency to build" OR "hire a developer to build" -"for hire"',
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
    return url.includes('threads.net');
  });

  console.log(`[threads] ${items.length} results → ${filtered.length} posts (last 2 days)`);
  return filtered;
}
