/**
 * normalize.ts
 *
 * Maps each source's raw Apify actor output to the canonical RawLead shape.
 * One normalizer function per source; unknown fields are dropped gracefully.
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

// ─── Per-source normalizers ───────────────────────────────────────────────────

function normalizeFreelancer(raw: Record<string, unknown>): RawLead | null {
  const url = str(raw.url ?? raw.jobUrl ?? raw.link ?? raw.id ?? '');
  if (!url) return null;

  return {
    source: 'freelancer',
    title: str(raw.title ?? raw.name ?? 'Untitled'),
    description: str(raw.description ?? raw.snippet ?? raw.details ?? ''),
    url,
    budget: strOpt(raw.budget ?? raw.budgetFormatted ?? raw.price),
    postedAt: str(raw.postedAt ?? raw.date ?? raw.createdAt ?? new Date().toISOString()),
    authorName: strOpt(raw.clientName ?? raw.author ?? raw.username),
    authorHandle: strOpt(raw.clientUsername ?? raw.authorHandle),
  };
}

function normalizeUpwork(raw: Record<string, unknown>): RawLead | null {
  const url = str(raw.url ?? raw.jobUrl ?? raw.link ?? '');
  if (!url) return null;

  const budgetObj = raw.budget as Record<string, unknown> | undefined;
  const budgetFrom = raw.budgetFrom ?? budgetObj?.['from'] ?? raw.hourlyBudgetMin;
  const budgetTo = raw.budgetTo ?? budgetObj?.['to'] ?? raw.hourlyBudgetMax;
  const budgetStr =
    budgetFrom && budgetTo
      ? `$${budgetFrom}–$${budgetTo}`
      : strOpt(raw.budget ?? raw.budgetAmount);

  return {
    source: 'upwork',
    title: str(raw.title ?? raw.name ?? 'Untitled'),
    description: str(raw.description ?? raw.snippet ?? raw.details ?? ''),
    url,
    budget: budgetStr,
    postedAt: str(raw.publishedDate ?? raw.postedAt ?? raw.createdAt ?? new Date().toISOString()),
    authorName: strOpt(raw.clientName ?? raw.author),
    authorHandle: undefined,
  };
}

function normalizeReddit(raw: Record<string, unknown>): RawLead | null {
  const url = str(raw.url ?? raw.permalink ?? '');
  if (!url) return null;

  return {
    source: 'reddit',
    title: str(raw.title ?? 'Untitled'),
    description: str(raw.body ?? raw.selftext ?? raw.text ?? raw.description ?? ''),
    url: url.startsWith('http') ? url : `https://reddit.com${url}`,
    budget: strOpt(raw.budget),
    postedAt: raw.created_utc
      ? new Date(Number(raw.created_utc) * 1000).toISOString()
      : str(raw.postedAt ?? new Date().toISOString()),
    authorName: strOpt(raw.author ?? raw.authorName),
    authorHandle: strOpt(raw.author ?? raw.authorHandle),
  };
}

function normalizeTwitter(raw: Record<string, unknown>): RawLead | null {
  const url = str(raw.url ?? raw.tweetUrl ?? raw.link ?? '');
  if (!url) return null;

  const text = str(raw.text ?? raw.fullText ?? raw.content ?? '');

  return {
    source: 'twitter',
    title: text.slice(0, 100),          // first 100 chars as title proxy
    description: text,
    url,
    budget: strOpt(raw.budget),
    postedAt: str(raw.createdAt ?? raw.date ?? raw.timestamp ?? new Date().toISOString()),
    authorName: strOpt((raw.author as Record<string, unknown>)?.['name'] ?? raw.userName ?? raw.name),
    authorHandle: strOpt((raw.author as Record<string, unknown>)?.['userName'] ?? raw.screenName ?? raw.authorHandle),
  };
}

function normalizeLinkedinPublic(raw: Record<string, unknown>): RawLead | null {
  // Google Search actor returns organicResults array items
  const url = str(raw.url ?? raw.link ?? '');
  if (!url || !url.includes('linkedin.com')) return null;

  return {
    source: 'linkedin-public',
    title: str(raw.title ?? raw.heading ?? 'Untitled'),
    description: str(raw.description ?? raw.snippet ?? raw.text ?? ''),
    url,
    budget: undefined,
    postedAt: str(raw.date ?? raw.publishedDate ?? new Date().toISOString()),
    authorName: strOpt(raw.name ?? raw.author),
    authorHandle: undefined,
  };
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
