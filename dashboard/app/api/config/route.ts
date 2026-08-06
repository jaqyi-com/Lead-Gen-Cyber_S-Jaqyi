import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

// Possible locations for the config file (local vs Vercel root)
const CONFIG_PATHS = [
  path.resolve(process.cwd(), '../pipeline-config.json'),  // local: dashboard/ -> parent
  path.resolve(process.cwd(), 'pipeline-config.json'),     // Vercel: monorepo root
];

const DEFAULT_CONFIG = {
  keywords: [
    'HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Express', 'Node.js',
    'TypeScript', 'Tailwind CSS', 'Redux',
    'PostgreSQL', 'MongoDB', 'Redis', 'Firestore', 'Supabase',
    'GraphQL', 'REST API', 'JWT', 'Auth0', 'Socket.io', 'Webhooks',
    'Claude', 'GPT', 'LangChain', 'OpenAI API', 'Anthropic API', 'Vector DB',
    'n8n', 'API Integrations', 'Zapier',
    'GCP', 'Vercel', 'Cloud Run', 'AWS',
    'SaaS', 'CRM Platforms', 'Data SaaS', 'AI Agents', 'Automation Systems',
    'mobile app', 'web app', 'full stack', 'machine learning', 'chatbot',
  ],
  categories: {
    'Web Development': ['HTML', 'CSS', 'JavaScript', 'React', 'Next.js', 'Express', 'Node.js', 'TypeScript', 'Tailwind CSS', 'Redux'],
    'Database': ['PostgreSQL', 'MongoDB', 'Redis', 'Firestore', 'Supabase'],
    'Backend/API': ['GraphQL', 'REST API', 'JWT', 'Auth0', 'Socket.io', 'Webhooks'],
    'AI/LLM': ['Claude', 'GPT', 'LangChain', 'OpenAI API', 'Anthropic API', 'Vector DB'],
    'Automation': ['n8n', 'API Integrations', 'Zapier'],
    'Cloud/Deployment': ['GCP', 'Vercel', 'Cloud Run', 'AWS'],
    'Software Types': ['SaaS', 'CRM Platforms', 'Data SaaS', 'AI Agents', 'Automation Systems', 'mobile app', 'web app'],
  },
  schedule: { enabled: true, cron: '0 6 * * *', label: 'Daily at 6:00 AM' },
  lastRun: null,
  lastRunStatus: null,
};

function findConfigPath(): string | null {
  for (const p of CONFIG_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function readConfig() {
  const configPath = findConfigPath();
  if (!configPath) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function writeConfig(config: unknown) {
  const configPath = findConfigPath() ?? CONFIG_PATHS[0];
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch {
    // On Vercel read-only fs — config changes are in-memory only
    console.warn('[config] File system is read-only (Vercel). Changes not persisted to disk.');
  }
}

export async function GET() {
  const config = readConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      keywords?: string[];
      categories?: Record<string, string[]>;
      schedule?: { enabled: boolean; cron: string; label: string };
    };
    const current = readConfig();

    const updated = {
      ...current,
      ...(body.keywords !== undefined ? { keywords: body.keywords } : {}),
      ...(body.categories !== undefined ? { categories: body.categories } : {}),
      ...(body.schedule !== undefined ? { schedule: body.schedule } : {}),
    };

    writeConfig(updated);
    return NextResponse.json({ ok: true, config: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
