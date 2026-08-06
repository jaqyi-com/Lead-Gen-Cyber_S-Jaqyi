import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Freelancer.com — project REQUIREMENT posts (buyers posting projects they need built).
 * Uses tbs=qdr:d2 (Google "Past 2 days") for strict freshness.
 * Targets individual project pages only — not category listings or profiles.
 */

const QUERIES = [
  // AI / Agents / LLM
  'site:freelancer.com/projects "AI agent" OR "AI automation" OR "RAG" developer budget',
  'site:freelancer.com/projects "OpenAI" OR "LangChain" OR "ChatGPT API" integration build',
  'site:freelancer.com/projects "custom AI" OR "AI chatbot" OR "LLM" system build',
  // Automation & n8n
  'site:freelancer.com/projects "n8n" OR "workflow automation" OR "Zapier" build',
  'site:freelancer.com/projects "automation" "API integration" OR "webhook" build project',
  // SaaS / Full-stack
  'site:freelancer.com/projects "SaaS" OR "web application" OR "CRM" build "full stack"',
  'site:freelancer.com/projects "Next.js" OR "React" OR "Node.js" "web app" build',
  // Mobile
  'site:freelancer.com/projects "React Native" OR "Flutter" "mobile app" build',
  // High budget
  'site:freelancer.com/projects "$" "USD" developer "build" "platform" OR "system"',
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
    if (!url.includes('freelancer.com/projects/')) return false;
    // Must have 2+ path segments after /projects/ = individual project page
    // e.g. /projects/javascript/chatgpt-api-integration-39786270
    const afterProjects = url.split('/projects/')[1] ?? '';
    return afterProjects.split('/').length >= 2;
  });

  console.log(`[freelancer] ${items.length} results → ${filtered.length} project pages (last 2 days)`);
  return filtered;
}
