/**
 * normalize.ts
 *
 * Maps each source's raw Apify actor output to the canonical RawLead shape.
 * ALL sources now use apify/google-search-scraper, so fields are consistent.
 * Source-specific normalizers add domain-level URL validation only.
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
  budget?: string;
  postedAt: string;
  authorName?: string;
  authorHandle?: string;
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
  const url = str(raw.url ?? raw.link ?? '');
  if (!url || !domainCheck(url)) return null;

  // Try to extract budget from snippet (e.g. "$500", "$50/hr")
  const snippet = str(raw.description ?? raw.snippet ?? raw.text ?? '');
  const budgetMatch = snippet.match(/\$[\d,]+(?:\/hr|\/hour|k|K)?/);

  return {
    source,
    title: str(raw.title ?? raw.heading ?? 'Untitled'),
    description: snippet,
    url,
    budget: budgetMatch ? budgetMatch[0] : strOpt(raw.budget),
    postedAt: str(raw.date ?? raw.publishedDate ?? new Date().toISOString()),
    authorName: strOpt(raw.name ?? raw.author ?? raw.displayLink),
    authorHandle: undefined,
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
