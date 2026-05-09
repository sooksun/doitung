// app/components/sticky/StickyBoardSurface.tsx
// Shared toolbar + board area used by both:
//   - StickyNoteModal (rendered over /admin/sar/new)
//   - /sticky standalone page (the share-link target)
//
// The host owns:
//   - The shareKey (`boardKey`) — already resolved from /api/sticky-boards/...
//     so this component never has to do the get-or-create dance itself.
//   - `boardId` so we can call /clear and /close (owner-only).
//   - `isOwner` to gate owner-only chrome (Clear, Close).
//   - `closeLabel` + `onClose` so each host picks its own close behaviour:
//       modal → "บันทึกและปิด" → flush + apply text + close board
//       page  → "ปิดบอร์ด" (owner) | "ออกจากบอร์ด" (non-owner)
//
// Polling, Save/Cancel per note, and guest token plumbing all live behind
// useStickyNotes / StickyNoteCard.

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StickyBoard } from './StickyBoard';
import type { StickyNoteCardHandle } from './StickyNoteCard';
import {
  closeBoardOwner,
  clearBoardOwner,
  useStickyNotes,
  type StickyColor,
} from './useStickyNotes';
import { toastError, toastSuccess, toastConfirm } from '@/lib/toast';

export interface StickyBoardSurfaceProps {
  title: string;
  boardId: string;
  boardKey: string;
  isOwner: boolean;
  shareUrl?: string; // override; default = `${origin}/sticky?key=${boardKey}`

  closeLabel?: string;
  /** Called after dirty-flush and (optionally) board-close. Receives joined note text. */
  onClose: (joined: string) => Promise<void> | void;
  /** When true, pressing Close ALSO marks the board ARCHIVED on the server (owner-only).
   *  Default false: closing the modal/page is purely a local UI dismiss. */
  closeAlsoClosesBoard?: boolean;

  /** Hide the "ล้างบอร์ด" button (e.g. for non-owner standalone view). */
  showClearButton?: boolean;

  pollIntervalMs?: number;

  /** When supplied AND the surface mounts on a board with zero active notes,
   *  the text is split by "," (whitespace trimmed, empty pieces dropped) and
   *  each chunk becomes a new sticky note. Used to import comma-separated
   *  Iceberg cell text into individual brainstorm notes on first open. The
   *  seeding runs at most once per surface mount (subsequent reloads / poll
   *  ticks do NOT re-seed even if the board is later cleared). */
  seedFromText?: string | null;
}

function joinNotes(contents: string[]): string {
  return contents
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .join(', ');
}

// Tracks board ids that have already been seeded in this browser session, so
// React StrictMode's intentional double-mount in dev (and any future remount
// caused by the parent re-rendering the modal subtree) cannot trigger a second
// seed batch on the same board. The set is small (one UUID per board the user
// has opened) and lives for the lifetime of the page — reloading the page is
// the only thing that resets it, which is appropriate: a fresh page load that
// finds an empty board and is given seed text *should* try seeding once.
const seededBoardIds = new Set<string>();

function defaultShareUrl(boardKey: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/sticky?key=${encodeURIComponent(boardKey)}`;
}

export function StickyBoardSurface(props: StickyBoardSurfaceProps) {
  const {
    title,
    boardId,
    boardKey,
    isOwner,
    shareUrl,
    closeLabel = 'ปิดบอร์ด',
    onClose,
    closeAlsoClosesBoard = false,
    showClearButton,
    pollIntervalMs = 5000,
    seedFromText,
  } = props;

  const { notes, notesRef, loading, error, closed, addNote, patchNote, deleteNote } = useStickyNotes({
    enabled: true,
    boardKey,
    pollIntervalMs,
  });

  // ── One-shot seeding from caller-supplied comma-separated text ───────────
  // Runs exactly once per (browser-session, boardId) when the very first
  // /api/sticky-notes fetch resolves to an empty list. The module-level
  // `seededBoardIds` guard makes this idempotent across React StrictMode's
  // double-mount in dev and across any later remount of the same board (e.g.
  // user closes the modal and reopens the same cell — we don't re-seed).
  useEffect(() => {
    if (seededBoardIds.has(boardId)) return;
    if (loading) return;          // initial fetch in progress
    if (closed) return;           // archived board → no inserts
    if (error) return;            // surface the error first

    const text = (seedFromText || '').trim();
    if (!text) {
      // Mark anyway — a board opened with no seed text shouldn't get seeded
      // later just because a re-render passes new text.
      seededBoardIds.add(boardId);
      return;
    }
    if (notes.length > 0) {       // board already has content → don't duplicate
      seededBoardIds.add(boardId);
      return;
    }

    const pieces = text
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (pieces.length === 0) {
      seededBoardIds.add(boardId);
      return;
    }

    // Claim the boardId synchronously BEFORE awaiting any addNote — this is
    // the line that defeats the StrictMode double-fire (the second effect
    // sees the set entry and bails immediately).
    seededBoardIds.add(boardId);

    // Sequentially create each note so server ordering matches list ordering
    // (and addNote can compute zIndex from the latest notes ref). Errors on
    // individual creates are swallowed by addNote and surfaced via `error`.
    void (async () => {
      for (const content of pieces) {
        // eslint-disable-next-line no-await-in-loop
        await addNote({ content });
      }
    })();
  }, [boardId, loading, closed, error, seedFromText, notes.length, addNote]);

  const cardHandles = useRef<Map<string, StickyNoteCardHandle | null>>(new Map());

  const registerCard = useCallback((id: string, handle: StickyNoteCardHandle | null) => {
    if (handle) cardHandles.current.set(id, handle);
    else cardHandles.current.delete(id);
  }, []);

  // Fullscreen the surface root itself instead of documentElement. When the
  // surface element is the fullscreenElement, the browser hides every other
  // element (modal backdrop, the SAR form behind, the page header) and paints
  // ONLY this container at viewport size — so the corkboard truly fills the
  // screen instead of staying as a centered card.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onChange = () =>
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch (err: any) {
      toastError(err?.message || 'ไม่สามารถเปลี่ยนโหมดเต็มจอได้');
    }
  };

  const handleAdd = async () => {
    if (closed) {
      toastError('บอร์ดถูกเก็บไว้แล้ว');
      return;
    }
    await addNote();
  };

  const handleClear = async () => {
    if (notes.length === 0) return;
    if (!isOwner) {
      toastError('เฉพาะเจ้าของบอร์ดเท่านั้นที่ล้างบอร์ดได้');
      return;
    }
    const ok = await toastConfirm(
      `จะลบโน้ตทั้งหมด ${notes.length} ใบจากบอร์ดนี้`,
      { title: 'ล้างบอร์ด?', confirmLabel: 'ล้าง', danger: true }
    );
    if (!ok) return;
    const result = await clearBoardOwner(boardId);
    if (result) {
      toastSuccess(`ล้างโน้ต ${result.cleared} ใบสำเร็จ`);
      // Force-refresh local list — server has soft-archived everything.
      cardHandles.current.clear();
    } else {
      toastError('ล้างไม่สำเร็จ');
    }
  };

  const handleCopyLink = async () => {
    const url = shareUrl || defaultShareUrl(boardKey);
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
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
      patchNote(id, { zIndex: maxZ + 1 });
    },
    [patchNote, notesRef],
  );

  const handleClose = async () => {
    await Promise.all(
      Array.from(cardHandles.current.values()).map((h) => (h ? h.flushIfDirty() : Promise.resolve())),
    );
    const joined = joinNotes(notesRef.current.map((n) => n.content));
    if (closeAlsoClosesBoard && isOwner) {
      await closeBoardOwner(boardId);
    }
    await onClose(joined);
  };

  // Archived-state UI: replace the whole surface so users can't keep poking
  // the board until the owner reactivates it from the original context.
  if (closed) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: '3rem' }}>📦</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1f2937', marginTop: '0.5rem' }}>
          บอร์ดถูกเก็บไว้
        </div>
        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: 480 }}>
          เจ้าของเก็บบอร์ดนี้ไว้ — เปิดใช้งานอีกครั้งได้โดยให้เจ้าของกด &quot;ระดมสมอง&quot; ที่ช่องเดิม โน้ตทั้งหมดและลิงก์เดิมจะกลับมา
        </div>
        <button type="button" onClick={() => onClose('')} style={{ ...successBtn, marginTop: '1.25rem' }}>
          ปิดหน้านี้
        </button>
      </div>
    );
  }

  const showClear = (showClearButton ?? isOwner) && isOwner;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        // Keep the white background on the surface itself — once we fullscreen
        // it, parent backgrounds (modal card / page card) are no longer rendered.
        background: 'white',
      }}
    >
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
        {isOwner ? (
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#ddd6fe', color: '#5b21b6', borderRadius: 4, fontWeight: 600 }}>
            👑 เจ้าของ
          </span>
        ) : (
          <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: 4, fontWeight: 600 }}>
            ผู้ร่วมระดมสมอง
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={handleAdd} style={primaryBtn}>+ เพิ่มโน้ต</button>
        <button type="button" onClick={handleCopyLink} style={ghostBtn} title="คัดลอกลิงก์บอร์ดเพื่อให้คนอื่นร่วมระดมสมอง">
          🔗 คัดลอกลิงก์
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          style={ghostBtn}
          title={isFullscreen ? 'ออกจากโหมดเต็มจอ (Esc)' : 'เปิดโหมดเต็มจอ'}
        >
          {isFullscreen ? '🗗 ย่อหน้าจอ' : '⛶ เต็มจอ'}
        </button>
        {showClear && (
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
        <span>โน้ต: <strong>{notes.length}</strong></span>
        <span>•</span>
        <span>คนอื่นที่ได้ลิงก์ ({(pollIntervalMs || 5000) / 1000}s polling) จะเห็นโน้ตของคุณ — ทุกคนเห็นโน้ตของกันและกัน ไม่ทับกัน</span>
        <span>•</span>
        <span>ผู้เขียน <strong>เท่านั้น</strong> ที่แก้ข้อความ/ลบโน้ตของตัวเองได้ ลาก/เปลี่ยนสีได้ทุกคน</span>
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
