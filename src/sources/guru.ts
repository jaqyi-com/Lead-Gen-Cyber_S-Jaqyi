import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Guru — enterprise & SMB project postings for custom software development.
 */

const QUERIES = [
  'site:guru.com/d/jobs "AI agent" OR "full stack" OR "custom software" build',
  'site:guru.com/d/jobs "SaaS" OR "web application" OR "automation" developer',
  'site:guru.com/d/jobs "mobile app" OR "Next.js" OR "React" build project',
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
    return url.includes('guru.com/d/jobs');
  });

  console.log(`[guru] ${items.length} results → ${filtered.length} jobs (last 2 days)`);
  return filtered;
}
