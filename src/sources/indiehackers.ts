import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Indie Hackers — bootstrappers, founders, and indie makers asking for dev agency help,
 * MVP development, or technical partners to build products.
 */

const QUERIES = [
  'site:indiehackers.com/post "looking for developer" OR "hire an agency" OR "dev shop" -"for hire"',
  'site:indiehackers.com/post "need someone to build" SaaS OR MVP OR "web app" -"for hire"',
  'site:indiehackers.com/post "recommend an agency" OR "recommend a dev shop" build',
  'site:indiehackers.com/post "agency to build" OR "cost to build" SaaS OR platform',
  'site:indiehackers.com/post "seeking developer" OR "looking to outsource" build',
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
    return url.includes('indiehackers.com/post');
  });

  console.log(`[indiehackers] ${items.length} results → ${filtered.length} posts (last 2 days)`);
  return filtered;
}
