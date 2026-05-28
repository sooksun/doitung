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

  /**
   * Optional seed text. If the board finishes its first load with zero notes
   * AND this string is non-empty, a single note is auto-created so the existing
   * textarea content is preserved as a real note (prevents data loss on legacy
   * SARs that have text but were never brainstormed on the board).
   *
   * Also acts as a safety net inside handleClose: if the user never touched a
   * note in this session AND there are no notes at close time, the joined text
   * falls back to this string instead of wiping the textarea — protects against
   * (a) seed failures, (b) the user clicking Close before the seed network call
   * completes.
   */
  seedContentIfEmpty?: string;
}

function joinNotes(contents: string[]): string {
  return contents
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .join(', ');
}

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
    seedContentIfEmpty,
  } = props;

  const { notes, notesRef, loading, error, closed, addNote, patchNote, deleteNote } = useStickyNotes({
    enabled: true,
    boardKey,
    pollIntervalMs,
  });

  // Tracks whether THIS user touched a note during this session — used by
  // handleClose's safety net to tell apart "user intentionally cleared the
  // board" from "user opened-and-closed without doing anything (or seed
  // didn't propagate in time)". Polling updates from other collaborators are
  // explicitly NOT counted.
  const userModifiedRef = useRef(false);

  // Have we already attempted the one-shot seed for this surface mount? Guards
  // the effect from re-firing if `notes` momentarily becomes empty again (e.g.
  // user adds then deletes the seed note — we must NOT re-seed in that case).
  const seedAttemptedRef = useRef(false);

  // Snapshot the seed text once so we keep the same fallback value even if a
  // late parent re-render changes the prop.
  const seedTextRef = useRef<string>((seedContentIfEmpty || '').trim());
  useEffect(() => {
    if (!seedAttemptedRef.current) {
      seedTextRef.current = (seedContentIfEmpty || '').trim();
    }
  }, [seedContentIfEmpty]);

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
    const note = await addNote();
    if (note) userModifiedRef.current = true;
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
      userModifiedRef.current = true;
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
      if (updated) userModifiedRef.current = true;
      return !!updated;
    },
    [patchNote],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // deleteNote is fire-and-forget on the optimistic side, so we mark the
      // intent as soon as it's invoked. This is what tells handleClose's
      // safety net "the user really meant for this to disappear" — without
      // it, deleting the last note would look identical to a no-op session
      // and the safety net would resurrect the original seed text.
      userModifiedRef.current = true;
      await deleteNote(id);
    },
    [deleteNote],
  );

  // Spatial / visual fields below — touching them doesn't change the joined
  // textarea content, so they intentionally do NOT flip userModifiedRef.
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

  // One-shot board seeder. Runs at most once per surface mount, after the
  // initial reload has actually completed (we know that's happened once we've
  // observed loading flipping true → false). If the board is empty AND the
  // host passed `seedContentIfEmpty`, we create a single note carrying that
  // text so:
  //   1. Legacy SAR text isn't invisible on the board — the user sees their
  //      old content as a real Post-it they can edit.
  //   2. Closing the modal without doing anything still produces a non-empty
  //      `joined` (= original text), so the textarea is preserved.
  // Seed itself does NOT flip userModifiedRef — it's mechanical, not a user
  // action. The user has to actually interact for the dirty flag to flip.
  const everSawLoadingRef = useRef(false);
  useEffect(() => {
    if (loading) everSawLoadingRef.current = true;
  }, [loading]);

  useEffect(() => {
    if (seedAttemptedRef.current) return;
    if (!everSawLoadingRef.current) return;
    if (loading) return;
    // First reload has just completed. Mark `seedAttempted` BEFORE the
    // notes-length check — that way, if the board already had notes at load
    // time we still commit "we've decided not to seed" and prevent the effect
    // from re-firing later (e.g. when the user manually deletes the last note
    // in the same modal session — that must clear the cell, not re-seed it
    // with the original text).
    seedAttemptedRef.current = true;
    if (closed) return;
    if (!seedTextRef.current) return;
    if (notes.length > 0) return;
    addNote({ content: seedTextRef.current }).catch(() => {
      // Seed failed (network/perm) — the handleClose safety net still
      // preserves the original textarea content.
    });
  }, [loading, notes.length, closed, addNote]);

  const handleClose = async () => {
    await Promise.all(
      Array.from(cardHandles.current.values()).map((h) => (h ? h.flushIfDirty() : Promise.resolve())),
    );
    const joined = joinNotes(notesRef.current.map((n) => n.content));
    // Safety net: if the user never touched a note in this session AND the
    // board ended up empty AND we had original textarea content, fall back to
    // the original text. This protects against:
    //   - race where the user clicks "บันทึกและปิด" before the seed POST has
    //     propagated through optimistic state,
    //   - seed network failure (board ended up legitimately empty),
    //   - user opening the modal just to look around without editing.
    // It does NOT trigger when the user actively added / cleared / deleted
    // notes — userModifiedRef.current is true in those cases, so the empty
    // join is what gets applied and the textarea is correctly wiped.
    const safeJoined =
      joined.length === 0 && !userModifiedRef.current && seedTextRef.current.length > 0
        ? seedTextRef.current
        : joined;
    if (closeAlsoClosesBoard && isOwner) {
      await closeBoardOwner(boardId);
    }
    await onClose(safeJoined);
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
          onDelete={handleDelete}
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
