import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * LinkedIn-PUBLIC — decision-maker posts looking for development partners.
 * Targets posts asking for custom software development, custom software agencies,
 * custom builders, development studios, dev shops, or vendor recommendations.
 * Excludes [FOR HIRE] freelancers. Targets /posts/ only.
 *
 * ⚠️ COMPLIANCE: Never authenticates against LinkedIn. Content already indexed by Google.
 */

const QUERIES = [
  'site:linkedin.com/posts "looking for a development agency" OR "recommend a dev shop" OR "dev shop recommendation" -"for hire"',
  'site:linkedin.com/posts "looking for custom software development" OR "software development company" -"for hire"',
  'site:linkedin.com/posts "need a team to build" OR "looking for an agency to build" -"for hire"',
  'site:linkedin.com/posts "recommend an agency" SaaS OR MVP OR app OR platform -"for hire"',
  'site:linkedin.com/posts "custom software development" "recommendation" OR "recommend" -"for hire"',
  'site:linkedin.com/posts "looking to hire an agency" AI OR automation OR software -"for hire"',
  'site:linkedin.com/posts "need a developer shop" OR "need a dev studio" build -"for hire"',
  'site:linkedin.com/posts "technical partner" OR "development partner" looking to build -"for hire"',
];

export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('apify/google-search-scraper', {
    queries: buildDatedQueries(QUERIES),
    maxPagesPerQuery: 2,
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
