import axios from 'axios';
import { SOCIAL_KEYWORDS } from '../config/keywords';

const APIFY_TOKEN = process.env.APIFY_TOKEN!;

/**
 * Helper: Start an Apify actor run, poll until SUCCEEDED, return dataset items.
 * Avoids the 120-second timeout of run-sync-get-dataset-items for slow actors.
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

  // 2. Poll until finished (SUCCEEDED / FAILED / ABORTED / TIMED-OUT)
  const startTime = Date.now();
  const POLL_INTERVAL = 5_000;
  let status = 'RUNNING';

  while (status === 'RUNNING' || status === 'READY' || status === 'FETCHING') {
    if (Date.now() - startTime > timeoutMs) throw new Error(`Actor ${actorId} timed out after ${timeoutMs}ms`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const statusRes = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`,
      { timeout: 15_000 }
    );
    status = statusRes.data?.data?.status ?? 'UNKNOWN';
    console.log(`  [apify] Run ${runId} status: ${status}`);
  }

  if (status !== 'SUCCEEDED') throw new Error(`Actor ${actorId} run ${runId} ended with status: ${status}`);

  // 3. Fetch dataset items
  const datasetId: string = runRes.data?.data?.defaultDatasetId;
  const itemsRes = await axios.get(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=200`,
    { timeout: 30_000 }
  );

  const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
  return items as Record<string, unknown>[];
}
