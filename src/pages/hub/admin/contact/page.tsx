import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import {
  computeQuoteTotals, formatQuoteCurrency,
  type QuoteCurrency, type QuoteLineItem, type ProposalStatus,
} from '@/lib/quotation';

type SubmissionStatus = 'new' | 'read' | 'replied' | 'archived';
type ActiveTab = 'inbox' | 'sent' | 'quotations';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  service: string | null;
  message: string;
  status: SubmissionStatus;
  quote_requested_at: string | null;
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
  doc_type: 'proposal' | 'quotation';
  client_name: string;
  to_email: string;
  project_title: string | null;
  accent_color: string;
  line_items: QuoteLineItem[];
  currency: QuoteCurrency;
  discount: number | string;
  tax_rate: number | string;
  valid_until: string | null;
  status: ProposalStatus;
  sent_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  created_at: string;
}

const statusColors: Record<SubmissionStatus, string> = {
  new: 'bg-amber-100 text-amber-700',
  read: 'bg-sky-100 text-sky-700',
  replied: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-500',
};

const proposalStatusColors: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-500',
  published: 'bg-sky-100 text-sky-700',
  sent: 'bg-indigo-100 text-indigo-700',
  viewed: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  expired: 'bg-gray-100 text-gray-400',
};

const statusOptions: SubmissionStatus[] = ['new', 'read', 'replied', 'archived'];

function buildReplyTemplate(name: string, service: string | null) {
  const serviceRef = service ? ` about ${service}` : '';
  return `Hi ${name},

Thank you for reaching out${serviceRef} — we'd love to help.

Here's a quick overview of how we work:

**Social Media Design — from ₱10,000 / month**
- 8 deliverables per month (feed posts, carousels, or Stories sets)
- On-brand templates so your feed stays consistent
- Caption writing and hashtag research
- Scheduling, publishing, and a monthly performance snapshot
- 2 revision rounds per deliverable

The best next step is a short call so we can tailor a package to your goals. You can also request a formal quotation using the button below.

Looking forward to connecting!

Warm regards,
The Huna Creatives Team`;
}

// Inline **bold** for the reply preview.
function renderInline(s: string): React.ReactNode {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => {
    const m = p.match(/^\*\*([^*]+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : <span key={i}>{p}</span>;
  });
}

// Mirrors renderRichBody() in the send-contact-reply edge function so the
// preview matches the email the client receives.
function renderRichText(text: string): React.ReactNode[] {
  const lines = text.split('\n').map((l) => l.trim());
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={key} className="list-disc pl-5 my-2 space-y-1">
        {bullets.map((b, i) => <li key={i}>{renderInline(b)}</li>)}
      </ul>,
    );
    bullets = [];
  };
  lines.forEach((line, idx) => {
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) { bullets.push(bullet[1]); return; }
    flush(`ul-${idx}`);
    if (line === '') { blocks.push(<div key={idx} className="h-2" />); return; }
    const heading = line.match(/^\*\*(.+)\*\*$/);
    if (heading) {
      blocks.push(<p key={idx} className="font-bold text-gray-900 mt-2 mb-1">{heading[1]}</p>);
      return;
    }
    blocks.push(<p key={idx} className="mb-2">{renderInline(line)}</p>);
  });
  flush('ul-end');
  return blocks;
}

function ReplyPreview({ body, withQuote }: { body: string; withQuote: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Preview</label>
      <div className="border border-gray-100 rounded-lg px-3 py-3 bg-gray-50 text-sm text-gray-700 leading-relaxed max-h-72 overflow-y-auto"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {body.trim() ? renderRichText(body) : <span className="text-gray-400 italic">Nothing to preview yet</span>}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-block bg-gray-900 text-white text-[10px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded">
            Schedule a Meeting →
          </span>
          {withQuote && (
            <span className="inline-block bg-[#FF6B35] text-white text-[10px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded">
              Request a Formal Quotation →
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-400">
        <code className="bg-gray-100 px-1 rounded">- </code> for bullets, <code className="bg-gray-100 px-1 rounded">**text**</code> for bold.
        {withQuote ? ' Both buttons are added automatically.' : ' The Schedule a Meeting button is added automatically.'}
      </p>
    </div>
  );
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
  const [sendingProposalId, setSendingProposalId] = useState<number | null>(null);
  const [proposalSendResult, setProposalSendResult] = useState<Record<number, 'success' | 'error'>>({});

  // Send modal
  const [sendModal, setSendModal] = useState<Proposal | null>(null);
  const [sendModalEmail, setSendModalEmail] = useState('');
  const [sendModalThankYou, setSendModalThankYou] = useState('');

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
  useEffect(() => { if (tab === 'quotations') fetchProposals(); }, [tab]);

  const openSendModal = (e: React.MouseEvent, p: Proposal) => {
    e.stopPropagation();
    setSendModal(p);
    setSendModalEmail(p.to_email || '');
    setSendModalThankYou('');
    setProposalSendResult(prev => { const r = { ...prev }; delete r[p.id]; return r; });
  };

  const sendProposalFromModal = async () => {
    const p = sendModal;
    if (!p || !sendModalEmail.trim()) return;
    setSendingProposalId(p.id);
    setProposalSendResult(prev => { const r = { ...prev }; delete r[p.id]; return r; });

    try {
      // send-quotation renders and mails what's in the database, then flips the
      // status itself — so nothing here needs to duplicate that.
      const { data, error } = await supabase.functions.invoke('send-quotation', {
        body: {
          id: p.id,
          to_email: sendModalEmail.trim(),
          intro: sendModalThankYou.trim() || null,
        },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Send failed');

      setProposals(prev => prev.map(x => x.id === p.id
        ? { ...x, status: 'sent', sent_at: new Date().toISOString(), to_email: sendModalEmail.trim() }
        : x));
      setProposalSendResult(prev => ({ ...prev, [p.id]: 'success' }));
      setSendModal(null);
    } catch {
      setProposalSendResult(prev => ({ ...prev, [p.id]: 'error' }));
    } finally {
      setSendingProposalId(null);
    }
  };

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
    const name = fromSubmission?.name || 'New Client';
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'quote'}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from('hub_proposals').insert({
      slug,
      doc_type: 'quotation',
      client_name: name,
      to_email: fromSubmission?.email ?? '',
      project_title: fromSubmission?.service ?? '',
      tagline: '',
      accent_color: '#FF6B35',
      sections: [],
      line_items: [],
      currency: 'PHP',
      submission_id: fromSubmission?.id ?? null,
      status: 'draft',
    }).select().single();
    setCreatingProposal(false);
    if (!error && data) navigate(`/hub/admin/proposals/${data.id}`);
  };

  // Sent or opened but no answer yet — the ones worth chasing.
  const awaitingReply = proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length;

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
            ['quotations', 'ri-price-tag-3-line', 'Quotations'],
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

        {/* ── Quotations tab ── */}
        {tab === 'quotations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-400">
                  {proposals.length} document{proposals.length !== 1 ? 's' : ''}
                </p>
                {awaitingReply > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                    {awaitingReply} awaiting a decision
                  </span>
                )}
              </div>
              <button onClick={() => createProposal()}
                disabled={creatingProposal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#e55a27] transition-colors cursor-pointer disabled:opacity-40">
                {creatingProposal
                  ? <><i className="ri-loader-4-line animate-spin text-sm" /> Creating…</>
                  : <><i className="ri-add-line text-sm" /> New Quotation</>}
              </button>
            </div>
            {proposals.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <i className="ri-price-tag-3-line text-3xl text-gray-200 block mb-3" />
                <p className="text-sm text-gray-400 mb-1">No quotations yet</p>
                <p className="text-xs text-gray-400 mb-4">
                  Open a message in the Inbox and hit Quotation to draft one from their enquiry.
                </p>
                <button onClick={() => createProposal()}
                  className="text-xs text-[#FF6B35] font-medium hover:underline cursor-pointer">
                  Or start one from scratch
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {proposals.map(p => {
                  const total = computeQuoteTotals(p.line_items ?? [], p.discount ?? 0, p.tax_rate ?? 0).total;
                  const settled = p.status === 'accepted' || p.status === 'declined';
                  return (
                    <div key={p.id}
                      onClick={() => navigate(`/hub/admin/proposals/${p.id}`)}
                      className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group">
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
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[11px] text-gray-400">{fmtShort(p.created_at)}</p>
                          {p.doc_type === 'quotation' && total > 0 && (
                            <p className="text-xs font-semibold text-gray-700 tabular-nums">
                              {formatQuoteCurrency(total, p.currency === 'USD' ? 'USD' : 'PHP')}
                            </p>
                          )}
                        </div>
                        {p.status === 'accepted' && (
                          <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1">
                            <i className="ri-checkbox-circle-line" />
                            Accepted by {p.accepted_by_name || p.client_name} — send the contract
                          </p>
                        )}
                      </div>
                      <div className="px-4 pb-3 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                          <i className="ri-edit-line" /> Open
                        </span>
                        {/* A settled quotation is a record, not a draft — don't offer to resend it. */}
                        {!settled && (
                          <button
                            onClick={e => openSendModal(e, p)}
                            className="flex items-center gap-1 text-[11px] font-semibold cursor-pointer transition-colors text-[#FF6B35] hover:text-[#e55a27]">
                            {proposalSendResult[p.id] === 'error'
                              ? <><i className="ri-error-warning-line" /> Failed</>
                              : p.status === 'sent' || p.status === 'viewed'
                                ? <><i className="ri-refresh-line" /> Resend</>
                                : <><i className="ri-send-plane-line" /> Send to client</>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                    : <><i className="ri-price-tag-3-line text-sm" /> New Quotation</>}
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
                    {s.quote_requested_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-[#FF6B35] mt-1.5">
                        <i className="ri-price-tag-3-line" /> Quotation requested
                      </span>
                    )}
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
                    <ReplyPreview body={composeBody} withQuote={false} />
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
                      <ReplyPreview body={composeBody} withQuote={!!selected} />
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

                      {selected.quote_requested_at && (
                        <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4">
                          <i className="ri-price-tag-3-line text-[#FF6B35] mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-[#FF6B35]">Formal quotation requested</p>
                            <p className="text-[11px] text-gray-500">{fmt(selected.quote_requested_at)} — use the Quotation button below to draft one.</p>
                          </div>
                        </div>
                      )}

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
                            : <><i className="ri-price-tag-3-line" /> Quotation</>}
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

      {/* ── Send Quotation Modal ── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSendModal(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-[#111] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: sendModal.accent_color }}>
                  <i className={`${sendModal.status === 'sent' ? 'ri-refresh-line' : 'ri-send-plane-line'} text-white text-sm`} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">
                    {sendModal.status === 'sent' || sendModal.status === 'viewed' ? 'Resend Quotation' : 'Send Quotation'}
                  </p>
                  <p className="text-gray-400 text-[11px] truncate max-w-[220px]">{sendModal.client_name}{sendModal.project_title ? ` — ${sendModal.project_title}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setSendModal(null)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <i className="ri-close-line text-lg" />
              </button>
            </div>

            {/* Accent stripe */}
            <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${sendModal.accent_color}, transparent)` }} />

            <div className="p-6 space-y-5">
              {/* Email field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Send to</label>
                <input
                  type="email"
                  value={sendModalEmail}
                  onChange={e => setSendModalEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-orange-300"
                />
              </div>

              {/* Thank you context */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Thank you for…</label>
                <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-orange-300 transition-colors">
                  <span className="text-sm text-gray-400 whitespace-nowrap flex-shrink-0">Thank you for</span>
                  <input
                    type="text"
                    value={sendModalThankYou}
                    onChange={e => setSendModalThankYou(e.target.value)}
                    placeholder="your time on our discovery call"
                    className="flex-1 text-sm text-gray-800 focus:outline-none min-w-0"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Leave blank to use "Thank you for your time."</p>
              </div>

              {/* Preview snippet */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2 text-[13px] text-gray-500 leading-relaxed">
                <p>{sendModalThankYou.trim() ? `Thank you for ${sendModalThankYou.trim()}.` : 'Thank you for your time.'}</p>
                <p>Here is the proposal{sendModal.project_title ? ` for ${sendModal.project_title}` : ''} we put together for you:</p>
                <div className="mt-3">
                  <span className="inline-block bg-[#111] text-white text-[11px] font-bold tracking-wide px-5 py-2.5 rounded">
                    View Proposal →
                  </span>
                </div>
              </div>

              {proposalSendResult[sendModal.id] === 'error' && (
                <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2">Failed to send. Please try again.</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={sendProposalFromModal}
                  disabled={sendingProposalId === sendModal.id || !sendModalEmail.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#e55a27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  {sendingProposalId === sendModal.id
                    ? <><i className="ri-loader-4-line animate-spin" /> Sending…</>
                    : sendModal.status === 'sent'
                      ? <><i className="ri-refresh-line" /> Resend Quotation</>
                      : <><i className="ri-send-plane-line" /> Send Quotation</>}
                </button>
                <button onClick={() => setSendModal(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
