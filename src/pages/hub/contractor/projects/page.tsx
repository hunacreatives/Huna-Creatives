import { useEffect, useState } from 'react';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useHubAuth } from '@/hooks/useHubAuth';
import { supabase } from '@/lib/supabase';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }

interface TeamMember { id: string; full_name: string; avatar_url: string | null; }

interface ProjectRow {
  id: number;
  percentage: number;
  payout_type: string;
  fixed_amount: number | null;
  payout_status: string;
  paid_at: string | null;
  hub_project_contractor_payouts: ContractorPayout[];
  hub_projects: {
    id: number;
    client_name: string;
    project_name: string;
    service: string | null;
    contract_price: number;
    status: string;
    start_date: string | null;
    deadline: string | null;
    notes: string | null;
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
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  assigned_to: string | null;
}

const emptyTaskForm = () => ({
  title: '',
  description: '',
  priority: 'medium' as ProjectTask['priority'],
  due_date: '',
  assigned_to: '',
});

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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-gray-900" style={{ fontSize: size < 60 ? 13 : 22 }}>{pct}%</span>
        {size >= 100 && <span className="text-[10px] text-gray-400 mt-0.5">complete</span>}
      </div>
    </div>
  );
}

// ── Task row (used in feed and detail) ────────────────────────────────────
function TaskRow({ task, projectName, team }: { task: ProjectTask; projectName?: string; team?: TeamMember[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
  const priorityCls = { high: 'bg-rose-400', medium: 'bg-amber-400', low: 'bg-gray-300' }[task.priority];
  const statusIcon =
    task.status === 'done' ? 'ri-checkbox-circle-fill text-emerald-500' :
    task.status === 'in_progress' ? 'ri-loader-2-line text-blue-400' :
    'ri-checkbox-blank-circle-line text-gray-300';
  const assignee = team?.find(m => m.id === task.assigned_to);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/60 transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityCls}`}></span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
        {(projectName || assignee) && (
          <p className="text-[11px] text-gray-400 truncate">
            {projectName}{assignee ? (projectName ? ` · ${assignee.full_name}` : assignee.full_name) : ''}
          </p>
        )}
      </div>
      {task.due_date && (
        <span className={`text-[11px] flex-shrink-0 font-medium ${isOverdue ? 'text-rose-500' : 'text-gray-400'}`}>
          {isOverdue ? 'Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
      <i className={`${statusIcon} text-base flex-shrink-0`}></i>
    </div>
  );
}

// ── Project detail drawer ──────────────────────────────────────────────────
function ProjectDetail({ row, tasks, team, onClose, onReceiptClick }: {
  row: ProjectRow;
  tasks: ProjectTask[];
  team: TeamMember[];
  onClose: () => void;
  onReceiptClick: (url: string) => void;
}) {
  const p = row.hub_projects;
  const today = new Date().toISOString().slice(0, 10);
  const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
  const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
  const netProfit = p.contract_price - totalCosts;
  const isFixed = row.payout_type === 'fixed';
  const myCut = isFixed ? (row.fixed_amount ?? 0) : netProfit * (row.percentage / 100);
  const payouts = row.hub_project_contractor_payouts ?? [];
  const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);
  const payoutPct = myCut > 0 ? Math.min((totalPaidOut / myCut) * 100, 100) : 0;
  const isFullyPaid = totalPaidOut >= myCut && myCut > 0;
  const tasksDone = tasks.filter(t => t.status === 'done').length;
  const tasksPct = tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0;
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done');
  const [taskTab, setTaskTab] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const statusLabels: Record<string, string> = { ongoing: 'Active', completed: 'Done', paused: 'Paused', cancelled: 'Archived' };

  const filteredTasks = tasks.filter(t => taskTab === 'all' || t.status === taskTab);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-gray-900 text-base leading-snug">{p.project_name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0 ${statusColors[p.status] ?? statusColors.ongoing}`}>
                {statusLabels[p.status] ?? p.status}
              </span>
              {p.service && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">{p.service}</span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{p.client_name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer flex-shrink-0">
            <i className="ri-close-line"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Dates */}
            {(p.start_date || p.deadline) && (
              <div className="flex items-center gap-6 text-sm">
                {p.start_date && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Start</p>
                    <p className="font-medium text-gray-700">{new Date(p.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                )}
                {p.start_date && p.deadline && <i className="ri-arrow-right-line text-gray-300"></i>}
                {p.deadline && (
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-0.5">Deadline</p>
                    <p className={`font-medium ${p.deadline < today && p.status !== 'completed' ? 'text-rose-500' : 'text-gray-700'}`}>
                      {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Progress + payout stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Task Progress</p>
                <div className="flex items-center gap-3">
                  <ProgressRing pct={tasksPct} size={52} />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{tasksDone}/{tasks.length}</p>
                    <p className="text-[11px] text-gray-400">tasks done</p>
                    {overdue.length > 0 && <p className="text-[11px] text-rose-500 font-medium">{overdue.length} overdue</p>}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Your Payout</p>
                <p className="text-lg font-bold text-gray-900 leading-none">{fmt(myCut)}</p>
                <p className="text-[11px] text-gray-400">{isFixed ? 'Fixed fee' : `${row.percentage}% of net`}</p>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isFullyPaid ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${payoutPct}%` }} />
                </div>
                <p className={`text-[11px] font-medium ${isFullyPaid ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {isFullyPaid ? 'Paid in full ✓' : `${fmt(totalPaidOut)} received`}
                </p>
              </div>
            </div>

            {/* Project overall payment progress */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Project Collections</p>
                <p className="text-xs font-semibold text-gray-600">{fmt(totalPaid)} / {fmt(p.contract_price)}</p>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((totalPaid / p.contract_price) * 100, 100)}%` }} />
              </div>
              <p className="text-[11px] text-gray-400">{((totalPaid / p.contract_price) * 100).toFixed(0)}% collected from client</p>
            </div>

            {/* Tasks */}
            {tasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">Tasks</p>
                  <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                    {(['all', 'todo', 'in_progress', 'done'] as const).map(f => {
                      const count = f === 'all' ? tasks.length : tasks.filter(t => t.status === f).length;
                      const labels: Record<string, string> = { all: 'All', todo: 'Todo', in_progress: 'Active', done: 'Done' };
                      return count > 0 || f === 'all' ? (
                        <button key={f} onClick={() => setTaskTab(f)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${taskTab === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                          {labels[f]}{f !== 'all' && <span className="ml-1 opacity-70">{count}</span>}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="space-y-0.5 bg-gray-50/60 rounded-2xl py-1">
                  {filteredTasks.map(t => (
                    <TaskRow key={t.id} task={t} team={team} />
                  ))}
                  {filteredTasks.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-4">No tasks here</p>
                  )}
                </div>
              </div>
            )}

            {/* Team */}
            {team.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Team</p>
                <div className="flex flex-wrap gap-2">
                  {team.map(m => (
                    <div key={m.id} className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5">
                      {m.avatar_url
                        ? <img src={m.avatar_url} alt={m.full_name} className="w-5 h-5 rounded-full object-cover object-top flex-shrink-0" />
                        : <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">{m.full_name[0]}</div>
                      }
                      <span className="text-xs text-gray-700 font-medium">{m.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {p.notes && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Notes</p>
                <p className="text-sm text-gray-500 bg-gray-50 rounded-2xl p-4 leading-relaxed whitespace-pre-line">{p.notes}</p>
              </div>
            )}

            {/* Payout history */}
            {payouts.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Payout History</p>
                <div className="space-y-2">
                  {payouts.map(pp => (
                    <div key={pp.id} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                      <i className="ri-check-line text-emerald-500 flex-shrink-0"></i>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{fmt(pp.amount)}</p>
                        {pp.notes && <p className="text-xs text-gray-400 truncate">{pp.notes}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">{new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        {pp.receipt_url && (
                          <button onClick={() => onReceiptClick(pp.receipt_url!)} className="text-[11px] text-sky-500 hover:text-sky-700 cursor-pointer flex items-center gap-0.5 ml-auto">
                            <i className="ri-image-line text-[10px]"></i> Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Project card (summary) ─────────────────────────────────────────────────
function ProjectCard({ row, projectTasks, onClick }: {
  row: ProjectRow;
  projectTasks: ProjectTask[];
  onClick: () => void;
}) {
  const p = row.hub_projects;
  if (!p) return null;
  const today = new Date().toISOString().slice(0, 10);
  const tasksDone = projectTasks.filter(t => t.status === 'done').length;
  const tasksPct = projectTasks.length > 0 ? Math.round((tasksDone / projectTasks.length) * 100) : 0;
  const overdue = projectTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length;
  const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
  const netProfit = p.contract_price - totalCosts;
  const isFixed = row.payout_type === 'fixed';
  const myCut = isFixed ? (row.fixed_amount ?? 0) : netProfit * (row.percentage / 100);
  const payouts = row.hub_project_contractor_payouts ?? [];
  const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);
  const isFullyPaid = totalPaidOut >= myCut && myCut > 0;

  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const statusLabels: Record<string, string> = { ongoing: 'Active', completed: 'Done', paused: 'Paused', cancelled: 'Archived' };

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-5 space-y-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base leading-snug line-clamp-1">{p.project_name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{p.client_name}{p.service ? ` · ${p.service}` : ''}</p>
          {p.deadline && (
            <p className={`text-xs mt-0.5 ${p.deadline < today && p.status !== 'completed' ? 'text-rose-500 font-medium' : 'text-gray-400'}`}>
              Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0 ${statusColors[p.status] ?? statusColors.ongoing}`}>
          {statusLabels[p.status] ?? p.status}
        </span>
      </div>

      {/* Task progress */}
      {projectTasks.length > 0 && (
        <div className="flex items-center gap-3 bg-gray-50/80 rounded-2xl px-3 py-2.5">
          <ProgressRing pct={tasksPct} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{tasksDone} / {projectTasks.length} tasks done</p>
            {overdue > 0
              ? <p className="text-[11px] text-rose-500 font-medium">{overdue} overdue</p>
              : <p className="text-[11px] text-gray-400">{projectTasks.filter(t => t.status === 'in_progress').length} in progress</p>
            }
          </div>
          <i className="ri-arrow-right-s-line text-gray-300 text-lg flex-shrink-0"></i>
        </div>
      )}

      {/* Payout */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400">{isFixed ? 'Fixed fee' : `Your cut (${row.percentage}%)`}</p>
          <p className="text-sm font-bold text-gray-900">{fmt(myCut)}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isFullyPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
          {isFullyPaid ? 'Paid ✓' : `${fmt(totalPaidOut)} received`}
        </span>
      </div>
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ContractorProjectsPage() {
  const { hubUser: realHubUser } = useAuth();
  const { hubUser: demoHubUser } = useHubAuth();
  const hubUser = realHubUser ?? demoHubUser;
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [teamMap, setTeamMap] = useState<Record<number, TeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [workspaceRow, setWorkspaceRow] = useState<ProjectRow | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'in_progress' | 'done' | 'overdue'>('all');
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm());
  const [taskSaving, setTaskSaving] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  const cycleTask = async (task: ProjectTask) => {
    const next: Record<string, ProjectTask['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = next[task.status];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from('hub_project_tasks').update({ status: newStatus }).eq('id', task.id);
  };

  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm(emptyTaskForm());
    setShowTaskModal(true);
  };

  const openEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      due_date: task.due_date ?? '',
      assigned_to: task.assigned_to ?? '',
    });
    setShowTaskModal(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim() || !workspaceRow?.hub_projects?.id) return;
    setTaskSaving(true);
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      assigned_to: taskForm.assigned_to || null,
    };
    if (editingTask) {
      await supabase.from('hub_project_tasks').update(payload).eq('id', editingTask.id);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload } : t));
    } else {
      const { data } = await supabase
        .from('hub_project_tasks')
        .insert({ ...payload, project_id: workspaceRow.hub_projects.id, status: 'todo' })
        .select()
        .single();
      if (data) setTasks(prev => [...prev, data as ProjectTask]);
    }
    setTaskSaving(false);
    setShowTaskModal(false);
  };

  const deleteTask = async (taskId: number) => {
    setDeletingTaskId(taskId);
    await supabase.from('hub_project_tasks').delete().eq('id', taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setDeletingTaskId(null);
  };

  useEffect(() => {
    if (!hubUser) return;
    supabase
      .from('hub_project_contractors')
      .select('id, percentage, payout_type, fixed_amount, payout_status, paid_at, hub_project_contractor_payouts(id, amount, paid_at, notes, receipt_url), hub_projects(id, client_name, project_name, service, contract_price, status, start_date, deadline, notes, hub_project_payments(amount), hub_project_costs(amount))')
      .eq('contractor_id', hubUser.id)
      .then(async ({ data }) => {
        const normalized = ((data ?? []) as ProjectRowRaw[]).map((row) => ({
          ...row,
          hub_project_contractor_payouts: row.hub_project_contractor_payouts ?? [],
          hub_projects: Array.isArray(row.hub_projects) ? row.hub_projects[0] : row.hub_projects,
        }));
        setRows(normalized);

        const projectIds = normalized.map(r => r.hub_projects?.id).filter(Boolean) as number[];
        if (projectIds.length > 0) {
          const [{ data: taskData }, { data: teamData }] = await Promise.all([
            supabase
              .from('hub_project_tasks')
              .select('id, project_id, title, description, status, priority, due_date, assigned_to')
              .in('project_id', projectIds),
            supabase
              .from('hub_project_contractors')
              .select('project_id, hub_users(id, full_name, avatar_url)')
              .in('project_id', projectIds),
          ]);
          setTasks((taskData as ProjectTask[]) ?? []);
          const map: Record<number, TeamMember[]> = {};
          for (const entry of (teamData ?? []) as any[]) {
            const pid = entry.project_id as number;
            const u = entry.hub_users as TeamMember | null;
            if (u) (map[pid] ??= []).push(u);
          }
          setTeamMap(map);
        }
        setLoading(false);
      });
  }, [hubUser]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toISOString().slice(0, 10);
  const firstName = hubUser?.full_name?.split(' ')[0] ?? '';

  const doneTasks = tasks.filter(t => t.status === 'done');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done');
  const todayDueTasks = tasks.filter(t => t.due_date === today && t.status !== 'done');
  const pct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const featuredTasks = todayDueTasks.length > 0 ? todayDueTasks
    : overdueTasks.length > 0 ? overdueTasks
    : inProgressTasks.length > 0 ? inProgressTasks
    : todoTasks.slice(0, 6);

  const subline = todayDueTasks.length > 0
    ? `${todayDueTasks.length} task${todayDueTasks.length > 1 ? 's' : ''} due today`
    : overdueTasks.length > 0
    ? `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`
    : doneTasks.length === tasks.length && tasks.length > 0
    ? "You're all caught up 🎉"
    : `${tasks.length} tasks across your projects`;

  const getProjectName = (projectId: number) =>
    rows.find(r => r.hub_projects?.id === projectId)?.hub_projects?.project_name ?? '';

  const active = rows.filter(r => r.hub_projects?.status === 'ongoing');
  const other = rows.filter(r => r.hub_projects?.status !== 'ongoing');

  const wsRow = workspaceRow;
  const wsProject = wsRow?.hub_projects;
  const wsTasks = wsRow ? tasks.filter(t => t.project_id === wsProject?.id) : [];
  const wsToday = new Date().toISOString().slice(0, 10);
  const wsIsOverdue = (t: ProjectTask) => t.due_date && t.due_date < wsToday && t.status !== 'done';
  const wsFiltered = wsTasks.filter(t => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'overdue') return !!wsIsOverdue(t);
    return t.status === taskFilter;
  });
  const wsDone = wsTasks.filter(t => t.status === 'done').length;
  const wsPct = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
  const wsTeam = wsRow ? (teamMap[wsProject?.id ?? 0] ?? []) : [];
  const wsStatusIcon: Record<string, { icon: string; cls: string }> = {
    todo: { icon: 'ri-checkbox-blank-circle-line', cls: 'text-gray-300 hover:text-gray-500' },
    in_progress: { icon: 'ri-loader-2-line', cls: 'text-sky-400 hover:text-sky-600' },
    done: { icon: 'ri-checkbox-circle-fill', cls: 'text-emerald-500' },
  };

  return (
    <ContractorLayout title={workspaceRow ? '' : 'My Projects'}>
      {/* ── Workspace ── */}
      {workspaceRow && wsProject && (
        <div className="flex flex-col -mx-4 -my-4 md:-mx-6 md:-my-6 min-h-full">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/70 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <button onClick={() => { setWorkspaceRow(null); setTaskFilter('all'); }}
                className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 cursor-pointer transition-colors text-sm">
                <i className="ri-arrow-left-s-line text-base"></i>
                <span>My Projects</span>
              </button>
              <i className="ri-arrow-right-s-line text-gray-300 text-sm"></i>
              <span className="text-sm text-gray-500 font-medium truncate max-w-[180px]">{wsProject.project_name}</span>
              <i className="ri-arrow-right-s-line text-gray-300 text-sm"></i>
              <div className="flex items-center gap-1.5">
                <i className="ri-layout-grid-line text-indigo-500 text-sm"></i>
                <span className="text-sm font-semibold text-gray-900">Workspace</span>
              </div>
            </div>
            <span className="text-xs text-gray-400 hidden sm:block">{wsProject.client_name}{wsProject.service ? ` · ${wsProject.service}` : ''}</span>
          </div>

          <div className="flex-1 p-6 md:p-7 space-y-6 overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Tasks', value: wsTasks.length, icon: 'ri-task-line', cls: 'text-gray-700' },
                { label: 'Done', value: wsDone, icon: 'ri-checkbox-circle-line', cls: 'text-emerald-600' },
                { label: 'In Progress', value: wsTasks.filter(t => t.status === 'in_progress').length, icon: 'ri-loader-2-line', cls: 'text-sky-600' },
                { label: 'Overdue', value: wsTasks.filter(t => !!wsIsOverdue(t)).length, icon: 'ri-alarm-warning-line', cls: 'text-rose-600' },
              ].map(s => (
                <div key={s.label} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <i className={`${s.icon} ${s.cls} text-sm`}></i>
                    <span className="text-[11px] text-gray-400 uppercase tracking-wide font-medium">{s.label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-6">
              {/* Task list */}
              <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-800">Tasks</h3>
                      {wsTasks.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${wsPct}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{wsDone}/{wsTasks.length}</span>
                        </div>
                      )}
                    </div>
                    <button onClick={openAddTask}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                      <i className="ri-add-line"></i> Add Task
                    </button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'todo', 'in_progress', 'done', 'overdue'] as const).map(f => {
                      const labels: Record<string, string> = { all: 'All', todo: 'To Do', in_progress: 'Active', done: 'Done', overdue: 'Overdue' };
                      const counts: Record<string, number> = {
                        all: wsTasks.length,
                        todo: wsTasks.filter(t => t.status === 'todo').length,
                        in_progress: wsTasks.filter(t => t.status === 'in_progress').length,
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
                ) : (
                  <div className="divide-y divide-gray-50">
                    {wsFiltered.map(task => {
                      const overdue = !!wsIsOverdue(task);
                      const si = wsStatusIcon[task.status];
                      const priorityCls = { high: 'bg-rose-400', medium: 'bg-amber-400', low: 'bg-gray-300' }[task.priority];
                      const assignee = wsTeam.find(m => m.id === task.assigned_to);
                      return (
                        <div key={task.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group">
                          <button onClick={() => cycleTask(task)} className={`flex-shrink-0 cursor-pointer transition-colors mt-0.5 ${si.cls}`}>
                            <i className={`${si.icon} text-lg`}></i>
                          </button>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${priorityCls}`}></span>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditTask(task)}>
                            <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                            {task.description && <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{task.description}</p>}
                            {assignee && <p className="text-[11px] text-gray-400 mt-0.5">{assignee.full_name}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {task.due_date && (
                              <span className={`text-xs font-medium ${overdue ? 'text-rose-500' : 'text-gray-400'}`}>
                                {overdue ? 'Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <button onClick={() => openEditTask(task)}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer transition-all">
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Delete this task?')) deleteTask(task.id); }}
                              disabled={deletingTaskId === task.id}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-rose-500 cursor-pointer transition-all disabled:opacity-40">
                              <i className="ri-delete-bin-line text-sm"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: project info */}
              <div className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">
                {/* Project card */}
                <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Project</p>
                    <p className="font-semibold text-gray-900 text-sm">{wsProject.project_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{wsProject.client_name}</p>
                  </div>
                  {(wsProject.start_date || wsProject.deadline) && (
                    <div className="space-y-1 text-xs text-gray-500">
                      {wsProject.start_date && <p><span className="text-gray-400">Start </span>{new Date(wsProject.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                      {wsProject.deadline && <p className={wsProject.deadline < wsToday && wsProject.status !== 'completed' ? 'text-rose-500 font-medium' : ''}><span className="text-gray-400">Due </span>{new Date(wsProject.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
                    </div>
                  )}
                  {wsProject.notes && <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-50 pt-3">{wsProject.notes}</p>}
                </div>

                {/* Payout */}
                {(() => {
                  const totalCosts = wsProject.hub_project_costs.reduce((s, x) => s + x.amount, 0);
                  const netProfit = wsProject.contract_price - totalCosts;
                  const isFixed = workspaceRow!.payout_type === 'fixed';
                  const myCut = isFixed ? (workspaceRow!.fixed_amount ?? 0) : netProfit * (workspaceRow!.percentage / 100);
                  const payouts = workspaceRow!.hub_project_contractor_payouts ?? [];
                  const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);
                  const isFullyPaid = totalPaidOut >= myCut && myCut > 0;
                  const payoutPct = myCut > 0 ? Math.min((totalPaidOut / myCut) * 100, 100) : 0;
                  return (
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
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

                {/* Team */}
                {wsTeam.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Team</p>
                    <div className="space-y-2.5">
                      {wsTeam.map(m => (
                        <div key={m.id} className="flex items-center gap-2.5">
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt={m.full_name} className="w-7 h-7 rounded-full object-cover object-top flex-shrink-0" />
                            : <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">{m.full_name[0]}</div>
                          }
                          <span className="text-sm text-gray-700 truncate">{m.full_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Project list ── */}
      {!workspaceRow && (loading ? (
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
        <div className="space-y-6">

          {/* Greeting */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {tasks.length > 0 && <> · {subline}</>}
            </p>
          </div>

          {/* Dashboard: ring + task feed */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-6 flex flex-col items-center justify-center gap-5">
                <ProgressRing pct={pct} size={128} />
                <div className="grid grid-cols-3 gap-1 w-full text-center">
                  {[
                    { label: 'Done', value: doneTasks.length, color: 'text-emerald-600', dot: 'bg-emerald-400' },
                    { label: 'Active', value: inProgressTasks.length, color: 'text-blue-500', dot: 'bg-blue-400' },
                    { label: 'Todo', value: todoTasks.length, color: 'text-gray-400', dot: 'bg-gray-200' },
                  ].map(s => (
                    <div key={s.label}>
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <div className="flex items-center justify-center gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                        <p className="text-[10px] text-gray-400">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-2xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <i className="ri-task-line text-white text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {todayDueTasks.length > 0 ? 'Due today' : overdueTasks.length > 0 ? 'Overdue' : inProgressTasks.length > 0 ? 'In progress' : 'Up next'}
                    </p>
                    <p className="text-[11px] text-gray-400">{tasks.length} total tasks · {doneTasks.length} done</p>
                  </div>
                  {overdueTasks.length > 0 && (
                    <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                      {overdueTasks.length} overdue
                    </span>
                  )}
                </div>
                {featuredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <i className="ri-checkbox-circle-fill text-emerald-400 text-3xl"></i>
                    <p className="text-sm text-gray-400 font-medium">All tasks complete</p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {featuredTasks.slice(0, 8).map(t => (
                      <TaskRow key={t.id} task={t} projectName={getProjectName(t.project_id)} />
                    ))}
                    {featuredTasks.length > 8 && (
                      <p className="text-xs text-gray-400 pt-2 pl-3">+{featuredTasks.length - 8} more</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Project cards */}
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Active Projects</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map(r => (
                  <ProjectCard key={r.id} row={r}
                    projectTasks={tasks.filter(t => t.project_id === r.hub_projects?.id)}
                    onClick={() => { setWorkspaceRow(r); setTaskFilter('all'); }}
                  />
                ))}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Other</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {other.map(r => (
                  <ProjectCard key={r.id} row={r}
                    projectTasks={tasks.filter(t => t.project_id === r.hub_projects?.id)}
                    onClick={() => { setWorkspaceRow(r); setTaskFilter('all'); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Receipt lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Receipt" className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setLightboxUrl(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black cursor-pointer">
              <i className="ri-close-line text-sm"></i>
            </button>
            <a href={lightboxUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 text-white text-xs rounded-lg hover:bg-black">
              <i className="ri-external-link-line text-xs"></i> Open full size
            </a>
          </div>
        </div>
      )}

      {/* Task add/edit modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{editingTask ? 'Edit Task' : 'Add Task'}</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Task Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  value={taskForm.description}
                  onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Add more details..."
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm(f => ({ ...f, priority: e.target.value as ProjectTask['priority'] }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Due Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                  />
                </div>
              </div>
              {wsTeam.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Assign To <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={taskForm.assigned_to}
                    onChange={e => setTaskForm(f => ({ ...f, assigned_to: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option value="">Unassigned</option>
                    {wsTeam.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={() => setShowTaskModal(false)}
                className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button onClick={saveTask} disabled={taskSaving || !taskForm.title.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors">
                {taskSaving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ContractorLayout>
  );
}
