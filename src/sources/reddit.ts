import { runApifyActor } from './apifyClient';

/**
 * Fetches Reddit posts from buying-intent subreddits using Google Search.
 * - apify/reddit-scraper is 404 (actor doesn't exist at that slug)
 * - trudax/reddit-scraper requires a paid subscription
 * - Google Search on site:reddit.com is free, reliable, and works well
 */

const REDDIT_QUERIES = [
  'site:reddit.com/r/forhire "[hiring]" AI developer',
  'site:reddit.com/r/forhire "[hiring]" automation developer',
  'site:reddit.com/r/forhire "[hiring]" SaaS developer',
  'site:reddit.com/r/forhire "[hiring]" web app developer',
  'site:reddit.com/r/forhire "[hiring]" mobile app developer',
  'site:reddit.com/r/hiring "AI agent" developer',
  'site:reddit.com/r/entrepreneur "looking for developer" OR "need a developer"',
  'site:reddit.com/r/startups "looking for" developer hire budget',
  'site:reddit.com/r/SaaS "need developer" OR "looking for developer"',
].join('\n');

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: REDDIT_QUERIES,
    maxPagesPerQuery: 1,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const redditItems = items.filter((item) => {
    const url = String(
      (item as Record<string, unknown>).url ??
      (item as Record<string, unknown>).link ?? ''
    );
    return url.includes('reddit.com');
  });

  console.log(`[reddit] ${items.length} Google results → ${redditItems.length} Reddit posts`);
  return redditItems;
}
