import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';

interface ProposalSection {
  heading: string;
  body: string;
}

interface Proposal {
  id: number;
  slug: string;
  client_name: string;
  to_email: string;
  project_title: string;
  tagline: string;
  accent_color: string;
  sections: ProposalSection[];
  status: 'draft' | 'published' | 'sent';
  sent_at: string | null;
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

export default function ProposalBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [proposal, setProposal] = useState<Partial<Proposal>>({
    client_name: '',
    to_email: '',
    project_title: '',
    tagline: '',
    accent_color: '#FF6B35',
    sections: DEFAULT_SECTIONS,
    status: 'draft',
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [sending, setSending] = useState(false);
  const [saveResult, setSaveResult] = useState<'saved' | 'error' | null>(null);
  const [sendResult, setSendResult] = useState<'success' | 'error' | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await supabase.from('hub_proposals').select('*').eq('id', id).single();
      if (data) setProposal(data as Proposal);
      setLoading(false);
    })();
  }, [id, isNew]);

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
        const slug = generateSlug(data.client_name || 'proposal');
        const { data: created, error } = await supabase
          .from('hub_proposals')
          .insert({ ...data, slug })
          .select()
          .single();
        if (error) throw error;
        setSaveResult('saved');
        navigate(`/hub/admin/proposals/${created.id}`, { replace: true });
      } else {
        const { error } = await supabase
          .from('hub_proposals')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
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

  const sendProposal = async () => {
    if (!proposal.to_email || !proposal.slug) return;
    setSending(true);
    setSendResult(null);

    // First ensure it's published
    if (proposal.status === 'draft') {
      await save({ status: 'published' });
    }

    const proposalUrl = `${window.location.origin}/p/${proposal.slug}`;
    try {
      const { error } = await supabase.functions.invoke('send-proposal', {
        body: {
          submission_id: null,
          to_email: proposal.to_email,
          to_name: proposal.client_name,
          project_title: proposal.project_title || null,
          proposal_url: proposalUrl,
          subject: `Proposal from Huna Creatives${proposal.project_title ? ` — ${proposal.project_title}` : ''}`,
        },
      });
      if (error) throw error;

      await supabase
        .from('hub_proposals')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', id);

      setProposal(prev => ({ ...prev, status: 'sent', sent_at: new Date().toISOString() }));
      setSendResult('success');
    } catch {
      setSendResult('error');
    } finally {
      setSending(false);
      setTimeout(() => setSendResult(null), 3000);
    }
  };

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

  const statusBadge = {
    draft: 'bg-gray-100 text-gray-500',
    published: 'bg-sky-100 text-sky-700',
    sent: 'bg-emerald-100 text-emerald-700',
  }[proposal.status || 'draft'];

  const proposalUrl = proposal.slug ? `${window.location.origin}/p/${proposal.slug}` : null;

  if (loading) {
    return (
      <AdminLayout title="Proposal Builder">
        <div className="flex items-center justify-center py-20">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-300" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Proposal Builder">
      <div className="space-y-5">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hub/admin/contact')}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <i className="ri-arrow-left-line text-lg" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-gray-900">
                  {proposal.project_title || proposal.client_name || 'New Proposal'}
                </h1>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge}`}>
                  {proposal.status || 'draft'}
                </span>
              </div>
              {proposalUrl && (
                <a href={proposalUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-[#FF6B35] hover:underline mt-0.5 block truncate max-w-xs">
                  {proposalUrl}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {saveResult === 'saved' && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                <i className="ri-check-line" /> Saved
              </span>
            )}
            {saveResult === 'error' && (
              <span className="text-[11px] text-red-500">Save failed</span>
            )}

            {proposalUrl && (
              <a href={proposalUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer">
                <i className="ri-eye-line text-sm" /> Preview
              </a>
            )}

            <button onClick={() => save()}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40">
              {saving ? <i className="ri-loader-4-line animate-spin text-sm" /> : <i className="ri-save-line text-sm" />}
              Save Draft
            </button>

            {proposal.status === 'draft' && (
              <button onClick={publish} disabled={publishing || !proposal.client_name || !proposal.to_email}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-gray-700 transition-colors cursor-pointer disabled:opacity-40">
                <i className="ri-global-line text-sm" />
                Publish
              </button>
            )}

            <button onClick={sendProposal}
              disabled={sending || !proposal.to_email || !proposal.client_name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF6B35] text-white text-xs font-semibold hover:bg-[#e55a27] transition-colors cursor-pointer disabled:opacity-40">
              {sending ? <><i className="ri-loader-4-line animate-spin" /> Sending…</>
                : sendResult === 'success' ? <><i className="ri-check-line" /> Sent!</>
                : <><i className="ri-send-plane-line text-sm" /> Send to Client</>}
            </button>
          </div>
        </div>

        {sendResult === 'error' && (
          <p className="text-xs text-red-500 bg-red-50 rounded-xl px-4 py-2">Failed to send email. Please try again.</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">

          {/* ── Left panel: metadata + section list ── */}
          <div className="space-y-4">

            {/* Client info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</p>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Client Name</label>
                <input type="text" value={proposal.client_name || ''}
                  onChange={e => setProposal(p => ({ ...p, client_name: e.target.value }))}
                  placeholder="e.g. Capu Coffee"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Email</label>
                <input type="email" value={proposal.to_email || ''}
                  onChange={e => setProposal(p => ({ ...p, to_email: e.target.value }))}
                  placeholder="client@email.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Project Title</label>
                <input type="text" value={proposal.project_title || ''}
                  onChange={e => setProposal(p => ({ ...p, project_title: e.target.value }))}
                  placeholder="e.g. Brand Elevation for Capu Coffee"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Tagline <span className="normal-case text-gray-300">(optional)</span></label>
                <input type="text" value={proposal.tagline || ''}
                  onChange={e => setProposal(p => ({ ...p, tagline: e.target.value }))}
                  placeholder="One-line hook under the title"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-300" />
              </div>
            </div>

            {/* Accent color */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Accent Color</p>
              <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map(({ label, value }) => (
                  <button key={value} onClick={() => setProposal(p => ({ ...p, accent_color: value }))}
                    title={label}
                    className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 cursor-pointer ${proposal.accent_color === value ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ background: value }} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-gray-400">Custom</label>
                <input type="color" value={proposal.accent_color || '#FF6B35'}
                  onChange={e => setProposal(p => ({ ...p, accent_color: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <span className="text-xs text-gray-400 font-mono">{proposal.accent_color}</span>
              </div>
            </div>

            {/* Sections list */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sections</p>
                <button onClick={addSection}
                  className="text-[11px] text-[#FF6B35] hover:text-[#e55a27] font-medium cursor-pointer flex items-center gap-1">
                  <i className="ri-add-line" /> Add
                </button>
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
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); moveSection(i, i - 1); }}
                        className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" title="Move up">
                        <i className="ri-arrow-up-s-line text-xs" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); moveSection(i, i + 1); }}
                        className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer" title="Move down">
                        <i className="ri-arrow-down-s-line text-xs" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); removeSection(i); }}
                        className="p-1 text-red-400 hover:text-red-600 cursor-pointer" title="Remove">
                        <i className="ri-delete-bin-line text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel: section editor ── */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {(proposal.sections || []).length === 0 ? (
              <div className="p-12 text-center">
                <i className="ri-layout-line text-3xl text-gray-200 block mb-3" />
                <p className="text-sm text-gray-400 mb-4">No sections yet</p>
                <button onClick={addSection}
                  className="text-xs text-[#FF6B35] font-medium cursor-pointer hover:underline">
                  Add your first section
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                {/* Section preview header */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <span className="text-xs font-bold px-2 py-1 rounded-md"
                    style={{ background: `${proposal.accent_color}15`, color: proposal.accent_color }}>
                    {String(activeSection + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs text-gray-400">Editing section {activeSection + 1} of {(proposal.sections || []).length}</p>
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => moveSection(activeSection, activeSection - 1)}
                      disabled={activeSection === 0}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
                      <i className="ri-arrow-up-s-line" />
                    </button>
                    <button onClick={() => moveSection(activeSection, activeSection + 1)}
                      disabled={activeSection === (proposal.sections || []).length - 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
                      <i className="ri-arrow-down-s-line" />
                    </button>
                    <button onClick={() => removeSection(activeSection)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors">
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Section Heading</label>
                  <input
                    type="text"
                    value={(proposal.sections || [])[activeSection]?.heading || ''}
                    onChange={e => updateSection(activeSection, 'heading', e.target.value)}
                    placeholder="e.g. What We Observed"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base font-medium text-gray-900 focus:outline-none focus:border-orange-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                    Content <span className="normal-case text-gray-300">— double line break = new paragraph</span>
                  </label>
                  <textarea
                    value={(proposal.sections || [])[activeSection]?.body || ''}
                    onChange={e => updateSection(activeSection, 'body', e.target.value)}
                    rows={20}
                    placeholder="Write the section content here..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-700 leading-relaxed focus:outline-none focus:border-orange-300 resize-none"
                  />
                </div>

                {/* Live preview strip */}
                {(proposal.sections || [])[activeSection]?.body && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-3">Preview</p>
                    <div className="text-[13px] text-gray-600 leading-relaxed space-y-3">
                      {((proposal.sections || [])[activeSection]?.body || '')
                        .split('\n\n')
                        .filter(p => p.trim())
                        .map((para, i) => (
                          <p key={i}>{para.trim()}</p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
