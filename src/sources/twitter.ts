import { runApifyActor, buildGoogleStartUrls } from './apifyClient';

/**
 * Twitter/X — decision makers posting project requirements.
 * Uses tbs=qdr:d2 for strictly recent results.
 * Targets /status/ URLs (individual tweets) only.
 */

const QUERIES = [
  // Project requirements with budget signals
  'site:twitter.com "need to build" "AI agent" OR "AI system" budget -"for hire"',
  'site:twitter.com "looking for" "AI developer" OR "AI engineer" "build" budget',
  'site:twitter.com "need" "automation" OR "n8n" developer "project" -"for hire"',
  'site:twitter.com "hiring" "full stack" OR "Next.js" "build" "SaaS" OR "platform"',
  'site:x.com "looking to build" "AI" OR "automation" OR "SaaS" developer budget',
];

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    startUrls: buildGoogleStartUrls(QUERIES, 2),
    maxPagesPerStartUrl: 1,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const filtered = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    // Individual tweets only via /status/
    return (url.includes('twitter.com/') || url.includes('x.com/')) && url.includes('/status/');
  });

  console.log(`[twitter] ${items.length} results → ${filtered.length} tweets (last 2 days)`);
  return filtered;
}
