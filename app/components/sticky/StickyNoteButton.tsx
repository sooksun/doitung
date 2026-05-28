// app/components/sticky/StickyNoteButton.tsx
// Small icon button that lives next to an Iceberg cell label. Clicking it opens
// the StickyNoteModal pre-bound to that cell's (contextType, contextId).

'use client';

import React, { useState } from 'react';
import { StickyNoteModal } from './StickyNoteModal';

export interface StickyNoteButtonProps {
  contextType: string;
  // contextId encodes layer + side already (e.g. "...iceberg:L1:CURRENT") so
  // we don't expose layerNo / side as separate props on this component —
  // anyone consuming the data can parse contextId.
  contextId: string;
  schoolId: number | null;
  title: string;
  disabled?: boolean;
  disabledReason?: string;
  onApplyText: (text: string) => void;
  /** If supplied AND the resolved board has zero active notes when the modal
   *  first loads, the text is split by "," (whitespace trimmed, empty pieces
   *  dropped) and each chunk becomes a new sticky note. This lets a user with
   *  existing comma-separated text in the Iceberg cell click "ระดมสมอง" once
   *  and have the brainstorming board pre-populated with those ideas as
   *  individual notes. Captured at click time, not re-read while modal open. */
  seedFromText?: string | null;
}

export function StickyNoteButton({
  contextType,
  contextId,
  schoolId,
  title,
  disabled = false,
  disabledReason,
  onApplyText,
  seedFromText,
}: StickyNoteButtonProps) {
  const [open, setOpen] = useState(false);
  // Snapshot the seed text at the moment the user clicks. The modal only
  // looks at this prop on its first board load — capturing here ensures we
  // seed from what the user *saw in the textarea when they clicked*, not
  // from a later re-render of the parent.
  const [seedSnapshot, setSeedSnapshot] = useState<string | null>(null);

  const handleOpen = () => {
    if (disabled) return;
    setSeedSnapshot(seedFromText ?? null);
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
          onApplyText={onApplyText}
          seedFromText={seedSnapshot}
        />
      )}
    </>
  );
}
