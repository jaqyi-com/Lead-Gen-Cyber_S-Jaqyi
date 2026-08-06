import { runApifyActor } from './apifyClient';

/**
 * Finds buyer-intent signals on Twitter/X via Google Search.
 * Looks for individual tweets where people are actively looking to hire.
 */

const QUERIES = [
  'site:twitter.com "looking for" "AI developer" OR "AI engineer" hire budget',
  'site:twitter.com "need" "automation developer" OR "n8n developer"',
  'site:twitter.com "hiring" "full stack developer" OR "React developer" remote',
  'site:twitter.com "looking to hire" developer SaaS OR "web app"',
  'site:x.com "looking for" developer "AI" OR "automation" budget',
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
    // Individual tweet or post — contains a username path segment
    return (url.includes('twitter.com/') || url.includes('x.com/')) &&
      (url.includes('/status/') || url.split('/').length > 4);
  });

  console.log(`[twitter] ${items.length} results → ${filtered.length} Twitter/X posts`);
  return filtered;
}
