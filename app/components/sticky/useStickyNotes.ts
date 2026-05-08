// app/components/sticky/useStickyNotes.ts
// Client hook for a sticky-notes board addressed by `boardKey` (the share key
// returned from /api/sticky-boards/get-or-create).
//
// Responsibilities
//   - Fetch + 5s poll the notes for the given board (pause when tab hidden).
//   - Provide CRUD wrappers (`addNote`, `patchNote`, `deleteNote`, `clearAll`)
//     that send guest-token / Bearer headers as appropriate.
//   - Surface an `error` plus a `closed` flag when the board is closed (so the
//     UI can switch to a "closed by owner" state instead of looping retries).
//
// Cards own draft state for content + position so polling never clobbers
// in-progress edits — see StickyNoteCard.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildStickyHeaders } from '@/lib/sticky-guest';

export type StickyColor = 'yellow' | 'pink' | 'mint' | 'blue' | 'peach' | 'lavender';

export interface StickyNote {
  id: string;
  boardId: string;
  schoolId: number;
  userId: number | null;
  authorName: string | null;
  contextType: string;
  contextId: string;
  sarId: number | null;
  layerNo: number | null;
  side: 'CURRENT' | 'DESIRED' | null;
  content: string;
  color: StickyColor;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
  status: 'ACTIVE' | 'ARCHIVED';
  // Server-decorated permission flags:
  isMine: boolean;
  isOwner: boolean;
  canEditContent: boolean;
  canDelete: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UseStickyNotesOptions {
  enabled: boolean;
  boardKey: string | null;
  pollIntervalMs?: number;
}

function getBearer(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...buildStickyHeaders({ bearer: getBearer() }),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    const err: any = new Error(json?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export function useStickyNotes(opts: UseStickyNotesOptions) {
  const { enabled, boardKey, pollIntervalMs = 5000 } = opts;
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  const notesRef = useRef<StickyNote[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const reload = useCallback(
    async (silent = false) => {
      if (!enabled || !boardKey) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ boardKey }).toString();
        const data = (await apiFetch(`/api/sticky-notes?${qs}`)) as StickyNote[];
        setNotes(Array.isArray(data) ? data : []);
        setClosed(false);
      } catch (err: any) {
        if (err?.status === 410) {
          setClosed(true);
          setError('บอร์ดถูกเก็บไว้ — เจ้าของสามารถเปิดใช้งานอีกครั้งจากช่องเดิม');
        } else {
          setError(err?.message || 'โหลดไม่สำเร็จ');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, boardKey],
  );

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  // Background polling (5s). Pauses while the document is hidden; resumes on
  // visibility change. Stops once the board is reported ARCHIVED — the owner
  // can reactivate it later by reopening the same context, but until then we
  // don't keep hammering 410 responses.
  useEffect(() => {
    if (!enabled || !boardKey) return;
    if (closed) return;
    if (!pollIntervalMs || pollIntervalMs <= 0) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      reload(true).catch(() => null);
    };
    const timer = setInterval(tick, pollIntervalMs);
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) reload(true).catch(() => null);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }
    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, [enabled, boardKey, pollIntervalMs, closed, reload]);

  const addNote = useCallback(
    async (overrides?: Partial<Pick<StickyNote, 'content' | 'color' | 'x' | 'y' | 'rotation'>>) => {
      if (!boardKey) return null;
      const list = notesRef.current;
      const maxZ = list.reduce((m, n) => Math.max(m, n.zIndex), 0);
      const baseX = 60 + Math.floor(Math.random() * 80);
      const baseY = 60 + Math.floor(Math.random() * 60);
      const offset = list.length * 18;
      const payload = {
        boardKey,
        content: overrides?.content ?? '',
        color: overrides?.color ?? 'yellow',
        x: overrides?.x ?? baseX + offset,
        y: overrides?.y ?? baseY + offset,
        rotation: overrides?.rotation ?? Math.round((Math.random() - 0.5) * 8),
        zIndex: maxZ + 1,
      };
      try {
        const created = (await apiFetch('/api/sticky-notes', {
          method: 'POST',
          body: JSON.stringify(payload),
        })) as StickyNote;
        setNotes((prev) => [...prev, created]);
        return created;
      } catch (err: any) {
        setError(err?.message || 'เพิ่มโน้ตไม่สำเร็จ');
        return null;
      }
    },
    [boardKey],
  );

  const patchNote = useCallback(
    async (id: string, patch: Partial<StickyNote>): Promise<StickyNote | null> => {
      // Optimistic apply (preserves server-only flags via spread).
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      try {
        const updated = (await apiFetch(`/api/sticky-notes/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        })) as StickyNote;
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
        return updated;
      } catch (err: any) {
        setError(err?.message || 'บันทึกไม่สำเร็จ');
        return null;
      }
    },
    [],
  );

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`/api/sticky-notes/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      setError(err?.message || 'ลบไม่สำเร็จ');
    }
  }, []);

  return {
    notes,
    notesRef,
    loading,
    error,
    closed,
    reload,
    addNote,
    patchNote,
    deleteNote,
  };
}

// Helper for the surface to call POST /clear (owner-only, server-enforced).
export async function clearBoardOwner(boardId: string): Promise<{ cleared: number } | null> {
  const res = await fetch(`/api/sticky-boards/${boardId}/clear`, {
    method: 'POST',
    headers: buildStickyHeaders({ bearer: getBearer() }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) return null;
  return json.data as { cleared: number };
}

// Helper for the surface to call POST /close (owner-only, server-enforced).
export async function closeBoardOwner(boardId: string): Promise<boolean> {
  const res = await fetch(`/api/sticky-boards/${boardId}/close`, {
    method: 'POST',
    headers: buildStickyHeaders({ bearer: getBearer() }),
  });
  const json = await res.json().catch(() => ({}));
  return !!(res.ok && json?.success);
}
