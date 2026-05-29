import { useEffect, useState } from 'react';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

const fmt = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ContractorPayout { id: number; amount: number; paid_at: string; notes: string | null; receipt_url: string | null; }

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
  hub_projects: ProjectRow['hub_projects'][];
}

interface ProjectTask {
  id: number;
  project_id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
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
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold text-gray-900" style={{ fontSize: size < 60 ? 13 : 22 }}>{pct}%</span>
        {size >= 100 && <span className="text-[10px] text-gray-400 mt-0.5">complete</span>}
      </div>
    </div>
  );
}

// ── Task row ───────────────────────────────────────────────────────────────
function TaskRow({ task, projectName }: { task: ProjectTask; projectName?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = task.due_date && task.due_date < today && task.status !== 'done';
  const priorityCls = { high: 'bg-rose-400', medium: 'bg-amber-400', low: 'bg-gray-300' }[task.priority];
  const statusIcon =
    task.status === 'done' ? 'ri-checkbox-circle-fill text-emerald-500' :
    task.status === 'in_progress' ? 'ri-loader-2-line text-blue-400' :
    'ri-checkbox-blank-circle-line text-gray-300';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/60 transition-colors">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityCls}`}></span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
        {projectName && <p className="text-[11px] text-gray-400 truncate">{projectName}</p>}
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

// ── Project card ───────────────────────────────────────────────────────────
function ProjectCard({ row, projectTasks, onReceiptClick }: {
  row: ProjectRow;
  projectTasks: ProjectTask[];
  onReceiptClick: (url: string) => void;
}) {
  const p = row.hub_projects;
  if (!p) return null;

  const totalPaid = p.hub_project_payments.reduce((s, x) => s + x.amount, 0);
  const totalCosts = p.hub_project_costs.reduce((s, x) => s + x.amount, 0);
  const netProfit = p.contract_price - totalCosts;
  const isFixed = row.payout_type === 'fixed';
  const myCut = isFixed ? (row.fixed_amount ?? 0) : netProfit * (row.percentage / 100);
  const payouts = row.hub_project_contractor_payouts ?? [];
  const totalPaidOut = payouts.reduce((s, x) => s + x.amount, 0);
  const payoutPct = myCut > 0 ? Math.min((totalPaidOut / myCut) * 100, 100) : 0;
  const isFullyPaid = totalPaidOut >= myCut && myCut > 0;
  const tasksDone = projectTasks.filter(t => t.status === 'done').length;
  const tasksPct = projectTasks.length > 0 ? Math.round((tasksDone / projectTasks.length) * 100) : 0;

  const statusColors: Record<string, string> = {
    ongoing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    paused: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const statusLabels: Record<string, string> = { ongoing: 'Active', completed: 'Done', paused: 'Paused', cancelled: 'Archived' };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base leading-snug line-clamp-2">{p.project_name}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{p.client_name}{p.service ? ` · ${p.service}` : ''}</p>
          {p.deadline && (
            <p className="text-xs text-gray-400 mt-0.5">
              Due {new Date(p.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide flex-shrink-0 ${statusColors[p.status] ?? statusColors.ongoing}`}>
          {statusLabels[p.status] ?? p.status}
        </span>
      </div>

      {/* Task mini progress */}
      {projectTasks.length > 0 && (
        <div className="flex items-center gap-3 bg-gray-50/80 rounded-2xl px-3 py-2.5">
          <ProgressRing pct={tasksPct} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">{tasksDone} / {projectTasks.length} tasks done</p>
            <div className="flex gap-2 mt-1">
              {projectTasks.filter(t => t.status === 'in_progress').length > 0 && (
                <span className="text-[11px] text-blue-500 font-medium">{projectTasks.filter(t => t.status === 'in_progress').length} active</span>
              )}
              {projectTasks.filter(t => t.status === 'todo').length > 0 && (
                <span className="text-[11px] text-gray-400">{projectTasks.filter(t => t.status === 'todo').length} todo</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{isFixed ? 'Your fee (fixed)' : `Your cut (${row.percentage}%)`}</span>
          <span className="font-bold text-gray-900">{fmt(myCut)}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${payoutPct}%` }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span>{fmt(totalPaidOut)} received</span>
          {isFullyPaid
            ? <span className="text-emerald-600 font-medium">Paid in full ✓</span>
            : <span>{(100 - payoutPct).toFixed(0)}% pending</span>
          }
        </div>
      </div>

      {/* Past payouts */}
      {payouts.length > 0 && (
        <div className="space-y-1 border-t border-gray-100 pt-3">
          {payouts.map(pp => (
            <div key={pp.id} className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
              <i className="ri-check-line text-emerald-400 text-[10px]"></i>
              <span className="font-medium text-gray-600">{fmt(pp.amount)}</span>
              <span>· {new Date(pp.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {pp.notes && <span>· {pp.notes}</span>}
              {pp.receipt_url && (
                <button onClick={() => onReceiptClick(pp.receipt_url!)} className="cursor-pointer text-sky-500 hover:text-sky-700 flex items-center gap-1">
                  <i className="ri-image-line text-[10px]"></i> View receipt
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ContractorProjectsPage() {
  const { hubUser } = useAuth();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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
          hub_projects: row.hub_projects[0],
        }));
        setRows(normalized);

        const projectIds = normalized.map(r => r.hub_projects?.id).filter(Boolean) as number[];
        if (projectIds.length > 0) {
          const { data: taskData } = await supabase
            .from('hub_project_tasks')
            .select('id, project_id, title, status, priority, due_date')
            .in('project_id', projectIds);
          setTasks((taskData as ProjectTask[]) ?? []);
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

  // Tasks to show in the panel: today → overdue → in_progress → todo
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

  return (
    <ContractorLayout title="My Projects">
      {loading ? (
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

          {/* ── Greeting ── */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{greeting}, {firstName} 👋</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {tasks.length > 0 && <> · {subline}</>}
            </p>
          </div>

          {/* ── Dashboard: ring + task feed ── */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">

              {/* Progress ring card */}
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

              {/* Task feed */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 p-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-2xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <i className="ri-task-line text-white text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {todayDueTasks.length > 0 ? "Due today" : overdueTasks.length > 0 ? "Overdue" : inProgressTasks.length > 0 ? "In progress" : "Up next"}
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

          {/* ── Project cards ── */}
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Active Projects</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map(r => (
                  <ProjectCard key={r.id} row={r}
                    projectTasks={tasks.filter(t => t.project_id === r.hub_projects?.id)}
                    onReceiptClick={setLightboxUrl}
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
                    onReceiptClick={setLightboxUrl}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setLightboxUrl(null)}>
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
    </ContractorLayout>
  );
}
