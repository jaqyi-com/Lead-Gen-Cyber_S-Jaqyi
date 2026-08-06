import { google } from 'googleapis';
import { Lead } from './types';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME ?? 'Sheet1';

function getCredentials(): Record<string, unknown> {
  // Vercel: inline JSON via env var (set GOOGLE_SHEETS_CREDENTIALS_JSON)
  const inline = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  if (inline) {
    return JSON.parse(inline) as Record<string, unknown>;
  }
  throw new Error(
    'GOOGLE_SHEETS_CREDENTIALS_JSON env var is required. ' +
    'Paste the service account JSON as a single-line string.'
  );
}

function getSheetsClient() {
  const creds = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

export async function fetchAllLeads(): Promise<Lead[]> {
  const sheets = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TAB_NAME}!A:O`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return []; // header only or empty

  // Row 0 is header — skip it
  return rows.slice(1).map((row) => ({
    date:              row[0]  ?? '',
    source:            row[1]  ?? '',
    link:              row[2]  ?? '',
    budget:            row[3]  ?? '',
    contactName:       row[4]  ?? '',
    company:           row[5]  ?? '',
    domain:            row[6]  ?? '',
    email:             row[7]  ?? '',
    status:            row[8]  ?? 'New',
    notes:             row[9]  ?? '',
    category:          row[10] ?? '',
    buyingIntentScore: Number(row[11] ?? 0),
    linkedinUrl:       row[12] ?? '',
    companySize:       row[13] ?? '',
    reasoning:         row[14] ?? '',
  }));
}
