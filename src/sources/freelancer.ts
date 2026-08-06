import { runApifyActor } from './apifyClient';

/**
 * Finds buyers on Freelancer via Google Search.
 * Targets SPECIFIC PROJECT PAGES (freelancer.com/projects/ID) not category listing pages.
 * Uses "inurl:projects" to find individual project posts from buyers.
 */

const QUERIES = [
  'inurl:freelancer.com/projects "AI agent" OR "AI automation" budget',
  'inurl:freelancer.com/projects "n8n" OR "workflow automation"',
  'inurl:freelancer.com/projects "SaaS" OR "web app" developer',
  'inurl:freelancer.com/projects "Next.js" OR "React" full stack',
  'inurl:freelancer.com/projects "OpenAI" OR "ChatGPT" OR "GPT-4"',
  'inurl:freelancer.com/projects "mobile app" React Native OR Flutter',
  'inurl:freelancer.com/projects "Python" automation OR scraper',
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
    // Only individual project pages, not category listing pages
    return url.includes('freelancer.com/projects/') && /\/\d+/.test(url);
  });

  console.log(`[freelancer] ${items.length} results → ${filtered.length} individual project pages`);
  return filtered;
}
