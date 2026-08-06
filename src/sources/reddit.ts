import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Reddit — Project requirements and service recommendations.
 * Targets founder/business subreddits (r/entrepreneur, r/startups, r/SaaS, r/smallbusiness)
 * where people are asking for custom agency, custom builder, dev shop recommendations,
 * or custom build requests (rather than general employee hiring threads).
 *
 * Uses tbs=qdr:d2. Only accepts individual thread comments.
 */

const QUERIES = [
  'site:reddit.com/r/entrepreneur "looking for agency" OR "hire agency" OR "dev shop" OR "development studio"',
  'site:reddit.com/r/entrepreneur "agency to build" OR "hire developer to build" SaaS OR MVP OR app',
  'site:reddit.com/r/startups "looking for agency" OR "recommend an agency" OR "development company"',
  'site:reddit.com/r/startups "agency to build" OR "cost to build" SaaS OR "web app" OR MVP',
  'site:reddit.com/r/SaaS "looking for agency" OR "development partner" OR "build my SaaS" MVP',
  'site:reddit.com/r/smallbusiness "custom software" OR "custom app" "development agency" OR "dev shop"',
  'site:reddit.com/r/AppDevelopment "agency" OR "company" OR "studio" "looking to build" OR "recommend"',
  'site:reddit.com/r/RequestADev "build this" OR "can someone build" OR "need an app" budget',
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

  // Only individual Reddit thread posts — not subreddit home pages
  const filtered = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    const title = String((item as Record<string, unknown>).title ?? '').toLowerCase();
    // Must be /comments/ thread AND not a [FOR HIRE] self-promotion
    return (
      url.includes('reddit.com') &&
      url.includes('/comments/') &&
      !title.includes('[for hire]') &&
      !title.includes('for hire]')
    );
  });

  console.log(`[reddit] ${items.length} results → ${filtered.length} project recommendation threads (last 2 days)`);
  return filtered;
}
