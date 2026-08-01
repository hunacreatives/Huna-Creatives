import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface StatusProject {
  project_name: string;
  client_name: string;
  service: string | null;
  project_type: 'client' | 'internal' | 'retainer';
  status: string;
  start_date: string | null;
  deadline: string | null;
  monthly_deliverables: number | null;
}

interface StatusTask {
  id: number;
  title: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'blocked' | 'done';
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  created_at: string;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

const localYearMonth = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function ClientStatusPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [project, setProject] = useState<StatusProject | null>(null);
  const [tasks, setTasks] = useState<StatusTask[]>([]);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    supabase.functions.invoke('get-client-status', { body: { token } })
      .then(({ data }) => {
        if (data?.ok && data.project) {
          setProject(data.project as StatusProject);
          setTasks((data.tasks ?? []) as StatusTask[]);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-gray-300"></i>
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="ri-link-unlink text-2xl text-gray-300"></i>
          </div>
          <h1 className="text-lg font-bold text-gray-900">This status page isn't available</h1>
          <p className="text-sm text-gray-500 mt-2">The link may have expired or been replaced. Please ask your project contact for a fresh link.</p>
        </div>
      </div>
    );
  }

  const done = tasks.filter(t => t.status === 'done');
  const inProgress = tasks.filter(t => ['in_progress', 'in_review'].includes(t.status));
  const upNext = tasks.filter(t => ['todo', 'blocked'].includes(t.status));
  const pct = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  const now = new Date();
  const thisMonth = localYearMonth(now);
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long' });
  const deliveredThisMonth = done.filter(t => t.completed_at && localYearMonth(new Date(t.completed_at)) === thisMonth).length;
  const quota = project.project_type === 'retainer' ? project.monthly_deliverables : null;

  const recentDone = [...done]
    .sort((a, b) => (b.completed_at ?? b.created_at).localeCompare(a.completed_at ?? a.created_at))
    .slice(0, 8);

  const allWrappedUp = tasks.length > 0 && inProgress.length === 0 && upNext.length === 0 && done.length === tasks.length;

  const statusChip: Record<string, { label: string; cls: string }> = {
    ongoing:   { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
    completed: { label: 'Completed', cls: 'bg-blue-100 text-blue-700' },
    paused:    { label: 'Paused',    cls: 'bg-amber-100 text-amber-700' },
    cancelled: { label: 'Closed',    cls: 'bg-gray-100 text-gray-500' },
  };
  const chip = statusChip[project.status] ?? statusChip.ongoing;

  const TaskLine = ({ t }: { t: StatusTask }) => (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <i className={`text-base flex-shrink-0 ${
        t.status === 'done' ? 'ri-checkbox-circle-fill text-emerald-500'
        : t.status === 'in_review' ? 'ri-eye-line text-violet-400'
        : t.status === 'in_progress' ? 'ri-loader-2-line text-sky-400'
        : t.status === 'blocked' ? 'ri-time-line text-amber-400'
        : 'ri-checkbox-blank-circle-line text-gray-300'}`}></i>
      <span className={`text-sm flex-1 min-w-0 truncate ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{t.title}</span>
      {t.status !== 'done' && t.due_date && (
        <span className="text-[11px] text-gray-400 flex-shrink-0">{fmtDate(t.due_date)}</span>
      )}
      {t.status === 'done' && t.completed_at && (
        <span className="text-[11px] text-emerald-600 flex-shrink-0">{fmtDate(t.completed_at)}</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f7f4] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Project Update</p>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">{project.project_name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {project.client_name}{project.service ? ` · ${project.service}` : ''}
              </p>
            </div>
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${chip.cls}`}>{chip.label}</span>
          </div>

          {(project.start_date || project.deadline) && (
            <div className="flex items-center gap-5 mt-4 text-xs text-gray-500">
              {project.start_date && <span><span className="text-gray-400">Started</span> {fmtDate(project.start_date)}</span>}
              {project.deadline && <span><span className="text-gray-400">Target</span> {fmtDate(project.deadline)}</span>}
            </div>
          )}

          {/* Overall progress */}
          {tasks.length > 0 && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{allWrappedUp ? 'All tasks complete' : `${done.length} of ${tasks.length} tasks complete`}</span>
                <span className="font-semibold text-gray-700">{pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          {/* Retainer quota */}
          {quota != null && quota > 0 && (
            <div className="mt-4 bg-orange-50/60 border border-orange-100 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">{monthLabel} deliverables</p>
                <p className="text-xs font-bold text-[#FF6B35]">{deliveredThisMonth} of {quota}</p>
              </div>
              <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-[#FF6B35] rounded-full" style={{ width: `${Math.min((deliveredThisMonth / quota) * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* All wrapped up */}
        {allWrappedUp && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <i className="ri-checkbox-circle-fill text-2xl text-emerald-500"></i>
            </div>
            <h2 className="text-base font-bold text-gray-900">Everything's delivered</h2>
            <p className="text-sm text-gray-500 mt-1">All planned work for this project is complete. See what was finished below.</p>
          </div>
        )}

        {/* In progress */}
        {inProgress.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-5 pt-4 pb-1">In Progress</p>
            <div className="divide-y divide-gray-50 pb-2">{inProgress.map(t => <TaskLine key={t.id} t={t} />)}</div>
          </div>
        )}

        {/* Up next */}
        {upNext.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-5 pt-4 pb-1">Up Next</p>
            <div className="divide-y divide-gray-50 pb-2">{upNext.map(t => <TaskLine key={t.id} t={t} />)}</div>
          </div>
        )}

        {/* Recently completed */}
        {recentDone.length > 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-5 pt-4 pb-1">{allWrappedUp ? 'Completed Work' : 'Recently Completed'}</p>
            <div className="divide-y divide-gray-50 pb-2">{recentDone.map(t => <TaskLine key={t.id} t={t} />)}</div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-400">Work is being planned — check back soon.</p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 pt-2 pb-6">
          This page updates automatically — check back anytime<br />
          <a href="https://www.hunacreatives.com" className="hover:text-gray-600 transition-colors">Huna Creatives</a>
        </p>
      </div>
    </div>
  );
}
