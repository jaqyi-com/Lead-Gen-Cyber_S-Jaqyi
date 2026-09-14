import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Clutch — client project briefs and RFPs looking for development agencies.
 */

const QUERIES = [
  'site:clutch.co/projects "looking for" "development company" OR "agency"',
  'site:clutch.co/projects "need a team to build" OR "software development"',
  'site:clutch.co "request for proposal" OR "project brief" software build',
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
    return url.includes('clutch.co');
  });

  console.log(`[clutch] ${items.length} results → ${filtered.length} leads (last 2 days)`);
  return filtered;
}
