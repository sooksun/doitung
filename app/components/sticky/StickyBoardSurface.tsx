// app/components/sticky/StickyBoardSurface.tsx
// Shared chrome (toolbar + board area) used by both the modal version (rendered
// over /admin/sar/new) and the standalone /sticky page (the shareable URL).
//
// The host decides:
//   - what to put in the close-button slot (e.g. "บันทึกและปิด" for the modal,
//     "ปิดบอร์ด" for the standalone page),
//   - whether to apply joined text back to a parent (only the modal does),
//   - the title shown in the toolbar.
//
// Polling, optimistic updates, and per-card Save/Cancel are handled inside
// useStickyNotes + StickyNoteCard — this component is presentational chrome.

'use client';

import React, { useCallback, useRef } from 'react';
import { StickyBoard } from './StickyBoard';
import type { StickyNoteCardHandle } from './StickyNoteCard';
import { useStickyNotes, type StickyColor, type StickyNote } from './useStickyNotes';
import { toastError, toastSuccess } from '@/lib/toast';

export interface StickyBoardSurfaceProps {
  title: string;
  contextType: string;
  contextId: string;
  schoolId: number | null;
  sarId?: number | null;
  layerNo?: number | null;
  side?: 'CURRENT' | 'DESIRED' | null;

  // Host wiring
  closeLabel?: string; // default "ปิดบอร์ด"
  onClose: (joined: string) => Promise<void> | void; // called after dirty flush; receives joined text
  showCopyLink?: boolean; // default true
  shareUrl?: string; // override; otherwise computed from contextType/contextId

  // Allow page hosts to suppress the "ล้างบอร์ด" action.
  allowClear?: boolean; // default true

  pollIntervalMs?: number; // default 5000
}

function joinNotes(contents: string[]): string {
  return contents
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .join(', ');
}

function buildShareUrl(contextType: string, contextId: string): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams({ contextType, contextId });
  return `${window.location.origin}/sticky?${params.toString()}`;
}

export function StickyBoardSurface(props: StickyBoardSurfaceProps) {
  const {
    title,
    contextType,
    contextId,
    schoolId,
    sarId = null,
    layerNo = null,
    side = null,
    closeLabel = 'ปิดบอร์ด',
    onClose,
    showCopyLink = true,
    shareUrl,
    allowClear = true,
    pollIntervalMs = 5000,
  } = props;

  const {
    notes,
    notesRef,
    loading,
    error,
    addNote,
    patchNote,
    deleteNote,
    clearAll,
  } = useStickyNotes({
    enabled: true,
    contextType,
    contextId,
    schoolId,
    sarId,
    layerNo,
    side,
    pollIntervalMs,
  });

  const cardHandles = useRef<Map<string, StickyNoteCardHandle | null>>(new Map());

  const registerCard = useCallback((id: string, handle: StickyNoteCardHandle | null) => {
    if (handle) cardHandles.current.set(id, handle);
    else cardHandles.current.delete(id);
  }, []);

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

  const handleCopyLink = async () => {
    const url = shareUrl || buildShareUrl(contextType, contextId);
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback: prompt with selectable URL
        window.prompt('คัดลอกลิงก์บอร์ด:', url);
      }
      toastSuccess('คัดลอกลิงก์บอร์ดแล้ว');
    } catch {
      window.prompt('คัดลอกลิงก์บอร์ด:', url);
    }
  };

  const handleSaveContent = useCallback(
    async (id: string, content: string) => {
      const updated = await patchNote(id, { content });
      return !!updated;
    },
    [patchNote],
  );

  const handleCommitPosition = useCallback(
    (id: string, x: number, y: number) => {
      patchNote(id, { x, y });
    },
    [patchNote],
  );

  const handleColorChange = useCallback(
    (id: string, color: StickyColor) => {
      patchNote(id, { color });
    },
    [patchNote],
  );

  const handleZIndexBump = useCallback(
    (id: string) => {
      const list = notesRef.current;
      const maxZ = list.reduce((m, n) => Math.max(m, n.zIndex), 0);
      const next = maxZ + 1;
      patchNote(id, { zIndex: next });
    },
    [patchNote, notesRef],
  );

  const handleClose = async () => {
    // Flush every dirty draft, then compute joined text from the freshest snapshot.
    await Promise.all(
      Array.from(cardHandles.current.values()).map((h) => (h ? h.flushIfDirty() : Promise.resolve())),
    );
    const joined = joinNotes(notesRef.current.map((n) => n.content));
    await onClose(joined);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          padding: '0.85rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: '#f9fafb',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937' }}>📌 {title}</div>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={handleAdd} style={primaryBtn}>+ เพิ่มโน้ต</button>
        {showCopyLink && (
          <button type="button" onClick={handleCopyLink} style={ghostBtn} title="คัดลอกลิงก์บอร์ดเพื่อให้คนอื่นร่วมระดมสมอง">
            🔗 คัดลอกลิงก์
          </button>
        )}
        {allowClear && (
          <button type="button" onClick={handleClear} style={ghostBtn} disabled={notes.length === 0}>ล้างบอร์ด</button>
        )}
        <button type="button" onClick={handleClose} style={successBtn}>{closeLabel}</button>
      </div>

      <div
        style={{
          padding: '0.6rem 1rem',
          fontSize: '0.78rem',
          color: '#6b7280',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>โน้ตทั้งหมด: <strong>{notes.length}</strong></span>
        <span>•</span>
        <span>คนอื่นที่ได้ลิงก์เปิดบอร์ดเดียวกันจะเห็นการเปลี่ยนแปลงทุก ~{Math.round((pollIntervalMs || 5000) / 1000)} วินาที</span>
        <span>•</span>
        <span>แต่ละโน้ตมีปุ่ม <strong>บันทึก / ยกเลิก</strong> ของตัวเอง</span>
        {loading && <span style={{ marginLeft: 'auto', color: '#6366f1' }}>กำลังโหลด...</span>}
        {error && <span style={{ marginLeft: 'auto', color: '#dc2626' }}>{error}</span>}
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: '0.75rem', display: 'flex' }}>
        <StickyBoard
          notes={notes}
          registerCard={registerCard}
          onSaveContent={handleSaveContent}
          onCommitPosition={handleCommitPosition}
          onColorChange={handleColorChange}
          onZIndexBump={handleZIndexBump}
          onDelete={(id) => deleteNote(id)}
        />
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
