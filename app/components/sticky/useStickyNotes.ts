// app/components/sticky/useStickyNotes.ts
// Client-side hook for the sticky-notes board on a given (contextType, contextId).
// - load notes when the modal opens
// - create / patch / archive notes against /api/sticky-notes
// - keep an optimistic local copy so the UI feels instant; server is the source of truth
//
// Auth token: read from localStorage at call time (the same convention used by
// the rest of the admin pages — see app/admin/sar/new/page.tsx).

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
  const { enabled, contextType, contextId, schoolId, sarId, layerNo, side } = opts;
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coalesce drag/edit patches per-id so we don't spam the server.
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const reload = useCallback(async () => {
    if (!enabled || !contextId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ contextType, contextId }).toString();
      const data = (await apiFetch(`/api/sticky-notes?${qs}`)) as StickyNote[];
      setNotes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'โหลดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [enabled, contextType, contextId]);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  const addNote = useCallback(
    async (overrides?: Partial<Pick<StickyNote, 'content' | 'color' | 'x' | 'y' | 'rotation'>>) => {
      if (!schoolId) {
        setError('ยังไม่ได้เลือกโรงเรียน');
        return null;
      }
      const maxZ = notes.reduce((m, n) => Math.max(m, n.zIndex), 0);
      const baseX = 60 + Math.floor(Math.random() * 80);
      const baseY = 60 + Math.floor(Math.random() * 60);
      const offset = notes.length * 18;
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
    [contextType, contextId, schoolId, sarId, layerNo, side, notes],
  );

  const updateLocal = useCallback((id: string, patch: Partial<StickyNote>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const persistDebounced = useCallback(
    (id: string, patch: Partial<StickyNote>, delay = 500) => {
      const timers = patchTimers.current;
      const prev = timers.get(id);
      if (prev) clearTimeout(prev);
      const handle = setTimeout(async () => {
        try {
          await apiFetch(`/api/sticky-notes/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          });
        } catch (err: any) {
          setError(err?.message || 'บันทึกไม่สำเร็จ');
        }
      }, delay);
      timers.set(id, handle);
    },
    [],
  );

  const persistImmediate = useCallback(async (id: string, patch: Partial<StickyNote>) => {
    const timers = patchTimers.current;
    const prev = timers.get(id);
    if (prev) {
      clearTimeout(prev);
      timers.delete(id);
    }
    try {
      await apiFetch(`/api/sticky-notes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
    } catch (err: any) {
      setError(err?.message || 'บันทึกไม่สำเร็จ');
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`/api/sticky-notes/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      setError(err?.message || 'ลบไม่สำเร็จ');
    }
  }, []);

  const clearAll = useCallback(async () => {
    const ids = notes.map((n) => n.id);
    setNotes([]);
    await Promise.all(
      ids.map((id) =>
        apiFetch(`/api/sticky-notes/${id}`, { method: 'DELETE' }).catch(() => null),
      ),
    );
  }, [notes]);

  // Flush pending patches when the consumer unmounts (e.g. modal closes).
  useEffect(() => {
    const timers = patchTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  return {
    notes,
    loading,
    error,
    reload,
    addNote,
    updateLocal,
    persistDebounced,
    persistImmediate,
    deleteNote,
    clearAll,
  };
}
