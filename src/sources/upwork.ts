import { runApifyActor } from './apifyClient';

/**
 * Finds buyers on Upwork via Google Search.
 * Targets SPECIFIC JOB POSTS (upwork.com/jobs/ID) not category listing pages.
 */

const QUERIES = [
  'inurl:upwork.com/jobs "AI agent" OR "AI automation" developer',
  'inurl:upwork.com/jobs "n8n" OR "workflow automation" developer',
  'inurl:upwork.com/jobs "SaaS" product developer',
  'inurl:upwork.com/jobs "Next.js" OR "React" full stack',
  'inurl:upwork.com/jobs "OpenAI" OR "ChatGPT" integration',
  'inurl:upwork.com/jobs "mobile app" React Native OR Flutter',
  'inurl:upwork.com/jobs "machine learning" OR "LLM" engineer',
].join('\n');

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: QUERIES,
    maxPagesPerQuery: 2,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const filtered = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    // Individual Upwork job posts have ~_V2/ pattern or /jobs/ with slug
    return url.includes('upwork.com/jobs/') || url.includes('upwork.com/freelance-jobs/');
  });

  console.log(`[upwork] ${items.length} results → ${filtered.length} individual job posts`);
  return filtered;
}
