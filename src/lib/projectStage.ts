// Shared project "stage" pipeline used by the admin and contractor project pages
// plus the project form modal. Kept in one place so the list of stages and its
// badge styling never drift apart across those files.
export const STAGES = ['Discovery', 'Proposal', 'In Production', 'Client Review', 'Revisions', 'Final Delivery', 'Closed'] as const;
export type ProjectStage = typeof STAGES[number];
export const DEFAULT_STAGE: ProjectStage = 'Discovery';

const stageCfg: Record<string, { cls: string }> = {
  'Discovery':      { cls: 'bg-indigo-50 text-indigo-700' },
  'Proposal':       { cls: 'bg-violet-50 text-violet-700' },
  'In Production':  { cls: 'bg-sky-50 text-sky-700' },
  'Client Review':  { cls: 'bg-amber-50 text-amber-700' },
  'Revisions':      { cls: 'bg-rose-50 text-rose-700' },
  'Final Delivery': { cls: 'bg-emerald-50 text-emerald-700' },
  'Closed':         { cls: 'bg-gray-100 text-gray-500' },
};

export const getStageCfg = (stage: string | null | undefined) => stageCfg[stage ?? ''] ?? null;
