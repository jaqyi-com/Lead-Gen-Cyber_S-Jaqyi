import { runApifyActor } from './apifyClient';
import { SOCIAL_KEYWORDS } from '../config/keywords';

/**
 * Fetches raw job listings from Upwork via Apify.
 * Actor: getdataforme/upwork-actor
 * Required input: queries (array of search strings)
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('getdataforme/upwork-actor', {
    queries: SOCIAL_KEYWORDS.slice(0, 10),
    maxItems: 60,
  });
  console.log(`[upwork] Fetched ${items.length} raw items`);
  return items;
}
