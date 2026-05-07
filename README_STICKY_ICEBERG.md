# Sticky Notes ↔ Iceberg Cell (MVP)

A brainstorming layer on top of the SAR submission form (`/admin/sar/new`). Each
Iceberg textarea can host an "📌 ระดมสมอง" button that opens a Post-it style
popup board. Closing the popup joins all notes with `, ` and writes the result
back into the textarea.

## Status

- **Live in MVP:** Iceberg Layer 1 — *สถานการณ์* — *สิ่งที่เป็นอยู่* (top-left cell).
- **Not yet wired:** the other 7 cells (see "Expanding to all 8 cells" below).

## User flow

1. On `/admin/sar/new`, choose a school + academic year (the brainstorming
   button is disabled until both are selected — the board needs a stable key).
2. Click the small **📌 ระดมสมอง** chip in the top-right of the *สิ่งที่เป็นอยู่*
   textarea on Layer 1.
3. A modal opens over the form with a corkboard. Add Post-it notes, drag them,
   change their colour, edit their text. Each change auto-saves to the server.
4. Click **บันทึกและปิด** (or click the dim backdrop, or press Esc). The active
   notes' content is joined with `, ` and dropped into the textarea.
5. Re-opening the modal restores the same notes — they are addressed by a
   stable key, not by SAR id, so they survive page refresh and even survive
   submitting the SAR.

## Data model

```
StickyNote {
  id          String   (uuid)
  schoolId    Int
  userId      Int?
  contextType String   // "ICEBERG_CELL"
  contextId   String   // e.g. sar:draft:school:42:year:7:iceberg:L1:CURRENT
  sarId       Int?     // optional, reserved for when we attach to a real SAR
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
notes for any context (today: Iceberg cells; later: anywhere else we want to
brainstorm). Authorization is enforced via `schoolId` (admin sees all; everyone
else only their own school's boards).

### Why a draft contextId, not the SarDocument id

`/admin/sar/new` is the create form. There's no SarDocument row until the user
clicks Save, but we still want notes to persist across refreshes. So the MVP
addresses a board by `(schoolId, academicYearId)` instead:

```
sar:draft:school:{schoolId}:year:{academicYearId}:iceberg:L{layerNo}:{side}
```

When we later need notes attached to a specific submitted SAR document, switch
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
    route.ts             # GET list, POST create
    [id]/route.ts        # PATCH update, DELETE archive
  components/sticky/
    StickyNoteButton.tsx # the 📌 chip rendered next to an Iceberg cell
    StickyNoteModal.tsx  # full-screen overlay; owns useStickyNotes
    StickyBoard.tsx      # the corkboard surface, measures size for clamping
    StickyNoteCard.tsx   # one Post-it: drag handle + textarea + colour picker
    useStickyNotes.ts    # fetch / create / patch / delete hook + debounce
  components/IcebergInput.tsx   # gained an optional `renderCellAccessory` prop
  admin/sar/new/page.tsx        # passes the accessory only for L1/CURRENT
middleware.ts                   # /api/sticky-notes added to protected list
schema.prisma                   # StickyNote model added at the bottom
```

`useStickyNotes` keeps an optimistic local copy and debounces text/zIndex
patches by ~600ms to avoid flooding the server while the user types or shuffles
notes; position changes commit immediately on pointer-up; colour changes commit
immediately too.

## Expanding to all 8 cells

Right now `app/admin/sar/new/page.tsx` returns the `StickyNoteButton` only
when `layerNo === 1 && side === 'current'`. To enable the rest, drop that
guard:

```tsx
renderCellAccessory={({ layerNo, side }) => {
  const ready = !!resolvedSchoolId && !!academicYearId;
  const sideKey = side === 'current' ? 'CURRENT' : 'DESIRED';
  const contextId = ready
    ? `sar:draft:school:${resolvedSchoolId}:year:${academicYearId}:iceberg:L${layerNo}:${sideKey}`
    : 'sar:draft:placeholder';
  const layerToCell: Record<number, [keyof Iceberg, 'current' | 'desired']> = {
    1: ['situations', side], 2: ['patterns', side],
    3: ['structures', side], 4: ['mentalModels', side],
  } as any;
  return (
    <StickyNoteButton
      contextType="ICEBERG_CELL"
      contextId={contextId}
      schoolId={resolvedSchoolId}
      layerNo={layerNo}
      side={sideKey}
      title={`ชั้น ${layerNo} ${labelFor(layerNo)} / ${side === 'current' ? 'สิ่งที่เป็นอยู่' : 'สิ่งที่อยากให้เป็น'}`}
      disabled={!ready}
      disabledReason="กรุณาเลือกโรงเรียนและปีการศึกษาก่อน"
      onApplyText={(text) =>
        setIceberg((prev) => ({
          ...prev,
          [layerToCell[layerNo][0]]: {
            ...prev[layerToCell[layerNo][0]],
            [side]: text,
          },
        }))
      }
    />
  );
}}
```

Each of the 8 cells gets its own contextId, so each has its own independent
brainstorming board.

## Testing locally

```bash
# 1. Make sure the StickyNote table is in your DB
npx prisma db push

# 2. Start the dev server
npm run dev

# 3. Smoke test the API
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"Admin123"}' \
  http://localhost:3000/api/auth/login \
  | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{console.log(JSON.parse(s).data.token)})")

curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"contextType":"ICEBERG_CELL","contextId":"sar:draft:school:1:year:1:iceberg:L1:CURRENT","schoolId":1,"layerNo":1,"side":"CURRENT","content":"hello"}' \
  http://localhost:3000/api/sticky-notes
```

Then open `http://localhost:3000/admin/sar/new`, log in as `admin@local /
Admin123`, pick a school + year, and click the 📌 chip on the *สิ่งที่เป็นอยู่*
cell of Layer 1.
