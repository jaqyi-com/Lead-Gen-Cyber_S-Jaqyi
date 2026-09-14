import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Facebook — public posts and group requests looking for dev agencies & developers.
 * Targets business owners & founders asking for dev shop/agency recommendations,
 * custom app/website development, or MVP builds.
 */

const QUERIES = [
  'site:facebook.com "looking for a developer to build" OR "looking for an agency to build" -"for hire"',
  'site:facebook.com "recommend a web developer" OR "recommend a dev shop" OR "development agency" -"for hire"',
  'site:facebook.com "need someone to build" SaaS OR MVP OR "custom software" -"for hire"',
  'site:facebook.com/groups "looking to hire an agency" OR "need a dev team" build',
  'site:facebook.com/groups "recommend a software company" OR "recommend a web agency"',
  'site:facebook.com "hiring developer to build" app OR website OR system -"job vacancy"',
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
    const title = String((item as Record<string, unknown>).title ?? '').toLowerCase();
    return (
      url.includes('facebook.com') &&
      !title.includes('[for hire]') &&
      !title.includes('for hire]')
    );
  });

  console.log(`[facebook] ${items.length} results → ${filtered.length} leads (last 2 days)`);
  return filtered;
}
