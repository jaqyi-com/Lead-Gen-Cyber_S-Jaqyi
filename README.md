# JAQYI Lead Generation Pipeline

Automated pipeline that finds buying-intent signals across Freelancer, Upwork, Reddit, Twitter/X, and LinkedIn (public search only), enriches each lead via Apollo.io, and delivers a structured outreach-ready list to Google Sheets + a daily HTML digest email.

---

## Quick Start

### 1. Copy and fill env vars
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 2. Install dependencies
```bash
npm install
```

> **Note**: If disk space is tight, you can point npm's cache elsewhere:
> ```bash
> npm install --cache /path/to/bigger/disk/.npm-cache
> ```

### 3. One-off run
```bash
npm run start
```

### 4. Daily scheduled run (cron)
```bash
npm run schedule
```

---

## Architecture

```
sources (Freelancer, Upwork, Reddit, Twitter, LinkedIn-public)
  ↓
normalize   → common RawLead shape
  ↓
dedupe      → SHA-256 hash on source+url, skip already-seen
  ↓
classify    → Claude claude-3-5-sonnet: category + buying intent score (1–5)
  ↓ (filter: score ≥ 3, category ≠ none)
enrich      → Apollo.io: company, domain, verified email, LinkedIn URL
  ↓
sheets      → append rows to Google Sheets
  ↓
digest      → HTML email via Gmail API or SMTP
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `APIFY_TOKEN` | Apify API token — [console.apify.com](https://console.apify.com/account/integrations) |
| `ANTHROPIC_API_KEY` | Anthropic API key — [console.anthropic.com](https://console.anthropic.com/settings/api-keys) |
| `APOLLO_API_KEY` | Apollo.io API key — [app.apollo.io](https://app.apollo.io/#/settings/integrations/api) |
| `GOOGLE_SHEETS_CREDENTIALS_JSON` | Service account credentials JSON (single-line stringified) |
| `GOOGLE_SHEET_ID` | The ID from your Sheet URL (`/spreadsheets/d/<ID>/edit`) |
| `GOOGLE_SHEET_TAB_NAME` | Sheet tab name (default: `Leads`) |
| `GMAIL_API_CREDENTIALS_JSON` | OAuth2 credentials JSON for Gmail (single-line stringified) |
| `USE_SMTP` | Set `true` to use SMTP instead of Gmail API |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | SMTP credentials if `USE_SMTP=true` |
| `DIGEST_RECIPIENT_EMAIL` | Where to send the daily digest |
| `DIGEST_FROM_EMAIL` | From address (default: `noreply@jaqyi.com`) |
| `CRON_SCHEDULE` | Cron expression (default: `0 9 * * *` — 9 AM daily) |
| `MIN_INTENT_SCORE` | Minimum Claude buying-intent score to pass (default: `3`) |
| `MAX_ENRICHMENTS_PER_RUN` | Max Apollo enrichments per run to protect credits (default: `50`) |

---

## Google Sheets Setup

1. Create a Google Cloud project and enable the **Sheets API**
2. Create a **Service Account** and download its JSON credentials
3. Share your target Google Sheet with the service account email (Editor role)
4. Set `GOOGLE_SHEETS_CREDENTIALS_JSON` to the stringified JSON:
   ```bash
   cat credentials.json | tr -d '\n' | pbcopy  # macOS
   ```

## Gmail API Setup (if not using SMTP)

1. Enable **Gmail API** in Google Cloud Console
2. Create OAuth2 credentials (Desktop app type)
3. Run the OAuth2 consent flow once to get a `refresh_token`
4. Set `GMAIL_API_CREDENTIALS_JSON` with `client_id`, `client_secret`, `redirect_uri`, `refresh_token`

---

## Output Format

Each row in the Google Sheet:

| Date | Source | Link | Budget | Contact Name | Company | Domain | Email | Status | Notes | Category | Buying Intent Score | LinkedIn URL | Company Size | Reasoning |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

---

## Compliance Notes

- **LinkedIn**: Only publicly-indexed posts surfaced via Google Search (`site:linkedin.com` queries). No direct LinkedIn authentication or session cookies.
- **Apollo.io**: Enrichment pulls from Apollo's own firmographic database only — no private profile scraping.
- **Freelancer/Upwork**: Only public job listing data is collected. No client private contact details outside their public listing.
- Each source fails gracefully — one broken source never crashes the full run.

---

## Project Structure

```
/src
  /sources          → Apify actor callers (one per platform)
  /pipeline
    normalize.ts    → raw → RawLead shape
    classify.ts     → Claude scoring + category filter
    dedupe.ts       → SHA-256 hash cache (seen-hashes.json)
    enrich.ts       → Apollo.io enrichment
  /storage
    sheets.ts       → Google Sheets append
  /delivery
    digest.ts       → HTML email builder + sender
  /config
    keywords.ts     → keyword sets per JAQYI category
    subreddits.ts   → target subreddit list
  index.ts          → pipeline orchestrator (npm run start)
  scheduler.ts      → cron entrypoint (npm run schedule)
```
