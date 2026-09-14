import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Telegram — public channels & group posts looking for software developers,
 * custom bots, AI agents, and development agencies.
 */

const QUERIES = [
  'site:t.me "looking for developer" OR "looking for agency" build',
  'site:t.me "need a bot built" OR "need a developer to build" budget',
  'site:t.me "hiring dev shop" OR "custom software development" project',
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
    return url.includes('t.me/');
  });

  console.log(`[telegram] ${items.length} results → ${filtered.length} posts (last 2 days)`);
  return filtered;
}
