import { runApifyActor } from './apifyClient';

/**
 * Fetches Upwork job postings via Google Search.
 * Note: Relaxed URL filter — Google may index various upwork.com URL formats.
 */

const QUERIES = [
  'site:upwork.com "AI agent" developer',
  'site:upwork.com "automation" "n8n" OR "workflow" developer',
  'site:upwork.com "SaaS" developer',
  'site:upwork.com "mobile app" React Native OR Flutter',
  'site:upwork.com "Next.js" OR "React" full stack developer',
  'site:upwork.com "OpenAI" OR "ChatGPT" integration',
  'site:upwork.com "Python" "FastAPI" OR "Django" backend',
  'site:upwork.com "machine learning" OR "AI model" engineer',
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

  const upwork = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? (item as Record<string, unknown>).link ?? '');
    return url.includes('upwork.com');
  });

  console.log(`[upwork] ${items.length} Google results → ${upwork.length} Upwork pages`);
  return upwork;
}
