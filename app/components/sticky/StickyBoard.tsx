// app/components/sticky/StickyBoard.tsx
// Corkboard surface: measures itself so cards can clamp to the visible area,
// renders all active notes, and forwards a card-ref registry up to the parent
// (the modal / page) so it can flush dirty drafts before closing.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StickyNoteCard, type StickyNoteCardHandle } from './StickyNoteCard';
import type { StickyColor, StickyNote } from './useStickyNotes';

export interface StickyBoardProps {
  notes: StickyNote[];
  registerCard?: (id: string, handle: StickyNoteCardHandle | null) => void;
  onSaveContent: (id: string, content: string) => Promise<boolean>;
  onCommitPosition: (id: string, x: number, y: number) => void;
  onColorChange: (id: string, color: StickyColor) => void;
  onZIndexBump: (id: string) => void;
  onDelete: (id: string) => void;
}

export function StickyBoard({
  notes,
  registerCard,
  onSaveContent,
  onCommitPosition,
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
        background: 'repeating-linear-gradient(45deg, #fdf6e3 0 12px, #fbf0d3 12px 24px)',
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
          ref={registerCard ? (h) => registerCard(n.id, h) : undefined}
          note={n}
          boardSize={size}
          onSaveContent={(content) => onSaveContent(n.id, content)}
          onCommitPosition={(x, y) => onCommitPosition(n.id, x, y)}
          onColorChange={(color) => onColorChange(n.id, color)}
          onZIndexBump={() => onZIndexBump(n.id)}
          onDelete={() => onDelete(n.id)}
        />
      ))}
    </div>
  );
}
