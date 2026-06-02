import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'archived';

interface JobApplication {
  id: number;
  job_id: string | null;
  role: string;
  name: string;
  email: string;
  expected_rate: string;
  portfolio_link: string | null;
  resume_link: string | null;
  resume_filename: string | null;
  message: string;
  status: ApplicationStatus;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

const statusColors: Record<ApplicationStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  reviewing: 'bg-sky-100 text-sky-700',
  shortlisted: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const statusOrder: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'archived'];

export default function ApplicationsPage() {
  const { hubUser } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [selected, setSelected] = useState<JobApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    let query = supabase
      .from('hub_job_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query;
    setApplications((data as JobApplication[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const stats = useMemo(() => ({
    total: applications.length,
    new: applications.filter((app) => app.status === 'new').length,
    reviewing: applications.filter((app) => app.status === 'reviewing').length,
    shortlisted: applications.filter((app) => app.status === 'shortlisted').length,
  }), [applications]);

  const updateApplication = async (status: ApplicationStatus) => {
    if (!selected) return;
    setUpdating(true);
    await supabase
      .from('hub_job_applications')
      .update({
        status,
        admin_notes: adminNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: hubUser?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selected.id);

    setUpdating(false);
    setSelected(null);
    fetchApplications();
  };

  return (
    <AdminLayout title="Applications">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400">Total</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400">New</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.new}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400">Reviewing</p>
            <p className="mt-2 text-2xl font-semibold text-sky-600">{stats.reviewing}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-400">Shortlisted</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">{stats.shortlisted}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {(['all', ...statusOrder] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap capitalize ${
                  statusFilter === status ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i>
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-10 text-center text-sm text-gray-400">
              No applications found
            </div>
          ) : applications.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                setSelected(app);
                setAdminNotes(app.admin_notes || '');
              }}
              className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-left hover:border-gray-200 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{app.name}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {app.role}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.email} · {app.expected_rate} · {new Date(app.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{app.message}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium capitalize ${statusColors[app.status]}`}>
                  {app.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="min-w-0 pr-4">
                <h2 className="font-semibold text-[#111827] truncate">{selected.name}</h2>
                <p className="text-xs text-gray-400 mt-1">{selected.role}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[selected.status]}`}>
                  {selected.status}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {selected.expected_rate}
                </span>
                {selected.job_id && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
                    {selected.job_id}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <a href={`mailto:${selected.email}`} className="text-sm text-[#111827] mt-2 block break-all hover:text-[#FF6B35]">
                    {selected.email}
                  </a>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Submitted</p>
                  <p className="text-sm text-[#111827] mt-2">
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Portfolio</p>
                  {selected.portfolio_link ? (
                    <a
                      href={selected.portfolio_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[#111827] mt-2 inline-flex items-center gap-2 hover:text-[#FF6B35] break-all"
                    >
                      Open portfolio
                      <i className="ri-external-link-line"></i>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">No portfolio link provided</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resume</p>
                  {selected.resume_link ? (
                    <a
                      href={selected.resume_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-[#111827] mt-2 inline-flex items-center gap-2 hover:text-[#FF6B35] break-all"
                    >
                      {selected.resume_filename || 'Open resume'}
                      <i className="ri-external-link-line"></i>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">No resume attached</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Message</p>
                <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{selected.message}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  placeholder="Add notes from review, interview feedback, next steps..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 p-5 border-t border-gray-100 flex-wrap">
              {statusOrder.map((status) => (
                <button
                  key={status}
                  onClick={() => updateApplication(status)}
                  disabled={updating || selected.status === status}
                  className={`flex-1 py-2 text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap capitalize disabled:opacity-40 ${
                    status === 'shortlisted'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : status === 'reviewing'
                        ? 'bg-sky-500 text-white hover:bg-sky-600'
                        : status === selected.status
                          ? 'border border-gray-200 text-gray-400'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
