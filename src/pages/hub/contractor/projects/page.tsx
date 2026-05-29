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

// ── Gantt timeline ────────────────────────────────────────────────────────
function GanttTimeline({ tasks, projectStart, projectEnd, today }: {
  tasks: ProjectTask[];
  projectStart: string | null;
  projectEnd: string | null;
  today: string;
}) {
  const [tooltip, setTooltip] = useState<{ task: ProjectTask; x: number; y: number } | null>(null);
  const scrollRef = useState<HTMLDivElement | null>(null);
  const containerRef = { current: null as HTMLDivElement | null };

  const dated = tasks.filter(t => t.due_date);
  if (dated.length === 0 && !projectStart && !projectEnd) return null;

  const parseD = (s: string) => new Date(s + 'T00:00:00');
  const addDays = (s: string, n: number) => {
    const d = parseD(s); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const diff = (a: string, b: string) =>
    Math.round((parseD(b).getTime() - parseD(a).getTime()) / 86400000);
  const fmtDate = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const allDates: string[] = [today,
    ...dated.flatMap(t => [t.start_date, t.due_date].filter(Boolean) as string[]),
    ...[projectStart, projectEnd].filter(Boolean) as string[],
  ].sort();

  const rawStart = allDates[0];
  const rawEnd = allDates[allDates.length - 1];
  let rangeStart = addDays(rawStart, -3);
  let rangeEnd = addDays(rawEnd, 3);
  if (diff(rangeStart, rangeEnd) < 28) rangeEnd = addDays(rangeStart, 28);

  const totalDays = diff(rangeStart, rangeEnd);
  const COL = 36;
  const LABEL_W = 160;

  // Day grid: every day, label on 1st of month and Mondays
  const days: { date: string; isMonth: boolean; monthLabel: string; dayNum: number; isWeekend: boolean }[] = [];
  let lastMonth = -1;
  for (let i = 0; i <= totalDays; i++) {
    const d = parseD(rangeStart); d.setDate(d.getDate() + i);
    const isNewMonth = d.getMonth() !== lastMonth;
    if (isNewMonth) lastMonth = d.getMonth();
    days.push({
      date: d.toISOString().slice(0, 10),
      isMonth: isNewMonth,
      monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
      dayNum: d.getDate(),
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }

  const todayOff = diff(rangeStart, today);

  const barColors = {
    done:        { bg: '#d1fae5', border: '#34d399', text: '#065f46' },
    in_progress: { bg: '#e0f2fe', border: '#38bdf8', text: '#075985' },
    todo:        { bg: '#ede9fe', border: '#a78bfa', text: '#4c1d95' },
    overdue:     { bg: '#ffe4e6', border: '#fb7185', text: '#9f1239' },
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <i className="ri-bar-chart-grouped-line text-indigo-400 text-base"></i>
          <h3 className="font-semibold text-gray-800 text-sm">Timeline</h3>
          {dated.length > 0 && <span className="text-[11px] text-gray-400">{dated.length} task{dated.length !== 1 ? 's' : ''}</span>}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          {[
            { color: '#a78bfa', label: 'To do' },
            { color: '#38bdf8', label: 'In progress' },
            { color: '#34d399', label: 'Done' },
            { color: '#fb7185', label: 'Overdue' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto" ref={(el) => { containerRef.current = el; }}>
        <div style={{ width: LABEL_W + (totalDays + 1) * COL, minWidth: '100%' }}>

          {/* Day header row */}
          <div className="flex sticky top-0 z-10 bg-white border-b border-gray-100">
            <div className="flex-shrink-0 border-r border-gray-100" style={{ width: LABEL_W }} />
            <div className="flex">
              {days.map((day, i) => (
                <div key={day.date}
                  style={{ width: COL, flexShrink: 0 }}
                  className={`relative flex flex-col items-center justify-center py-1.5 border-r border-gray-50 ${day.isWeekend ? 'bg-gray-50/60' : ''} ${day.date === today ? 'bg-[#FF6B35]/8' : ''}`}>
                  {day.isMonth && (
                    <span className="absolute left-1 top-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-none">{day.monthLabel}</span>
                  )}
                  <span className={`text-[10px] font-medium mt-2 ${day.date === today ? 'text-[#FF6B35] font-bold' : day.isWeekend ? 'text-gray-300' : 'text-gray-400'}`}>
                    {day.dayNum}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {dated.length === 0 ? (
            <div className="flex" style={{ height: 64 }}>
              <div className="flex-shrink-0 border-r border-gray-100" style={{ width: LABEL_W }} />
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-300">Add due dates to tasks to see them here</p>
              </div>
            </div>
          ) : tasks.map((task, rowIdx) => {
            if (!task.due_date) return null;
            const isOverdue = task.due_date < today && task.status !== 'done';
            const colorKey = task.status === 'done' ? 'done' : isOverdue ? 'overdue' : task.status === 'in_progress' ? 'in_progress' : 'todo';
            const colors = barColors[colorKey];

            const startStr = task.start_date ?? task.due_date;
            const endStr = task.due_date;
            const startOff = Math.max(0, diff(rangeStart, startStr));
            const endOff = Math.min(totalDays, diff(rangeStart, endStr));
            const hasRange = !!task.start_date && startOff < endOff;
            const barW = hasRange ? Math.max(COL - 4, (endOff - startOff + 1) * COL - 4) : COL - 8;
            const barL = startOff * COL + (hasRange ? 2 : 4);

            return (
              <div key={task.id}
                className={`flex items-center border-b border-gray-50 last:border-0 ${rowIdx % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                style={{ height: 44 }}>
                {/* Label */}
                <div className="flex-shrink-0 px-3 border-r border-gray-100 flex flex-col justify-center" style={{ width: LABEL_W, height: '100%' }}>
                  <p className="text-xs font-medium text-gray-700 truncate leading-tight">{task.title}</p>
                  <p className={`text-[10px] mt-0.5 ${isOverdue ? 'text-rose-400' : 'text-gray-400'}`}>
                    {task.start_date ? `${fmtDate(task.start_date)} → ${fmtDate(task.due_date)}` : fmtDate(task.due_date)}
                  </p>
                </div>

                {/* Grid + bar */}
                <div className="relative flex" style={{ height: '100%' }}>
                  {/* Day columns (weekend shading) */}
                  {days.map(day => (
                    <div key={day.date}
                      style={{ width: COL, flexShrink: 0, height: '100%' }}
                      className={`border-r border-gray-50/80 ${day.isWeekend ? 'bg-gray-50/50' : ''} ${day.date === today ? 'bg-[#FF6B35]/5' : ''}`}
                    />
                  ))}

                  {/* Today line */}
                  {todayOff >= 0 && todayOff <= totalDays && (
                    <div style={{ position: 'absolute', left: todayOff * COL + COL / 2 - 0.5, top: 0, bottom: 0, width: 1.5, background: '#FF6B35', opacity: 0.3, pointerEvents: 'none' }} />
                  )}

                  {/* Bar */}
                  <div
                    onMouseEnter={(e) => setTooltip({ task, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      position: 'absolute',
                      left: barL,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: barW,
                      height: hasRange ? 24 : 24,
                      background: colors.bg,
                      border: `1.5px solid ${colors.border}`,
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                      cursor: 'default',
                      opacity: task.status === 'done' ? 0.7 : 1,
                    }}>
                    {barW > 56 && (
                      <span style={{ color: colors.text, fontSize: 10, fontWeight: 600, paddingLeft: 8, paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                        {task.title}
                      </span>
                    )}
                    {!hasRange && (
                      <div style={{ position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, background: colors.border, borderRadius: '50%' }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Today label at bottom */}
          {todayOff >= 0 && todayOff <= totalDays && (
            <div className="flex border-t border-gray-50 bg-gray-50/40" style={{ height: 22 }}>
              <div className="flex-shrink-0 border-r border-gray-100" style={{ width: LABEL_W }} />
              <div className="relative flex" style={{ flex: 1 }}>
                <div style={{ position: 'absolute', left: todayOff * COL + COL / 2 - 18, top: 3 }}>
                  <span className="text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">Today</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hover tooltip */}
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10, zIndex: 100, pointerEvents: 'none' }}>
          <div className="bg-gray-900 text-white rounded-xl px-3 py-2 shadow-xl text-xs max-w-[200px]">
            <p className="font-semibold leading-snug">{tooltip.task.title}</p>
            {tooltip.task.description && <p className="text-white/60 mt-0.5 line-clamp-2">{tooltip.task.description}</p>}
            <div className="flex items-center gap-2 mt-1.5 text-white/50">
              {tooltip.task.start_date && <span>{fmtDate(tooltip.task.start_date)} →</span>}
              {tooltip.task.due_date && <span>{fmtDate(tooltip.task.due_date)}</span>}
            </div>
            <div className="mt-1">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                tooltip.task.status === 'done' ? 'bg-emerald-500/20 text-emerald-300' :
                tooltip.task.due_date && tooltip.task.due_date < today && tooltip.task.status !== 'done' ? 'bg-rose-500/20 text-rose-300' :
                tooltip.task.status === 'in_progress' ? 'bg-sky-500/20 text-sky-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}>
                {tooltip.task.status === 'in_progress' ? 'In progress' : tooltip.task.status === 'todo' ? 'To do' : 'Done'}
              </span>
            </div>
          </div>
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
      start_date: task.start_date ?? '',
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
      start_date: taskForm.start_date || null,
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
                    <div className="flex-shrink-0 flex flex-col items-center gap-3 min-w-[120px]">
                      {/* Ring */}
                      <div className="relative" style={{ width: 100, height: 100 }}>
                        <svg width={100} height={100} viewBox="0 0 100 100">
                          <circle cx={50} cy={50} r={38} fill="none" stroke="#f3f4f6" strokeWidth={9} />
                          {/* Overdue arc (rose) */}
                          {wsTasks.length > 0 && wsTasks.filter(t => !!wsIsOverdue(t)).length > 0 && (
                            <circle cx={50} cy={50} r={38} fill="none" stroke="#fda4af" strokeWidth={9} strokeLinecap="butt"
                              strokeDasharray={`${(wsTasks.filter(t => !!wsIsOverdue(t)).length / wsTasks.length) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                              transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }}
                            />
                          )}
                          {/* Done arc (indigo/emerald) */}
                          <circle cx={50} cy={50} r={38} fill="none"
                            stroke={wsPct === 100 ? '#34d399' : '#6366f1'} strokeWidth={9} strokeLinecap="round"
                            strokeDasharray={`${(wsPct / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                            transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-gray-900 leading-none">{wsPct}%</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">done</span>
                        </div>
                      </div>

                      {/* Segmented bar */}
                      {wsTasks.length > 0 && (
                        <div className="w-full space-y-1.5">
                          <div className="flex h-1.5 rounded-full overflow-hidden gap-px w-full">
                            {[
                              { count: wsDone, color: 'bg-indigo-400' },
                              { count: wsTasks.filter(t => t.status === 'in_progress').length, color: 'bg-sky-300' },
                              { count: wsTasks.filter(t => t.status === 'todo' && !wsIsOverdue(t)).length, color: 'bg-gray-200' },
                              { count: wsTasks.filter(t => !!wsIsOverdue(t)).length, color: 'bg-rose-300' },
                            ].filter(s => s.count > 0).map((s, i) => (
                              <div key={i} className={`h-full ${s.color} rounded-full`}
                                style={{ flex: s.count }} />
                            ))}
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            {[
                              { label: 'Done', count: wsDone, dot: 'bg-indigo-400' },
                              { label: 'Active', count: wsTasks.filter(t => t.status === 'in_progress').length, dot: 'bg-sky-300' },
                              { label: 'To do', count: wsTasks.filter(t => t.status === 'todo').length, dot: 'bg-gray-300' },
                              { label: 'Overdue', count: wsTasks.filter(t => !!wsIsOverdue(t)).length, dot: 'bg-rose-400' },
                            ].filter(s => s.count > 0).map(s => (
                              <div key={s.label} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                  <span className="text-gray-400">{s.label}</span>
                                </div>
                                <span className="font-semibold text-gray-600">{s.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {wsTasks.length === 0 && (
                        <span className="text-[10px] text-gray-300">No tasks yet</span>
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
                ) : (
                  <div className="divide-y divide-gray-50/80">
                    {wsFiltered.map(task => {
                      const overdue = !!wsIsOverdue(task);
                      const si = wsStatusIcon[task.status];
                      const priorityBorder = { high: 'border-l-rose-400', medium: 'border-l-amber-300', low: 'border-l-gray-200' }[task.priority];
                      const assignee = wsTeam.find(m => m.id === task.assigned_to);
                      return (
                        <div key={task.id} className={`flex items-start gap-3 pl-4 pr-5 py-3.5 hover:bg-gray-50/80 transition-colors group border-l-2 ${priorityBorder}`}>
                          <button onClick={() => cycleTask(task)} className={`flex-shrink-0 cursor-pointer transition-colors mt-0.5 ${si.cls}`}>
                            <i className={`${si.icon} text-lg`}></i>
                          </button>
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditTask(task)}>
                            <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
                            {task.description && <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{task.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {assignee && (
                              assignee.avatar_url
                                ? <img src={assignee.avatar_url} alt={assignee.full_name} title={assignee.full_name} className="w-5 h-5 rounded-full object-cover object-top opacity-70" />
                                : <div title={assignee.full_name} className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-500">{assignee.full_name[0]}</div>
                            )}
                            {task.due_date && (
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${overdue ? 'text-rose-600 bg-rose-50' : 'text-gray-400 bg-gray-50'}`}>
                                {overdue ? '↑ Overdue' : new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                            <button onClick={() => openEditTask(task)}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-600 cursor-pointer transition-all">
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Delete this task?')) deleteTask(task.id); }}
                              disabled={deletingTaskId === task.id}
                              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-rose-500 cursor-pointer transition-all disabled:opacity-40">
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
      {showTaskModal && (
        <>
          {/* Dim backdrop — doesn't block the page fully */}
          <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowTaskModal(false)} />

          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid #f3f4f6' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
              {/* Status cycle */}
              {editingTask && (
                <button
                  onClick={() => {
                    const next: Record<string, ProjectTask['status']> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
                    const s = (editingTask.status in next ? next[editingTask.status] : 'todo') as ProjectTask['status'];
                    setEditingTask(prev => prev ? { ...prev, status: s } : prev);
                    supabase.from('hub_project_tasks').update({ status: s }).eq('id', editingTask.id);
                    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, status: s } : t));
                  }}
                  className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 cursor-pointer transition-colors ${
                    editingTask.status === 'done' ? 'text-emerald-500 hover:text-emerald-600' :
                    editingTask.status === 'in_progress' ? 'text-sky-400 hover:text-sky-500' : 'text-gray-300 hover:text-gray-500'
                  }`}>
                  <i className={`text-lg ${editingTask.status === 'done' ? 'ri-checkbox-circle-fill' : editingTask.status === 'in_progress' ? 'ri-loader-2-line' : 'ri-checkbox-blank-circle-line'}`}></i>
                </button>
              )}
              <span className="text-xs text-gray-400 flex-1">{editingTask ? 'Edit task' : 'New task'}</span>
              <button onClick={() => setShowTaskModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors">
                <i className="ri-close-line text-base"></i>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Title — big, minimal */}
              <input
                type="text"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                autoFocus
                className="w-full text-xl font-semibold text-gray-900 placeholder-gray-300 bg-transparent outline-none border-none resize-none leading-snug"
              />

              {/* Description */}
              <textarea
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Add a description…"
                maxLength={1000}
                className="w-full text-sm text-gray-600 placeholder-gray-300 bg-transparent outline-none border-none resize-none leading-relaxed"
              />

              <div className="border-t border-gray-100 pt-4 space-y-3">
                {/* Priority */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0">Priority</span>
                  <div className="flex gap-1.5">
                    {(['low', 'medium', 'high'] as const).map(p => {
                      const cfg = { low: { label: 'Low', cls: 'bg-gray-100 text-gray-500', active: 'bg-gray-800 text-white' }, medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-600', active: 'bg-amber-500 text-white' }, high: { label: 'High', cls: 'bg-rose-50 text-rose-600', active: 'bg-rose-500 text-white' } }[p];
                      return (
                        <button key={p} onClick={() => setTaskForm(f => ({ ...f, priority: p }))}
                          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${taskForm.priority === p ? cfg.active : cfg.cls}`}>
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0">Start</span>
                  <input type="date" value={taskForm.start_date} onChange={e => setTaskForm(f => ({ ...f, start_date: e.target.value }))}
                    className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-200 cursor-pointer" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 flex-shrink-0">Due date</span>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                    className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-200 cursor-pointer" />
                </div>

                {/* Assignee */}
                {wsTeam.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0 pt-1">Assignee</span>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setTaskForm(f => ({ ...f, assigned_to: '' }))}
                        className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer transition-all ${!taskForm.assigned_to ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                        None
                      </button>
                      {wsTeam.map(m => (
                        <button key={m.id} onClick={() => setTaskForm(f => ({ ...f, assigned_to: m.id }))}
                          title={m.full_name}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-full border cursor-pointer transition-all ${taskForm.assigned_to === m.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt={m.full_name} className="w-4 h-4 rounded-full object-cover" />
                            : <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-700">{m.full_name[0]}</div>
                          }
                          <span className={`text-xs font-medium ${taskForm.assigned_to === m.id ? 'text-indigo-700' : 'text-gray-600'}`}>{m.full_name.split(' ')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
              {editingTask && (
                <button
                  onClick={() => { if (window.confirm('Delete this task?')) { deleteTask(editingTask.id); setShowTaskModal(false); } }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors">
                  <i className="ri-delete-bin-line text-sm"></i>
                </button>
              )}
              <button onClick={saveTask} disabled={taskSaving || !taskForm.title.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors font-medium">
                {taskSaving ? 'Saving…' : editingTask ? 'Save' : 'Add Task'}
              </button>
            </div>
          </div>
        </>
      )}
    </ContractorLayout>
  );
}
