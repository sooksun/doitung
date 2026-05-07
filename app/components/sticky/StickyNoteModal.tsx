// app/components/sticky/StickyNoteModal.tsx
// Fullscreen overlay that hosts the sticky-notes board. Wires the useStickyNotes
// hook to the StickyBoard view and exposes a "Save and close" action that joins
// every active note's content with ", " and hands it back to the host form.

'use client';

import React, { useEffect } from 'react';
import { StickyBoard } from './StickyBoard';
import { useStickyNotes, type StickyColor } from './useStickyNotes';
import { toastError } from '@/lib/toast';

export interface StickyNoteModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  contextType: string;
  contextId: string;
  schoolId: number | null;
  sarId?: number | null;
  layerNo?: number | null;
  side?: 'CURRENT' | 'DESIRED' | null;
  onApplyText: (joined: string) => void;
}

function joinNotes(contents: string[]): string {
  return contents
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .join(', ');
}

export function StickyNoteModal({
  open,
  onClose,
  title,
  contextType,
  contextId,
  schoolId,
  sarId = null,
  layerNo = null,
  side = null,
  onApplyText,
}: StickyNoteModalProps) {
  const {
    notes,
    loading,
    error,
    addNote,
    updateLocal,
    persistDebounced,
    persistImmediate,
    deleteNote,
    clearAll,
  } = useStickyNotes({
    enabled: open,
    contextType,
    contextId,
    schoolId,
    sarId,
    layerNo,
    side,
  });

  // Close on Escape (the rest of the chrome — inputs, buttons — work as usual).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleSaveClose = () => {
    onApplyText(joinNotes(notes.map((n) => n.content)));
    onClose();
  };

  const handleAdd = async () => {
    if (!schoolId) {
      toastError('กรุณาเลือกโรงเรียนและปีการศึกษาก่อนเปิดบอร์ด');
      return;
    }
    await addNote();
  };

  const handleClear = async () => {
    if (notes.length === 0) return;
    if (!window.confirm('ล้างโน้ตทั้งหมดบนบอร์ด?')) return;
    await clearAll();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2vh 2vw',
      }}
      onMouseDown={(e) => {
        // Click on the dim backdrop closes (note contents auto-saved already).
        if (e.target === e.currentTarget) handleSaveClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          height: '92vh',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: '#f9fafb',
          }}
        >
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937' }}>📌 Sticky Notes — {title}</div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleAdd} style={primaryBtn}>+ เพิ่มโน้ต</button>
          <button type="button" onClick={handleClear} style={ghostBtn} disabled={notes.length === 0}>ล้างบอร์ด</button>
          <button type="button" onClick={handleSaveClose} style={successBtn}>บันทึกและปิด</button>
        </div>

        <div style={{ padding: '0.6rem 1rem', fontSize: '0.78rem', color: '#6b7280', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span>โน้ตทั้งหมด: <strong>{notes.length}</strong></span>
          <span>•</span>
          <span>ปิดบอร์ด → ระบบจะรวมข้อความในโน้ตด้วย <code style={{ background: '#f3f4f6', padding: '0 4px', borderRadius: 3 }}>, </code> ใส่กลับเข้าช่อง Iceberg</span>
          {loading && <span style={{ marginLeft: 'auto', color: '#6366f1' }}>กำลังโหลด...</span>}
          {error && <span style={{ marginLeft: 'auto', color: '#dc2626' }}>{error}</span>}
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: '0.75rem', display: 'flex' }}>
          <StickyBoard
            notes={notes}
            onAddNote={handleAdd}
            onContentChange={(id, content) => {
              updateLocal(id, { content });
              persistDebounced(id, { content }, 600);
            }}
            onPositionChange={(id, x, y) => {
              updateLocal(id, { x, y });
            }}
            onPositionCommit={(id, x, y) => {
              persistImmediate(id, { x, y });
            }}
            onColorChange={(id, color: StickyColor) => {
              updateLocal(id, { color });
              persistImmediate(id, { color });
            }}
            onZIndexBump={(id) => {
              const maxZ = notes.reduce((m, n) => Math.max(m, n.zIndex), 0);
              const next = maxZ + 1;
              updateLocal(id, { zIndex: next });
              persistDebounced(id, { zIndex: next }, 1200);
            }}
            onDelete={(id) => deleteNote(id)}
          />
        </div>
      </div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '0.5rem 0.85rem',
  background: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
};

const ghostBtn: React.CSSProperties = {
  padding: '0.5rem 0.85rem',
  background: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const successBtn: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: 700,
};
