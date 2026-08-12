import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubDocRequest } from '@/lib/types';
import { useDemo } from '@/contexts/DemoContext';
import { renderCertificateHTML } from './certificateTemplate';
import { renderPaymentSummaryHTML, PayoutRow, ProjectPayoutRow } from './paymentSummaryTemplate';
import { HUNA_LOGO, FRANCIS_SIG } from '../documents/contractAssets';

// Doc types formal enough for the AI to draft as a standalone HR certificate.
// Others (Payment Summary, Agreement Copy, NDA Copy, ...) are source documents
// an admin retrieves/uploads rather than something to generate from scratch.
const AI_GENERATABLE_TYPES = new Set([
  'Certificate of Engagement',
  'Work Completion Certificate',
  'Clearance Certificate',
  'Client Assignment Letter',
]);

const PAYMENT_SUMMARY_TYPE = 'Payment Summary';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-orange-100 text-orange-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

const DOC_TYPES = [
  'Certificate of Engagement',
  'Agreement Copy',
  'NDA Copy',
  'Payment Summary',
  'Work Completion Certificate',
  'Client Assignment Letter',
  'Clearance Certificate',
  'Other',
];

interface ReviewModalProps {
  req: HubDocRequest;
  onClose: () => void;
  onSaved: () => void;
}

function ReviewModal({ req, onClose, onSaved }: ReviewModalProps) {
  const [status, setStatus] = useState(req.status);
  const [adminNotes, setAdminNotes] = useState(req.admin_notes || '');
  const [fileName, setFileName] = useState(req.file_name || '');
  const [fileUrl, setFileUrl] = useState(req.file_url || '');
  const [saving, setSaving] = useState(false);
  const [purpose, setPurpose] = useState(req.notes || '');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sent, setSent] = useState(false);
  const [dateFrom, setDateFrom] = useState(req.hub_users?.start_date?.slice(0, 10) || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const requester = req.hub_users as any;
  const canGenerate = AI_GENERATABLE_TYPES.has(req.doc_type);
  const isPaymentSummary = req.doc_type === PAYMENT_SUMMARY_TYPE;

  const generateCertificate = async () => {
    setGenerating(true);
    setGenError('');
    setSendError('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-hr-certificate', {
        body: {
          doc_type: req.doc_type,
          contractor_name: requester?.full_name ?? '',
          role: requester?.role ?? '',
          department: requester?.department ?? '',
          start_date: requester?.start_date ?? null,
          status: requester?.status ?? 'active',
          purpose: purpose.trim(),
        },
      });
      if (error || data?.error || !data?.body) {
        setGenError(data?.error ?? error?.message ?? 'Generation failed — try again.');
        return;
      }
      const title = data.title || req.doc_type;
      const html = renderCertificateHTML(title, data.body, req.contractor_id, HUNA_LOGO, FRANCIS_SIG);
      setGeneratedHtml(html);
      setGeneratedTitle(title);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed — try again.');
    } finally {
      setGenerating(false);
    }
  };

  const generatePaymentSummary = async () => {
    setGenerating(true);
    setGenError('');
    setSendError('');
    try {
      const [{ data: payrollData, error: payrollErr }, { data: pcData, error: pcErr }] = await Promise.all([
        supabase
          .from('hub_payouts')
          .select('cutoff_start, cutoff_end, approved_hours, base_pay, overtime_pay, bonus, incentives, reimbursements, deductions, advances, penalties, final_payout, payment_date')
          .eq('contractor_id', req.contractor_id)
          .eq('status', 'paid')
          .gte('cutoff_start', dateFrom)
          .lte('cutoff_end', dateTo)
          .order('cutoff_start', { ascending: true }),
        supabase
          .from('hub_project_contractors')
          .select('id, hub_projects(project_name, client_name)')
          .eq('contractor_id', req.contractor_id),
      ]);

      if (payrollErr) { setGenError(payrollErr.message); return; }
      if (pcErr) { setGenError(pcErr.message); return; }

      const pcRows = (pcData as any[]) ?? [];
      const pcIds = pcRows.map(p => p.id);
      const pcLabelById = new Map(pcRows.map(p => {
        const proj = p.hub_projects as any;
        return [p.id, proj ? `${proj.project_name} — ${proj.client_name}` : 'Unknown Project'];
      }));

      let projectRows: ProjectPayoutRow[] = [];
      if (pcIds.length > 0) {
        const { data: payoutData, error: payoutErr } = await supabase
          .from('hub_project_contractor_payouts')
          .select('amount, paid_at, notes, project_contractor_id')
          .in('project_contractor_id', pcIds)
          .gte('paid_at', dateFrom)
          .lte('paid_at', dateTo)
          .order('paid_at', { ascending: true });
        if (payoutErr) { setGenError(payoutErr.message); return; }
        projectRows = ((payoutData as any[]) ?? []).map(r => ({
          paid_at: r.paid_at,
          amount: r.amount,
          notes: r.notes,
          project_label: pcLabelById.get(r.project_contractor_id) ?? 'Unknown Project',
        }));
      }

      const title = 'Payment Summary';
      const html = renderPaymentSummaryHTML(
        requester?.full_name ?? '',
        requester?.currency ?? 'PHP',
        (payrollData as PayoutRow[]) ?? [],
        projectRows,
        dateFrom,
        dateTo,
        req.contractor_id,
        HUNA_LOGO,
        FRANCIS_SIG,
      );
      setGeneratedHtml(html);
      setGeneratedTitle(title);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed — try again.');
    } finally {
      setGenerating(false);
    }
  };

  const sendCertificate = async () => {
    if (!generatedHtml) return;
    setSending(true);
    setSendError('');
    try {
      const { data, error } = await supabase.functions.invoke('send-hr-certificate', {
        body: { request_id: req.id, title: generatedTitle, html: generatedHtml },
      });
      if (error || data?.error) {
        setSendError(data?.error ?? error?.message ?? 'Send failed — try again.');
        return;
      }
      setSent(true);
      setStatus('completed');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed — try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('hub_doc_requests').update({
      status,
      admin_notes: adminNotes || null,
      file_name: fileName || null,
      file_url: fileUrl || null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.id);
    setSaving(false);
    onSaved();
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Review Document Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer w-6 h-6 flex items-center justify-center">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <i className="ri-file-text-line text-[#FF6B35]"></i>
              <span className="font-medium text-gray-800 text-sm">{req.doc_type}</span>
            </div>
            <p className="text-xs text-gray-500">Requested by: <span className="font-medium text-gray-700">{(req.hub_users as any)?.full_name}</span></p>
            {req.notes && <p className="text-sm text-gray-600 mt-1">{req.notes}</p>}
            <p className="text-xs text-gray-400">{new Date(req.created_at!).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>

          {canGenerate && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <i className="ri-sparkling-2-line"></i> Generate with AI
              </p>
              <input
                type="text"
                className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
                placeholder="Purpose (e.g. visa application) — optional"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
              />
              {genError && <p className="text-xs text-red-500">{genError}</p>}
              <button
                type="button"
                onClick={generateCertificate}
                disabled={generating}
                className="w-full py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-40 font-medium flex items-center justify-center gap-1.5"
              >
                {generating
                  ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Drafting…</>
                  : <><i className="ri-magic-line text-sm"></i> Generate & Preview Certificate</>}
              </button>
              <p className="text-[10px] text-indigo-400">Opens a formatted certificate in a new tab for review.</p>
            </div>
          )}

          {isPaymentSummary && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                <i className="ri-bar-chart-2-line"></i> Generate from Payroll Records
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-indigo-500 mb-0.5">From</label>
                  <input type="date" className="w-full border border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] text-indigo-500 mb-0.5">To</label>
                  <input type="date" className="w-full border border-indigo-200 bg-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              {genError && <p className="text-xs text-red-500">{genError}</p>}
              <button
                type="button"
                onClick={generatePaymentSummary}
                disabled={generating}
                className="w-full py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-40 font-medium flex items-center justify-center gap-1.5"
              >
                {generating
                  ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Pulling records…</>
                  : <><i className="ri-magic-line text-sm"></i> Generate & Preview Summary</>}
              </button>
              <p className="text-[10px] text-indigo-400">Pulls real, paid payout records from the hub for this date range — no figures are AI-generated.</p>
            </div>
          )}

          {(canGenerate || isPaymentSummary) && generatedHtml && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
              {sendError && <p className="text-xs text-red-500">{sendError}</p>}
              {sent ? (
                <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                  <i className="ri-checkbox-circle-fill"></i> Sent to {requester?.full_name} — request marked completed.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={sendCertificate}
                  disabled={sending || !requester?.email}
                  className="w-full py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer disabled:opacity-40 font-medium flex items-center justify-center gap-1.5"
                >
                  {sending
                    ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Sending…</>
                    : <><i className="ri-mail-send-line text-sm"></i> Send PDF to {requester?.full_name?.split(' ')[0] || 'Employee'}</>}
                </button>
              )}
              {!requester?.email && !sent && <p className="text-[10px] text-red-400">This employee has no email on file — add one before sending.</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as HubDocRequest['status'])}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Admin Notes</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Add notes for the contractor..."
              maxLength={500}
            />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-600 mb-2">Upload Document Link</p>
            <div className="space-y-2">
              <input type="text" className={inputCls} placeholder="File name (e.g. Carlos_COE.pdf)" value={fileName} onChange={e => setFileName(e.target.value)} />
              <input type="text" className={inputCls} placeholder="File URL or download link" value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#FF6B35] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e55a24] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDocRequestsPage() {
  const { isDemo } = useDemo();

  if (isDemo) return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <i className="ri-lock-2-line text-3xl opacity-40"></i>
        <p className="text-sm font-medium">Not available in demo</p>
        <p className="text-xs text-gray-300">This section requires a live account.</p>
      </div>
    </AdminLayout>
  );

  const [requests, setRequests] = useState<HubDocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<HubDocRequest | null>(null);
  const [toast, setToast] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchRequests(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3000);
  };

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hub_doc_requests')
      .select('*, hub_users(full_name, email, avatar_url, department, role, start_date, status, currency)')
      .order('created_at', { ascending: false });
    setRequests((data as HubDocRequest[]) ?? []);
    setLoading(false);
  };

  const filtered = requests.filter(r => {
    const user = r.hub_users as any;
    const matchSearch = !search || user?.full_name?.toLowerCase().includes(search.toLowerCase()) || r.doc_type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchType = filterType === 'all' || r.doc_type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inProgressCount = requests.filter(r => r.status === 'in_progress').length;

  return (
    <AdminLayout title="Document Requests">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">Review and fulfil employee document requests</p>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
            {inProgressCount > 0 && (
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                {inProgressCount} in progress
              </span>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input type="text" placeholder="Search..." className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 w-48" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white cursor-pointer" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white cursor-pointer" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading requests…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <i className="ri-file-list-3-line text-3xl text-gray-300 mb-2 block"></i>
              <p className="text-gray-400 text-sm">No document requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Employee','Document Type','Notes','Status','File','Requested','Actions'].map(h => (
                      <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const user = r.hub_users as any;
                    return (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-[#FF6B35]/10 flex-shrink-0">
                              <span className="text-xs font-semibold text-[#FF6B35]">{user?.full_name?.charAt(0)}</span>
                            </div>
                            <span className="font-medium text-gray-800 whitespace-nowrap">{user?.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-700 whitespace-nowrap">{r.doc_type}</span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-gray-500 text-xs line-clamp-2">{r.notes || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status]}`}>
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.file_url ? (
                            <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#FF6B35] hover:underline whitespace-nowrap cursor-pointer">
                              <i className="ri-download-2-line"></i>
                              {r.file_name || 'Download'}
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(r.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setReviewing(r)}
                            className="text-xs bg-gray-100 hover:bg-[#FF6B35] hover:text-white text-gray-600 px-3 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {reviewing && (
        <ReviewModal
          req={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={() => { setReviewing(null); fetchRequests(); showToast('Request updated!'); }}
        />
      )}
    </AdminLayout>
  );
}