import * as fs from 'fs';
import * as path from 'path';
import { getDataFile } from '../utils/paths';

/**
 * Pipeline configuration — loaded from pipeline-config.json at startup.
 * Can be overridden by PIPELINE_KEYWORDS env var (comma-separated).
 */

interface PipelineConfig {
  keywords: string[];
  categories: Record<string, string[]>;
  schedule: { enabled: boolean; cron: string; label: string };
  sources?: Record<string, boolean>;
  lastRun: string | null;
  lastRunStatus: string | null;
  progress?: { step: string; current: number; total: number } | null;
}

const CONFIG_PATH = getDataFile('pipeline-config.json');

function loadConfig(): PipelineConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as PipelineConfig;
  } catch {
    // Fallback defaults if config file is missing
    return {
      keywords: DEFAULT_KEYWORDS,
      categories: DEFAULT_CATEGORIES,
      schedule: { enabled: true, cron: '0 6 * * *', label: 'Daily at 6:00 AM' },
      sources: DEFAULT_SOURCES,
      lastRun: null,
      lastRunStatus: null,
    };
  }
}

export function saveConfig(config: PipelineConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function updateLastRun(status: 'success' | 'failed', message?: string): void {
  try {
    const config = loadConfig();
    config.lastRun = new Date().toISOString();
    config.lastRunStatus = status === 'success' ? `✅ ${message ?? 'Completed'}` : `❌ ${message ?? 'Failed'}`;
    saveConfig(config);
  } catch { /* non-fatal */ }
}

export function updateProgress(step: string, current: number, total: number): void {
  try {
    const config = loadConfig();
    config.progress = { step, current, total };
    saveConfig(config);
  } catch { /* non-fatal */ }
}

export function clearProgress(): void {
  try {
    const config = loadConfig();
    config.progress = null;
    saveConfig(config);
  } catch { /* non-fatal */ }
}

const DEFAULT_SOURCES: Record<string, boolean> = {
  freelancer: true,
  upwork: true,
  reddit: true,
  twitter: true,
  'linkedin-public': true,
  facebook: true,
  threads: true,
  indiehackers: true,
  producthunt: true,
  hackernews: true,
  bluesky: true,
  github: true,
  mastodon: true,
  quora: true,
  devto: true,
  youtube: true,
  telegram: true,
  clutch: true,
  craigslist: true,
  fiverr: true,
  contra: true,
  wellfound: true,
  guru: true,
  peopleperhour: true,
};

export function getEnabledSources(): Record<string, boolean> {
  try {
    const cfg = loadConfig();
    return { ...DEFAULT_SOURCES, ...(cfg.sources ?? {}) };
  } catch {
    return DEFAULT_SOURCES;
  }
}

const DEFAULT_KEYWORDS = [
  'HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Express', 'Node.js',
  'TypeScript', 'Tailwind CSS', 'Redux',
  'PostgreSQL', 'MongoDB', 'Redis', 'Firestore', 'Supabase',
  'GraphQL', 'REST API', 'JWT', 'Auth0', 'Socket.io', 'Webhooks',
  'Claude', 'GPT', 'LangChain', 'OpenAI API', 'Anthropic API', 'Vector DB',
  'n8n', 'API Integrations', 'Zapier',
  'GCP', 'Vercel', 'Cloud Run', 'AWS',
  'SaaS', 'CRM', 'AI Agents', 'Automation Systems',
  'mobile app', 'web app', 'full stack', 'machine learning', 'chatbot',
];

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  'Web Development': ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Express', 'Node.js', 'TypeScript', 'Tailwind CSS', 'Redux'],
  'Database': ['PostgreSQL', 'MongoDB', 'Redis', 'Firestore', 'Supabase'],
  'Backend/API': ['GraphQL', 'REST API', 'JWT', 'Auth0', 'Socket.io', 'Webhooks'],
  'AI/LLM': ['Claude', 'GPT', 'LangChain', 'OpenAI API', 'Anthropic API', 'Vector DB'],
  'Automation': ['n8n', 'API Integrations', 'Zapier'],
  'Cloud/Deployment': ['GCP', 'Vercel', 'Cloud Run', 'AWS'],
  'Software Types': ['SaaS', 'CRM', 'AI Agents', 'Automation Systems', 'mobile app', 'web app'],
};

const _config = loadConfig();

/** Active keyword set — from config file or PIPELINE_KEYWORDS env override */
export const ACTIVE_KEYWORDS: string[] = (() => {
  const envOverride = process.env.PIPELINE_KEYWORDS;
  if (envOverride) return envOverride.split(',').map((k) => k.trim()).filter(Boolean);
  return _config.keywords;
})();

export const ACTIVE_CATEGORIES: Record<string, string[]> = _config.categories;

/** All unique keywords as a flat list for search queries */
export const ALL_KEYWORDS: string[] = ACTIVE_KEYWORDS;

/** Shorter set optimised for social media sources */
export const SOCIAL_KEYWORDS: string[] = ACTIVE_KEYWORDS.slice(0, 15);

/** Backward compat — JAQYI service categories */
export const CATEGORY_KEYWORDS: Record<string, string[]> = ACTIVE_CATEGORIES;
