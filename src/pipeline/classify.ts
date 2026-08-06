import axios from 'axios';
import { RawLead } from './normalize';

// ─── OpenRouter config ────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
const MIN_SCORE = parseInt(process.env.MIN_INTENT_SCORE ?? '2', 10);

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

function truncate(text: string, maxChars = 800): string {
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text;
}

function buildPrompt(lead: RawLead): string {
  return `You are a lead qualification expert for JAQYI, a dev studio offering:
- IT & Software development (React, Node.js, TypeScript, Python)
- AI & AI Agents (OpenAI, Claude, LangChain, RAG systems)
- Automation (n8n, workflows, API integrations)
- SaaS Products (full-stack SaaS, CRM, platforms)
- Mobile & Web Apps (React Native, Flutter, Next.js)

Analyze this post and score it for BUYING INTENT — meaning: is this a person/company ACTIVELY LOOKING TO HIRE a developer?

Title: ${lead.title}
Description: ${truncate(lead.description)}
Source: ${lead.source}
URL: ${lead.url}

Scoring guide:
5 = Explicit hire request with budget/timeline ("[HIRING] need React dev, $5k budget")
4 = Clear hiring intent, specific tech mentioned ("Looking for AI agent developer")
3 = Probable hiring intent, somewhat specific ("Need help with n8n automation")
2 = Possible hiring intent, vague ("Anyone know a good dev?")
1 = No hiring intent (job seeker, article, discussion, profile page)

IMPORTANT: Job board LISTING pages ("Node.js Jobs for August 2026") = score 1, category "none".
Freelancer/Upwork PROFILE pages = score 1, category "none".
Actual PROJECT POSTS or HIRING POSTS = score 3-5.

Return JSON only (no markdown):
{
  "category": one of ["IT & Software","AI & AI Agents","Automation","SaaS Products","Mobile & Web Apps","none"],
  "buyingIntentScore": 1-5,
  "reasoning": "one sentence explaining why"
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
    // Extract JSON object even if there's surrounding text
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
 * Classifies an array of leads via OpenRouter, batched to respect rate limits.
 * Discards leads scoring below MIN_INTENT_SCORE or classified as 'none'.
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
        console.log(`[classify] Dropped (none): ${item.title.slice(0, 60)}`);
        continue;
      }
      if (item.buyingIntentScore < MIN_SCORE) {
        console.log(`[classify] Dropped (score ${item.buyingIntentScore} < ${MIN_SCORE}): ${item.title.slice(0, 60)}`);
        continue;
      }
      results.push(item);
    }

    if (i + BATCH_SIZE < leads.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`[classify] ${leads.length} leads → ${results.length} passed (min score ${MIN_SCORE}, model: ${MODEL})`);
  return results;
}
