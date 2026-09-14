import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Bluesky — modern social network for tech founders, developers, and builders.
 * Targets /post/ URLs looking for dev shops and custom software teams.
 */

const QUERIES = [
  'site:bsky.app "looking for a developer" OR "looking for an agency" build -"for hire"',
  'site:bsky.app "recommend a dev shop" OR "development agency" -"for hire"',
  'site:bsky.app "need someone to build" SaaS OR app OR MVP -"for hire"',
  'site:bsky.app "hire developer to build" OR "agency to build" -"for hire"',
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
    return url.includes('bsky.app/profile/') && url.includes('/post/');
  });

  console.log(`[bluesky] ${items.length} results → ${filtered.length} posts (last 2 days)`);
  return filtered;
}
