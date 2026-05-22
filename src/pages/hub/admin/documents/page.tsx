import { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubSignDocument, HubSignAssignment, HubUser } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import ContractGeneratorModal from './ContractGeneratorModal';

export default function AdminDocumentsPage() {
  const { hubUser } = useAuth();
  const [docs, setDocs] = useState<HubSignDocument[]>([]);
  const [contractors, setContractors] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<HubSignDocument | null>(null);
  const [assignments, setAssignments] = useState<HubSignAssignment[]>([]);
  const [toast, setToast] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Signing for admins who also have documents assigned to them
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [signModal, setSignModal] = useState<any | null>(null);
  const [signName, setSignName] = useState('');
  const [signing, setSigning] = useState(false);

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    fetchDocs();
    fetchContractors();
    if (hubUser?.id) fetchMyAssignments();
  }, [hubUser]);

  const fetchMyAssignments = async () => {
    const { data } = await supabase
      .from('hub_sign_assignments')
      .select('*, hub_sign_documents(id, title, description, content, file_url, is_generated, created_at)')
      .eq('contractor_id', hubUser!.id)
      .neq('status', 'signed')
      .order('created_at', { ascending: false });
    setMyAssignments(data ?? []);
  };

  const submitSign = async () => {
    if (!signModal || !signName.trim()) return;
    setSigning(true);
    const signedAt = new Date().toISOString();
    await supabase
      .from('hub_sign_assignments')
      .update({ status: 'signed', signed_name: signName.trim(), signed_at: signedAt })
      .eq('id', signModal.id);
    supabase.functions.invoke('send-signed-contract', { body: { assignment_id: signModal.id } }).catch(() => {});
    setSigning(false);
    setSignModal(null);
    setSignName('');
    fetchMyAssignments();
    fetchDocs();
    showToast('Document signed! A copy has been sent to your email.');
  };

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hub_sign_documents')
      .select('*, hub_sign_assignments(id, contractor_id, status, signed_at, signed_name, hub_users(full_name, avatar_url))')
      .order('created_at', { ascending: false });
    setDocs((data as HubSignDocument[]) ?? []);
    setLoading(false);
  };

  const fetchContractors = async () => {
    const { data } = await supabase
      .from('hub_users')
      .select('id, full_name, avatar_url, role, status')
      .in('role', ['contractor', 'admin'])
      .eq('status', 'active')
      .order('full_name');
    setContractors((data as HubUser[]) ?? []);
  };

  const handleUpload = async () => {
    if (!title.trim() || !file || selectedContractors.length === 0) {
      showToast('Fill in title, upload a file, and select at least one contractor.');
      return;
    }
    setUploading(true);

    const ext = file.name.split('.').pop();
    const path = `contracts/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: false });
    if (upErr) {
      showToast('Upload failed: ' + upErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

    const { data: doc, error: docErr } = await supabase
      .from('hub_sign_documents')
      .insert({ title: title.trim(), description: description.trim() || null, file_url: publicUrl, file_name: file.name, uploaded_by: hubUser!.id })
      .select('id')
      .single();

    if (docErr || !doc) {
      showToast('Failed to save document.');
      setUploading(false);
      return;
    }

    const rows = selectedContractors.map(cid => ({ document_id: doc.id, contractor_id: cid }));
    await supabase.from('hub_sign_assignments').insert(rows);

    setUploading(false);
    setShowUpload(false);
    resetForm();
    fetchDocs();
    showToast('Document sent for signatures!');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFile(null);
    setSelectedContractors([]);
  };

  const openDetail = async (doc: HubSignDocument) => {
    setSelectedDoc(doc);
    const { data } = await supabase
      .from('hub_sign_assignments')
      .select('*, hub_users(full_name, avatar_url)')
      .eq('document_id', doc.id)
      .order('created_at');
    setAssignments((data as HubSignAssignment[]) ?? []);
  };

  const toggleContractor = (id: string) => {
    setSelectedContractors(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedContractors(contractors.map(c => c.id));
  const clearAll = () => setSelectedContractors([]);

  const signedCount = (doc: HubSignDocument) =>
    doc.hub_sign_assignments?.filter(a => a.status === 'signed').length ?? 0;
  const totalCount = (doc: HubSignDocument) =>
    doc.hub_sign_assignments?.length ?? 0;

  return (
    <AdminLayout title="Documents & Contracts">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-gray-500">Send contracts and documents to contractors for signature.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <i className="ri-upload-2-line"></i>
              Upload PDF
            </button>
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 bg-[#FF6B35] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a24] transition-colors cursor-pointer"
            >
              <i className="ri-file-text-line"></i>
              Generate Contract
            </button>
          </div>
        </div>

        {/* Documents assigned to this admin for signing */}
        {myAssignments.length > 0 && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <i className="ri-pen-nib-line text-violet-500"></i>
              <p className="text-sm font-semibold text-violet-800">You have {myAssignments.length} document{myAssignments.length > 1 ? 's' : ''} to sign</p>
            </div>
            {myAssignments.map((a: any) => {
              const doc = a.hub_sign_documents;
              return (
                <div key={a.id} className="bg-white rounded-lg border border-violet-100 p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <i className="ri-file-text-line text-violet-500 text-sm"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{doc?.title}</p>
                    {doc?.description && <p className="text-xs text-gray-400">{doc.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc?.content && (
                      <button
                        onClick={() => { const b = new Blob([doc.content], { type: 'text/html' }); window.open(URL.createObjectURL(b), '_blank'); }}
                        className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        <i className="ri-external-link-line mr-1"></i>Preview
                      </button>
                    )}
                    <button
                      onClick={() => { setSignModal(a); setSignName(hubUser?.full_name ?? ''); }}
                      className="text-xs font-medium bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 cursor-pointer"
                    >
                      <i className="ri-pen-nib-line mr-1"></i>Sign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : docs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-14 text-center">
            <i className="ri-file-text-line text-4xl text-gray-200 block mb-3"></i>
            <p className="text-gray-400 text-sm">No documents sent yet.</p>
            <p className="text-gray-300 text-xs mt-1">Upload a contract to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {docs.map(doc => {
              const signed = signedCount(doc);
              const total = totalCount(doc);
              const allSigned = total > 0 && signed === total;
              return (
                <div
                  key={doc.id}
                  onClick={() => openDetail(doc)}
                  className="bg-white rounded-xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="ri-file-text-line text-[#FF6B35] text-lg"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                          {doc.description && <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${allSigned ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {allSigned ? 'All signed' : `${signed}/${total} signed`}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${allSigned ? 'bg-emerald-500' : 'bg-[#FF6B35]'}`}
                            style={{ width: total > 0 ? `${(signed / total) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(doc.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {doc.hub_sign_assignments?.slice(0, 6).map(a => (
                          <div
                            key={a.id}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${a.status === 'signed' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-gray-200 border-white text-gray-500'}`}
                            title={(a as any).hub_users?.full_name}
                          >
                            {(a as any).hub_users?.full_name?.[0] ?? '?'}
                          </div>
                        ))}
                        {(doc.hub_sign_assignments?.length ?? 0) > 6 && (
                          <span className="text-xs text-gray-400 ml-1">+{(doc.hub_sign_assignments?.length ?? 0) - 6}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-semibold text-gray-900">Upload Document</h2>
              <button onClick={() => { setShowUpload(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Document Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Independent Contractor Agreement 2025"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Brief note about this document..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File (PDF or image) *</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-[#FF6B35]/40 transition-colors">
                  <i className="ri-upload-2-line text-gray-400 text-lg"></i>
                  <span className="text-sm text-gray-500">{file ? file.name : 'Click to select file…'}</span>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Send to *</label>
                  <div className="flex gap-3">
                    <button onClick={selectAll} className="text-xs text-[#FF6B35] cursor-pointer hover:underline">Select all</button>
                    <button onClick={clearAll} className="text-xs text-gray-400 cursor-pointer hover:underline">Clear</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto">
                  {contractors.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedContractors.includes(c.id)}
                        onChange={() => toggleContractor(c.id)}
                        className="accent-[#FF6B35]"
                      />
                      <img src={c.avatar_url || ''} alt="" className="w-6 h-6 rounded-full object-cover object-top bg-gray-100" />
                      <span className="text-sm text-gray-700">{c.full_name}</span>
                    </label>
                  ))}
                </div>
                {selectedContractors.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{selectedContractors.length} selected</p>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={() => { setShowUpload(false); resetForm(); }} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading} className="flex-1 bg-[#FF6B35] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e55a24] cursor-pointer disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Send for Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900 truncate">{selectedDoc.title}</h2>
                {selectedDoc.description && <p className="text-xs text-gray-400 mt-0.5">{selectedDoc.description}</p>}
              </div>
              <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer ml-4 flex-shrink-0">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <a
                href={selectedDoc.is_generated && selectedDoc.content
                  ? URL.createObjectURL(new Blob([selectedDoc.content], { type: 'text/html' }))
                  : selectedDoc.file_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 bg-[#FF6B35]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="ri-file-text-line text-[#FF6B35]"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{selectedDoc.file_name || selectedDoc.title}</p>
                  <p className="text-xs text-gray-400">{selectedDoc.is_generated ? 'Generated contract — click to open' : 'Click to open'}</p>
                </div>
                <i className="ri-external-link-line text-gray-400"></i>
              </a>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Signature Status</p>
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id} className="flex items-center gap-3">
                      <img src={(a as any).hub_users?.avatar_url || ''} alt="" className="w-7 h-7 rounded-full object-cover object-top bg-gray-100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{(a as any).hub_users?.full_name}</p>
                        {a.status === 'signed' && a.signed_at && (
                          <p className="text-xs text-gray-400">
                            Signed as "{a.signed_name}" · {new Date(a.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${a.status === 'signed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {a.status === 'signed' ? (
                          <><i className="ri-checkbox-circle-line mr-1"></i>Signed</>
                        ) : (
                          <><i className="ri-time-line mr-1"></i>Pending</>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showGenerator && (
        <ContractGeneratorModal
          contractors={contractors}
          onClose={() => setShowGenerator(false)}
          onDone={() => { setShowGenerator(false); fetchDocs(); showToast('Contract sent for signature!'); }}
        />
      )}

      {/* Sign modal for admins with pending assignments */}
      {signModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Sign Document</h2>
              <p className="text-sm text-gray-500 mt-0.5">{(signModal as any).hub_sign_documents?.title}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
              By typing your full name below, you are applying your electronic signature to this document.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full name (as signature)</label>
              <input
                type="text"
                value={signName}
                onChange={e => setSignName(e.target.value)}
                placeholder="Type your full name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setSignModal(null)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={submitSign}
                disabled={signing || !signName.trim()}
                className="flex-1 bg-violet-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-violet-700 cursor-pointer disabled:opacity-40"
              >
                {signing ? 'Signing…' : 'Confirm Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
