import axios from 'axios';
import { RawLead } from './normalize';

// ─── OpenRouter config ────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
const MIN_SCORE = parseInt(process.env.MIN_INTENT_SCORE ?? '3', 10);

export type LeadCategory =
  | 'IT & Software'
  | 'AI & AI Agents'
  | 'Automation'
  | 'SaaS Products'
  | 'Mobile & Web Apps'
  | 'none';

export interface ClassifiedLead extends RawLead {
  category: LeadCategory;
  buyingIntentScore: 1 | 2 | 3 | 4 | 5;
  reasoning: string;
}

interface OpenRouterChoice {
  message: { role: string; content: string };
}
interface OpenRouterResponse {
  choices: OpenRouterChoice[];
}

const VALID_CATEGORIES: LeadCategory[] = [
  'IT & Software',
  'AI & AI Agents',
  'Automation',
  'SaaS Products',
  'Mobile & Web Apps',
  'none',
];

function truncate(text: string, maxChars = 1000): string {
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text;
}

function buildPrompt(lead: RawLead): string {
  return `You are a business development analyst for JAQYI, a software studio that builds:
- IT & Software: custom software, APIs, backends (React, Node.js, TypeScript, Python)
- AI & AI Agents: RAG systems, LLM integrations, OpenAI/Claude/LangChain projects
- Automation: n8n workflows, API integrations, data pipelines
- SaaS Products: full-stack SaaS platforms, CRMs, dashboards
- Mobile & Web Apps: React Native, Flutter, Next.js applications

YOUR TASK: Determine if this is a PROJECT REQUIREMENT POST — meaning a company or individual DESCRIBING A PROJECT THEY NEED BUILT and seeking a development partner or contractor.

Title: ${lead.title}
Description: ${truncate(lead.description)}
Source: ${lead.source}
URL: ${lead.url}

SCORE BASED ON PROJECT QUALITY:
5 = Detailed project specification with scope, tech requirements, budget/timeline, clear deliverables (like an RFP or detailed Freelancer/Upwork job post). HIGH VALUE — pursue immediately.
4 = Clear project description, specific tech stack mentioned, looking for someone to build it. Budget may or may not be stated.
3 = Someone clearly wants something built, reasonably specific about what they need. Could be a reddit [HIRING] post or LinkedIn post with a real project.
2 = Vague project inquiry, mentions needing development help but unclear scope.
1 = NOT a project requirement:
    - [FOR HIRE] or freelancer advertising their services
    - Generic "how to hire a developer" articles
    - Discussion/opinion threads ("best language for X?")
    - Job board category pages (listing pages, not individual posts)
    - Freelancer profile pages
    - Social media profile bios
    - News articles, tutorials, guides

STRICT RULES:
- If title contains "[FOR HIRE]" → always score 1, category "none"
- If it's someone OFFERING services not REQUESTING them → score 1, category "none"
- If it is a corporate job advertisement or recruitment post for a full-time employee (e.g., "looking for full-time developer to join our team", "salary $120k/year", "wages", "benefits") → always score 1, category "none"
- If it's an article, tutorial, or opinion piece → score 1, category "none"  
- Only score 3+ if a real entity is LOOKING to hire an agency, contractor, freelancer, or studio to BUILD a specific project/product (e.g., custom website, SaaS MVP, n8n automation, AI chatbot)

Return JSON only (no markdown, no explanation):
{
  "category": one of ["IT & Software","AI & AI Agents","Automation","SaaS Products","Mobile & Web Apps","none"],
  "buyingIntentScore": 1-5,
  "reasoning": "one sentence: what they want built and why scored this way"
}`;
}

interface RawClassification {
  category?: LeadCategory;
  buyingIntentScore?: number;
  reasoning?: string;
}

function parseClassification(raw: string): RawClassification | null {
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as RawClassification;
  } catch {
    return null;
  }
}

async function classifyOne(lead: RawLead): Promise<ClassifiedLead | null> {
  try {
    const response = await axios.post<OpenRouterResponse>(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        max_tokens: 200,
        temperature: 0.1, // Low temperature for consistent classification
        messages: [{ role: 'user', content: buildPrompt(lead) }],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://jaqyi.com',
          'X-Title': 'JAQYI Lead Pipeline',
        },
        timeout: 30_000,
      }
    );

    const text = response.data.choices?.[0]?.message?.content ?? '';
    const parsed = parseClassification(text);

    if (!parsed || !parsed.category || !parsed.buyingIntentScore) {
      console.warn(`[classify] Could not parse response for: ${lead.url}`);
      return null;
    }

    const score = Number(parsed.buyingIntentScore) as 1 | 2 | 3 | 4 | 5;
    if (!VALID_CATEGORIES.includes(parsed.category)) return null;
    if (score < 1 || score > 5) return null;

    return {
      ...lead,
      category: parsed.category,
      buyingIntentScore: score,
      reasoning: String(parsed.reasoning ?? ''),
    };
  } catch (err) {
    console.error(`[classify] OpenRouter API error for ${lead.url}:`, err);
    return null;
  }
}

/**
 * Classifies leads via OpenRouter.
 * Focused on PROJECT REQUIREMENT quality — score 3+ means real project to quote on.
 * Batched to respect rate limits.
 */
export async function classifyLeads(leads: RawLead[]): Promise<ClassifiedLead[]> {
  const results: ClassifiedLead[] = [];
  const BATCH_SIZE = 5;
  const DELAY_MS = 1000;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const classified = await Promise.all(batch.map(classifyOne));

    for (const item of classified) {
      if (!item) continue;
      if (item.category === 'none') {
        console.log(`[classify] Dropped (not a project post): ${item.title.slice(0, 70)}`);
        continue;
      }
      if (item.buyingIntentScore < MIN_SCORE) {
        console.log(`[classify] Dropped (score ${item.buyingIntentScore} < ${MIN_SCORE}): ${item.title.slice(0, 70)}`);
        continue;
      }
      console.log(`[classify] ✓ KEPT (score ${item.buyingIntentScore}, ${item.category}): ${item.title.slice(0, 70)}`);
      results.push(item);
    }

    if (i + BATCH_SIZE < leads.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`[classify] ${leads.length} leads → ${results.length} qualified projects (min score ${MIN_SCORE}, model: ${MODEL})`);
  return results;
}
