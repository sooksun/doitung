// app/components/sticky/StickyNoteModal.tsx
// Overlay modal that hosts the StickyBoardSurface, used from /admin/sar/new.
// On open, this resolves the board (via /api/sticky-boards/get-or-create) and
// then hands the resulting shareKey to the surface. "บันทึกและปิด" flushes
// dirty drafts, applies joined text to the Iceberg textarea, AND closes the
// board on the server (when the caller is the owner) so the share link dies.

'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StickyBoardSurface } from './StickyBoardSurface';
import { buildStickyHeaders } from '@/lib/sticky-guest';

// Local view of /api/sticky-boards/get-or-create response (only the fields
// the modal actually uses).
interface BoardInfo {
  id: string;
  shareKey: string;
  ownerUserId: number;
  ownerName: string | null;
  schoolId: number;
  status: 'ACTIVE' | 'ARCHIVED';
  isOwner: boolean;
}

export interface StickyNoteModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  contextType: string;
  contextId: string;
  schoolId: number | null;
  onApplyText: (joined: string) => void;
}

function getBearer(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function StickyNoteModal({
  open,
  onClose,
  title,
  contextType,
  contextId,
  schoolId,
  onApplyText,
}: StickyNoteModalProps) {
  const [board, setBoard] = useState<BoardInfo | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);

  // Mount flag so we can portal to document.body without an SSR/hydration
  // mismatch — without this, the modal would inherit the parent Iceberg cell's
  // stacking context (the cell wrapper has zIndex:2) and the chips on the
  // OTHER 7 cells would visually leak above the modal backdrop.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Resolve (or create) the board for this Iceberg cell each time the modal
  // opens. If the previous board was closed, this returns a fresh one.
  useEffect(() => {
    if (!open || !schoolId) {
      setBoard(null);
      return;
    }
    let cancelled = false;
    setBoardLoading(true);
    setBoardError(null);
    fetch('/api/sticky-boards/get-or-create', {
      method: 'POST',
      headers: buildStickyHeaders({ bearer: getBearer() }),
      body: JSON.stringify({ contextType, contextId, schoolId }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) {
          setBoardError(j?.error || 'เปิดบอร์ดไม่สำเร็จ');
          return;
        }
        setBoard(j.data as BoardInfo);
      })
      .catch((e) => !cancelled && setBoardError(e?.message || 'เปิดบอร์ดไม่สำเร็จ'))
      .finally(() => !cancelled && setBoardLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, schoolId, contextType, contextId]);

  if (!open || !mounted) return null;

  const handleSurfaceClose = async (joined: string) => {
    onApplyText(joined);
    onClose();
  };

  const overlay = (
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
        {!schoolId && (
          // Defensive fallback: in practice the StickyNoteButton's `disabled`
          // guard prevents the modal from opening without schoolId, but if
          // some other caller mounts the modal directly we still show a
          // friendly message instead of an empty white card.
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#92400e', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem' }}>⚠️</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937', marginTop: '0.5rem' }}>
              ไม่พบข้อมูลโรงเรียน
            </div>
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: 480, color: '#4b5563' }}>
              กรุณาเข้าสู่ระบบใหม่ หรือเลือกโรงเรียนก่อนใช้งาน Sticky Notes
            </div>
            <button type="button" onClick={onClose} style={{ marginTop: '1.25rem', padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
              ปิด
            </button>
          </div>
        )}
        {schoolId && boardLoading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
            กำลังเปิดบอร์ด...
          </div>
        )}
        {schoolId && boardError && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', color: '#dc2626' }}>
            <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>เปิดบอร์ดไม่สำเร็จ</div>
            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{boardError}</div>
            <button type="button" onClick={onClose} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>
              ปิด
            </button>
          </div>
        )}
        {schoolId && board && (
          <StickyBoardSurface
            title={title}
            boardId={board.id}
            boardKey={board.shareKey}
            isOwner={board.isOwner}
            // Closing the modal applies the joined text to the Iceberg
            // textarea and dismisses the popup. The board itself stays
            // ACTIVE on the server so reopening this cell brings the same
            // notes back and the share link keeps working.
            closeAlsoClosesBoard={false}
            closeLabel="บันทึกและปิด"
            onClose={handleSurfaceClose}
            pollIntervalMs={5000}
          />
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
