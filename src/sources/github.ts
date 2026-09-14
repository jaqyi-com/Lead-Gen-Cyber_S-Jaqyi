import { runApifyActor, buildDatedQueries } from './apifyClient';

/**
 * GitHub — discussions, issues, and repository requests looking for contract developers,
 * dev studios, integration help, and project builders.
 */

const QUERIES = [
  'site:github.com "looking for a developer to build" OR "looking for contractor" -"hiring employee"',
  'site:github.com "paid bounty" OR "bounty to build" OR "contract to build" project',
  'site:github.com/orgs/*/discussions "looking to hire" OR "recommend an agency"',
  'site:github.com "need someone to build" integration OR "custom bot" OR plugin',
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
    return url.includes('github.com') && (url.includes('/issues/') || url.includes('/discussions/'));
  });

  console.log(`[github] ${items.length} results → ${filtered.length} leads (last 2 days)`);
  return filtered;
}
