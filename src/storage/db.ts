/**
 * db.ts
 *
 * SQLite-backed storage layer — single source of truth for every lead's
 * full lifecycle, per the Technical Workflow Spec §2.6.
 *
 * Status machine:
 *   new → enriched → verified → scored → assigned → contacted → won | dead
 *
 * Design notes:
 * - All operations are synchronous (better-sqlite3) to keep the pipeline simple.
 * - Google Sheets is kept as a complementary output, not replaced.
 * - DB file: <project_root>/leads.db
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'new'
  | 'enriched'
  | 'verified'
  | 'scored'
  | 'assigned'
  | 'contacted'
  | 'won'
  | 'dead';

export type EmailStatus = 'valid' | 'invalid' | 'catch-all' | 'unknown';

export interface DbLead {
  id?: number;
  dedup_hash: string;

  // From source watcher
  source: string;
  project_url: string;
  title: string;
  description?: string;
  budget_min?: number | null;
  budget_max?: number | null;
  currency?: string;
  budget_raw?: string; // original string for reference
  client_name?: string;
  client_profile_url?: string;

  // From enrichment (Apollo / Hunter)
  company?: string;
  job_title?: string;
  verified_email?: string;
  phone?: string;
  linkedin_url?: string;
  company_size?: number | null;
  domain?: string;

  // From email verification
  email_status?: EmailStatus;

  // Scoring
  score?: number | null;
  score_computed_at?: string;

  // AI classification (complementary)
  category?: string;
  buying_intent_score?: number | null;
  reasoning?: string;

  // Lifecycle
  status: LeadStatus;
  assigned_rep?: string;
  task_due_at?: string;

  first_seen: string;
  last_seen: string;
}

export interface Rep {
  id?: number;
  name: string;
  email: string;
  active: number; // 1 = active, 0 = inactive
}

// ─── DB singleton ─────────────────────────────────────────────────────────────

const DB_PATH = path.resolve(process.cwd(), 'leads.db');
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      dedup_hash          TEXT    NOT NULL UNIQUE,

      -- Source fields
      source              TEXT    NOT NULL,
      project_url         TEXT    NOT NULL,
      title               TEXT    NOT NULL,
      description         TEXT,
      budget_min          REAL,
      budget_max          REAL,
      currency            TEXT,
      budget_raw          TEXT,
      client_name         TEXT,
      client_profile_url  TEXT,

      -- Enrichment fields
      company             TEXT,
      job_title           TEXT,
      verified_email      TEXT,
      phone               TEXT,
      linkedin_url        TEXT,
      company_size        INTEGER,
      domain              TEXT,

      -- Email verification
      email_status        TEXT    DEFAULT 'unknown',

      -- Scoring
      score               INTEGER,
      score_computed_at   TEXT,

      -- AI classification (complementary)
      category            TEXT,
      buying_intent_score INTEGER,
      reasoning           TEXT,

      -- Lifecycle
      status              TEXT    NOT NULL DEFAULT 'new',
      assigned_rep        TEXT,
      task_due_at         TEXT,

      first_seen          TEXT    NOT NULL,
      last_seen           TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reps (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT    NOT NULL UNIQUE,
      email   TEXT    NOT NULL,
      active  INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pipeline_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id     INTEGER REFERENCES leads(id),
      lead_hash   TEXT,
      stage       TEXT    NOT NULL,
      from_status TEXT,
      to_status   TEXT,
      message     TEXT,
      logged_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ─── Dedup hash ───────────────────────────────────────────────────────────────

/**
 * Compute dedup hash per spec §2.2: sha256(client_name + project_url).
 * Falls back to sha256(source + project_url) when client_name is unavailable.
 */
export function computeDedupHash(clientName: string | undefined, projectUrl: string): string {
  const key = `${clientName ?? ''}:${projectUrl}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ─── Lead operations ──────────────────────────────────────────────────────────

/** Insert a new lead with status='new'. Returns inserted id, or null if dedup collision. */
export function insertNewLead(lead: Omit<DbLead, 'id' | 'status' | 'first_seen' | 'last_seen'>): number | null {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id, last_seen FROM leads WHERE dedup_hash = ?').get(lead.dedup_hash) as { id: number; last_seen: string } | undefined;

  if (existing) {
    // Spec §2.2: update last_seen only, stop pipeline for this item
    db.prepare('UPDATE leads SET last_seen = ? WHERE id = ?').run(now, existing.id);
    logTransition(existing.id, lead.dedup_hash, 'dedup', null, null, 'Existing lead — last_seen updated');
    return null;
  }

  const result = db.prepare(`
    INSERT INTO leads (
      dedup_hash, source, project_url, title, description,
      budget_min, budget_max, currency, budget_raw,
      client_name, client_profile_url,
      category, buying_intent_score, reasoning,
      status, first_seen, last_seen
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      'new', ?, ?
    )
  `).run(
    lead.dedup_hash, lead.source, lead.project_url, lead.title, lead.description ?? null,
    lead.budget_min ?? null, lead.budget_max ?? null, lead.currency ?? null, lead.budget_raw ?? null,
    lead.client_name ?? null, lead.client_profile_url ?? null,
    lead.category ?? null, lead.buying_intent_score ?? null, lead.reasoning ?? null,
    now, now
  );

  const id = result.lastInsertRowid as number;
  logTransition(id, lead.dedup_hash, 'intake', null, 'new', 'New lead inserted');
  return id;
}

/** Update a lead's enrichment fields and advance status to 'enriched'. */
export function updateEnrichment(dedupHash: string, data: {
  company?: string;
  job_title?: string;
  verified_email?: string;
  phone?: string;
  linkedin_url?: string;
  company_size?: number | null;
  domain?: string;
  client_name?: string;
}): void {
  const db = getDb();
  const now = new Date().toISOString();

  const lead = db.prepare('SELECT id, status FROM leads WHERE dedup_hash = ?').get(dedupHash) as { id: number; status: string } | undefined;
  if (!lead) return;

  db.prepare(`
    UPDATE leads SET
      company = COALESCE(?, company),
      job_title = COALESCE(?, job_title),
      verified_email = COALESCE(?, verified_email),
      phone = COALESCE(?, phone),
      linkedin_url = COALESCE(?, linkedin_url),
      company_size = COALESCE(?, company_size),
      domain = COALESCE(?, domain),
      client_name = COALESCE(?, client_name),
      status = 'enriched',
      last_seen = ?
    WHERE dedup_hash = ?
  `).run(
    data.company ?? null, data.job_title ?? null, data.verified_email ?? null,
    data.phone ?? null, data.linkedin_url ?? null, data.company_size ?? null,
    data.domain ?? null, data.client_name ?? null,
    now, dedupHash
  );

  logTransition(lead.id, dedupHash, 'enrich', lead.status, 'enriched', 'Apollo/Hunter enrichment applied');
}

/** Update email_status and advance to 'verified'. */
export function updateEmailVerification(dedupHash: string, emailStatus: EmailStatus): void {
  const db = getDb();
  const now = new Date().toISOString();

  const lead = db.prepare('SELECT id, status FROM leads WHERE dedup_hash = ?').get(dedupHash) as { id: number; status: string } | undefined;
  if (!lead) return;

  db.prepare(`
    UPDATE leads SET email_status = ?, status = 'verified', last_seen = ?
    WHERE dedup_hash = ?
  `).run(emailStatus, now, dedupHash);

  logTransition(lead.id, dedupHash, 'verify', lead.status, 'verified', `Email status: ${emailStatus}`);
}

/** Update score and advance to 'scored'. */
export function updateScore(dedupHash: string, score: number): void {
  const db = getDb();
  const now = new Date().toISOString();

  const lead = db.prepare('SELECT id, status FROM leads WHERE dedup_hash = ?').get(dedupHash) as { id: number; status: string } | undefined;
  if (!lead) return;

  db.prepare(`
    UPDATE leads SET score = ?, score_computed_at = ?, status = 'scored', last_seen = ?
    WHERE dedup_hash = ?
  `).run(score, now, now, dedupHash);

  logTransition(lead.id, dedupHash, 'score', lead.status, 'scored', `Score: ${score}`);
}

/** Assign a lead to a rep and advance to 'assigned'. */
export function assignLead(dedupHash: string, repName: string, taskDueAt: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  const lead = db.prepare('SELECT id, status FROM leads WHERE dedup_hash = ?').get(dedupHash) as { id: number; status: string } | undefined;
  if (!lead) return;

  db.prepare(`
    UPDATE leads SET assigned_rep = ?, task_due_at = ?, status = 'assigned', last_seen = ?
    WHERE dedup_hash = ?
  `).run(repName, taskDueAt, now, dedupHash);

  logTransition(lead.id, dedupHash, 'assign', lead.status, 'assigned', `Assigned to ${repName}, due ${taskDueAt}`);
}

/** Fetch all leads in a given status. */
export function getLeadsByStatus(status: LeadStatus): DbLead[] {
  const db = getDb();
  return db.prepare('SELECT * FROM leads WHERE status = ? ORDER BY first_seen ASC').all(status) as DbLead[];
}

/** Fetch a lead by dedup hash. */
export function getLeadByHash(dedupHash: string): DbLead | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM leads WHERE dedup_hash = ?').get(dedupHash) as DbLead | undefined;
}

// ─── Rep operations ───────────────────────────────────────────────────────────

/** Upsert a rep (insert if new, skip if name already exists). */
export function upsertRep(rep: Omit<Rep, 'id'>): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO reps (name, email, active) VALUES (?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET email = excluded.email, active = excluded.active
  `).run(rep.name, rep.email, rep.active);
}

/** Get the active rep with the fewest currently 'assigned' leads (round-robin by load). */
export function getLeastLoadedRep(): Rep | undefined {
  const db = getDb();
  return db.prepare(`
    SELECT r.*, COUNT(l.id) as load
    FROM reps r
    LEFT JOIN leads l ON l.assigned_rep = r.name AND l.status = 'assigned'
    WHERE r.active = 1
    GROUP BY r.id
    ORDER BY load ASC, r.id ASC
    LIMIT 1
  `).get() as Rep | undefined;
}

// ─── Observability ────────────────────────────────────────────────────────────

/** Log a stage transition for any lead. */
export function logTransition(
  leadId: number | null,
  leadHash: string,
  stage: string,
  fromStatus: string | null,
  toStatus: string | null,
  message?: string
): void {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO pipeline_log (lead_id, lead_hash, stage, from_status, to_status, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(leadId, leadHash, stage, fromStatus, toStatus, message ?? null);
  } catch {
    // Non-fatal — logging should never crash the pipeline
  }
}

// ─── Seed reps from config ────────────────────────────────────────────────────

/**
 * Seed the reps table from pipeline-config.json on startup.
 * Idempotent — safe to call every run.
 */
export function seedRepsFromConfig(): void {
  try {
    const configPath = path.resolve(process.cwd(), 'pipeline-config.json');
    if (!fs.existsSync(configPath)) return;
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      reps?: Array<{ name: string; email: string }>;
    };
    if (!cfg.reps || cfg.reps.length === 0) return;
    for (const rep of cfg.reps) {
      upsertRep({ name: rep.name, email: rep.email, active: 1 });
    }
    console.log(`[db] Seeded ${cfg.reps.length} rep(s) from config`);
  } catch (err) {
    console.warn('[db] Could not seed reps from config:', err);
  }
}
