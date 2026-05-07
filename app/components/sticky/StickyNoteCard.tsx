// app/components/sticky/StickyNoteCard.tsx
// One Post-it on the board. Owns its own draft state for content + position
// so polling never clobbers the current user's pending edits.
//
// Permission-aware:
//   - `note.canEditContent`  → textarea is read-only when false; Save/Cancel
//     buttons are hidden.
//   - `note.canDelete`       → ✕ button hidden / disabled.
//   - Spatial fields (drag, color) are open to anyone with the live link.
//
// The author's name (logged-in user.name or guest's chosen handle) is shown
// at the bottom of the card so collaborators know who wrote what.

'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { StickyColor, StickyNote } from './useStickyNotes';

const COLOR_BG: Record<StickyColor, string> = {
  yellow: '#fef3c7',
  pink: '#fce7f3',
  mint: '#d1fae5',
  blue: '#dbeafe',
  peach: '#fed7aa',
  lavender: '#ede9fe',
};

const COLOR_BORDER: Record<StickyColor, string> = {
  yellow: '#fbbf24',
  pink: '#f472b6',
  mint: '#34d399',
  blue: '#60a5fa',
  peach: '#fb923c',
  lavender: '#a78bfa',
};

const NOTE_W = 200;
const NOTE_H = 230;

export interface StickyNoteCardHandle {
  flushIfDirty: () => Promise<void>;
}

export interface StickyNoteCardProps {
  note: StickyNote;
  boardSize: { width: number; height: number };
  onSaveContent: (content: string) => Promise<boolean>;
  onCommitPosition: (x: number, y: number) => void;
  onColorChange: (color: StickyColor) => void;
  onZIndexBump: () => void;
  onDelete: () => void;
}

export const StickyNoteCard = forwardRef<StickyNoteCardHandle, StickyNoteCardProps>(function StickyNoteCard(
  { note, boardSize, onSaveContent, onCommitPosition, onColorChange, onZIndexBump, onDelete },
  ref,
) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const editingRef = useRef(false);
  const draggingRef = useRef<{ pid: number; sx: number; sy: number; ox: number; oy: number } | null>(null);

  const [draft, setDraft] = useState(note.content);
  const [pos, setPos] = useState({ x: note.x, y: note.y });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editingRef.current) setDraft(note.content);
  }, [note.content]);

  useEffect(() => {
    if (!draggingRef.current) setPos({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  const isDirty = draft !== note.content;

  useImperativeHandle(
    ref,
    () => ({
      async flushIfDirty() {
        if (!note.canEditContent) {
          editingRef.current = false;
          return;
        }
        if (draft !== note.content) {
          const ok = await onSaveContent(draft);
          if (ok) editingRef.current = false;
        } else {
          editingRef.current = false;
        }
      },
    }),
    [draft, note.content, note.canEditContent, onSaveContent],
  );

  useEffect(() => {
    return () => {
      const el = cardRef.current;
      const drag = draggingRef.current;
      if (el && drag && el.hasPointerCapture(drag.pid)) el.releasePointerCapture(drag.pid);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't initiate a drag when the click started on an interactive control
    // — that's why the 🎨 / ✕ icons in the drag bar and the color-picker
    // swatches in the popup were swallowing clicks (the pointer ended up
    // captured on the card so click events never reached the buttons).
    if (target.closest('button, input, textarea, select, a')) return;
    if (!target.closest('[data-sticky-drag-handle]')) return;
    e.preventDefault();
    onZIndexBump();
    const el = cardRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    draggingRef.current = { pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || drag.pid !== e.pointerId) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    const nextX = clamp(drag.ox + dx, 0, Math.max(0, boardSize.width - NOTE_W));
    const nextY = clamp(drag.oy + dy, 0, Math.max(0, boardSize.height - NOTE_H));
    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    if (!drag || drag.pid !== e.pointerId) return;
    const el = cardRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    draggingRef.current = null;
    onCommitPosition(pos.x, pos.y);
  };

  const handleSave = async () => {
    if (!isDirty || !note.canEditContent) return;
    setSaving(true);
    const ok = await onSaveContent(draft);
    setSaving(false);
    if (ok) {
      editingRef.current = false;
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 1200);
    }
  };

  const handleCancel = () => {
    setDraft(note.content);
    editingRef.current = false;
  };

  const bg = COLOR_BG[note.color] || COLOR_BG.yellow;
  const border = COLOR_BORDER[note.color] || COLOR_BORDER.yellow;
  const authorLabel = note.authorName || (note.userId ? '' : 'Guest');

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: NOTE_W,
        height: NOTE_H,
        transform: `rotate(${note.rotation}deg)`,
        background: bg,
        borderRadius: 6,
        boxShadow: '0 6px 14px rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.08)',
        zIndex: note.zIndex,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        outline: isDirty ? '2px solid #f59e0b' : 'none',
        outlineOffset: -2,
      }}
    >
      <div
        data-sticky-drag-handle="true"
        style={{
          height: 22,
          background: border,
          opacity: 0.9,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          fontSize: '0.7rem',
          color: 'rgba(0,0,0,0.7)',
          fontWeight: 600,
        }}
      >
        <span style={{ pointerEvents: 'none' }}>📌 ลากเพื่อย้าย</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorPicker((v) => !v);
            }}
            title="เปลี่ยนสี (ใครก็ทำได้)"
            style={iconBtnStyle}
          >
            🎨
          </button>
          {note.canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('ลบโน้ตนี้?')) onDelete();
              }}
              title="ลบโน้ต"
              style={iconBtnStyle}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {showColorPicker && (
        <div
          style={{
            position: 'absolute',
            top: 22,
            right: 4,
            background: 'white',
            padding: 4,
            borderRadius: 4,
            boxShadow: '0 4px 8px rgba(0,0,0,0.18)',
            display: 'flex',
            gap: 4,
            zIndex: 5,
          }}
        >
          {(Object.keys(COLOR_BG) as StickyColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onColorChange(c);
                setShowColorPicker(false);
              }}
              style={{
                width: 18,
                height: 18,
                background: COLOR_BG[c],
                border: `2px solid ${COLOR_BORDER[c]}`,
                borderRadius: '50%',
                cursor: 'pointer',
                padding: 0,
              }}
              title={c}
            />
          ))}
        </div>
      )}

      <textarea
        value={draft}
        onChange={(e) => {
          if (!note.canEditContent) return;
          editingRef.current = true;
          setDraft(e.target.value);
        }}
        readOnly={!note.canEditContent}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder={note.canEditContent ? 'พิมพ์ข้อความ...' : ''}
        style={{
          flex: 1,
          width: '100%',
          padding: '0.5rem 0.6rem',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          resize: 'none',
          fontFamily: 'inherit',
          fontSize: '0.88rem',
          lineHeight: 1.4,
          color: '#1f2937',
          cursor: note.canEditContent ? 'text' : 'default',
        }}
      />

      <div
        style={{
          minHeight: 26,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          background: isDirty ? `${border}33` : 'rgba(0,0,0,0.04)',
          borderTop: `1px solid ${border}55`,
          fontSize: '0.7rem',
          flexWrap: 'wrap',
        }}
      >
        {note.canEditContent ? (
          <>
            {savedFlash && !isDirty && <span style={{ color: '#15803d', fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
            {!savedFlash && !isDirty && <span style={{ color: '#6b7280' }}>{authorLabel ? `— ${authorLabel}` : ''}</span>}
            {isDirty && (
              <>
                <button type="button" onClick={handleSave} disabled={saving} style={saveBtn}>
                  💾 {saving ? '...' : 'บันทึก'}
                </button>
                <button type="button" onClick={handleCancel} disabled={saving} style={cancelBtn}>
                  ↩ ยกเลิก
                </button>
              </>
            )}
          </>
        ) : (
          <span style={{ color: '#6b7280' }}>
            {authorLabel ? `— ${authorLabel}` : 'อ่านอย่างเดียว'}
            <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#94a3b8' }}>(ผู้เขียนเท่านั้นแก้ได้)</span>
          </span>
        )}
      </div>
    </div>
  );
});

const iconBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  border: 'none',
  borderRadius: 3,
  width: 18,
  height: 18,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};

const saveBtn: React.CSSProperties = {
  flex: 1,
  padding: '4px 6px',
  background: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.7rem',
  fontWeight: 700,
};

const cancelBtn: React.CSSProperties = {
  padding: '4px 8px',
  background: 'white',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: '0.7rem',
  fontWeight: 600,
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
