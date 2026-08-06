import { runApifyActor } from './apifyClient';

/**
 * Fetches Freelancer.com job POSTINGS (buyer intent) using Google Search actor
 * scraping site:freelancer.com/projects/ — verified working.
 *
 * The piotrv1001/freelancer-jobs-scraper actor returns PROFILES (freelancers for
 * hire), not job listings (buyers). So we use Google Search to find actual project
 * postings from people looking to hire.
 */

const QUERIES = [
  'site:freelancer.com/projects AI agent developer',
  'site:freelancer.com/projects automation n8n workflow',
  'site:freelancer.com/projects "full stack" web app',
  'site:freelancer.com/projects SaaS development',
  'site:freelancer.com/projects mobile app developer React Native',
  'site:freelancer.com/projects OpenAI GPT API integration',
  'site:freelancer.com/projects Node.js Python backend',
  'site:freelancer.com/projects chatbot AI software',
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

  // Filter to freelancer.com/projects URLs only
  const projectItems = items.filter((item) => {
    const url = String(
      (item as Record<string, unknown>).url ??
      (item as Record<string, unknown>).link ?? ''
    );
    return url.includes('freelancer.com/projects') || url.includes('freelancer.com/contest');
  });

  console.log(`[freelancer] ${items.length} search results → ${projectItems.length} project listings`);
  return projectItems;
}
