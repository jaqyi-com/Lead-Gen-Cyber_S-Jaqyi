/**
 * slack.ts
 *
 * Notification Service — spec §2.7
 *
 * Posts a lead summary card to a Slack webhook for any lead that
 * scored >= SCORE_ALERT_THRESHOLD and was assigned to a rep.
 *
 * If SLACK_WEBHOOK_URL is not set, the function no-ops gracefully.
 */

import axios from 'axios';
import { AssignmentResult } from '../pipeline/assign';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? '';

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${score}/100`;
}

function buildSlackPayload(result: AssignmentResult): object {
  const { lead, repName, dueAt, score } = result;

  const budgetStr = (() => {
    if (lead.budget_max != null) return `$${lead.budget_max.toLocaleString()}${lead.currency && lead.currency !== 'USD' ? ` ${lead.currency}` : ''}`;
    if (lead.budget_min != null) return `$${lead.budget_min.toLocaleString()}+`;
    if (lead.budget_raw) return lead.budget_raw;
    return 'Not specified';
  })();

  const contactStr = [
    lead.client_name ?? lead.company,
    lead.job_title,
    lead.verified_email,
    lead.linkedin_url ? `<${lead.linkedin_url}|LinkedIn>` : null,
  ].filter(Boolean).join(' · ');

  return {
    text: `🎯 *New High-Score Lead* — assigned to ${repName}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🎯 New High-Score Lead', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<${lead.project_url}|${lead.title.slice(0, 100)}>*\n${scoreBar(score)}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Source:*\n${lead.source}` },
          { type: 'mrkdwn', text: `*Budget:*\n${budgetStr}` },
          { type: 'mrkdwn', text: `*Contact:*\n${contactStr || '—'}` },
          { type: 'mrkdwn', text: `*Assigned to:*\n${repName}` },
          { type: 'mrkdwn', text: `*Email Status:*\n${lead.email_status ?? 'unknown'}` },
          { type: 'mrkdwn', text: `*Due:*\n${new Date(dueAt).toLocaleString()}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔗 View Posting', emoji: true },
            url: lead.project_url,
            action_id: 'view_posting',
          },
        ],
      },
      { type: 'divider' },
    ],
  };
}

/**
 * Send Slack notifications for all assigned leads above threshold.
 * No-ops silently if SLACK_WEBHOOK_URL is not configured.
 */
export async function sendSlackNotifications(assignments: AssignmentResult[]): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    if (assignments.length > 0) {
      console.log('[slack] SLACK_WEBHOOK_URL not set — skipping Slack notifications');
    }
    return;
  }

  if (assignments.length === 0) {
    console.log('[slack] No assignments to notify');
    return;
  }

  console.log(`[slack] Sending ${assignments.length} Slack notification(s)…`);
  let sent = 0;

  for (const result of assignments) {
    try {
      await axios.post(SLACK_WEBHOOK_URL, buildSlackPayload(result), {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10_000,
      });
      sent++;
      console.log(`[slack] ✓ Notified: "${result.lead.title.slice(0, 60)}" (score ${result.score})`);
      // Slack rate limit — 1 msg/sec safe
      await new Promise((r) => setTimeout(r, 1_000));
    } catch (err) {
      console.error(`[slack] ✖ Failed to send notification for "${result.lead.title.slice(0, 60)}":`, err);
    }
  }

  console.log(`[slack] Done — ${sent}/${assignments.length} notifications sent`);
}
