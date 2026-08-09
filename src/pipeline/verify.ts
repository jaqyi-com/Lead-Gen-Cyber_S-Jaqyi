/**
 * verify.ts
 *
 * Email Verification Service — spec §2.4
 *
 * Pulls all leads with status='enriched' that have a verified_email,
 * calls ZeroBounce to confirm the email is real, then advances to status='verified'.
 *
 * If ZEROBOUNCE_API_KEY is not set, all enriched leads are advanced with
 * email_status='unknown' so the pipeline continues without blocking.
 */

import axios from 'axios';
import {
  getLeadsByStatus,
  updateEmailVerification,
  EmailStatus,
  DbLead,
} from '../storage/db';

const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY ?? '';

interface ZeroBounceResponse {
  status: string; // 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail'
  error?: string;
}

/** Map ZeroBounce status strings to our EmailStatus enum */
function mapStatus(raw: string): EmailStatus {
  switch (raw?.toLowerCase()) {
    case 'valid':     return 'valid';
    case 'invalid':   return 'invalid';
    case 'catch-all': return 'catch-all';
    default:          return 'unknown';
  }
}

async function verifyEmail(email: string): Promise<EmailStatus> {
  try {
    const res = await axios.get<ZeroBounceResponse>(
      'https://api.zerobounce.net/v2/validate',
      {
        params: {
          api_key: ZEROBOUNCE_API_KEY,
          email,
          ip_address: '',
        },
        timeout: 15_000,
      }
    );
    const status = mapStatus(res.data?.status ?? '');
    console.log(`[verify] ${email} → ${status}`);
    return status;
  } catch (err) {
    console.warn(`[verify] ZeroBounce call failed for ${email}:`, err);
    return 'unknown';
  }
}

/**
 * Pull-based: reads all leads with status='enriched', verifies email,
 * writes email_status, advances to status='verified'.
 *
 * Idempotent: already-verified leads are ignored (they're in a later status).
 */
export async function runVerificationStage(): Promise<void> {
  const enrichedLeads = getLeadsByStatus('enriched');

  if (enrichedLeads.length === 0) {
    console.log('[verify] No enriched leads to verify');
    return;
  }

  console.log(`[verify] ${enrichedLeads.length} leads to verify`);

  const noKey = !ZEROBOUNCE_API_KEY;
  if (noKey) {
    console.warn('[verify] ZEROBOUNCE_API_KEY not set — advancing all with email_status=unknown');
  }

  let verified = 0;
  let skipped = 0;

  for (const lead of enrichedLeads) {
    let emailStatus: EmailStatus = 'unknown';

    if (!noKey && lead.verified_email) {
      emailStatus = await verifyEmail(lead.verified_email);
      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    } else if (!lead.verified_email) {
      skipped++;
    }

    updateEmailVerification(lead.dedup_hash, emailStatus);
    verified++;
  }

  console.log(`[verify] Done — ${verified} leads advanced to 'verified' (${skipped} had no email)`);
}
