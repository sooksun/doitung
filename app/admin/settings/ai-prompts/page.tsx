// app/admin/settings/ai-prompts/page.tsx
// Admin-only: edit the AI SYSTEM prompts (global). Each card edits one prompt's
// system message; blank/disabled/no-override falls back to the code default.
// Mirrors the feature-flags admin page (token + 401/403 + toast).

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toastSuccess, toastError } from '@/lib/toast';

interface PromptRow {
  key: string;
  label: string;
  description: string;
  default: string;
  override: string | null;
  enabled: boolean;
  isOverridden: boolean;
  active: string;
  updatedAt: string | null;
}

interface Draft {
  text: string;
  enabled: boolean;
  saving: boolean;
}

const initialDraft = (r: PromptRow): Draft => ({
  text: r.override ?? r.default,
  enabled: r.isOverridden ? r.enabled : true,
  saving: false,
});

export default function AiPromptsAdminPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [rows, setRows] = useState<PromptRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hydrate = (items: PromptRow[]) => {
    setRows(items);
    setDrafts(Object.fromEntries(items.map((r) => [r.key, initialDraft(r)])));
  };

  const load = useCallback(async (authToken: string) => {
    try {
      const res = await fetch('/api/admin/ai-prompts', { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.status === 401) { localStorage.removeItem('token'); router.push('/login'); return; }
      if (res.status === 403) { setError('คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะ admin)'); return; }
      if (!res.ok) throw new Error('Failed');
      const json = await res.json();
      if (json.success) hydrate(json.data.items);
    } catch {
      setError('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (!stored) { router.push('/login'); return; }
    setToken(stored);
    load(stored);
  }, [router, load]);

  const patchDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const applyRow = (row: PromptRow) => {
    setRows((prev) => prev.map((r) => (r.key === row.key ? row : r)));
    setDrafts((prev) => ({ ...prev, [row.key]: initialDraft(row) }));
  };

  const save = async (key: string) => {
    if (!token) return;
    const d = drafts[key];
    if (!d || !d.text.trim()) { toastError('ข้อความ prompt ต้องไม่ว่าง'); return; }
    patchDraft(key, { saving: true });
    try {
      const res = await fetch(`/api/admin/ai-prompts/${key}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: d.text, enabled: d.enabled }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError(json.error || 'บันทึกไม่สำเร็จ'); patchDraft(key, { saving: false }); return; }
      toastSuccess('บันทึกสำเร็จ');
      if (json.data) applyRow(json.data); else patchDraft(key, { saving: false });
    } catch {
      toastError('เกิดข้อผิดพลาด');
      patchDraft(key, { saving: false });
    }
  };

  const reset = async (key: string) => {
    if (!token) return;
    patchDraft(key, { saving: true });
    try {
      const res = await fetch(`/api/admin/ai-prompts/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) { toastError(json.error || 'คืนค่าไม่สำเร็จ'); patchDraft(key, { saving: false }); return; }
      toastSuccess('คืนค่าเริ่มต้นแล้ว');
      if (json.data) applyRow(json.data); else patchDraft(key, { saving: false });
    } catch {
      toastError('เกิดข้อผิดพลาด');
      patchDraft(key, { saving: false });
    }
  };

  const card: React.CSSProperties = { background: 'var(--de-bg-surface)', padding: '1.25rem 1.5rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', marginBottom: '1.25rem' };
  const btn = (bg: string): React.CSSProperties => ({ padding: '0.5rem 1.1rem', background: bg, color: 'white', border: 'none', borderRadius: '0.45rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' });

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', background: 'var(--de-bg-canvas)' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--de-text-primary)', marginBottom: '0.35rem' }}>🧠 ตั้งค่า AI Prompt</h1>
            <p style={{ color: 'var(--de-text-secondary)', margin: 0 }}>ปรับ system prompt ของการสรุป/วิเคราะห์ด้วย AI (ระดับโครงการ) — เว้นว่างหรือกดคืนค่าเพื่อใช้ค่าเริ่มต้นของระบบ</p>
          </div>
          <Link href="/admin/thai-summary" style={{ padding: '0.5rem 1rem', background: 'var(--de-primary)', color: 'var(--de-on-primary)', borderRadius: '0.5rem', textDecoration: 'none' }}>← กลับ</Link>
        </div>

        {error && <div style={{ padding: '1rem', background: 'var(--de-danger-soft)', color: 'var(--de-danger)', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}

        {loading ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--de-text-secondary)' }}>กำลังโหลด...</div>
        ) : rows.length === 0 && !error ? (
          <div style={{ ...card, textAlign: 'center', color: 'var(--de-text-secondary)' }}>ไม่พบ prompt</div>
        ) : rows.map((r) => {
          const d = drafts[r.key];
          if (!d) return null;
          const usingCustom = r.isOverridden && r.enabled;
          const dirty = d.text !== (r.override ?? r.default) || d.enabled !== (r.isOverridden ? r.enabled : true);
          return (
            <div key={r.key} style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--de-text-primary)' }}>{r.label}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>{r.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--de-text-tertiary)', marginTop: '0.2rem', fontFamily: 'ui-monospace, monospace' }}>key: {r.key}</div>
                </div>
                <span style={{
                  flexShrink: 0, padding: '0.2rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                  background: usingCustom ? 'var(--de-success-soft)' : 'var(--de-bg-canvas)',
                  color: usingCustom ? 'var(--de-success)' : 'var(--de-text-secondary)',
                  border: `1px solid ${usingCustom ? 'var(--de-success-soft)' : 'var(--de-border)'}`,
                }}>{usingCustom ? '✎ กำหนดเอง' : '◌ ค่าเริ่มต้น'}</span>
              </div>

              <textarea
                value={d.text}
                onChange={(e) => patchDraft(r.key, { text: e.target.value })}
                rows={12}
                spellCheck={false}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--de-border-strong)', borderRadius: '0.5rem', fontSize: '0.85rem', lineHeight: 1.6, fontFamily: 'ui-monospace, monospace', background: 'var(--de-bg-canvas)', color: 'var(--de-text-primary)', boxSizing: 'border-box', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--de-text-secondary)' }}>
                  <input type="checkbox" checked={d.enabled} onChange={(e) => patchDraft(r.key, { enabled: e.target.checked })} />
                  ใช้ข้อความที่กำหนดเอง (ปิด = ใช้ค่าเริ่มต้น)
                </label>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {r.updatedAt && <span style={{ fontSize: '0.72rem', color: 'var(--de-text-tertiary)' }}>แก้ล่าสุด {new Date(r.updatedAt).toLocaleString('th-TH')}</span>}
                  <button onClick={() => reset(r.key)} disabled={d.saving || !r.isOverridden} style={{ ...btn('var(--de-text-tertiary)'), opacity: !r.isOverridden ? 0.5 : 1, cursor: !r.isOverridden || d.saving ? 'not-allowed' : 'pointer' }}>คืนค่าเริ่มต้น</button>
                  <button onClick={() => save(r.key)} disabled={d.saving || !dirty} style={{ ...btn('var(--de-success)'), opacity: !dirty ? 0.5 : 1, cursor: !dirty || d.saving ? 'not-allowed' : 'pointer' }}>{d.saving ? '...' : '💾 บันทึก'}</button>
                </div>
              </div>

              <details style={{ marginTop: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--de-primary)' }}>ดูค่าเริ่มต้นจากระบบ (อ้างอิง)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: '0.5rem', padding: '0.75rem', background: 'var(--de-bg-canvas)', border: '1px dashed var(--de-border)', borderRadius: '0.5rem', fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--de-text-secondary)' }}>{r.default}</pre>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
