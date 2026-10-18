import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Editor } from '@tiptap/core';
import { bodyToHtml, docToBody, looksLikeMarkdown } from '@/lib/emailBody';
import { replyTemplates } from './replyTemplates';
import { LOGO_URL as EMAIL_LOGO } from '../../../../../supabase/functions/_shared/emailLayout.ts';

// Mirrors hunaEmail() in supabase/functions/_shared/emailLayout.ts.
const EMAIL_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export interface ReplySubmission {
  id: number;
  name: string;
  email: string;
  service: string | null;
  message: string;
  quote_requested_at: string | null;
  created_at: string;
}

export interface ReplyPayload {
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  buttons: { meeting: boolean; quote: boolean };
}

interface Draft {
  to: string;
  name: string;
  subject: string;
  body: string;
  meeting: boolean;
  quote: boolean;
  template: string | null;
}

const draftKey = (s: ReplySubmission | null) => `huna-reply-draft:${s ? s.id : 'new'}`;

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as Draft : null;
  } catch { return null; }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch { /* private mode: drafts just don't persist */ }
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'there';

function startingDraft(s: ReplySubmission | null): Draft {
  const t = replyTemplates[0];
  return {
    to: s?.email ?? '',
    name: s?.name ?? '',
    subject: s ? `Re: Your inquiry${s.service ? ` — ${s.service}` : ''}` : '',
    body: t.body(s ? firstName(s.name) : 'there', s?.service ?? null),
    meeting: true,
    quote: true,
    template: t.id,
  };
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

interface Props {
  submission: ReplySubmission | null;
  onSend: (payload: ReplyPayload) => Promise<void>;
  onClose: () => void;
}

export default function ReplyComposer({ submission, onSend, onClose }: Props) {
  const key = draftKey(submission);
  const [restored] = useState(() => readDraft(key));
  const [draft, setDraft] = useState<Draft>(() => restored ?? startingDraft(submission));
  const [hasDraft, setHasDraft] = useState(!!restored);
  const [dirty, setDirty] = useState(false);
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const baseline = useRef('');
  const editorRef = useRef<Editor | null>(null);

  const update = (patch: Partial<Draft>) => {
    setDraft(d => ({ ...d, ...patch }));
    setDirty(true);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        blockquote: false,
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Placeholder.configure({ placeholder: 'Write your message…' }),
    ],
    content: bodyToHtml(draft.body),
    editorProps: {
      // Markdown copied as plain text (Claude, ChatGPT, Notes) keeps its lists and headings.
      handlePaste: (view, event) => {
        const data = event.clipboardData;
        if (!data || data.types.includes('text/html')) return false;
        const text = data.getData('text/plain');
        if (!text || !looksLikeMarkdown(text)) return false;
        editorRef.current?.chain().focus().insertContent(bodyToHtml(text)).run();
        return true;
      },
    },
    onCreate: ({ editor }) => {
      const body = docToBody(editor.getJSON());
      baseline.current = restored ? '' : body;
      setDraft(d => ({ ...d, body }));
    },
    onUpdate: ({ editor }) => update({ body: docToBody(editor.getJSON()) }),
  });
  editorRef.current = editor;

  // Save the draft as you type, so closing the window never loses a reply.
  useEffect(() => {
    if (!dirty || status === 'sent') return;
    const t = setTimeout(() => { writeDraft(key, draft); setHasDraft(true); }, 400);
    return () => clearTimeout(t);
  }, [draft, dirty, key, status]);

  const applyTemplate = (id: string) => {
    const t = replyTemplates.find(x => x.id === id);
    if (!t || !editor) return;
    const current = docToBody(editor.getJSON());
    if (current.trim() && current !== baseline.current && !window.confirm('Replace your message with this template?')) return;
    editor.commands.setContent(bodyToHtml(t.body(submission ? firstName(submission.name) : 'there', submission?.service ?? null)));
    const body = docToBody(editor.getJSON());
    baseline.current = body;
    update({ body, template: id });
    editor.commands.focus('start');
  };

  // Closing keeps the draft, including the last keystrokes the debounce hasn't saved yet.
  const close = () => {
    if (dirty && status !== 'sent') writeDraft(key, draft);
    onClose();
  };

  const discard = () => {
    writeDraft(key, null);
    onClose();
  };

  const toEmail = submission ? submission.email : draft.to.trim();
  const canSend = !!toEmail && !!draft.subject.trim() && !!draft.body.trim() && status !== 'sending' && status !== 'sent';

  const send = async () => {
    if (!canSend) return;
    setStatus('sending');
    try {
      await onSend({
        to_email: toEmail,
        to_name: submission ? submission.name : draft.name.trim(),
        subject: draft.subject.trim(),
        body: draft.body,
        buttons: { meeting: draft.meeting, quote: !!submission && draft.quote },
      });
      writeDraft(key, null);
      setStatus('sent');
      setTimeout(onClose, 1500);
    } catch {
      setStatus('error');
    }
  };
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mobile = width === 'mobile';
  const showQuote = !!submission && draft.quote;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />
      <div className="relative bg-white sm:rounded-2xl shadow-2xl w-full sm:max-w-6xl h-full sm:h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {submission ? `Reply to ${submission.name}` : 'New message'}
          </p>
          <button onClick={close} title="Close (draft is kept)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer">
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:flex">

          {/* Compose */}
          <div className="lg:flex-1 lg:min-w-0 lg:flex lg:flex-col">
            <div className="flex items-center gap-3 px-5 border-b border-gray-100 min-h-[44px]">
              <span className="text-sm text-gray-400 w-14 flex-shrink-0">To</span>
              {submission ? (
                <span className="inline-flex items-center gap-1.5 max-w-full bg-gray-100 rounded-full pl-1 pr-3 py-1 text-[13px] text-gray-800 truncate">
                  <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                    {submission.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{submission.name}</span>
                  <span className="text-gray-500 truncate">{submission.email}</span>
                </span>
              ) : (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <input type="email" value={draft.to} onChange={e => update({ to: e.target.value })} placeholder="client@email.com"
                    className="flex-1 min-w-0 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none" />
                  <input type="text" value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="Name"
                    className="w-32 sm:w-44 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none border-l border-gray-100 pl-3" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 px-5 border-b border-gray-100">
              <span className="text-sm text-gray-400 w-14 flex-shrink-0">Subject</span>
              <input type="text" value={draft.subject} onChange={e => update({ subject: e.target.value })} placeholder="Subject"
                className="flex-1 min-w-0 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none" />
            </div>

            {editor && <Toolbar editor={editor} width={width} setWidth={setWidth} />}

            {/* The email itself — you write inside it */}
            <div className="bg-[#f4eee7] lg:flex-1 lg:overflow-y-auto px-3 sm:px-8 py-6 sm:py-8">
              <div className="mx-auto bg-white rounded-[14px] transition-[max-width] duration-200" style={{ maxWidth: mobile ? 375 : 560 }}>
                <div className="pt-10 pb-2 flex justify-center select-none">
                  <img src={EMAIL_LOGO} alt="Huna Creatives" className="w-[120px] h-auto" />
                </div>

                <div className={`cursor-text pt-8 ${draft.meeting || showQuote ? 'pb-5' : 'pb-10'} ${mobile ? 'px-6' : 'px-12'}`}
                  onClick={e => { if (e.target === e.currentTarget) editor?.commands.focus('end'); }}>
                  <EditorContent editor={editor} className="email-canvas" />
                </div>

                {(draft.meeting || showQuote) && (
                  <div className={`pt-2 pb-10 flex flex-wrap justify-center gap-2.5 select-none ${mobile ? 'px-6' : 'px-12'}`}>
                    {draft.meeting && <EmailButton label="Schedule a meeting" />}
                    {showQuote && <EmailButton label="Request a quotation" secondary={draft.meeting} />}
                  </div>
                )}

                <div className={`bg-[#140f0b] bg-[linear-gradient(135deg,#bf2227_0%,#5a1712_30%,#140f0b_62%)] rounded-b-[14px] pt-[30px] pb-8 text-center select-none ${mobile ? 'px-6' : 'px-12'}`} style={{ fontFamily: EMAIL_SANS }}>
                  <div className="flex justify-center gap-2.5 mb-4">
                    <img src="/images/email/instagram-orange.png" alt="Instagram" className="w-[22px] h-[22px]" />
                    <img src="/images/email/facebook-orange.png" alt="Facebook" className="w-[22px] h-[22px]" />
                  </div>
                  <p className="mb-3 text-xs text-[#eadccd]">Services&nbsp; · &nbsp;Our work&nbsp; · &nbsp;hunacreatives.com</p>
                  <p className="text-[11px] leading-relaxed text-[#a8988a]">
                    You’re receiving this because you contacted Huna Creatives. Reply to this email to reach&nbsp;us.<br />
                    Huna Creatives · Cebu City, Philippines
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Side panel */}
          <aside className="lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-100 bg-gray-50/70 lg:overflow-y-auto p-5 space-y-7">
            {submission && (
              <section>
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-900">Their message</h3>
                  <span className="text-[11px] text-gray-400">{fmtDate(submission.created_at)}</span>
                </div>
                {submission.service && (
                  <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#FF6B35] mb-2">{submission.service}</span>
                )}
                <div className="bg-white rounded-xl border border-gray-100 p-3.5 text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                  {submission.message}
                </div>
                {submission.quote_requested_at && (
                  <p className="flex items-center gap-1.5 text-[11px] text-[#FF6B35] font-medium mt-2">
                    <i className="ri-price-tag-3-line" /> Asked for a formal quotation · {fmtDate(submission.quote_requested_at)}
                  </p>
                )}
              </section>
            )}

            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Start from</h3>
              <div className="space-y-1">
                {replyTemplates.map(t => (
                  <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
                    className={`w-full text-left rounded-lg px-3 py-2 cursor-pointer transition-colors ${draft.template === t.id ? 'bg-white border border-gray-200 shadow-sm' : 'border border-transparent hover:bg-white'}`}>
                    <span className="block text-[13px] font-medium text-gray-900">{t.label}</span>
                    <span className="block text-[11px] text-gray-400">{t.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Buttons in the email</h3>
              <div className="space-y-1">
                <Toggle label="Schedule a meeting" hint="Opens your Calendly" checked={draft.meeting} onChange={v => update({ meeting: v })} />
                {submission && (
                  <Toggle label="Request a quotation" hint="Flags this inquiry for a quote" checked={draft.quote} onChange={v => update({ quote: v })} />
                )}
              </div>
            </section>
          </aside>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <p className={`text-xs truncate ${status === 'error' ? 'text-red-500' : status === 'sent' ? 'text-emerald-600' : 'text-gray-400'}`}>
            {status === 'error' ? 'Couldn’t send. Your draft is saved, try again.'
              : status === 'sent' ? 'Sent'
              : restored && !dirty ? 'Draft restored'
              : hasDraft ? 'Draft saved'
              : <span className="hidden sm:inline">⌘ Enter to send</span>}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasDraft && status !== 'sent' && (
              <button onClick={discard}
                className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors">
                Discard draft
              </button>
            )}
            <button onClick={send} disabled={!canSend}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] hover:bg-[#e55a27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              {status === 'sending' ? <><i className="ri-loader-4-line animate-spin" /> Sending…</>
                : status === 'sent' ? <><i className="ri-check-line" /> Sent</>
                : <><i className="ri-send-plane-line" /> Send</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailButton({ label, secondary = false }: { label: string; secondary?: boolean }) {
  return (
    <span style={{ fontFamily: EMAIL_SANS }}
      className={`inline-block whitespace-nowrap rounded-md px-7 py-[15px] text-[15px] font-bold leading-none text-white ${secondary ? 'bg-[#140f0b]' : 'bg-[#ef6323]'}`}>
      {label}
    </span>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white cursor-pointer transition-colors text-left">
      <span>
        <span className="block text-[13px] font-medium text-gray-900">{label}</span>
        <span className="block text-[11px] text-gray-400">{hint}</span>
      </span>
      <span className={`relative w-8 h-[18px] rounded-full flex-shrink-0 transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}>
        <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[16px]' : 'left-[2px]'}`} />
      </span>
    </button>
  );
}

function Toolbar({ editor, width, setWidth }: { editor: Editor; width: 'desktop' | 'mobile'; setWidth: (w: 'desktop' | 'mobile') => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }: { editor: Editor }) => ({
      heading: editor.isActive('heading'),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      link: editor.isActive('link'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    const href = url.trim();
    if (!href || href === 'https://') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: /^(https?:|mailto:)/.test(href) ? href : `https://${href}` }).run();
  };

  const tools: Array<{ icon: string; title: string; active?: boolean; disabled?: boolean; run: () => void } | 'sep'> = [
    { icon: 'ri-arrow-go-back-line', title: 'Undo (⌘Z)', disabled: !s?.canUndo, run: () => editor.chain().focus().undo().run() },
    { icon: 'ri-arrow-go-forward-line', title: 'Redo (⇧⌘Z)', disabled: !s?.canRedo, run: () => editor.chain().focus().redo().run() },
    'sep',
    { icon: 'ri-heading', title: 'Heading', active: s?.heading, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'ri-bold', title: 'Bold (⌘B)', active: s?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: 'ri-italic', title: 'Italic (⌘I)', active: s?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: 'ri-link', title: 'Link', active: s?.link, run: setLink },
    'sep',
    { icon: 'ri-list-unordered', title: 'Bullet list', active: s?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: 'ri-list-ordered', title: 'Numbered list', active: s?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: 'ri-separator', title: 'Divider', run: () => editor.chain().focus().setHorizontalRule().run() },
    'sep',
    { icon: 'ri-format-clear', title: 'Clear formatting', run: () => editor.chain().focus().unsetAllMarks().clearNodes().run() },
  ];

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 flex-1 min-w-0">
        {tools.map((t, i) => t === 'sep'
          ? <div key={i} className="w-px h-4 bg-gray-200 mx-1" />
          : (
            <button key={t.title} type="button" title={t.title} disabled={t.disabled}
              onMouseDown={e => { e.preventDefault(); t.run(); }}
              className={`w-8 h-8 flex items-center justify-center rounded-md text-[16px] cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-default ${t.active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
              <i className={t.icon} />
            </button>
          ))}
      </div>
      <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
        {(['desktop', 'mobile'] as const).map(w => (
          <button key={w} type="button" title={w === 'desktop' ? 'Desktop width' : 'Phone width'} onClick={() => setWidth(w)}
            className={`w-8 h-7 flex items-center justify-center rounded-md text-[15px] cursor-pointer transition-colors ${width === w ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}>
            <i className={w === 'desktop' ? 'ri-computer-line' : 'ri-smartphone-line'} />
          </button>
        ))}
      </div>
    </div>
  );
}
