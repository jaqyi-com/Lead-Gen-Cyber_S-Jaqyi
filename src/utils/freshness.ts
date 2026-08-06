/**
 * freshness.ts — date-range helpers for the lead pipeline
 *
 * FRESHNESS_DAYS controls how many days back to look for leads.
 * Default: 2 days (set via FRESHNESS_DAYS env var)
 */

const FRESHNESS_DAYS = parseInt(process.env.FRESHNESS_DAYS ?? '2', 10);

/**
 * Returns the date string N days ago in YYYY-MM-DD format.
 * Used for Google Search `after:` operator.
 */
export function afterDateString(daysBack = FRESHNESS_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10); // "2026-08-04"
}

/**
 * Returns true if a date string or ISO timestamp is within the freshness window.
 * Accepts: ISO 8601 strings, "Aug 5, 2026", "2 days ago", etc.
 */
export function isFresh(dateStr: string | undefined, daysBack = FRESHNESS_DAYS): boolean {
  if (!dateStr) return true; // unknown date → allow through (classifier will handle)

  const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

  // Try direct parse first
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed >= cutoff;

  // Handle relative strings: "2 days ago", "3 hours ago", "just now", "yesterday"
  const lower = dateStr.toLowerCase().trim();
  if (lower === 'just now' || lower === 'moments ago') return true;
  if (lower === 'yesterday') return 1 <= daysBack;

  const relMatch = lower.match(/^(\d+)\s*(minute|hour|day|week|month)/);
  if (relMatch) {
    const n = parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    let ms = 0;
    if (unit.startsWith('minute')) ms = n * 60 * 1000;
    else if (unit.startsWith('hour')) ms = n * 3600 * 1000;
    else if (unit.startsWith('day')) ms = n * 86400 * 1000;
    else if (unit.startsWith('week')) ms = n * 7 * 86400 * 1000;
    else if (unit.startsWith('month')) ms = n * 30 * 86400 * 1000;
    return Date.now() - ms >= cutoff;
  }

  // Can't determine — allow through
  return true;
}

export { FRESHNESS_DAYS };
