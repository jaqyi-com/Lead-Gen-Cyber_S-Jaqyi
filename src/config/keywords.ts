/**
 * Keyword sets per JAQYI service category.
 * These are fed directly into Apify actor inputs as search terms.
 */

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'IT & Software': [
    'looking for software developer',
    'need backend developer',
    'hire full stack developer',
    'software engineer needed',
    'need CTO technical co-founder',
    'custom software development',
    'API integration developer',
    'cloud infrastructure developer',
    'DevOps engineer needed',
    'hire Node.js developer',
    'hire Python developer',
  ],
  'AI & AI Agents': [
    'looking for AI developer',
    'need AI agent developer',
    'build AI chatbot',
    'LLM integration developer',
    'OpenAI GPT developer needed',
    'Claude Anthropic developer',
    'RAG system developer',
    'need machine learning engineer',
    'AI automation developer',
    'hire AI engineer',
    'build custom AI assistant',
    'vector database developer',
  ],
  Automation: [
    'looking for automation developer',
    'n8n developer needed',
    'Make.com Zapier developer',
    'workflow automation developer',
    'business process automation',
    'RPA developer needed',
    'hire automation engineer',
    'automate my business processes',
    'no-code automation developer',
    'Python automation script developer',
  ],
  'SaaS Products': [
    'build SaaS product',
    'SaaS MVP developer',
    'need SaaS co-founder developer',
    'SaaS platform developer',
    'subscription platform developer',
    'multi-tenant application developer',
    'build startup product',
    'hire product engineer SaaS',
    'SaaS technical co-founder',
  ],
  'Mobile & Web Apps': [
    'looking for mobile app developer',
    'need React Native developer',
    'Flutter developer needed',
    'iOS Android developer hire',
    'web app developer needed',
    'React Next.js developer hire',
    'full stack web developer needed',
    'build mobile app startup',
    'PWA developer needed',
    'hire frontend developer',
  ],
};

/** Flat list of all keywords (used by sources that take a single search field) */
export const ALL_KEYWORDS: string[] = Object.values(CATEGORY_KEYWORDS).flat();

/** Shorter set optimised for Twitter/Reddit where verbose queries return noise */
export const SOCIAL_KEYWORDS: string[] = [
  'looking for AI developer',
  'hire automation developer',
  'need SaaS developer',
  'build AI agent',
  'need mobile app developer',
  'n8n developer needed',
  'looking for software developer',
  'hire full stack developer',
  'build chatbot',
  'AI engineer needed',
  'need web app developer',
  'automation engineer hire',
];
