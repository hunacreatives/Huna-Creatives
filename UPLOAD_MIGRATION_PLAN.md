# Plan: Port fs-architects' resumable upload path to Huna-Creatives

## Problem
Huna-Creatives uploads every file the same way: browser reads the whole file,
base64-encodes it, sends it to the `upload-to-drive` Supabase Edge Function,
which decodes it, re-encodes it as multipart, and forwards it to Google Drive.
That's 3 copies of the file in the edge function's memory at once (base64
string, decoded bytes, re-encoded multipart body) — it OOMs on anything much
bigger than a few MB, and base64 alone adds ~33% overhead on top of the double
network hop (browser → Supabase → Google).

fs-architects fixed this for `task_attachment` uploads with a resumable,
direct-to-Drive path: the edge function only brokers a signed upload URL;
the actual file bytes go straight from the browser to Google.

## Reference (already implemented in fs-architects)
- Client: `fs-architects/src/lib/driveUpload.ts:37-65` — `uploadFileToDriveResumable`
- Server: `fs-architects/supabase/functions/upload-to-drive/index.ts:167-234` —
  `mode: 'init'` / `mode: 'finalize'` branches
- Optional/bundled: `fs-architects/supabase/functions/_shared/drive.ts`
  (cached per-project Drive folder IDs), `_shared/auth.ts` (CORS allowlist +
  auth guard, replacing wildcard CORS)

## Target files in Huna-Creatives
- `Huna-Creatives/src/lib/driveUpload.ts`
- `Huna-Creatives/supabase/functions/upload-to-drive/index.ts`
- `Huna-Creatives/src/lib/taskAttachments.ts` (caller — no logic change expected,
  just needs to keep working against the new path)

## Steps

### 1. Client: add the resumable path
In `driveUpload.ts`, add `uploadFileToDriveResumable(file, meta)` alongside
the existing base64 `uploadFileToDrive`:
- Call `upload-to-drive` edge function with `{ mode: 'init', filename,
  mimeType, size, type, meta }` → returns a one-time Google resumable
  `uploadUrl`.
- `fetch(uploadUrl, { method: 'PUT', body: file })` directly to Google —
  no Supabase involved in the byte transfer.
- Call `upload-to-drive` again with `{ mode: 'finalize', fileId, type }` to
  mark the file ready/shared in Drive.
- Gate on upload type: start with `type === 'task_attachment'` routing to
  the resumable path (matches fs-architects), fall back to the existing
  base64 path for everything else. Broaden later once proven stable.

### 2. Server: add init/finalize modes
In `supabase/functions/upload-to-drive/index.ts`, add the `mode: 'init'` and
`mode: 'finalize'` branches (port from fs-architects, same file/line range
above). Key detail: the `init` request must echo the browser's `Origin`
header back to Google, or Google's CORS policy blocks the subsequent
cross-origin PUT.

Keep the existing base64 branch intact — it stays as the path for upload
types not yet migrated (step 1 gate).

### 3. (Optional, same file family) Cached per-project folders + CORS hardening
- Port `_shared/drive.ts`: `getOrCreateProjectFolderId` /
  `getOrCreateTaskAttachmentsFolderId`, backed by a
  `hub_projects.task_attachments_folder_id` column lookup — avoids a Drive
  folder-lookup/create call on every upload once cached.
  - Needs a DB migration to add that column if Huna's `hub_projects` (or
    equivalent) table doesn't already have it — confirm schema first.
- Port `_shared/auth.ts`: `corsHeaders` (origin allowlist) + `guardUser`,
  replacing Huna's current wildcard CORS object in the edge function.

Not required for the speed fix — bundle only if doing a fuller pass.

## What's unchanged
- `MAX_FILE_SIZE = 100 * 1024 * 1024` (100MB) client-side cap — identical in
  both projects already, no change needed.
- No progress bar in either project today. The resumable PUT (fetch/XHR) can
  report upload progress, unlike `supabase.functions.invoke`, so a progress
  bar becomes easy to add later — not part of this plan unless requested.

## Deploy note
Code changes (client + edge function) can be written directly. The edge
function itself needs `supabase functions deploy upload-to-drive` run by
Francis per the existing deploy workflow — SQL/schema changes (if step 3 is
included) get pasted in the Supabase dashboard first, same as usual.

## Suggested order of execution
1. Implement steps 1–2, test with a large (>10MB) task attachment upload
   locally against Huna's Supabase project.
2. Deploy edge function, verify in production.
3. Only then consider step 3 as a separate follow-up pass.
