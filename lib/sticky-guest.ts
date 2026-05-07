// lib/sticky-guest.ts
// Helpers for guest identity on sticky-note boards.
//
// Why guests? Sticky boards can be shared via a URL like
//   /sticky?key=<shareKey>
// and we want anyone with that link to add notes — including users who are not
// logged into DOITUNG. To still be able to authorize "you can edit/delete your
// own note" we mint a per-browser guest token kept in localStorage.
//
// The raw token NEVER lands in the database. Server stores sha256(token) only,
// so a DB leak doesn't expose tokens that other browsers might still be using.
//
// Both the API routes (server-side) and the React components (client-side)
// import from this file — Node's `crypto` module is a built-in available in
// both environments, so we can colocate the hash util.

import { createHash, randomBytes } from 'crypto';

export const STICKY_GUEST_TOKEN_HEADER = 'x-sticky-guest-token';
export const STICKY_GUEST_NAME_HEADER = 'x-sticky-guest-name';

const TOKEN_LS_KEY = 'stickyGuestToken';
const NAME_LS_KEY = 'stickyGuestName';

/** Hash a raw guest token (or any opaque string) for storage / comparison. */
export function hashGuestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Generate a fresh share key (40 hex chars, ~160 bits of entropy). */
export function newShareKey(): string {
  return randomBytes(20).toString('hex');
}

// ─── Browser-only helpers ──────────────────────────────────────────────────
// (These call into `window` / `localStorage`, so callers must be 'use client'
// components or run inside a useEffect. They intentionally tolerate SSR by
// returning safe defaults if `window` is absent.)

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Returns the browser's guest token, generating one on first call. Subsequent
 * calls in the same browser return the same token.
 */
export function getOrCreateGuestToken(): string {
  const ls = safeLocalStorage();
  if (!ls) return '';
  const existing = ls.getItem(TOKEN_LS_KEY);
  if (existing && existing.length >= 32) return existing;
  // Two UUIDs concat'd → 64 hex+ chars. Server never trusts the client to
  // pre-hash, so the format here is irrelevant beyond uniqueness.
  const fresh =
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2)) +
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2));
  const tok = fresh.replace(/-/g, '');
  ls.setItem(TOKEN_LS_KEY, tok);
  return tok;
}

/** Read the guest's chosen display name (or null if they haven't set one). */
export function getGuestName(): string | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  const v = ls.getItem(NAME_LS_KEY);
  return v && v.trim().length > 0 ? v : null;
}

/** Set or clear the guest's display name. */
export function setGuestName(name: string | null) {
  const ls = safeLocalStorage();
  if (!ls) return;
  if (name && name.trim().length > 0) {
    ls.setItem(NAME_LS_KEY, name.trim().slice(0, 80));
  } else {
    ls.removeItem(NAME_LS_KEY);
  }
}

/**
 * Build the headers a sticky-notes request should send. Always includes the
 * guest token (server reads it iff there's no Bearer); includes Bearer when
 * the user is logged in.
 */
export function buildStickyHeaders(opts: {
  bearer?: string | null;
  guestName?: string | null;
} = {}): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.bearer) headers['Authorization'] = `Bearer ${opts.bearer}`;
  const tok = getOrCreateGuestToken();
  if (tok) headers[STICKY_GUEST_TOKEN_HEADER] = tok;
  const name = opts.guestName ?? getGuestName();
  if (name) headers[STICKY_GUEST_NAME_HEADER] = encodeURIComponent(name);
  return headers;
}
