// Admin · Staff & settings. Team, booking policies, guest notifications, payment providers.

import { useState } from 'react';
import { LOC, staff } from '../lib/data';
import { useDemo } from '../lib/demo';
import type { LocationId, StaffMember } from '../lib/types';
import { Avatar, Badge, Button, Chip, Field, Icon, OptionCard, PageTitle, Panel, Sheet, Tabs, Toggle } from '../ui/kit';

type Tab = 'staff' | 'policies' | 'notifications' | 'payments';
type Role = StaffMember['role'];

const ROLES: Record<Role, { label: string; tone: 'teal' | 'blue' | 'gray' | 'green'; desc: string }> = {
  owner: { label: 'Owner', tone: 'teal', desc: 'Everything, including payouts and billing' },
  manager: { label: 'Manager', tone: 'blue', desc: 'Everything except payouts' },
  front_desk: { label: 'Front desk', tone: 'gray', desc: 'Check-in and sales' },
  instructor: { label: 'Instructor', tone: 'green', desc: 'Their own classes and rosters only' },
};

export default function AdminStaff() {
  const [tab, setTab] = useState<Tab>('staff');
  const [inviting, setInviting] = useState(false);
  return (
    <div className="text-[14px]">
      <PageTitle admin title="Staff & settings"
        actions={tab === 'staff' && <Button size="sm" icon="ri-user-add-line" onClick={() => setInviting(true)}>Invite</Button>} />
      <Tabs<Tab> value={tab} onChange={setTab} className="mb-4" options={[
        { value: 'staff', label: 'Staff', count: staff.length }, { value: 'policies', label: 'Policies' },
        { value: 'notifications', label: 'Notifications' }, { value: 'payments', label: 'Payments' },
      ]} />
      {tab === 'staff' && <StaffTable />}
      {tab === 'policies' && <Policies />}
      {tab === 'notifications' && <Notifications />}
      {tab === 'payments' && <Payments />}
      <Invite open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function StaffTable() {
  return (
    <Panel pad={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="tbl min-w-[640px]">
          <thead><tr><th>Name</th><th>Role</th><th>Locations</th><th>Email</th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td><div className="flex items-center gap-2.5"><Avatar name={s.name} size={30} color={s.role === 'owner' ? '#075056' : undefined} /><span className="font-medium whitespace-nowrap">{s.name}</span></div></td>
                <td><Badge tone={ROLES[s.role].tone}>{ROLES[s.role].label}</Badge></td>
                <td className="whitespace-nowrap">{s.locations.map((l) => LOC[l].name).join(', ')}</td>
                <td className="text-[var(--ink-2)]">{s.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Invite({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useDemo();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('instructor');
  const [locs, setLocs] = useState<LocationId[]>(['beach']);
  const toggle = (l: LocationId) => setLocs(locs.includes(l) ? locs.filter((x) => x !== l) : [...locs, l]);
  return (
    <Sheet open={open} onClose={onClose} title="Invite a team member" subtitle="They get an email to set a password."
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button icon="ri-send-plane-line" onClick={() => { toast(`Invite sent to ${email || 'new teammate'} as ${ROLES[role].label.toLowerCase()}`); setEmail(''); onClose(); }}>Send invite</Button></div>}>
      <div className="space-y-5">
        <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@saltandstillness.ph" /></Field>
        <div className="space-y-2">
          <span className="block text-[13px] font-medium text-[var(--ink-2)]">Role</span>
          {(Object.keys(ROLES) as Role[]).map((r) => <OptionCard key={r} selected={role === r} onSelect={() => setRole(r)} title={ROLES[r].label} meta={ROLES[r].desc} />)}
        </div>
        <div>
          <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">Locations</span>
          <div className="flex gap-1.5">
            {(['beach', 'town'] as LocationId[]).map((l) => <Chip key={l} active={locs.includes(l)} onClick={() => toggle(l)} icon={locs.includes(l) ? 'ri-check-line' : undefined}>{LOC[l].name}</Chip>)}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function Policies() {
  const { toast } = useDemo();
  const [auto, setAuto] = useState(true);
  return (
    <Panel className="max-w-[720px] space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Late-cancel window" hint="Cancelling inside this window counts as late">
          <Affix suffix="hours" value={12} />
        </Field>
        <Field label="Late-cancel fee" hint="Or one class credit for pass holders">
          <Affix prefix="₱" value={350} />
        </Field>
        <Field label="No-show fee" hint="Charged to the card on file">
          <Affix prefix="₱" value={500} />
        </Field>
        <Field label="Booking window" hint="How far ahead guests can book">
          <Affix suffix="days" value={14} />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-[var(--line)]">
        <div>
          <div className="font-medium">Move people in from the waitlist automatically</div>
          <div className="text-[13px] text-[var(--ink-2)]">When a spot opens, the next person is booked and told by email and WhatsApp. Stops 2 hours before class.</div>
        </div>
        <Toggle on={auto} onChange={setAuto} label="Automatic waitlist" />
      </div>
      <div className="flex justify-end"><Button onClick={() => toast('Policies saved. They apply to new bookings.')}>Save policies</Button></div>
    </Panel>
  );
}

function Affix({ prefix, suffix, value }: { prefix?: string; suffix?: string; value: number }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none">{prefix}</span>}
      <input className="input num" type="number" defaultValue={value} style={{ paddingLeft: prefix ? 30 : undefined, paddingRight: suffix ? 64 : undefined }} />
      {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)] pointer-events-none text-[13.5px]">{suffix}</span>}
    </div>
  );
}

const MESSAGES = [
  { id: 'confirm', label: 'Booking confirmed', desc: 'Right after booking, with the studio map', email: true, wa: false },
  { id: 'remind', label: 'Reminder, 24 hours before', desc: 'Class time in studio time and the guest\'s own', email: true, wa: true },
  { id: 'waitlist', label: 'Moved in from the waitlist', desc: 'As soon as a spot opens', email: true, wa: true },
  { id: 'cancel', label: 'Class cancelled', desc: 'Sent by staff, credit returned automatically', email: true, wa: true },
  { id: 'balance', label: 'Retreat balance due', desc: '7 days before the due date, with a pay link', email: true, wa: false },
];

function Notifications() {
  const { toast } = useDemo();
  const [state, setState] = useState(Object.fromEntries(MESSAGES.map((m) => [m.id, { email: m.email, wa: m.wa }])));
  const set = (id: string, k: 'email' | 'wa', v: boolean) => setState({ ...state, [id]: { ...state[id], [k]: v } });
  return (
    <div className="max-w-[820px]">
      <Panel pad={false}>
        <div className="hidden sm:grid grid-cols-[1fr_80px_90px] gap-3 px-5 py-2.5 text-[12.5px] text-[var(--ink-3)] border-b border-[var(--line)]">
          <span>Guest message</span><span className="text-center">Email</span><span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {MESSAGES.map((m) => (
            <div key={m.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_90px] gap-x-3 gap-y-2 items-center px-5 py-3.5">
              <div className="col-span-2 sm:col-span-1 min-w-0">
                <div className="font-medium">{m.label}</div>
                <div className="text-[13px] text-[var(--ink-2)]">{m.desc}</div>
              </div>
              <label className="flex items-center gap-2 sm:justify-center text-[13px] text-[var(--ink-2)]"><span className="sm:hidden">Email</span><Toggle on={state[m.id].email} onChange={(v) => set(m.id, 'email', v)} label={`${m.label} by email`} /></label>
              <label className="flex items-center gap-2 sm:justify-center text-[13px] text-[var(--ink-2)]"><span className="sm:hidden">WhatsApp</span><Toggle on={state[m.id].wa} onChange={(v) => set(m.id, 'wa', v)} label={`${m.label} by WhatsApp`} /></label>
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex items-center justify-between gap-3 mt-3">
        <button type="button" className="text-[13.5px] text-[var(--teal)] font-medium inline-flex items-center gap-1" onClick={() => toast('Preview opens the email and WhatsApp versions side by side', 'info')}>
          <Icon name="ri-eye-line" />Preview messages
        </button>
        <Button onClick={() => toast('Notification settings saved')}>Save</Button>
      </div>
    </div>
  );
}

const PROVIDERS = [
  { name: 'Xendit', icon: 'ri-bank-card-line', what: 'Visa, Mastercard and Amex. Charges in US$ or ₱; settles in ₱ to BPI.', fee: '3.2% + ₱10 per card payment' },
  { name: 'PayPal', icon: 'ri-paypal-line', what: 'For guests who prefer PayPal. Settles weekly.', fee: '4.4% + fixed fee' },
  { name: 'GCash via Xendit', icon: 'ri-smartphone-line', what: 'QR and app checkout for local guests.', fee: '2.3% per payment' },
];

function Payments() {
  const { toast } = useDemo();
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {PROVIDERS.map((p) => (
        <Panel key={p.name} className="flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="w-10 h-10 rounded-xl bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center"><Icon name={p.icon} className="text-[19px]" /></span>
            <Badge tone="green">Connected</Badge>
          </div>
          <div className="font-semibold mt-3">{p.name}</div>
          <p className="text-[13.5px] text-[var(--ink-2)] mt-1 flex-1">{p.what}</p>
          <div className="text-[12.5px] text-[var(--ink-3)] mt-3">{p.fee}</div>
          <Button size="sm" variant="secondary" className="mt-4 self-start" onClick={() => toast(`${p.name} settings open in a new tab`, 'info')}>Manage</Button>
        </Panel>
      ))}
    </div>
  );
}
