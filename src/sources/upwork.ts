import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Upwork — project/job posts from buyers (not freelancer profiles).
 * Uses tbs=qdr:d2 for strictly recent results.
 * Targets /jobs/ paths which are actual buyer project postings.
 */

const QUERIES = [
  // AI / Agents
  'site:upwork.com/jobs "AI agent" OR "LLM" OR "RAG" developer build',
  'site:upwork.com/jobs "OpenAI" OR "ChatGPT" OR "Anthropic" integration project',
  'site:upwork.com/jobs "AI automation" OR "AI chatbot" build platform',
  // Automation
  'site:upwork.com/jobs "n8n" OR "workflow automation" OR "API integration" build',
  'site:upwork.com/jobs "Zapier" OR "Make.com" automation developer',
  // SaaS / Full-stack
  'site:upwork.com/jobs "SaaS" OR "CRM" OR "platform" build "full stack" developer',
  'site:upwork.com/jobs "Next.js" OR "React" OR "Node.js" "web application" build',
  // Mobile
  'site:upwork.com/jobs "React Native" OR "Flutter" "mobile app" build',
  // Cloud / backend
  'site:upwork.com/jobs "GCP" OR "AWS" OR "Cloud Run" backend system build',
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
    return url.includes('upwork.com/jobs/') || url.includes('upwork.com/freelance-jobs/apply/');
  });

  console.log(`[upwork] ${items.length} results → ${filtered.length} job posts (last 2 days)`);
  return filtered;
}
