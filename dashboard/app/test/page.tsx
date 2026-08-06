'use client';

import { useState, useCallback } from 'react';

type Status = 'idle' | 'loading' | 'ok' | 'fail';

interface ApiResult {
  status: Status;
  message: string;
  latencyMs?: number;
  detail?: string;
}

const APIS = [
  {
    id: 'sheets',
    name: 'Google Sheets',
    icon: '📊',
    description: 'Read leads from Sheet1 via service account',
    color: '#10b981',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (Claude)',
    icon: '🧠',
    description: 'AI classification via anthropic/claude-3.5-sonnet',
    color: '#7c3aed',
  },
  {
    id: 'apollo',
    name: 'Apollo.io',
    icon: '🔍',
    description: 'Contact enrichment — person/org search',
    color: '#06b6d4',
  },
  {
    id: 'apify',
    name: 'Apify',
    icon: '🕷️',
    description: 'Web scraping actors — Freelancer/Upwork/Reddit',
    color: '#f59e0b',
  },
  {
    id: 'smtp',
    name: 'SMTP (Gmail)',
    icon: '📧',
    description: 'Digest email via akshatverma@jaqyi.com',
    color: '#f43f5e',
  },
];

const STATUS_ICON: Record<Status, string> = {
  idle: '○', loading: '◌', ok: '✓', fail: '✗',
};

export default function ApiTestPage() {
  const [results, setResults] = useState<Record<string, ApiResult>>({});
  const [running, setRunning] = useState(false);

  const updateResult = useCallback((id: string, result: ApiResult) => {
    setResults(prev => ({ ...prev, [id]: result }));
  }, []);

  async function runTest(id: string) {
    updateResult(id, { status: 'loading', message: 'Testing…' });
    const start = Date.now();
    try {
      const res = await fetch(`/api/test/${id}`);
      const data = await res.json() as { ok: boolean; message: string; detail?: string };
      const latencyMs = Date.now() - start;
      updateResult(id, {
        status: data.ok ? 'ok' : 'fail',
        message: data.message,
        latencyMs,
        detail: data.detail,
      });
    } catch (err) {
      updateResult(id, { status: 'fail', message: `Network error: ${String(err)}`, latencyMs: Date.now() - start });
    }
  }

  async function runAll() {
    setRunning(true);
    for (const api of APIS) {
      await runTest(api.id);
    }
    setRunning(false);
  }

  const allDone = APIS.every(a => results[a.id]?.status === 'ok' || results[a.id]?.status === 'fail');
  const passing = APIS.filter(a => results[a.id]?.status === 'ok').length;
  const failing = APIS.filter(a => results[a.id]?.status === 'fail').length;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f0ff', letterSpacing: '-0.02em' }}>API Health Check</h1>
        <p style={{ fontSize: 13, color: 'rgba(241,240,255,0.4)', marginTop: 4 }}>
          Live tests for all 5 integrations — Sheets, OpenRouter, Apollo, Apify, SMTP
        </p>
      </div>

      {/* Summary + Run button */}
      <div className="card fade-up-1" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Passing</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{passing}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Failing</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: failing > 0 ? '#f43f5e' : 'rgba(241,240,255,0.2)' }}>{failing}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'rgba(241,240,255,0.6)' }}>{APIS.length}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" onClick={runAll} disabled={running}>
            {running ? (
              <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%' }}/> Running…</>
            ) : '▶ Run All Tests'}
          </button>
          {allDone && <button className="btn-ghost" onClick={() => setResults({})}>Reset</button>}
        </div>
      </div>

      {/* API Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {APIS.map((api, i) => {
          const r = results[api.id];
          const status = r?.status ?? 'idle';
          const statusColor = { idle: 'rgba(241,240,255,0.2)', loading: '#f59e0b', ok: '#10b981', fail: '#f43f5e' }[status];
          const bgColor = { idle: 'transparent', loading: 'rgba(245,158,11,0.05)', ok: 'rgba(16,185,129,0.05)', fail: 'rgba(244,63,94,0.05)' }[status];
          return (
            <div
              key={api.id}
              className="card fade-up"
              style={{ padding: '18px 22px', animationDelay: `${i * 0.06}s`, background: bgColor, transition: 'background 0.3s' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: api.color + '22', border: `1px solid ${api.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {api.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f0ff' }}>{api.name}</span>
                      {r?.latencyMs && (
                        <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', color: 'rgba(241,240,255,0.4)' }}>
                          {r.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Status indicator */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 700, color: statusColor,
                      }}>
                        {status === 'loading' ? (
                          <span className="spin" style={{ display: 'inline-block', width: 12, height: 12, border: `2px solid ${statusColor}44`, borderTop: `2px solid ${statusColor}`, borderRadius: '50%' }}/>
                        ) : (
                          <span style={{ fontSize: 14 }}>{STATUS_ICON[status]}</span>
                        )}
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 11 }}>{status}</span>
                      </div>
                      <button
                        className="btn-ghost"
                        style={{ padding: '5px 14px', fontSize: 12 }}
                        onClick={() => runTest(api.id)}
                        disabled={status === 'loading'}
                      >
                        Test
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(241,240,255,0.4)', marginBottom: r ? 8 : 0 }}>{api.description}</p>
                  {r && status !== 'idle' && (
                    <div style={{
                      marginTop: 8, padding: '8px 12px', borderRadius: 8,
                      background: status === 'ok' ? 'rgba(16,185,129,0.08)' : status === 'fail' ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${statusColor}22`,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: statusColor, marginBottom: r.detail ? 4 : 0 }}>{r.message}</p>
                      {r.detail && <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.4)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{r.detail}</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info note */}
      <div style={{ marginTop: 24, padding: '14px 18px', borderRadius: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
        <p style={{ fontSize: 12, color: 'rgba(241,240,255,0.5)' }}>
          <strong style={{ color: '#a78bfa' }}>Note:</strong> API tests run server-side via Next.js API routes. SMTP test sends a real test email to <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>akshat@jaqyi.com</code>. Apify tests start a real actor run (costs credits).
        </p>
      </div>
    </div>
  );
}
