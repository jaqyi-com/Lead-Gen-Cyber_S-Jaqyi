import { runApifyActor, buildGoogleStartUrls } from './apifyClient';

/**
 * LinkedIn-PUBLIC — decision-maker posts describing projects they need built.
 * Uses tbs=qdr:d2. Excludes [FOR HIRE] freelancers. Targets /posts/ only.
 *
 * ⚠️ COMPLIANCE: Never authenticates against LinkedIn. Content already indexed by Google.
 */

const QUERIES = [
  // AI & Agents project requirement
  'site:linkedin.com/posts "looking to build" "AI agent" OR "AI chatbot" OR "LLM" -"for hire"',
  'site:linkedin.com/posts "need" "AI automation" OR "n8n automation" developer project -"for hire"',
  'site:linkedin.com/posts "looking for" "custom AI" OR "RAG" OR "OpenAI" integration project -"for hire"',
  // SaaS / Platform build
  'site:linkedin.com/posts "need to build" "SaaS" OR "CRM" OR "platform" developer -"for hire"',
  'site:linkedin.com/posts "looking for" "full stack developer" "build" "web app" OR "SaaS" -"for hire"',
  // Mobile apps
  'site:linkedin.com/posts "need" "React Native" OR "Flutter" "app" build developer -"for hire"',
  // Automation / integration
  'site:linkedin.com/posts "need developer" "automation" OR "API integration" project -"for hire"',
  // High value — technical co-founder or CTO type posts
  'site:linkedin.com/posts "technical co-founder" OR "CTO" "looking to build" startup project',
];

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    startUrls: buildGoogleStartUrls(QUERIES, 2),
    maxPagesPerStartUrl: 2,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const linked = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    const title = String((item as Record<string, unknown>).title ?? '').toLowerCase();
    return (
      url.includes('linkedin.com/posts/') &&
      !title.includes('for hire') &&
      !title.includes('[for hire]')
    );
  });

  console.log(`[linkedin-public] ${items.length} results → ${linked.length} posts (last 2 days)`);
  return linked;
}
