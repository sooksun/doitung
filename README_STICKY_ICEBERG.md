# Sticky Notes ↔ Iceberg Cell

A collaborative brainstorming layer on top of the SAR submission form
(`/admin/sar/new`). Each Iceberg textarea hosts an "📌 ระดมสมอง" button that
opens a Post-it style board. Closing the board joins all notes with `, ` and
writes the result back into the textarea.

The board is **shareable** — copy the link and anyone (logged in or not) can
join, add notes, drag/recolor, and edit their own. Authorization is enforced
on the server: each user is either the **owner** (who created the board), an
**author** of specific notes, or a **collaborator** who can move/recolor any
note but only edit/delete their own.

## Status

- **Live in MVP:** Iceberg Layer 1 — *สถานการณ์* — *สิ่งที่เป็นอยู่* (top-left cell).
- **Not yet wired:** the other 7 cells (see "Expanding to all 8 cells" below).
- **Standalone page** `/sticky?key=<shareKey>` works for any board.

## User flow

### Owner (in the SAR form)
1. On `/admin/sar/new`, choose a school + academic year.
2. Click **📌 ระดมสมอง** chip. The modal opens; the server resolves (or creates)
   a `StickyBoard` for this Iceberg cell — your `user.id` becomes the owner
   the very first time it's opened, and that ownership sticks.
3. Brainstorm with notes — drag, recolor, add. Each note has explicit
   **💾 บันทึก / ↩ ยกเลิก** for content; position + color auto-save.
4. Click **🔗 คัดลอกลิงก์** → URL of the form `/sticky?key=<shareKey>` lands
   on your clipboard. Send via LINE / email / chat.
5. Click **บันทึกและปิด** (the green button). Two things happen atomically:
   1. every dirty note draft is flushed to the server,
   2. the joined text is written into the Iceberg textarea.
   The board itself **stays ACTIVE** on the server — closing the modal is a
   local UI action, not a board lifecycle event.
6. Re-opening the modal for the same Iceberg cell returns the **same**
   board with the **same** shareKey, so previously created notes are still
   there and any link you shared keeps working. Continue brainstorming
   exactly where you left off.

### Collaborator (with a share link)
1. Open `/sticky?key=<shareKey>`. **No login required.** Browser auto-mints a
   guest token on first visit and stores it in localStorage.
2. Optionally type your name in the header — every note you create will carry
   that name as a "— ครูมานะ" badge so others know who wrote what.
3. Add notes, drag any note around, recolor any note. Edit / delete only the
   notes you wrote. The chip in the header reads "ผู้ร่วมระดมสมอง" so you
   know you're not the owner.
4. Press **ออกจากบอร์ด** to leave (just navigates back; the board stays
   active for everyone else).

### Closed-board state (rare)
The `/api/sticky-boards/:id/close` endpoint still exists for the case where
an admin needs to revoke a share link entirely, but no UI flow currently
calls it. If a board ever does land in `status=CLOSED`:
- collaborators on `/sticky?key=...` see a friendly "🔒 บอร์ดถูกปิดแล้ว" panel,
- every shareKey-keyed `/api/sticky-notes` call returns **410 Gone**,
- and the next time the owner opens the same Iceberg cell, the board is
  **reactivated** automatically (status flips back to ACTIVE, original
  shareKey resumes working) so notes are not lost.

## Authorization matrix

| Action | Owner | Author (login) | Author (guest) | Other login | Other guest |
|---|---|---|---|---|---|
| GET notes / POST note (board open) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit `content` of own note | ✅ | ✅ | ✅ | — | — |
| Edit `content` of another note | ✅ | ❌ | ❌ | ❌ | ❌ |
| Drag / recolor / z-bump any note | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete own note | ✅ | ✅ | ✅ | — | — |
| Delete another's note | ✅ | ❌ | ❌ | ❌ | ❌ |
| Clear board / Close board / get-or-create | ✅ | ❌ | ❌ | ❌ | ❌ |

The server attaches per-note flags (`isMine`, `isOwner`, `canEditContent`,
`canDelete`) to every note returned in `/api/sticky-notes`, so the client UI
shows the right buttons without leaking other authors' tokens.

## Concurrency / "เห็นโน้ตคนอื่นไม่ทับกัน"

- **Polling:** every 5 s `useStickyNotes` re-fetches the board; pauses when
  the tab is hidden; resumes on visibility change.
- **Author-bound content edit** kills the "two people typing in the same
  textarea" race by construction — only the original author may edit a note's
  content, so there's never a concurrent write on the same field.
- **Local card state for drafts + drag** ensures polling never clobbers the
  current user's pending edit or in-progress drag.
- Verified manually with 3 concurrent writers (owner + logged-in user + guest)
  — see Tests below.

## Data model

```
StickyBoard {
  id           uuid
  shareKey     hex(40)        // 160-bit random; unique
  ownerUserId  Int            // FK User
  schoolId     Int
  contextType  String         // "ICEBERG_CELL"
  contextId    String(255)    // sar:draft:school:1:year:1:iceberg:L1:CURRENT
  status       String         // ACTIVE | ARCHIVED
  closedAt     DateTime?      // set when ARCHIVED; cleared on reactivation

  @@unique([contextType, contextId])  // one board per context, race-free
}

StickyNote {
  id           uuid
  boardId      uuid?          // FK StickyBoard (nullable for legacy rows)
  schoolId     Int
  userId       Int?           // logged-in author
  authorToken  varchar(64)?   // sha256(guest token); null for logged-in authors
  authorName   varchar(120)?  // optional display name
  contextType, contextId      // duplicated from board for fast filtering
  content, color, x, y, rotation, zIndex, status
}
```

The board addresses ownership + lifecycle once; notes inherit context from
their board. Closing a board never deletes notes — they remain in DB tied to
the closed board (audit + future replay).

## API

All sticky routes return the standard `{ success, data, message?, error? }`
envelope from `lib/api-utils.ts`.

### Boards

| Method | Path | Auth | Body / Response |
|---|---|---|---|
| POST | `/api/sticky-boards/get-or-create` | login | `{ contextType, contextId, schoolId }` → `{ id, shareKey, isOwner, ... }` |
| GET  | `/api/sticky-boards/by-key/:shareKey` | **public** | board info incl. `status` and `closedAt` (200 even when CLOSED) |
| POST | `/api/sticky-boards/:id/close` | login (owner) | sets status=CLOSED, closedAt=now |
| POST | `/api/sticky-boards/:id/clear` | login (owner) | soft-archives all ACTIVE notes on the board |

### Notes

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET    | `/api/sticky-notes?boardKey=<key>` | **public** | 410 if board CLOSED |
| POST   | `/api/sticky-notes` | login or guest token | header `X-Sticky-Guest-Token: <raw>` for guests; rate-limited 60/min/IP/board |
| PATCH  | `/api/sticky-notes/:id` | login or guest token | content edit: author or owner only; spatial: anyone |
| DELETE | `/api/sticky-notes/:id` | login or guest token | author or owner only; soft delete |

## Code layout

```
app/
  api/
    sticky-boards/
      get-or-create/route.ts     # POST — owner sign-up
      by-key/[shareKey]/route.ts # GET — public board lookup
      [id]/close/route.ts        # POST — owner-only
      [id]/clear/route.ts        # POST — owner-only
    sticky-notes/
      route.ts                   # GET (public) + POST (login OR guest)
      [id]/route.ts              # PATCH + DELETE — author/owner enforcement
  components/sticky/
    useStickyNotes.ts            # 5s polling + patchNote + closeBoardOwner / clearBoardOwner helpers
    StickyNoteCard.tsx           # one Post-it; honours canEditContent / canDelete; shows author badge
    StickyBoard.tsx              # corkboard; ResizeObserver for clamping
    StickyBoardSurface.tsx       # toolbar + board area; gates owner-only buttons; closed-state UI
    StickyNoteModal.tsx          # modal wrapper; calls /get-or-create on open; owner closes board on save
    StickyNoteButton.tsx         # 📌 chip rendered in Iceberg cells
  sticky/page.tsx                # standalone /sticky?key=... page; guest token + name input
lib/
  sticky-guest.ts                # guest-token / display-name client helpers + server hash util + header constants
middleware.ts                    # /api/sticky-{notes,boards} are pass-through; handlers do their own auth
schema.prisma                    # StickyBoard model + new columns on StickyNote
```

## Expanding to all 8 cells

In `app/admin/sar/new/page.tsx`, drop the `layerNo === 1 && side === 'current'`
guard in `renderCellAccessory`. Each cell's `contextId` is unique
(`sar:draft:school:N:year:N:iceberg:L{n}:{SIDE}`), so each will get its own
independent board. No other code change needed.

## Tests done manually

End-to-end (`/tmp/dev.log` + curl) covers:

1. Owner creates board → returns `shareKey`, `isOwner=true`.
2. Three concurrent writers post notes:
   - Owner (admin, logged in)
   - Teacher (logged in, separate user)
   - Guest (no Bearer; only `X-Sticky-Guest-Token` + `X-Sticky-Guest-Name: ครูมานะ`)
3. Each writer GETs the board: every note visible to all three; per-note
   `isMine` / `canEditContent` / `canDelete` flags differ correctly per
   caller.
4. Cross-edit attempts:
   - Teacher edits owner's content → **403** "แก้ไขข้อความได้เฉพาะผู้เขียนหรือเจ้าของบอร์ด"
   - Guest deletes teacher's note → **403** "ลบได้เฉพาะผู้เขียนโน้ตหรือเจ้าของบอร์ด"
   - Teacher drags owner's note → **200** (spatial is collective)
5. Owner closes board:
   - `/api/sticky-notes?boardKey=<>` → **410** for everyone
   - `/api/sticky-notes POST` → **410**
   - `/api/sticky-boards/by-key/<>` still **200** (so the page can show
     "closed by owner")
6. Owner clicks the (now-renamed) archive endpoint → board status flips
   to `ARCHIVED`; `shareKey` keeps existing in DB but every shareKey-keyed
   API path returns 410 until reactivation.
7. Owner reopens the same Iceberg cell → `get-or-create` reactivates the
   ARCHIVED board to ACTIVE in a single `prisma.upsert` call. Same `id`,
   same `shareKey`, every previously-archived note still attached.

## Security & sharing model (read this before broad rollout)

- **Guest token in localStorage.** When a non-logged-in user opens
  `/sticky?key=...` we mint a per-browser opaque token and store it under
  `stickyGuestToken`. The server only ever stores `sha256(token)`, so a DB
  leak doesn't burn live tokens. **However**, an XSS hole on
  `doitung.cnppai.com` could still steal the cleartext token from the
  victim's localStorage and then impersonate that guest's notes (move /
  delete / edit *their own* notes only — the auth model still locks down
  cross-author writes). For higher-security deployments, migrate the
  guest identity to an `httpOnly` cookie and drop localStorage usage.
- **shareKey appears in the URL.** This is "anyone with the link" sharing
  in the Google-Docs sense, not invited-user-only:
  - Browser history holds the URL.
  - Outbound clicks from the /sticky page may leak the URL via the
    `Referer` header to whatever the user clicked.
  - Browser sync (Chrome/Edge profiles) may sync the URL across the
    user's other devices and to anyone they share that profile with.
  Treat the link as semi-secret; do not paste it into public channels if
  the brainstorming content is sensitive.
- **Authorization is enforced server-side**, not by the URL alone:
  - GET notes / POST note are public (anyone with the live shareKey on an
    ACTIVE board).
  - PATCH `content` and DELETE check author or owner — the shareKey
    alone does NOT grant write-on-someone-else's-note privileges.
  - `clear board` and `archive board` are owner-only.
- **Rate limit is per-process.** See the TODO in
  [app/api/sticky-notes/route.ts](app/api/sticky-notes/route.ts) — replace
  with Redis if the app is ever scaled to >1 instance.

## Testing locally yourself

### One-shot manual verification (curl)

The project doesn't yet ship an automated test suite, so until that lands
the canonical regression check is the script below. It exercises the
unique-board guarantee, the authorization matrix, and the
archive/reactivate cycle. Paste each block sequentially after `npm run
dev` is up.

```bash
PORT=3000

# A) Login two users.
T_OWNER=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"Admin123"}' \
  http://localhost:$PORT/api/auth/login \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{console.log(JSON.parse(s).data.token)})")
T_TEACHER=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"teacher@example.com","password":"Teacher123"}' \
  http://localhost:$PORT/api/auth/login \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{console.log(JSON.parse(s).data.token)})")

CTX="sar:test:school:1:year:1:iceberg:L1:CURRENT"

# B) get-or-create twice → must return same shareKey (race-safe via @@unique).
KEY1=$(curl -s -X POST -H "Authorization: Bearer $T_OWNER" -H "Content-Type: application/json" \
  -d "{\"contextType\":\"ICEBERG_CELL\",\"contextId\":\"$CTX\",\"schoolId\":1}" \
  http://localhost:$PORT/api/sticky-boards/get-or-create | node -e "…")
KEY2=$(curl -s -X POST -H "Authorization: Bearer $T_OWNER" -H "Content-Type: application/json" \
  -d "{\"contextType\":\"ICEBERG_CELL\",\"contextId\":\"$CTX\",\"schoolId\":1}" \
  http://localhost:$PORT/api/sticky-boards/get-or-create | node -e "…")
[ "$KEY1" = "$KEY2" ] && echo "✓ same shareKey" || echo "✗ different — race detected"

# C) Auth matrix: post 3 notes (owner / teacher / guest), then verify
# cross-edits / cross-deletes are blocked.
# (See git history of README_STICKY_ICEBERG.md for the full block.)

# D) Archive + reactivate.
BID=$(curl -s -H "Authorization: Bearer $T_OWNER" \
  "http://localhost:$PORT/api/sticky-boards/by-key/$KEY1" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{console.log(JSON.parse(s).data.id)})")
curl -s -X POST -H "Authorization: Bearer $T_OWNER" \
  "http://localhost:$PORT/api/sticky-boards/$BID/close"
KEY3=$(curl -s -X POST -H "Authorization: Bearer $T_OWNER" -H "Content-Type: application/json" \
  -d "{\"contextType\":\"ICEBERG_CELL\",\"contextId\":\"$CTX\",\"schoolId\":1}" \
  http://localhost:$PORT/api/sticky-boards/get-or-create | node -e "…")
[ "$KEY1" = "$KEY3" ] && echo "✓ reactivated, same shareKey" || echo "✗ NEW shareKey after archive — bug"
```

The full curl chain (with `node -e` JSON extractors filled in) lives in
`scripts/seed-production.js`-adjacent docs and the testing notes in this
file's git history; the TL;DR of each step is captured above.

### Browser flow

```bash
# 1. Schema (idempotent).
npx prisma db push

# 2. Dedupe legacy duplicate boards (idempotent; exits in ms when nothing to do).
node scripts/dedupe-sticky-boards.js

# 3. Start dev server.
npm run dev

# 4. Two-tab + guest test.
# Tab 1: log in, /admin/sar/new, open board, copy link.
# Tab 2: paste link → /sticky?key=... while logged out → enter your name → add notes.
# Tab 3: log in as a different user → paste same link → add more notes.
# Within 5s every tab sees every note.

# 5. Owner archives board (Tab 1 → "บันทึกและปิด" then explicit archive in DB).
# Tabs 2 + 3 within 5s show the "📦 บอร์ดถูกเก็บไว้" page; reopening on Tab 1
# brings everything back with the same shareKey.
```
