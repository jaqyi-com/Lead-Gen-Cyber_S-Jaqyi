/**
 * normalize.ts
 *
 * Maps each source's raw Apify actor output to the canonical RawLead shape.
 * ALL sources now use apify/google-search-scraper, so fields are consistent.
 * Source-specific normalizers add domain-level URL validation only.
 *
 * Spec §2.1 normalized lead object fields added:
 *   - budget_min, budget_max, currency (structured from budget string)
 *   - client_profile_url (platform profile URL when available)
 */

export type SourceName =
  | 'freelancer'
  | 'upwork'
  | 'reddit'
  | 'twitter'
  | 'linkedin-public';

export interface RawLead {
  source: SourceName;
  title: string;
  description: string;
  url: string;
  // Legacy single-string budget (kept for backward compat with digest/sheets)
  budget?: string;
  // Spec §2.1 structured budget fields
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string;
  postedAt: string;
  authorName?: string;
  authorHandle?: string;
  // Spec §2.1 client fields
  client_profile_url?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : String(v ?? '').trim();
}

function strOpt(v: unknown): string | undefined {
  const s = str(v);
  return s.length > 0 ? s : undefined;
}

/**
 * Parse a budget string into structured min/max/currency fields.
 * Handles: "$500", "$1,500–$5,000", "$5k", "5000 USD", "$10/hr"
 */
function parseBudget(raw: string): { budget_min: number | null; budget_max: number | null; currency: string } {
  const currency = /\b(GBP|EUR|AUD|CAD|INR)\b/i.exec(raw)?.[1]?.toUpperCase() ?? 'USD';

  // Extract all numeric values (handles comma-separated thousands and 'k' suffix)
  const amounts = [...raw.matchAll(/\$?([\d,]+\.?\d*)\s*(k|K)?/g)].map((m) => {
    const num = parseFloat(m[1].replace(/,/g, ''));
    return m[2] ? num * 1000 : num;
  });

  if (amounts.length === 0) return { budget_min: null, budget_max: null, currency };
  if (amounts.length === 1) return { budget_min: amounts[0], budget_max: amounts[0], currency };
  return { budget_min: Math.min(...amounts), budget_max: Math.max(...amounts), currency };
}

/**
 * Google Search Scraper output fields:
 *   url / link      — the result page URL
 *   title           — page title
 *   description     — snippet text
 *   date            — optional date from search
 *   name / author   — optional site name
 */
function normalizeGoogleSearchResult(
  raw: Record<string, unknown>,
  source: SourceName,
  domainCheck: (url: string) => boolean
): RawLead | null {
  // apify/google-search-scraper organicResult fields:
  //   url, title, description, websiteTitle, displayedUrl, emphasizedKeywords
  const url = str(raw.url ?? raw.link ?? '');
  if (!url || !domainCheck(url)) return null;

  const title = str(raw.title ?? raw.heading ?? '');
  const description = str(raw.description ?? raw.snippet ?? raw.text ?? '');

  // Skip items with no meaningful content
  if (!title && !description) return null;

  // Try to extract budget from title or snippet (e.g. "$500", "$50/hr", "$5k")
  const combined = `${title} ${description}`;
  const budgetMatch = combined.match(/\$[\d,]+(?:–\$[\d,]+)?(?:\/hr|\/hour|k|K)?/);
  const budgetRaw = budgetMatch ? budgetMatch[0] : strOpt(raw.budget as unknown);

  const { budget_min, budget_max, currency } = budgetRaw
    ? parseBudget(budgetRaw)
    : { budget_min: null, budget_max: null, currency: 'USD' };

  return {
    source,
    title: title || description.slice(0, 80) || 'Untitled',
    description,
    url,
    budget: budgetRaw,
    budget_min,
    budget_max,
    currency,
    postedAt: str(raw.date ?? raw.publishedDate ?? new Date().toISOString()),
    authorName: strOpt(raw.websiteTitle ?? raw.name ?? raw.author ?? raw.displayLink),
    authorHandle: undefined,
    client_profile_url: undefined, // Platform profile URLs not available via Google search
  };
}

// ─── Per-source normalizers ───────────────────────────────────────────────────

function normalizeFreelancer(raw: Record<string, unknown>): RawLead | null {
  return normalizeGoogleSearchResult(raw, 'freelancer', (url) =>
    url.includes('freelancer.com')
  );
}

function normalizeUpwork(raw: Record<string, unknown>): RawLead | null {
  return normalizeGoogleSearchResult(raw, 'upwork', (url) =>
    url.includes('upwork.com')
  );
}

function normalizeReddit(raw: Record<string, unknown>): RawLead | null {
  return normalizeGoogleSearchResult(raw, 'reddit', (url) =>
    url.includes('reddit.com')
  );
}

function normalizeTwitter(raw: Record<string, unknown>): RawLead | null {
  return normalizeGoogleSearchResult(raw, 'twitter', (url) =>
    url.includes('twitter.com') || url.includes('x.com')
  );
}

function normalizeLinkedinPublic(raw: Record<string, unknown>): RawLead | null {
  return normalizeGoogleSearchResult(raw, 'linkedin-public', (url) =>
    url.includes('linkedin.com')
  );
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const normalizers: Record<
  SourceName,
  (raw: Record<string, unknown>) => RawLead | null
> = {
  freelancer: normalizeFreelancer,
  upwork: normalizeUpwork,
  reddit: normalizeReddit,
  twitter: normalizeTwitter,
  'linkedin-public': normalizeLinkedinPublic,
};

/**
 * Normalizes an array of raw Apify items for a given source.
 * Invalid/incomplete items are dropped (null returned → filtered).
 */
export function normalizeLeads(
  source: SourceName,
  rawItems: Record<string, unknown>[]
): RawLead[] {
  const normalizer = normalizers[source];
  const results: RawLead[] = [];

  for (const item of rawItems) {
    try {
      const lead = normalizer(item);
      if (lead) results.push(lead);
    } catch (err) {
      console.warn(`[normalize] Skipped malformed ${source} item:`, err);
    }
  }

  console.log(`[normalize] ${source}: ${rawItems.length} raw → ${results.length} valid leads`);
  return results;
}
