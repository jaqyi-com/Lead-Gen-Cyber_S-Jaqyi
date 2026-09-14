import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Craigslist — computer and software gigs posted by US business owners.
 */

const QUERIES = [
  'site:craigslist.org/cpg "looking for developer" OR "need an app built" OR "need a website built"',
  'site:craigslist.org/cpg "custom software" OR "SaaS" OR "automation" developer budget',
  'site:craigslist.org/cpg "agency" OR "programmer to build" -"seeking job"',
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
    return url.includes('craigslist.org') && url.includes('/cpg/');
  });

  console.log(`[craigslist] ${items.length} results → ${filtered.length} gigs (last 2 days)`);
  return filtered;
}
