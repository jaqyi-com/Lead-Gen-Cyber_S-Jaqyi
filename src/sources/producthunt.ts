import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Product Hunt — maker discussions and shoutouts looking for dev shops,
 * MVP builders, AI integrations, or technical development teams.
 */

const QUERIES = [
  'site:producthunt.com/discussions "looking for a developer" OR "recommend an agency" -"for hire"',
  'site:producthunt.com/discussions "dev shop" OR "agency to build" MVP OR SaaS',
  'site:producthunt.com/discussions "need someone to build" OR "looking to build" app',
  'site:producthunt.com/discussions "software development agency" recommendation',
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
    return url.includes('producthunt.com/discussions');
  });

  console.log(`[producthunt] ${items.length} results → ${filtered.length} discussions (last 2 days)`);
  return filtered;
}
