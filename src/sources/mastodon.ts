import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * Mastodon / Fediverse — tech & open-source posts seeking dev agencies and freelancers.
 */

const QUERIES = [
  'site:mastodon.social "looking for a developer" OR "looking for an agency" build',
  'site:fosstodon.org "looking for a developer" OR "need someone to build" SaaS OR app',
  'site:mastodon.online "recommend a dev shop" OR "development agency"',
  'site:techhub.social "agency to build" OR "hire developer to build"',
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
    return url.includes('mastodon') || url.includes('fosstodon') || url.includes('techhub.social');
  });

  console.log(`[mastodon] ${items.length} results → ${filtered.length} posts (last 2 days)`);
  return filtered;
}
