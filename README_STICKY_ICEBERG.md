# Sticky Notes ↔ Iceberg Cell

A brainstorming layer on top of the SAR submission form (`/admin/sar/new`). Each
Iceberg textarea can host an "📌 ระดมสมอง" button that opens a Post-it style
popup board. Closing the popup joins all notes with `, ` and writes the result
back into the textarea.

The same board is **collaboratively shareable** — click "🔗 คัดลอกลิงก์" and
anyone with the link (and a login on the same school) can join the board at
`/sticky?contextType=...&contextId=...`. Polling refreshes every ~5 s so
collaborators see each other's notes within a few seconds.

## Status

- **Live in MVP:** Iceberg Layer 1 — *สถานการณ์* — *สิ่งที่เป็นอยู่* (top-left cell).
- **Not yet wired:** the other 7 cells (see "Expanding to all 8 cells" below).
- **Standalone page** `/sticky?contextType=...&contextId=...` works for any
  board key. Today the only place that emits a link is the Iceberg button.

## User flow

### From the SAR form
1. On `/admin/sar/new`, choose a school + academic year (the brainstorming
   button is disabled until both are selected — the board needs a stable key).
2. Click the small **📌 ระดมสมอง** chip in the top-right of the *สิ่งที่เป็นอยู่*
   textarea on Layer 1.
3. A modal opens over the form with a corkboard. Add Post-it notes, drag them,
   change their colour. Each note has its own **💾 บันทึก / ↩ ยกเลิก** buttons:
   - the textarea is a **draft** until you click Save (server keeps the last
     saved value);
   - Cancel discards the draft and reverts to the last saved content.
   - Position drag and colour change auto-save on commit.
4. Click **🔗 คัดลอกลิงก์** to copy a shareable URL. Send it to a
   collaborator via LINE / email / etc.
5. Click **บันทึกและปิด** (the green button). Any unsaved drafts on every
   note are flushed first; then the active notes' content is joined with `, `
   and written into the Iceberg textarea.
6. Re-opening the modal restores the same notes.

### From the share link
1. Open `/sticky?contextType=ICEBERG_CELL&contextId=…`.
2. Sign in if not already (the page redirects to `/login?next=/sticky?…`).
3. The same board appears as a full-page surface. Add / edit / drag / colour
   notes — all changes propagate to the original modal-on-form within a poll.
4. There's no "apply text to a textarea" action here — that only happens in
   the SAR form modal. The collaborator just adds notes.

## Real-time behaviour

- **Polling:** every 5 s `useStickyNotes` re-fetches the board with `silent`
  mode (no spinner). When `document.hidden` it pauses; visibilitychange
  triggers an immediate refresh on focus.
- **Conflict handling:** local card state takes priority over server polls
  while the user is *actively* editing or dragging:
  - Content: a card's textarea reflects its **draft**; server polls only
    update the displayed text when no edit is pending.
  - Position: while a pointer is held (drag in progress) server `x/y` updates
    are ignored; on pointer-up we PATCH our final position.
  - On Save, the local content is committed and the server value catches up
    on the next poll. If two users edit the same note concurrently, the last
    Save wins.

## Data model

```
StickyNote {
  id          String   (uuid)
  schoolId    Int
  userId      Int?
  contextType String   // "ICEBERG_CELL"
  contextId   String   // e.g. sar:draft:school:42:year:7:iceberg:L1:CURRENT
  sarId       Int?
  layerNo     Int?     // 1 | 2 | 3 | 4
  side        String?  // "CURRENT" | "DESIRED"
  content     Text
  color       String   // yellow | pink | mint | blue | peach | lavender
  x, y        Int      // top-left of the card on the board
  rotation    Int      // -15..15 deg
  zIndex      Int
  status      String   // "ACTIVE" | "ARCHIVED"
}
```

The standalone table has no FK relations on purpose — the same board can host
notes for any context. Authorization is via `schoolId`: admins see all;
everyone else only their own school's boards (enforced on every API method).

### Why a draft contextId

`/admin/sar/new` is the create form, so there's no SarDocument row until the
user clicks Save. The MVP addresses a board by `(schoolId, academicYearId)`
to give the link stability:

```
sar:draft:school:{schoolId}:year:{academicYearId}:iceberg:L{layerNo}:{side}
```

When notes need to be attached to a specific submitted SAR document, switch
the contextId to `sar:{sarId}:iceberg:...` (and optionally migrate the draft
notes by updating their contextId + sarId).

## API

All routes are under `/api/sticky-notes` and require a Bearer token (added to
the protected list in `middleware.ts`). They return the standard
`{ success, data, message?, error? }` envelope from `lib/api-utils.ts`.

| Method | Path                              | Body / query                                                                         | Returns                       |
|--------|-----------------------------------|--------------------------------------------------------------------------------------|-------------------------------|
| GET    | `/api/sticky-notes`               | `?contextType=ICEBERG_CELL&contextId=...`                                            | `StickyNote[]` (ACTIVE only)  |
| POST   | `/api/sticky-notes`               | `{ contextType, contextId, schoolId, content, color, x, y, rotation, layerNo, side }`| created `StickyNote`          |
| PATCH  | `/api/sticky-notes/:id`           | any subset of `{ content, color, x, y, rotation, zIndex, status }`                   | updated `StickyNote`          |
| DELETE | `/api/sticky-notes/:id`           | —                                                                                    | `{ id, status: 'ARCHIVED' }`  |

DELETE is a soft delete (status flip). The list endpoint filters
`status='ACTIVE'`, so archived notes simply disappear from the board.

Authorization rules:

- A user can read a board only if they are an admin OR every note on that
  board belongs to a school they're a member of (via `Teacher.schoolId`).
- A user can write a note only if they are an admin OR they are a teacher of
  the `schoolId` they posted with.

## Code layout

```
app/
  api/sticky-notes/
    route.ts                 # GET list, POST create
    [id]/route.ts            # PATCH update, DELETE archive
  components/sticky/
    useStickyNotes.ts        # fetch + 5s polling + patchNote / addNote / deleteNote
    StickyNoteCard.tsx       # one Post-it: drag handle, draft textarea,
                             #   Save/Cancel, colour picker. Exposes
                             #   flushIfDirty() via ref so the host can commit
                             #   pending drafts before closing.
    StickyBoard.tsx          # corkboard surface (measures size for clamping)
    StickyBoardSurface.tsx   # toolbar + Copy Link + Save & Close. Used by
                             #   both the modal and the standalone page.
    StickyNoteModal.tsx      # dim-backdrop overlay around StickyBoardSurface.
                             #   Closes by writing joined text back to the
                             #   Iceberg textarea on /admin/sar/new.
    StickyNoteButton.tsx     # the 📌 chip rendered next to an Iceberg cell
  components/IcebergInput.tsx   # gained an optional `renderCellAccessory` prop
  admin/sar/new/page.tsx        # passes the accessory only for L1/CURRENT
  sticky/page.tsx               # standalone shareable page (full-screen
                             #   surface + login gate + auto-derives schoolId
                             #   from /api/auth/me)
middleware.ts                   # /api/sticky-notes added to protected list
schema.prisma                   # StickyNote model added at the bottom
```

## Expanding to all 8 cells

In `app/admin/sar/new/page.tsx`, drop the `layerNo === 1 && side === 'current'`
guard and emit a button for every cell (each gets its own `contextId` so each
has its own independent board):

```tsx
renderCellAccessory={({ layerNo, side }) => {
  const ready = !!resolvedSchoolId && !!academicYearId;
  const sideKey = side === 'current' ? 'CURRENT' : 'DESIRED';
  const contextId = ready
    ? `sar:draft:school:${resolvedSchoolId}:year:${academicYearId}:iceberg:L${layerNo}:${sideKey}`
    : 'sar:draft:placeholder';
  const layerToCell: Record<number, keyof Iceberg> = {
    1: 'situations', 2: 'patterns', 3: 'structures', 4: 'mentalModels',
  };
  return (
    <StickyNoteButton
      contextType="ICEBERG_CELL"
      contextId={contextId}
      schoolId={resolvedSchoolId}
      layerNo={layerNo}
      side={sideKey}
      title={`ชั้น ${layerNo} … / ${side === 'current' ? 'สิ่งที่เป็นอยู่' : 'สิ่งที่อยากให้เป็น'}`}
      disabled={!ready}
      disabledReason="กรุณาเลือกโรงเรียนและปีการศึกษาก่อน"
      onApplyText={(text) =>
        setIceberg((prev) => ({
          ...prev,
          [layerToCell[layerNo]]: { ...prev[layerToCell[layerNo]], [side]: text },
        }))
      }
    />
  );
}}
```

## Testing locally

```bash
# 1. Make sure the StickyNote table is in your DB
npx prisma db push

# 2. Start the dev server
npm run dev

# 3. Two-tab collaboration test
#    Tab 1: log in, go to /admin/sar/new, open the board, copy link
#    Tab 2: paste the link → /sticky?contextType=...&contextId=... → add a note
#    Within 5s the note should appear in Tab 1's modal.

# 4. Smoke test the API
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"Admin123"}' \
  http://localhost:3000/api/auth/login \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{console.log(JSON.parse(s).data.token)})")

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"contextType":"ICEBERG_CELL","contextId":"sar:draft:school:1:year:1:iceberg:L1:CURRENT","schoolId":1,"layerNo":1,"side":"CURRENT","content":"hello"}' \
  http://localhost:3000/api/sticky-notes
```
