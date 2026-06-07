// app/components/chat/ChatWidget.tsx
// Floating AI assistant available on every authenticated page (mounted in AppShell).
// Mirrors the sticky-note floating pattern (createPortal). Reads the auth token
// from localStorage; renders nothing when logged out. Non-streaming: send a
// question, show a typing indicator, render the grounded answer. History is
// persisted server-side (ChatConversation/ChatMessage).
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toastError } from '@/lib/toast';

interface ConvItem { id: number; title: string; updatedAt: string }
interface Msg { role: 'user' | 'assistant'; content: string; pending?: boolean }

// Line-style AI robot icon (inherits color via currentColor).
function RobotIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
      <path d="M12 5V2.4" />
      <circle cx="12" cy="2" r="1.1" fill="currentColor" stroke="none" />
      <rect x="4.5" y="5.5" width="15" height="12.5" rx="3.5" />
      <path d="M2.5 11v2.6M21.5 11v2.6" />
      <circle cx="9.4" cy="11.6" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="11.6" r="1.25" fill="currentColor" stroke="none" />
      <path d="M9.5 15.1h5" />
    </svg>
  );
}

export default function ChatWidget() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    try { setToken(localStorage.getItem('token')); } catch { /* ignore */ }
  }, []);

  const authH = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadConvs = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch('/api/ai/chat/conversations', { headers: authH() });
      const j = await r.json();
      if (j.success) setConvs(j.data.items);
    } catch { /* ignore */ }
  }, [token, authH]);

  useEffect(() => { if (open) loadConvs(); }, [open, loadConvs]);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const openConv = async (id: number) => {
    try {
      const r = await fetch(`/api/ai/chat/conversations/${id}`, { headers: authH() });
      const j = await r.json();
      if (j.success) {
        setConvId(id);
        setMessages((j.data.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
        setView('chat');
      }
    } catch { toastError('โหลดบทสนทนาไม่สำเร็จ'); }
  };

  const deleteConv = async (id: number) => {
    try {
      const r = await fetch(`/api/ai/chat/conversations/${id}`, { method: 'DELETE', headers: authH() });
      const j = await r.json();
      if (r.ok && j.success) {
        setConvs((p) => p.filter((c) => c.id !== id));
        if (convId === id) { setConvId(null); setMessages([]); }
      } else toastError(j.error || 'ลบไม่สำเร็จ');
    } catch { toastError('ลบไม่สำเร็จ'); }
  };

  const newChat = () => { setConvId(null); setMessages([]); setView('chat'); };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setMessages((p) => [...p, { role: 'user', content: text }, { role: 'assistant', content: '', pending: true }]);
    setSending(true);
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { ...authH(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, message: text }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        setMessages((p) => p.map((m, i) => (i === p.length - 1 ? { role: 'assistant', content: `ขออภัย: ${j.error || 'เกิดข้อผิดพลาด'}` } : m)));
      } else {
        if (!convId) setConvId(j.data.conversationId);
        setMessages((p) => p.map((m, i) => (i === p.length - 1 ? { role: 'assistant', content: j.data.answer } : m)));
        loadConvs();
      }
    } catch {
      setMessages((p) => p.map((m, i) => (i === p.length - 1 ? { role: 'assistant', content: 'ขออภัย เชื่อมต่อระบบไม่สำเร็จ' } : m)));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!mounted || !token) return null;

  const FAB = (
    <button
      onClick={() => setOpen((v) => !v)}
      aria-label="ผู้ช่วย AI"
      style={{
        position: 'fixed', right: 24, bottom: 24, zIndex: 1000,
        width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'var(--de-primary)', color: 'var(--de-on-primary)', fontSize: 26,
        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        display: 'grid', placeItems: 'center',
      }}
    >{open ? '✕' : <RobotIcon size={30} />}</button>
  );

  const panel = open && (
    <div
      role="dialog"
      aria-label="ผู้ช่วย AI"
      style={{
        position: 'fixed', right: 24, bottom: 92, zIndex: 1001,
        width: 'min(400px, calc(100vw - 32px))', height: 'min(560px, calc(100vh - 140px))',
        display: 'flex', flexDirection: 'column',
        background: 'var(--de-bg-surface)', borderRadius: 14, overflow: 'hidden',
        border: '1px solid var(--de-border)', boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
      }}
    >
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 0.9rem', background: 'var(--de-primary)', color: 'var(--de-on-primary)' }}>
        <RobotIcon size={20} />
        <strong style={{ fontSize: '0.95rem', flex: 1 }}>ผู้ช่วย AI — ถาม-ตอบในระบบ</strong>
        <button onClick={() => setView(view === 'chat' ? 'history' : 'chat')} title="ประวัติการสนทนา"
          style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>
          {view === 'chat' ? '🕘' : '💬'}
        </button>
        <button onClick={newChat} title="แชตใหม่" style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 18 }}>＋</button>
      </div>

      {view === 'history' ? (
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {convs.length === 0 ? (
            <div style={{ color: 'var(--de-text-secondary)', textAlign: 'center', marginTop: '2rem', fontSize: '0.88rem' }}>ยังไม่มีประวัติการสนทนา</div>
          ) : convs.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.6rem', borderRadius: 8, marginBottom: 4, background: convId === c.id ? 'var(--de-primary-soft)' : 'transparent' }}>
              <button onClick={() => openConv(c.id)} style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--de-text-primary)', fontSize: '0.85rem' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--de-text-tertiary)' }}>{new Date(c.updatedAt).toLocaleString('th-TH')}</div>
              </button>
              <button onClick={() => deleteConv(c.id)} title="ลบ" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--de-text-tertiary)', fontSize: 14 }}>🗑️</button>
            </div>
          ))}
        </div>
      ) : (
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.length === 0 && (
            <div style={{ color: 'var(--de-text-secondary)', fontSize: '0.85rem', lineHeight: 1.7 }}>
              สวัสดีครับ 👋 ถามได้เลยเรื่อง:
              <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                <li>หลักการ/ทฤษฎี (Q-Model, ภาษาไทย ป.1–3, SOAR, Iceberg)</li>
                <li>ความหมายตัวชี้วัด เช่น &quot;ตัวชี้วัด L5 หมายถึงอะไร&quot;</li>
                <li>เกณฑ์ระดับของแต่ละข้อ</li>
              </ul>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{
                padding: '0.55rem 0.75rem', borderRadius: 12, fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: m.role === 'user' ? 'var(--de-primary)' : 'var(--de-bg-canvas)',
                color: m.role === 'user' ? 'var(--de-on-primary)' : 'var(--de-text-primary)',
                border: m.role === 'user' ? 'none' : '1px solid var(--de-border)',
              }}>
                {m.pending ? <span style={{ color: 'var(--de-text-secondary)' }}>กำลังคิดคำตอบ…</span> : m.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* input */}
      {view === 'chat' && (
        <div style={{ display: 'flex', gap: 6, padding: '0.6rem', borderTop: '1px solid var(--de-border)' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="พิมพ์คำถาม… (Enter ส่ง / Shift+Enter ขึ้นบรรทัด)"
            rows={2}
            style={{ flex: 1, resize: 'none', padding: '0.5rem 0.6rem', border: '1px solid var(--de-border-strong)', borderRadius: 8, fontSize: '0.85rem', background: 'var(--de-bg-surface)', color: 'var(--de-text-primary)', fontFamily: 'inherit' }}
          />
          <button onClick={send} disabled={sending || !input.trim()} style={{
            alignSelf: 'stretch', padding: '0 1rem', border: 'none', borderRadius: 8, fontWeight: 700, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
            background: sending || !input.trim() ? 'var(--de-text-tertiary)' : 'var(--de-primary)', color: 'var(--de-on-primary)',
          }}>{sending ? '…' : 'ส่ง'}</button>
        </div>
      )}
    </div>
  );

  return createPortal(<>{FAB}{panel}</>, document.body);
}
