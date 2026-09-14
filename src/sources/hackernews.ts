import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Hacker News (Y Combinator) — founders & engineers posting project requests,
 * Ask HN threads, and freelance/contract development needs.
 */

const QUERIES = [
  'site:news.ycombinator.com "Ask HN:" "looking for" agency OR "dev shop" OR developer',
  'site:news.ycombinator.com "Ask HN: Who is hiring" OR "Seeking Freelancer" project',
  'site:news.ycombinator.com "recommend a development agency" OR "recommend a dev shop"',
  'site:news.ycombinator.com "hire a team to build" OR "agency to build" SaaS OR MVP',
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
    return url.includes('news.ycombinator.com/item');
  });

  console.log(`[hackernews] ${items.length} results → ${filtered.length} threads (last 2 days)`);
  return filtered;
}
