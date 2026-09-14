/**
 * Doott Outreach Email Sender
 * ----------------------------
 * Reads all 75 prospects from the Excel sheet and sends each
 * personalized outreach email via Gmail SMTP (akshat@jaqyi.com).
 *
 * Usage:
 *   npx ts-node src/outreach/sendOutreach.ts
 *
 * Dry-run (no emails sent, just logged):
 *   DRY_RUN=true npx ts-node src/outreach/sendOutreach.ts
 *
 * Resume from a specific row (e.g. skip first 10):
 *   START_FROM=10 npx ts-node src/outreach/sendOutreach.ts
 */

import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ───────────────────────────────────────────────────────────────────

const SMTP_CONFIG = {
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? 'akshat@jaqyi.com',
    pass: process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? '',
  },
};

const FROM_NAME    = 'Akshat | Doott';
const FROM_EMAIL   = 'akshat@jaqyi.com';
const FROM_HEADER  = `"${FROM_NAME}" <${FROM_EMAIL}>`;

/** Delay between each email send (ms) — 5s default to stay within Gmail limits */
const SEND_DELAY_MS = parseInt(process.env.SEND_DELAY_MS ?? '5000', 10);

/** Set DRY_RUN=true to log without actually sending */
const DRY_RUN = process.env.DRY_RUN === 'true';

/** Skip the first N prospects (useful to resume a partial run) */
const START_FROM = parseInt(process.env.START_FROM ?? '0', 10);

const XLSX_PATH = path.resolve(
  __dirname,
  '../../Doott_Long_Personalized_Outreach_75_Prospects.xlsx'
);

const LOG_PATH = path.resolve(__dirname, '../../outreach_log.json');

// ─── Types ────────────────────────────────────────────────────────────────────

interface Prospect {
  firstName:   string;
  fullName:    string;
  email:       string;
  company:     string;
  jobTitle:    string;
  industry:    string;
  city:        string;
  state:       string;
  subject:     string;
  body:        string;
  phone:       string;
  whatsapp:    string;
  waLink:      string;
  pitchLink:   string;
  linkedinUrl: string;
  location:    string;
  website:     string;
}

type SendResult = {
  index:   number;
  name:    string;
  email:   string;
  company: string;
  subject: string;
  status:  'sent' | 'failed' | 'skipped';
  error?:  string;
  sentAt?: string;
};

// ─── Excel Reader ─────────────────────────────────────────────────────────────

function loadProspects(): Prospect[] {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
    defval: '',
  });

  return rows.map((r) => ({
    firstName:   r['First Name']              ?? '',
    fullName:    r['Full Name']               ?? '',
    email:       r['Emails']                  ?? '',
    company:     r['Company Name']            ?? '',
    jobTitle:    r['Job Title']               ?? '',
    industry:    r['Industry']                ?? '',
    city:        r['City']                    ?? '',
    state:       r['State']                   ?? '',
    subject:     r['Email Subject']           ?? '',
    body:        r['Personalized Outreach Email'] ?? '',
    phone:       String(r['Phone']            ?? ''),
    whatsapp:    String(r['WhatsApp Number']  ?? ''),
    waLink:      r['1-Click WhatsApp Link']   ?? '',
    pitchLink:   r['1-Click Pre-filled Pitch Link'] ?? '',
    linkedinUrl: r['LinkedIn URL']            ?? '',
    location:    r['Location']                ?? '',
    website:     r['Website']                 ?? '',
  }));
}

// ─── HTML Email Builder ───────────────────────────────────────────────────────

function buildHtml(p: Prospect): string {
  // Convert plain text body to HTML paragraphs + preserve bullet points
  const htmlBody = p.body
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === '') return '<br>';
      if (trimmed.startsWith('•')) {
        return `<li style="margin:4px 0;">${trimmed.slice(1).trim()}</li>`;
      }
      return `<p style="margin:0 0 10px;">${trimmed}</p>`;
    })
    .join('\n')
    .replace(/((<li[^>]*>.*<\/li>\n?)+)/g, '<ul style="margin:8px 0 16px 20px;padding:0;">$1</ul>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${p.subject}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#1a1a1a;max-width:620px;margin:0 auto;padding:32px 24px;">
  
  <div style="color:#1a1a1a;">
    ${htmlBody}
  </div>

  <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0;">

  <table style="font-size:13px;color:#555;width:100%;">
    <tr>
      <td>
        <strong style="color:#111;font-size:14px;">Akshat</strong><br>
        <span style="color:#6b7280;">Team Doott · JAQYI</span><br>
        <a href="https://data001.netlify.app/" style="color:#4F46E5;text-decoration:none;">data001.netlify.app</a>
        ${p.website ? `<br><a href="http://${p.website.replace(/^https?:\/\//, '')}" style="color:#6b7280;font-size:12px;">${p.website}</a>` : ''}
      </td>
    </tr>
  </table>

  <p style="font-size:11px;color:#aaa;margin-top:24px;">
    You are receiving this because you are listed as ${p.jobTitle} at ${p.company}, ${p.location}.
    If you wish to not receive further communication, simply reply with "Unsubscribe".
  </p>

</body>
</html>`;
}

// ─── SMTP Sender ──────────────────────────────────────────────────────────────

async function createTransporter() {
  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  await transporter.verify();
  console.log('✅ SMTP connection verified — akshat@jaqyi.com ready\n');
  return transporter;
}

async function sendEmail(
  transporter: nodemailer.Transporter,
  prospect: Prospect
): Promise<void> {
  await transporter.sendMail({
    from:    FROM_HEADER,
    to:      `"${prospect.fullName}" <${prospect.email}>`,
    subject: prospect.subject,
    text:    prospect.body,
    html:    buildHtml(prospect),
    headers: {
      'X-Mailer':         'JAQYI Outreach v1.0',
      'X-Campaign':       'Doott-B2B-Outreach',
      'List-Unsubscribe': `<mailto:${FROM_EMAIL}?subject=Unsubscribe>`,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Logger ───────────────────────────────────────────────────────────────────

function loadExistingLog(): SendResult[] {
  try {
    if (fs.existsSync(LOG_PATH)) {
      return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    }
  } catch {
    // ignore malformed log
  }
  return [];
}

function saveLog(results: SendResult[]): void {
  fs.writeFileSync(LOG_PATH, JSON.stringify(results, null, 2), 'utf8');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🚀 Doott Outreach Email Sender');
  console.log(`  Mode: ${DRY_RUN ? '🟡 DRY RUN (no emails sent)' : '🟢 LIVE SEND'}`);
  console.log(`  Delay between emails: ${SEND_DELAY_MS / 1000}s`);
  console.log(`  Starting from row: ${START_FROM + 1}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const prospects = loadProspects();
  console.log(`📋 Loaded ${prospects.length} prospects from Excel\n`);

  // Validate all prospects have email
  const valid = prospects.filter((p) => p.email && p.email.includes('@'));
  const invalid = prospects.filter((p) => !p.email || !p.email.includes('@'));
  if (invalid.length > 0) {
    console.warn(`⚠️  ${invalid.length} prospects skipped — missing/invalid email`);
    invalid.forEach((p) => console.warn(`   ✗ ${p.fullName} — "${p.email}"`));
    console.log();
  }

  // Slice from START_FROM
  const toSend = valid.slice(START_FROM);
  console.log(`📤 Will send to ${toSend.length} prospect(s) (${START_FROM} skipped)\n`);

  const results: SendResult[] = loadExistingLog();
  const alreadySentEmails = new Set(
    results.filter((r) => r.status === 'sent').map((r) => r.email)
  );

  // Create transporter (skip in dry run)
  let transporter: nodemailer.Transporter | null = null;
  if (!DRY_RUN) {
    transporter = await createTransporter();
  }

  let sent = 0, failed = 0, skipped = 0;

  for (let i = 0; i < toSend.length; i++) {
    const p = toSend[i];
    const globalIndex = START_FROM + i + 1;

    // Skip if already sent in a previous run
    if (alreadySentEmails.has(p.email)) {
      console.log(`[${globalIndex}/${valid.length}] ⏭️  Already sent — ${p.firstName} <${p.email}>`);
      skipped++;
      results.push({
        index:   globalIndex,
        name:    p.fullName,
        email:   p.email,
        company: p.company,
        subject: p.subject,
        status:  'skipped',
        sentAt:  new Date().toISOString(),
      });
      continue;
    }

    process.stdout.write(
      `[${globalIndex}/${valid.length}] Sending → ${p.firstName} <${p.email}> (${p.company}) ... `
    );

    const result: SendResult = {
      index:   globalIndex,
      name:    p.fullName,
      email:   p.email,
      company: p.company,
      subject: p.subject,
      status:  'sent',
    };

    if (DRY_RUN) {
      console.log('✅ [DRY RUN]');
      result.status = 'sent';
      result.sentAt = new Date().toISOString();
      sent++;
    } else {
      try {
        await sendEmail(transporter!, p);
        console.log('✅ Sent');
        result.status = 'sent';
        result.sentAt = new Date().toISOString();
        sent++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`❌ FAILED — ${msg}`);
        result.status = 'failed';
        result.error  = msg;
        failed++;
      }
    }

    results.push(result);
    saveLog(results); // save after every email so we can resume

    // Delay before next send (skip after last)
    if (i < toSend.length - 1) {
      await sleep(SEND_DELAY_MS);
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  📊 Campaign Summary');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  ✅ Sent:    ${sent}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📝 Log:     ${LOG_PATH}`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.log('⚠️  Failed emails:');
    results
      .filter((r) => r.status === 'failed')
      .forEach((r) => console.log(`   ✗ [${r.index}] ${r.name} <${r.email}> — ${r.error}`));
  }
}

main().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
