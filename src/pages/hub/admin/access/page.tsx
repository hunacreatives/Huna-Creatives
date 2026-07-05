import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/pages/hub/components/AdminLayout';
import CredentialsPanel from './CredentialsPanel';
import AssetsPanel from './AssetsPanel';

type Tab = 'credentials' | 'assets';

// One home for "who can get into what": the client credentials vault and
// per-employee platform access grants (merged from two separate pages).
export default function AccessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState<Tab>(tabParam === 'assets' ? 'assets' : 'credentials');
  const switchTab = (t: Tab) => {
    setTab(t);
    setSearchParams(t === 'credentials' ? {} : { tab: t }, { replace: true });
  };

  return (
    <AdminLayout title="Access">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        <button onClick={() => switchTab('credentials')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${tab === 'credentials' ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="ri-lock-2-line text-[13px]"></i>Credentials Vault
        </button>
        <button onClick={() => switchTab('assets')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${tab === 'assets' ? 'bg-white text-[#111827] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          <i className="ri-key-2-line text-[13px]"></i>Platform Access
        </button>
      </div>

      {tab === 'credentials' && <CredentialsPanel />}
      {tab === 'assets' && <AssetsPanel />}
    </AdminLayout>
  );
}
