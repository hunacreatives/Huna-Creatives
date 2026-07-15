// Notification deep links are always written in the employee form
// (/hub/contractor/projects?workspace=PROJECT_ID&task=TASK_ID) — see the
// notify-task-* edge functions. Admin-side users need the equivalent admin
// workspace URL instead.
export function adminTaskLinkFromContractorLink(link: string): string | null {
  try {
    const url = new URL(link, window.location.origin);
    if (!url.pathname.startsWith('/hub/contractor/projects')) return null;
    const workspace = url.searchParams.get('workspace');
    const task = url.searchParams.get('task');
    const params = new URLSearchParams();
    if (workspace) params.set('w', workspace);
    params.set('ws', '1');
    if (task) params.set('task', task);
    return `/hub/admin/projects?${params.toString()}`;
  } catch {
    return null;
  }
}
