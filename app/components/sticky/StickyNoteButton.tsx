// app/components/sticky/StickyNoteButton.tsx
// Small icon button that lives next to an Iceberg cell label. Clicking it opens
// the StickyNoteModal pre-bound to that cell's (contextType, contextId).

'use client';

import React, { useState } from 'react';
import { StickyNoteModal } from './StickyNoteModal';

export interface StickyNoteButtonProps {
  contextType: string;
  contextId: string;
  schoolId: number | null;
  layerNo?: number | null;
  side?: 'CURRENT' | 'DESIRED' | null;
  title: string;
  disabled?: boolean;
  disabledReason?: string;
  onApplyText: (text: string) => void;
}

export function StickyNoteButton({
  contextType,
  contextId,
  schoolId,
  layerNo = null,
  side = null,
  title,
  disabled = false,
  disabledReason,
  onApplyText,
}: StickyNoteButtonProps) {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        title={disabled ? disabledReason || 'ไม่พร้อมใช้งาน' : 'เปิดบอร์ด Sticky Notes'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '0.2rem 0.5rem',
          background: disabled ? '#e5e7eb' : '#fef3c7',
          border: `1px solid ${disabled ? '#d1d5db' : '#fbbf24'}`,
          borderRadius: 4,
          fontSize: '0.72rem',
          color: disabled ? '#9ca3af' : '#92400e',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        <span aria-hidden>📌</span>
        <span>ระดมสมอง</span>
      </button>

      {open && (
        <StickyNoteModal
          open={open}
          onClose={() => setOpen(false)}
          title={title}
          contextType={contextType}
          contextId={contextId}
          schoolId={schoolId}
          layerNo={layerNo}
          side={side}
          onApplyText={onApplyText}
        />
      )}
    </>
  );
}
