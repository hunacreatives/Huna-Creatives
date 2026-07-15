import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/contexts/DemoContext';

// Secrets (password, additional info) are column-revoked in Postgres and can
// only be read through the credentials-vault function — never selected here.
interface Credential {
  id: string;
  client_name: string | null;
  platform: string;
  account_email: string | null;
  login_type: string;
  otp_contact: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface RevealedSecret {
  password: string | null;
  additional_info: string | null;
}

interface CredentialRequest {
  id: string;
  credential_id: string;
  contractor_id: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  hub_users?: { full_name: string; avatar_url?: string };
  hub_credentials?: { platform: string; client_name: string | null };
}

interface Employee {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

const emptyForm = {
  client_name: '',
  platform: '',
  login_type: 'email_password',
  account_email: '',
  password: '',
  otp_contact: '',
  additional_info: '',
  status: 'active',
  notes: '',
};

const LOGIN_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  email_password: { label: 'Email + Password', color: 'bg-blue-100 text-blue-700' },
  otp: { label: 'OTP', color: 'bg-amber-100 text-amber-700' },
  sso: { label: 'SSO', color: 'bg-purple-100 text-purple-700' },
  api_key: { label: 'API Key', color: 'bg-gray-100 text-gray-600' },
};

const STATUS_DOT: Record<string, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-red-500',
  unverified: 'bg-gray-400',
};

// Rendered as the Credentials tab of the Access page (was its own page).
export default function CredentialsPanel() {
  const { hubUser } = useAuth();
  const { isDemo } = useDemo();

  if (isDemo) return (
    <>
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <i className="ri-lock-2-line text-3xl opacity-40"></i>
        <p className="text-sm font-medium">Not available in demo</p>
        <p className="text-xs text-gray-300">This section requires a live account.</p>
      </div>
    </>
  );
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [requests, setRequests] = useState<CredentialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingCred, setEditingCred] = useState<Credential | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const [showPassIds, setShowPassIds] = useState<Set<string>>(new Set());
  // Decrypted secrets, fetched on demand from the credentials-vault function
  const [revealedPass, setRevealedPass] = useState<Record<string, RevealedSecret>>({});
  const [revealLoading, setRevealLoading] = useState<Set<string>>(new Set());
  const [showFormPass, setShowFormPass] = useState(false);
  // Manage-access modal: grant/revoke credential access without a request
  const [manageCred, setManageCred] = useState<Credential | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // client_name -> employee ids auto-entitled via client assignment
  const [clientAssignments, setClientAssignments] = useState<Record<string, string[]>>({});
  const [grantBusy, setGrantBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastRef.current) clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(''), 6000);
  };

  // supabase-js hides the function's actual error body behind a generic
  // "non-2xx status code" message; the real reason is on error.context (a
  // Response) and must be read out explicitly.
  const describeInvokeError = async (data: any, error: any) => {
    if (data?.error) return data.error;
    if (error?.context && typeof error.context.json === 'function') {
      try {
        const body = await error.context.clone().json();
        if (body?.error) return body.error;
      } catch { /* not JSON */ }
    }
    return error?.message ?? 'unknown error';
  };

  const fetchData = async () => {
    setLoading(true);
    const [credsRes, reqsRes, empRes, clientsRes, projRes] = await Promise.all([
      supabase.from('hub_credentials')
        .select('id, client_name, platform, account_email, login_type, otp_contact, status, notes, created_by, created_at, updated_at')
        .order('client_name').order('platform'),
      supabase
        .from('hub_credential_requests')
        .select('*, hub_users!contractor_id(full_name, avatar_url), hub_credentials!credential_id(platform, client_name)')
        .order('created_at', { ascending: false }),
      // Admins/owners are always privileged in the vault; only employees show as grantable.
      supabase.from('hub_users').select('id, full_name, avatar_url').not('role', 'in', '("owner","admin")').order('full_name'),
      supabase.from('hub_clients').select('client_name').order('client_name'),
      // Current source of truth for "who works with this client": active
      // project team membership. hub_client_assignments and the legacy
      // hub_clients.assigned_contractor_id are both one-time snapshots that
      // nothing keeps in sync — removing someone from a project's team
      // never touches either, so they silently go stale.
      supabase.from('hub_projects')
        .select('client_name, status, archived_at, hub_project_contractors(contractor_id)')
        .is('archived_at', null)
        .neq('status', 'cancelled'),
    ]);
    // A failed load must never masquerade as an empty vault.
    setLoadError(credsRes.error?.message ?? reqsRes.error?.message ?? '');
    const creds = credsRes.data;
    const reqs = reqsRes.data;
    const credList = (creds as Credential[]) ?? [];
    setCredentials(credList);
    setRequests((reqs as CredentialRequest[]) ?? []);
    setEmployees((empRes.data as Employee[]) ?? []);
    // Client names are matched case-insensitively, same convention the rest
    // of the app uses to line up hub_clients rows with hub_projects rows.
    const assignMap: Record<string, Set<string>> = {};
    (projRes.data ?? []).forEach((p: any) => {
      const key = String(p.client_name ?? '').trim().toLowerCase();
      if (!key) return;
      const ids: string[] = (Array.isArray(p.hub_project_contractors) ? p.hub_project_contractors : []).map((pc: any) => pc.contractor_id);
      ids.forEach((id) => (assignMap[key] ??= new Set()).add(id));
    });
    setClientAssignments(Object.fromEntries(Object.entries(assignMap).map(([k, v]) => [k, Array.from(v)])));
    const clientNames = new Set<string>();
    (clientsRes.data ?? []).forEach((c: any) => clientNames.add(c.client_name));
    (projRes.data ?? []).forEach((p: any) => { if (p.client_name) clientNames.add(p.client_name); });
    setClientOptions(Array.from(clientNames).sort());
    // Default all clients expanded
    const clients = new Set(credList.map((c) => c.client_name?.trim() || 'Internal'));
    setExpandedClients(clients);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Legacy plaintext rows are lazily encrypted by the vault function on
  // decrypt; the client can no longer see secret columns to detect them.

  // Group credentials by client; client-less credentials group under Internal
  const groupName = (c: Credential) => c.client_name?.trim() || 'Internal';
  const filtered = credentials.filter((c) =>
    !search ||
    groupName(c).toLowerCase().includes(search.toLowerCase()) ||
    c.platform.toLowerCase().includes(search.toLowerCase()) ||
    (c.account_email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const groups = filtered.reduce<Record<string, Credential[]>>((acc, c) => {
    const key = groupName(c);
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const clientNames = Object.keys(groups).sort();

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const toggleClient = (name: string) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const togglePassVis = (id: string) => {
    const revealing = !showPassIds.has(id);
    setShowPassIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    if (revealing && !(id in revealedPass)) {
      setRevealLoading(prev => new Set(prev).add(id));
      supabase.functions.invoke('credentials-vault', { body: { action: 'decrypt', credential_id: id } })
        .then(async ({ data, error }) => {
          if (error || data?.error) {
            showToast(`Could not decrypt: ${await describeInvokeError(data, error)}`);
            setShowPassIds(prev => { const next = new Set(prev); next.delete(id); return next; });
          } else {
            setRevealedPass(prev => ({ ...prev, [id]: { password: data?.password ?? null, additional_info: data?.additional_info ?? null } }));
          }
        })
        .finally(() => setRevealLoading(prev => { const next = new Set(prev); next.delete(id); return next; }));
    }
  };

  const openNew = () => {
    setEditingCred(null);
    setForm(emptyForm);
    setShowFormPass(false);
    setShowAdd(true);
  };

  const openEdit = (c: Credential) => {
    setEditingCred(c);
    setForm({
      client_name: c.client_name ?? '',
      platform: c.platform,
      login_type: c.login_type,
      account_email: c.account_email ?? '',
      password: '', // blank = keep the current (encrypted) password
      otp_contact: c.otp_contact ?? '',
      additional_info: '', // blank = keep the current (encrypted) additional info
      status: c.status,
      notes: c.notes ?? '',
    });
    setShowFormPass(false);
    setShowAdd(true);
  };

  const save = async () => {
    if (!form.platform.trim()) return;
    setSaving(true);
    // Secrets are never stored in plaintext: encrypt via the vault function.
    const encryptField = async (plaintext: string) => {
      const { data: enc, error: encErr } = await supabase.functions.invoke('credentials-vault', {
        body: { action: 'encrypt', plaintext },
      });
      if (encErr || !enc?.ciphertext) {
        throw new Error(enc?.error ?? encErr?.message ?? 'encryption failed');
      }
      return enc.ciphertext as string;
    };

    let secretFields: Record<string, string | null> = {};
    try {
      if (form.password.trim()) {
        secretFields = { ...secretFields, password: null, password_enc: await encryptField(form.password.trim()) };
      } else if (!editingCred) {
        secretFields = { ...secretFields, password: null, password_enc: null };
      } // editing with a blank field: leave the stored password untouched
      if (form.additional_info.trim()) {
        secretFields = { ...secretFields, additional_info: null, additional_info_enc: await encryptField(form.additional_info.trim()) };
      } else if (!editingCred) {
        secretFields = { ...secretFields, additional_info: null, additional_info_enc: null };
      } // editing with a blank field: leave the stored additional info untouched
    } catch (err) {
      setSaving(false);
      showToast(`Could not encrypt — nothing saved. ${err instanceof Error ? err.message : ''}`);
      return;
    }

    const payload = {
      ...secretFields,
      client_name: form.client_name.trim() || null,
      platform: form.platform.trim(),
      login_type: form.login_type,
      account_email: form.account_email.trim() || null,
      otp_contact: form.otp_contact.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = editingCred
      ? await supabase.from('hub_credentials').update(payload).eq('id', editingCred.id)
      : await supabase.from('hub_credentials').insert({ ...payload, created_by: hubUser?.id });
    setSaving(false);
    if (error) {
      showToast(`Failed to save credential: ${error.message}`);
      return;
    }
    if (editingCred) setRevealedPass(prev => { const next = { ...prev }; delete next[editingCred.id]; return next; });
    setShowAdd(false);
    showToast(editingCred ? 'Credential updated.' : 'Credential added.');
    fetchData();
  };

  const deleteCred = async (id: string) => {
    if (!confirm('Delete this credential? This cannot be undone.')) return;
    await supabase.from('hub_credentials').delete().eq('id', id);
    showToast('Credential deleted.');
    fetchData();
  };

  const reviewRequest = async (id: string, status: 'approved' | 'denied') => {
    await supabase.from('hub_credential_requests').update({
      status,
      reviewed_by: hubUser?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);
    showToast(`Request ${status}.`);
    const req = requests.find(r => r.id === id);
    if (req) {
      supabase.functions.invoke('notify-credential-decision', {
        body: {
          contractor_id: (req as any).contractor_id,
          platform: (req as any).hub_credentials?.platform ?? 'credential',
          client_name: (req as any).hub_credentials?.client_name ?? '',
          decision: status,
        },
      }).catch(console.error);
    }
    fetchData();
  };

  // --- Manage access (proactive grants, no request needed) ---

  const autoAccessIdsFor = (c: Credential): Set<string> =>
    new Set(c.client_name ? clientAssignments[c.client_name.trim().toLowerCase()] ?? [] : []);

  const pendingRequestsFor = (credentialId: string) =>
    requests.filter((r) => r.credential_id === credentialId && r.status === 'pending');

  const approvedRequestFor = (credentialId: string, employeeId: string) =>
    requests.find((r) => r.credential_id === credentialId && r.contractor_id === employeeId && r.status === 'approved');

  // An explicit override that blocks a client-assigned employee's auto access
  // to this one credential, without touching the underlying client assignment.
  const revokedOverrideFor = (credentialId: string, employeeId: string) =>
    requests.find((r) => r.credential_id === credentialId && r.contractor_id === employeeId && r.status === 'revoked');

  // Everyone entitled to reveal this credential — auto (client-assigned,
  // minus any explicit revoke) or granted.
  const entitledEmployeesFor = (c: Credential): Employee[] => {
    const autoIds = autoAccessIdsFor(c);
    const grantedIds = new Set(
      requests.filter((r) => r.credential_id === c.id && r.status === 'approved').map((r) => r.contractor_id)
    );
    return employees.filter((e) =>
      (autoIds.has(e.id) && !revokedOverrideFor(c.id, e.id)) || grantedIds.has(e.id)
    );
  };

  const grantAccess = async (c: Credential, emp: Employee) => {
    setGrantBusy((prev) => new Set(prev).add(emp.id));
    // Approve a pending request if one exists, otherwise create a pre-approved one.
    const pending = requests.find((r) => r.credential_id === c.id && r.contractor_id === emp.id && r.status === 'pending');
    const { error } = pending
      ? await supabase.from('hub_credential_requests').update({
          status: 'approved',
          reviewed_by: hubUser?.id,
          reviewed_at: new Date().toISOString(),
        }).eq('id', pending.id)
      : await supabase.from('hub_credential_requests').insert({
          credential_id: c.id,
          contractor_id: emp.id,
          reason: 'Granted by admin',
          status: 'approved',
          reviewed_by: hubUser?.id,
          reviewed_at: new Date().toISOString(),
        });
    setGrantBusy((prev) => { const next = new Set(prev); next.delete(emp.id); return next; });
    if (error) { showToast(`Could not grant access: ${error.message}`); return; }
    supabase.functions.invoke('notify-credential-decision', {
      body: { contractor_id: emp.id, platform: c.platform, client_name: c.client_name ?? '', decision: 'approved' },
    }).catch(console.error);
    showToast(`Access granted to ${emp.full_name}.`);
    fetchData();
  };

  const revokeAccess = async (c: Credential, emp: Employee) => {
    const approved = approvedRequestFor(c.id, emp.id);
    if (!approved) return;
    setGrantBusy((prev) => new Set(prev).add(emp.id));
    const { error } = await supabase.from('hub_credential_requests').delete().eq('id', approved.id);
    setGrantBusy((prev) => { const next = new Set(prev); next.delete(emp.id); return next; });
    if (error) { showToast(`Could not revoke access: ${error.message}`); return; }
    showToast(`Access revoked for ${emp.full_name}.`);
    fetchData();
  };

  // Blocks a client-assigned employee's auto access to this one credential
  // without touching the client assignment itself.
  const revokeAutoAccess = async (c: Credential, emp: Employee) => {
    setGrantBusy((prev) => new Set(prev).add(emp.id));
    const { error } = await supabase.from('hub_credential_requests').insert({
      credential_id: c.id,
      contractor_id: emp.id,
      reason: 'Revoked by admin (overrides client assignment)',
      status: 'revoked',
      reviewed_by: hubUser?.id,
      reviewed_at: new Date().toISOString(),
    });
    setGrantBusy((prev) => { const next = new Set(prev); next.delete(emp.id); return next; });
    if (error) { showToast(`Could not revoke access: ${error.message}`); return; }
    showToast(`Access revoked for ${emp.full_name}.`);
    fetchData();
  };

  const restoreAutoAccess = async (c: Credential, emp: Employee) => {
    const override = revokedOverrideFor(c.id, emp.id);
    if (!override) return;
    setGrantBusy((prev) => new Set(prev).add(emp.id));
    const { error } = await supabase.from('hub_credential_requests').delete().eq('id', override.id);
    setGrantBusy((prev) => { const next = new Set(prev); next.delete(emp.id); return next; });
    if (error) { showToast(`Could not restore access: ${error.message}`); return; }
    showToast(`Access restored for ${emp.full_name}.`);
    fetchData();
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]';

  return (
    <>
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search credentials..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
              />
            </div>
            {pendingRequests.length > 0 && (
              <button
                onClick={() => {
                  const cred = credentials.find((c) => c.id === pendingRequests[0].credential_id);
                  if (cred) setManageCred(cred);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-key-line text-sm"></i>
                {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm rounded-lg hover:bg-gray-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-add-line"></i> Add Credential
          </button>
        </div>

        {/* Credentials grouped by client */}
        {loadError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-rose-700">
              <i className="ri-error-warning-line mr-1.5"></i>
              Couldn't load credentials: {loadError}
            </p>
            <button onClick={fetchData} className="text-xs font-semibold text-rose-700 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-100 cursor-pointer whitespace-nowrap">
              Retry
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i>
          </div>
        ) : clientNames.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <i className="ri-lock-2-line text-4xl text-gray-200 mb-3 block"></i>
            <p className="text-gray-400 text-sm">No credentials yet. Add the first one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {clientNames.map((clientName) => {
              const clientCreds = groups[clientName];
              const isExpanded = expandedClients.has(clientName);
              return (
                <div key={clientName} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  {/* Client group header */}
                  <button
                    onClick={() => toggleClient(clientName)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#FF6B35]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <i className="ri-building-2-line text-[#FF6B35] text-sm"></i>
                      </div>
                      <span className="text-sm font-semibold text-[#111827]">{clientName}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                        {clientCreds.length}
                      </span>
                    </div>
                    <i className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
                  </button>

                  {/* Credential cards */}
                  {isExpanded && (
                    <div className="border-t border-gray-50 divide-y divide-gray-50">
                      {clientCreds.map((cred) => {
                        const typeInfo = LOGIN_TYPE_LABELS[cred.login_type] ?? { label: cred.login_type, color: 'bg-gray-100 text-gray-600' };
                        const passVisible = showPassIds.has(cred.id);
                        const entitled = entitledEmployeesFor(cred);
                        const pendingCount = pendingRequestsFor(cred.id).length;
                        return (
                          <div key={cred.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Platform + badges */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-[#111827]">{cred.platform}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                                    {typeInfo.label}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[cred.status] ?? 'bg-gray-400'}`}></span>
                                    <span className="text-xs text-gray-400 capitalize">{cred.status}</span>
                                  </div>
                                </div>

                                {/* Account email */}
                                {cred.account_email && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <i className="ri-mail-line text-gray-400"></i>
                                    {cred.account_email}
                                  </p>
                                )}

                                {/* Password row */}
                                {(cred.login_type === 'email_password' || cred.login_type === 'api_key') && (
                                  <div className="flex items-center gap-2">
                                    <i className="ri-lock-line text-gray-400 text-xs"></i>
                                    <span className="text-xs text-gray-700 font-mono">
                                      {passVisible ? (revealLoading.has(cred.id) ? '…' : revealedPass[cred.id]?.password ?? '—') : '••••••••'}
                                    </span>
                                    <button
                                      onClick={() => togglePassVis(cred.id)}
                                      className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                                    >
                                      <i className={`text-xs ${passVisible ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                                    </button>
                                  </div>
                                )}

                                {/* OTP contact */}
                                {cred.login_type === 'otp' && cred.otp_contact && (
                                  <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <i className="ri-smartphone-line"></i>
                                    OTP → {cred.otp_contact}
                                  </p>
                                )}

                                {/* Additional info — encrypted, shown only after reveal */}
                                {passVisible && revealedPass[cred.id]?.additional_info && (
                                  <p className="text-xs text-gray-400">{revealedPass[cred.id].additional_info}</p>
                                )}

                                {/* Notes */}
                                {cred.notes && (
                                  <p className="text-xs text-gray-400 italic">{cred.notes}</p>
                                )}

                                {/* Who has access */}
                                <button
                                  onClick={() => setManageCred(cred)}
                                  className="flex items-center gap-1.5 pt-0.5 cursor-pointer group"
                                >
                                  {entitled.length > 0 ? (
                                    <div className="flex -space-x-1.5">
                                      {entitled.slice(0, 5).map((e) => (
                                        e.avatar_url
                                          ? <img key={e.id} src={e.avatar_url} title={e.full_name} className="w-5 h-5 rounded-full object-cover ring-2 ring-white" />
                                          : <div key={e.id} title={e.full_name} className="w-5 h-5 rounded-full bg-[#FF6B35]/10 ring-2 ring-white flex items-center justify-center text-[9px] font-semibold text-[#FF6B35]">
                                              {e.full_name.charAt(0).toUpperCase()}
                                            </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <i className="ri-user-forbid-line text-gray-300 text-sm"></i>
                                  )}
                                  <span className="text-xs text-gray-400 group-hover:text-[#FF6B35] transition-colors">
                                    {entitled.length > 0
                                      ? `${entitled.length} ${entitled.length === 1 ? 'person has' : 'people have'} access`
                                      : 'No one has access yet'}
                                  </span>
                                  {pendingCount > 0 && (
                                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                      {pendingCount} pending
                                    </span>
                                  )}
                                </button>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => setManageCred(cred)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 rounded-lg transition-colors cursor-pointer"
                                  title="Manage access"
                                >
                                  <i className="ri-user-add-line text-sm"></i>
                                </button>
                                <button
                                  onClick={() => openEdit(cred)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 rounded-lg transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <i className="ri-pencil-line text-sm"></i>
                                </button>
                                <button
                                  onClick={() => deleteCred(cred.id)}
                                  className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete"
                                >
                                  <i className="ri-delete-bin-line text-sm"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Manage Access Modal */}
      {manageCred && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <i className="ri-user-add-line text-[#FF6B35]"></i>
                  <h2 className="font-semibold text-[#111827]">Manage Access</h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {manageCred.platform}{manageCred.client_name ? ` — ${manageCred.client_name}` : ''} · grants take effect immediately, no request needed.
                </p>
              </div>
              <button onClick={() => setManageCred(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {pendingRequestsFor(manageCred.id).length > 0 && (
              <div className="border-b border-gray-100 bg-amber-50/50 divide-y divide-amber-100">
                {pendingRequestsFor(manageCred.id).map((req) => (
                  <div key={req.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800"><span className="font-medium">{req.hub_users?.full_name ?? 'Unknown'}</span> requested access</p>
                      {req.reason && <p className="text-xs text-gray-500 mt-0.5">{req.reason}</p>}
                    </div>
                    <button
                      onClick={() => reviewRequest(req.id, 'approved')}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      <i className="ri-check-line"></i> Approve
                    </button>
                    <button
                      onClick={() => reviewRequest(req.id, 'denied')}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                    >
                      <i className="ri-close-line"></i> Deny
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
              {employees.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No employees found.</p>
              ) : employees.map((emp) => {
                const isAuto = autoAccessIdsFor(manageCred).has(emp.id);
                const isRevoked = isAuto && !!revokedOverrideFor(manageCred.id, emp.id);
                const hasGrant = !!approvedRequestFor(manageCred.id, emp.id);
                const busy = grantBusy.has(emp.id);
                return (
                  <div key={emp.id} className="flex items-center gap-3 px-5 py-3">
                    {emp.avatar_url
                      ? <img src={emp.avatar_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-7 h-7 rounded-full bg-[#FF6B35]/10 flex items-center justify-center flex-shrink-0"><i className="ri-user-line text-[#FF6B35] text-xs"></i></div>}
                    <span className="flex-1 text-sm text-gray-800 truncate">{emp.full_name}</span>
                    {isAuto && isRevoked ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                          <i className="ri-shield-cross-line"></i> Access revoked
                        </span>
                        <button
                          onClick={() => restoreAutoAccess(manageCred, emp)}
                          disabled={busy}
                          className="text-xs font-medium text-gray-600 border border-gray-200 bg-white rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {busy ? '…' : 'Restore'}
                        </button>
                      </div>
                    ) : isAuto ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                          <i className="ri-shield-check-line"></i> Client assigned
                        </span>
                        <button
                          onClick={() => revokeAutoAccess(manageCred, emp)}
                          disabled={busy}
                          title="Block just this credential for this employee, without changing their client assignment"
                          className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {busy ? '…' : 'Revoke'}
                        </button>
                      </div>
                    ) : hasGrant ? (
                      <button
                        onClick={() => revokeAccess(manageCred, emp)}
                        disabled={busy}
                        className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {busy ? '…' : 'Revoke'}
                      </button>
                    ) : (
                      <button
                        onClick={() => grantAccess(manageCred, emp)}
                        disabled={busy}
                        className="text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {busy ? '…' : 'Grant access'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <i className="ri-lock-2-line text-[#FF6B35]"></i>
                <h2 className="font-semibold text-[#111827]">
                  {editingCred ? 'Edit Credential' : 'Add Credential'}
                </h2>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer w-7 h-7 flex items-center justify-center">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Client</label>
                  <select
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="">Internal (no client)</option>
                    {/* Include the current value even if it's since been removed from the roster or was hand-typed before this became a dropdown. */}
                    {(form.client_name && !clientOptions.includes(form.client_name) ? [form.client_name, ...clientOptions] : clientOptions).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">Platform *</label>
                  <input
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    placeholder="e.g. Facebook Business"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Login Type</label>
                <select
                  value={form.login_type}
                  onChange={(e) => setForm({ ...form, login_type: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="email_password">Email + Password</option>
                  <option value="otp">OTP</option>
                  <option value="sso">SSO</option>
                  <option value="api_key">API Key</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Account Email / Username</label>
                <input
                  value={form.account_email}
                  onChange={(e) => setForm({ ...form, account_email: e.target.value })}
                  placeholder="email@example.com"
                  className={inputCls}
                />
              </div>

              {(form.login_type === 'email_password' || form.login_type === 'api_key') && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">
                    {form.login_type === 'api_key' ? 'API Key' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingCred ? "Leave blank to keep current password" : "Enter password..."}
                      className={`${inputCls} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPass(!showFormPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <i className={`text-sm ${showFormPass ? 'ri-eye-off-line' : 'ri-eye-line'}`}></i>
                    </button>
                  </div>
                </div>
              )}

              {form.login_type === 'otp' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-700">OTP Contact</label>
                  <input
                    value={form.otp_contact}
                    onChange={(e) => setForm({ ...form, otp_contact: e.target.value })}
                    placeholder="e.g. Sent to +63912345678"
                    className={inputCls}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Additional Info</label>
                <input
                  value={form.additional_info}
                  onChange={(e) => setForm({ ...form, additional_info: e.target.value })}
                  placeholder={editingCred ? 'Leave blank to keep current info' : 'e.g. backup codes, 2FA app...'}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="unverified">Unverified</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any notes..."
                  maxLength={500}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>

            <div className="flex gap-2 p-5 pt-0">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.platform.trim()}
                className="flex-1 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap"
              >
                {saving ? 'Saving...' : editingCred ? 'Save Changes' : 'Add Credential'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
