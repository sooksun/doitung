// app/components/sticky/StickyNoteModal.tsx
// Fullscreen overlay that hosts the StickyBoardSurface. Used by /admin/sar/new
// to brainstorm in-context, then write the joined note text back into the
// Iceberg cell's textarea.
//
// All board behaviour (polling, Save/Cancel per note, Copy Link) lives in
// StickyBoardSurface. This component only adds the dim backdrop chrome and
// wires the close-and-apply action.

'use client';

import React, { useEffect } from 'react';
import { StickyBoardSurface } from './StickyBoardSurface';

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

  // The surface flushes drafts then hands us the joined text — write it back
  // into the Iceberg cell, then dismiss the overlay.
  const handleSurfaceClose = async (joined: string) => {
    onApplyText(joined);
    onClose();
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
        <StickyBoardSurface
          title={title}
          contextType={contextType}
          contextId={contextId}
          schoolId={schoolId}
          sarId={sarId}
          layerNo={layerNo}
          side={side}
          closeLabel="บันทึกและปิด"
          onClose={handleSurfaceClose}
          showCopyLink
          allowClear
          pollIntervalMs={5000}
        />
      </div>
    </div>
  );
}
