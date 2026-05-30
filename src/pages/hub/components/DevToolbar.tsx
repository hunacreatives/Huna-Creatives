import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'owner', label: 'Owner', color: 'bg-violet-500' },
  { value: 'admin', label: 'Admin', color: 'bg-sky-500' },
  { value: 'contractor', label: 'Contractor', color: 'bg-emerald-500' },
] as const;

export default function DevToolbar() {
  const { hubUser, devViewAs, setDevViewAs } = useAuth();
  const navigate = useNavigate();

  if (!hubUser?.is_developer) return null;
  if (localStorage.getItem('hub_dev_toolbar_hidden') === 'true') return null;

  const handleSelect = (role: 'owner' | 'admin' | 'contractor') => {
    setDevViewAs(role);
    if (role === 'contractor') {
      navigate('/hub/contractor/dashboard');
    } else {
      navigate('/hub/admin/dashboard');
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-[#111827] text-white px-3 py-2 rounded-full shadow-2xl border border-white/10">
      <span className="text-[10px] font-mono text-gray-400 pr-1">DEV</span>
      {ROLES.map(r => (
        <button
          key={r.value}
          onClick={() => handleSelect(r.value)}
          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${
            devViewAs === r.value
              ? `${r.color} text-white`
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {r.label}
        </button>
      ))}
      {devViewAs && (
        <button
          onClick={() => { setDevViewAs(null); navigate('/hub/admin/dashboard'); }}
          className="text-gray-500 hover:text-white cursor-pointer ml-1 text-xs"
          title="Reset"
        >
          <i className="ri-close-line"></i>
        </button>
      )}
    </div>
  );
}
