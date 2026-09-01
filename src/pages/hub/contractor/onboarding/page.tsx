import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { HubSignAssignment } from '@/lib/types';

const STEPS = ['Welcome', 'Contract', 'Personal Info', 'Emergency Contact', 'Bank Details', 'Done'];

export default function ContractorOnboardingPage() {
  const { hubUser, refreshHubUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Contract step
  const [assignments, setAssignments] = useState<HubSignAssignment[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [signModal, setSignModal] = useState<HubSignAssignment | null>(null);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);

  // Step 2: Personal info
  const [phone, setPhone] = useState(hubUser?.phone || '');
  const [birthday, setBirthday] = useState((hubUser as any)?.birthday || '');
  const [address, setAddress] = useState(hubUser?.address || '');

  // Step 3: Emergency contact
  const [emergencyName, setEmergencyName] = useState(hubUser?.emergency_contact_name || '');
  const [emergencyRel, setEmergencyRel] = useState(hubUser?.emergency_contact_relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(hubUser?.emergency_contact_phone || '');

  // Step 4: Bank details
  const [bankName, setBankName] = useState((hubUser as any)?.bank_name || '');
  const [bankAccountName, setBankAccountName] = useState((hubUser as any)?.bank_account_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState((hubUser as any)?.bank_account_number || '');

  useEffect(() => {
    if (hubUser?.id) fetchAssignments();
  }, [hubUser?.id]);

  const fetchAssignments = async () => {
    setLoadingContracts(true);
    const { data } = await supabase
      .from('hub_sign_assignments')
      .select('*, hub_sign_documents(id, title, description, file_url, file_name, content, is_generated, created_at)')
      .eq('contractor_id', hubUser!.id)
      .order('created_at', { ascending: true });
    setAssignments((data as HubSignAssignment[]) ?? []);
    setLoadingContracts(false);
  };

  const pendingContracts = assignments.filter(a => a.status === 'pending');
  const signedContracts = assignments.filter(a => a.status === 'signed');

  const buildSignedHtml = (content: string, signedName: string, signedAt: string): string => {
    const dateLabel = new Date(signedAt).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    const dom = new DOMParser().parseFromString(content, 'text/html');
    const link = dom.createElement('link');
    link.setAttribute('href', 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
    link.setAttribute('rel', 'stylesheet');
    dom.head.appendChild(link);
    const signatureLabel = dom.querySelector('p.sig-label[style*="margin-top"]');
    if (signatureLabel) {
      const blankDiv = signatureLabel.previousElementSibling as HTMLElement;
      if (blankDiv) {
        blankDiv.style.borderBottom = 'none';
        blankDiv.style.display = 'flex';
        blankDiv.style.alignItems = 'flex-end';
        blankDiv.style.paddingBottom = '4pt';
        blankDiv.innerHTML = `<p style="font-family:'Dancing Script',cursive;font-size:26pt;color:#111;margin:0;line-height:1;">${signedName}</p>`;
      }
      signatureLabel.remove();
    }
    dom.querySelectorAll('p.sig-label:not([style])').forEach(p => {
      if (p.innerHTML.trim().endsWith('Date')) {
        p.innerHTML = `${signedName} &nbsp;|&nbsp; ${dateLabel}`;
      }
    });
    return dom.documentElement.outerHTML;
  };

  const openDoc = (doc: any, assignment?: HubSignAssignment) => {
    if (doc?.is_generated && doc?.content) {
      let content = doc.content;
      if (assignment?.status === 'signed' && assignment.signed_name && assignment.signed_at) {
        content = buildSignedHtml(content, assignment.signed_name, assignment.signed_at);
      }
      const blob = new Blob([content], { type: 'text/html' });
      window.open(URL.createObjectURL(blob), '_blank');
    } else if (doc?.file_url) {
      window.open(doc.file_url, '_blank');
    }
  };

  const submitSign = async () => {
    if (!signModal || !signName.trim()) return;
    setSigning(true);
    const signedAt = new Date().toISOString();
    await supabase
      .from('hub_sign_assignments')
      .update({ status: 'signed', signed_name: signName.trim(), signed_at: signedAt })
      .eq('id', signModal.id);

    supabase.functions.invoke('send-signed-contract', {
      body: { assignment_id: signModal.id },
    }).catch(console.error);

    supabase.functions.invoke('notify-internal-request', {
      body: { type: 'contract_signed', contractor_name: hubUser!.full_name, detail: (signModal as any).hub_sign_documents?.title ?? 'Contract', notes: null },
    }).catch(console.error);

    setSigning(false);
    setSignModal(null);
    setSignName('');
    fetchAssignments();
  };

  const saveStep = async () => {
    if (!hubUser) return;
    setSaving(true);

    if (step === 2) {
      await supabase.from('hub_users').update({ phone, birthday: birthday || null, address }).eq('id', hubUser.id);
    } else if (step === 3) {
      await supabase.from('hub_users').update({
        emergency_contact_name: emergencyName,
        emergency_contact_relationship: emergencyRel,
        emergency_contact_phone: emergencyPhone,
      }).eq('id', hubUser.id);
    } else if (step === 4) {
      await supabase.from('hub_users').update({
        bank_name: bankName,
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
      }).eq('id', hubUser.id);
    }

    setSaving(false);
    setStep(s => s + 1);
  };

  const finish = async () => {
    if (!hubUser) return;
    setSaving(true);
    await supabase.from('hub_users').update({ onboarding_completed: true }).eq('id', hubUser.id);
    await refreshHubUser();
    setSaving(false);
    navigate('/hub/contractor/dashboard', { replace: true });
  };

  const firstName = hubUser?.full_name?.split(' ')[0] || 'there';

  // Progress bar covers steps 1–4 (excludes Welcome and Done)
  const progressSteps = STEPS.slice(1, -1); // ['Contract', 'Personal Info', 'Emergency Contact', 'Bank Details']
  const progressIndex = step - 1; // 0-based within progress steps

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">

        {/* Logo */}
        <div className="flex items-center justify-center">
          <img src="/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-9 w-auto" />
        </div>

        {/* Progress — only visible during steps 1–4 */}
        {step >= 1 && step <= 4 && (
          <div className="flex items-center gap-1.5">
            {progressSteps.map((_, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${i < progressIndex ? 'bg-[#FF6B35]' : i === progressIndex ? 'bg-[#FF6B35]/40' : 'bg-gray-200'}`} />
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 bg-[#FF6B35]/10 rounded-2xl flex items-center justify-center mx-auto">
                <i className="ri-hand-heart-line text-3xl text-[#FF6B35]"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#111827]">Welcome to the Huna Hub, {firstName}!</h1>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Let's get your profile set up. This takes about 2 minutes. You can update any of these details later from your profile.
                </p>
              </div>
              <div className="space-y-2 text-left bg-gray-50 rounded-xl p-4">
                {[
                  'Sign your contractor agreement',
                  'Personal info — phone, birthday, address',
                  'Emergency contact',
                  'Bank details for payroll',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-5 h-5 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-bold">{i + 1}</span>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(1)}
                className="w-full py-3 bg-[#FF6B35] text-white rounded-xl font-medium hover:bg-[#e55a27] transition-colors cursor-pointer">
                Let's go →
              </button>
            </div>
          )}

          {/* Step 1: Contract */}
          {step === 1 && (
            <div>
              <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step 1 of 4</p>
                <h2 className="text-lg font-bold text-[#111827] mt-1">Employee Agreement</h2>
                <p className="text-xs text-gray-400 mt-1">Review and sign your documents before continuing.</p>
              </div>

              <div className="p-6">
                {loadingContracts ? (
                  <div className="py-10 text-center text-gray-400 text-sm">
                    <i className="ri-loader-4-line animate-spin text-2xl block mb-2"></i>
                    Loading documents…
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <i className="ri-file-text-line text-4xl text-gray-200 block"></i>
                    <p className="text-sm text-gray-400">No documents assigned yet.</p>
                    <p className="text-xs text-gray-300">HR will send your contract here. You can continue for now.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Needs signature */}
                    {pendingContracts.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Needs Your Signature</p>
                        {pendingContracts.map(a => {
                          const doc = (a as any).hub_sign_documents;
                          return (
                            <div key={a.id} className="border border-[#FF6B35]/20 rounded-xl p-4 bg-[#FF6B35]/5">
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0">
                                  <i className="ri-file-text-line text-[#FF6B35]"></i>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">{doc?.title}</p>
                                  {doc?.description && <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>}
                                  <div className="flex items-center gap-3 mt-3">
                                    <button onClick={() => openDoc(doc)}
                                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">
                                      <i className="ri-eye-line"></i> View
                                    </button>
                                    <button onClick={() => { setSignModal(a); setSignName(hubUser?.full_name ?? ''); }}
                                      className="flex items-center gap-1.5 text-sm bg-[#FF6B35] text-white px-4 py-1.5 rounded-lg hover:bg-[#e55a27] cursor-pointer font-medium">
                                      <i className="ri-pen-nib-line"></i> Sign
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Already signed */}
                    {signedContracts.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Signed</p>
                        <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
                          {signedContracts.map(a => {
                            const doc = (a as any).hub_sign_documents;
                            return (
                              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                                <i className="ri-checkbox-circle-fill text-emerald-500 flex-shrink-0"></i>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-700 truncate">{doc?.title}</p>
                                  <p className="text-xs text-gray-400">
                                    Signed {a.signed_at ? new Date(a.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                  </p>
                                </div>
                                <button onClick={() => openDoc(doc, a)}
                                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1 flex-shrink-0">
                                  <i className="ri-eye-line"></i> View
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="px-6 pb-6">
                {pendingContracts.length > 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <i className="ri-error-warning-line text-amber-500 text-sm flex-shrink-0"></i>
                    <p className="text-xs text-amber-700">Please sign all documents above before continuing.</p>
                  </div>
                ) : (
                  <button onClick={() => setStep(2)}
                    className="w-full py-2.5 bg-[#111827] text-white rounded-xl font-medium hover:bg-gray-800 transition-colors cursor-pointer">
                    Continue →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Personal info */}
          {step === 2 && (
            <div>
              <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step 2 of 4</p>
                <h2 className="text-lg font-bold text-[#111827] mt-1">Personal Information</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+63 912 345 6789"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Birthday</label>
                  <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Home Address</label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2}
                    placeholder="Street, City, Province"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none" />
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-2">
                <button onClick={() => setStep(s => s + 1)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-3 py-2 whitespace-nowrap">
                  Skip for now
                </button>
                <button onClick={saveStep} disabled={saving}
                  className="flex-1 py-2.5 bg-[#111827] text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                  {saving ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Emergency contact */}
          {step === 3 && (
            <div>
              <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step 3 of 4</p>
                <h2 className="text-lg font-bold text-[#111827] mt-1">Emergency Contact</h2>
                <p className="text-xs text-gray-400 mt-1">Who should HR contact in case of emergency?</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Full Name</label>
                  <input type="text" value={emergencyName} onChange={e => setEmergencyName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Relationship</label>
                    <input type="text" value={emergencyRel} onChange={e => setEmergencyRel(e.target.value)}
                      placeholder="e.g. Mother"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">Phone Number</label>
                    <input type="tel" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)}
                      placeholder="+63 912 345 6789"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                  </div>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-2">
                <button onClick={() => setStep(s => s + 1)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-3 py-2 whitespace-nowrap">
                  Skip for now
                </button>
                <button onClick={saveStep} disabled={saving}
                  className="flex-1 py-2.5 bg-[#111827] text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                  {saving ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Bank details */}
          {step === 4 && (
            <div>
              <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step 4 of 4</p>
                <h2 className="text-lg font-bold text-[#111827] mt-1">Bank Details</h2>
                <p className="text-xs text-gray-400 mt-1">Used by HR to process your payroll payments.</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Bank Name</label>
                  <input type="text" value={bankName} onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. BDO, BPI, GCash, Maya"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Account Name</label>
                  <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)}
                    placeholder="Name as it appears on the account"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Account Number / GCash Number</label>
                  <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)}
                    placeholder="e.g. 0917 123 4567"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]" />
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <i className="ri-lock-line text-amber-500 text-sm mt-0.5 flex-shrink-0"></i>
                  <p className="text-xs text-amber-700">Your bank details are only visible to HR and the owner for payroll processing.</p>
                </div>
              </div>
              <div className="px-6 pb-6 flex gap-2">
                <button onClick={() => setStep(s => s + 1)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-3 py-2 whitespace-nowrap">
                  Skip for now
                </button>
                <button onClick={saveStep} disabled={saving}
                  className="flex-1 py-2.5 bg-[#111827] text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap">
                  {saving ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 5 && (
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                <i className="ri-checkbox-circle-fill text-3xl text-emerald-500"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#111827]">You're all set, {firstName}!</h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Your profile is set up. You can update your details anytime from the My Profile page.
                </p>
              </div>
              <button onClick={finish} disabled={saving}
                className="w-full py-3 bg-[#FF6B35] text-white rounded-xl font-medium hover:bg-[#e55a27] transition-colors cursor-pointer disabled:opacity-40">
                {saving ? 'Loading...' : 'Go to My Dashboard →'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Private portal — Huna Creatives team only
        </p>
      </div>

      {/* Sign Modal */}
      {signModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Sign Document</h2>
              <button onClick={() => setSignModal(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <i className="ri-file-text-line text-[#FF6B35]"></i>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{(signModal as any).hub_sign_documents?.title}</p>
                </div>
                <button onClick={() => openDoc((signModal as any).hub_sign_documents)} className="text-xs text-[#FF6B35] cursor-pointer whitespace-nowrap">
                  View <i className="ri-external-link-line"></i>
                </button>
              </div>
              <p className="text-sm text-gray-600">By typing your full name below, you confirm that you have read and agree to this document.</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full Name (as signature) *</label>
                <input
                  type="text"
                  value={signName}
                  onChange={e => setSignName(e.target.value)}
                  placeholder="Type your full name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                />
              </div>
              <div className="bg-amber-50 rounded-lg px-4 py-3 text-xs text-amber-700 flex gap-2">
                <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
                This constitutes your digital signature. Date and timestamp will be recorded automatically.
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSignModal(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button onClick={submitSign} disabled={signing || !signName.trim()} className="flex-1 bg-[#FF6B35] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e55a27] cursor-pointer disabled:opacity-50">
                  {signing ? 'Signing…' : 'Confirm Signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
