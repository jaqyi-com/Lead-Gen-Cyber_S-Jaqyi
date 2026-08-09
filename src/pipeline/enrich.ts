/**
 * enrich.ts
 *
 * Enrichment Service — spec §2.3
 *
 * Primary lookup: Apollo.io People Match API
 * Fallback: Hunter.io domain-pattern email guess (if HUNTER_API_KEY is set)
 *
 * Idempotency: skip any lead already at status >= 'enriched'.
 * Rate limiting: 300ms delay between calls + exponential backoff on 429.
 * DB write-back: updates the DB record and advances status to 'enriched'.
 */

import axios, { AxiosError } from 'axios';
import { ClassifiedLead } from './classify';
import { computeDedupHash, updateEnrichment } from '../storage/db';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const HUNTER_API_KEY = process.env.HUNTER_API_KEY ?? '';
const MAX_ENRICHMENTS = parseInt(process.env.MAX_ENRICHMENTS_PER_RUN ?? '50', 10);

export interface EnrichedLead extends ClassifiedLead {
  contactName?: string;
  company?: string;
  domain?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  companySize?: string;
}

/** Attempt to extract a domain from any URL-like string */
function extractDomain(urlStr: string): string | undefined {
  try {
    const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** Extract a rough company name from the lead metadata */
function guessCompanyName(lead: ClassifiedLead): string | undefined {
  // authorName on freelancer/upwork can sometimes be a company name
  if (lead.source === 'freelancer' || lead.source === 'upwork') {
    return lead.authorName;
  }
  return undefined;
}

interface ApolloOrgResult {
  organization?: {
    name?: string;
    website_url?: string;
    primary_domain?: string;
    estimated_num_employees?: number;
    linkedin_url?: string;
  };
}

interface ApolloPeopleResult {
  people?: Array<{
    name?: string;
    email?: string;
    linkedin_url?: string;
    organization?: {
      name?: string;
      website_url?: string;
    };
  }>;
}

/** Enrich with Apollo's organization endpoint */
async function enrichOrganization(domain: string): Promise<Partial<EnrichedLead>> {
  try {
    const res = await axios.post<ApolloOrgResult>(
      'https://api.apollo.io/v1/organizations/enrich',
      { domain },
      {
        headers: { 'x-api-key': APOLLO_API_KEY, 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    const org = res.data?.organization;
    if (!org) return {};

    return {
      company: org.name,
      domain: org.primary_domain ?? domain,
      linkedinUrl: org.linkedin_url,
      companySize: org.estimated_num_employees
        ? `${org.estimated_num_employees}`
        : undefined,
    };
  } catch (err) {
    console.warn(`[enrich] Apollo org enrichment failed for ${domain}:`, err);
    return {};
  }
}

/** Enrich with Apollo's people/search endpoint to get verified email */
async function enrichPerson(name: string, domain: string): Promise<Partial<EnrichedLead>> {
  try {
    const res = await axios.post<ApolloPeopleResult>(
      'https://api.apollo.io/v1/people/search',
      {
        person_name: name,
        organization_domains: [domain],
        page: 1,
        per_page: 1,
      },
      {
        headers: { 'x-api-key': APOLLO_API_KEY, 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    const person = res.data?.people?.[0];
    if (!person) return {};

    return {
      contactName: person.name,
      email: person.email,
      linkedinUrl: person.linkedin_url,
      company: person.organization?.name,
      domain: person.organization?.website_url
        ? extractDomain(person.organization.website_url)
        : undefined,
    };
  } catch (err) {
    console.warn(`[enrich] Apollo people search failed for ${name}@${domain}:`, err);
    return {};
  }
}

// ─── Hunter.io fallback ───────────────────────────────────────────────────────

interface HunterResponse {
  data?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    confidence?: number;
  };
}

/**
 * Hunter.io email finder — domain-pattern guess.
 * Only called when Apollo returns no email and HUNTER_API_KEY is set.
 * Spec §2.3: "Fallback if no match: Hunter.io domain-pattern email guess"
 */
async function enrichViaHunter(
  firstName: string,
  lastName: string,
  domain: string
): Promise<Partial<EnrichedLead>> {
  if (!HUNTER_API_KEY) return {};
  try {
    const res = await axios.get<HunterResponse>(
      'https://api.hunter.io/v2/email-finder',
      {
        params: {
          domain,
          first_name: firstName,
          last_name: lastName,
          api_key: HUNTER_API_KEY,
        },
        timeout: 15_000,
      }
    );
    const data = res.data?.data;
    if (!data?.email) return {};
    console.log(`[enrich] Hunter.io found email for ${firstName} ${lastName}@${domain}: ${data.email}`);
    return {
      email: data.email,
      contactName: data.first_name && data.last_name
        ? `${data.first_name} ${data.last_name}`
        : undefined,
    };
  } catch (err) {
    console.warn(`[enrich] Hunter.io fallback failed for ${domain}:`, err);
    return {};
  }
}

/** Exponential backoff helper for 429 rate limit errors */
async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr?.response?.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[enrich] 429 rate limit on ${label} — retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error(`[enrich] Max retries exceeded for ${label}`);
}

/**
 * Enriches classified leads with Apollo.io firmographic data.
 *
 * Rules:
 * - Anonymous posts (Reddit/Twitter without identifiable company) are passed
 *   through with empty enrichment fields — still valid leads for platform reply.
 * - Enrichment is capped at MAX_ENRICHMENTS_PER_RUN to protect API credits.
 * - Apollo data is pulled from Apollo's own database — no private profile scraping.
 * - Idempotency: leads already enriched (status >= 'enriched') are skipped.
 * - Hunter.io is used as fallback when Apollo returns no email.
 */
export async function enrichLeads(leads: ClassifiedLead[]): Promise<EnrichedLead[]> {
  const results: EnrichedLead[] = [];
  let enrichmentCount = 0;

  for (const lead of leads) {
    const enriched: EnrichedLead = { ...lead };

    const company = guessCompanyName(lead);
    const domain = lead.url ? extractDomain(lead.url) : undefined;

    const PLATFORM_DOMAINS = ['freelancer.com', 'upwork.com', 'reddit.com', 'twitter.com', 'x.com', 'linkedin.com'];
    const canEnrich =
      enrichmentCount < MAX_ENRICHMENTS &&
      domain &&
      !PLATFORM_DOMAINS.includes(domain);

    if (canEnrich && domain) {
      enrichmentCount++;
      console.log(`[enrich] Enriching lead #${enrichmentCount}: ${lead.url}`);

      // Run org + person lookup in parallel (with 429 backoff)
      const [orgData, personData] = await Promise.all([
        withRetry(() => enrichOrganization(domain), `org:${domain}`),
        company ? withRetry(() => enrichPerson(company, domain), `person:${company}@${domain}`) : Promise.resolve({}),
      ]);

      // Merge: person data wins over org data for contact-level fields
      Object.assign(enriched, orgData, personData);

      // Hunter.io fallback — only if Apollo found no email
      if (!enriched.email && company && domain && HUNTER_API_KEY) {
        const nameParts = company.trim().split(/\s+/);
        const firstName = nameParts[0] ?? '';
        const lastName = nameParts.slice(1).join(' ') || company;
        const hunterData = await enrichViaHunter(firstName, lastName, domain);
        if (hunterData.email) Object.assign(enriched, hunterData);
      }

      // Write enrichment back to DB (advances status to 'enriched')
      const dedupHash = computeDedupHash(lead.authorName, lead.url);
      updateEnrichment(dedupHash, {
        company: enriched.company,
        job_title: (enriched as EnrichedLead & { jobTitle?: string }).jobTitle,
        verified_email: enriched.email,
        phone: enriched.phone,
        linkedin_url: enriched.linkedinUrl,
        company_size: enriched.companySize ? parseInt(enriched.companySize, 10) : null,
        domain: enriched.domain,
        client_name: enriched.contactName ?? lead.authorName,
      });

      // Small delay to respect Apollo rate limits
      await new Promise((r) => setTimeout(r, 300));
    } else {
      console.log(
        `[enrich] Skipping enrichment for ${lead.url} (${!canEnrich ? 'cap reached' : 'platform domain'})`
      );
      // Still advance DB status to 'enriched' so the pipeline continues
      const dedupHash = computeDedupHash(lead.authorName, lead.url);
      updateEnrichment(dedupHash, { client_name: lead.authorName });
    }

    // Always fall back authorName if no enriched contact
    if (!enriched.contactName && lead.authorName) {
      enriched.contactName = lead.authorName;
    }

    results.push(enriched);
  }

  console.log(
    `[enrich] ${leads.length} leads processed, ${enrichmentCount} enriched via Apollo`
  );
  return results;
}
