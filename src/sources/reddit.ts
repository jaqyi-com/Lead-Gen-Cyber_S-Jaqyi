import { runApifyActor, buildGoogleStartUrls } from './apifyClient';

/**
 * Reddit — [HIRING] project requirement posts with budgets from r/forhire.
 * Uses tbs=qdr:d2. Excludes [FOR HIRE] (freelancer ads) via -"for hire".
 * Only accepts individual thread posts (/comments/).
 */

const QUERIES = [
  // AI / Agent project requirements with budget
  'site:reddit.com/r/forhire "[hiring]" "AI agent" OR "AI system" OR "RAG" budget -"for hire"',
  'site:reddit.com/r/forhire "[hiring]" "automation" OR "n8n" OR "workflow" project budget -"for hire"',
  'site:reddit.com/r/forhire "[hiring]" "SaaS" OR "web app" OR "platform" build budget -"for hire"',
  'site:reddit.com/r/forhire "[hiring]" "Next.js" OR "React" OR "Node.js" project -"for hire"',
  'site:reddit.com/r/forhire "[hiring]" "mobile app" OR "React Native" OR "Flutter" -"for hire"',
  // r/slavelabour & r/hiring for bigger budgets
  'site:reddit.com/r/forhire "[hiring]" "$" "USD" developer OR engineer project -"for hire"',
  'site:reddit.com/r/entrepreneurs "[hiring]" OR "need developer" OR "need engineer" project',
  // Startups looking to build
  'site:reddit.com/r/startups "need developer" OR "looking to build" "web app" OR "platform" budget',
];

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    startUrls: buildGoogleStartUrls(QUERIES, 2),
    maxPagesPerStartUrl: 1,
    resultsPerPage: 10,
    languageCode: 'en',
    countryCode: 'us',
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  });

  // Only individual Reddit thread posts — not subreddit home pages
  const filtered = items.filter((item) => {
    const url = String((item as Record<string, unknown>).url ?? '');
    const title = String((item as Record<string, unknown>).title ?? '').toLowerCase();
    // Must be /comments/ thread AND not a [FOR HIRE] or profile post
    return (
      url.includes('reddit.com') &&
      url.includes('/comments/') &&
      !title.includes('[for hire]') &&
      !title.includes('for hire]')
    );
  });

  console.log(`[reddit] ${items.length} results → ${filtered.length} [HIRING] threads (last 2 days)`);
  return filtered;
}
