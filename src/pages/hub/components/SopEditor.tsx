import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import type { Editor } from '@tiptap/core';
import { looksStructured, sopTextToHtml, sopToEditorHtml } from '@/lib/sopContent';

const sopExtensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

// Docs, Notion and Google Docs put checklists on the clipboard as list items that
// start with a checkbox input; Tiptap only recognises its own data-type markup.
// Page titles (h1) become section headings, and h4–h6 fold into h3.
function normalizePastedHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  doc.querySelectorAll('h1, h4, h5, h6').forEach(h => {
    const next = doc.createElement(h.tagName === 'H1' ? 'h2' : 'h3');
    next.innerHTML = h.innerHTML;
    h.replaceWith(next);
  });

  doc.querySelectorAll('li').forEach(li => {
    if (li.getAttribute('data-type') === 'taskItem') return;
    const box = li.querySelector('input[type="checkbox"]');
    const ariaBox = li.querySelector('[role="checkbox"]');
    const marked = li.hasAttribute('data-checked') || li.classList.contains('task-list-item');
    if (!box && !ariaBox && !marked) return;
    // Only treat it as a checklist item when the box belongs to this item, not a nested one.
    if (box && box.closest('li') !== li) return;

    const checked = box
      ? (box as HTMLInputElement).checked || box.hasAttribute('checked')
      : ariaBox
        ? ariaBox.getAttribute('aria-checked') === 'true'
        : ['true', ''].includes(li.getAttribute('data-checked') ?? 'false');
    const label = box?.closest('label');
    if (label && label.childElementCount === 1 && !label.textContent?.trim()) label.remove();
    else box?.remove();
    ariaBox?.remove();

    li.setAttribute('data-type', 'taskItem');
    li.setAttribute('data-checked', String(checked));
    li.parentElement?.setAttribute('data-type', 'taskList');
  });

  return doc.body.innerHTML;
}

interface SopEditorProps {
  initialContent?: string | null;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function SopEditor({ initialContent, onChange, placeholder = 'Write the SOP, or paste it from a doc…' }: SopEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: sopExtensions(placeholder),
    content: sopToEditorHtml(initialContent),
    editorProps: {
      transformPastedHTML: normalizePastedHTML,
      // Markdown pasted as plain text (ChatGPT, Notes) keeps its headings and lists.
      handlePaste: (_view, event) => {
        const data = event.clipboardData;
        if (!data || data.types.includes('text/html')) return false;
        const text = data.getData('text/plain');
        if (!text || !looksStructured(text)) return false;
        editorRef.current?.chain().focus().insertContent(sopTextToHtml(text)).run();
        return true;
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.isEmpty ? '' : editor.getHTML()),
  });
  editorRef.current = editor;

  return (
    <div className="sop-editor border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-[#FF6B35]/30 focus-within:border-[#FF6B35]">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="sop-prose" />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }: { editor: Editor }) => ({
      h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }),
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      code: editor.isActive('code'),
      link: editor.isActive('link'),
      bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'),
      task: editor.isActive('taskList'),
      quote: editor.isActive('blockquote'),
    }),
  });

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? 'https://');
    if (url === null) return;
    if (!url.trim() || url.trim() === 'https://') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const tools: Array<{ icon: string; title: string; active?: boolean; run: () => void } | 'sep'> = [
    { icon: 'ri-h-2', title: 'Heading', active: s?.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: 'ri-h-3', title: 'Subheading', active: s?.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    'sep',
    { icon: 'ri-bold', title: 'Bold', active: s?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: 'ri-italic', title: 'Italic', active: s?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: 'ri-code-line', title: 'Inline code', active: s?.code, run: () => editor.chain().focus().toggleCode().run() },
    { icon: 'ri-link', title: 'Link', active: s?.link, run: setLink },
    'sep',
    { icon: 'ri-list-unordered', title: 'Bullet list', active: s?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: 'ri-list-ordered', title: 'Numbered steps', active: s?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: 'ri-list-check-2', title: 'Checklist', active: s?.task, run: () => editor.chain().focus().toggleTaskList().run() },
    { icon: 'ri-double-quotes-l', title: 'Callout', active: s?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: 'ri-separator', title: 'Divider', run: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-gray-100 bg-white rounded-t-lg">
      {tools.map((t, i) => t === 'sep'
        ? <div key={i} className="w-px h-4 bg-gray-200 mx-1" />
        : (
          <button key={t.title} type="button" title={t.title}
            onMouseDown={e => { e.preventDefault(); t.run(); }}
            className={`w-7 h-7 flex items-center justify-center rounded-md text-[15px] cursor-pointer transition-colors ${t.active ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
            <i className={t.icon}></i>
          </button>
        ))}
    </div>
  );
}

// Read-only renderer. Content goes through the same schema as the editor, so
// only known formatting survives — no raw HTML reaches the page.
export function SopContent({ content, className = '' }: { content?: string | null; className?: string }) {
  const editor = useEditor({
    extensions: sopExtensions(),
    content: sopToEditorHtml(content),
    editable: false,
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setContent(sopToEditorHtml(content), { emitUpdate: false });
  }, [editor, content]);

  if (!content) return <p className="text-sm text-gray-400">No content yet.</p>;
  return <EditorContent editor={editor} className={`sop-prose sop-read ${className}`} />;
}
