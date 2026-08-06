import { runApifyActor } from './apifyClient';

/**
 * Fetches Freelancer.com job POSTINGS via Google Search.
 * Note: Removed strict /projects URL filter — Google may return other URL formats.
 */

const QUERIES = [
  'site:freelancer.com "need" "AI developer" OR "AI agent"',
  'site:freelancer.com "automation" "n8n" developer project',
  'site:freelancer.com "web app" "full stack" developer project',
  'site:freelancer.com "SaaS" developer project budget',
  'site:freelancer.com "mobile app" developer React Native',
  'site:freelancer.com "OpenAI" OR "ChatGPT" API integration project',
  'site:freelancer.com "chatbot" AI development project',
  'site:freelancer.com "Node.js" "Python" backend project',
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

  const fl = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? (item as Record<string, unknown>).link ?? '');
    return url.includes('freelancer.com');
  });

  console.log(`[freelancer] ${items.length} Google results → ${fl.length} Freelancer pages`);
  return fl;
}
