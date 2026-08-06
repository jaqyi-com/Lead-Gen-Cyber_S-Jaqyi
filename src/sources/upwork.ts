import { runApifyActor } from './apifyClient';
import { SOCIAL_KEYWORDS } from '../config/keywords';

/**
 * Fetches Upwork job postings via Google Search scraper.
 *
 * The getdataforme/upwork-actor requires login and often times out.
 * Using apify/google-search-scraper on site:upwork.com/jobs/ is more
 * reliable and returns actual job postings with budget info in snippets.
 */

const UPWORK_QUERIES = [
  'site:upwork.com/jobs "AI agent" developer',
  'site:upwork.com/jobs "automation" "n8n" OR "workflow"',
  'site:upwork.com/jobs "SaaS" developer',
  'site:upwork.com/jobs "mobile app" React Native OR Flutter',
  'site:upwork.com/jobs "Next.js" OR "React" full stack',
  'site:upwork.com/jobs "OpenAI" OR "ChatGPT" integration',
  'site:upwork.com/jobs "Python" "FastAPI" OR "Django"',
  'site:upwork.com/jobs "machine learning" engineer',
].join('\n');

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: UPWORK_QUERIES,
    maxPagesPerQuery: 2,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  const upworkItems = items.filter((item) => {
    const url = String(
      (item as Record<string, unknown>).url ??
      (item as Record<string, unknown>).link ?? ''
    );
    return url.includes('upwork.com/jobs') || url.includes('upwork.com/freelance-jobs');
  });

  console.log(`[upwork] ${items.length} Google results → ${upworkItems.length} Upwork jobs`);
  return upworkItems;
}
