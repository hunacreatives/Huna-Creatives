import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ContractFields, ROLE_TEMPLATES, BLANK, generateContractHTML } from '../documents/ContractGeneratorModal';
import { FRANCIS_SIG, HUNA_LOGO } from '../documents/contractAssets';

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAYS_FULL: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const emptyProfile = {
  full_name: '', email: '', role: 'contractor' as 'contractor' | 'admin' | 'owner',
  department: '', job_title: '', start_date: new Date().toISOString().slice(0, 10),
  payment_type: 'fixed' as 'fixed' | 'hourly' | 'fixed_flexible' | 'project_based',
  monthly_rate: '', hourly_rate: '', project_percentage: '', currency: 'PHP',
  shift_start: '', shift_end: '', work_days: [] as string[], slack_id: '',
};

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]';
const labelCls = 'block text-xs font-medium text-gray-700 mb-1';

interface Props { onClose: () => void; onSuccess: () => void; }

export default function AddContractorModal({ onClose, onSuccess }: Props) {
  const { hubUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState({ ...emptyProfile });
  const [cf, setCf] = useState<ContractFields>({ ...BLANK });
  const [contractorId, setContractorId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setP = (k: string, v: any) => setProfile(p => ({ ...p, [k]: v }));
  const setC = (k: keyof ContractFields, v: any) => setCf(p => ({ ...p, [k]: v }));
  const toggleDay = (d: string) => setP('work_days', profile.work_days.includes(d) ? profile.work_days.filter(x => x !== d) : [...profile.work_days, d]);
  const currSymbol = profile.currency === 'USD' ? '$' : '₱';

  const setListItem = (key: 'responsibilities' | 'additionalResponsibilities' | 'tools', idx: number, val: string) =>
    setCf(p => { const a = [...(p[key] as string[])]; a[idx] = val; return { ...p, [key]: a }; });
  const addItem = (key: 'responsibilities' | 'additionalResponsibilities' | 'tools') =>
    setCf(p => ({ ...p, [key]: [...(p[key] as string[]), ''] }));
  const removeItem = (key: 'responsibilities' | 'additionalResponsibilities' | 'tools', idx: number) =>
    setCf(p => ({ ...p, [key]: (p[key] as string[]).filter((_, i) => i !== idx) }));

  const applyTemplate = (t: string) => {
    const tmpl = ROLE_TEMPLATES[t];
    if (tmpl) setCf(p => ({ ...p, ...tmpl }));
  };

  // Step 1 → 2: create contractor record (no invite email yet)
  const saveProfile = async () => {
    if (!profile.full_name.trim() || !profile.email.trim()) { setError('Name and email are required.'); return; }
    setSaving(true); setError('');

    const { data, error: fnErr } = await supabase.functions.invoke('invite-contractor', {
      body: {
        email: profile.email.trim().toLowerCase(),
        full_name: profile.full_name.trim(),
        role: profile.role,
        department: profile.department || null,
        job_title: profile.job_title || null,
        start_date: profile.start_date || null,
        payment_type: profile.payment_type,
        hourly_rate: profile.hourly_rate ? parseFloat(profile.hourly_rate) : null,
        monthly_rate: profile.monthly_rate ? parseFloat(profile.monthly_rate) : null,
        project_percentage: profile.project_percentage ? parseFloat(profile.project_percentage) : null,
        currency: profile.currency,
        shift_start: profile.shift_start || null,
        shift_end: profile.shift_end || null,
        work_days: profile.work_days,
        slack_id: profile.slack_id || null,
        skip_invite: true,
      },
    });

    setSaving(false);
    if (fnErr || data?.error) { setError(data?.error ?? fnErr?.message ?? 'Something went wrong.'); return; }

    const newId = data?.user_id;
    setContractorId(newId);

    // Pre-fill contract from profile
    const fullDays = profile.work_days.map(d => DAYS_FULL[d] ?? d);
    const shiftText = profile.shift_start && profile.shift_end
      ? `${fmt12(profile.shift_start)} to ${fmt12(profile.shift_end)} Philippine Time`
      : BLANK.shiftTime;
    const pType = profile.payment_type === 'project_based' ? 'fixed' : profile.payment_type as 'fixed' | 'hourly' | 'fixed_flexible';

    setCf(p => ({
      ...p,
      contractorId: newId,
      contractorName: profile.full_name.trim(),
      workDays: fullDays.length ? fullDays : p.workDays,
      shiftTime: shiftText,
      monthlyRate: profile.monthly_rate || p.monthlyRate,
      hourlyRate: profile.hourly_rate || p.hourlyRate,
      currency: (['PHP', 'USD'] as string[]).includes(profile.currency) ? profile.currency as 'PHP' | 'USD' : 'PHP',
      paymentType: pType,
    }));

    setStep(2);
  };

  // Step 3: save contract + send invite
  const sendAll = async () => {
    setSaving(true); setError('');

    const html = generateContractHTML(cf, FRANCIS_SIG, HUNA_LOGO);
    const title = `Independent Contractor Agreement – ${cf.contractorName}`;

    const { data: doc, error: docErr } = await supabase
      .from('hub_sign_documents')
      .insert({
        title,
        description: `Effective ${new Date(cf.effectiveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        content: html,
        is_generated: true,
        amendment_type: 'initial',
        rate_snapshot: cf.paymentType === 'hourly' ? (cf.hourlyRate ? Number(cf.hourlyRate) : null) : (cf.monthlyRate ? Number(cf.monthlyRate) : null),
        uploaded_by: hubUser!.id,
      })
      .select('id')
      .single();

    if (docErr || !doc) { setError('Failed to save contract.'); setSaving(false); return; }

    await supabase.from('hub_sign_assignments').insert({ document_id: doc.id, contractor_id: contractorId });

    const { data: inviteData, error: inviteErr } = await supabase.functions.invoke('resend-invite', {
      body: { contractor_id: contractorId },
    });

    setSaving(false);
    if (inviteErr || inviteData?.error) { setError(inviteData?.error ?? inviteErr?.message ?? 'Failed to send invite.'); return; }

    onSuccess();
    onClose();
  };

  const openPreview = () => {
    const blob = new Blob([generateContractHTML(cf, FRANCIS_SIG, HUNA_LOGO)], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  };

  const contractReady = cf.role && cf.effectiveDate &&
    (cf.paymentType === 'hourly' ? cf.hourlyRate : cf.monthlyRate) &&
    cf.responsibilities.some(r => r.trim());

  const STEPS = ['Profile', 'Contract', 'Send Invite'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-[#111827]">Add Employee</h2>
            <p className="text-xs text-gray-400 mt-0.5">Invite won't be sent until the final step</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-100 flex-shrink-0">
          {STEPS.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center">
                <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? 'text-[#FF6B35]' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${active ? 'bg-[#FF6B35] text-white' : done ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <i className="ri-check-line"></i> : n}
                  </div>
                  {label}
                </div>
                {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-2 flex-shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ─── STEP 1: Profile ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Info</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Full Name *</label>
                      <input value={profile.full_name} onChange={e => setP('full_name', e.target.value)} placeholder="e.g. Angela Louise Ando" className={inputCls} /></div>
                    <div><label className={labelCls}>Email *</label>
                      <input type="email" value={profile.email} onChange={e => setP('email', e.target.value)} placeholder="their@email.com" className={inputCls} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Department</label>
                      <input value={profile.department} onChange={e => setP('department', e.target.value)} placeholder="e.g. Creative" className={inputCls} /></div>
                    <div><label className={labelCls}>Job Title</label>
                      <input value={profile.job_title} onChange={e => setP('job_title', e.target.value)} placeholder="e.g. Senior Graphic Designer" className={inputCls} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Start Date</label>
                      <input type="date" value={profile.start_date} onChange={e => setP('start_date', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Access Role</label>
                      <select value={profile.role} onChange={e => setP('role', e.target.value)} className={`${inputCls} bg-white`}>
                        <option value="contractor">Employee</option>
                        <option value="admin">HR / Admin</option>
                        <option value="owner">Owner</option>
                      </select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Slack ID</label>
                      <input value={profile.slack_id} onChange={e => setP('slack_id', e.target.value)} placeholder="e.g. U09NUQFTZL6" className={inputCls} /></div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Compensation</p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[{ v: 'fixed', l: 'Fixed Monthly' }, { v: 'hourly', l: 'Hourly' }, { v: 'fixed_flexible', l: 'Fixed Flexible' }, { v: 'project_based', l: 'Project Based' }].map(o => (
                      <button key={o.v} type="button" onClick={() => setP('payment_type', o.v)}
                        className={`flex-1 py-2 text-xs rounded-lg border cursor-pointer transition-colors ${profile.payment_type === o.v ? 'bg-[#111827] text-white border-[#111827]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                  {profile.payment_type === 'project_based' ? (
                    <div><label className={labelCls}>Their Cut (% of project) *</label>
                      <div className="relative"><input type="number" min="0" max="100" value={profile.project_percentage} onChange={e => setP('project_percentage', e.target.value)} placeholder="e.g. 40" className={`${inputCls} pr-8`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span></div></div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div><label className={labelCls}>Currency</label>
                        <select value={profile.currency} onChange={e => setP('currency', e.target.value)} className={`${inputCls} bg-white`}>
                          {['PHP', 'USD', 'EUR', 'GBP', 'AUD', 'CAD'].map(c => <option key={c}>{c}</option>)}
                        </select></div>
                      {(profile.payment_type === 'fixed' || profile.payment_type === 'fixed_flexible') && (
                        <div className="col-span-2"><label className={labelCls}>Monthly Rate ({profile.currency}) *</label>
                          <input type="number" min="0" value={profile.monthly_rate} onChange={e => setP('monthly_rate', e.target.value)} placeholder={`${currSymbol}0.00`} className={inputCls} /></div>
                      )}
                      {profile.payment_type === 'hourly' && (
                        <div className="col-span-2"><label className={labelCls}>Hourly Rate ({profile.currency}) *</label>
                          <input type="number" min="0" value={profile.hourly_rate} onChange={e => setP('hourly_rate', e.target.value)} placeholder={`${currSymbol}0.00`} className={inputCls} /></div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Schedule <span className="font-normal normal-case text-gray-300">(optional)</span></p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Shift Start</label>
                      <input type="time" value={profile.shift_start} onChange={e => setP('shift_start', e.target.value)} className={inputCls} /></div>
                    <div><label className={labelCls}>Shift End</label>
                      <input type="time" value={profile.shift_end} onChange={e => setP('shift_end', e.target.value)} className={inputCls} /></div>
                  </div>
                  <div>
                    <label className={labelCls}>Work Days</label>
                    <div className="flex gap-2 flex-wrap">
                      {DAYS_SHORT.map(d => (
                        <button key={d} type="button" onClick={() => toggleDay(d)}
                          className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${profile.work_days.includes(d) ? 'bg-[#111827] text-white border-[#111827]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: Contract ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contract Details</p>
                <button onClick={openPreview} className="flex items-center gap-1.5 text-xs text-[#FF6B35] hover:underline cursor-pointer">
                  <i className="ri-eye-line"></i> Preview
                </button>
              </div>

              {/* Template */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Role Template <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select onChange={e => applyTemplate(e.target.value)} defaultValue="" className={`${inputCls} bg-white`}>
                    <option value="">— Choose template —</option>
                    {Object.keys(ROLE_TEMPLATES).map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Effective Date *</label>
                  <input type="date" value={cf.effectiveDate} onChange={e => setC('effectiveDate', e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Role / Job Title *</label>
                <input value={cf.role} onChange={e => setC('role', e.target.value)} placeholder="e.g. Junior Graphic Designer" className={inputCls} />
              </div>

              {/* Responsibilities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + ' mb-0'}>Key Responsibilities *</label>
                  <button onClick={() => addItem('responsibilities')} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {cf.responsibilities.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={r} onChange={e => setListItem('responsibilities', i, e.target.value)} placeholder={`Responsibility ${i + 1}`} className={inputCls} />
                      {cf.responsibilities.length > 1 && (
                        <button onClick={() => removeItem('responsibilities', i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional responsibilities */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + ' mb-0'}>Additional Responsibilities <span className="text-gray-400 font-normal">(optional)</span></label>
                  <button onClick={() => addItem('additionalResponsibilities')} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">+ Add</button>
                </div>
                {cf.additionalResponsibilities.length > 0 && (
                  <div className="space-y-2">
                    {cf.additionalResponsibilities.map((r, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={r} onChange={e => setListItem('additionalResponsibilities', i, e.target.value)} placeholder={`Additional ${i + 1}`} className={inputCls} />
                        <button onClick={() => removeItem('additionalResponsibilities', i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tools */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + ' mb-0'}>Tools & Software</label>
                  <button onClick={() => addItem('tools')} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {cf.tools.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={t} onChange={e => setListItem('tools', i, e.target.value)} placeholder={`Tool ${i + 1}`} className={inputCls} />
                      {cf.tools.length > 1 && (
                        <button onClick={() => removeItem('tools', i)} className="text-gray-300 hover:text-red-400 cursor-pointer flex-shrink-0">
                          <i className="ri-delete-bin-line text-sm"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment schedule + leave */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Payment Schedule</label>
                  <select value={cf.paymentSchedule} onChange={e => setC('paymentSchedule', e.target.value)} className={`${inputCls} bg-white`}>
                    <option value="bi-monthly basis, on the 15th and the last working day of each month">Semi-monthly (15th & last)</option>
                    <option value="bi-weekly basis">Bi-weekly</option>
                    <option value="weekly basis">Weekly</option>
                    <option value="monthly basis, on the last working day of each month">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Shift Time</label>
                  <input value={cf.shiftTime} onChange={e => setC('shiftTime', e.target.value)} placeholder="e.g. 9:00 AM to 6:00 PM PHT" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Hours / Day</label>
                  <input type="number" value={cf.hoursPerDay} onChange={e => setC('hoursPerDay', e.target.value)} min="1" max="24" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>PTA Days / Year</label>
                  <input type="number" value={cf.ptaDays} onChange={e => setC('ptaDays', e.target.value)} min="0" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Sick Days / Year</label>
                  <input type="number" value={cf.sickDays} onChange={e => setC('sickDays', e.target.value)} min="0" className={inputCls} />
                </div>
              </div>

              {/* Work days */}
              <div>
                <label className={labelCls}>Work Days</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(DAYS_FULL).map(d => (
                    <button key={d} type="button"
                      onClick={() => setC('workDays', cf.workDays.includes(DAYS_FULL[d]) ? cf.workDays.filter(x => x !== DAYS_FULL[d]) : [...cf.workDays, DAYS_FULL[d]])}
                      className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${cf.workDays.includes(DAYS_FULL[d]) ? 'bg-[#111827] text-white border-[#111827]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Commission */}
              <div className="border border-gray-100 rounded-xl p-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={cf.hasCommission} onChange={e => setC('hasCommission', e.target.checked)} className="accent-[#FF6B35]" />
                  <span className="text-sm font-medium text-gray-700">Performance-Based Commission</span>
                </label>
                {cf.hasCommission && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div><label className={labelCls}>Client Name</label>
                      <input value={cf.commissionClient} onChange={e => setC('commissionClient', e.target.value)} placeholder="e.g. Client ABC" className={inputCls} /></div>
                    <div><label className={labelCls}>Commission %</label>
                      <input type="number" value={cf.commissionPercent} onChange={e => setC('commissionPercent', e.target.value)} min="0" max="100" step="0.5" className={inputCls} /></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── STEP 3: Review & Send ─── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Employee</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-[#FF6B35]">{profile.full_name[0]?.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{profile.full_name}</p>
                    <p className="text-xs text-gray-400">{profile.email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contract</p>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Independent Contractor Agreement</p>
                    <p className="text-xs text-gray-500 mt-0.5">{cf.role} · Effective {new Date(cf.effectiveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <button onClick={openPreview} className="flex items-center gap-1.5 text-xs text-[#FF6B35] hover:underline cursor-pointer whitespace-nowrap flex-shrink-0">
                    <i className="ri-eye-line"></i> Preview
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <i className="ri-mail-send-line text-amber-600 text-base flex-shrink-0 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-amber-800">What happens when you click Send</p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
                      <li>The contract is saved and assigned to {profile.full_name}</li>
                      <li>An invite email is sent to <strong>{profile.email}</strong></li>
                      <li>They'll log in, sign the contract, then complete onboarding</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mt-4">
              <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={step === 1 ? onClose : () => setStep(s => (s - 1) as 1 | 2 | 3)}
            className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer">
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          {step === 1 && (
            <button onClick={saveProfile} disabled={saving || !profile.full_name.trim() || !profile.email.trim()}
              className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Saving…</> : 'Next: Contract →'}
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} disabled={!contractReady}
              className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer">
              Next: Review →
            </button>
          )}
          {step === 3 && (
            <button onClick={sendAll} disabled={saving}
              className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2">
              {saving ? <><i className="ri-loader-4-line animate-spin text-sm"></i> Sending…</> : <><i className="ri-mail-send-line text-sm"></i> Send Invite & Contract</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
