import { useEffect, useState } from 'react';
import ContractorLayout from '@/pages/hub/components/ContractorLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ClientAssignment {
  id: number;
  role: string | null;
  hub_clients: {
    id: number;
    client_name: string;
    platform: string | null;
    status: string;
    notes: string | null;
  };
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  ended: 'bg-gray-100 text-gray-500',
};

export default function ContractorClientsPage() {
  const { hubUser } = useAuth();
  const [assignments, setAssignments] = useState<ClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hubUser) return;
    supabase
      .from('hub_client_assignments')
      .select('id, role, hub_clients(id, client_name, platform, status, notes)')
      .eq('contractor_id', hubUser.id)
      .then(({ data }) => {
        setAssignments((data as ClientAssignment[]) ?? []);
        setLoading(false);
      });
  }, [hubUser]);

  const active = assignments.filter(a => a.hub_clients?.status === 'active');
  const other = assignments.filter(a => a.hub_clients?.status !== 'active');

  return (
    <ContractorLayout title="My Clients">
      <div className="max-w-2xl space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-xl text-gray-400"></i>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <i className="ri-building-line text-gray-400 text-xl"></i>
            </div>
            <p className="text-sm font-medium text-gray-500">No clients assigned yet</p>
            <p className="text-xs text-gray-400 mt-1">Your admin will assign you to clients when needed.</p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Active</p>
                {active.map(a => <ClientCard key={a.id} assignment={a} />)}
              </div>
            )}
            {other.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Other</p>
                {other.map(a => <ClientCard key={a.id} assignment={a} />)}
              </div>
            )}
          </>
        )}
      </div>
    </ContractorLayout>
  );
}

function ClientCard({ assignment: a }: { assignment: ClientAssignment }) {
  const c = a.hub_clients;
  if (!c) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 bg-[#FF6B35]/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
        <i className="ri-building-line text-[#FF6B35] text-base"></i>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-[#111827] text-sm">{c.client_name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {c.status}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {a.role && (
            <span className="inline-flex items-center gap-1 text-xs text-[#FF6B35] font-medium">
              <i className="ri-briefcase-line text-xs"></i> {a.role}
            </span>
          )}
          {c.platform && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <i className="ri-global-line text-xs"></i> {c.platform}
            </span>
          )}
        </div>
        {c.notes && <p className="text-xs text-gray-400 mt-1.5 italic">{c.notes}</p>}
      </div>
    </div>
  );
}
