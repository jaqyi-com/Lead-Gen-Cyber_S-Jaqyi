import * as fs from 'fs';
import * as path from 'path';

/**
 * Pipeline configuration — loaded from pipeline-config.json at startup.
 * Can be overridden by PIPELINE_KEYWORDS env var (comma-separated).
 */

interface PipelineConfig {
  keywords: string[];
  categories: Record<string, string[]>;
  schedule: { enabled: boolean; cron: string; label: string };
  lastRun: string | null;
  lastRunStatus: string | null;
}

const CONFIG_PATH = path.resolve(__dirname, '../../../pipeline-config.json');

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
