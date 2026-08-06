import { runApifyActor } from './apifyClient';
import { SOCIAL_KEYWORDS } from '../config/keywords';
import { TARGET_SUBREDDITS } from '../config/subreddits';

/**
 * Fetches Reddit posts via Apify using search URLs.
 * Actor: apify/reddit-scraper (official free Apify actor)
 * Input: startUrls with Reddit search URLs
 *
 * Note: trudax/reddit-scraper requires a paid subscription.
 * apify/reddit-scraper is the official free alternative.
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  // Build Reddit search URLs for top subreddits × top keywords
  const searchUrls = TARGET_SUBREDDITS.slice(0, 5).flatMap((sub) =>
    SOCIAL_KEYWORDS.slice(0, 3).map((kw) => ({
      url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(kw)}&sort=new&restrict_sr=1`,
    }))
  );

  const items = await runApifyActor('apify/reddit-scraper', {
    startUrls: searchUrls,
    maxItems: 100,
    skipComments: true,
  });
  console.log(`[reddit] Fetched ${items.length} raw items`);
  return items;
}
