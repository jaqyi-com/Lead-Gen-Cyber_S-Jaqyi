import { google } from 'googleapis';
import * as fs from 'fs';
import { EnrichedLead } from '../pipeline/enrich';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME ?? 'Sheet1';

/** Column headers — order must match row building below */
const HEADERS = [
  'Date',
  'Source',
  'Link',
  'Budget',
  'Contact Name',
  'Company',
  'Domain',
  'Email',
  'Status',
  'Notes',
  'Category',
  'Buying Intent Score',
  'LinkedIn URL',
  'Company Size',
  'Reasoning',
];

/** Load Google credentials from file path or inline JSON env var */
function loadCredentials(): Record<string, unknown> {
  const filePath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH;
  if (filePath && fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  }
  const inlineJson = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  if (inlineJson) {
    return JSON.parse(inlineJson) as Record<string, unknown>;
  }
  throw new Error('No Google Sheets credentials found. Set GOOGLE_SHEETS_CREDENTIALS_PATH or GOOGLE_SHEETS_CREDENTIALS_JSON.');
}

/** Initialise Google Sheets API client from service account credentials */
function getSheetsClient() {
  const creds = loadCredentials();

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/** Ensure the header row exists; create it if the sheet is empty */
async function ensureHeaders(
  sheets: ReturnType<typeof getSheetsClient>
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A1:A1`,
  });

  const existing = res.data.values;
  if (!existing || existing.length === 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
    console.log('[sheets] Header row written');
  }
}

/** Convert an EnrichedLead to a row array matching HEADERS order */
function leadToRow(lead: EnrichedLead): string[] {
  return [
    new Date().toISOString().split('T')[0], // Date (YYYY-MM-DD)
    lead.source,
    lead.url,
    lead.budget ?? '',
    lead.contactName ?? lead.authorName ?? '',
    lead.company ?? '',
    lead.domain ?? '',
    lead.email ?? '',
    'New',                   // Status — default for new rows
    '',                      // Notes — filled in manually
    lead.category,
    String(lead.buyingIntentScore),
    lead.linkedinUrl ?? '',
    lead.companySize ?? '',
    lead.reasoning,
  ];
}

/**
 * Appends finalized leads to the Google Sheet.
 * Creates header row on first run if the sheet is empty.
 */
export async function appendLeadsToSheet(leads: EnrichedLead[]): Promise<void> {
  if (leads.length === 0) {
    console.log('[sheets] No leads to append');
    return;
  }

  const sheets = getSheetsClient();
  await ensureHeaders(sheets);

  const rows = leads.map(leadToRow);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });

  console.log(`[sheets] Appended ${rows.length} rows to Sheet "${TAB_NAME}"`);
}
