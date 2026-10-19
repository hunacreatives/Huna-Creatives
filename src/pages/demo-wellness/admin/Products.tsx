// Admin · Passes & promos. Products table with an edit drawer, and promo codes.

import { useState } from 'react';
import { TODAY_KEY, products, promos } from '../lib/data';
import { addDays, dateLabel, peso } from '../lib/format';
import { useDemo } from '../lib/demo';
import type { LocationId, Product, ProductKind, Promo } from '../lib/types';
import { Badge, Button, Chip, Field, Icon, PageTitle, Panel, Sheet, Tabs, Toggle } from '../ui/kit';

type Tab = 'passes' | 'promos';

const KIND: Record<ProductKind, string> = { intro: 'Intro offer', dropin: 'Drop-in', pack: 'Class pack', monthly: 'Membership', online: 'Online membership' };
const SOLD_30D: Record<string, number> = { intro: 38, dropin: 214, pack5: 46, pack10: 61, monthly: 27, online: 84 };
const APPLIES: Record<Promo['appliesTo'], string> = { all: 'Everything', retreat: 'Retreats', ...KIND, pack: 'Class packs' };

const studios = (p: Product) => p.locations === 'all' ? 'Both studios' : p.locations.length === 0 ? 'Online only' : p.locations.map((l) => (l === 'beach' ? 'Seaside' : 'Downtown')).join(', ');

export default function AdminProducts() {
  const [tab, setTab] = useState<Tab>('passes');
  const [active, setActive] = useState<Record<string, boolean>>(Object.fromEntries(products.map((p) => [p.id, p.active])));
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [promo, setPromo] = useState<Promo | 'new' | null>(null);

  return (
    <div className="text-[14px]">
      <PageTitle admin title="Passes & promos" subtitle="What guests can buy, and the codes that discount it."
        actions={tab === 'passes'
          ? <Button size="sm" icon="ri-add-line" onClick={() => setEditing('new')}>New pass</Button>
          : <Button size="sm" icon="ri-add-line" onClick={() => setPromo('new')}>New code</Button>} />

      <Tabs<Tab> value={tab} onChange={setTab} className="mb-4" options={[
        { value: 'passes', label: 'Passes & memberships', count: products.length },
        { value: 'promos', label: 'Promo codes', count: promos.length },
      ]} />

      {tab === 'passes' ? (
        <Panel pad={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl min-w-[920px]">
              <thead><tr><th>Name</th><th>Type</th><th className="r">Price</th><th className="r">Classes</th><th>Valid for</th><th>Studios</th><th>On-demand</th><th className="r">Sold, 30 days</th><th className="r">Active</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => setEditing(p)}>
                    <td className="font-medium whitespace-nowrap">{p.name}{p.popular && <span className="ml-2 text-[12px] font-normal text-[var(--ink-3)]">Featured</span>}</td>
                    <td className="text-[var(--ink-2)] whitespace-nowrap">{KIND[p.kind]}</td>
                    <td className="r num font-medium">{peso(p.price)}</td>
                    <td className="r num">{p.credits ?? 'Unlimited'}</td>
                    <td className="num whitespace-nowrap">{p.validityDays} days</td>
                    <td className="whitespace-nowrap">{studios(p)}</td>
                    <td>{p.includesOnDemand ? <Icon name="ri-check-line" className="text-[var(--ok)] text-[17px]" /> : <span className="text-[var(--ink-3)]">—</span>}</td>
                    <td className="r num">{SOLD_30D[p.id] ?? 0}</td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex"><Toggle on={active[p.id]} onChange={(v) => setActive({ ...active, [p.id]: v })} label={`${p.name} active`} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <Panel pad={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tbl min-w-[720px]">
              <thead><tr><th>Code</th><th className="r">Off</th><th>Applies to</th><th className="r">Uses</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {promos.map((p) => {
                  const expired = p.expiresAt && p.expiresAt < TODAY_KEY;
                  return (
                    <tr key={p.id} className="clickable" onClick={() => setPromo(p)}>
                      <td><span className="font-mono text-[13.5px] font-medium tracking-wide">{p.code}</span></td>
                      <td className="r num">{p.percentOff}%</td>
                      <td>{APPLIES[p.appliesTo]}</td>
                      <td className="r num">{p.uses}{p.maxUses !== null && <span className="text-[var(--ink-3)]"> / {p.maxUses}</span>}</td>
                      <td className="num whitespace-nowrap">{p.expiresAt ? dateLabel(p.expiresAt) : <span className="text-[var(--ink-3)]">Never</span>}</td>
                      <td>{expired ? <Badge tone="gray">Expired</Badge> : p.active ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Paused</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {editing && <PassSheet key={editing === 'new' ? 'new' : editing.id} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {promo && <PromoSheet key={promo === 'new' ? 'new' : promo.id} promo={promo === 'new' ? null : promo} onClose={() => setPromo(null)} />}
    </div>
  );
}

function PassSheet({ product: p, onClose }: { product: Product | null; onClose: () => void }) {
  const { toast } = useDemo();
  const [kind, setKind] = useState<ProductKind>(p?.kind ?? 'pack');
  const [name, setName] = useState(p?.name ?? '');
  const [unlimited, setUnlimited] = useState(p ? p.credits === null : false);
  const [locs, setLocs] = useState<LocationId[]>(p ? (p.locations === 'all' ? ['beach', 'town'] : p.locations) : ['beach', 'town']);
  const [onDemand, setOnDemand] = useState(p?.includesOnDemand ?? false);
  const [active, setActive] = useState(p?.active ?? true);
  const toggleLoc = (l: LocationId) => setLocs(locs.includes(l) ? locs.filter((x) => x !== l) : [...locs, l]);

  const save = () => { toast(p ? `${name || p.name} saved` : `${name || 'New pass'} created and listed on the Passes page`); onClose(); };

  return (
    <Sheet open onClose={onClose} title={p ? p.name : 'New pass'} subtitle={p ? `${SOLD_30D[p.id] ?? 0} sold in the last 30 days` : 'Shows on the website once active.'}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save}>{p ? 'Save changes' : 'Create pass'}</Button></div>}>
      <div className="space-y-4">
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 20-class pass" /></Field>
        <Field label="Type">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ProductKind)}>
            {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₱)"><input className="input num" type="number" defaultValue={p?.price ?? ''} placeholder="0" /></Field>
          <Field label="Valid for (days)"><input className="input num" type="number" defaultValue={p?.validityDays ?? 30} /></Field>
        </div>
        <div>
          <Field label="Classes included"><input className="input num" type="number" disabled={unlimited} defaultValue={p?.credits ?? 10} /></Field>
          <label className="flex items-center gap-2 mt-2 text-[13.5px] text-[var(--ink-2)]">
            <input type="checkbox" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="accent-[var(--teal)] w-4 h-4" />Unlimited classes
          </label>
        </div>
        <div>
          <span className="block text-[13px] font-medium text-[var(--ink-2)] mb-1.5">Valid at</span>
          <div className="flex gap-1.5">
            <Chip active={locs.includes('beach')} onClick={() => toggleLoc('beach')} icon={locs.includes('beach') ? 'ri-check-line' : undefined}>Seaside</Chip>
            <Chip active={locs.includes('town')} onClick={() => toggleLoc('town')} icon={locs.includes('town') ? 'ri-check-line' : undefined}>Downtown</Chip>
          </div>
          {locs.length === 0 && <p className="text-[12.5px] text-[var(--ink-3)] mt-1.5">No studios selected: this pass is online only.</p>}
        </div>
        <Field label="Description"><textarea className="input" rows={3} defaultValue={p?.description} placeholder="One or two lines guests see on the Passes page" /></Field>
        <div className="rounded-2xl border border-[var(--line)] bg-white divide-y divide-[var(--line)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div><div className="font-medium">Includes on-demand</div><div className="text-[13px] text-[var(--ink-2)]">Full video library while the pass is active</div></div>
            <Toggle on={onDemand} onChange={setOnDemand} label="Includes on-demand" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div><div className="font-medium">Active</div><div className="text-[13px] text-[var(--ink-2)]">Off hides it from the website. Existing holders keep theirs.</div></div>
            <Toggle on={active} onChange={setActive} label="Active" />
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function PromoSheet({ promo: p, onClose }: { promo: Promo | null; onClose: () => void }) {
  const { toast } = useDemo();
  const [code, setCode] = useState(p?.code ?? '');
  const gen = () => setCode(['SALTY', 'TIDE', 'BAY', 'SUNSET'][Math.floor(Math.random() * 4)] + Math.floor(10 + Math.random() * 89));
  return (
    <Sheet open onClose={onClose} title={p ? p.code : 'New promo code'} subtitle={p ? `Used ${p.uses} times` : 'Guests enter it at checkout.'}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { toast(p ? `${code} saved` : `${code || 'Code'} created`); onClose(); }}>{p ? 'Save changes' : 'Create code'}</Button></div>}>
      <div className="space-y-4">
        <Field label="Code">
          <div className="flex gap-2">
            <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="FRIENDS15" />
            <Button variant="secondary" onClick={gen} aria-label="Generate a code" icon="ri-magic-line">Generate</Button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Percent off"><input className="input num" type="number" min={1} max={100} defaultValue={p?.percentOff ?? 15} /></Field>
          <Field label="Applies to">
            <select className="input" defaultValue={p?.appliesTo ?? 'all'}>
              {Object.entries(APPLIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Max uses" hint="Leave empty for no limit"><input className="input num" type="number" defaultValue={p?.maxUses ?? ''} /></Field>
          <Field label="Expires"><input className="input" type="date" defaultValue={p?.expiresAt ?? addDays(TODAY_KEY, 30)} /></Field>
        </div>
      </div>
    </Sheet>
  );
}
