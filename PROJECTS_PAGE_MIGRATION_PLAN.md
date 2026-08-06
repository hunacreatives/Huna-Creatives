# Plan: Port fs-architects' Projects page improvements to Huna-Creatives

## Important correction to the premise
fs-architects is **not** strictly "the better version." It's ahead on the
task/employee-workflow side (project stages, project codes, task soft-delete
trash, comment read receipts, Drive-folder caching). Huna-Creatives is
**ahead** on the client/finance side — its admin Projects page (4160 lines)
has proposals, e-signed contracts, invoicing, and questionnaire features that
fs-architects never built at all (2550 lines, no equivalent).

Both repos share the same base schema (`hub_projects`, `hub_project_tasks`,
`hub_project_task_comments`, etc. from shared migrations) — they diverged
from one common ancestor. This is a **merge of two branches**, not a
fresh copy-paste. A blind overwrite of Huna's `projects/page.tsx` with fs's
version would delete Huna's proposal/contract/invoice/questionnaire features.
That must not happen.

## Ground rule
**Additive only.** New columns, new tables, new components — no dropped
columns, no overwritten pages, no renamed tables that existing Huna code
depends on (`taskAttachments.ts`, `taskAssignments.ts`, `taskUi.ts`,
`taskPreview.ts` all currently work against `hub_project_tasks` /
`hub_project_task_comments` and must keep working unchanged throughout).

## Decisions locked in (2026-08-06)
- **Skip project codes entirely.** `project_type_code` / `project_code` /
  `hub_project_code_sequences` (fs migrations
  `20260804000001/2_project_type_code*.sql`) are **out of scope** — not
  porting this feature at all. Drop it from every step below.
- **Keep Huna's existing naming.** `/hub/contractor/*` paths, component
  names (`HubContractor*`), gate (`withContractorGate`), and role value
  `'contractor'` stay exactly as they are. No rename to `employee`
  anywhere, ever. This removes the "naming decision" step from the plan —
  it's decided.

## Net-new pieces to port (safe, no Huna equivalent exists)
1. `hub_projects.stage` — project phase enum (fs migration
   `20260803000001_project_stage.sql`). fs's stage list (Pre-Design →
   Post-Construction) is **architecture-firm-specific** — must be replaced
   with a Huna-appropriate stage list, or made configurable, not copied
   literally.
2. `hub_project_tasks.color`, `.meta` (jsonb) —
   `20260721141252_add_task_color_meta.sql`.
3. `hub_projects.task_attachments_folder_id` (Drive folder cache) —
   `20260803000003_project_task_attachments_folder_cache.sql`. Directly
   relevant to the upload-speed work already planned in
   `UPLOAD_MIGRATION_PLAN.md` — do this one alongside that effort.
4. Task Panel Modernization (fs's own Aug 1 version, distinct from Huna's Jul
   29 rebuild — see corrected memory): `hub_project_tasks.deleted_at`
   (soft-delete/trash), multi-file comment attachments. **Skip fs's
   `seen_by` migration** — Huna already has its own `seen_by` column
   (20260729000001) from its own read-receipts work; do not double-add or
   overwrite it, just confirm the column shape matches what Huna's UI reads.

## Requires careful diff-and-merge, not overwrite
1. **`src/pages/hub/admin/projects/page.tsx`** — do not replace. Diff fs's
   version against Huna's to extract only the stage + task-color UI
   additions (no project-code UI — out of scope), and hand-merge them into
   Huna's existing file, preserving `ProjectFormModal.tsx`,
   `QuestionnaireAnswersModal.tsx`, `ReceiptLightbox.tsx`,
   `SendReceiptModal.tsx`, `contractPreview.ts`, `invoicePrint.ts`
   integration points.
2. **`src/pages/hub/employee/projects/page.tsx`** (fs) vs Huna's existing
   `src/pages/hub/contractor/projects/page.tsx` — same diff-and-merge
   approach, ported into Huna's file at its current path with its current
   component/role names. Nothing about the route/component naming changes.
3. **`TaskDetailPanel.tsx`** — both repos have a working version tied to
   live data. Diff fs's trash/soft-delete additions against Huna's
   Tiptap/Notion-style rebuild; port the trash UI into Huna's existing
   component rather than swapping files.
4. **Realtime subscriptions** (`enable-realtime-tasks.sql` and any
   `.channel()` wiring in task components) — after adding `deleted_at`,
   confirm subscribed column sets/filters still make sense (e.g. task list
   queries should now filter `deleted_at IS NULL`).

## Genericization note
- fs's `stage` enum values are architecture-firm-specific (Pre-Design →
  Post-Construction) — replace with Huna-appropriate stage names when
  porting the column/UI.
- Scrub the one stray "fs-architects" comment left in fs's
  `employee/projects/page.tsx:989` if that section is referenced — don't
  carry it into Huna's copy.

## Suggested order of execution
1. Additive DB migrations only: `stage`, task `color`/`meta`,
   `deleted_at`, `task_attachments_folder_id`. No project-code migration.
   Test against a Huna dev/staging Supabase project first — schema changes
   get pasted in the Supabase dashboard by Francis per existing workflow.
2. Port stage picker + task-color UI into Huna's admin `projects/page.tsx`
   via hand merge (not overwrite). Verify existing finance features
   (proposals/contracts/invoices/questionnaires) still render and function.
3. Port task color/meta + soft-delete trash UI into `TaskDetailPanel.tsx`
   and task list/board components. Verify Huna's Tiptap comment editor and
   read receipts still work unchanged.
4. Port stage picker into contractor-facing projects page
   (`src/pages/hub/contractor/projects/page.tsx`), same naming throughout.

## What must NOT be touched
- `hub_proposals`, `hub_client_contracts` tables and their UI
  (`ProjectFormModal.tsx`, `QuestionnaireAnswersModal.tsx`,
  `ReceiptLightbox.tsx`, `SendReceiptModal.tsx`, `contractPreview.ts`,
  `invoicePrint.ts`) — none of this exists in fs-architects; nothing to
  merge here, just don't let a page-level copy-paste delete it.
- `hub_projects.client_checklist` jsonb (20260623000003) — Huna-only,
  unrelated to fs's changes, must survive any schema/page merge untouched.
- Existing task data in `hub_project_tasks` /
  `hub_project_task_comments` — all changes above are additive columns;
  no migration in this plan drops or renames existing columns/rows.
