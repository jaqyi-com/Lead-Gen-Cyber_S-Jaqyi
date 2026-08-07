import { google } from 'googleapis';
import { Lead } from './types';
import * as fs from 'fs';
import * as path from 'path';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const TAB_NAME = process.env.GOOGLE_SHEET_TAB_NAME ?? 'Sheet1';

function getCredentials(): Record<string, unknown> {
  // 1. Vercel: inline JSON via env var
  const inline = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  if (inline) {
    return JSON.parse(inline) as Record<string, unknown>;
  }
  // 2. Local fallback to environment path or default file location
  const filePath = process.env.GOOGLE_SHEETS_CREDENTIALS_PATH || path.resolve(process.cwd(), '../google-credentials.json');
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  }

  throw new Error(
    'Neither GOOGLE_SHEETS_CREDENTIALS_JSON nor GOOGLE_SHEETS_CREDENTIALS_PATH (or local file) was found.'
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
