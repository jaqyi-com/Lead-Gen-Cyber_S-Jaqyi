import { runApifyActor } from './apifyClient';

/**
 * LinkedIn-PUBLIC source — uses Google Search to find LinkedIn posts with buying intent.
 * Targets linkedin.com/posts/ and linkedin.com/pulse/ individual posts only.
 *
 * ⚠️ COMPLIANCE: Never authenticates against LinkedIn directly.
 * Only surfaces content already indexed by Google.
 */

const LINKEDIN_QUERIES = [
  'site:linkedin.com/posts "looking for" "AI developer" OR "AI agent developer"',
  'site:linkedin.com/posts "looking to hire" "automation" OR "n8n" developer',
  'site:linkedin.com/posts "hiring" "full stack" OR "Next.js" developer',
  'site:linkedin.com/posts "need a developer" SaaS OR "web app"',
  'site:linkedin.com/posts "looking for" "mobile app developer" React Native',
  'site:linkedin.com/posts "build" "AI chatbot" hire budget',
  'site:linkedin.com/posts "developer needed" software OR "web application"',
  'site:linkedin.com/posts "CTO" OR "technical co-founder" "looking for" startup',
  'site:linkedin.com/pulse "hire" "AI developer" OR "automation developer" 2026',
].join('\n');

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: LINKEDIN_QUERIES,
    maxPagesPerQuery: 2,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const linked = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    // Individual posts only — has activity ID or /posts/ with long slug
    return (
      url.includes('linkedin.com/posts/') ||
      url.includes('linkedin.com/pulse/') ||
      url.includes('linkedin.com/feed/update/')
    );
  });

  console.log(`[linkedin-public] ${items.length} Google results → ${linked.length} LinkedIn posts`);
  return linked;
}
