// Admin · Online. On-demand video library manager and upcoming live classes.

import { useState } from 'react';
import { CLASS, TEACHER, bookedCount, instructors, sessions, videos } from '../lib/data';
import { dateLabel, peso, studioDateKey, studioTime, relativeDay } from '../lib/format';
import { useDemo } from '../lib/demo';
import type { Level, Video } from '../lib/types';
import { Avatar, Badge, Button, Field, Icon, OptionCard, PageTitle, Panel, SectionTitle, Sheet, Tabs, Toggle, cx } from '../ui/kit';

type View = 'grid' | 'table';
const ACCESS: Record<Video['access'], { tone: 'teal' | 'amber' | 'green'; label: string }> = {
  members: { tone: 'teal', label: 'Members' }, rental: { tone: 'amber', label: 'Rental' }, free: { tone: 'green', label: 'Free' },
};
const STYLES = ['Vinyasa', 'Hatha', 'Yin', 'Restorative', 'Pilates', 'Breathwork'];
const LEVELS: Level[] = ['All levels', 'Beginner', 'Intermediate', 'Advanced'];
const views = (n: number) => n.toLocaleString('en-US');
const shortDate = (iso: string) => dateLabel(iso).replace(/ \d{4}$/, '');

export default function AdminLibrary() {
  const [view, setView] = useState<View>('table');
  const [editing, setEditing] = useState<Video | 'new' | null>(null);
  const total = videos.reduce((s, v) => s + v.views, 0);

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Online" subtitle={`${videos.length} on-demand videos · ${views(total)} views all time`}
        actions={<Button size="sm" icon="ri-upload-cloud-2-line" onClick={() => setEditing('new')}>Upload video</Button>} />

      <SectionTitle action={
        <Tabs<View> value={view} onChange={setView} options={[
          { value: 'table', label: <><Icon name="ri-list-check" /><span className="sr-only">Table</span></> },
          { value: 'grid', label: <><Icon name="ri-layout-grid-line" /><span className="sr-only">Grid</span></> },
        ]} />
      }>On-demand library</SectionTitle>

      {view === 'table' ? (
        <Panel pad={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl min-w-[820px]">
              <thead><tr><th>Video</th><th>Teacher</th><th className="r">Length</th><th>Access</th><th className="r">Views</th><th>Published</th></tr></thead>
              <tbody>
                {videos.map((v) => (
                  <tr key={v.id} className="clickable" onClick={() => setEditing(v)}>
                    <td style={{ height: 60 }}>
                      <div className="flex items-center gap-3">
                        <img src={v.image} alt="" className="w-[64px] h-[40px] rounded-lg object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium whitespace-nowrap">{v.title}</div>
                          <div className="text-[12.5px] text-[var(--ink-3)] whitespace-nowrap">{v.style} · {v.level} · {v.focus}</div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{TEACHER[v.instructorId].name}</td>
                    <td className="r num">{v.duration} min</td>
                    <td><Badge tone={ACCESS[v.access].tone}>{ACCESS[v.access].label}{v.rentalPrice ? ` · ${peso(v.rentalPrice)}` : ''}</Badge></td>
                    <td className="r num">{views(v.views)}</td>
                    <td className="num text-[var(--ink-2)] whitespace-nowrap">{shortDate(v.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {videos.map((v) => (
            <button key={v.id} type="button" onClick={() => setEditing(v)} className="paper rounded-[20px] overflow-hidden text-left hover:shadow-[var(--shadow-lg)] transition-shadow">
              <div className="relative aspect-video">
                <img src={v.image} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 px-1.5 h-5 rounded-md bg-black/60 text-white text-[11.5px] num inline-flex items-center">{v.duration} min</span>
              </div>
              <div className="p-3.5">
                <div className="font-medium leading-snug">{v.title}</div>
                <div className="text-[13px] text-[var(--ink-2)] mt-0.5">{TEACHER[v.instructorId].name}</div>
                <div className="flex items-center justify-between gap-2 mt-3">
                  <Badge tone={ACCESS[v.access].tone}>{ACCESS[v.access].label}</Badge>
                  <span className="text-[12.5px] text-[var(--ink-3)] num inline-flex items-center gap-1"><Icon name="ri-eye-line" />{views(v.views)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <LiveClasses />

      {editing && <VideoSheet key={editing === 'new' ? 'new' : editing.id} video={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function LiveClasses() {
  const { toast } = useDemo();
  const now = new Date().toISOString();
  const upcoming = sessions.filter((s) => s.locationId === null && s.status === 'scheduled' && s.start > now).slice(0, 5);
  const [rec, setRec] = useState<Record<string, boolean>>(Object.fromEntries(upcoming.map((s) => [s.id, true])));
  const link = (id: string) => `https://zoom.us/j/8${String(Math.abs([...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))).padStart(9, '0').slice(0, 9)}`;
  const copy = (url: string) => {
    try { navigator.clipboard?.writeText(url); } catch { /* demo */ }
    toast('Zoom link copied');
  };
  return (
    <>
      <SectionTitle className="mt-10">Live classes</SectionTitle>
      <Panel pad={false} className="divide-y divide-[var(--line)]">
        {upcoming.map((s) => {
          const c = CLASS[s.classTypeId];
          const t = TEACHER[s.instructorId];
          const url = link(s.id);
          return (
            <div key={s.id} className="px-4 md:px-5 py-4 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_auto] lg:items-center">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-[68px] flex-shrink-0 num text-[13px]">
                  <div className="font-medium">{relativeDay(studioDateKey(s.start))}</div>
                  <div className="text-[var(--ink-3)]">{studioTime(s.start)}</div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name.replace(' (live)', '')}</div>
                  <div className="text-[13px] text-[var(--ink-2)] flex items-center gap-1.5"><Avatar name={t.name} color={t.color} size={18} />{t.name} · <span className="num">{bookedCount(s)}</span> booked</div>
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <input readOnly value={url} className="input font-mono text-[12.5px]" style={{ height: 38 }} aria-label="Zoom link" onFocus={(e) => e.currentTarget.select()} />
                <Button size="sm" variant="secondary" icon="ri-file-copy-line" onClick={() => copy(url)} aria-label="Copy Zoom link">Copy</Button>
              </div>
              <label className="flex items-center gap-2.5 text-[13px] text-[var(--ink-2)] lg:justify-end">
                <Toggle on={rec[s.id]} onChange={(v) => setRec({ ...rec, [s.id]: v })} label="Auto-publish replay" />
                <span>Recording: auto-publish replay for 7 days</span>
              </label>
            </div>
          );
        })}
      </Panel>
    </>
  );
}

function VideoSheet({ video: v, onClose }: { video: Video | null; onClose: () => void }) {
  const { toast } = useDemo();
  const [access, setAccess] = useState<Video['access']>(v?.access ?? 'members');
  const [title, setTitle] = useState(v?.title ?? '');
  const [file, setFile] = useState<string | null>(null);
  const save = () => {
    toast(v ? `${title || v.title} saved` : `${title || 'Video'} uploading — it publishes when processing finishes`);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={v ? 'Edit video' : 'Upload video'} subtitle={v ? `Published ${dateLabel(v.publishedAt)} · ${views(v.views)} views` : 'MP4 or MOV, up to 4 GB.'}
      footer={<div className="flex flex-wrap justify-between gap-2">
        {v ? <Button variant="danger" onClick={() => { toast(`${v.title} unpublished`, 'warn'); onClose(); }}>Unpublish</Button> : <span />}
        <div className="flex gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>{v ? 'Save changes' : 'Upload'}</Button></div>
      </div>}>
      <div className="space-y-4">
        {v ? (
          <div className="relative rounded-2xl overflow-hidden aspect-video">
            <img src={v.image} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => toast('Thumbnail picker opens here', 'info')} className="absolute bottom-3 right-3 h-8 px-3 rounded-full bg-white/90 text-[13px] font-medium inline-flex items-center gap-1.5">
              <Icon name="ri-image-edit-line" />Change thumbnail
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setFile('sunset-flow-oct.mp4')}
            className={cx('w-full rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
              file ? 'border-[var(--teal)] bg-[var(--teal-soft)]' : 'border-[var(--line-2)] hover:border-[var(--ink-3)] bg-white')}>
            <Icon name={file ? 'ri-film-line' : 'ri-upload-cloud-2-line'} className="text-[28px] text-[var(--teal)]" />
            <div className="font-medium mt-2">{file ?? 'Drop a video here'}</div>
            <div className="text-[13px] text-[var(--ink-2)] mt-0.5">{file ? '1.2 GB · ready to upload' : 'or click to choose a file'}</div>
          </button>
        )}
        <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hips after a long day" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teacher">
            <select className="input" defaultValue={v?.instructorId ?? 'maya'}>{instructors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </Field>
          <Field label="Style">
            <select className="input" defaultValue={v?.style ?? 'Vinyasa'}>{STYLES.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field label="Level">
            <select className="input" defaultValue={v?.level ?? 'All levels'}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
          </Field>
          <Field label="Focus"><input className="input" defaultValue={v?.focus} placeholder="Hips, Back, Sleep…" /></Field>
        </div>
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-[var(--ink-2)]">Who can watch</span>
          <OptionCard selected={access === 'members'} onSelect={() => setAccess('members')} title="Members" meta="Monthly, online membership and 10-class pass holders" />
          <OptionCard selected={access === 'rental'} onSelect={() => setAccess('rental')} title="Rental" meta="Anyone can rent it for 48 hours" />
          <OptionCard selected={access === 'free'} onSelect={() => setAccess('free')} title="Free" meta="Open to everyone. Good for bringing in new guests" />
        </div>
        {access === 'rental' && (
          <Field label="Rental price (₱, 48 hours)"><input className="input num" type="number" defaultValue={v?.rentalPrice ?? 350} /></Field>
        )}
      </div>
    </Sheet>
  );
}
