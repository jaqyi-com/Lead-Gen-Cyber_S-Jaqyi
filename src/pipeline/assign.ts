/**
 * assign.ts
 *
 * Assignment Engine — spec §2.8
 *
 * Pull-based: reads all 'scored' leads above SCORE_ALERT_THRESHOLD,
 * assigns them round-robin to the rep with the fewest active leads,
 * creates a task record (due +24h), advances status to 'assigned'.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  getLeadsByStatus,
  getLeastLoadedRep,
  assignLead,
  DbLead,
} from '../storage/db';

// ─── Config ───────────────────────────────────────────────────────────────────

function loadThreshold(): number {
  try {
    const configPath = path.resolve(process.cwd(), 'pipeline-config.json');
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      score_alert_threshold?: number;
    };
    return cfg.score_alert_threshold ?? 55;
  } catch {
    return 55;
  }
}

// ─── Stage entry point ────────────────────────────────────────────────────────

/**
 * Pull-based: reads all leads with status='scored'.
 * Leads above threshold → assigned to least-loaded rep.
 * Leads below threshold → pushed to nurture (status stays 'scored' for now,
 *   could be moved to a 'nurture' status in a future iteration).
 *
 * Idempotent: once assigned, leads won't appear in 'scored' query again.
 */
export async function runAssignmentStage(): Promise<AssignmentResult[]> {
  const threshold = loadThreshold();
  const scoredLeads = getLeadsByStatus('scored');

  if (scoredLeads.length === 0) {
    console.log('[assign] No scored leads to assign');
    return [];
  }

  console.log(`[assign] ${scoredLeads.length} scored leads, threshold=${threshold}`);

  const assigned: AssignmentResult[] = [];

  for (const lead of scoredLeads) {
    const score = lead.score ?? 0;

    if (score < threshold) {
      console.log(`[assign] Score ${score} < ${threshold} — lead "${lead.title.slice(0, 50)}" → nurture queue`);
      continue;
    }

    const rep = getLeastLoadedRep();
    if (!rep) {
      console.warn('[assign] No active reps configured — skipping assignment. Add reps to pipeline-config.json');
      continue;
    }

    const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    assignLead(lead.dedup_hash, rep.name, dueAt);

    const result: AssignmentResult = { lead, repName: rep.name, dueAt, score };
    assigned.push(result);

    console.log(`[assign] ✓ "${lead.title.slice(0, 60)}" (score ${score}) → ${rep.name}, due ${dueAt}`);
  }

  console.log(`[assign] Done — ${assigned.length} assigned, ${scoredLeads.length - assigned.length} to nurture`);
  return assigned;
}

export interface AssignmentResult {
  lead: DbLead;
  repName: string;
  dueAt: string;
  score: number;
}
