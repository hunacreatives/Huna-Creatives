import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

const CALENDLY = 'https://calendly.com/hunacreatives/30min';

type SubmissionStatus = 'new' | 'read' | 'replied' | 'archived';
type ActiveTab = 'inbox' | 'sent' | 'proposals';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  service: string | null;
  message: string;
  status: SubmissionStatus;
  created_at: string;
}

interface ContactReply {
  id: number;
  submission_id: number | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  body: string;
  sent_at: string;
}

interface Proposal {
  id: number;
  slug: string;
  client_name: string;
  to_email: string;
  project_title: string | null;
  accent_color: string;
  status: 'draft' | 'published' | 'sent';
  sent_at: string | null;
  created_at: string;
}

const statusColors: Record<SubmissionStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  read: 'bg-sky-100 text-sky-700',
  replied: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const proposalStatusColors = {
  draft: 'bg-gray-100 text-gray-500',
  published: 'bg-sky-100 text-sky-700',
  sent: 'bg-emerald-100 text-emerald-700',
};

const statusOptions: SubmissionStatus[] = ['new', 'read', 'replied', 'archived'];

function buildReplyTemplate(name: string, service: string | null) {
  const serviceRef = service ? ` regarding ${service}` : '';
  return `Hi ${name},

Thank you for reaching out${serviceRef} — we're excited to learn more about what you have in mind.

We'd love to set up a quick call to discuss your goals and see how Huna Creatives can help.

${CALENDLY}

Looking forward to connecting!

Warm regards,
The Huna Creatives Team`;
}

export default function ContactSubmissionsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ActiveTab>('inbox');

  // Inbox
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all');
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [updating, setUpdating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Compose (reply)
  const [composing, setComposing] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeTo, setComposeTo] = useState('');
  const [composeName, setComposeName] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);

  // Sent
  const [replies, setReplies] = useState<ContactReply[]>([]);
  const [selectedReply, setSelectedReply] = useState<ContactReply | null>(null);

  // Proposals
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [creatingProposal, setCreatingProposal] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    let q = supabase.from('contact_submissions').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setSubmissions((data as ContactSubmission[]) ?? []);
    setLoading(false);
  };

  const fetchReplies = async () => {
    const { data } = await supabase.from('contact_replies').select('*').order('sent_at', { ascending: false });
    setReplies((data as ContactReply[]) ?? []);
  };

  const fetchProposals = async () => {
    const { data } = await supabase.from('hub_proposals').select('*').order('created_at', { ascending: false });
    setProposals((data as Proposal[]) ?? []);
  };

  useEffect(() => { fetchSubmissions(); }, [filter]);
  useEffect(() => { if (tab === 'sent') fetchReplies(); }, [tab]);
  useEffect(() => { if (tab === 'proposals') fetchProposals(); }, [tab]);

  const updateStatus = async (id: number, status: SubmissionStatus) => {
    setUpdating(true);
    await supabase.from('contact_submissions').update({ status }).eq('id', id);
    setUpdating(false);
    setSelected(prev => prev ? { ...prev, status } : prev);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const deleteSubmission = async (id: number) => {
    setDeleting(true);
    await supabase.from('contact_submissions').delete().eq('id', id);
    setDeleting(false);
    setConfirmDeleteId(null);
    setSelected(null);
    setComposing(false);
    setSubmissions(prev => prev.filter(s => s.id !== id));
  };

  const openCompose = (s: ContactSubmission) => {
    const serviceRef = s.service ? ` — ${s.service}` : '';
    setComposeTo(s.email);
    setComposeName(s.name);
    setComposeSubject(`Re: Your inquiry${serviceRef}`);
    setComposeBody(buildReplyTemplate(s.name, s.service));
    setSendResult(null);
    setComposing(true);
  };

  const openBlankCompose = () => {
    setSelected(null);
    setComposeTo('');
    setComposeName('');
    setComposeSubject('');
    setComposeBody(buildReplyTemplate('there', null));
    setSendResult(null);
    setComposing(true);
  };

  const sendReply = async () => {
    const toEmail = selected?.email ?? composeTo;
    if (!toEmail) return;
    setSending(true);
    setSendResult(null);
    try {
      const { error } = await supabase.functions.invoke('send-contact-reply', {
        body: {
          submission_id: selected?.id ?? null,
          to_email: toEmail,
          to_name: selected?.name ?? composeName,
          subject: composeSubject,
          body: composeBody,
        },
      });
      if (error) throw error;
      setSendResult('success');
      fetchReplies();
      if (selected) {
        const updated = { ...selected, status: 'replied' as SubmissionStatus };
        setSelected(updated);
        setSubmissions(prev => prev.map(s => s.id === selected.id ? updated : s));
      }
      setTimeout(() => { setComposing(false); setSendResult(null); }, 1800);
    } catch {
      setSendResult('error');
    } finally {
      setSending(false);
    }
  };

  const createProposal = async (fromSubmission?: ContactSubmission) => {
    setCreatingProposal(true);
    const name = fromSubmission?.name || '';
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'proposal'}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from('hub_proposals').insert({
      slug,
      client_name: name,
      to_email: fromSubmission?.email || '',
      project_title: fromSubmission?.service ? `Brand Engagement — ${fromSubmission.service}` : '',
      submission_id: fromSubmission?.id ?? null,
      accent_color: '#FF6B35',
      sections: [
        { heading: 'What We Observed', body: '' },
        { heading: 'What We Propose', body: '' },
        { heading: 'Why Now', body: '' },
        { heading: 'Our Scope', body: '' },
      ],
      status: 'draft',
    }).select().single();
    setCreatingProposal(false);
    if (!error && data) navigate(`/hub/admin/proposals/${data.id}`);
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const fmtShort = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <AdminLayout title="Contact Inbox">
      <div className="space-y-5">

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {([
            ['inbox', 'ri-inbox-line', 'Inbox'],
            ['sent', 'ri-send-plane-line', 'Sent'],
            ['proposals', 'ri-file-text-line', 'Proposals'],
          ] as const).map(([t, icon, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <i className={`${icon} text-sm`} />{label}
              {t === 'inbox' && submissions.filter(s => s.status === 'new').length > 0 && (
                <span className="bg-[#FF6B35] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {submissions.filter(s => s.status === 'new').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Proposals tab ── */}
        {tab === 'proposals' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-400">{proposals.length} proposal{proposals.length !== 1 ? 's' : ''}</p>
              <button onClick={() => createProposal()}
                disabled={creatingProposal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#e55a27] transition-colors cursor-pointer disabled:opacity-40">
                {creatingProposal
                  ? <><i className="ri-loader-4-line animate-spin text-sm" /> Creating…</>
                  : <><i className="ri-add-line text-sm" /> New Proposal</>}
              </button>
            </div>
            {proposals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <i className="ri-file-text-line text-3xl text-gray-200 block mb-3" />
                <p className="text-sm text-gray-400 mb-4">No proposals yet</p>
                <button onClick={() => createProposal()}
                  className="text-xs text-[#FF6B35] font-medium hover:underline cursor-pointer">
                  Create your first proposal
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Hardcoded proposals built by Claude */}
                <a href="/p/capu-coffee" target="_blank" rel="noopener noreferrer"
                  className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                  <div className="h-1.5" style={{ background: '#C4873A' }} />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-medium text-sm text-gray-900">Capu Coffee</span>
                      <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">draft</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-2">Brand Elevation — Capu Coffee</p>
                    <p className="text-[11px] text-gray-400">Jun 2026</p>
                  </div>
                  <div className="px-4 pb-3 flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                    <i className="ri-external-link-line" /> View proposal
                  </div>
                </a>
                {proposals.map(p => (
                  <button key={p.id}
                    onClick={() => navigate(`/hub/admin/proposals/${p.id}`)}
                    className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group">
                    {/* Color band */}
                    <div className="h-1.5" style={{ background: p.accent_color }} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{p.client_name || 'Untitled'}</span>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${proposalStatusColors[p.status]}`}>
                          {p.status}
                        </span>
                      </div>
                      {p.project_title && (
                        <p className="text-xs text-gray-500 truncate mb-2">{p.project_title}</p>
                      )}
                      <p className="text-[11px] text-gray-400">{fmtShort(p.created_at)}</p>
                    </div>
                    <div className="px-4 pb-3 flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                      <i className="ri-edit-line" /> Edit proposal
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sent tab ── */}
        {tab === 'sent' && (
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-2">
              {replies.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                  <i className="ri-send-plane-line text-3xl text-gray-200 block mb-3" />
                  <p className="text-sm text-gray-400">No emails sent yet</p>
                </div>
              ) : replies.map(r => (
                <button key={r.id} onClick={() => setSelectedReply(r)}
                  className={`w-full text-left bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selectedReply?.id === r.id ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">{r.to_name || r.to_email}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{fmt(r.sent_at)}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate mb-1">{r.to_email}</p>
                  <p className="text-xs font-medium text-gray-600 truncate">{r.subject}</p>
                  <p className="text-xs text-gray-400 truncate mt-1">{r.body}</p>
                </button>
              ))}
            </div>
            {selectedReply && (
              <div className="w-[380px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-0">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedReply.to_name || selectedReply.to_email}</p>
                    <p className="text-xs text-gray-400">{selectedReply.to_email}</p>
                  </div>
                  <button onClick={() => setSelectedReply(null)} className="text-gray-300 hover:text-gray-500 cursor-pointer">
                    <i className="ri-close-line text-lg" />
                  </button>
                </div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{selectedReply.subject}</p>
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                  {selectedReply.body}
                </div>
                <p className="text-[11px] text-gray-400">Sent {fmt(selectedReply.sent_at)}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Inbox tab ── */}
        {tab === 'inbox' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: submissions.length, color: 'text-gray-900' },
                { label: 'New', value: submissions.filter(s => s.status === 'new').length, color: 'text-amber-600' },
                { label: 'Replied', value: submissions.filter(s => s.status === 'replied').length, color: 'text-emerald-600' },
                { label: 'Archived', value: submissions.filter(s => s.status === 'archived').length, color: 'text-gray-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Filters + actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {(['all', ...statusOptions] as const).map(s => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize cursor-pointer transition-colors ${filter === s ? 'bg-[#FF6B35] text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => createProposal()}
                  disabled={creatingProposal}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40 flex-shrink-0">
                  {creatingProposal
                    ? <><i className="ri-loader-4-line animate-spin text-sm" /> Creating…</>
                    : <><i className="ri-file-text-line text-sm" /> New Proposal</>}
                </button>
                <button onClick={openBlankCompose}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#e55a27] transition-colors cursor-pointer flex-shrink-0">
                  <i className="ri-send-plane-line text-sm" />
                  New Message
                </button>
              </div>
            </div>

            <div className="flex gap-5 items-start">
              {/* Submissions list */}
              <div className="flex-1 min-w-0 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <i className="ri-loader-4-line animate-spin text-2xl text-gray-300" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <i className="ri-mail-line text-3xl text-gray-200 block mb-3" />
                    <p className="text-sm text-gray-400">No submissions yet</p>
                  </div>
                ) : submissions.map(s => (
                  <button key={s.id}
                    onClick={() => { setSelected(s); setComposing(false); }}
                    className={`w-full text-left bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-sm ${selected?.id === s.id ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-sm text-gray-900 truncate">{s.name}</span>
                        <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>
                          {s.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{fmt(s.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mb-1">{s.email}</p>
                    {s.service && <p className="text-xs font-medium text-[#FF6B35] truncate">{s.service}</p>}
                    {!s.service && s.subject && <p className="text-xs font-medium text-gray-600 truncate">{s.subject}</p>}
                    <p className="text-xs text-gray-400 truncate mt-1">{s.message}</p>
                  </button>
                ))}
              </div>

              {/* Standalone compose panel */}
              {composing && !selected && (
                <div className="w-[380px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-0 overflow-hidden">
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">New Message</p>
                      <button onClick={() => setComposing(false)} className="text-gray-300 hover:text-gray-500 cursor-pointer">
                        <i className="ri-close-line text-lg" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">To (email)</label>
                      <input type="email" value={composeTo} onChange={e => setComposeTo(e.target.value)}
                        placeholder="client@email.com"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Name</label>
                      <input type="text" value={composeName} onChange={e => setComposeName(e.target.value)}
                        placeholder="Client name"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Subject</label>
                      <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                        placeholder="Subject line"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Message</label>
                      <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)}
                        rows={12}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300 resize-none leading-relaxed" />
                    </div>
                    {sendResult === 'error' && <p className="text-xs text-red-500">Failed to send. Please try again.</p>}
                    <div className="flex gap-2">
                      <button onClick={sendReply}
                        disabled={sending || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#e55a27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        {sending ? <><i className="ri-loader-4-line animate-spin" /> Sending…</>
                          : sendResult === 'success' ? <><i className="ri-check-line" /> Sent!</>
                          : <><i className="ri-send-plane-line" /> Send Email</>}
                      </button>
                      <button onClick={() => setComposing(false)}
                        className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Submission detail panel */}
              {selected && (
                <div className="w-[380px] flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm sticky top-0 overflow-hidden">
                  {composing ? (
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">Reply to {selected.name}</p>
                        <button onClick={() => setComposing(false)} className="text-gray-300 hover:text-gray-500 cursor-pointer">
                          <i className="ri-close-line text-lg" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                        To: <span className="text-gray-700 font-medium">{selected.email}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Subject</label>
                        <input type="text" value={composeSubject} onChange={e => setComposeSubject(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Message</label>
                        <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)}
                          rows={14}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300 resize-none leading-relaxed" />
                      </div>
                      {sendResult === 'error' && <p className="text-xs text-red-500">Failed to send. Please try again.</p>}
                      <div className="flex gap-2">
                        <button onClick={sendReply}
                          disabled={sending || !composeSubject.trim() || !composeBody.trim()}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#e55a27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                          {sending ? <><i className="ri-loader-4-line animate-spin" /> Sending…</>
                            : sendResult === 'success' ? <><i className="ri-check-line" /> Sent!</>
                            : <><i className="ri-send-plane-line" /> Send Email</>}
                        </button>
                        <button onClick={() => setComposing(false)}
                          className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div>
                          <p className="font-semibold text-gray-900">{selected.name}</p>
                          <a href={`mailto:${selected.email}`} className="text-xs text-[#FF6B35] hover:underline">{selected.email}</a>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-gray-300 hover:text-gray-500 cursor-pointer">
                          <i className="ri-close-line text-lg" />
                        </button>
                      </div>

                      {selected.service && (
                        <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-[#FF6B35] mb-3">{selected.service}</span>
                      )}
                      {!selected.service && selected.subject && (
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{selected.subject}</p>
                      )}

                      <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
                        {selected.message}
                      </div>

                      <p className="text-[11px] text-gray-400 mb-4">{fmt(selected.created_at)}</p>

                      {/* Action buttons */}
                      <div className="flex gap-2 mb-4">
                        <button onClick={() => openCompose(selected)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#e55a27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer">
                          <i className="ri-send-plane-line" /> Reply
                        </button>
                        <button onClick={() => createProposal(selected)}
                          disabled={creatingProposal}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40">
                          {creatingProposal
                            ? <><i className="ri-loader-4-line animate-spin" /> Creating…</>
                            : <><i className="ri-file-text-line" /> Proposal</>}
                        </button>
                      </div>

                      {/* Status */}
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-medium">Status</p>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map(s => (
                            <button key={s} disabled={updating || selected.status === s}
                              onClick={() => updateStatus(selected.id, s)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selected.status === s ? statusColors[s] : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-100">
                        {confirmDeleteId === selected.id ? (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-500 flex-1">Delete this message?</p>
                            <button onClick={() => deleteSubmission(selected.id)} disabled={deleting}
                              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                              {deleting ? 'Deleting…' : 'Delete'}
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(selected.id)}
                            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer">
                            <i className="ri-delete-bin-line" /> Delete message
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
