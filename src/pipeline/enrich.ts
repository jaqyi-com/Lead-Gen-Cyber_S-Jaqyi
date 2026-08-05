import axios from 'axios';
import { ClassifiedLead } from './classify';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY!;
const MAX_ENRICHMENTS = parseInt(process.env.MAX_ENRICHMENTS_PER_RUN ?? '50', 10);

export interface EnrichedLead extends ClassifiedLead {
  contactName?: string;
  company?: string;
  domain?: string;
  email?: string;
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

/**
 * Enriches classified leads with Apollo.io firmographic data.
 *
 * Rules:
 * - Anonymous posts (Reddit/Twitter without identifiable company) are passed
 *   through with empty enrichment fields — still valid leads for platform reply.
 * - Enrichment is capped at MAX_ENRICHMENTS_PER_RUN to protect API credits.
 * - Apollo data is pulled from Apollo's own database — no private profile scraping.
 */
export async function enrichLeads(leads: ClassifiedLead[]): Promise<EnrichedLead[]> {
  const results: EnrichedLead[] = [];
  let enrichmentCount = 0;

  for (const lead of leads) {
    const enriched: EnrichedLead = { ...lead };

    const company = guessCompanyName(lead);
    const domain = lead.url ? extractDomain(lead.url) : undefined;

    const canEnrich =
      enrichmentCount < MAX_ENRICHMENTS &&
      (company || domain) &&
      // Don't enrich against freelancing platform domains themselves
      domain &&
      !['freelancer.com', 'upwork.com', 'reddit.com', 'twitter.com', 'x.com', 'linkedin.com'].includes(domain);

    if (canEnrich && domain) {
      enrichmentCount++;
      console.log(`[enrich] Enriching lead #${enrichmentCount}: ${lead.url}`);

      // Run org + person lookup in parallel
      const [orgData, personData] = await Promise.all([
        enrichOrganization(domain),
        company ? enrichPerson(company, domain) : Promise.resolve({}),
      ]);

      // Merge: person data wins over org data for contact-level fields
      Object.assign(enriched, orgData, personData);

      // Small delay to respect Apollo rate limits
      await new Promise((r) => setTimeout(r, 300));
    } else {
      console.log(
        `[enrich] Skipping enrichment for ${lead.url} (${!canEnrich ? 'no company/domain or cap reached' : 'platform domain'})`
      );
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
