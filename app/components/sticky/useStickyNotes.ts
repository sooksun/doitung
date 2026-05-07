// app/components/sticky/useStickyNotes.ts
// Client-side hook for the sticky-notes board on a given (contextType, contextId).
//
// Responsibilities:
//   - Initial load of notes for the board
//   - Background polling every `pollIntervalMs` (default 5s) so collaborators see
//     each other's changes without a websocket. Pauses when the tab is hidden.
//   - Unified `patchNote(id, partial)` that updates locally first then PATCHes
//     the server, replacing the local copy with the server's response.
//   - `addNote`, `deleteNote`, `clearAll` for board ops.
//
// The cards own their *own* draft state for content + position. This hook only
// keeps a server-mirrored list and emits patch calls when the cards explicitly
// commit (Save button on a note, pointer-up on a drag, color change, etc.).

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type StickyColor = 'yellow' | 'pink' | 'mint' | 'blue' | 'peach' | 'lavender';

export interface StickyNote {
  id: string;
  schoolId: number;
  userId: number | null;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface UseStickyNotesOptions {
  enabled: boolean;
  contextType: string;
  contextId: string;
  schoolId: number | null;
  sarId?: number | null;
  layerNo?: number | null;
  side?: 'CURRENT' | 'DESIRED' | null;
  pollIntervalMs?: number; // default 5000; pass 0 to disable polling
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<any> {
  const token = getToken();
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json.data;
}

export function useStickyNotes(opts: UseStickyNotesOptions) {
  const {
    enabled,
    contextType,
    contextId,
    schoolId,
    sarId,
    layerNo,
    side,
    pollIntervalMs = 5000,
  } = opts;
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Always-fresh notes snapshot — used by callers that need to compute joined
  // text right after issuing PATCHes, without waiting for the next render tick.
  const notesRef = useRef<StickyNote[]>([]);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  const reload = useCallback(
    async (silent = false) => {
      if (!enabled || !contextId) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ contextType, contextId }).toString();
        const data = (await apiFetch(`/api/sticky-notes?${qs}`)) as StickyNote[];
        setNotes(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || 'โหลดไม่สำเร็จ');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, contextType, contextId],
  );

  // Initial load.
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  // Background polling — same idea as the dashboard's 5s tick.
  useEffect(() => {
    if (!enabled) return;
    if (!pollIntervalMs || pollIntervalMs <= 0) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      reload(true).catch(() => null);
    };
    const timer = setInterval(tick, pollIntervalMs);
    const onVis = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        reload(true).catch(() => null);
      }
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
  }, [enabled, pollIntervalMs, reload]);

  const addNote = useCallback(
    async (overrides?: Partial<Pick<StickyNote, 'content' | 'color' | 'x' | 'y' | 'rotation'>>) => {
      if (!schoolId) {
        setError('ยังไม่ได้เลือกโรงเรียน');
        return null;
      }
      const list = notesRef.current;
      const maxZ = list.reduce((m, n) => Math.max(m, n.zIndex), 0);
      const baseX = 60 + Math.floor(Math.random() * 80);
      const baseY = 60 + Math.floor(Math.random() * 60);
      const offset = list.length * 18;
      const payload = {
        contextType,
        contextId,
        schoolId,
        sarId: sarId ?? null,
        layerNo: layerNo ?? null,
        side: side ?? null,
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
    [contextType, contextId, schoolId, sarId, layerNo, side],
  );

  // Optimistic local apply, then PATCH server, then replace local copy with the
  // server's authoritative version. Returns the server-side note (or null on error).
  const patchNote = useCallback(
    async (id: string, patch: Partial<StickyNote>): Promise<StickyNote | null> => {
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

  const clearAll = useCallback(async () => {
    const ids = notesRef.current.map((n) => n.id);
    setNotes([]);
    await Promise.all(
      ids.map((id) => apiFetch(`/api/sticky-notes/${id}`, { method: 'DELETE' }).catch(() => null)),
    );
  }, []);

  return {
    notes,
    notesRef,
    loading,
    error,
    reload,
    addNote,
    patchNote,
    deleteNote,
    clearAll,
  };
}
