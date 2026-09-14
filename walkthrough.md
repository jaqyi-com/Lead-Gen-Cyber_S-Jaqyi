# Walkthrough — Lead Generation Pipeline Quality & Freshness Upgrade

We have fully upgraded the JAQYI lead pipeline and dashboard to strictly target **high-quality project requirements (things to build)** from decision makers looking for development agencies, dev shops, or custom software developers, while strictly filtering for leads from the **last 2 days**.

---

## 🚀 Key Achievements

1. **Targeted Project Requirements vs Hiring Threads**
   - **Reddit**: Removed queries matching recruitment board threads (`r/forhire [hiring]`). Now targets founder forums (`r/entrepreneur`, `r/startups`, `r/SaaS`, `r/smallbusiness`) looking for agency, dev shop, or vendor recommendations.
   - **LinkedIn & Twitter**: Refined queries to look for "recommend a dev shop", "looking for development agency", "need a team to build", and "agency to build SaaS/MVP/app".
   - **Classifier**: Added a strict rule to drop employee recruiting ads (e.g. "join our team", "benefits", "salary"). Only projects where someone wants a specific product built (SaaS, AI Agent, custom app, automation) pass with a score $\ge 3$.

2. **Strict 2-Day Freshness Filter**
   - **Source Search**: Apify client builds search terms appending `after:YYYY-MM-DD before:YYYY-MM-DD` creating a tight date window Google respects.
   - **Pipeline Filter**: The pipeline applies a secondary date safety net, dropping any lead older than `FRESHNESS_DAYS` (default 2 days) during normalization.

3. **Dashboard Stats Integration**
   - Added file-fallback credentials parsing to `dashboard/lib/sheets.ts` so the dashboard runs perfectly in both local environments (`GOOGLE_SHEETS_CREDENTIALS_PATH`) and production Vercel servers.

---

## 📊 Verification Metrics (Definitive Run)

During the latest pipeline run:
- **Total Scraped (Last 2 Days)**: 240 leads across all platforms.
- **Freshness Filter**: Kept 202 fresh leads, dropping 38 older entries.
- **Classification Output (Score $\ge 3$)**:
  - `✓ KEPT (score 4, SaaS Products): Web-based software for creating online stores - repost`
  - `✓ KEPT (score 4, Automation): Weekly Daft.ie MyHome Scraper`
  - `✓ KEPT (score 4, Mobile & Web Apps): Natalie Alaimo's Post (looking for dev partner)`
  - `✓ KEPT (score 4, SaaS Products): $550K raised. March 2025: looking to build MVP`
- **Exclusion Filters**:
  - `Dropped: B2B Clothing Store Website Build (job board page)`
  - `Dropped: Him Patel's Post (freelancer profile)`
  - `Dropped: CA Vijendra Jain's Post (article/post with no project scope)`
- **Google Sheets & SMTP**: 9 high-quality rows appended to the spreadsheet, and the summary digest email was sent via SMTP.
- [types.ts](file:///Volumes/akshat/Lead/dashboard/lib/types.ts): Added icon mappings for all 24 sources.
- [OverviewClient.tsx](file:///Volumes/akshat/Lead/dashboard/components/OverviewClient.tsx): Added distinct color styling for all 24 sources.
- [settings/page.tsx](file:///Volumes/akshat/Lead/dashboard/app/settings/page.tsx):
  - **Apify Actor API Token Card**: Added token input with show/hide password toggle, real-time live connectivity testing (`/api/test/apify`), direct link to Apify Console, and immediate saving to `pipeline-config.json`.
  - Added toggle switches for all 24 sources to give full control over which scrapers run.
- [apifyClient.ts](file:///Volumes/akshat/Lead/src/sources/apifyClient.ts): Dynamically loads the active Apify token from `pipeline-config.json` before falling back to `APIFY_TOKEN`.

---

## 🛠️ Code Diff Summary

### [reddit.ts](file:///Volumes/akshat/Lead/src/sources/reddit.ts)
```diff
-  'site:reddit.com/r/forhire "[hiring]" "AI agent" OR "AI system" OR "RAG" budget -"for hire"',
+  'site:reddit.com/r/entrepreneur "looking for agency" OR "hire agency" OR "dev shop" OR "development studio"',
+  'site:reddit.com/r/entrepreneur "agency to build" OR "hire developer to build" SaaS OR MVP OR app',
+  'site:reddit.com/r/startups "looking for agency" OR "recommend an agency" OR "development company"',
```

### [classify.ts](file:///Volumes/akshat/Lead/src/pipeline/classify.ts)
```diff
 STRICT RULES:
 - If title contains "[FOR HIRE]" → always score 1, category "none"
 - If it's someone OFFERING services not REQUESTING them → score 1, category "none"
+- If it is a corporate job advertisement or recruitment post for a full-time employee (e.g., "looking for full-time developer to join our team", "salary $120k/year") → always score 1, category "none"
 - If it's an article, tutorial, or opinion piece → score 1, category "none"  
-- Only score 3+ if a real entity is LOOKING TO HIRE someone to BUILD something for them
+- Only score 3+ if a real entity is LOOKING to hire an agency, contractor, freelancer, or studio to BUILD a specific project/product (e.g., custom website, SaaS MVP, n8n automation, AI chatbot)
```
