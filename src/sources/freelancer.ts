import { runApifyActor } from './apifyClient';

// skillCategories accepted by piotrv1001/freelancer-jobs-scraper
const SKILL_CATEGORIES = [
  'web-development',
  'mobile-phones',
  'software-development',
  'artificial-intelligence',
  'automation-testing',
  'data-science-analytics',
  'product-management',
  'desktop-applications',
  'network-security',
];

/**
 * Fetches raw job listings from Freelancer.com via Apify.
 * Actor: piotrv1001/freelancer-jobs-scraper
 * Required input: skillCategories (array of category slugs)
 */
export async function fetchLeads(): Promise<Record<string, unknown>[]> {
  const items = await runApifyActor('piotrv1001/freelancer-jobs-scraper', {
    skillCategories: SKILL_CATEGORIES,
    count: 50,
  });
  console.log(`[freelancer] Fetched ${items.length} raw items`);
  return items;
}
