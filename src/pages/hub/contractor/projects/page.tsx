import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useHubAuth } from '@/hooks/useHubAuth';
import { useDemo } from '@/contexts/DemoContext';
import { supabase } from '@/lib/supabase';
import { DEMO_CONTRACTOR_PROJECTS, DEMO_CONTRACTOR_TASKS, DEMO_CONTRACTOR_TEAM } from '@/lib/demoData';
import TaskDetailPanel from '@/pages/hub/components/TaskDetailPanel';
import { GanttTimeline } from '@/pages/hub/components/GanttTimeline';
import { getServicePalette } from '@/pages/hub/utils/servicePalette';
import { fmt } from '@/pages/hub/utils/format';
import { PRIORITY_CFG, PROJECT_STATUS_COLORS } from '@/pages/hub/utils/taskUi';
import { localToday, slugify } from '@/lib/formatUtils';
import { getTaskDescriptionPreview } from '@/pages/hub/utils/taskPreview';
import { getPrimaryTaskAssigneeId, getTaskAssigneeIds } from '@/lib/taskAssignments';


function normalizeTaskActivityAction(type: string) {
  switch (type) {
    case 'created':
      return 'task_created';
    case 'status_change':
      return 'task_status_changed';
    case 'assigned':
      return 'task_assigned';
    case 'comment_added':
      return 'comment_added';
    case 'attachment_added':
      return 'attachment_added';
    default:
      return type;
  }
}

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }

interface TeamMember { id: string; full_name: string; avatar_url: string | null; }

interface ProjectRow {
  id: number;
  percentage: number;
  payout_type: string;
  fixed_amount: number | null;
  payout_status: string;
  paid_at: string | null;
  exclude_from_payout: boolean;
  hub_project_contractor_payouts: ContractorPayout[];
  hub_projects: {
    id: number;
    project_type: 'client' | 'internal' | 'retainer';
    client_name: string;
    project_name: string;
    service: string | null;
    contract_price: number;
    status: string;
    start_date: string | null;
    deadline: string | null;
    notes: string | null;
    drive_url: string | null;
    slug: string | null;
    monthly_deliverables?: number | null;
    archived_at?: string | null;
    hub_project_payments: { amount: number }[];
    hub_project_costs: { amount: number }[];
  };
}

interface ProjectRowRaw extends Omit<ProjectRow, 'hub_projects'> {
  hub_projects: ProjectRow['hub_projects'] | ProjectRow['hub_projects'][];
}

interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  start_date: string | null;
  assigned_to: string | null;
  assignee_ids?: string[] | null;
  checklist?: { id: string; text: string; done: boolean; detail?: string; assignee_id?: string | null }[] | null;
  archived?: boolean | null;
  archived_at?: string | null;
  color?: string | null;
  meta?: { custom_fields?: { id: string; label: string; value: string }[]; blocked_reason?: string | null } | null;
  completed_at?: string | null;
  deleted_at?: string | null;
}

// ── SVG progress ring ──────────────────────────────────────────────────────
function ProgressRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(pct, 100)) / 100 * circ;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size < 60 ? 7 : 9} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#3b82f6" strokeWidth={size < 60 ? 7 : 9}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      {size >= 100 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold text-gray-900" style={{ fontSize: 22 }}>{pct}%</span>
          <span className="text-[10px] text-gray-400 mt-0.5">complete</span>
        </div>
      )}
    </div>
  );
}


// ── Page ───────────────────────────────────────────────────────────────────
export default function ContractorProjectsPage() {
  const { hubUser: realHubUser } = useAuth();
  const { hubUser: demoHubUser } = useHubAuth();
  const hubUser = realHubUser ?? demoHubUser;
  const { isDemo } = useDemo();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const deepLinkDone = useRef<string | null>(null);
  const deepLinkTaskDone = useRef<string | null>(null);
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [clientEntries, setClientEntries] = useState<{ id: string; rowId?: number; name: string; type: 'retainer' | 'assignment'; status: string; service?: string | null; monthly_rate?: number | null; months_paid?: number; platform?: string | null; role?: string | null; notes?: string | null; clientId?: number }[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [teamMap, setTeamMap] = useState<Record<number, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [workspaceRow, setWorkspaceRow] = useState<ProjectRow | null>(null);
  const [clientWorkspace, setClientWorkspace] = useState<typeof clientEntries[0] | null>(null);
  const [wsQuestionnaires, setWsQuestionnaires] = useState<{ id: number; service_type: string; submitted_at: string | null; questions: { id: string; label: string; type: string; required?: boolean }[]; answers: Record<string, string | string[]> }[]>([]);
  const [wsQModal, setWsQModal] = useState<typeof wsQuestionnaires[0] | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done' | 'overdue'>('all');
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [taskView, setTaskView] = useState<'list' | 'board'>('list');
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<Map<number, string>>(new Map());
  const [hiddenDoneIds, setHiddenDoneIds] = useState<Set<number>>(new Set());
  const completingTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const [search, setSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [wsSearch, setWsSearch] = useState('');
  const [wsSearchOpen, setWsSearchOpen] = useState(false);
  const [wsFocusSection, setWsFocusSection] = useState<string | null>(null); // null = show all
  const [linkCopied, setLinkCopied] = useState(false);
  const wsSearchRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const [, setTick] = useState(0); // forces re-render for live timestamps
  const [taskCommentCounts, setTaskCommentCounts] = useState<Record<number, number>>({});
  type ActivityItem = {
    id: number; action: string; entity_title: string; entity_id: number | null;
    meta: Record<string, unknown> | null; created_at: string;
    hub_users: { full_name: string; avatar_url: string | null } | null;
  };
  const [activityLog, setActivityLog] = useState<ActivityItem[]>([]);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [boardDragOver, setBoardDragOver] = useState<ProjectTask['status'] | null>(null);

  const normalizeActivityItem = (row: any): ActivityItem => ({
    id: row.id,
    action: row.action ?? '',
    entity_title: row.entity_title ?? row.description ?? '',
    entity_id: row.entity_id ?? null,
    meta: row.meta ?? null,
    created_at: row.created_at,
    hub_users: (() => {
      const u = row.hub_users;
      const resolved = u && (!Array.isArray(u) || u.length > 0)
        ? (Array.isArray(u) ? u[0] : u)
        : null;
      return resolved ?? (row.actor_name ? { full_name: row.actor_name, avatar_url: null } : null);
    })(),
  });

  const updateTaskStatus = async (task: ProjectTask, newStatus: ProjectTask['status']) => {
    if (task.status === newStatus) return;
    // In demo mode just update local state
    if (isDemo) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      return;
    }
    // Blocked needs a reason so the team can see what's stuck; leaving blocked clears it
    const currentMeta = (task as any).meta ?? null;
    let metaPatch: Record<string, unknown> = {};
    if (newStatus === 'blocked') {
      const reason = window.prompt("What's blocking this task? (visible to the team)", currentMeta?.blocked_reason ?? '');
      if (reason === null) return;
      metaPatch = { meta: { ...(currentMeta ?? {}), blocked_reason: reason.trim() } };
    } else if (task.status === 'blocked' && currentMeta?.blocked_reason) {
      const { blocked_reason: _drop, ...rest } = currentMeta;
      metaPatch = { meta: Object.keys(rest).length ? rest : null };
    }
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, ...(metaPatch as any) } : t));
    const { error: updateErr } = await supabase.from('hub_project_tasks').update({ status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null, updated_at: new Date().toISOString(), ...metaPatch }).eq('id', task.id);
    if (updateErr) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status, meta: currentMeta } as any : t));
      console.error('Failed to update task status:', updateErr);
      return;
    }
    await logActivity('task_status_changed', task.title, task.id, { from: task.status, to: newStatus });
    const updaterName = hubUser?.full_name ?? 'Team';
    supabase.functions.invoke('notify-task-updated', {
      body: {
        task_id: task.id,
        project_id: task.project_id,
        task_title: task.title,
        project_name: workspaceRow?.hub_projects?.project_name ?? 'General',
        updated_by_id: hubUser?.id,
        updated_by_name: updaterName,
        change_description: `${updaterName} marked "${task.title}" as ${newStatus.replace('_', ' ')}`,
      },
    }).catch(console.error);
  };

  const cycleTask = async (task: ProjectTask) => {
    const next: Record<string, ProjectTask['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = next[task.status];
    await updateTaskStatus(task, newStatus);
  };

  const completeDashboardTask = async (task: ProjectTask) => {
    const next: Record<string, ProjectTask['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = next[task.status];
    if (newStatus === 'done') {
      const prevStatus = task.status;
      setCompletingTaskIds(prev => { const m = new Map(prev); m.set(task.id, prevStatus); return m; });
      await updateTaskStatus(task, newStatus);
      const timer = setTimeout(() => {
        setCompletingTaskIds(prev => { const m = new Map(prev); m.delete(task.id); return m; });
        setHiddenDoneIds(prev => new Set(prev).add(task.id));
        completingTimers.current.delete(task.id);
      }, 5000);
      completingTimers.current.set(task.id, timer);
    } else {
      setHiddenDoneIds(prev => { const s = new Set(prev); s.delete(task.id); return s; });
      await updateTaskStatus(task, newStatus);
    }
  };

  const undoDashboardTask = async (task: ProjectTask) => {
    const prevStatus = completingTaskIds.get(task.id) as ProjectTask['status'] | undefined;
    const timer = completingTimers.current.get(task.id);
    if (timer) { clearTimeout(timer); completingTimers.current.delete(task.id); }
    setCompletingTaskIds(prev => { const m = new Map(prev); m.delete(task.id); return m; });
    setHiddenDoneIds(prev => { const s = new Set(prev); s.delete(task.id); return s; });
    await updateTaskStatus(task, prevStatus ?? 'todo');
  };

  const openAddTask = () => {
    setEditingTask(null);
    setDetailPanelOpen(true);
  };

  const openViewTask = (task: ProjectTask) => {
    setEditingTask(task);
    setDetailPanelOpen(true);
  };

  const deleteTask = async (taskId: number) => {
    setDeletingTaskId(taskId);
    const t = tasks.find(t => t.id === taskId);
    // Soft delete — restorable from the admin workspace trash for 30 days
    const { error } = await supabase.from('hub_project_tasks').update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', taskId);
    if (error) {
      console.error('Failed to delete project task', error);
      setDeletingTaskId(null);
      return;
    }
    if (t) await logActivity('task_deleted', t.title, t.id);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDeletingTaskId(null);
  };

  // Live timestamp ticker — updates every 30s
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch comment counts for all workspace tasks
  useEffect(() => {
    const projectId = workspaceRow?.hub_projects?.id;
    if (!projectId) { setTaskCommentCounts({}); return; }
    const ids = tasks.filter(t => t.project_id === projectId).map(t => t.id);
    if (!ids.length) { setTaskCommentCounts({}); return; }
    supabase
      .from('hub_project_task_comments')
      .select('task_id')
      .in('task_id', ids)
      .then(({ data }) => {
        const counts: Record<number, number> = {};
        for (const row of data ?? []) counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
        setTaskCommentCounts(counts);
      });
  }, [tasks.length, workspaceRow?.hub_projects?.id]);

  // Realtime: update comment counts instantly
  useEffect(() => {
    const projectId = workspaceRow?.hub_projects?.id;
    if (!projectId || isDemo) return;
    const channel = supabase.channel(`contractor-comments-${projectId}`)
      .on('postgres_changes' as any, {
        event: 'INSERT', schema: 'public', table: 'hub_project_task_comments',
      }, (payload: any) => {
        const taskId = payload.new?.task_id;
        if (taskId) setTaskCommentCounts(prev => ({ ...prev, [taskId]: (prev[taskId] ?? 0) + 1 }));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceRow?.hub_projects?.id, isDemo]);

  const refreshWorkspaceActivity = useCallback(async () => {
    const projectId = workspaceRow?.hub_projects?.id;
    if (!projectId) { setActivityLog([]); return; }
    const projectTaskIds = tasks.filter((task) => task.project_id === projectId).map((task) => task.id);
    const { data: projectActivityRows } = await supabase
      .from('hub_project_activity')
      .select('*, hub_users(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20);

    const taskTitleMap = Object.fromEntries(
      tasks.filter((task) => task.project_id === projectId).map((task) => [task.id, task.title])
    );

    if (!projectTaskIds.length) {
      setActivityLog(((projectActivityRows ?? []) as any[]).map(normalizeActivityItem));
      return;
    }

    const { data: taskActivityRows } = await supabase
      .from('hub_project_task_activity')
      .select('id, task_id, actor_name, type, description, created_at')
      .in('task_id', projectTaskIds)
      .order('created_at', { ascending: false })
      .limit(20);

    const mergedRows = [
      ...((projectActivityRows ?? []) as any[]),
      ...((taskActivityRows ?? []).map((row: any) => ({
        id: 9_000_000_000 + row.id, // offset avoids key collisions with project-activity ids
        action: normalizeTaskActivityAction(row.type),
        entity_title: taskTitleMap[row.task_id] ?? '',
        entity_id: row.task_id ?? null,
        meta: row.type === 'status_change' ? { to: row.description.split(' to ').pop()?.replace(/ /g, '_') } : null,
        created_at: row.created_at,
        hub_users: row.actor_name ? { full_name: row.actor_name, avatar_url: null } : null,
      })) as any[]),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    setActivityLog(mergedRows.map(normalizeActivityItem));
  }, [workspaceRow?.hub_projects?.id, tasks]);

  // Fetch activity log when workspace opens
  useEffect(() => {
    refreshWorkspaceActivity();
  }, [refreshWorkspaceActivity]);

  const logActivity = async (
    action: string,
    entityTitle: string,
    entityId?: number,
    meta?: Record<string, unknown>
  ) => {
    if (!hubUser || !workspaceRow?.hub_projects?.id) return;
    const actionLabels: Record<string, string> = {
      task_created: `created task "${entityTitle}"`,
      task_updated: `updated task "${entityTitle}"`,
      task_status_changed: `moved "${entityTitle}" to ${(meta?.to as string)?.replace('_',' ') ?? ''}`,
      task_deleted: `deleted task "${entityTitle}"`,
      comment_added: `commented on "${entityTitle}"`,
      task_assigned: `assigned "${entityTitle}"`,
      attachment_added: `added attachment to "${entityTitle}"`,
    };
    const legacyDescription = actionLabels[action] ?? `${action} "${entityTitle}"`;
    const newPayload = {
      project_id: workspaceRow.hub_projects.id,
      user_id: hubUser.id,
      action,
      entity_type: 'task',
      entity_id: entityId ?? null,
      entity_title: entityTitle,
      meta: meta ? { ...meta, message: legacyDescription } : { message: legacyDescription },
    };

    let insertResult = await supabase
      .from('hub_project_activity')
      .insert(newPayload)
      .select('*, hub_users(full_name, avatar_url)')
      .single();

    if (insertResult.error) {
      const fallbackPayload = {
        project_id: workspaceRow.hub_projects.id,
        actor_id: hubUser.id,
        actor_name: hubUser.full_name ?? 'Team',
        description: legacyDescription,
      };
      insertResult = await supabase
        .from('hub_project_activity')
        .insert(fallbackPayload)
        .select('id, actor_name, description, created_at')
        .single();
    }

    if (insertResult.error) {
      console.error('Failed to log project activity', insertResult.error);
      return;
    }

    if (insertResult.data) {
      setActivityLog(prev => [normalizeActivityItem(insertResult.data), ...prev].slice(0, 20));
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wsSearchRef.current && !wsSearchRef.current.contains(e.target as Node)) {
        setWsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!hubUser) return;

    // Demo mode — use static demo data
    if (isDemo) {
      setRows(DEMO_CONTRACTOR_PROJECTS as any);
      setTasks(DEMO_CONTRACTOR_TASKS as any);
      setTeamMap(DEMO_CONTRACTOR_TEAM as any);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // 1. contractor's assignments + project_ids in one query
        const { data: pcData, error: pcErr } = await supabase
          .from('hub_project_contractors')
          .select('id, project_id, percentage, payout_type, fixed_amount, payout_status, paid_at, exclude_from_payout')
          .eq('contractor_id', hubUser.id);
        if (pcErr) throw pcErr;
        if (!pcData?.length) { setLoading(false); return; }

        const projectIds = [...new Set(pcData.map((r: any) => r.project_id as number))];
        const pcIds = pcData.map((r: any) => r.id as number);

        // 2. fetch everything in parallel — no nested joins
        const [
          { data: projectsData },
          { data: payoutsData },
          { data: paymentsData },
          { data: costsData },
        ] = await Promise.all([
          supabase.from('hub_projects').select('id, project_type, client_name, project_name, service, contract_price, status, start_date, deadline, notes, drive_url, slug, monthly_deliverables, archived_at').in('id', projectIds),
          supabase.from('hub_project_contractor_payouts').select('id, amount, paid_at, notes, receipt_url, project_contractor_id').in('project_contractor_id', pcIds),
          supabase.from('hub_project_payments').select('amount, project_id').in('project_id', projectIds),
          supabase.from('hub_project_costs').select('amount, project_id').in('project_id', projectIds),
        ]);

        const projectMap = Object.fromEntries((projectsData ?? []).map((p: any) => [p.id, p]));
        const payoutsByPc: Record<number, any[]> = {};
        for (const p of (payoutsData ?? [])) (payoutsByPc[p.project_contractor_id] ??= []).push(p);
        const paymentsByProject: Record<number, { amount: number }[]> = {};
        for (const p of (paymentsData ?? [])) (paymentsByProject[p.project_id] ??= []).push({ amount: p.amount });
        const costsByProject: Record<number, { amount: number }[]> = {};
        for (const c of (costsData ?? [])) (costsByProject[c.project_id] ??= []).push({ amount: c.amount });

        const normalized: ProjectRow[] = pcData.map((pc: any) => {
          const project = projectMap[pc.project_id];
          if (!project) return null;
          return {
            id: pc.id,
            percentage: pc.percentage,
            payout_type: pc.payout_type,
            fixed_amount: pc.fixed_amount,
            payout_status: pc.payout_status,
            paid_at: pc.paid_at,
            exclude_from_payout: !!pc.exclude_from_payout,
            hub_project_contractor_payouts: payoutsByPc[pc.id] ?? [],
            hub_projects: {
              ...project,
              hub_project_payments: paymentsByProject[pc.project_id] ?? [],
              hub_project_costs: costsByProject[pc.project_id] ?? [],
            },
          };
        }).filter(Boolean) as ProjectRow[];

        setRows(normalized);

        // 3. tasks + team
        const [{ data: taskData }, { data: pcTeamData }] = await Promise.all([
          supabase.from('hub_project_tasks').select('id, project_id, title, description, status, priority, due_date, start_date, assigned_to, assignee_ids, checklist, color, meta, archived, archived_at, completed_at, deleted_at').in('project_id', projectIds).order('due_date', { ascending: true, nullsFirst: false }),
          supabase.from('hub_project_contractors').select('project_id, contractor_id').in('project_id', projectIds),
        ]);
        setTasks((taskData as ProjectTask[]) ?? []);

        const allUserIds = [...new Set((pcTeamData ?? []).map((r: any) => r.contractor_id as string))];
        if (allUserIds.length > 0) {
          const { data: usersData } = await supabase.from('hub_users').select('id, full_name, avatar_url').in('id', allUserIds);
          const usersById = Object.fromEntries((usersData ?? []).map((u: any) => [u.id, u]));
          const map: Record<number, TeamMember[]> = {};
          for (const r of (pcTeamData ?? []) as any[]) {
            const u = usersById[r.contractor_id];
            if (u) (map[r.project_id] ??= []).push(u);
          }
          setTeamMap(map);
        }

        // Fetch retainer clients + international assignments
        const [{ data: pcRetainers }, { data: assignData }] = await Promise.all([
          supabase.from('hub_project_contractors')
            .select('id, hub_project_contractor_payouts(amount), hub_projects(id, client_name, project_name, service, status, project_type, monthly_rate, archived_at)')
            .eq('contractor_id', hubUser.id),
          supabase.from('hub_client_assignments')
            .select('id, role, hub_clients(id, client_name, platform, status, notes)')
            .eq('contractor_id', hubUser.id),
        ]);

        const retainerEntries = (pcRetainers ?? [])
          .filter((r: any) => { const p = Array.isArray(r.hub_projects) ? r.hub_projects[0] : r.hub_projects; return p?.project_type === 'retainer' && !p?.archived_at && p?.status !== 'cancelled'; })
          .map((r: any) => {
            const p = Array.isArray(r.hub_projects) ? r.hub_projects[0] : r.hub_projects;
            const totalPaid = (r.hub_project_contractor_payouts ?? []).reduce((s: number, x: any) => s + x.amount, 0);
            const monthlyRate = p?.monthly_rate ?? 0;
            return { id: `retainer-${r.id}`, rowId: r.id as number, name: p?.project_name ?? p?.client_name ?? 'Retainer', type: 'retainer' as const, status: p?.status ?? 'ongoing', service: p?.service, monthly_rate: monthlyRate, months_paid: monthlyRate > 0 ? Math.round(totalPaid / monthlyRate) : 0 };
          });

        const seenClientIds = new Set<number>();
        const seenKeys = new Set<string>();
        const seenRetainerNames = new Set(retainerEntries.map(r => r.name.toLowerCase()));
        const assignmentEntries = (assignData ?? [])
          .map((a: any) => {
            const cl = Array.isArray(a.hub_clients) ? a.hub_clients[0] : a.hub_clients;
            return { id: `assign-${a.id}`, clientId: cl?.id as number | undefined, name: cl?.client_name ?? '', type: 'assignment' as const, status: cl?.status ?? 'active', platform: cl?.platform, role: a.role, notes: cl?.notes };
          })
          .filter(e => {
            if (!e.name) return false; // drop entries with no client data
            if (e.clientId) {
              if (seenClientIds.has(e.clientId)) return false;
              seenClientIds.add(e.clientId);
            } else {
              const key = `${e.name.toLowerCase()}|${(e.role ?? '').toLowerCase()}`;
              if (seenKeys.has(key)) return false;
              seenKeys.add(key);
            }
            if (seenRetainerNames.has(e.name.toLowerCase())) return false;
            return true;
          });
        setClientEntries([...retainerEntries, ...assignmentEntries]);
      } catch (err) {
        console.error('Projects load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [hubUser, projectRefreshKey]);

  // Realtime: keep tasks in sync across all of this employee's projects
  useEffect(() => {
    if (!hubUser?.id || isDemo || rows.length === 0) return;
    const projectIds = [...new Set(rows.map(r => r.hub_projects?.id).filter(Boolean))];
    if (projectIds.length === 0) return;
    const channel = supabase
      .channel(`contractor-tasks-${hubUser.id}`)
      .on('postgres_changes' as any, {
        event: '*', schema: 'public', table: 'hub_project_tasks',
        filter: `project_id=in.(${projectIds.join(',')})`,
      }, (payload: any) => {
        if (payload.eventType === 'DELETE') {
          const oldId = payload.old?.id;
          if (oldId) setTasks(prev => prev.filter(t => t.id !== oldId));
          return;
        }
        const row = payload.new as ProjectTask | undefined;
        if (!row?.id) return;
        setTasks(prev => prev.some(t => t.id === row.id)
          ? prev.map(t => t.id === row.id ? { ...t, ...row } : t)
          : [...prev, row]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hubUser?.id, isDemo, rows]);

  // Realtime: re-fetch when admin assigns or removes this contractor from a project
  useEffect(() => {
    if (!hubUser?.id || isDemo) return;
    const channel = supabase
      .channel(`contractor-assignments-${hubUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'hub_project_contractors',
        filter: `contractor_id=eq.${hubUser.id}`,
      }, () => setProjectRefreshKey(k => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hubUser?.id, isDemo]);

  // Deep link: ?workspace=PROJECT_ID&task=TASK_ID
  useEffect(() => {
    if (loading) return;
    const workspaceParam = searchParams.get('workspace');
    const taskParam = searchParams.get('task');
    if (!workspaceParam) { deepLinkDone.current = null; deepLinkTaskDone.current = null; return; }
    // location.key changes on every navigation, so re-clicking the same
    // notification re-opens the task instead of hitting the done-guard.
    const paramKey = `${location.key}:${workspaceParam}:${taskParam}`;
    const projectId = Number(workspaceParam);
    if (deepLinkDone.current !== paramKey) {
      const row = rows.find(r => r.hub_projects?.id === projectId);
      if (!row) return; // rows still loading/refreshing — retry when they change
      deepLinkDone.current = paramKey;
      setWorkspaceRow(row);
      setTaskFilter('all');
      setTaskSearch('');
      setWsSearch('');
      setWsSearchOpen(false);
      setWsFocusSection('ws-tasks');
    }
    if (taskParam && deepLinkTaskDone.current !== paramKey) {
      const task = tasks.find(t => t.id === Number(taskParam));
      if (!task) return; // tasks can lag behind rows — retry when they change
      deepLinkTaskDone.current = paramKey;
      openViewTask(task);
    }
  }, [loading, rows, tasks, searchParams, location.key]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingEmoji = hour < 6 ? '🌙' : hour < 12 ? '☀️' : hour < 17 ? '🌤️' : hour < 20 ? '🌇' : '🌙';
  const greetingGradient = hour < 6
    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'   // night — indigo-violet
    : hour < 10
    ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'   // early morning — amber-rose
    : hour < 12
    ? 'linear-gradient(135deg, #f97316 0%, #eab308 100%)'   // morning — orange-yellow
    : hour < 15
    ? 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)'   // afternoon — sky-indigo
    : hour < 18
    ? 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)'   // late afternoon — emerald-sky
    : hour < 20
    ? 'linear-gradient(135deg, #f97316 0%, #8b5cf6 100%)'   // evening — orange-violet
    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';  // night — indigo-violet
  const today = localToday();
  const firstName = hubUser?.full_name?.split(' ')[0] ?? '';

  // "Mine" = assigned to me, or containing an open checklist item assigned to me
  const myUserId = hubUser?.id ?? '';
  const hasMyChecklistItem = (t: ProjectTask) => (t.checklist ?? []).some(i => i.assignee_id === myUserId && !i.done);
  const myTasks = tasks.filter(t => !t.archived_at && !t.deleted_at && (getTaskAssigneeIds(t).includes(myUserId) || hasMyChecklistItem(t)));
  const doneTasks = myTasks.filter(t => t.status === 'done');
  const inProgressTasks = myTasks.filter(t => ['in_progress', 'in_review', 'blocked'].includes(t.status));
  const todoTasks = myTasks.filter(t => t.status === 'todo');
  const overdueTasks = myTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done');
  const todayDueTasks = myTasks.filter(t => t.due_date === today && t.status !== 'done');
  const pct = myTasks.length > 0 ? Math.round((doneTasks.length / myTasks.length) * 100) : 0;

  const sortedMyTasks = [
    ...myTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done'),
    ...myTasks.filter(t => t.status === 'in_progress' && !(t.due_date && t.due_date < today)),
    ...myTasks.filter(t => t.status === 'in_review' && !(t.due_date && t.due_date < today)),
    ...myTasks.filter(t => t.status === 'blocked' && !(t.due_date && t.due_date < today)),
    ...myTasks.filter(t => t.status === 'todo' && !(t.due_date && t.due_date < today)),
    ...myTasks.filter(t => t.status === 'done' && completingTaskIds.has(t.id)),

  ];

  const featuredTasks = todayDueTasks.length > 0 ? todayDueTasks
    : overdueTasks.length > 0 ? overdueTasks
    : inProgressTasks.length > 0 ? inProgressTasks
    : todoTasks.slice(0, 6);

  const subline = todayDueTasks.length > 0
    ? `${todayDueTasks.length} task${todayDueTasks.length > 1 ? 's' : ''} due today`
    : overdueTasks.length > 0
    ? `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`
    : doneTasks.length === myTasks.length && myTasks.length > 0
    ? "You're all caught up 🎉"
    : myTasks.length > 0
    ? `${myTasks.length} task${myTasks.length !== 1 ? 's' : ''} assigned to you`
    : `No tasks assigned to you yet`;

  const getProjectName = (projectId: number) =>
    rows.find(r => r.hub_projects?.id === projectId)?.hub_projects?.project_name ?? '';

  const openTaskFromDashboard = (task: ProjectTask) => {
    const row = rows.find(r => r.hub_projects?.id === task.project_id);
    if (!row) return;
    setWorkspaceRow(row);
    setTaskFilter('all');
    setTaskSearch('');
    setWsSearch('');
    setWsSearchOpen(false);
    setWsFocusSection('ws-tasks');
    openViewTask(task);
  };

  const searchLower = search.toLowerCase();
  // My Work = one-time + internal only (retainers live in My Clients)
  // Archived projects are hidden from employees (admins reopen them from the Archived tab)
  const workRows = rows.filter(r => r.hub_projects?.project_type !== 'retainer' && !r.hub_projects?.archived_at && r.hub_projects?.status !== 'cancelled');
  const filteredRows = search
    ? workRows.filter(r => {
        const p = r.hub_projects;
        return p?.project_name?.toLowerCase().includes(searchLower)
          || p?.client_name?.toLowerCase().includes(searchLower)
          || p?.service?.toLowerCase().includes(searchLower);
      })
    : workRows;
  const sortedRows = [...filteredRows].sort((a, b) => {
    const p1 = a.hub_projects, p2 = b.hub_projects;
    const today2 = localToday();
    const urgency = (p: typeof p1) => {
      if (!p) return 5;
      const overdue = p.deadline && p.deadline < today2 && p.status !== 'completed';
      if (overdue) return 0;
      if (p.status === 'ongoing' && p.deadline) {
        const d = Math.ceil((new Date(p.deadline + 'T00:00:00').getTime() - Date.now()) / 86400000);
        if (d <= 7) return 1;
      }
      if (p.status === 'ongoing') return 2;
      if (p.status === 'paused') return 3;
      if (p.status === 'completed') return 4;
      return 5;
    };
    return urgency(p1) - urgency(p2);
  });
  const active = sortedRows.filter(r => r.hub_projects?.status === 'ongoing');
  const other = sortedRows.filter(r => r.hub_projects?.status !== 'ongoing');

  const wsRow = workspaceRow;
  const wsProject = wsRow?.hub_projects;
  const wsIsInternal = wsProject?.project_type === 'internal';
  const wsAllTasks = wsRow ? tasks.filter(t => t.project_id === wsProject?.id && !t.deleted_at) : [];
  const wsTasks = wsAllTasks.filter(t => !t.archived);
  const wsArchivedTasks = wsAllTasks.filter(t => !!t.archived);
  const wsToday = localToday();
  const wsIsOverdue = (t: ProjectTask) => t.due_date && t.due_date < wsToday && t.status !== 'done';
  // wsTeam must be declared before wsFiltered — wsFiltered references wsTeam
  const [wsTeamDirect, setWsTeamDirect] = useState<TeamMember[]>([]);
  useEffect(() => {
    if (!wsProject?.id) { setWsTeamDirect([]); setWsQuestionnaires([]); return; }
    supabase.from('hub_questionnaires')
      .select('id, service_type, submitted_at, questions, answers')
      .eq('project_id', wsProject.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .then(({ data }) => setWsQuestionnaires((data as any[]) ?? []));
  }, [wsProject?.id]);
  useEffect(() => {
    if (!wsProject?.id) { setWsTeamDirect([]); return; }
    let cancelled = false;
    // Use SECURITY DEFINER RPC to bypass RLS on hub_project_contractors.
    // Always set (even to []) so the previous project's team can't linger,
    // and ignore stale responses after switching projects.
    supabase.rpc('get_project_team', { p_project_id: wsProject.id })
      .then(({ data }) => {
        if (cancelled) return;
        setWsTeamDirect(((data as any[]) ?? []).map(u => ({ id: u.id, full_name: u.full_name, avatar_url: u.avatar_url ?? null })));
      });
    return () => { cancelled = true; };
  }, [wsProject?.id]);
  const wsTeam = wsTeamDirect.length > 0 ? wsTeamDirect : (wsRow ? (teamMap[wsProject?.id ?? 0] ?? []) : []);
  const getWorkspaceTaskAssignees = (task: ProjectTask) =>
    getTaskAssigneeIds(task)
      .map((assigneeId) => wsTeam.find((member) => member.id === assigneeId))
      .filter(Boolean);
  const wsFiltered = wsTasks.filter(t => {
    if (taskFilter !== 'all' && taskFilter !== 'overdue' && t.status !== taskFilter) return false;
    if (taskFilter === 'overdue' && !wsIsOverdue(t)) return false;
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      const assigneeNames = getWorkspaceTaskAssignees(t).map((member: any) => member.full_name).join(' ');
      return t.title.toLowerCase().includes(q)
        || (t.description ?? '').toLowerCase().includes(q)
        || assigneeNames.toLowerCase().includes(q);
    }
    return true;
  });
  const wsDone = wsTasks.filter(t => t.status === 'done').length;
  const wsPct = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
  const wsStatusIcon: Record<string, { icon: string; cls: string }> = {
    todo: { icon: 'ri-checkbox-blank-circle-line', cls: 'text-gray-300 hover:text-gray-500' },
    in_progress: { icon: 'ri-loader-2-line', cls: 'text-sky-400 hover:text-sky-600' },
    in_review: { icon: 'ri-eye-line', cls: 'text-purple-400 hover:text-purple-600' },
    blocked: { icon: 'ri-indeterminate-circle-line', cls: 'text-rose-400 hover:text-rose-600' },
    done: { icon: 'ri-checkbox-circle-fill', cls: 'text-emerald-500' },
  };
  const BOARD_COLUMNS: { key: ProjectTask['status']; label: string; icon: string; chip: string; empty: string }[] = [
    { key: 'todo', label: 'To Do', icon: 'ri-checkbox-blank-circle-line', chip: 'bg-gray-100 text-gray-600', empty: 'Nothing queued' },
    { key: 'in_progress', label: 'In Progress', icon: 'ri-loader-2-line', chip: 'bg-sky-100 text-sky-700', empty: 'Nothing in motion' },
    { key: 'in_review', label: 'In Review', icon: 'ri-eye-line', chip: 'bg-purple-100 text-purple-700', empty: 'Nothing to review' },
    { key: 'blocked', label: 'Blocked', icon: 'ri-indeterminate-circle-line', chip: 'bg-rose-100 text-rose-700', empty: 'No blocked work' },
    { key: 'done', label: 'Done', icon: 'ri-checkbox-circle-fill', chip: 'bg-emerald-100 text-emerald-700', empty: 'Nothing completed yet' },
  ];

  const WS_SECTIONS = wsProject ? [
    { label: 'Timeline', description: `${wsProject.project_name} · Gantt chart`, icon: 'ri-bar-chart-grouped-line', id: 'ws-timeline', iconCls: 'bg-indigo-50 text-indigo-500', keywords: ['timeline', 'gantt', 'schedule', 'chart', 'dates', 'calendar', 'deadline'] },
    { label: 'Tasks', description: `${wsProject.project_name} · Task list`, icon: 'ri-task-line', id: 'ws-tasks', iconCls: 'bg-sky-50 text-sky-500', keywords: ['tasks', 'list', 'todo', 'work', 'items', 'progress', 'backlog'] },
    { label: 'Overview', description: `${wsProject.project_name} · Stats & progress`, icon: 'ri-bar-chart-2-line', id: 'ws-stats', iconCls: 'bg-emerald-50 text-emerald-500', keywords: ['stats', 'overview', 'total', 'count', 'numbers', 'summary', 'progress'] },
    { label: 'Notes & Dates', description: `${wsProject.project_name} · Start & deadline`, icon: 'ri-sticky-note-line', id: 'ws-sidebar', iconCls: 'bg-amber-50 text-amber-500', keywords: ['notes', 'brief', 'description', 'info', 'details', 'start', 'due', 'date', 'deadline'] },
  ].concat(wsProject.project_type === 'internal' ? [] : [
    { label: 'Payout', description: `${wsProject.project_name} · Your earnings`, icon: 'ri-money-dollar-circle-line', id: 'ws-sidebar', iconCls: 'bg-orange-50 text-[#FF6B35]', keywords: ['payout', 'payment', 'earnings', 'salary', 'money', 'fee', 'income', 'receive'] },
  ]).concat(wsQuestionnaires.length > 0 ? [
    { label: 'Questionnaires', description: `${wsProject.project_name} · Client answers`, icon: 'ri-questionnaire-line', id: 'ws-sidebar', iconCls: 'bg-violet-50 text-violet-500', keywords: ['questionnaire', 'answers', 'client', 'form', 'brief', 'responses'] },
  ] : []) : [];

  const WS_FILTERS = [
    { label: 'Overdue Tasks', filter: 'overdue' as const, icon: 'ri-alarm-warning-line', cls: 'bg-rose-50 text-rose-500', count: wsTasks.filter(t => !!wsIsOverdue(t)).length, keywords: ['overdue', 'late', 'past due', 'missed'] },
    { label: 'Active Tasks', filter: 'in_progress' as const, icon: 'ri-loader-2-line', cls: 'bg-sky-50 text-sky-500', count: wsTasks.filter(t => t.status === 'in_progress').length, keywords: ['active', 'in progress', 'working', 'ongoing'] },
    { label: 'In Review', filter: 'in_review' as const, icon: 'ri-eye-line', cls: 'bg-purple-50 text-purple-500', count: wsTasks.filter(t => t.status === 'in_review').length, keywords: ['review', 'approval', 'checking', 'qa'] },
    { label: 'Blocked Tasks', filter: 'blocked' as const, icon: 'ri-indeterminate-circle-line', cls: 'bg-rose-50 text-rose-500', count: wsTasks.filter(t => t.status === 'blocked').length, keywords: ['blocked', 'stuck', 'waiting', 'issue'] },
    { label: 'To Do', filter: 'todo' as const, icon: 'ri-checkbox-blank-circle-line', cls: 'bg-gray-100 text-gray-500', count: wsTasks.filter(t => t.status === 'todo').length, keywords: ['todo', 'not started', 'pending', 'backlog', 'queued'] },
    { label: 'Completed Tasks', filter: 'done' as const, icon: 'ri-checkbox-circle-fill', cls: 'bg-emerald-50 text-emerald-500', count: wsTasks.filter(t => t.status === 'done').length, keywords: ['done', 'completed', 'finished', 'complete', 'closed'] },
  ];

  const wsQ = wsSearch.trim().toLowerCase();
  const wsSectionResults = wsQ ? WS_SECTIONS.filter(s =>
    s.label.toLowerCase().includes(wsQ) || s.keywords.some(k => k.includes(wsQ))
  ) : [];
  const wsFilterResults = wsQ ? WS_FILTERS.filter(f =>
    f.label.toLowerCase().includes(wsQ) || f.keywords.some(k => k.includes(wsQ))
  ) : [];
  const wsTaskResults = wsQ ? wsTasks.filter(t =>
    t.title.toLowerCase().includes(wsQ) || (t.description ?? '').toLowerCase().includes(wsQ)
  ).slice(0, 5) : [];

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    const scroll = document.getElementById('ws-scroll');
    if (el && scroll) scroll.scrollTo({ top: el.offsetTop - scroll.offsetTop - 16, behavior: 'smooth' });
  };

  const wsSearchActions = workspaceRow && wsProject ? (
    <div className="relative" ref={wsSearchRef}>
      <div className={`flex items-center gap-2 bg-white/70 backdrop-blur-sm border rounded-xl px-3 py-2 transition-all ${wsSearchOpen ? 'border-indigo-300 ring-2 ring-indigo-100 w-44 sm:w-52' : 'border-gray-200 w-9 sm:w-52'}`}>
        <button onClick={() => setWsSearchOpen(true)} className="flex-shrink-0 cursor-pointer sm:pointer-events-none">
          <i className="ri-search-line text-gray-400 text-sm"></i>
        </button>
        <input
          type="text"
          value={wsSearch}
          onChange={e => { setWsSearch(e.target.value); setWsSearchOpen(true); }}
          onFocus={() => setWsSearchOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setWsSearch(''); setWsSearchOpen(false); }
            if (e.key === 'Enter') {
              if (wsSectionResults[0]) { setWsFocusSection(wsSectionResults[0].id); setWsSearch(''); setWsSearchOpen(false); }
              else if (wsFilterResults[0]) { setTaskFilter(wsFilterResults[0].filter); setWsFocusSection('ws-tasks'); setWsSearch(''); setWsSearchOpen(false); }
            }
          }}
          placeholder="Search…"
          className={`flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-700 min-w-0 ${wsSearchOpen ? 'block' : 'hidden sm:block'}`}
        />
        {wsSearch
          ? <button onClick={() => { setWsSearch(''); setWsSearchOpen(false); }} className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"><i className="ri-close-line text-sm"></i></button>
          : null
        }
      </div>

      {wsSearchOpen && (
        <div className="fixed right-4 top-[82px] w-[min(320px,90vw)] max-h-[60vh] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto z-[200]">
          {/* Empty: show all sections */}
          {!wsQ && (
            <>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold px-4 pt-3 pb-1.5">Focus on a section</p>
              {WS_SECTIONS.map(s => (
                <button key={s.id + s.label}
                  onClick={() => { setWsFocusSection(s.id); setWsSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconCls}`}>
                    <i className={`${s.icon} text-sm`}></i>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-gray-800">{s.label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{s.description}</p>
                  </div>
                  <i className="ri-fullscreen-line text-gray-300 text-xs flex-shrink-0"></i>
                </button>
              ))}
            </>
          )}

          {/* With query */}
          {wsQ && (
            <>
              {/* Sections */}
              {wsSectionResults.length > 0 && (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold px-4 pt-3 pb-1">Sections</p>
                  {wsSectionResults.map(s => (
                    <button key={s.id + s.label}
                      onClick={() => { setWsFocusSection(s.id); setWsSearch(''); setWsSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconCls}`}>
                        <i className={`${s.icon} text-sm`}></i>
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800">{s.label}</p>
                        <p className="text-[11px] text-gray-400 truncate">{s.description}</p>
                      </div>
                      <i className="ri-corner-down-left-line text-gray-300 text-xs flex-shrink-0"></i>
                    </button>
                  ))}
                </>
              )}

              {/* Filters */}
              {wsFilterResults.length > 0 && (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold px-4 pt-3 pb-1 border-t border-gray-50">Filter Tasks</p>
                  {wsFilterResults.map(f => (
                    <button key={f.filter}
                      onClick={() => { setTaskFilter(f.filter); setWsFocusSection('ws-tasks'); setWsSearch(''); setWsSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${f.cls}`}>
                        <i className={`${f.icon} text-sm`}></i>
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800">{f.label}</p>
                        <p className="text-[11px] text-gray-400">{f.count} task{f.count !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Filter</span>
                    </button>
                  ))}
                </>
              )}

              {/* Tasks */}
              {wsTaskResults.length > 0 && (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold px-4 pt-3 pb-1 border-t border-gray-50">Tasks</p>
                  {wsTaskResults.map(t => {
                    const si = wsStatusIcon[t.status];
                    const isOverdue = !!wsIsOverdue(t);
                    return (
                      <button key={t.id}
                        onClick={() => { setTaskSearch(t.title); setTaskFilter('all'); setWsFocusSection('ws-tasks'); setWsSearch(''); setWsSearchOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                        <i className={`${si.icon} text-lg flex-shrink-0 ${t.status === 'done' ? 'text-emerald-500' : t.status === 'in_progress' ? 'text-sky-400' : 'text-gray-300'}`}></i>
                        <div className="min-w-0 flex-1 text-left">
                          <p className={`text-sm font-medium truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                          {t.due_date && <p className={`text-[11px] ${isOverdue ? 'text-rose-400' : 'text-gray-400'}`}>{isOverdue ? 'Overdue · ' : ''}{new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>}
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${{ high: 'bg-rose-400', medium: 'bg-amber-400', low: 'bg-gray-300' }[t.priority]}`}></span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Empty */}
              {wsSectionResults.length === 0 && wsFilterResults.length === 0 && wsTaskResults.length === 0 && (
                <div className="px-4 py-6 text-center">
                  <i className="ri-search-line text-2xl text-gray-200 block mb-2"></i>
                  <p className="text-sm text-gray-400">Nothing found for <span className="font-medium text-gray-600">"{wsSearch}"</span></p>
                </div>
              )}

              <div className="px-4 py-2 border-t border-gray-50">
                <p className="text-[10px] text-gray-300">↵ jump to section · Esc to close</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  ) : undefined;

  // ── Per-task color palette (used in calendar + task cards) ──────────────
  const TASK_PALETTE = [
    { chip: 'bg-violet-100 text-violet-700', bar: '#ddd6fe', barText: '#4c1d95', dot: 'bg-violet-400', border: 'border-l-violet-400', cardBg: 'bg-violet-50/30' },
    { chip: 'bg-sky-100 text-sky-700',       bar: '#bae6fd', barText: '#0c4a6e', dot: 'bg-sky-400',    border: 'border-l-sky-400',    cardBg: 'bg-sky-50/30' },
    { chip: 'bg-emerald-100 text-emerald-700', bar: '#a7f3d0', barText: '#064e3b', dot: 'bg-emerald-400', border: 'border-l-emerald-400', cardBg: 'bg-emerald-50/30' },
    { chip: 'bg-amber-100 text-amber-700',   bar: '#fde68a', barText: '#78350f', dot: 'bg-amber-400',  border: 'border-l-amber-400',  cardBg: 'bg-amber-50/30' },
    { chip: 'bg-pink-100 text-pink-700',     bar: '#fbcfe8', barText: '#831843', dot: 'bg-pink-400',   border: 'border-l-pink-400',   cardBg: 'bg-pink-50/30' },
    { chip: 'bg-orange-100 text-orange-700', bar: '#fed7aa', barText: '#7c2d12', dot: 'bg-orange-400', border: 'border-l-orange-400', cardBg: 'bg-orange-50/30' },
    { chip: 'bg-teal-100 text-teal-700',     bar: '#99f6e4', barText: '#134e4a', dot: 'bg-teal-400',   border: 'border-l-teal-400',   cardBg: 'bg-teal-50/30' },
    { chip: 'bg-indigo-100 text-indigo-700', bar: '#c7d2fe', barText: '#312e81', dot: 'bg-indigo-400', border: 'border-l-indigo-400', cardBg: 'bg-indigo-50/30' },
    { chip: 'bg-rose-100 text-rose-700',     bar: '#fecdd3', barText: '#881337', dot: 'bg-rose-400',   border: 'border-l-rose-400',   cardBg: 'bg-rose-50/30' },
    { chip: 'bg-lime-100 text-lime-700',     bar: '#d9f99d', barText: '#365314', dot: 'bg-lime-400',   border: 'border-l-lime-400',   cardBg: 'bg-lime-50/30' },
  ];
  const taskColorMap = Object.fromEntries(wsTasks.map((t, i) => [t.id, TASK_PALETTE[i % TASK_PALETTE.length]]));

  const TaskCard = (task: ProjectTask) => {
    const overdue = !!wsIsOverdue(task);
    const si = wsStatusIcon[task.status];
    const color = taskColorMap[task.id] ?? TASK_PALETTE[0];
    const assignees = getWorkspaceTaskAssignees(task);
    const commentCount = taskCommentCounts[task.id] ?? 0;
    const daysLeft = task.due_date
      ? Math.ceil((new Date(task.due_date + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000)
      : null;
    const priorityCfg = PRIORITY_CFG[task.priority];
    return (
      <div key={task.id} onClick={() => openViewTask(task)}
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 sm:p-3.5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group border-l-4 ${task.color ? '' : color.border}`}
        style={task.color ? { borderLeftColor: task.color } : undefined}>
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <button onClick={e => { e.stopPropagation(); cycleTask(task); }} className={`flex-shrink-0 cursor-pointer mt-0.5 ${si.cls}`}>
            <i className={`${si.icon} text-lg`}></i>
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug line-clamp-1 sm:line-clamp-none ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
            {task.description && <p className="text-xs text-gray-400 mt-0.5 hidden sm:line-clamp-1">{getTaskDescriptionPreview(task.description)}</p>}
            {task.status === 'blocked' && task.meta?.blocked_reason && <p className="text-[11px] text-rose-600 mt-1 line-clamp-1"><i className="ri-indeterminate-circle-line mr-0.5"></i> Blocked: {task.meta.blocked_reason}</p>}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 hidden sm:inline ${priorityCfg.cls}`}>{priorityCfg.label}</span>
        </div>
        {/* Bottom row */}
        <div className="flex items-center gap-2 mt-1.5 pt-0 border-t-0 pl-[26px] sm:pl-0 sm:mt-3 sm:pt-2.5 sm:border-t border-gray-50">
          {task.due_date && (
            <div className="flex items-center gap-1">
              <i className="ri-calendar-line text-[10px] text-gray-400"></i>
              {task.start_date && task.start_date !== task.due_date ? (
                <span className="text-[10px] text-gray-500">
                  {new Date(task.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              ) : (
                <span className={`text-[10px] font-medium ${overdue ? 'text-rose-600' : daysLeft === 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {overdue ? `Overdue ${Math.abs(daysLeft!)}d` : daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Tomorrow' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            {commentCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-semibold">
                <i className="ri-chat-3-fill text-[11px]"></i>{commentCount}
              </span>
            )}
            {assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {assignees.slice(0, 3).map((assignee: any) => (
                    assignee.avatar_url
                      ? <img key={assignee.id} src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full border border-white object-cover object-top" />
                      : <div key={assignee.id} className="w-5 h-5 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                  ))}
                </div>
                <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">{assignees.length === 1 ? assignees[0].full_name.split(' ')[0] : `${assignees.length} assignees`}</span>
              </div>
            )}

            <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete?')) deleteTask(task.id); }}
              disabled={deletingTaskId === task.id}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-rose-500 cursor-pointer transition-all disabled:opacity-40">
              <i className="ri-delete-bin-line text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const boardTasks = wsTasks.filter((task) => {
    if (!taskSearch) return true;
    const q = taskSearch.toLowerCase();
    const assigneeNames = getWorkspaceTaskAssignees(task).map((member: any) => member.full_name).join(' ');
    return task.title.toLowerCase().includes(q)
      || (task.description ?? '').toLowerCase().includes(q)
      || assigneeNames.toLowerCase().includes(q);
  });

  const BoardCard = (task: ProjectTask) => {
    const overdue = !!wsIsOverdue(task);
    const color = taskColorMap[task.id] ?? TASK_PALETTE[0];
    const assignees = getWorkspaceTaskAssignees(task);
    const commentCount = taskCommentCounts[task.id] ?? 0;
    const priorityCfg = PRIORITY_CFG[task.priority];
    return (
      <button
        key={task.id}
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/task-id', String(task.id));
          setDraggedTaskId(task.id);
        }}
        onDragEnd={() => { setDraggedTaskId(null); setBoardDragOver(null); }}
        onClick={() => openViewTask(task)}
        className={`w-full text-left rounded-2xl border border-gray-100 border-l-4 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-md cursor-pointer ${task.color ? '' : color.border} ${draggedTaskId === task.id ? 'opacity-60' : ''}`}
        style={task.color ? { borderLeftColor: task.color } : undefined}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className={`flex-1 text-sm font-semibold leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityCfg.cls}`}>{priorityCfg.label}</span>
            </div>
            {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{getTaskDescriptionPreview(task.description)}</p>}
            {task.status === 'blocked' && task.meta?.blocked_reason && <p className="text-[11px] text-rose-600 mt-1 line-clamp-1"><i className="ri-indeterminate-circle-line mr-0.5"></i> Blocked: {task.meta.blocked_reason}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
          {task.due_date && (
            <span className={`text-[10px] font-medium ${overdue ? 'text-rose-600' : 'text-gray-500'}`}>
              {overdue ? 'Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {commentCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-semibold">
                <i className="ri-chat-3-fill text-[11px]"></i>{commentCount}
              </span>
            )}
            {assignees.length > 0 && (
              <div className="flex items-center -space-x-1">
                {assignees.slice(0, 3).map((assignee: any) => (
                  assignee.avatar_url
                    ? <img key={assignee.id} src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full border border-white object-cover object-top" />
                    : <div key={assignee.id} className="w-5 h-5 rounded-full border border-white bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                ))}
                {assignees.length > 3 && <span className="ml-1 text-[10px] text-gray-400 font-medium">+{assignees.length - 3}</span>}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <ContractorLayout
      title={workspaceRow ? undefined : 'My Work'}
      hideGlobalSearch={!!workspaceRow}
      actions={wsSearchActions}
      titleContent={workspaceRow && wsProject ? (
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => { setWorkspaceRow(null); setTaskFilter('all'); setTaskSearch(''); setWsSearch(''); setWsSearchOpen(false); setWsFocusSection(null); deepLinkDone.current = null; deepLinkTaskDone.current = null; setSearchParams(new URLSearchParams(), { replace: true }); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all shadow-sm flex-shrink-0">
            <i className="ri-arrow-left-s-line text-base"></i>
          </button>
          <p className="text-sm font-bold text-gray-900 truncate leading-tight min-w-0 flex-1">{wsProject.project_name}</p>
          <button
            onClick={() => {
              const slug = wsProject.slug || slugify(wsProject.client_name);
              const url = `https://hunacreatives.com/hub/contractor/project/${slug}`;
              try {
                navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }).catch(() => {
                  const el = document.createElement('textarea');
                  el.value = url;
                  document.body.appendChild(el);
                  el.select();
                  document.execCommand('copy');
                  document.body.removeChild(el);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                });
              } catch {
                const el = document.createElement('textarea');
                el.value = url;
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }
            }}
            title={linkCopied ? 'Copied!' : 'Copy project link'}
            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl border cursor-pointer transition-all shadow-sm flex-shrink-0 text-xs font-medium ${linkCopied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200'}`}>
            <i className={`text-base ${linkCopied ? 'ri-check-line' : 'ri-link'}`}></i>
            <span className="hidden sm:inline">{linkCopied ? 'Copied!' : 'Copy link'}</span>
          </button>
        </div>
      ) : clientWorkspace ? (
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setClientWorkspace(null)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all shadow-sm flex-shrink-0">
            <i className="ri-arrow-left-s-line text-base"></i>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{clientWorkspace.name}</p>
            <p className="text-xs text-gray-400 truncate">{clientWorkspace.platform ?? clientWorkspace.role ?? 'International Client'}</p>
          </div>
        </div>
      ) : undefined}
    >
      {/* ── International Client Workspace ── */}
      {clientWorkspace && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <i className="ri-building-line text-[#FF6B35] text-lg"></i>
              </div>
              <div>
                <p className="font-bold text-gray-900">{clientWorkspace.name}</p>
                <p className="text-xs text-gray-400">{clientWorkspace.platform ?? clientWorkspace.role ?? 'International Client'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {clientWorkspace.role && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Role</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{clientWorkspace.role}</p>
                </div>
              )}
              {clientWorkspace.platform && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Platform</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5">{clientWorkspace.platform}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Status</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 capitalize">{clientWorkspace.status}</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <p className="text-[10px] text-orange-400 uppercase tracking-wide">Type</p>
                <p className="text-sm font-semibold text-orange-600 mt-0.5">International</p>
              </div>
            </div>
            {clientWorkspace.notes && (
              <p className="text-xs text-gray-500 italic mt-3 pt-3 border-t border-gray-100">{clientWorkspace.notes}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Workspace ── */}
      {!clientWorkspace && workspaceRow && wsProject && (
        <div className="flex flex-col -mx-4 -my-4 md:-mx-6 md:-my-6 min-h-full">

          {/* ── Hero banner ── */}
          {(() => {
            const statusColors = PROJECT_STATUS_COLORS;
            const statusLabels: Record<string, string> = { ongoing: 'Active', completed: 'Completed', paused: 'Paused', cancelled: 'Archived' };
            const daysLeft = wsProject.deadline ? Math.ceil((new Date(wsProject.deadline + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000) : null;
            const isDeadlineOver = daysLeft !== null && daysLeft < 0 && wsProject.status !== 'completed';
            const folderIdMatch = wsProject.drive_url?.match(/folders\/([a-zA-Z0-9_-]+)/);
            const folderId = folderIdMatch?.[1];
            const embedUrl = folderId
              ? `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`
              : null;
            return (
              <div className="px-5 md:px-6 pt-3 pb-2 flex-shrink-0">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm px-4 py-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
                    <div className="min-w-0 lg:max-w-[280px] lg:flex-shrink-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${statusColors[wsProject.status] ?? statusColors.ongoing}`}>
                          {statusLabels[wsProject.status] ?? wsProject.status}
                        </span>
                        {wsIsInternal && <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Internal</span>}
                        {wsProject.service && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{wsProject.service}</span>}
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">{wsProject.project_name}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{wsIsInternal ? 'Internal Project' : wsProject.client_name}</p>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {wsTeam.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <div className="flex -space-x-1.5">
                              {wsTeam.slice(0, 5).map(m => (
                                m.avatar_url
                                  ? <img key={m.id} src={m.avatar_url} alt={m.full_name} title={m.full_name} className="w-5 h-5 rounded-full border-2 border-white object-cover object-top shadow-sm" />
                                  : <div key={m.id} title={m.full_name} className="w-5 h-5 rounded-full border-2 border-white bg-indigo-400 flex items-center justify-center text-[8px] font-bold text-white shadow-sm">{m.full_name[0]}</div>
                              ))}
                            </div>
                            <span className="text-[11px] text-gray-400">{wsTeam.length} member{wsTeam.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}

                        {wsProject.project_type === 'retainer' && (wsProject.monthly_deliverables ?? 0) > 0 && (() => {
                          const quota = wsProject.monthly_deliverables as number;
                          const now = new Date();
                          const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                          const delivered = wsTasks.filter(t => t.status === 'done' && t.completed_at &&
                            `${new Date(t.completed_at).getFullYear()}-${String(new Date(t.completed_at).getMonth() + 1).padStart(2, '0')}` === ym).length;
                          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                          const dLeft = lastDay - now.getDate();
                          const behind = delivered < quota && dLeft <= 7;
                          const cls = delivered >= quota
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : behind ? 'text-rose-600 bg-rose-50 border-rose-200' : 'text-gray-600 bg-gray-50 border-gray-200';
                          return (
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
                              <i className="ri-stack-line text-[10px]"></i>
                              {now.toLocaleDateString('en-US', { month: 'short' })}: {delivered}/{quota} delivered
                            </span>
                          );
                        })()}

                        {daysLeft !== null && (
                          isDeadlineOver ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-medium">
                              <i className="ri-alarm-warning-line text-[10px]"></i>{Math.abs(daysLeft)}d overdue
                            </span>
                          ) : daysLeft === 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                              <i className="ri-time-line text-[10px]"></i>Due today
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${daysLeft <= 7 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                              <i className="ri-calendar-line text-[10px]"></i>
                              {daysLeft}d left · {new Date(wsProject.deadline! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    <div className="lg:flex-1 lg:min-w-0">
                      {embedUrl && wsProject.drive_url ? (
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#f1f3f7] shadow-sm">
                          <div className="flex items-center justify-end border-b border-gray-200/80 px-3 py-1.5">
                            <a
                              href={wsProject.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:text-blue-600"
                              title="Open in Google Drive"
                            >
                              <svg viewBox="0 0 87.3 78" className="h-3 w-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                              </svg>
                              <span>Open Drive</span>
                              <i className="ri-external-link-line text-[10px]"></i>
                            </a>
                          </div>
                          <div className="h-[110px] overflow-hidden">
                            <iframe
                              src={embedUrl}
                              className="bg-[#f1f3f7]"
                              style={{ width: '200%', height: 220, border: 'none', transform: 'scale(0.5)', transformOrigin: 'top left' }}
                              title="Project Files"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3">
                          <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                            <i className="ri-folder-line text-gray-300 text-base"></i>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">No Drive folder linked</p>
                            <p className="text-[10px] text-gray-400">Ask your admin to add project folders</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div id="ws-scroll" className="flex-1 px-5 md:px-6 pb-6 space-y-5 overflow-y-auto">

            {/* Focus mode dismiss bar */}
            {wsFocusSection && (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2.5">
                <i className="ri-fullscreen-line text-indigo-500 text-sm"></i>
                <span className="text-xs text-indigo-700 font-medium flex-1">Focused view — showing one section</span>
                <button onClick={() => setWsFocusSection(null)} className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium cursor-pointer flex items-center gap-1">
                  <i className="ri-close-line text-xs"></i> Show all
                </button>
              </div>
            )}


            {/* Stats */}
            <div id="ws-stats" className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${wsFocusSection && wsFocusSection !== 'ws-stats' ? 'hidden' : ''}`}>
              {[
                { label: 'Total', value: wsTasks.length, icon: 'ri-task-line', iconBg: 'bg-gray-100', iconClr: 'text-gray-500', valClr: 'text-gray-800' },
                { label: 'Done', value: wsDone, icon: 'ri-checkbox-circle-fill', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', valClr: 'text-emerald-700' },
                { label: 'In Progress', value: wsTasks.filter(t => t.status === 'in_progress').length, icon: 'ri-loader-2-line', iconBg: 'bg-sky-100', iconClr: 'text-sky-600', valClr: 'text-sky-700' },
                { label: 'Overdue', value: wsTasks.filter(t => !!wsIsOverdue(t)).length, icon: 'ri-alarm-warning-line', iconBg: 'bg-rose-100', iconClr: 'text-rose-500', valClr: 'text-rose-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl px-3 py-2.5 shadow-sm border border-gray-100/80 flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <i className={`${s.icon} ${s.iconClr} text-xs`}></i>
                  </div>
                  <div>
                    <p className={`text-lg font-bold ${s.valClr} leading-none`}>{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div id="ws-timeline" className={wsFocusSection && wsFocusSection !== 'ws-timeline' ? 'hidden' : ''}>
              <GanttTimeline
                tasks={wsTasks}
                projectStart={wsProject.start_date}
                projectEnd={wsProject.deadline}
                today={wsToday}
                colorMap={taskColorMap}
              />
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Task list */}
              <div id="ws-tasks" className={`min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${taskView === 'board' ? 'flex-[1_1_100%]' : 'flex-1'} ${wsFocusSection && wsFocusSection !== 'ws-tasks' ? 'hidden' : ''}`}>
                <div className="px-5 py-4 border-b border-gray-50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="font-semibold text-gray-800">Tasks</h3>
                      {wsTasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-14 sm:w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${wsPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{wsDone}/{wsTasks.length}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => setTaskView('list')}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${taskView === 'list' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          List
                        </button>
                        <button
                          type="button"
                          onClick={() => { setTaskView('board'); setTaskFilter('all'); }}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${taskView === 'board' ? 'bg-[#111827] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Board
                        </button>
                      </div>
                      <button onClick={openAddTask}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
                        <i className="ri-add-line"></i> <span className="hidden sm:inline">Add Task</span><span className="sm:hidden">Add</span>
                      </button>
                    </div>
                  </div>
                  <div className={`flex gap-1 flex-wrap ${taskView === 'board' ? 'hidden' : ''}`}>
                    {(['all', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'overdue'] as const).map(f => {
                      const labels: Record<string, string> = { all: 'All', todo: 'To Do', in_progress: 'Active', in_review: 'Review', blocked: 'Blocked', done: 'Done', overdue: 'Overdue' };
                      const counts: Record<string, number> = {
                        all: wsTasks.length,
                        todo: wsTasks.filter(t => t.status === 'todo').length,
                        in_progress: wsTasks.filter(t => t.status === 'in_progress').length,
                        in_review: wsTasks.filter(t => t.status === 'in_review').length,
                        blocked: wsTasks.filter(t => t.status === 'blocked').length,
                        done: wsTasks.filter(t => t.status === 'done').length,
                        overdue: wsTasks.filter(t => !!wsIsOverdue(t)).length,
                      };
                      if (f !== 'all' && counts[f] === 0) return null;
                      return (
                        <button key={f} onClick={() => setTaskFilter(f)}
                          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${taskFilter === f ? 'bg-[#111827] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {labels[f]}{f !== 'all' && <span className="ml-1 opacity-60">{counts[f]}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {wsTasks.length === 0 ? (
                  <div className="py-14 text-center">
                    <i className="ri-task-line text-3xl text-gray-200 block mb-2"></i>
                    <p className="text-sm text-gray-400 mb-3">No tasks yet</p>
                    <button onClick={openAddTask}
                      className="text-sm text-[#FF6B35] hover:underline cursor-pointer">Add the first task</button>
                  </div>
                ) : wsFiltered.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-400">No tasks in this filter</p>
                  </div>
                ) : taskView === 'board' ? (
                  <div className="flex p-4 overflow-x-auto overflow-y-hidden min-h-[calc(100vh-19rem)]">
                    <div className="grid grid-cols-5 gap-4 min-w-[1120px] w-full min-h-full">
                      {BOARD_COLUMNS.map((column) => {
                        const columnTasks = boardTasks.filter((task) => task.status === column.key);
                        return (
                          <div
                            key={column.key}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setBoardDragOver(column.key);
                            }}
                            onDragLeave={() => setBoardDragOver((current) => current === column.key ? null : current)}
                            onDrop={async (e) => {
                              e.preventDefault();
                              const taskId = Number(e.dataTransfer.getData('text/task-id') || draggedTaskId);
                              const droppedTask = wsTasks.find((task) => task.id === taskId);
                              setBoardDragOver(null);
                              setDraggedTaskId(null);
                              if (!droppedTask) return;
                              await updateTaskStatus(droppedTask, column.key);
                            }}
                            className={`rounded-3xl border p-3 transition-colors min-h-full flex flex-col ${boardDragOver === column.key ? 'border-[#FF6B35] bg-orange-50/40' : 'border-gray-100 bg-gray-50/60'}`}
                          >
                            <div className="flex items-center gap-2 px-1 pb-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${column.chip}`}>
                                <i className={`${column.icon} text-[11px]`}></i>
                                {column.label}
                              </span>
                              <span className="text-[11px] text-gray-400 font-medium">{columnTasks.length}</span>
                            </div>
                            <div className="space-y-3 min-h-[240px] flex-1 overflow-y-auto pr-1">
                              {columnTasks.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 px-4 py-6 text-center">
                                  <p className="text-xs text-gray-400">{column.empty}</p>
                                </div>
                              ) : (
                                columnTasks.map((task) => <div key={task.id}>{BoardCard(task)}</div>)
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : taskFilter !== 'all' ? (
                  <div className="p-3 space-y-2">
                    {wsFiltered.map(task => <div key={task.id}>{TaskCard(task)}</div>)}
                  </div>
                ) : (
                  /* ── Grouped sections (taskFilter === 'all') ── */
                  <div>
                    {(() => {
                      const renderTaskRow = (task: ProjectTask) => <div key={task.id}>{TaskCard(task)}</div>;

                      const overdueTasks  = wsFiltered.filter(t => !!wsIsOverdue(t));
                      const inProgTasks   = wsFiltered.filter(t => t.status === 'in_progress' && !wsIsOverdue(t));
                      const reviewTasks   = wsFiltered.filter(t => t.status === 'in_review' && !wsIsOverdue(t));
                      const blockedTasks  = wsFiltered.filter(t => t.status === 'blocked' && !wsIsOverdue(t));
                      const todoTasks     = wsFiltered.filter(t => t.status === 'todo' && !wsIsOverdue(t));
                      const doneTasks     = wsFiltered.filter(t => t.status === 'done');

                      type GroupKey = 'overdue' | 'in_progress' | 'in_review' | 'blocked' | 'todo' | 'done';
                      const groups = [
                        { key: 'overdue',     label: 'Overdue',     icon: 'ri-alarm-warning-line', headerCls: 'bg-rose-50/60',  iconCls: 'text-rose-500',    labelCls: 'text-rose-700',    badgeCls: 'bg-rose-100 text-rose-600',    chevronCls: 'text-rose-300',    tasks: overdueTasks },
                        { key: 'in_progress', label: 'In Progress', icon: 'ri-loader-2-line',       headerCls: 'bg-sky-50/50',   iconCls: 'text-sky-500',     labelCls: 'text-sky-700',     badgeCls: 'bg-sky-100 text-sky-600',      chevronCls: 'text-sky-400',     tasks: inProgTasks  },
                        { key: 'in_review',   label: 'In Review',   icon: 'ri-eye-line',            headerCls: 'bg-purple-50/50',iconCls: 'text-purple-500',  labelCls: 'text-purple-700',  badgeCls: 'bg-purple-100 text-purple-600', chevronCls: 'text-purple-300', tasks: reviewTasks },
                        { key: 'blocked',     label: 'Blocked',     icon: 'ri-indeterminate-circle-line', headerCls: 'bg-rose-50/40', iconCls: 'text-rose-500', labelCls: 'text-rose-700', badgeCls: 'bg-rose-100 text-rose-600', chevronCls: 'text-rose-300', tasks: blockedTasks },
                        { key: 'todo',        label: 'To Do',       icon: 'ri-checkbox-blank-circle-line', headerCls: 'bg-gray-50/60', iconCls: 'text-gray-400', labelCls: 'text-gray-600', badgeCls: 'bg-gray-100 text-gray-500',  chevronCls: 'text-gray-300',    tasks: todoTasks    },
                        { key: 'done',        label: 'Done',        icon: 'ri-checkbox-circle-fill', headerCls: 'bg-emerald-50/40', iconCls: 'text-emerald-500', labelCls: 'text-emerald-700', badgeCls: 'bg-emerald-100 text-emerald-600', chevronCls: 'text-emerald-300', tasks: doneTasks },
                      ] satisfies { key: GroupKey; label: string; icon: string; headerCls: string; iconCls: string; labelCls: string; badgeCls: string; chevronCls: string; tasks: ProjectTask[] }[];

                      const visibleGroups = groups.filter(g => g.tasks.length > 0);

                      return visibleGroups.map(g => {
                        const collapsed = !!collapsedGroups[g.key];
                        return (
                          <div key={g.key} className="border-b border-gray-50 last:border-0">
                            <div
                              className={`flex items-center gap-2 px-5 py-2.5 ${g.headerCls} cursor-pointer select-none`}
                              onClick={() => setCollapsedGroups(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                            >
                              <i className={`${g.icon} ${g.iconCls} text-sm`}></i>
                              <span className={`text-xs font-semibold ${g.labelCls}`}>{g.label}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${g.badgeCls}`}>{g.tasks.length}</span>
                              <i className={`${collapsed ? 'ri-arrow-right-s-line' : 'ri-arrow-down-s-line'} ${g.chevronCls} ml-auto text-sm`}></i>
                            </div>
                            {!collapsed && (
                              <div className="p-3 space-y-2">
                                {g.tasks.map(t => renderTaskRow(t))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Archived tasks toggle */}
                {wsArchivedTasks.length > 0 && (
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => setShowArchivedTasks(v => !v)}
                      className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <i className="ri-archive-line text-sm"></i>
                      <span>{showArchivedTasks ? 'Hide' : 'Show'} archived ({wsArchivedTasks.length})</span>
                      <i className={`${showArchivedTasks ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} ml-auto`}></i>
                    </button>
                    {showArchivedTasks && (
                      <div className="p-3 space-y-2">
                        {wsArchivedTasks.map(task => (
                          <div key={task.id} className="opacity-50">
                            {TaskCard(task)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: project info */}
                <div id="ws-sidebar" className={`${taskView === 'board' ? 'hidden' : 'flex'} flex-col gap-4 w-full lg:w-64 flex-shrink-0 ${wsFocusSection && wsFocusSection !== 'ws-sidebar' ? 'hidden' : ''}`}>
                {/* Dates + notes card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                  {(wsProject.start_date || wsProject.deadline) && (
                    <div className="space-y-2.5">
                      {wsProject.start_date && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5"><i className="ri-play-circle-line text-gray-300"></i>Start</span>
                          <span className="font-medium text-gray-700">{new Date(wsProject.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      {wsProject.deadline && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400 flex items-center gap-1.5"><i className="ri-flag-line text-gray-300"></i>Due</span>
                          <span className={`font-medium ${wsProject.deadline < wsToday && wsProject.status !== 'completed' ? 'text-rose-500' : 'text-gray-700'}`}>
                            {new Date(wsProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {wsProject.notes && (
                    <div className={`${(wsProject.start_date || wsProject.deadline) ? 'border-t border-gray-50 pt-3' : ''}`}>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1.5">Notes</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{wsProject.notes}</p>
                    </div>
                  )}
                </div>

                {/* Activity feed */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Activity</p>
                    {activityLog.length > 0 && (
                      <button
                        onClick={() => setShowActivityModal(true)}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                      >
                        View all
                      </button>
                    )}
                  </div>
                  {activityLog.length === 0 ? (
                    <p className="text-xs text-gray-300">No activity yet</p>
                  ) : (
                    <div className="space-y-3">
                      {activityLog.slice(0, 8).map(a => {
                        const u = a.hub_users;
                        const icons: Record<string, string> = {
                          task_created: 'ri-add-circle-line text-emerald-500',
                          task_updated: 'ri-edit-line text-indigo-500',
                          task_status_changed: 'ri-refresh-line text-sky-500',
                          task_deleted: 'ri-delete-bin-line text-rose-500',
                          comment_added: 'ri-chat-3-line text-amber-500',
                          comment_deleted: 'ri-chat-delete-line text-rose-500',
                          task_assigned: 'ri-user-add-line text-purple-500',
                        };
                        const labels: Record<string, (a: typeof activityLog[0]) => string> = {
                          task_created: (a) => `created "${a.entity_title}"`,
                          task_updated: (a) => `updated "${a.entity_title}"`,
                          task_status_changed: (a) => `moved "${a.entity_title}" to ${(a.meta as any)?.to?.replace('_', ' ') ?? ''}`,
                          task_deleted: (a) => `deleted "${a.entity_title}"`,
                          comment_added: (a) => `commented on "${a.entity_title}"`,
                          comment_deleted: (a) => `deleted a comment on "${a.entity_title}"`,
                          task_assigned: (a) => `assigned "${a.entity_title}"`,
                        };
                        const diff = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 1000);
                        const time = diff < 60 ? 'just now' : diff < 3600 ? `${Math.floor(diff/60)}m ago` : diff < 86400 ? `${Math.floor(diff/3600)}h ago` : new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        return (
                          <div key={a.id} className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <i className={`${icons[a.action] ?? 'ri-information-line text-gray-400'} text-[11px]`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-600 leading-snug">
                                <span className="font-semibold text-gray-800">{u?.full_name?.split(' ')[0] ?? 'Someone'}</span>
                                {' '}{labels[a.action]?.(a) ?? a.action}
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{time}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Payout */}
                {!wsIsInternal && wsProject?.project_type !== 'retainer' && !workspaceRow?.exclude_from_payout && (() => {
                  const totalCosts = wsProject.hub_project_costs.reduce((s, x) => s + x.amount, 0);
                  const netProfit = wsProject.contract_price - totalCosts;
                  const isFixed = workspaceRow!.payout_type === 'fixed';
                  const myCut = isFixed ? (workspaceRow!.fixed_amount ?? 0) : netProfit * (workspaceRow!.percentage / 100);
                  const payouts = workspaceRow!.hub_project_contractor_payouts ?? [];
                  const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);
                  const isFullyPaid = totalPaidOut >= myCut && myCut > 0;
                  const payoutPct = myCut > 0 ? Math.min((totalPaidOut / myCut) * 100, 100) : 0;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Your Payout</p>
                      <p className="text-xl font-bold text-gray-900">{fmt(myCut)}</p>
                      <p className="text-xs text-gray-400">{isFixed ? 'Fixed fee' : `${workspaceRow!.percentage}% of net profit`}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isFullyPaid ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${payoutPct}%` }} />
                      </div>
                      <p className={`text-xs font-medium ${isFullyPaid ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {isFullyPaid ? 'Paid in full ✓' : `${fmt(totalPaidOut)} received`}
                      </p>
                      {payouts.length > 0 && (
                        <div className="space-y-1.5 border-t border-gray-50 pt-3">
                          {payouts.map(pp => (
                            <div key={pp.id} className="flex items-center gap-2 text-xs">
                              <i className="ri-check-line text-emerald-400 flex-shrink-0"></i>
                              <span className="font-medium text-gray-700">{fmt(pp.amount)}</span>
                              <span className="text-gray-400 ml-auto">{new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Questionnaires */}
                {wsQuestionnaires.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Questionnaires</p>
                    <div className="space-y-2">
                      {wsQuestionnaires.map(q => (
                        <button key={q.id} onClick={() => setWsQModal(q)}
                          className="w-full text-left rounded-xl border border-gray-100 p-3 hover:border-[#FF6B35]/40 hover:bg-orange-50/40 transition-all cursor-pointer">
                          <p className="text-xs font-medium text-gray-700 truncate">{q.service_type}</p>
                          {q.submitted_at && (
                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(q.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questionnaire answers modal */}
      {wsQModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4 pb-16 sm:pb-0" onClick={() => setWsQModal(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3 flex-shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#111827]">{wsQModal.service_type}</h3>
                {wsQModal.submitted_at && <p className="text-xs text-gray-400 mt-0.5">Submitted {new Date(wsQModal.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
              </div>
              <button onClick={() => setWsQModal(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer mt-0.5"><i className="ri-close-line text-lg"></i></button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {wsQModal.questions.map(question => {
                const answer = wsQModal.answers[question.id];
                const hasAnswer = answer && (Array.isArray(answer) ? answer.length > 0 : String(answer).trim() !== '');
                return (
                  <div key={question.id} className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-700">{question.label}</p>
                    {hasAnswer ? (
                      Array.isArray(answer) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {answer.map(a => <span key={a} className="text-xs bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full font-medium">{a}</span>)}
                        </div>
                      ) : question.type === 'file_upload' && (answer as string).startsWith('http') ? (
                        <a href={answer as string} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-[#FF6B35] hover:underline bg-orange-50 rounded-lg px-3 py-2">
                          <i className="ri-external-link-line text-xs"></i> View file →
                        </a>
                      ) : (
                        <p className="text-sm text-[#111827] bg-gray-50 rounded-lg px-3 py-2">{answer}</p>
                      )
                    ) : (
                      <p className="text-xs text-gray-300 italic">No answer</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Project list ── */}
      {!workspaceRow && !clientWorkspace && (loading ? (
        <div className="flex justify-center py-24">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-300"></i>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-14 h-14 bg-gray-100 rounded-3xl flex items-center justify-center">
            <i className="ri-folder-open-line text-gray-400 text-2xl"></i>
          </div>
          <p className="text-sm font-semibold text-gray-500">No projects assigned yet</p>
          <p className="text-xs text-gray-400">Your admin will assign you when a project starts.</p>
        </div>
      ) : (
        /* ── Main dashboard layout ── */
        <div className="flex items-stretch gap-5 min-h-screen">

          {/* ── LEFT: projects ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Greeting */}
            <div>
              <p className="text-xs text-gray-400 mb-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <h2 className="text-xl font-bold tracking-tight leading-tight">
                <span style={{ background: greetingGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {greeting}, {firstName}.
                </span>
                {' '}<span className="not-italic" style={{ WebkitTextFillColor: 'initial' }}>{greetingEmoji}</span>
                <br />
                <span className="text-gray-400 font-normal text-base">
                  {todayDueTasks.length > 0
                    ? `You've got ${todayDueTasks.length} task${todayDueTasks.length > 1 ? 's' : ''} due today.`
                    : overdueTasks.length > 0
                    ? `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} ${overdueTasks.length > 1 ? 'need' : 'needs'} attention.`
                    : myTasks.length > 0
                    ? `${myTasks.length - doneTasks.length} task${myTasks.length - doneTasks.length !== 1 ? 's' : ''} remaining.`
                    : 'All clear — nothing pending.'}
                </span>
              </h2>
            </div>

            {/* No search results */}
            {search && active.length === 0 && other.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <i className="ri-search-line text-3xl text-gray-200"></i>
                <p className="text-sm text-gray-400">No projects match <span className="font-medium text-gray-600">"{search}"</span></p>
                <button onClick={() => setSearch('')} className="text-xs text-indigo-500 hover:underline cursor-pointer">Clear search</button>
              </div>
            )}

            {/* Project cards grouped by status */}
            {(() => {
              const active = sortedRows.filter(r => r.hub_projects?.status !== 'completed');
              const done   = sortedRows.filter(r => r.hub_projects?.status === 'completed');

              const Section = ({ label, rows: sRows }: { label: string; rows: typeof sortedRows }) => sRows.length === 0 ? null : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
                    <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{sRows.length}</span>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                    {sRows.map((r) => {
                      const p = r.hub_projects;
                      if (!p) return null;
                      const palette = getServicePalette(p.service);
                      const projectTasks = tasks.filter(t => t.project_id === p.id && !t.deleted_at);
                      const tasksDone = projectTasks.filter(t => t.status === 'done').length;
                      const isOverdueRow = !!(p.deadline && p.deadline < today && p.status !== 'completed');
                      const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000) : null;
                      return (
                        <button key={r.id}
                          onClick={() => { setWorkspaceRow(r); setTaskFilter('all'); setTaskSearch(''); setWsFocusSection(null); }}
                          className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer hover:bg-gray-50/60">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}>
                            <span className="text-[13px] font-bold text-white">{p.project_name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">{p.project_name}</p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">{p.project_type === 'internal' ? 'Internal' : p.client_name}{p.service ? ` · ${p.service}` : ''}</p>
                          </div>
                          {projectTasks.length > 0 && (
                            <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                              <div className="w-14 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((tasksDone / projectTasks.length) * 100)}%`, background: palette.from }} />
                              </div>
                              <span className="text-[11px] text-gray-400 w-8">{tasksDone}/{projectTasks.length}</span>
                            </div>
                          )}
                          {daysLeft !== null ? (
                            isOverdueRow
                              ? <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-rose-100 text-rose-600 flex-shrink-0">{Math.abs(daysLeft)}d overdue</span>
                              : daysLeft <= 7
                                ? <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700 flex-shrink-0">{daysLeft}d left</span>
                                : <span className="text-[11px] text-gray-400 flex-shrink-0">{new Date(p.deadline! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          ) : null}
                          <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors text-lg flex-shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );

              return (
                <>
                  <Section label="Projects" rows={active} />
                  <Section label="Completed" rows={done} />
                </>
              );
            })()}

            {/* ── My Clients section ── */}
            {clientEntries.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">My Clients</p>
                  <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">{clientEntries.length}</span>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
                  {clientEntries.map(c => {
                    const pal = getServicePalette(c.service ?? null);
                    return (
                      <button key={c.id} onClick={() => {
                        if (c.type === 'retainer' && c.rowId) {
                          const row = rows.find(r => r.id === c.rowId);
                          if (row) { setWorkspaceRow(row); setTaskFilter('all'); setTaskSearch(''); setWsFocusSection(null); }
                        } else {
                          setClientWorkspace(c);
                        }
                      }}
                        className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all group cursor-pointer hover:bg-gray-50/60">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}>
                          <span className="text-[13px] font-bold text-white">{c.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#111827] truncate leading-snug">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{c.type === 'retainer' ? 'Retainer' : (c.role ?? c.platform ?? 'Client')}{c.service ? ` · ${c.service}` : ''}</p>
                        </div>
                        <i className="ri-arrow-right-s-line text-gray-300 group-hover:text-gray-500 transition-colors text-lg flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: task panel ── */}
          <div className="hidden lg:flex flex-col w-72 flex-shrink-0 px-3 relative overflow-hidden"
            style={{
              marginTop: '-1.5rem',
              marginBottom: '-6rem',
              marginRight: '-1.5rem',
              paddingTop: '1.5rem',
              paddingBottom: '6rem',
              background: 'rgba(232,237,248,0.30)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderLeft: '1px solid rgba(200,210,230,0.35)',
            }}>
            {/* Blobs */}
            <div className="absolute pointer-events-none inset-0 overflow-hidden">
              <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 65%)', filter: 'blur(40px)' }} />
              <div className="absolute top-16 -left-16 w-72 h-72 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 65%)', filter: 'blur(36px)' }} />
              <div className="absolute top-1/3 right-0 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)', filter: 'blur(40px)' }} />
              <div className="absolute top-1/2 left-0 w-80 h-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #FF6B35 0%, transparent 65%)', filter: 'blur(44px)' }} />
              <div className="absolute bottom-16 right-0 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 65%)', filter: 'blur(36px)' }} />
              <div className="absolute -bottom-16 left-8 w-80 h-80 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 65%)', filter: 'blur(44px)' }} />
            </div>

            {/* Overall progress ring */}
            {tasks.length > 0 && (
              <div className="bg-white/80 rounded-2xl shadow-sm border border-white/60 mb-3 relative z-10"
                style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
                <div className="px-5 py-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Overall Progress</p>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <ProgressRing pct={pct} size={72} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-2xl font-bold text-[#111827] leading-none mb-0.5">{pct}%</p>
                      <p className="text-[11px] text-gray-400 mb-2">complete</p>
                      <div className="space-y-1">
                        {[
                          { label: 'Done', value: doneTasks.length, color: 'bg-emerald-400' },
                          { label: 'Active', value: inProgressTasks.length, color: 'bg-blue-400' },
                          { label: 'To Do', value: todoTasks.length, color: 'bg-gray-200' },
                        ].map(s => (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.color}`}></span>
                            <span className="text-xs text-gray-500 flex-1">{s.label}</span>
                            <span className="text-xs font-semibold text-gray-700">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* My tasks list */}
            <div className="bg-white/80 rounded-2xl shadow-sm border border-white/60 relative z-10"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
              <div className="px-5 pt-5 pb-4">
                <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">
                  {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' }).toUpperCase()}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xl font-bold text-[#111827]">My Tasks</p>
                  {overdueTasks.length > 0 && (
                    <span className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full flex-shrink-0">
                      {overdueTasks.length} overdue
                    </span>
                  )}
                </div>
              </div>

              {sortedMyTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 px-5 pb-5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <i className="ri-checkbox-circle-fill text-emerald-400 text-2xl"></i>
                  </div>
                  <p className="text-sm text-gray-400 font-medium text-center">No tasks assigned yet</p>
                </div>
              ) : (
                <div className="px-3 pb-4 space-y-1">
                  {sortedMyTasks.filter(t => !hiddenDoneIds.has(t.id)).map(t => {
                    const projectName = getProjectName(t.project_id);
                    const isTaskOverdue = !!(t.due_date && t.due_date < today && t.status !== 'done');
                    const isDone = t.status === 'done';
                    const isCompleting = completingTaskIds.has(t.id);
                    const taskStatusIcon = (status: string) => {
                      if (isCompleting || status === 'done') return <i className="ri-checkbox-circle-fill text-emerald-500 text-xl flex-shrink-0" />;
                      if (status === 'in_progress') return <i className="ri-loader-4-line animate-spin text-sky-400 text-xl flex-shrink-0" />;
                      if (status === 'blocked') return <i className="ri-close-circle-line text-rose-400 text-xl flex-shrink-0" />;
                      if (status === 'in_review') return <i className="ri-eye-line text-violet-400 text-xl flex-shrink-0" />;
                      return <i className="ri-circle-line text-gray-300 text-xl flex-shrink-0" />;
                    };
                    return (
                      <div key={t.id} className={`flex items-start gap-3 px-2 py-2.5 rounded-xl transition-all duration-300 ${isCompleting ? 'bg-emerald-50' : isDone ? 'opacity-40' : 'hover:bg-gray-50'}`}>
                        <button type="button" onClick={() => completeDashboardTask(t)} className="flex-shrink-0 cursor-pointer mt-0.5">
                          {taskStatusIcon(t.status)}
                        </button>
                        {isCompleting ? (
                          <>
                            <p className="flex-1 text-[13px] font-medium text-emerald-600">Task completed</p>
                            <button type="button" onClick={() => undoDashboardTask(t)}
                              className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md flex-shrink-0 cursor-pointer transition-colors">
                              Undo
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => openTaskFromDashboard(t)} className="flex-1 min-w-0 text-left cursor-pointer">
                              <p className={`text-[13px] font-medium leading-snug ${isDone ? 'line-through text-gray-400' : 'text-[#111827]'}`}>{t.title}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate">{projectName}</p>
                              {!getTaskAssigneeIds(t).includes(myUserId) && (() => {
                                const item = (t.checklist ?? []).find(i => i.assignee_id === myUserId && !i.done);
                                return item ? <p className="text-[10px] text-indigo-500 mt-0.5 truncate"><i className="ri-checkbox-line mr-0.5"></i>Your item: {item.text}</p> : null;
                              })()}
                            </button>
                            {t.due_date && t.status !== 'done' && (
                              <span className={`text-[10px] font-semibold flex-shrink-0 mt-1 ${isTaskOverdue ? 'text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded' : t.due_date === today ? 'text-amber-600' : 'text-gray-400'}`}>
                                {t.due_date === today ? 'Today' : isTaskOverdue ? 'Late' : new Date(t.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      ))}

      {showActivityModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setShowActivityModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-[28px] bg-white shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Project Activity</p>
                  <p className="text-xs text-gray-400">{wsProject?.project_name ?? 'Workspace'}</p>
                </div>
                <button
                  onClick={() => setShowActivityModal(false)}
                  className="w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <i className="ri-close-line text-base"></i>
                </button>
              </div>

              <div className="max-h-[calc(80vh-73px)] overflow-y-auto px-5 py-4">
                {activityLog.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-gray-300">No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityLog.map(a => {
                      const u = a.hub_users;
                      const icons: Record<string, string> = {
                        task_created: 'ri-add-circle-line text-emerald-500',
                        task_updated: 'ri-edit-line text-indigo-500',
                        task_status_changed: 'ri-refresh-line text-sky-500',
                        task_deleted: 'ri-delete-bin-line text-rose-500',
                        comment_added: 'ri-chat-3-line text-amber-500',
                        comment_deleted: 'ri-chat-delete-line text-rose-500',
                        task_assigned: 'ri-user-add-line text-purple-500',
                      };
                      const labels: Record<string, (a: typeof activityLog[0]) => string> = {
                        task_created: (a) => `created "${a.entity_title}"`,
                        task_updated: (a) => `updated "${a.entity_title}"`,
                        task_status_changed: (a) => `moved "${a.entity_title}" to ${(a.meta as any)?.to?.replace('_', ' ') ?? ''}`,
                        task_deleted: (a) => `deleted "${a.entity_title}"`,
                        comment_added: (a) => `commented on "${a.entity_title}"`,
                        comment_deleted: (a) => `deleted a comment on "${a.entity_title}"`,
                        task_assigned: (a) => `assigned "${a.entity_title}"`,
                      };
                      const diff = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 1000);
                      const time = diff < 60 ? 'just now' : diff < 3600 ? `${Math.floor(diff / 60)}m ago` : diff < 86400 ? `${Math.floor(diff / 3600)}h ago` : new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      return (
                        <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 px-3.5 py-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                            <i className={`${icons[a.action] ?? 'ri-information-line text-gray-400'} text-sm`}></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 leading-snug">
                              <span className="font-semibold text-gray-900">{u?.full_name?.split(' ')[0] ?? 'Someone'}</span>
                              {' '}{labels[a.action]?.(a) ?? a.action}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <TaskDetailPanel
        task={editingTask ? {
          id: editingTask.id,
          project_id: editingTask.project_id,
          title: editingTask.title,
          description: editingTask.description,
          status: editingTask.status,
          priority: editingTask.priority,
          assignee_id: getPrimaryTaskAssigneeId(editingTask),
          assignee_ids: getTaskAssigneeIds(editingTask),
          due_date: editingTask.due_date,
          start_date: editingTask.start_date,
          checklist: editingTask.checklist,
          color: editingTask.color ?? null,
          meta: (editingTask as any).meta ?? null,
          hub_users: wsTeam.find(m => m.id === getPrimaryTaskAssigneeId(editingTask))
            ? { id: wsTeam.find(m => m.id === getPrimaryTaskAssigneeId(editingTask))!.id, full_name: wsTeam.find(m => m.id === getPrimaryTaskAssigneeId(editingTask))!.full_name, avatar_url: wsTeam.find(m => m.id === getPrimaryTaskAssigneeId(editingTask))!.avatar_url ?? null }
            : null,
        } : null}
        open={detailPanelOpen}
        onClose={() => { setDetailPanelOpen(false); setEditingTask(null); }}
        onSaved={(saved) => {
          const mapped: ProjectTask = {
            ...saved,
            assigned_to: getPrimaryTaskAssigneeId(saved),
            assignee_ids: getTaskAssigneeIds(saved),
            start_date: saved.start_date ?? null,
            checklist: saved.checklist,
            ...(saved.color !== undefined ? { color: saved.color } as any : {}),
          };
          setTasks(prev => prev.some(t => t.id === saved.id)
            ? prev.map(t => t.id === saved.id ? mapped : t)
            : [...prev, mapped]);
          setEditingTask(mapped);
          refreshWorkspaceActivity();
        }}
        onDeleted={(id) => {
          setTasks(prev => prev.filter(t => t.id !== id));
          setDetailPanelOpen(false);
          setEditingTask(null);
          refreshWorkspaceActivity();
        }}
        onArchived={(id) => {
          setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: true, archived_at: new Date().toISOString() } : t));
          setDetailPanelOpen(false);
          setEditingTask(null);
        }}
        onActivityChange={refreshWorkspaceActivity}
        projectId={wsProject?.id ?? 0}
        projectName={wsProject?.project_name ?? 'General'}
        teamMembers={wsTeam}
        canEdit={true}
        currentUserId={hubUser?.id ?? ''}
        currentUserName={hubUser?.full_name ?? 'Employee'}
        currentUserAvatarUrl={hubUser?.avatar_url ?? null}
      />
    </ContractorLayout>
  );
}
