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

  /** When supplied AND the surface mounts on a board that this request just
   *  created on the server, the text is split by "," (whitespace trimmed,
   *  empty pieces dropped) and each chunk becomes a new sticky note. Used to
   *  import comma-separated Iceberg cell text into individual brainstorm
   *  notes on first open. */
  seedFromText?: string | null;
  /** Server signal that THIS client request actually inserted the board row.
   *  Required for seedFromText to fire — protects against re-seeding after
   *  page reloads, board clears, and concurrent tabs (each of which would
   *  otherwise see notes.length === 0 momentarily and double-seed). */
  wasJustCreated?: boolean;
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
    wasJustCreated = false,
  } = props;

  const { notes, notesRef, loading, error, closed, addNote, patchNote, deleteNote } = useStickyNotes({
    enabled: true,
    boardKey,
    pollIntervalMs,
  });

  // ── One-shot seeding from caller-supplied comma-separated text ───────────
  // Critical gate: `wasJustCreated` must be true. The server returns it only
  // for the request that actually INSERTED the board row, so:
  //   • Page reload / re-open of an existing board → wasJustCreated=false →
  //     never re-seed.
  //   • Two tabs racing on a fresh contextId → exactly one wins the INSERT
  //     and gets wasJustCreated=true; the loser hits P2002, re-fetches, and
  //     gets wasJustCreated=false → only one seed batch fires.
  //   • Owner clears the board (notes archived) and re-opens → row still
  //     exists → wasJustCreated=false → never re-seed.
  //
  // The module-level `seededBoardIds` guard remains as belt-and-suspenders
  // against React StrictMode's intentional double-mount in dev.
  useEffect(() => {
    if (seededBoardIds.has(boardId)) return;
    if (loading) return;          // initial fetch in progress
    if (closed) return;           // archived board → no inserts
    if (error) return;            // surface the error first

    if (!wasJustCreated) {
      // Existing board — claim the slot so any later re-render with text
      // still won't try to seed (defense in depth).
      seededBoardIds.add(boardId);
      return;
    }

    const text = (seedFromText || '').trim();
    if (!text) {
      seededBoardIds.add(boardId);
      return;
    }
    if (notes.length > 0) {
      // Should not happen on a wasJustCreated board, but a safety belt for
      // the truly unlucky case where notes were inserted between create and
      // the first GET (e.g. another collaborator was already typing).
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

    // Claim BEFORE awaiting any addNote to defeat StrictMode double-fire.
    seededBoardIds.add(boardId);

    void (async () => {
      for (const content of pieces) {
        // eslint-disable-next-line no-await-in-loop
        await addNote({ content });
      }
    })();
  }, [boardId, loading, closed, error, seedFromText, notes.length, addNote, wasJustCreated]);

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

  // Comma-separated pieces from the seed text, computed for both the visibility
  // gate of the resync button and the actual import action below.
  const seedPieces = (seedFromText || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // "นำเข้าจากช่อง" — owner-only repair tool. Archives every active note on
  // this board, then re-creates one note per comma-separated piece in the
  // current Iceberg cell text. Solves two real cases:
  //   1. Boards left with duplicate stickers from previous buggy seed runs
  //      (the row exists, so wasJustCreated never fires re-seeding).
  //   2. User edited the cell textarea directly and wants to re-sync.
  const handleResync = async () => {
    if (!isOwner) {
      toastError('เฉพาะเจ้าของบอร์ดเท่านั้นที่นำเข้าจากช่องได้');
      return;
    }
    if (seedPieces.length === 0) {
      toastError('ช่องนี้ไม่มีข้อความให้แยก');
      return;
    }
    const ok = await toastConfirm(
      `จะลบโน้ตทั้งหมด ${notes.length} ใบบนบอร์ด แล้วสร้างโน้ตใหม่ ${seedPieces.length} ใบ จากข้อความในช่อง Iceberg`,
      { title: 'นำเข้าจากช่อง?', confirmLabel: 'นำเข้า', danger: true },
    );
    if (!ok) return;

    // Step 1 — clear (idempotent if board already empty, server returns 0).
    if (notes.length > 0) {
      const cleared = await clearBoardOwner(boardId);
      if (!cleared) {
        toastError('ล้างไม่สำเร็จ');
        return;
      }
    }
    cardHandles.current.clear();

    // Step 2 — sequentially create one sticky per piece.
    for (const content of seedPieces) {
      // eslint-disable-next-line no-await-in-loop
      await addNote({ content });
    }
    toastSuccess(`นำเข้าโน้ต ${seedPieces.length} ใบสำเร็จ`);
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
  // Show the resync button only inside contexts that supplied seed text and
  // only to owners — the standalone /sticky page passes no seedFromText so
  // the button stays hidden there.
  const showResync = isOwner && seedPieces.length > 0;

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
        {showResync && (
          <button
            type="button"
            onClick={handleResync}
            style={ghostBtn}
            title={`ล้างโน้ตทั้งหมด แล้วสร้างใหม่จากข้อความในช่อง (${seedPieces.length} ใบ)`}
          >
            🔄 นำเข้าจากช่อง
          </button>
        )}
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
