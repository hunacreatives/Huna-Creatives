import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import {
  computeQuoteTotals, formatQuoteCurrency, formatQuoteDate, lineTotal,
  paymentScheduleGap, isQuoteExpired,
  type QuoteCurrency, type QuoteLineItem, type QuotePaymentMilestone,
  type ProposalDocType, type ProposalStatus,
} from '@/lib/quotation';

interface ProposalSection {
  heading: string;
  body: string;
}

interface Proposal {
  id: number;
  slug: string;
  doc_type: ProposalDocType;
  client_name: string;
  to_email: string;
  cc_email: string | null;
  project_title: string;
  tagline: string;
  accent_color: string;
  sections: ProposalSection[];
  line_items: QuoteLineItem[];
  currency: QuoteCurrency;
  discount: number | string;
  tax_rate: number | string;
  valid_until: string | null;
  terms: string;
  payment_schedule: QuotePaymentMilestone[];
  status: ProposalStatus;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  accepted_note: string | null;
  created_at: string;
}

const ACCENT_PRESETS = [
  { label: 'Huna Orange', value: '#FF6B35' },
  { label: 'Espresso', value: '#4A2C1A' },
  { label: 'Forest', value: '#2D5A27' },
  { label: 'Midnight', value: '#1A1A2E' },
  { label: 'Slate', value: '#334155' },
  { label: 'Gold', value: '#B8860B' },
  { label: 'Clay', value: '#8B4513' },
  { label: 'Ink', value: '#1C1C1C' },
];

const DEFAULT_SECTIONS: ProposalSection[] = [
  { heading: 'What We Observed', body: '' },
  { heading: 'What We Propose', body: '' },
  { heading: 'Why Now', body: '' },
  { heading: 'Our Scope', body: '' },
];

const STATUS_BADGES: Record<ProposalStatus, string> = {
  draft: 'bg-gray-100 text-gray-500',
  published: 'bg-sky-100 text-sky-700',
  sent: 'bg-indigo-100 text-indigo-700',
  viewed: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  expired: 'bg-gray-100 text-gray-400',
};

/** A quotation is out of the editor's hands once the client has answered. */
const isLocked = (s: ProposalStatus) => s === 'accepted' || s === 'declined';

export default function ProposalBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [proposal, setProposal] = useState<Partial<Proposal>>({
    doc_type: (searchParams.get('type') as ProposalDocType) || 'quotation',
    client_name: '',
    to_email: '',
    cc_email: null,
    project_title: '',
    tagline: '',
    accent_color: '#FF6B35',
    sections: DEFAULT_SECTIONS,
    line_items: [],
    currency: 'PHP',
    discount: 0,
    tax_rate: 0,
    valid_until: null,
    terms: '',
    payment_schedule: [],
    status: 'draft',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveResult, setSaveResult] = useState<'saved' | 'error' | null>(null);
  const [sendError, setSendError] = useState('');
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  // AI draft
  const [aiBrief, setAiBrief] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiNotice, setAiNotice] = useState('');

  // Send modal
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState('');
  const [sendIntro, setSendIntro] = useState('');
  const [sendCc, setSendCc] = useState('');

  const isQuote = proposal.doc_type === 'quotation';
  const status = (proposal.status ?? 'draft') as ProposalStatus;
  const locked = isLocked(status);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await supabase.from('hub_proposals').select('*').eq('id', id).single();
      if (data) setProposal(data as Proposal);
      setLoading(false);
    })();
  }, [id, isNew]);

  const totals = useMemo(
    () => computeQuoteTotals(proposal.line_items ?? [], proposal.discount ?? 0, proposal.tax_rate ?? 0),
    [proposal.line_items, proposal.discount, proposal.tax_rate],
  );
  const currency: QuoteCurrency = proposal.currency === 'USD' ? 'USD' : 'PHP';
  const money = (n: number) => formatQuoteCurrency(n, currency);

  const unpricedCount = (proposal.line_items ?? [])
    .filter(i => i.unit_price === null || i.unit_price === '' || i.unit_price === undefined).length;
  const scheduleGap = paymentScheduleGap(proposal.payment_schedule ?? [], totals.total);

  const generateSlug = (clientName: string) => {
    const base = clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const rand = Math.random().toString(36).slice(2, 6);
    return `${base}-${rand}`;
  };

  const save = useCallback(async (patch?: Partial<Proposal>) => {
    setSaving(true);
    setSaveResult(null);
    const data = { ...proposal, ...patch };

    try {
      if (isNew) {
        const slug = generateSlug(data.client_name || 'quote');
        const { data: created, error } = await supabase
          .from('hub_proposals')
          .insert({ ...data, slug })
          .select()
          .single();
        if (error) throw error;
        setSaveResult('saved');
        navigate(`/hub/admin/proposals/${created.id}`, { replace: true });
      } else {
        // The client can accept at any moment, including while this tab sits
        // open. Never write back the decision fields from stale local state,
        // and refuse the write outright if the row has already been answered.
        const writable = {
          doc_type: data.doc_type,
          client_name: data.client_name,
          to_email: data.to_email,
          cc_email: data.cc_email ?? null,
          project_title: data.project_title,
          tagline: data.tagline,
          accent_color: data.accent_color,
          sections: data.sections,
          line_items: data.line_items,
          currency: data.currency,
          discount: Number(data.discount) || 0,
          tax_rate: Number(data.tax_rate) || 0,
          valid_until: data.valid_until || null,
          terms: data.terms,
          payment_schedule: data.payment_schedule,
          status: data.status,
        };
        const { data: updated, error } = await supabase
          .from('hub_proposals')
          .update({ ...writable, updated_at: new Date().toISOString() })
          .eq('id', id)
          .not('status', 'in', '("accepted","declined")')
          .select()
          .single();
        if (error) throw error;
        if (!updated) {
          // The row moved to accepted/declined under us — reload rather than
          // leaving the editor showing edits that were never saved.
          const { data: fresh } = await supabase.from('hub_proposals').select('*').eq('id', id).single();
          if (fresh) setProposal(fresh as Proposal);
          throw new Error('This quotation was answered by the client — your edits were not saved.');
        }
        setProposal(prev => ({ ...prev, ...data }));
        setSaveResult('saved');
      }
    } catch {
      setSaveResult('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveResult(null), 2500);
    }
  }, [proposal, id, isNew, navigate]);

  const publish = async () => {
    setPublishing(true);
    await save({ status: 'published' });
    setPublishing(false);
  };

  // ── AI draft ────────────────────────────────────────────────────────
  // Fills sections + line items from a brief. Everything stays editable --
  // the draft is a starting point, never something that goes out unread.
  const generateWithAI = async () => {
    if (!aiBrief.trim()) { setAiError('Describe the engagement first.'); return; }
    setAiGenerating(true);
    setAiError('');
    setAiNotice('');
    try {
      const { data, error } = await supabase.functions.invoke('generate-quotation', {
        body: {
          brief: aiBrief.trim(),
          client_name: proposal.client_name || null,
          contact_email: proposal.to_email || null,
          service: proposal.project_title || null,
          currency,
        },
      });
      if (error || data?.error) {
        setAiError(data?.error ?? error?.message ?? 'Generation failed — try again.');
        return;
      }

      const validUntil = (() => {
        const d = new Date();
        d.setDate(d.getDate() + (Number(data.validity_days) || 30));
        return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      })();

      setProposal(p => ({
        ...p,
        project_title: p.project_title || data.title || '',
        tagline: p.tagline || data.tagline || '',
        sections: data.sections?.length ? data.sections : p.sections,
        line_items: data.line_items ?? [],
        payment_schedule: data.payment_schedule ?? [],
        terms: data.terms ?? p.terms,
        valid_until: p.valid_until || validUntil,
      }));
      setActiveSection(0);
      setAiNotice(
        data.needs_price
          ? 'Draft ready — some prices were left blank on purpose. Fill them in before sending.'
          : 'Draft ready — review every line before sending.',
      );
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Generation failed — try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Send ────────────────────────────────────────────────────────────
  const openSend = () => {
    setSendEmail(proposal.to_email || '');
    setSendCc(proposal.cc_email || '');
    setSendIntro('');
    setSendError('');
    setSendOpen(true);
  };

  const sendQuotation = async () => {
    if (!sendEmail.trim()) return;
    setSending(true);
    setSendError('');
    try {
      // Persist edits first — the function emails what's in the database,
      // not what's on screen.
      await save(status === 'draft' ? { status: 'published' } : undefined);

      const { data, error } = await supabase.functions.invoke('send-quotation', {
        body: { id, to_email: sendEmail.trim(), cc: sendCc.trim() || null, intro: sendIntro.trim() || null },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message ?? 'Send failed');

      setProposal(prev => ({
        ...prev, status: 'sent', sent_at: new Date().toISOString(),
        to_email: sendEmail.trim(), cc_email: sendCc.trim() || null,
      }));
      setSendResult('success');
      setSendOpen(false);
      setTimeout(() => setSendResult(null), 3000);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Section editing ─────────────────────────────────────────────────
  const updateSection = (index: number, field: keyof ProposalSection, value: string) => {
    const sections = [...(proposal.sections || [])];
    sections[index] = { ...sections[index], [field]: value };
    setProposal(prev => ({ ...prev, sections }));
  };

  const addSection = () => {
    const sections = [...(proposal.sections || []), { heading: 'New Section', body: '' }];
    setProposal(prev => ({ ...prev, sections }));
    setActiveSection(sections.length - 1);
  };

  const removeSection = (index: number) => {
    const sections = (proposal.sections || []).filter((_, i) => i !== index);
    setProposal(prev => ({ ...prev, sections }));
    setActiveSection(Math.max(0, index - 1));
  };

  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= (proposal.sections || []).length) return;
    const sections = [...(proposal.sections || [])];
    const [item] = sections.splice(from, 1);
    sections.splice(to, 0, item);
    setProposal(prev => ({ ...prev, sections }));
    setActiveSection(to);
  };

  // ── Line items ──────────────────────────────────────────────────────
  const updateItem = (i: number, field: keyof QuoteLineItem, value: string) => {
    const items = [...(proposal.line_items || [])];
    items[i] = { ...items[i], [field]: value };
    setProposal(p => ({ ...p, line_items: items }));
  };
  const addItem = () =>
    setProposal(p => ({
      ...p,
      line_items: [...(p.line_items || []), { description: '', qty: 1, unit_price: '', notes: '' }],
    }));
  const removeItem = (i: number) =>
    setProposal(p => ({ ...p, line_items: (p.line_items || []).filter((_, j) => j !== i) }));

  const updateMilestone = (i: number, field: keyof QuotePaymentMilestone, value: string) => {
    const schedule = [...(proposal.payment_schedule || [])];
    schedule[i] = { ...schedule[i], [field]: value };
    setProposal(p => ({ ...p, payment_schedule: schedule }));
  };
  const addMilestone = () =>
    setProposal(p => ({
      ...p,
      payment_schedule: [...(p.payment_schedule || []), { label: '', amount: '', due: '' }],
    }));
  const removeMilestone = (i: number) =>
    setProposal(p => ({ ...p, payment_schedule: (p.payment_schedule || []).filter((_, j) => j !== i) }));

  /** 50/50 is the house default — one click beats typing it every time. */
  const applyDefaultSchedule = () =>
    setProposal(p => ({
      ...p,
      payment_schedule: [
        { label: 'To commence (50%)', amount: (totals.total / 2).toFixed(2), due: 'Upon signing' },
        { label: 'On delivery (50%)', amount: (totals.total / 2).toFixed(2), due: 'Final handover' },
      ],
    }));

  const publicUrl = proposal.slug ? `${window.location.origin}/p/${proposal.slug}` : null;
  const label = isQuote ? 'Quotation' : 'Proposal';
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300 disabled:bg-gray-50 disabled:text-gray-400';

  if (loading) {
    return (
      <AdminLayout title="Quotation Builder">
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-300" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${label} Builder`}>
      <div className="space-y-5">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hub/admin/contact')}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <i className="ri-arrow-left-line text-lg" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-900">
                  {proposal.project_title || proposal.client_name || `New ${label}`}
                </h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_BADGES[status]}`}>
                  {status}
                </span>
                {isQuote && totals.total > 0 && (
                  <span className="text-[11px] font-semibold text-gray-500">{money(totals.total)}</span>
                )}
              </div>
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-[#FF6B35] hover:underline mt-0.5 block truncate max-w-xs">
                  {publicUrl}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveResult === 'saved' && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1"><i className="ri-check-line" /> Saved</span>
            )}
            {saveResult === 'error' && <span className="text-[11px] text-red-500">Save failed</span>}
            {sendResult === 'success' && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1"><i className="ri-check-line" /> Sent</span>
            )}

            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                <i className="ri-eye-line text-sm" /> Preview
              </a>
            )}

            <button onClick={() => save()} disabled={saving || locked}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40">
              {saving ? <i className="ri-loader-4-line animate-spin text-sm" /> : <i className="ri-save-line text-sm" />}
              Save Draft
            </button>

            {status === 'draft' && (
              <button onClick={publish} disabled={publishing || !proposal.client_name}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40">
                <i className="ri-global-line text-sm" /> Publish
              </button>
            )}

            <button onClick={openSend} disabled={sending || !proposal.client_name || locked}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#e55a27] transition-colors cursor-pointer disabled:opacity-40">
              <i className="ri-send-plane-line text-sm" />
              {status === 'sent' || status === 'viewed' ? 'Resend' : `Send ${label}`}
            </button>
          </div>
        </div>

        {/* ── Client decision banner ── */}
        {locked && (
          <div className={`rounded-2xl px-5 py-4 flex items-start gap-3 ${status === 'accepted' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
            <i className={`text-lg ${status === 'accepted' ? 'ri-checkbox-circle-line text-emerald-600' : 'ri-close-circle-line text-red-500'}`} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${status === 'accepted' ? 'text-emerald-800' : 'text-red-700'}`}>
                {status === 'accepted' ? 'Accepted' : 'Declined'} by {proposal.accepted_by_name || proposal.client_name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {proposal.accepted_at && new Date(proposal.accepted_at).toLocaleString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                  timeZone: 'Asia/Manila',
                })}
                {status === 'accepted' && ' · A PDF copy was emailed to the client.'}
              </p>
              {proposal.accepted_note && (
                <p className="text-xs text-gray-600 mt-2 bg-white/70 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  “{proposal.accepted_note}”
                </p>
              )}
              {status === 'accepted' && (
                <p className="text-xs text-emerald-700 mt-2 font-medium">
                  Next: create the project, then generate and send the contract.
                </p>
              )}
            </div>
          </div>
        )}

        {isQuote && !locked && isQuoteExpired(proposal.valid_until) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
            <i className="ri-time-line mr-1" /> This quotation expired on {formatQuoteDate(proposal.valid_until)}. Extend the validity date before resending.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">

          {/* ── Left panel ── */}
          <div className="space-y-4">

            {/* Document type */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document Type</p>
              <div className="grid grid-cols-2 gap-2">
                {(['quotation', 'proposal'] as ProposalDocType[]).map(t => (
                  <button key={t} onClick={() => setProposal(p => ({ ...p, doc_type: t }))}
                    disabled={locked}
                    className={`px-3 py-2 rounded-lg text-xs font-medium capitalize cursor-pointer transition-colors disabled:opacity-40 ${
                      proposal.doc_type === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isQuote
                  ? 'Includes pricing and an Accept button on the client page.'
                  : 'Narrative only — no pricing, no accept action.'}
              </p>
            </div>

            {/* Client info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</p>
              {([
                ['client_name', 'Client Name', 'e.g. Capu Coffee', 'text'],
                ['to_email', 'Email', 'client@email.com', 'email'],
                ['project_title', 'Project Title', 'e.g. Brand Elevation for Capu Coffee', 'text'],
                ['tagline', 'Tagline (optional)', 'One-line hook under the title', 'text'],
              ] as const).map(([field, labelText, placeholder, type]) => (
                <div className="space-y-1" key={field}>
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{labelText}</label>
                  <input type={type} value={(proposal[field] as string) || ''} disabled={locked}
                    onChange={e => setProposal(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder} className={inputCls} />
                </div>
              ))}
            </div>

            {/* AI draft */}
            {!locked && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-2.5">
                <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                  <i className="ri-sparkling-2-line" /> Draft with AI
                </p>
                <textarea value={aiBrief} onChange={e => setAiBrief(e.target.value)} rows={5}
                  placeholder={"Describe the engagement — what they asked for, scope, prices, timeline, anything you already agreed on.\n\nThe client name and currency above are included automatically."}
                  className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-y" />
                {aiError && <p className="text-xs text-red-500">{aiError}</p>}
                {aiNotice && <p className="text-xs text-indigo-600">{aiNotice}</p>}
                <button type="button" onClick={generateWithAI} disabled={aiGenerating}
                  className="w-full py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-40 font-medium flex items-center justify-center gap-1.5">
                  {aiGenerating
                    ? <><i className="ri-loader-4-line animate-spin text-sm" /> Drafting… this can take a minute</>
                    : <><i className="ri-magic-line text-sm" /> {(proposal.line_items?.length ?? 0) > 0 ? 'Regenerate draft' : 'Generate draft'}</>}
                </button>
                <p className="text-[10px] text-indigo-400 leading-relaxed">
                  Overwrites the sections and pricing below. It never invents a price — anything you didn't state comes back blank.
                </p>
              </div>
            )}

            {/* Accent */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accent Color</p>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map(({ label: name, value }) => (
                  <button key={value} onClick={() => setProposal(p => ({ ...p, accent_color: value }))}
                    title={name} disabled={locked}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 cursor-pointer disabled:opacity-40 ${proposal.accent_color === value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ background: value }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-gray-400">Custom</label>
                <input type="color" value={proposal.accent_color || '#FF6B35'} disabled={locked}
                  onChange={e => setProposal(p => ({ ...p, accent_color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <span className="text-xs text-gray-400 font-mono">{proposal.accent_color}</span>
              </div>
            </div>

            {/* Sections list */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sections</p>
                {!locked && (
                  <button onClick={addSection}
                    className="text-[11px] text-[#FF6B35] hover:text-[#e55a27] font-medium cursor-pointer flex items-center gap-1">
                    <i className="ri-add-line" /> Add
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {(proposal.sections || []).map((s, i) => (
                  <div key={i}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeSection === i ? 'bg-orange-50 text-gray-900' : 'hover:bg-gray-50 text-gray-600'}`}
                    onClick={() => setActiveSection(i)}>
                    <span className="text-[10px] font-bold w-5 flex-shrink-0"
                      style={{ color: activeSection === i ? proposal.accent_color : undefined }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-medium truncate flex-1">{s.heading || 'Untitled'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="space-y-5">

            {/* Section editor */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {(proposal.sections || []).length === 0 ? (
                <div className="p-12 text-center">
                  <i className="ri-layout-line text-3xl text-gray-200 block mb-3" />
                  <p className="text-sm text-gray-400 mb-4">No sections yet</p>
                  {!locked && (
                    <button onClick={addSection} className="text-xs text-[#FF6B35] font-medium cursor-pointer hover:underline">
                      Add your first section
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <span className="text-xs font-bold px-2 py-1 rounded-md"
                      style={{ background: `${proposal.accent_color}15`, color: proposal.accent_color }}>
                      {String(activeSection + 1).padStart(2, '0')}
                    </span>
                    <p className="text-xs text-gray-400">
                      Editing section {activeSection + 1} of {(proposal.sections || []).length}
                    </p>
                    {!locked && (
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => moveSection(activeSection, activeSection - 1)} disabled={activeSection === 0}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer transition-colors">
                          <i className="ri-arrow-up-s-line" />
                        </button>
                        <button onClick={() => moveSection(activeSection, activeSection + 1)}
                          disabled={activeSection === (proposal.sections || []).length - 1}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 cursor-pointer transition-colors">
                          <i className="ri-arrow-down-s-line" />
                        </button>
                        <button onClick={() => removeSection(activeSection)}
                          className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                          <i className="ri-delete-bin-line" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Section Heading</label>
                    <input type="text" disabled={locked}
                      value={(proposal.sections || [])[activeSection]?.heading || ''}
                      onChange={e => updateSection(activeSection, 'heading', e.target.value)}
                      placeholder="e.g. What We Heard"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                      Content <span className="normal-case text-gray-300">— double line break = new paragraph · lines starting with &ldquo;- &rdquo; become bullets</span>
                    </label>
                    <textarea disabled={locked}
                      value={(proposal.sections || [])[activeSection]?.body || ''}
                      onChange={e => updateSection(activeSection, 'body', e.target.value)}
                      rows={14} placeholder="Write the section content here..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-700 leading-relaxed focus:outline-none focus:border-orange-300 resize-none disabled:bg-gray-50" />
                  </div>
                </div>
              )}
            </div>

            {/* ── Pricing ── */}
            {isQuote && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pricing</p>
                  <div className="flex items-center gap-2">
                    {(['PHP', 'USD'] as QuoteCurrency[]).map(c => (
                      <button key={c} onClick={() => setProposal(p => ({ ...p, currency: c }))} disabled={locked}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors disabled:opacity-40 ${
                          currency === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {unpricedCount > 0 && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    <i className="ri-error-warning-line mr-1" />
                    {unpricedCount} line{unpricedCount > 1 ? 's have' : ' has'} no price yet.
                  </p>
                )}

                {/* Line items */}
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[1fr_70px_120px_110px_32px] gap-2 px-1">
                    {['Description', 'Qty', 'Unit Price', 'Amount', ''].map((h, i) => (
                      <span key={i} className={`text-[10px] font-semibold text-gray-400 uppercase tracking-wide ${i >= 1 && i <= 3 ? 'text-right' : ''}`}>{h}</span>
                    ))}
                  </div>

                  {(proposal.line_items || []).map((item, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_70px_120px_110px_32px] gap-2 items-start">
                      <div className="space-y-1">
                        <input type="text" value={item.description || ''} disabled={locked}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          placeholder="What they're paying for"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                        <input type="text" value={item.notes || ''} disabled={locked}
                          onChange={e => updateItem(i, 'notes', e.target.value)}
                          placeholder="Optional note — rounds, exclusions…"
                          className="w-full border border-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-500 focus:outline-none focus:border-orange-200 disabled:bg-gray-50" />
                      </div>
                      <input type="number" min="0" step="1" value={item.qty ?? 1} disabled={locked}
                        onChange={e => updateItem(i, 'qty', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                      <input type="number" min="0" step="0.01" value={item.unit_price ?? ''} disabled={locked}
                        onChange={e => updateItem(i, 'unit_price', e.target.value)}
                        placeholder="—"
                        className={`w-full border rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:border-orange-300 disabled:bg-gray-50 ${
                          item.unit_price === null || item.unit_price === '' ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200'}`} />
                      <div className="flex items-center justify-end h-[38px] text-sm font-medium text-gray-700 px-1">
                        {money(lineTotal(item))}
                      </div>
                      <button onClick={() => removeItem(i)} disabled={locked}
                        className="h-[38px] w-8 flex items-center justify-center text-red-300 hover:text-red-500 cursor-pointer disabled:opacity-30">
                        <i className="ri-close-line" />
                      </button>
                    </div>
                  ))}

                  {!locked && (
                    <button onClick={addItem}
                      className="text-[11px] text-[#FF6B35] hover:text-[#e55a27] font-medium cursor-pointer flex items-center gap-1 pt-1">
                      <i className="ri-add-line" /> Add line item
                    </button>
                  )}
                </div>

                {/* Totals */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex items-center justify-end gap-4 text-sm">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="w-32 text-right text-gray-700">{money(totals.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-end gap-4 text-sm">
                    <label className="text-gray-400">Discount ({currency})</label>
                    <input type="number" min="0" step="0.01" value={proposal.discount ?? 0} disabled={locked}
                      onChange={e => setProposal(p => ({ ...p, discount: e.target.value }))}
                      className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                  </div>
                  <div className="flex items-center justify-end gap-4 text-sm">
                    <label className="text-gray-400">Tax (%)</label>
                    <input type="number" min="0" step="0.01" value={proposal.tax_rate ?? 0} disabled={locked}
                      onChange={e => setProposal(p => ({ ...p, tax_rate: e.target.value }))}
                      className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                  </div>
                  <div className="flex items-center justify-end gap-4 pt-2 border-t border-gray-900">
                    <span className="text-sm font-bold text-gray-900">Total</span>
                    <span className="w-32 text-right text-lg font-bold" style={{ color: proposal.accent_color }}>
                      {money(totals.total)}
                    </span>
                  </div>
                </div>

                {/* Validity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Valid Until</label>
                    <input type="date" value={proposal.valid_until || ''} disabled={locked}
                      onChange={e => setProposal(p => ({ ...p, valid_until: e.target.value || null }))}
                      className={inputCls} />
                  </div>
                </div>

                {/* Payment schedule */}
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Schedule</p>
                    {!locked && (
                      <div className="flex items-center gap-3">
                        <button onClick={applyDefaultSchedule}
                          className="text-[11px] text-gray-400 hover:text-gray-600 font-medium cursor-pointer">
                          Use 50 / 50
                        </button>
                        <button onClick={addMilestone}
                          className="text-[11px] text-[#FF6B35] hover:text-[#e55a27] font-medium cursor-pointer flex items-center gap-1">
                          <i className="ri-add-line" /> Add
                        </button>
                      </div>
                    )}
                  </div>

                  {(proposal.payment_schedule || []).map((m, i) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_130px_120px_32px] gap-2">
                      <input type="text" value={m.label || ''} disabled={locked}
                        onChange={e => updateMilestone(i, 'label', e.target.value)} placeholder="e.g. To commence (50%)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                      <input type="text" value={m.due || ''} disabled={locked}
                        onChange={e => updateMilestone(i, 'due', e.target.value)} placeholder="When"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                      <input type="number" min="0" step="0.01" value={m.amount ?? ''} disabled={locked}
                        onChange={e => updateMilestone(i, 'amount', e.target.value)} placeholder="—"
                        className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:border-orange-300 disabled:bg-gray-50" />
                      <button onClick={() => removeMilestone(i)} disabled={locked}
                        className="h-[38px] w-8 flex items-center justify-center text-red-300 hover:text-red-500 cursor-pointer disabled:opacity-30">
                        <i className="ri-close-line" />
                      </button>
                    </div>
                  ))}

                  {(proposal.payment_schedule || []).length > 0 && Math.abs(scheduleGap) > 0.01 && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                      <i className="ri-error-warning-line mr-1" />
                      Milestones are {scheduleGap > 0 ? 'short by' : 'over by'} {money(Math.abs(scheduleGap))} against the total.
                    </p>
                  )}
                </div>

                {/* Terms */}
                <div className="border-t border-gray-100 pt-4 space-y-1">
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                    Terms <span className="normal-case text-gray-300">— short and plain; the contract does the legal work</span>
                  </label>
                  <textarea value={proposal.terms || ''} disabled={locked} rows={4}
                    onChange={e => setProposal(p => ({ ...p, terms: e.target.value }))}
                    placeholder={'e.g. Includes two rounds of revisions per deliverable.\nAdditional rounds billed separately.'}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed focus:outline-none focus:border-orange-300 resize-y disabled:bg-gray-50" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Send modal ── */}
      {sendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !sending && setSendOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">
                {status === 'sent' || status === 'viewed' ? `Resend ${label}` : `Send ${label}`}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isQuote
                  ? `The full quotation renders in the email — ${money(totals.total)}, with Accept and Schedule buttons.`
                  : 'The client gets the write-up with a link to the full page.'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Send To</label>
                <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)}
                  placeholder="client@email.com" className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  CC <span className="normal-case text-gray-300">(optional)</span>
                </label>
                <input type="text" value={sendCc} onChange={e => setSendCc(e.target.value)}
                  placeholder="finance@client.com, assistant@client.com" className={inputCls} />
                <p className="text-[11px] text-gray-400">Separate multiple addresses with commas.</p>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  Personal Note <span className="normal-case text-gray-300">(optional)</span>
                </label>
                <textarea value={sendIntro} onChange={e => setSendIntro(e.target.value)} rows={3}
                  placeholder="Hi Adrian — great speaking earlier. Here's everything we discussed…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300 resize-y" />
              </div>

              {isQuote && unpricedCount > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  <i className="ri-error-warning-line mr-1" />
                  {unpricedCount} line item{unpricedCount > 1 ? 's have' : ' has'} no price. It will show as {money(0)}.
                </p>
              )}
              {sendError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{sendError}</p>}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={sendQuotation} disabled={sending || !sendEmail.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF6B35] hover:bg-[#e55a27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40">
                {sending ? <><i className="ri-loader-4-line animate-spin" /> Sending…</> : <><i className="ri-send-plane-line" /> Send</>}
              </button>
              <button onClick={() => setSendOpen(false)} disabled={sending}
                className="px-4 py-2.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
