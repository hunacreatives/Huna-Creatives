import { useEffect, useRef, useState } from 'react';
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
    drive_url: string | null;
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
  start_date: string | null;
  assigned_to: string | null;
}

const emptyTaskForm = () => ({
  title: '',
  description: '',
  status: 'todo' as ProjectTask['status'],
  priority: 'medium' as ProjectTask['priority'],
  start_date: '',
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

// ── Calendar view (replaces Gantt) ────────────────────────────────────────
function GanttTimeline({ tasks, projectStart, projectEnd, today }: {
  tasks: ProjectTask[];
  projectStart: string | null;
  projectEnd: string | null;
  today: string;
}) {
  const anchor = new Date(today + 'T00:00:00');
  const [viewMonth, setViewMonth] = useState<Date>(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(today);

  // Suppress unused-variable warnings for projectStart / projectEnd — kept for API compatibility
  void projectStart; void projectEnd;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));
  const goToday   = () => { setViewMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1)); setSelectedDate(today); };

  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Build calendar grid: pad to start on Monday
  const firstDay = new Date(year, month, 1);
  // getDay(): 0=Sun…6=Sat → convert to Mon-based (0=Mon…6=Sun)
  const startPad = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

  // Build a map: dateStr -> tasks that span that date (start_date → due_date range)
  // Tasks with only a due_date appear as a single dot on the due date
  const tasksByDate: Record<string, ProjectTask[]> = {};
  const pad2 = (n: number) => String(n).padStart(2, '0');
  for (const t of tasks) {
    if (!t.due_date) continue;
    const start = t.start_date ?? t.due_date;
    const end = t.due_date;
    const cur = new Date(start + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    while (cur <= endD) {
      const key = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}-${pad2(cur.getDate())}`;
      (tasksByDate[key] ??= []).push(t);
      cur.setDate(cur.getDate() + 1);
    }
  }

  const PALETTE = [
    { chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400' },
    { chip: 'bg-sky-100 text-sky-700',       dot: 'bg-sky-400' },
    { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
    { chip: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
    { chip: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-400' },
    { chip: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400' },
    { chip: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-400' },
    { chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
    { chip: 'bg-lime-100 text-lime-700',     dot: 'bg-lime-400' },
    { chip: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-400' },
  ];
  const colorMap = Object.fromEntries(tasks.map((t, i) => [t.id, PALETTE[i % PALETTE.length]]));

  const chipCls = (t: ProjectTask): string => {
    if (t.due_date && t.due_date < today && t.status !== 'done') return 'bg-rose-100 text-rose-600';
    return colorMap[t.id]?.chip ?? 'bg-indigo-100 text-indigo-700';
  };

  const dotCls = (t: ProjectTask): string => {
    if (t.due_date && t.due_date < today && t.status !== 'done') return 'bg-rose-400';
    return colorMap[t.id]?.dot ?? 'bg-indigo-400';
  };

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <i className="ri-calendar-line text-indigo-400 text-base"></i>
          <h3 className="font-semibold text-gray-800 text-sm">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
            <i className="ri-arrow-left-s-line text-base"></i>
          </button>
          <button onClick={goToday} className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer">
            Today
          </button>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer">
            <i className="ri-arrow-right-s-line text-base"></i>
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className={`py-2 text-center text-[10px] font-semibold uppercase tracking-wide ${d === 'Sat' || d === 'Sun' ? 'text-gray-300' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const dayNum = idx - startPad + 1;
          const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
          const pad2 = (n: number) => String(n).padStart(2, '0');
          const cellDate = inMonth ? `${year}-${pad2(month + 1)}-${pad2(dayNum)}` : null;
          const isToday = cellDate === today;
          const isSelected = cellDate !== null && cellDate === selectedDate;
          const colIdx = idx % 7; // 5=Sat, 6=Sun
          const isWeekend = colIdx === 5 || colIdx === 6;
          const dayTasks = cellDate ? (tasksByDate[cellDate] ?? []) : [];
          const visible = dayTasks.slice(0, 2);
          const extra = dayTasks.length - visible.length;

          return (
            <div
              key={idx}
              onClick={() => inMonth && cellDate && setSelectedDate(isSelected ? null : cellDate)}
              className={[
                'min-h-[72px] p-1.5 border-b border-r border-gray-50 flex flex-col gap-0.5',
                !inMonth ? 'bg-gray-50/30' : '',
                isWeekend && inMonth ? 'bg-gray-50/50' : '',
                isSelected ? 'ring-2 ring-inset ring-orange-300' : '',
                inMonth ? 'cursor-pointer hover:bg-orange-50/30 transition-colors' : '',
              ].filter(Boolean).join(' ')}
            >
              {/* Date number */}
              <div className="flex justify-end">
                <span className={[
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                  isToday ? 'bg-orange-500 text-white font-bold' : '',
                  !inMonth ? 'text-gray-300' : isToday ? '' : 'text-gray-600',
                ].filter(Boolean).join(' ')}>
                  {inMonth ? dayNum : ''}
                </span>
              </div>
              {/* Task chips */}
              <div className="flex flex-col gap-0.5 flex-1">
                {visible.map(t => {
                  const isStart = cellDate === (t.start_date ?? t.due_date);
                  const isEnd = cellDate === t.due_date;
                  const hasRange = t.start_date && t.start_date !== t.due_date;
                  return (
                    <div key={t.id} className={`flex items-center gap-1 py-0.5 text-[10px] font-medium truncate ${chipCls(t)} ${
                      hasRange
                        ? `px-1.5 ${isStart ? 'rounded-l-md rounded-r-none' : isEnd ? 'rounded-r-md rounded-l-none' : 'rounded-none'}`
                        : 'px-1.5 rounded'
                    }`}>
                      {(!hasRange || isStart) && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotCls(t)}`}></span>}
                      {isStart && <span className="truncate">{t.title}</span>}
                    </div>
                  );
                })}
                {extra > 0 && (
                  <div className="text-[10px] text-gray-400 px-1.5">+{extra} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day task list */}
      {selectedDate && (
        <div className="border-t border-gray-100 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedTasks.length === 0 ? (
            <p className="text-xs text-gray-300">No tasks due on this day</p>
          ) : (
            <div className="space-y-1.5">
              {selectedTasks.map(t => {
                const isOverdue = t.due_date && t.due_date < today && t.status !== 'done';
                const statusIcon = t.status === 'done' ? 'ri-checkbox-circle-fill text-emerald-500' : t.status === 'in_progress' ? 'ri-loader-2-line text-sky-400' : 'ri-checkbox-blank-circle-line text-gray-300';
                return (
                  <div key={t.id} className="flex items-center gap-2.5">
                    <i className={`${statusIcon} text-base flex-shrink-0`}></i>
                    <span className={`text-sm flex-1 truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                    {isOverdue && <span className="text-[11px] text-rose-500 font-medium flex-shrink-0">Overdue</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
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
  const [search, setSearch] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [wsSearch, setWsSearch] = useState('');
  const [wsSearchOpen, setWsSearchOpen] = useState(false);
  const wsSearchRef = useRef<HTMLDivElement>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [taskComments, setTaskComments] = useState<{ id: number; user_id: string; body: string; created_at: string; hub_users: { full_name: string; avatar_url: string | null } | null }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(0);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('edit');
  const [, setTick] = useState(0); // forces re-render for live timestamps
  const [taskCommentCounts, setTaskCommentCounts] = useState<Record<number, number>>({});
  const [activityLog, setActivityLog] = useState<{
    id: number; action: string; entity_title: string; entity_id: number | null;
    meta: Record<string, unknown> | null; created_at: string;
    hub_users: { full_name: string; avatar_url: string | null } | null;
  }[]>([]);

  const cycleTask = async (task: ProjectTask) => {
    const next: Record<string, ProjectTask['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = next[task.status];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await supabase.from('hub_project_tasks').update({ status: newStatus }).eq('id', task.id);
    logActivity('task_status_changed', task.title, task.id, { from: task.status, to: newStatus });
  };

  const openAddTask = () => {
    setEditingTask(null);
    setTaskForm(emptyTaskForm());
    setDrawerMode('edit');
    setShowTaskModal(true);
  };

  const openViewTask = (task: ProjectTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      start_date: task.start_date ?? '',
      due_date: task.due_date ?? '',
      assigned_to: task.assigned_to ?? '',
    });
    setDrawerMode('view');
    setShowTaskModal(true);
  };

  const openEditTask = (task: ProjectTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      priority: task.priority,
      start_date: task.start_date ?? '',
      due_date: task.due_date ?? '',
      assigned_to: task.assigned_to ?? '',
    });
    setDrawerMode('edit');
    setShowTaskModal(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim() || !workspaceRow?.hub_projects?.id) return;
    setTaskSaving(true);
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      status: taskForm.status,
      priority: taskForm.priority,
      start_date: taskForm.start_date || null,
      due_date: taskForm.due_date || null,
      assigned_to: taskForm.assigned_to || null,
    };
    if (editingTask) {
      await supabase.from('hub_project_tasks').update(payload).eq('id', editingTask.id);
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...payload } : t));
      logActivity('task_updated', taskForm.title.trim(), editingTask.id);
    } else {
      const { data } = await supabase
        .from('hub_project_tasks')
        .insert({ ...payload, project_id: workspaceRow.hub_projects.id })
        .select()
        .single();
      if (data) {
        setTasks(prev => [...prev, data as ProjectTask]);
        logActivity('task_created', taskForm.title.trim(), (data as ProjectTask).id);
      }
    }
    setTaskSaving(false);
    setShowTaskModal(false);
    setMentionOpen(false); setMentionQuery('');
  };

  const deleteTask = async (taskId: number) => {
    setDeletingTaskId(taskId);
    const t = tasks.find(t => t.id === taskId);
    if (t) logActivity('task_deleted', t.title, t.id);
    await supabase.from('hub_project_tasks').delete().eq('id', taskId);
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

  // Fetch activity log when workspace opens
  useEffect(() => {
    const projectId = workspaceRow?.hub_projects?.id;
    if (!projectId) { setActivityLog([]); return; }
    supabase
      .from('hub_project_activity')
      .select('id, action, entity_title, entity_id, meta, created_at, hub_users(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => setActivityLog((data as any) ?? []));
  }, [workspaceRow?.hub_projects?.id]);

  // Load comments when editing task changes
  useEffect(() => {
    if (!editingTask) { setTaskComments([]); setNewComment(''); return; }
    supabase
      .from('hub_project_task_comments')
      .select('id, user_id, body, created_at, hub_users(full_name, avatar_url)')
      .eq('task_id', editingTask.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setTaskComments((data as any) ?? []));
  }, [editingTask?.id]);

  const postComment = async () => {
    if (!newComment.trim() || !editingTask || !hubUser || postingComment) return;
    setPostingComment(true);
    const { data, error } = await supabase
      .from('hub_project_task_comments')
      .insert({ task_id: editingTask.id, user_id: hubUser.id, body: newComment.trim() })
      .select('id, user_id, body, created_at, hub_users(full_name, avatar_url)')
      .single();
    if (!error && data) {
      setTaskComments(prev => [...prev, data as any]);
      setTaskCommentCounts(prev => ({ ...prev, [editingTask.id]: (prev[editingTask.id] ?? 0) + 1 }));
      setNewComment('');
      logActivity('comment_added', editingTask.title, editingTask.id, { comment: newComment.trim().slice(0, 100) });
      // Fire mention notifications if comment has @mentions
      if (newComment.includes('@') && workspaceRow?.hub_projects?.id) {
        supabase.functions.invoke('notify-task-mention', {
          body: {
            comment_id: (data as any).id,
            task_id: editingTask.id,
            author_id: hubUser.id,
            body: newComment.trim(),
            project_id: workspaceRow.hub_projects.id,
          },
        }).catch(() => {});
      }
    }
    setPostingComment(false);
  };

  const insertMention = (member: { id: string; full_name: string }) => {
    const firstName = member.full_name.split(' ')[0];
    const before = newComment.slice(0, mentionStart);
    const after = newComment.slice(mentionStart + mentionQuery.length + 1); // +1 for @
    setNewComment(`${before}@${firstName} ${after}`);
    setMentionOpen(false);
    setMentionQuery('');
  };

  const deleteComment = async (commentId: number) => {
    await supabase.from('hub_project_task_comments').delete().eq('id', commentId);
    setTaskComments(prev => prev.filter(c => c.id !== commentId));
  };

  const logActivity = async (
    action: string,
    entityTitle: string,
    entityId?: number,
    meta?: Record<string, unknown>
  ) => {
    if (!hubUser || !workspaceRow?.hub_projects?.id) return;
    await supabase.from('hub_project_activity').insert({
      project_id: workspaceRow.hub_projects.id,
      user_id: hubUser.id,
      action,
      entity_type: 'task',
      entity_id: entityId ?? null,
      entity_title: entityTitle,
      meta: meta ?? null,
    });
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
    supabase
      .from('hub_project_contractors')
      .select('id, percentage, payout_type, fixed_amount, payout_status, paid_at, hub_project_contractor_payouts(id, amount, paid_at, notes, receipt_url), hub_projects(id, client_name, project_name, service, contract_price, status, start_date, deadline, notes, drive_url, hub_project_payments(amount), hub_project_costs(amount))')
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
              .select('id, project_id, title, description, status, priority, due_date, start_date, assigned_to')
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

  const searchLower = search.toLowerCase();
  const filteredRows = search
    ? rows.filter(r => {
        const p = r.hub_projects;
        return p?.project_name?.toLowerCase().includes(searchLower)
          || p?.client_name?.toLowerCase().includes(searchLower)
          || p?.service?.toLowerCase().includes(searchLower);
      })
    : rows;
  const active = filteredRows.filter(r => r.hub_projects?.status === 'ongoing');
  const other = filteredRows.filter(r => r.hub_projects?.status !== 'ongoing');

  const wsRow = workspaceRow;
  const wsProject = wsRow?.hub_projects;
  const wsTasks = wsRow ? tasks.filter(t => t.project_id === wsProject?.id) : [];
  const wsToday = new Date().toISOString().slice(0, 10);
  const wsIsOverdue = (t: ProjectTask) => t.due_date && t.due_date < wsToday && t.status !== 'done';
  const wsFiltered = wsTasks.filter(t => {
    if (taskFilter !== 'all' && taskFilter !== 'overdue' && t.status !== taskFilter) return false;
    if (taskFilter === 'overdue' && !wsIsOverdue(t)) return false;
    if (taskSearch) {
      const q = taskSearch.toLowerCase();
      const assignee = wsTeam.find(m => m.id === t.assigned_to);
      return t.title.toLowerCase().includes(q)
        || (t.description ?? '').toLowerCase().includes(q)
        || (assignee?.full_name ?? '').toLowerCase().includes(q);
    }
    return true;
  });
  const wsDone = wsTasks.filter(t => t.status === 'done').length;
  const wsPct = wsTasks.length > 0 ? Math.round((wsDone / wsTasks.length) * 100) : 0;
  const wsTeam = wsRow ? (teamMap[wsProject?.id ?? 0] ?? []) : [];
  const wsStatusIcon: Record<string, { icon: string; cls: string }> = {
    todo: { icon: 'ri-checkbox-blank-circle-line', cls: 'text-gray-300 hover:text-gray-500' },
    in_progress: { icon: 'ri-loader-2-line', cls: 'text-sky-400 hover:text-sky-600' },
    done: { icon: 'ri-checkbox-circle-fill', cls: 'text-emerald-500' },
  };

  const WS_SECTIONS = wsProject ? [
    { label: 'Timeline', description: `${wsProject.project_name} · Gantt chart`, icon: 'ri-bar-chart-grouped-line', id: 'ws-timeline', iconCls: 'bg-indigo-50 text-indigo-500', keywords: ['timeline', 'gantt', 'schedule', 'chart', 'dates', 'calendar', 'deadline'] },
    { label: 'Tasks', description: `${wsProject.project_name} · Task list`, icon: 'ri-task-line', id: 'ws-tasks', iconCls: 'bg-sky-50 text-sky-500', keywords: ['tasks', 'list', 'todo', 'work', 'items', 'progress', 'backlog'] },
    { label: 'Overview', description: `${wsProject.project_name} · Stats & progress`, icon: 'ri-bar-chart-2-line', id: 'ws-stats', iconCls: 'bg-emerald-50 text-emerald-500', keywords: ['stats', 'overview', 'total', 'count', 'numbers', 'summary', 'progress'] },
    { label: 'Payout', description: `${wsProject.project_name} · Your earnings`, icon: 'ri-money-dollar-circle-line', id: 'ws-sidebar', iconCls: 'bg-orange-50 text-[#FF6B35]', keywords: ['payout', 'payment', 'earnings', 'salary', 'money', 'fee', 'income', 'receive'] },
    { label: 'Team', description: `${wsProject.project_name} · Members`, icon: 'ri-team-line', id: 'ws-sidebar', iconCls: 'bg-purple-50 text-purple-500', keywords: ['team', 'members', 'people', 'colleagues', 'who', 'assigned'] },
    { label: 'Notes & Dates', description: `${wsProject.project_name} · Start & deadline`, icon: 'ri-sticky-note-line', id: 'ws-sidebar', iconCls: 'bg-amber-50 text-amber-500', keywords: ['notes', 'brief', 'description', 'info', 'details', 'start', 'due', 'date', 'deadline'] },
  ] : [];

  const WS_FILTERS = [
    { label: 'Overdue Tasks', filter: 'overdue' as const, icon: 'ri-alarm-warning-line', cls: 'bg-rose-50 text-rose-500', count: wsTasks.filter(t => !!wsIsOverdue(t)).length, keywords: ['overdue', 'late', 'past due', 'missed'] },
    { label: 'Active Tasks', filter: 'in_progress' as const, icon: 'ri-loader-2-line', cls: 'bg-sky-50 text-sky-500', count: wsTasks.filter(t => t.status === 'in_progress').length, keywords: ['active', 'in progress', 'working', 'ongoing'] },
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
      <div className={`flex items-center gap-2 bg-white/70 backdrop-blur-sm border rounded-xl px-3 py-2 w-52 transition-all ${wsSearchOpen ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
        <i className="ri-search-line text-gray-400 text-sm flex-shrink-0"></i>
        <input
          type="text"
          value={wsSearch}
          onChange={e => { setWsSearch(e.target.value); setWsSearchOpen(true); }}
          onFocus={() => setWsSearchOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Escape') { setWsSearch(''); setWsSearchOpen(false); }
            if (e.key === 'Enter') {
              if (wsSectionResults[0]) { scrollToSection(wsSectionResults[0].id); setWsSearch(''); setWsSearchOpen(false); }
              else if (wsFilterResults[0]) { setTaskFilter(wsFilterResults[0].filter); setWsSearch(''); setWsSearchOpen(false); }
            }
          }}
          placeholder={`Search ${wsProject.project_name}…`}
          className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-700 min-w-0"
        />
        {wsSearch
          ? <button onClick={() => { setWsSearch(''); setWsSearchOpen(false); }} className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"><i className="ri-close-line text-sm"></i></button>
          : null
        }
      </div>

      {wsSearchOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {/* Empty: show all sections */}
          {!wsQ && (
            <>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold px-4 pt-3 pb-1">In {wsProject.project_name}</p>
              {WS_SECTIONS.map(s => (
                <button key={s.id + s.label}
                  onClick={() => { scrollToSection(s.id); setWsSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconCls}`}>
                    <i className={`${s.icon} text-sm`}></i>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-gray-800">{s.label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{s.description}</p>
                  </div>
                  <i className="ri-arrow-right-s-line text-gray-300 flex-shrink-0"></i>
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
                      onClick={() => { scrollToSection(s.id); setWsSearch(''); setWsSearchOpen(false); }}
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
                      onClick={() => { setTaskFilter(f.filter); setWsSearch(''); setWsSearchOpen(false); scrollToSection('ws-tasks'); }}
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
                        onClick={() => { setTaskSearch(t.title); setTaskFilter('all'); scrollToSection('ws-tasks'); setWsSearch(''); setWsSearchOpen(false); }}
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
    { chip: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400', border: 'border-l-violet-400', cardBg: 'bg-violet-50/30' },
    { chip: 'bg-sky-100 text-sky-700',       dot: 'bg-sky-400',    border: 'border-l-sky-400',    cardBg: 'bg-sky-50/30' },
    { chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', border: 'border-l-emerald-400', cardBg: 'bg-emerald-50/30' },
    { chip: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400',  border: 'border-l-amber-400',  cardBg: 'bg-amber-50/30' },
    { chip: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-400',   border: 'border-l-pink-400',   cardBg: 'bg-pink-50/30' },
    { chip: 'bg-orange-100 text-orange-700', dot: 'bg-orange-400', border: 'border-l-orange-400', cardBg: 'bg-orange-50/30' },
    { chip: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-400',   border: 'border-l-teal-400',   cardBg: 'bg-teal-50/30' },
    { chip: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400', border: 'border-l-indigo-400', cardBg: 'bg-indigo-50/30' },
    { chip: 'bg-rose-100 text-rose-700',     dot: 'bg-rose-400',   border: 'border-l-rose-400',   cardBg: 'bg-rose-50/30' },
    { chip: 'bg-lime-100 text-lime-700',     dot: 'bg-lime-400',   border: 'border-l-lime-400',   cardBg: 'bg-lime-50/30' },
  ];
  const taskColorMap = Object.fromEntries(wsTasks.map((t, i) => [t.id, TASK_PALETTE[i % TASK_PALETTE.length]]));

  const TaskCard = (task: ProjectTask) => {
    const overdue = !!wsIsOverdue(task);
    const si = wsStatusIcon[task.status];
    const color = taskColorMap[task.id] ?? TASK_PALETTE[0];
    const assignee = wsTeam.find(m => m.id === task.assigned_to);
    const commentCount = taskCommentCounts[task.id] ?? 0;
    const daysLeft = task.due_date
      ? Math.ceil((new Date(task.due_date + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000)
      : null;
    const priorityCfg = { high: { label: 'High', cls: 'bg-rose-100 text-rose-600' }, medium: { label: 'Med', cls: 'bg-amber-100 text-amber-600' }, low: { label: 'Low', cls: 'bg-gray-100 text-gray-500' } }[task.priority];
    return (
      <div key={task.id} onClick={() => openViewTask(task)}
        className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group border-l-4 ${color.border}`}>
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <button onClick={e => { e.stopPropagation(); cycleTask(task); }} className={`flex-shrink-0 cursor-pointer mt-0.5 ${si.cls}`}>
            <i className={`${si.icon} text-lg`}></i>
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
            {task.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityCfg.cls}`}>{priorityCfg.label}</span>
        </div>
        {/* Bottom row */}
        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
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
            {assignee && (
              <div className="flex items-center gap-1">
                {assignee.avatar_url
                  ? <img src={assignee.avatar_url} alt={assignee.full_name} className="w-5 h-5 rounded-full object-cover object-top" />
                  : <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                }
                <span className="text-[10px] text-gray-500 font-medium">{assignee.full_name.split(' ')[0]}</span>
              </div>
            )}
            <button onClick={e => { e.stopPropagation(); openEditTask(task); }}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 cursor-pointer transition-all">
              <i className="ri-pencil-line text-sm"></i>
            </button>
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

  return (
    <ContractorLayout
      title={workspaceRow ? undefined : 'My Projects'}
      hideGlobalSearch={!!workspaceRow}
      actions={wsSearchActions}
      titleContent={workspaceRow && wsProject ? (
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => { setWorkspaceRow(null); setTaskFilter('all'); setTaskSearch(''); setWsSearch(''); setWsSearchOpen(false); }}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer transition-all shadow-sm flex-shrink-0">
            <i className="ri-arrow-left-s-line text-base"></i>
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{wsProject.project_name}</p>
            <p className="text-xs text-gray-400 truncate">{wsProject.client_name}{wsProject.service ? ` · ${wsProject.service}` : ''}</p>
          </div>
        </div>
      ) : undefined}
    >
      {/* ── Workspace ── */}
      {workspaceRow && wsProject && (
        <div className="flex flex-col -mx-4 -my-4 md:-mx-6 md:-my-6 min-h-full">

          {/* ── Hero banner ── */}
          {(() => {
            const statusColors: Record<string, string> = { ongoing: 'bg-emerald-100 text-emerald-700', completed: 'bg-blue-100 text-blue-700', paused: 'bg-amber-100 text-amber-700', cancelled: 'bg-gray-100 text-gray-500' };
            const statusLabels: Record<string, string> = { ongoing: 'Active', completed: 'Completed', paused: 'Paused', cancelled: 'Archived' };
            const daysLeft = wsProject.deadline ? Math.ceil((new Date(wsProject.deadline + 'T00:00:00').getTime() - new Date(wsToday + 'T00:00:00').getTime()) / 86400000) : null;
            const isDeadlineOver = daysLeft !== null && daysLeft < 0 && wsProject.status !== 'completed';
            return (
              <div className="px-5 md:px-6 pt-4 pb-2 flex-shrink-0">
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-white/80 shadow-sm px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide ${statusColors[wsProject.status] ?? statusColors.ongoing}`}>
                          {statusLabels[wsProject.status] ?? wsProject.status}
                        </span>
                        {wsProject.service && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{wsProject.service}</span>}
                      </div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{wsProject.project_name}</h2>
                      <p className="text-sm text-gray-400 mt-0.5">{wsProject.client_name}</p>

                      {wsTeam.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex -space-x-2">
                            {wsTeam.slice(0, 5).map(m => (
                              m.avatar_url
                                ? <img key={m.id} src={m.avatar_url} alt={m.full_name} title={m.full_name} className="w-6 h-6 rounded-full border-2 border-white object-cover object-top shadow-sm" />
                                : <div key={m.id} title={m.full_name} className="w-6 h-6 rounded-full border-2 border-white bg-indigo-400 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">{m.full_name[0]}</div>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">{wsTeam.length} member{wsTeam.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {daysLeft !== null && (
                        <div className="mt-3">
                          {isDeadlineOver ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full font-medium">
                              <i className="ri-alarm-warning-line text-xs"></i>{Math.abs(daysLeft)}d overdue
                            </span>
                          ) : daysLeft === 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                              <i className="ri-time-line text-xs"></i>Due today
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${daysLeft <= 7 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                              <i className="ri-calendar-line text-xs"></i>
                              {daysLeft}d left · {new Date(wsProject.deadline! + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: ring + breakdown */}
                    {/* Google Drive button */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      {wsProject.drive_url ? (
                        <a href={wsProject.drive_url} target="_blank" rel="noopener noreferrer"
                          className="flex flex-col items-center gap-2 px-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer w-28 text-center">
                          <svg viewBox="0 0 87.3 78" className="w-9 h-9" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                          <span className="text-xs font-semibold text-gray-700 group-hover:text-blue-600 transition-colors leading-tight">Project Files</span>
                          <span className="text-[10px] text-gray-400">Google Drive</span>
                        </a>
                      ) : (
                        <div className="flex flex-col items-center gap-2 px-4 py-3.5 bg-gray-50 border border-dashed border-gray-300 rounded-2xl w-28 text-center opacity-60">
                          <svg viewBox="0 0 87.3 78" className="w-9 h-9 grayscale" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                          <span className="text-xs font-medium text-gray-500 leading-tight">No Drive linked</span>
                          <span className="text-[10px] text-gray-400">Ask your admin</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div id="ws-scroll" className="flex-1 px-5 md:px-6 pb-6 space-y-5 overflow-y-auto">
            {/* Stats */}
            <div id="ws-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: wsTasks.length, icon: 'ri-task-line', iconBg: 'bg-gray-100', iconClr: 'text-gray-500', valClr: 'text-gray-800' },
                { label: 'Done', value: wsDone, icon: 'ri-checkbox-circle-fill', iconBg: 'bg-emerald-100', iconClr: 'text-emerald-600', valClr: 'text-emerald-700' },
                { label: 'In Progress', value: wsTasks.filter(t => t.status === 'in_progress').length, icon: 'ri-loader-2-line', iconBg: 'bg-sky-100', iconClr: 'text-sky-600', valClr: 'text-sky-700' },
                { label: 'Overdue', value: wsTasks.filter(t => !!wsIsOverdue(t)).length, icon: 'ri-alarm-warning-line', iconBg: 'bg-rose-100', iconClr: 'text-rose-500', valClr: 'text-rose-600' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
                  <div className={`w-8 h-8 rounded-xl ${s.iconBg} flex items-center justify-center mb-3`}>
                    <i className={`${s.icon} ${s.iconClr} text-sm`}></i>
                  </div>
                  <p className={`text-2xl font-bold ${s.valClr} leading-none`}>{s.value}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div id="ws-timeline">
              <GanttTimeline
                tasks={wsTasks}
                projectStart={wsProject.start_date}
                projectEnd={wsProject.deadline}
                today={wsToday}
              />
            </div>

            <div className="flex gap-6">
              {/* Task list */}
              <div id="ws-tasks" className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap">
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
                      const todoTasks     = wsFiltered.filter(t => t.status === 'todo' && !wsIsOverdue(t));
                      const doneTasks     = wsFiltered.filter(t => t.status === 'done');

                      type GroupKey = 'overdue' | 'in_progress' | 'todo' | 'done';
                      const groups: { key: GroupKey; label: string; icon: string; headerCls: string; iconCls: string; labelCls: string; badgeCls: string; chevronCls: string; tasks: ProjectTask[] }[] = [
                        { key: 'overdue',     label: 'Overdue',     icon: 'ri-alarm-warning-line', headerCls: 'bg-rose-50/60',  iconCls: 'text-rose-500',    labelCls: 'text-rose-700',    badgeCls: 'bg-rose-100 text-rose-600',    chevronCls: 'text-rose-300',    tasks: overdueTasks },
                        { key: 'in_progress', label: 'In Progress', icon: 'ri-loader-2-line',       headerCls: 'bg-sky-50/50',   iconCls: 'text-sky-500',     labelCls: 'text-sky-700',     badgeCls: 'bg-sky-100 text-sky-600',      chevronCls: 'text-sky-400',     tasks: inProgTasks  },
                        { key: 'todo',        label: 'To Do',       icon: 'ri-checkbox-blank-circle-line', headerCls: 'bg-gray-50/60', iconCls: 'text-gray-400', labelCls: 'text-gray-600', badgeCls: 'bg-gray-100 text-gray-500',  chevronCls: 'text-gray-300',    tasks: todoTasks    },
                        { key: 'done',        label: 'Done',        icon: 'ri-checkbox-circle-fill', headerCls: 'bg-emerald-50/40', iconCls: 'text-emerald-500', labelCls: 'text-emerald-700', badgeCls: 'bg-emerald-100 text-emerald-600', chevronCls: 'text-emerald-300', tasks: doneTasks },
                      ].filter(g => g.tasks.length > 0);

                      return groups.map(g => {
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
              </div>

              {/* Right: project info */}
              <div id="ws-sidebar" className="hidden lg:flex flex-col gap-4 w-64 flex-shrink-0">
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
                  {!wsProject.start_date && !wsProject.deadline && !wsProject.notes && (
                    <p className="text-xs text-gray-300 text-center py-2">No dates set</p>
                  )}
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

                {/* Team */}
                {wsTeam.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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

                {/* Activity feed */}
                {activityLog.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Activity</p>
                    <div className="space-y-3">
                      {activityLog.slice(0, 8).map(a => {
                        const u = a.hub_users;
                        const icons: Record<string, string> = {
                          task_created: 'ri-add-circle-line text-emerald-500',
                          task_updated: 'ri-edit-line text-indigo-500',
                          task_status_changed: 'ri-refresh-line text-sky-500',
                          task_deleted: 'ri-delete-bin-line text-rose-500',
                          comment_added: 'ri-chat-3-line text-amber-500',
                          task_assigned: 'ri-user-add-line text-purple-500',
                        };
                        const labels: Record<string, (a: typeof activityLog[0]) => string> = {
                          task_created: (a) => `created "${a.entity_title}"`,
                          task_updated: (a) => `updated "${a.entity_title}"`,
                          task_status_changed: (a) => `moved "${a.entity_title}" to ${(a.meta as any)?.to?.replace('_', ' ') ?? ''}`,
                          task_deleted: (a) => `deleted "${a.entity_title}"`,
                          comment_added: (a) => `commented on "${a.entity_title}"`,
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

          {/* No search results */}
          {search && active.length === 0 && other.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <i className="ri-search-line text-3xl text-gray-200"></i>
              <p className="text-sm text-gray-400">No projects match <span className="font-medium text-gray-600">"{search}"</span></p>
              <button onClick={() => setSearch('')} className="text-xs text-indigo-500 hover:underline cursor-pointer">Clear search</button>
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
                    onClick={() => { setWorkspaceRow(r); setTaskFilter('all'); setTaskSearch(''); }}
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
                    onClick={() => { setWorkspaceRow(r); setTaskFilter('all'); setTaskSearch(''); }}
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
      {/* ── Task drawer ── */}
      {showTaskModal && (() => {
        const dueD = taskForm.due_date ? new Date(taskForm.due_date + 'T00:00:00') : null;
        const startD = taskForm.start_date ? new Date(taskForm.start_date + 'T00:00:00') : null;
        const todayD = new Date(wsToday + 'T00:00:00');
        const daysLeft = dueD ? Math.ceil((dueD.getTime() - todayD.getTime()) / 86400000) : null;
        const duration = (startD && dueD) ? Math.ceil((dueD.getTime() - startD.getTime()) / 86400000) : null;
        const statusCfg = {
          todo:        { label: 'To Do',       icon: 'ri-checkbox-blank-circle-line', bg: 'bg-gray-100',   text: 'text-gray-600' },
          in_progress: { label: 'In Progress', icon: 'ri-loader-2-line',              bg: 'bg-sky-100',    text: 'text-sky-700'  },
          done:        { label: 'Done',         icon: 'ri-checkbox-circle-fill',       bg: 'bg-emerald-100',text: 'text-emerald-700' },
        };
        const assignee = wsTeam.find(m => m.id === taskForm.assigned_to);
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => { setShowTaskModal(false); setMentionOpen(false); setMentionQuery(''); }} />
            <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[460px] bg-white shadow-2xl flex flex-col" style={{ borderLeft: '1px solid #f3f4f6' }}>

              {/* Dark header — shared between view and edit */}
              <div className="bg-[#111827] px-5 pt-5 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <i className="ri-folder-line text-xs"></i>
                    <span>{wsProject?.project_name}</span>
                    <i className="ri-arrow-right-s-line text-xs"></i>
                    <span>{editingTask ? (drawerMode === 'view' ? 'Task detail' : 'Edit task') : 'New task'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {drawerMode === 'view' && editingTask && (
                      <button onClick={() => setDrawerMode('edit')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer transition-colors text-xs font-medium">
                        <i className="ri-pencil-line text-[11px]"></i> Edit
                      </button>
                    )}
                    {drawerMode === 'edit' && editingTask && (
                      <button onClick={() => setDrawerMode('view')} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 cursor-pointer transition-colors text-xs">
                        <i className="ri-eye-line text-[11px]"></i> View
                      </button>
                    )}
                    <button onClick={() => { setShowTaskModal(false); setMentionOpen(false); setMentionQuery(''); }} className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 cursor-pointer transition-colors ml-1">
                      <i className="ri-close-line text-sm"></i>
                    </button>
                  </div>
                </div>

                {/* Title — editable in edit, read-only in view */}
                {drawerMode === 'edit' ? (
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Task title"
                    autoFocus
                    className="w-full text-lg font-semibold text-white placeholder-white/25 bg-transparent outline-none border-none leading-snug mb-3"
                  />
                ) : (
                  <h2 className="text-lg font-semibold text-white leading-snug mb-3">{editingTask?.title}</h2>
                )}

                {/* Status + Priority row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {drawerMode === 'edit' ? (
                    <>
                      {(['todo', 'in_progress', 'done'] as const).map(s => {
                        const c = statusCfg[s];
                        const active = taskForm.status === s;
                        return (
                          <button key={s} onClick={() => setTaskForm(f => ({ ...f, status: s }))}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${active ? `${c.bg} ${c.text}` : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>
                            <i className={`${c.icon} text-[10px]`}></i>{c.label}
                          </button>
                        );
                      })}
                      <div className="w-px h-3 bg-white/20 mx-0.5"></div>
                      {(['low', 'medium', 'high'] as const).map(p => {
                        const cfg = { low: { label: 'Low', active: 'bg-gray-200 text-gray-700' }, medium: { label: 'Med', active: 'bg-amber-400 text-white' }, high: { label: 'High', active: 'bg-rose-500 text-white' } }[p];
                        return (
                          <button key={p} onClick={() => setTaskForm(f => ({ ...f, priority: p }))}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${taskForm.priority === p ? cfg.active : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>
                            {cfg.label}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <>
                      {(() => { const c = statusCfg[editingTask?.status ?? 'todo']; return (
                        <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
                          <i className={`${c.icon} text-[10px]`}></i>{c.label}
                        </span>
                      ); })()}
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${{ low: 'bg-gray-200 text-gray-700', medium: 'bg-amber-400 text-white', high: 'bg-rose-500 text-white' }[editingTask?.priority ?? 'medium']}`}>
                        {{ low: 'Low', medium: 'Medium', high: 'High' }[editingTask?.priority ?? 'medium']}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                {/* Description */}
                <div className="px-5 py-4 border-b border-gray-50">
                  <textarea
                    value={taskForm.description}
                    onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Add context, notes, or details about this task…"
                    maxLength={1000}
                    className="w-full text-sm text-gray-600 placeholder-gray-300 bg-transparent outline-none border-none resize-none leading-relaxed"
                  />
                </div>

                {/* Properties */}
                <div className="px-5 py-4 space-y-0 divide-y divide-gray-50">

                  {/* Dates row */}
                  <div className="py-3 flex items-center gap-3">
                    <i className="ri-calendar-line text-gray-400 text-sm w-4 flex-shrink-0"></i>
                    {drawerMode === 'edit' ? (
                      <div className="flex items-center gap-1.5 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
                        <input type="date" value={taskForm.start_date} onChange={e => setTaskForm(f => ({ ...f, start_date: e.target.value }))}
                          placeholder="Start"
                          className="text-xs text-gray-700 bg-transparent outline-none cursor-pointer border-0 flex-1" />
                        <span className="text-gray-300 text-xs font-medium flex-shrink-0">→</span>
                        <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                          placeholder="Due"
                          className="text-xs text-gray-700 bg-transparent outline-none cursor-pointer border-0 flex-1" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-wrap text-sm">
                        {editingTask?.start_date && <span className="text-gray-700">{new Date(editingTask.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {editingTask?.start_date && editingTask?.due_date && <i className="ri-arrow-right-line text-gray-300 text-xs"></i>}
                        {editingTask?.due_date && <span className={daysLeft !== null && daysLeft < 0 ? 'text-rose-500 font-medium' : 'text-gray-700'}>{new Date(editingTask.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        {!editingTask?.start_date && !editingTask?.due_date && <span className="text-gray-400 text-xs">No dates set</span>}
                      </div>
                    )}
                  </div>

                  {/* Duration + countdown */}
                  {(duration !== null || daysLeft !== null) && (
                    <div className="py-3 flex items-center gap-3">
                      <i className="ri-time-line text-gray-400 text-sm w-4 flex-shrink-0"></i>
                      <div className="flex items-center gap-2 flex-wrap">
                        {duration !== null && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{duration}d duration</span>
                        )}
                        {daysLeft !== null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${daysLeft < 0 ? 'bg-rose-50 text-rose-600' : daysLeft === 0 ? 'bg-amber-50 text-amber-700' : daysLeft <= 7 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assignee */}
                  {wsTeam.length > 0 && (
                    <div className="py-3 flex items-start gap-3">
                      <i className="ri-user-line text-gray-400 text-sm w-4 flex-shrink-0 mt-0.5"></i>
                      {drawerMode === 'edit' ? (
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          <button onClick={() => setTaskForm(f => ({ ...f, assigned_to: '' }))}
                            className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-all ${!taskForm.assigned_to ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`}>
                            Unassigned
                          </button>
                          {wsTeam.map(m => (
                            <button key={m.id} onClick={() => setTaskForm(f => ({ ...f, assigned_to: m.id }))}
                              className={`flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border cursor-pointer transition-all ${taskForm.assigned_to === m.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                              {m.avatar_url
                                ? <img src={m.avatar_url} alt={m.full_name} className="w-4 h-4 rounded-full object-cover object-top" />
                                : <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-600">{m.full_name[0]}</div>
                              }
                              <span className={`text-xs font-medium ${taskForm.assigned_to === m.id ? 'text-indigo-700' : 'text-gray-600'}`}>{m.full_name.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        assignee ? (
                          <div className="flex items-center gap-2">
                            {assignee.avatar_url
                              ? <img src={assignee.avatar_url} alt={assignee.full_name} className="w-6 h-6 rounded-full object-cover object-top" />
                              : <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">{assignee.full_name[0]}</div>
                            }
                            <span className="text-sm font-medium text-gray-800">{assignee.full_name}</span>
                          </div>
                        ) : <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary bar — only shows when there's enough info */}
                {(taskForm.title && (assignee || daysLeft !== null)) && (
                  <div className="mx-5 mb-4 bg-gray-50 rounded-2xl p-3.5 space-y-1.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Summary</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {assignee ? <><span className="font-medium text-gray-800">{assignee.full_name.split(' ')[0]}</span> is working on </> : 'Task '}
                      <span className="font-medium text-gray-800">"{taskForm.title}"</span>
                      {taskForm.priority !== 'medium' && <> — <span className={taskForm.priority === 'high' ? 'text-rose-600 font-medium' : 'text-gray-500'}>{taskForm.priority} priority</span></>}
                      {daysLeft !== null && <> · {daysLeft < 0 ? <span className="text-rose-500 font-medium">{Math.abs(daysLeft)}d overdue</span> : daysLeft === 0 ? <span className="text-amber-600 font-medium">due today</span> : <span>due in {daysLeft}d</span>}</>}
                    </p>
                  </div>
                )}
              </div>

              {/* Comments — only when editing an existing task */}
              {editingTask && (
                <div className="border-t border-gray-100">
                  <div className="px-5 pt-4 pb-2 flex items-center gap-2">
                    <i className="ri-chat-3-line text-gray-400 text-sm"></i>
                    <span className="text-xs font-semibold text-gray-600">Comments</span>
                    {taskComments.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{taskComments.length}</span>}
                  </div>

                  {/* Comment list */}
                  <div className="px-5 space-y-3 max-h-52 overflow-y-auto pb-2">
                    {taskComments.length === 0 && (
                      <p className="text-xs text-gray-400 py-2">No comments yet. Be the first.</p>
                    )}
                    {taskComments.map(c => {
                      const u = c.hub_users;
                      const isOwn = c.user_id === hubUser?.id;
                      const timeAgo = (() => {
                        const diff = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 1000);
                        if (diff < 30) return 'just now';
                        if (diff < 60) return `${diff}s ago`;
                        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                        return new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
                          ' at ' + new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      })();
                      return (
                        <div key={c.id} className="flex gap-2.5 group">
                          {u?.avatar_url
                            ? <img src={u.avatar_url} alt={u.full_name} className="w-6 h-6 rounded-full object-cover object-top flex-shrink-0 mt-0.5" />
                            : <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 flex-shrink-0 mt-0.5">{u?.full_name?.[0] ?? '?'}</div>
                          }
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-gray-800">{u?.full_name?.split(' ')[0] ?? 'Unknown'}</span>
                              <span className="text-[10px] text-gray-400">{timeAgo}</span>
                              {isOwn && (
                                <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-300 hover:text-rose-400 cursor-pointer transition-all ml-auto flex-shrink-0">
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed break-words">{c.body.split(/(@\w+)/g).map((part, i) =>
                              part.startsWith('@') ? (
                                <span key={i} className="text-indigo-600 font-semibold">{part}</span>
                              ) : part
                            )}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Comment input */}
                  <div className="px-5 pt-2 pb-4 flex gap-2 items-end">
                    {hubUser?.avatar_url
                      ? <img src={hubUser.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover object-top flex-shrink-0 mb-0.5" />
                      : <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600 flex-shrink-0 mb-0.5">{hubUser?.full_name?.[0] ?? '?'}</div>
                    }
                    <div className="relative flex-1">
                      {(() => {
                        const mentionSuggestions = wsTeam.filter(m =>
                          m.full_name.toLowerCase().includes(mentionQuery) ||
                          m.full_name.split(' ')[0].toLowerCase().startsWith(mentionQuery)
                        ).slice(0, 5);
                        return mentionOpen && mentionSuggestions.length > 0 ? (
                          <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-10">
                            {mentionSuggestions.map(m => (
                              <button key={m.id} onMouseDown={e => { e.preventDefault(); insertMention(m); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 transition-colors text-left cursor-pointer">
                                {m.avatar_url
                                  ? <img src={m.avatar_url} alt={m.full_name} className="w-6 h-6 rounded-full object-cover object-top flex-shrink-0" />
                                  : <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">{m.full_name[0]}</div>
                                }
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{m.full_name}</p>
                                  <p className="text-[10px] text-gray-400">@{m.full_name.split(' ')[0].toLowerCase()}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null;
                      })()}
                    <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:ring-1 focus-within:ring-indigo-200 focus-within:border-indigo-300 transition-all">
                      <textarea
                        value={newComment}
                        onChange={e => {
                          const val = e.target.value;
                          setNewComment(val);
                          const pos = e.target.selectionStart ?? val.length;
                          const before = val.slice(0, pos);
                          const match = before.match(/@(\w*)$/);
                          if (match) {
                            setMentionQuery(match[1].toLowerCase());
                            setMentionStart(pos - match[0].length);
                            setMentionOpen(true);
                          } else {
                            setMentionOpen(false);
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                        placeholder="Add a comment…"
                        rows={1}
                        className="flex-1 text-xs text-gray-700 placeholder-gray-400 bg-transparent outline-none resize-none leading-relaxed"
                        style={{ minHeight: 20, maxHeight: 80 }}
                      />
                      <button onClick={postComment} disabled={!newComment.trim() || postingComment}
                        className="w-6 h-6 flex items-center justify-center bg-[#111827] text-white rounded-lg disabled:opacity-30 cursor-pointer flex-shrink-0 transition-opacity hover:bg-gray-700">
                        <i className="ri-send-plane-fill text-[11px]"></i>
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
                {editingTask && (
                  <button onClick={() => { if (window.confirm('Delete this task?')) { deleteTask(editingTask.id); setShowTaskModal(false); setMentionOpen(false); setMentionQuery(''); } }}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors">
                    <i className="ri-delete-bin-line text-sm"></i>
                  </button>
                )}
                <button onClick={saveTask} disabled={taskSaving || !taskForm.title.trim()}
                  className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors font-medium">
                  {taskSaving ? 'Saving…' : editingTask ? 'Save changes' : 'Add Task'}
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </ContractorLayout>
  );
}
