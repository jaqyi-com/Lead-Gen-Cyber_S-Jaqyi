'use client';

import { useState, useEffect, useCallback } from 'react';

interface Config {
  keywords: string[];
  categories: Record<string, string[]>;
  schedule: { enabled: boolean; cron: string; label: string };
  sources?: Record<string, boolean>;
  lastRun: string | null;
  lastRunStatus: string | null;
}

interface RunStatus {
  lastRun: string | null;
  lastRunStatus: string | null;
  isRunning: boolean;
  pid?: number;
  progress?: { step: string; current: number; total: number } | null;
}

const CRON_PRESETS = [
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Every 12 hours', cron: '0 */12 * * *' },
  { label: 'Daily at 6 AM', cron: '0 6 * * *' },
  { label: 'Daily at 9 AM', cron: '0 9 * * *' },
  { label: 'Twice daily (9am + 6pm)', cron: '0 9,18 * * *' },
  { label: 'Weekly (Monday 9 AM)', cron: '0 9 * * 1' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Web Development': '#6366f1',
  'Database': '#06b6d4',
  'Backend/API': '#8b5cf6',
  'AI/LLM': '#a855f7',
  'Automation': '#10b981',
  'Cloud/Deployment': '#f59e0b',
  'Software Types': '#f43f5e',
};

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [runStatus, setRunStatus] = useState<RunStatus>({ lastRun: null, lastRunStatus: null, isRunning: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [runMsg, setRunMsg] = useState('');

  // Keyword editor state
  const [newKeyword, setNewKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [selectedCronPreset, setSelectedCronPreset] = useState('');
  const [logs, setLogs] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json() as Config;
        setConfig(data);
        setSelectedCronPreset(data.schedule?.cron ?? '0 6 * * *');
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  const fetchRunStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/run');
      if (res.ok) setRunStatus(await res.json() as RunStatus);
    } catch { /* */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/pipeline/logs');
      if (res.ok) {
        const data = await res.json() as { logs?: string };
        setLogs(data.logs ?? '');
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchRunStatus();
    fetchLogs();
    const t = setInterval(() => {
      fetchRunStatus();
      fetchLogs();
    }, 5000);
    return () => clearInterval(t);
  }, [fetchConfig, fetchRunStatus, fetchLogs]);

  async function saveConfig() {
    if (!config) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: config.keywords, categories: config.categories, schedule: config.schedule }),
      });
      if (res.ok) { setSavedMsg('✅ Saved!'); setTimeout(() => setSavedMsg(''), 3000); }
      else setSavedMsg('❌ Save failed');
    } catch { setSavedMsg('❌ Error saving'); }
    setSaving(false);
  }

  async function triggerRun() {
    setRunning(true);
    setRunMsg('');
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await res.json() as { ok: boolean; message: string };
      setRunMsg(data.ok ? `🚀 ${data.message}` : `❌ ${data.message}`);
      setTimeout(() => fetchRunStatus(), 2000);
    } catch { setRunMsg('❌ Failed to trigger pipeline'); }
    setRunning(false);
  }

  function addKeyword() {
    if (!newKeyword.trim() || !config) return;
    const kw = newKeyword.trim();
    if (config.keywords.includes(kw)) { setNewKeyword(''); return; }
    const updated = { ...config, keywords: [...config.keywords, kw] };
    if (activeCategory && updated.categories[activeCategory]) {
      updated.categories = { ...updated.categories, [activeCategory]: [...updated.categories[activeCategory], kw] };
    }
    setConfig(updated);
    setNewKeyword('');
  }

  function removeKeyword(kw: string) {
    if (!config) return;
    const updated = {
      ...config,
      keywords: config.keywords.filter((k) => k !== kw),
      categories: Object.fromEntries(
        Object.entries(config.categories).map(([cat, kws]) => [cat, kws.filter((k) => k !== kw)])
      ),
    };
    setConfig(updated);
  }

  function addCategory() {
    if (!newCategory.trim() || !config) return;
    setConfig({ ...config, categories: { ...config.categories, [newCategory.trim()]: [] } });
    setActiveCategory(newCategory.trim());
    setNewCategory('');
  }

  function removeCategory(cat: string) {
    if (!config) return;
    const { [cat]: _, ...rest } = config.categories;
    setConfig({ ...config, categories: rest });
  }

  function setCron(cron: string) {
    if (!config) return;
    const preset = CRON_PRESETS.find((p) => p.cron === cron);
    setSelectedCronPreset(cron);
    setConfig({ ...config, schedule: { ...config.schedule, cron, label: preset?.label ?? cron } });
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'rgba(241,240,255,0.4)' }}>
        <div className="spin" style={{ width: 32, height: 32, border: '3px solid rgba(124,58,237,0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', margin: '0 auto 16px' }}/>
        Loading config…
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div className="fade-up" style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f0ff', letterSpacing: '-0.02em' }}>Pipeline Settings</h1>
        <p style={{ fontSize: 13, color: 'rgba(241,240,255,0.4)', marginTop: 4 }}>Manage keywords, categories, schedule, and trigger runs</p>
      </div>

      {/* ── Pipeline Control ────────────────────────────────────── */}
      <div className="card fade-up-1" style={{ padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f0ff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🚀</span> Pipeline Control
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Last run */}
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Last Run</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f0ff' }}>
              {runStatus.lastRun ? new Date(runStatus.lastRun).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : '—'}
            </p>
            {runStatus.lastRunStatus && (
              <p style={{ fontSize: 12, color: 'rgba(241,240,255,0.5)', marginTop: 4 }}>{runStatus.lastRunStatus}</p>
            )}
          </div>
          {/* Status */}
          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: runStatus.isRunning ? '#10b981' : 'rgba(255,255,255,0.2)', boxShadow: runStatus.isRunning ? '0 0 8px #10b981' : 'none', animation: runStatus.isRunning ? 'pulse 1.5s infinite' : 'none' }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: runStatus.isRunning ? '#10b981' : 'rgba(241,240,255,0.6)' }}>
                {runStatus.isRunning ? 'Running…' : 'Idle'}
              </span>
              {runStatus.pid && <span style={{ fontSize: 11, color: 'rgba(241,240,255,0.3)' }}>PID {runStatus.pid}</span>}
            </div>
          </div>
        </div>

        {/* ── 10-Step Pipeline Progress Stepper ────────────────────────── */}
        <div style={{ marginBottom: 24, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f0ff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📊</span> Pipeline Execution Steps
            </span>
            {runStatus.progress ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#a855f7', background: 'rgba(168,85,247,0.12)', padding: '2px 10px', borderRadius: 20, border: '1px solid rgba(168,85,247,0.3)' }}>
                Step {runStatus.progress.current} of {runStatus.progress.total}: {runStatus.progress.step}
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(241,240,255,0.4)' }}>10 Stages Configured</span>
            )}
          </div>

          {/* Master Progress Bar */}
          <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{
              height: '100%',
              width: runStatus.progress ? `${(runStatus.progress.current / runStatus.progress.total) * 100}%` : '0%',
              background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)',
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 12px rgba(168, 85, 247, 0.6)'
            }} />
          </div>

          {/* Stepper Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { id: 1, name: 'Fetch Sources', desc: 'Upwork, Freelancer, Reddit, Twitter, LinkedIn' },
              { id: 2, name: 'Deduplicate', desc: 'Filter existing leads by hash' },
              { id: 3, name: 'AI Classify', desc: 'Filter intent with Claude API' },
              { id: 4, name: 'Enrich', desc: 'Apollo & Hunter contact lookup' },
              { id: 5, name: 'Verify Email', desc: 'ZeroBounce deliverability check' },
              { id: 6, name: 'Score Lead', desc: 'Calculate intent score' },
              { id: 7, name: 'Assign Rep', desc: 'Round-robin rep assignment' },
              { id: 8, name: 'Slack Alert', desc: 'Send notification to sales team' },
              { id: 9, name: 'Google Sheets', desc: 'Sync leads to master sheet' },
              { id: 10, name: 'Email Digest', desc: 'Send summary digest email' },
            ].map((s) => {
              const current = runStatus.progress?.current ?? 0;
              const isDone = current > s.id || (!runStatus.isRunning && runStatus.lastRunStatus?.includes('✅'));
              const isActive = runStatus.isRunning && current === s.id;

              return (
                <div key={s.id} style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isActive ? 'rgba(168,85,247,0.15)' : isDone ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'rgba(168,85,247,0.5)' : isDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)'}`,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#c084fc' : isDone ? '#34d399' : 'rgba(241,240,255,0.4)' }}>
                      Stage {s.id}
                    </span>
                    {isActive ? (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#c084fc', background: 'rgba(192,132,252,0.2)', padding: '1px 6px', borderRadius: 4, animation: 'pulse 1.5s infinite' }}>
                        ACTIVE
                      </span>
                    ) : isDone ? (
                      <span style={{ fontSize: 11, color: '#34d399' }}>✓</span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'rgba(241,240,255,0.25)' }}>Pending</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#f1f0ff' : isDone ? 'rgba(241,240,255,0.9)' : 'rgba(241,240,255,0.6)', marginBottom: 2 }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(241,240,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            className="btn-primary"
            onClick={triggerRun}
            disabled={running || runStatus.isRunning}
            style={{ padding: '10px 24px', fontSize: 14, fontWeight: 700 }}
          >
            {running ? '⏳ Starting…' : runStatus.isRunning ? '⚡ Running…' : '▶ Run Pipeline Now'}
          </button>
          <button className="btn-ghost" onClick={fetchRunStatus} style={{ padding: '10px 16px', fontSize: 13 }}>↻ Refresh</button>
          {runMsg && <span style={{ fontSize: 13, color: runMsg.startsWith('🚀') ? '#10b981' : '#f43f5e' }}>{runMsg}</span>}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.25)', marginTop: 10 }}>
          Run from terminal: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>npm run start</code> · 
          Scheduled daemon: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>npm run schedule</code>
        </p>
      </div>

      {/* ── Lead Sources ────────────────────────────────────────── */}
      <div className="card fade-up-1" style={{ padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f0ff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔌</span> Active Lead Sources
        </h2>
        <p style={{ fontSize: 12, color: 'rgba(241,240,255,0.4)', marginBottom: 16 }}>
          Enable or disable specific lead scraping actors. Disabled sources will be skipped during pipeline runs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { key: 'freelancer', name: 'Freelancer', icon: '💼', color: '#6366f1' },
            { key: 'upwork', name: 'Upwork', icon: '🟢', color: '#10b981' },
            { key: 'reddit', name: 'Reddit', icon: '🤖', color: '#f97316' },
            { key: 'twitter', name: 'Twitter / X', icon: '🐦', color: '#38bdf8' },
            { key: 'linkedin-public', name: 'LinkedIn Public', icon: '💼', color: '#0284c7' },
          ].map((src) => {
            const isEnabled = config?.sources?.[src.key] !== false;

            const handleToggle = async () => {
              if (!config) return;
              const newSources = {
                ...config.sources,
                [src.key]: !isEnabled,
              };
              setConfig({ ...config, sources: newSources });
              try {
                await fetch('/api/config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sources: newSources }),
                });
              } catch (err) {
                console.error('Failed to update source status:', err);
              }
            };

            return (
              <div
                key={src.key}
                onClick={handleToggle}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: isEnabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${isEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                  opacity: isEnabled ? 1 : 0.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{src.icon}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isEnabled ? '#f1f0ff' : 'rgba(241,240,255,0.5)' }}>{src.name}</p>
                    <p style={{ fontSize: 10, color: isEnabled ? src.color : 'rgba(241,240,255,0.3)', marginTop: 1 }}>
                      {isEnabled ? '● Active' : '○ Disabled'}
                    </p>
                  </div>
                </div>

                <div style={{
                  width: 36, height: 20, borderRadius: 999, transition: 'background 0.2s',
                  background: isEnabled ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                  position: 'relative', flexShrink: 0
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: isEnabled ? 19 : 3,
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Schedule ────────────────────────────────────────────── */}
      <div className="card fade-up-1" style={{ padding: '24px', marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f0ff', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🕐</span> Schedule
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div
              onClick={() => config && setConfig({ ...config, schedule: { ...config.schedule, enabled: !config.schedule.enabled } })}
              style={{
                width: 40, height: 22, borderRadius: 999, cursor: 'pointer', transition: 'background 0.2s',
                background: config?.schedule.enabled ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.1)',
                border: `1px solid ${config?.schedule.enabled ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.15)'}`,
                position: 'relative',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 2,
                left: config?.schedule.enabled ? 20 : 2,
                transition: 'left 0.2s',
              }}/>
            </div>
            <span style={{ fontSize: 13, color: 'rgba(241,240,255,0.7)' }}>Enable automatic scheduling</span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.cron}
              onClick={() => setCron(preset.cron)}
              style={{
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                background: selectedCronPreset === preset.cron ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedCronPreset === preset.cron ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: selectedCronPreset === preset.cron ? '#c4b5fd' : '#f1f0ff' }}>{preset.label}</p>
              <p style={{ fontSize: 10, color: 'rgba(241,240,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>{preset.cron}</p>
            </button>
          ))}
        </div>

        {config?.schedule.cron && !CRON_PRESETS.find((p) => p.cron === config.schedule.cron) && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, color: 'rgba(241,240,255,0.4)', marginBottom: 4 }}>Custom cron</p>
            <input
              className="input-field"
              style={{ fontFamily: 'monospace', fontSize: 13 }}
              value={config.schedule.cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 6 * * *"
            />
          </div>
        )}
      </div>

      {/* ── Keywords ────────────────────────────────────────────── */}
      <div className="card fade-up-2" style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f0ff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔑</span> Keywords <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(241,240,255,0.3)' }}>({config?.keywords.length ?? 0} total)</span>
          </h2>
        </div>

        {/* Add keyword row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            className="input-field"
            style={{ flex: 1 }}
            placeholder="Add keyword (e.g. Next.js, GPT-4, Supabase)"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          />
          <select
            className="input-field"
            style={{ width: 180 }}
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
          >
            <option value="">No category</option>
            {Object.keys(config?.categories ?? {}).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button className="btn-primary" onClick={addKeyword} style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>+ Add</button>
        </div>

        {/* Categories with keyword chips */}
        {config && Object.entries(config.categories).map(([cat, kws]) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[cat] ?? '#6b7280' }}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(241,240,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cat}</span>
              <span style={{ fontSize: 11, color: 'rgba(241,240,255,0.25)' }}>({kws.length})</span>
              <button
                onClick={() => removeCategory(cat)}
                style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(241,240,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
              >✕ Remove cat</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {kws.map((kw) => (
                <span key={kw} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: (CATEGORY_COLORS[cat] ?? '#6b7280') + '20',
                  color: CATEGORY_COLORS[cat] ?? '#6b7280',
                  border: `1px solid ${(CATEGORY_COLORS[cat] ?? '#6b7280')}30`,
                }}>
                  {kw}
                  <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 0, fontSize: 11 }}>✕</button>
                </span>
              ))}
              {kws.length === 0 && <span style={{ fontSize: 12, color: 'rgba(241,240,255,0.2)', fontStyle: 'italic' }}>No keywords in this category</span>}
            </div>
          </div>
        ))}

        {/* Uncategorized keywords */}
        {config && (() => {
          const categorized = new Set(Object.values(config.categories).flat());
          const uncategorized = config.keywords.filter((k) => !categorized.has(k));
          if (uncategorized.length === 0) return null;
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6b7280' }}/>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(241,240,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uncategorized</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {uncategorized.map((kw) => (
                  <span key={kw} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                    background: 'rgba(107,114,128,0.15)', color: '#9ca3af',
                    border: '1px solid rgba(107,114,128,0.25)',
                  }}>
                    {kw}
                    <button onClick={() => removeKeyword(kw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, padding: 0, fontSize: 11 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Add category */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            className="input-field"
            style={{ flex: 1, maxWidth: 280 }}
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button className="btn-ghost" onClick={addCategory} style={{ padding: '10px 18px' }}>+ Add Category</button>
        </div>
      </div>

      {/* ── Pipeline Logs ────────────────────────────────────────── */}
      <div className="card fade-up-2" style={{ padding: '24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f0ff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📁</span> Live Pipeline Logs
          </h2>
          <button className="btn-ghost" onClick={fetchLogs} style={{ padding: '4px 10px', fontSize: 11 }}>↻ Refresh Logs</button>
        </div>
        <pre style={{
          background: '#09090f',
          color: '#34d399',
          fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
          fontSize: 12,
          padding: '16px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.06)',
          height: 250,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          margin: 0,
        }}>
          {logs || 'No pipeline execution logs recorded in temporary storage yet.'}
        </pre>
      </div>

      {/* ── Save ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14 }}>
        {savedMsg && <span style={{ fontSize: 13, color: savedMsg.startsWith('✅') ? '#10b981' : '#f43f5e' }}>{savedMsg}</span>}
        <button
          className="btn-primary"
          onClick={saveConfig}
          disabled={saving}
          style={{ padding: '12px 32px', fontSize: 14, fontWeight: 700 }}
        >
          {saving ? '⏳ Saving…' : '💾 Save Settings'}
        </button>
      </div>
    </div>
  );
}
