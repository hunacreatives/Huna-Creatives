import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import { supabase } from '@/lib/supabase';
import { HubUser, HubAttendance, HubTimeOff, HubRequest, HubClient, HubAsset } from '@/lib/types';
import EditContractorModal from './EditContractorModal';

export default function ContractorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState<HubUser | null>(null);
  const [attendance, setAttendance] = useState<HubAttendance[]>([]);
  const [timeOff, setTimeOff] = useState<HubTimeOff[]>([]);
  const [requests, setRequests] = useState<HubRequest[]>([]);
  const [clients, setClients] = useState<HubClient[]>([]);
  const [assets, setAssets] = useState<HubAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'requests' | 'assets'>('overview');

  const fetch = async () => {
    if (!id) return;
    const [u, att, to, req, cl, ast] = await Promise.all([
      supabase.from('hub_users').select('*').eq('id', id).maybeSingle(),
      supabase.from('hub_attendance').select('*').eq('contractor_id', id).order('date', { ascending: false }).limit(10),
      supabase.from('hub_time_off').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
      supabase.from('hub_requests').select('*').eq('contractor_id', id).order('created_at', { ascending: false }),
      supabase.from('hub_clients').select('*').eq('contractor_id', id),
      supabase.from('hub_assets').select('*').eq('contractor_id', id),
    ]);
    setContractor(u.data as HubUser ?? null);
    setAttendance((att.data as HubAttendance[]) ?? []);
    setTimeOff((to.data as HubTimeOff[]) ?? []);
    setRequests((req.data as HubRequest[]) ?? []);
    setClients((cl.data as HubClient[]) ?? []);
    setAssets((ast.data as HubAsset[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [id]);

  const statusColors = {
    complete: 'bg-emerald-100 text-emerald-700',
    missing_on: 'bg-red-100 text-red-700',
    missing_off: 'bg-amber-100 text-amber-700',
    manual: 'bg-violet-100 text-violet-700',
  };

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'ri-user-line' },
    { key: 'attendance', label: 'Attendance', icon: 'ri-time-line' },
    { key: 'requests', label: 'Requests', icon: 'ri-inbox-line' },
    { key: 'assets', label: 'Assets', icon: 'ri-key-2-line' },
  ];

  if (loading) {
    return (
      <AdminLayout title="Contractor Detail">
        <div className="flex items-center justify-center h-48">
          <i className="ri-loader-4-line animate-spin text-2xl text-gray-400"></i>
        </div>
      </AdminLayout>
    );
  }

  if (!contractor) {
    return (
      <AdminLayout title="Not Found">
        <p className="text-gray-500">Contractor not found.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={contractor.full_name}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/hub/admin/contractors')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line text-sm"></i>
            Back
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 bg-[#FF6B35] text-white text-sm px-3 py-2 rounded-lg hover:bg-[#e55a27] transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-edit-line text-sm"></i>
            Edit
          </button>
        </div>
      }
    >
      <div className="max-w-4xl space-y-5">
        {/* Profile header */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col sm:flex-row gap-5 items-start">
          <img
            src={contractor.avatar_url || ''}
            alt={contractor.full_name}
            className="w-20 h-20 rounded-xl object-cover object-top flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              <h2 className="text-lg font-bold text-[#111827]">{contractor.full_name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                contractor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>{contractor.status === 'active' ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><i className="ri-mail-line text-xs"></i>{contractor.email}</span>
              {contractor.phone && <span className="flex items-center gap-1"><i className="ri-phone-line text-xs"></i>{contractor.phone}</span>}
              {contractor.slack_username && <span className="flex items-center gap-1"><i className="ri-slack-line text-xs"></i>{contractor.slack_username}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {contractor.department && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{contractor.department}</span>
              )}
              {contractor.hourly_rate && (
                <span className="text-xs bg-[#FF6B35]/10 text-[#FF6B35] px-2 py-0.5 rounded-full font-medium">
                  ${contractor.hourly_rate}/hr {contractor.currency}
                </span>
              )}
              {contractor.payment_method && (
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{contractor.payment_method}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === t.key ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <i className={`${t.icon} text-xs`}></i>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#111827]">Personal Info</h3>
              {[
                { label: 'Phone', value: contractor.phone, icon: 'ri-phone-line' },
                { label: 'Birthday', value: contractor.birthday, icon: 'ri-cake-line' },
                { label: 'Start Date', value: contractor.start_date ? new Date(contractor.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined, icon: 'ri-calendar-line' },
                { label: 'Address', value: contractor.address, icon: 'ri-map-pin-line' },
              ].map((f) => f.value ? (
                <div key={f.label} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className={`${f.icon} text-gray-400 text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm text-gray-700 mt-0.5">{f.value}</p>
                  </div>
                </div>
              ) : null)}
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#111827]">Emergency Contact</h3>
              {contractor.emergency_contact_name ? (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className="ri-user-heart-line text-rose-400 text-xs"></i>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Name</p>
                      <p className="text-sm text-gray-700 mt-0.5">{contractor.emergency_contact_name}</p>
                    </div>
                  </div>
                  {contractor.emergency_contact_relationship && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-group-line text-gray-400 text-xs"></i>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Relationship</p>
                        <p className="text-sm text-gray-700 mt-0.5">{contractor.emergency_contact_relationship}</p>
                      </div>
                    </div>
                  )}
                  {contractor.emergency_contact_phone && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="ri-phone-line text-gray-400 text-xs"></i>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-sm text-gray-700 mt-0.5">{contractor.emergency_contact_phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No emergency contact on file</p>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[#111827]">Pay Info</h3>
              {[
                { label: 'Payment Type', value: contractor.payment_type ? (contractor.payment_type === 'fixed' ? 'Fixed Monthly' : 'Hourly') : undefined, icon: 'ri-bank-card-line' },
                { label: 'Rate', value: contractor.payment_type === 'fixed' ? (contractor.monthly_rate ? `₱${contractor.monthly_rate.toLocaleString()}/mo` : undefined) : (contractor.hourly_rate ? `$${contractor.hourly_rate}/hr ${contractor.currency || ''}` : undefined), icon: 'ri-money-dollar-circle-line' },
                { label: 'Bank', value: contractor.bank_name, icon: 'ri-building-line' },
                { label: 'Account Name', value: contractor.bank_account_name, icon: 'ri-user-line' },
                { label: 'Account Number', value: contractor.bank_account_number, icon: 'ri-hashtag' },
              ].map((f) => f.value ? (
                <div key={f.label} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className={`${f.icon} text-gray-400 text-xs`}></i>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{f.label}</p>
                    <p className="text-sm text-gray-700 mt-0.5 font-mono">{f.value}</p>
                  </div>
                </div>
              ) : null)}
            </div>

            {contractor.notes && (
              <div className="sm:col-span-2 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-1.5">Admin Notes</h3>
                <p className="text-sm text-amber-700">{contractor.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">On</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Off</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Hours</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attendance.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-8">No attendance records</td></tr>
                  ) : attendance.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm text-gray-700">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.on_time || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.off_time || '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{a.total_hours ? `${a.total_hours}h` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap capitalize ${statusColors[a.status]}`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
                <p className="text-sm text-gray-400">No requests from this contractor</p>
              </div>
            ) : requests.map((r) => (
              <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">{r.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.type} · {new Date(r.created_at!).toLocaleDateString()}</p>
                    {r.description && <p className="text-sm text-gray-500 mt-2">{r.description}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${
                    r.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'in_review' ? 'bg-sky-100 text-sky-700' :
                    r.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{r.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Platform</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Account</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Access</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {assets.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-8">No asset access records</td></tr>
                  ) : assets.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 capitalize">{a.platform.replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.account_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 capitalize">{a.access_level}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                          a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>{a.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showEdit && contractor && (
        <EditContractorModal
          contractor={contractor}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); fetch(); }}
        />
      )}
    </AdminLayout>
  );
}