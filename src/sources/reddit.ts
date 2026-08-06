import { runApifyActor } from './apifyClient';

/**
 * Finds buyer-intent posts on Reddit.
 * Targets [HIRING] and "looking for developer" posts in relevant subreddits.
 * Filters to actual Reddit thread posts (not subreddit home pages).
 */

const QUERIES = [
  'site:reddit.com/r/forhire "[hiring]" AI developer OR AI agent',
  'site:reddit.com/r/forhire "[hiring]" automation developer n8n',
  'site:reddit.com/r/forhire "[hiring]" SaaS developer web app',
  'site:reddit.com/r/forhire "[hiring]" mobile app React Native Flutter',
  'site:reddit.com/r/forhire "[hiring]" Next.js React full stack',
  'site:reddit.com/r/hiring "looking for" AI developer budget',
  'site:reddit.com/r/entrepreneur "looking to hire" developer software',
  'site:reddit.com/r/startups "need a developer" OR "hire developer" budget',
  'site:reddit.com/r/SaaS "need developer" OR "looking for CTO" technical',
].join('\n');

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: QUERIES,
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const filtered = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    // Only individual thread posts (have /comments/ in URL), not subreddit home pages
    return url.includes('reddit.com') && url.includes('/comments/');
  });

  console.log(`[reddit] ${items.length} results → ${filtered.length} Reddit threads`);
  return filtered;
}
