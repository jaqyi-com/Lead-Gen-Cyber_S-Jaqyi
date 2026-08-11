/**
 * score.ts
 *
 * Scoring Engine — spec §2.5
 *
 * Deterministic rule-based scoring (0–100), computed fresh each time
 * enrichment data changes. Pull-based: reads all leads with status='verified'.
 *
 * Scoring table (per spec):
 *   Budget ≥ $10,000         → +40
 *   Budget $3,000–$9,999     → +25
 *   Budget < $3,000          → +10
 *   Seniority (CTO/Founder/CEO/VP Eng in job_title) → +30
 *   Company size > 50        → +15
 *   Tech stack keyword match → +15
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLeadsByStatus, updateScore, DbLead } from '../storage/db';

// ─── Config ───────────────────────────────────────────────────────────────────

function loadKeywords(): string[] {
  try {
    const { getDataFile } = require('../utils/paths');
    const configPath = getDataFile('pipeline-config.json');
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      keywords?: string[];
    };
    return (cfg.keywords ?? []).map((k) => k.toLowerCase());
  } catch {
    return [];
  }
}

const SENIOR_TITLES = ['cto', 'founder', 'ceo', 'vp eng', 'vp of engineering', 'chief technology', 'chief executive'];

// ─── Scoring logic ────────────────────────────────────────────────────────────

export function computeScore(lead: DbLead): number {
  let score = 0;

  // ── Budget (+10/+25/+40) ──────────────────────────────────────────────────
  const budgetUsd = resolveBudgetUsd(lead);
  if (budgetUsd !== null) {
    if (budgetUsd >= 10_000) score += 40;
    else if (budgetUsd >= 3_000) score += 25;
    else score += 10;
  }

  // ── Seniority (+30) ───────────────────────────────────────────────────────
  if (lead.job_title) {
    const titleLower = lead.job_title.toLowerCase();
    if (SENIOR_TITLES.some((t) => titleLower.includes(t))) {
      score += 30;
    }
  }

  // ── Company size > 50 (+15) ───────────────────────────────────────────────
  if (lead.company_size && lead.company_size > 50) {
    score += 15;
  }

  // ── Tech stack keyword match (+15) ────────────────────────────────────────
  const keywords = loadKeywords();
  if (keywords.length > 0) {
    const haystack = `${lead.title} ${lead.description ?? ''} ${lead.reasoning ?? ''}`.toLowerCase();
    const matched = keywords.some((kw) => haystack.includes(kw));
    if (matched) score += 15;
  }

  return Math.min(100, score);
}

/**
 * Resolve the best single USD budget figure from a lead.
 * Uses budget_max when available (most optimistic), falls back to budget_min,
 * then tries to parse budget_raw string.
 */
function resolveBudgetUsd(lead: DbLead): number | null {
  if (lead.budget_max != null) return normalizeToUsd(lead.budget_max, lead.currency);
  if (lead.budget_min != null) return normalizeToUsd(lead.budget_min, lead.currency);

  // Parse budget_raw as a fallback (e.g. "$5,000", "$5k", "5000 USD")
  if (lead.budget_raw) {
    const raw = lead.budget_raw.replace(/,/g, '').toLowerCase();
    const match = raw.match(/[\d.]+/);
    if (match) {
      let val = parseFloat(match[0]);
      if (raw.includes('k')) val *= 1000;
      return val > 0 ? val : null;
    }
  }

  return null;
}

function normalizeToUsd(amount: number, currency?: string | null): number {
  // Simple passthrough — all amounts assumed USD for now.
  // Extend with FX rates if multi-currency support is needed.
  return amount;
}

// ─── Stage entry point ────────────────────────────────────────────────────────

/**
 * Pull-based: reads all leads with status='verified', computes score,
 * writes score to DB, advances to status='scored'.
 *
 * Idempotent: already-scored leads are not re-processed unless
 * enrichment data changes (handled by resetting status to 'verified').
 */
export async function runScoringStage(): Promise<void> {
  const verifiedLeads = getLeadsByStatus('verified');

  if (verifiedLeads.length === 0) {
    console.log('[score] No verified leads to score');
    return;
  }

  console.log(`[score] Scoring ${verifiedLeads.length} leads…`);

  for (const lead of verifiedLeads) {
    const score = computeScore(lead);
    updateScore(lead.dedup_hash, score);
    console.log(`[score] "${lead.title.slice(0, 60)}" → ${score}/100`);
  }

  console.log(`[score] Done — ${verifiedLeads.length} leads scored`);
}
