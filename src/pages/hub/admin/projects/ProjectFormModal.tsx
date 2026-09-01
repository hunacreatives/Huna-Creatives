import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { STAGES } from '@/lib/projectStage';

const SERVICES = ['Website Design', 'Website Maintenance', 'E-vite / Event Website', 'Branding & Identity', 'Graphic Design', 'Social Media Management', 'Content Creation', 'SEO', 'Digital Ads', 'Email Marketing', 'Marketing', 'Sentro Hub License', 'Other'];

export interface ProjectFormState {
  project_type: 'client' | 'internal' | 'retainer';
  client_name: string;
  project_name: string;
  service: string;
  contract_price: string;
  monthly_rate: string;
  monthly_rate_currency: 'PHP' | 'USD';
  monthly_deliverables: string;
  status: string;
  stage: string;
  start_date: string;
  deadline: string;
  notes: string;
  contact_email: string;
  drive_url: string;
}

export interface ImportedTask { title: string; description: string | null; priority: 'low' | 'medium' | 'high'; start_date: string | null; due_date: string | null; }

// Create/edit project modal, including "Import from file" AI parsing.
// Form state stays in the page (saveProject reads it); this owns only the UI.
export default function ProjectFormModal({ isEditing, form, setForm, formError, setFormError, formSaving, importedTasks, setImportedTasks, usdRate, onSave, onClose, onCancel }: {
  isEditing: boolean;
  form: ProjectFormState;
  setForm: React.Dispatch<React.SetStateAction<ProjectFormState>>;
  formError: string;
  setFormError: (msg: string) => void;
  formSaving: boolean;
  importedTasks: ImportedTask[];
  setImportedTasks: React.Dispatch<React.SetStateAction<ImportedTask[]>>;
  usdRate: number;
  onSave: () => void;
  onClose: () => void;
  onCancel: () => void;
}) {
  const [importing, setImporting] = useState(false);

  return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-2xl w-full sm:max-w-md max-h-[82vh] lg:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-[#111827]">{isEditing ? 'Edit Project' : 'New Project'}</h2>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <>
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors ${importing ? 'opacity-60 pointer-events-none' : ''}`}>
                      <i className={`${importing ? 'ri-loader-4-line animate-spin' : 'ri-sparkling-2-line'} text-sm text-indigo-500`}></i>
                      {importing ? 'Reading…' : 'Import from file'}
                      <input type="file" className="hidden" accept=".pdf,.csv,.txt,.png,.jpg,.jpeg"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setImporting(true);
                          try {
                            const buffer = await file.arrayBuffer();
                            const bytes = new Uint8Array(buffer);
                            let binary = '';
                            bytes.forEach(b => binary += String.fromCharCode(b));
                            const file_base64 = btoa(binary);
                            const { data, error } = await supabase.functions.invoke('parse-project-doc', {
                              body: { file_base64, mime_type: file.type, file_name: file.name },
                            });
                            if (error || !data) throw new Error(error?.message ?? 'No data returned');
                            setForm(f => ({
                              ...f,
                              project_name: data.project_name ?? f.project_name,
                              client_name: data.client_name ?? f.client_name,
                              project_type: data.project_type ?? f.project_type,
                              service: data.service ?? f.service,
                              contract_price: data.contract_price != null ? String(data.contract_price) : f.contract_price,
                              monthly_rate: data.monthly_rate != null ? String(data.monthly_rate) : (f as any).monthly_rate,
                              start_date: data.start_date ?? f.start_date,
                              deadline: data.deadline ?? f.deadline,
                              notes: data.notes ?? f.notes,
                            } as any));
                            if (data.tasks?.length) setImportedTasks(data.tasks);
                          } catch (err) {
                            setFormError(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                          } finally {
                            setImporting(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </>
                )}
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center"><i className="ri-close-line text-lg"></i></button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Project Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'client',   label: 'One-time',   sub: 'Fixed contract billing' },
                    { value: 'retainer', label: 'Retainer', sub: 'Monthly recurring' },
                    { value: 'internal', label: 'Internal', sub: 'Tasks & team only' },
                  ].map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, project_type: option.value as 'client' | 'internal' | 'retainer', client_name: option.value === 'internal' && !form.client_name ? 'Internal' : form.client_name, contract_price: option.value === 'internal' ? '' : form.contract_price, monthly_rate: option.value !== 'retainer' ? '' : (form as any).monthly_rate, contact_email: option.value === 'internal' ? '' : form.contact_email } as any)}
                      className={`rounded-xl border px-2 py-3 text-left transition-colors cursor-pointer ${form.project_type === option.value ? 'border-[#111827] bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <p className="text-sm font-medium text-gray-800">{option.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{option.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-700">{form.project_type === 'internal' ? 'Owner / Label' : 'Client Name'}{form.project_type !== 'internal' ? ' *' : ''}</label>
                  <input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder={form.project_type === 'internal' ? 'e.g. Internal, Marketing, Ops' : 'e.g. Blue Collar Nutrition'}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-700">Project Name *</label>
                  <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="e.g. bluecollarmealplan.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-700">Service</label>
                  <select value={SERVICES.includes(form.service) ? form.service : 'Other'}
                    onChange={e => setForm({ ...form, service: e.target.value === 'Other' ? '' : e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {!SERVICES.slice(0, -1).includes(form.service) && (
                    <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}
                      placeholder="Describe the service..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] mt-1.5" />
                  )}
                </div>
                {form.project_type === 'client' && (
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-gray-700">Contract Price (PHP) *</label>
                    <input type="number" value={form.contract_price} onChange={e => setForm({ ...form, contract_price: e.target.value })} placeholder="0.00"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                )}
              </div>
              {form.project_type === 'retainer' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-medium text-gray-700">Setup Fee (PHP) <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input type="number" value={form.contract_price} onChange={e => setForm({ ...form, contract_price: e.target.value })} placeholder="0.00"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <label className="text-xs font-medium text-gray-700">Monthly Rate *</label>
                      <div className="flex gap-0">
                        <select value={(form as any).monthly_rate_currency} onChange={e => setForm({ ...form, monthly_rate_currency: e.target.value } as any)}
                          className="shrink-0 px-2 py-2 text-sm border border-gray-200 rounded-l-lg focus:outline-none bg-gray-50 border-r-0 text-gray-600">
                          <option value="PHP">₱</option>
                          <option value="USD">$</option>
                        </select>
                        <input type="number" value={(form as any).monthly_rate} onChange={e => setForm({ ...form, monthly_rate: e.target.value } as any)} placeholder="0.00"
                          className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                      </div>
                      {(form as any).monthly_rate_currency === 'USD' && (form as any).monthly_rate && (
                        <p className="text-[11px] text-gray-400">≈ ₱{((parseFloat((form as any).monthly_rate) || 0) * usdRate).toLocaleString()}/mo (₱{usdRate}/USD)</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-gray-700">Deliverables per month <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="number" min="1" value={(form as any).monthly_deliverables} onChange={e => setForm({ ...form, monthly_deliverables: e.target.value } as any)} placeholder="e.g. 8"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                    <p className="text-[10px] text-gray-400">Tracks tasks completed each month against this target.</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-700">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-700">Stage</label>
                  <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-700">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                </div>
                {form.project_type !== 'retainer' && (
                  <div className="space-y-1 min-w-0">
                    <label className="text-xs font-medium text-gray-700">Deadline</label>
                    <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Any notes..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <svg viewBox="0 0 87.3 78" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg"><path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/><path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>
                  Google Drive URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input type="url" value={(form as any).drive_url ?? ''} onChange={e => setForm({ ...form, drive_url: e.target.value } as any)} placeholder="https://drive.google.com/drive/u/0/folders/..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400" />
              </div>
              {(form.project_type === 'client' || form.project_type === 'retainer') && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Client Contact Email <span className="text-gray-400 font-normal">(for invoices)</span></label>
                  <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="client@email.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
              )}
              {importedTasks.length > 0 && (
                <div className="mt-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs font-semibold text-indigo-700 mb-1.5"><i className="ri-sparkling-2-line mr-1"></i>{importedTasks.length} task{importedTasks.length !== 1 ? 's' : ''} will be added</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {importedTasks.map((t, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-indigo-800 truncate">{t.title}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.priority === 'high' ? 'bg-rose-100 text-rose-600' : t.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>{t.priority}</span>
                          <button onClick={() => setImportedTasks(prev => prev.filter((_, j) => j !== i))} className="text-indigo-400 hover:text-indigo-600 cursor-pointer"><i className="ri-close-line text-xs"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formError && <p className="text-xs text-red-500">{formError}</p>}
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <button onClick={onCancel} className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer">Cancel</button>
              <button onClick={onSave} disabled={formSaving}
                className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] disabled:opacity-40 cursor-pointer">
                {formSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
  );
}
