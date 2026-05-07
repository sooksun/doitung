// app/components/sticky/StickyBoard.tsx
// The corkboard surface inside the modal. Owns the size measurement so cards can
// clamp themselves to the visible area. Pure presentational — all state lives in
// useStickyNotes (passed in as `notes` + callbacks).

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StickyNoteCard } from './StickyNoteCard';
import type { StickyColor, StickyNote } from './useStickyNotes';

export interface StickyBoardProps {
  notes: StickyNote[];
  onAddNote: () => void;
  onContentChange: (id: string, content: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onPositionCommit: (id: string, x: number, y: number) => void;
  onColorChange: (id: string, color: StickyColor) => void;
  onZIndexBump: (id: string) => void;
  onDelete: (id: string) => void;
}

export function StickyBoard({
  notes,
  onAddNote,
  onContentChange,
  onPositionChange,
  onPositionCommit,
  onColorChange,
  onZIndexBump,
  onDelete,
}: StickyBoardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 800, height: 480 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        background:
          'repeating-linear-gradient(45deg, #fdf6e3 0 12px, #fbf0d3 12px 24px)',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        overflow: 'auto',
      }}
    >
      {notes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94835a',
            fontSize: '0.9rem',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '0 2rem',
          }}
        >
          ยังไม่มีโน้ตบนบอร์ด — กด <strong style={{ margin: '0 4px' }}>+ เพิ่มโน้ต</strong> เพื่อเริ่มระดมสมอง
        </div>
      )}

      {notes.map((n) => (
        <StickyNoteCard
          key={n.id}
          note={n}
          boardSize={size}
          onContentChange={(content) => onContentChange(n.id, content)}
          onPositionChange={(x, y) => onPositionChange(n.id, x, y)}
          onPositionCommit={(x, y) => onPositionCommit(n.id, x, y)}
          onColorChange={(color) => onColorChange(n.id, color)}
          onZIndexBump={() => onZIndexBump(n.id)}
          onDelete={() => onDelete(n.id)}
        />
      ))}

      {/* Fallback hidden button for keyboard-add (the toolbar in StickyNoteModal is the primary entry point). */}
      <button type="button" onClick={onAddNote} aria-label="เพิ่มโน้ต" style={{ display: 'none' }}>
        add
      </button>
    </div>
  );
}
