export interface Lead {
  date: string;
  source: string;
  link: string;
  budget: string;
  contactName: string;
  company: string;
  domain: string;
  email: string;
  status: string;
  notes: string;
  category: string;
  buyingIntentScore: number;
  linkedinUrl: string;
  companySize: string;
  reasoning: string;
}

export interface Stats {
  totalLeads: number;
  newToday: number;
  avgScore: number;
  topCategory: string;
  byCategory: { name: string; count: number; color: string }[];
  bySource: { name: string; count: number }[];
  byScore: { score: string; count: number }[];
  scoreOverTime: { date: string; count: number; avgScore: number }[];
}

export const CATEGORY_COLORS: Record<string, string> = {
  'IT & Software': '#6366f1',
  'AI & AI Agents': '#a855f7',
  'Automation': '#06b6d4',
  'SaaS Products': '#10b981',
  'Mobile & Web Apps': '#f59e0b',
  'none': '#6b7280',
};

export const SOURCE_ICONS: Record<string, string> = {
  freelancer: '💼',
  upwork: '🟢',
  reddit: '🤖',
  twitter: '𝕏',
  'linkedin-public': '🔗',
  facebook: '📘',
  threads: '🧵',
  indiehackers: '🚀',
  producthunt: '🐱',
  hackernews: '🟧',
  bluesky: '🦋',
  github: '🐙',
  mastodon: '🐘',
  quora: '❓',
  devto: '👩‍💻',
  youtube: '▶️',
  telegram: '✈️',
  clutch: '🏷️',
  craigslist: '📋',
  fiverr: '❇️',
  contra: '⚡',
  wellfound: '✌️',
  guru: '🧘',
  peopleperhour: '⏱️',
};

export const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Contacted: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  Qualified: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Closed: 'bg-green-500/20 text-green-300 border-green-500/30',
  Lost: 'bg-red-500/20 text-red-300 border-red-500/30',
};
