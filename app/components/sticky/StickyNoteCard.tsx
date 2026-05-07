// app/components/sticky/StickyNoteCard.tsx
// One Post-it on the corkboard. Drag with the header strip. Edit text inline.
// All visual + interaction logic is local; persistence is delegated to the parent
// via the supplied callbacks (so the same card can drive optimistic + debounced patch).

'use client';

import React, { useEffect, useRef, useState } from 'react';
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
const NOTE_H = 180;

export interface StickyNoteCardProps {
  note: StickyNote;
  boardSize: { width: number; height: number };
  onContentChange: (content: string) => void;
  onPositionChange: (x: number, y: number) => void;
  onPositionCommit: (x: number, y: number) => void;
  onColorChange: (color: StickyColor) => void;
  onZIndexBump: () => void;
  onDelete: () => void;
}

export function StickyNoteCard({
  note,
  boardSize,
  onContentChange,
  onPositionChange,
  onPositionCommit,
  onColorChange,
  onZIndexBump,
  onDelete,
}: StickyNoteCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ pointerId: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    return () => {
      // Make sure we never leave a hanging pointer capture if the card unmounts mid-drag.
      const el = cardRef.current;
      const drag = dragStateRef.current;
      if (el && drag && el.hasPointerCapture(drag.pointerId)) {
        el.releasePointerCapture(drag.pointerId);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only the drag-handle starts a drag — text editing and buttons must not.
    const target = e.target as HTMLElement;
    if (!target.closest('[data-sticky-drag-handle]')) return;
    e.preventDefault();
    onZIndexBump();
    const el = cardRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: note.x,
      origY: note.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const nextX = clamp(drag.origX + dx, 0, Math.max(0, boardSize.width - NOTE_W));
    const nextY = clamp(drag.origY + dy, 0, Math.max(0, boardSize.height - NOTE_H));
    onPositionChange(nextX, nextY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = cardRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragStateRef.current = null;
    onPositionCommit(note.x, note.y);
  };

  const bg = COLOR_BG[note.color] || COLOR_BG.yellow;
  const border = COLOR_BORDER[note.color] || COLOR_BORDER.yellow;

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
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
      }}
    >
      <div
        data-sticky-drag-handle="true"
        style={{
          height: 22,
          background: border,
          opacity: 0.85,
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6px',
          fontSize: '0.7rem',
          color: 'rgba(0,0,0,0.65)',
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
            title="เปลี่ยนสี"
            style={btnStyle}
          >
            🎨
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="ลบโน้ต"
            style={btnStyle}
          >
            ✕
          </button>
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
        value={note.content}
        onChange={(e) => onContentChange(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder="พิมพ์ข้อความ..."
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
        }}
      />
    </div>
  );
}

const btnStyle: React.CSSProperties = {
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
