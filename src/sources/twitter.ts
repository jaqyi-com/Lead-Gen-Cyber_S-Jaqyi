import { runApifyActor } from './apifyClient';
import { SOCIAL_KEYWORDS } from '../config/keywords';

/**
 * Fetches tweets via Apify.
 * Actor: apify/twitter-scraper (correct actor ID — note: apify/twitter-scraper v2)
 * Input: searchTerms (array of search query strings)
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const searchTerms = SOCIAL_KEYWORDS.slice(0, 8).map(
    (kw) => `"${kw}" -is:retweet lang:en`
  );

  const items = await runApifyActor('apify/twitter-scraper', {
    searchTerms,
    maxTweets: 50,
    queryType: 'Latest',
  });
  console.log(`[twitter] Fetched ${items.length} raw items`);
  return items;
}
