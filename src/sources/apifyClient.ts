import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/**
 * Builds a newline-joined queries string with Google date range operators.
 *
 * WHY after:DATE AND before:DATE together:
 * Using both operators creates a tight explicit date window that Google respects better
 * than using either alone. Set 3-day window to allow for indexing lag.
 */
export function buildDatedQueries(queries: string[]): string {
  const daysBack = parseInt(process.env.FRESHNESS_DAYS ?? '2', 10);
  const afterDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    return d.toISOString().slice(0, 10);
  })();
  const beforeDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();
  // Append date window to each query
  return queries
    .map((q) => `${q} after:${afterDate} before:${beforeDate}`)
    .join('\n');
}

/**
 * Helper: Start an Apify actor run, poll until SUCCEEDED, return dataset items.
 * For apify/google-search-scraper: flattens organicResults[] per page.
 */
export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs = 300_000
): Promise<Record<string, unknown>[]> {
  // 1. Start the run
  const runRes = await axios.post(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${APIFY_TOKEN}`,
    input,
    { headers: { 'Content-Type': 'application/json' }, timeout: 30_000 }
  );

  const runId: string = runRes.data?.data?.id;
  if (!runId) throw new Error(`Failed to start actor ${actorId}`);
  console.log(`  [apify] Run started: ${runId}`);

  // 2. Poll until finished
  const startTime = Date.now();
  const POLL_INTERVAL = 5_000;
  let status = 'RUNNING';

  while (status === 'RUNNING' || status === 'READY' || status === 'FETCHING') {
    if (Date.now() - startTime > timeoutMs) throw new Error(`Actor ${actorId} timed out`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`,
      { timeout: 15_000 }
    );
    status = statusRes.data?.data?.status ?? 'UNKNOWN';
    console.log(`  [apify] Run ${runId} status: ${status}`);
  }

  if (status !== 'SUCCEEDED') throw new Error(`Actor ${actorId} run ${runId} ended: ${status}`);

  // 3. Fetch dataset items
  const datasetId: string = runRes.data?.data?.defaultDatasetId;
  const itemsRes = await axios.get(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=200`,
    { timeout: 30_000 }
  );

  const rawItems = Array.isArray(itemsRes.data) ? itemsRes.data : [];

  // 4. Flatten organicResults[] from Google Search Scraper
  if (rawItems.length > 0 && Array.isArray((rawItems[0] as Record<string, unknown>)?.organicResults)) {
    const flattened: Record<string, unknown>[] = [];
    for (const pageItem of rawItems) {
      const organic = (pageItem as Record<string, unknown>).organicResults as Record<string, unknown>[];
      if (Array.isArray(organic)) {
        for (const result of organic) {
          flattened.push(result as Record<string, unknown>);
        }
      }
    }
    console.log(`  [apify] Flattened ${rawItems.length} search pages → ${flattened.length} organic results`);
    return flattened;
  }

  return rawItems as Record<string, unknown>[];
}
