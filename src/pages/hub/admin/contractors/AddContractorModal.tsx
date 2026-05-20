import { useState } from 'react';
import { TEAM_MEMBERS, TeamMember } from '@/lib/teamData';
import { supabase } from '@/lib/supabase';

const INVITE_CODE = import.meta.env.VITE_HUB_INVITE_CODE || 'HUNASTAFF';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContractorModal({ onClose }: Props) {
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [role, setRole] = useState<'contractor' | 'admin'>('contractor');
  const [copied, setCopied] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');

  const base = window.location.origin + (import.meta.env.BASE_URL || '/');

  const buildContractorLink = () => {
    const params = new URLSearchParams({ code: INVITE_CODE });
    if (email) params.set('email', email);
    if (selected) {
      params.set('name', selected.name);
      params.set('dept', selected.department);
      params.set('title', selected.title);
      if (selected.avatar) params.set('avatar', selected.avatar);
      if (selected.slackName) params.set('slack', selected.slackName);
    }
    return `${base}hub/signup?${params.toString()}`;
  };

  const buildAdminLink = (token: string) => {
    const params = new URLSearchParams({ adminToken: token });
    if (email) params.set('email', email);
    if (selected) {
      params.set('name', selected.name);
      params.set('dept', selected.department);
      if (selected.avatar) params.set('avatar', selected.avatar);
    }
    return `${base}hub/signup?${params.toString()}`;
  };

  const generateAdminToken = async () => {
    if (!email) { setTokenError('Enter their email first.'); return; }
    setTokenError('');
    setGeneratingToken(true);
    const token = crypto.randomUUID();
    const { error } = await supabase.from('hub_admin_invites').insert({ email, token, used: false });
    if (error) {
      setTokenError('Failed to create invite: ' + error.message);
    } else {
      setAdminToken(token);
    }
    setGeneratingToken(false);
  };

  const link = role === 'admin'
    ? (adminToken ? buildAdminLink(adminToken) : null)
    : buildContractorLink();

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pickMember = (m: TeamMember) => {
    if (selected?.name === m.name) {
      setSelected(null);
      if (email === (m.email || '')) setEmail('');
    } else {
      setSelected(m);
      if (m.email) setEmail(m.email);
      setAdminToken(null); // reset token if person changes
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-[#111827]">Invite a Team Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: Pick from team */}
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Select team member <span className="text-gray-400 font-normal">(pre-fills their profile)</span></p>
            <div className="grid grid-cols-3 gap-2">
              {TEAM_MEMBERS.map((m) => (
                <button
                  key={m.name}
                  onClick={() => pickMember(m)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer text-center ${
                    selected?.name === m.name
                      ? 'border-[#FF6B35] bg-orange-50'
                      : 'border-gray-100 hover:border-gray-300 bg-white'
                  }`}
                >
                  {m.avatar ? (
                    <img src={m.avatar} alt={m.name} className="w-12 h-12 rounded-full object-cover object-top flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-lg font-bold">{m.name.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-900 leading-tight">{m.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{m.department}</p>
                  </div>
                  {selected?.name === m.name && (
                    <i className="ri-checkbox-circle-fill text-[#FF6B35] text-sm"></i>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selected && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-lg">
              {selected.avatar ? (
                <img src={selected.avatar} alt={selected.name} className="w-9 h-9 rounded-full object-cover object-top flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{selected.name.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{selected.name}</p>
                <p className="text-xs text-gray-500">{selected.title} · {selected.department}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xs">
                <i className="ri-close-line"></i>
              </button>
            </div>
          )}

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">Access Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'contractor', label: 'Contractor', icon: 'ri-user-line', desc: 'Standard team member' },
                { value: 'admin', label: 'HR / Admin', icon: 'ri-shield-user-line', desc: 'Manage team & payroll' },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value as 'contractor' | 'admin'); setAdminToken(null); setTokenError(''); }}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                    role === r.value ? 'border-[#FF6B35] bg-orange-50' : 'border-gray-100 hover:border-gray-300 bg-white'
                  }`}
                >
                  <i className={`${r.icon} text-base ${role === r.value ? 'text-[#FF6B35]' : 'text-gray-400'}`}></i>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{r.label}</p>
                    <p className="text-[10px] text-gray-400">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700">
              Their Email {role === 'admin' ? <span className="text-red-400">*required</span> : <span className="text-gray-400 font-normal">(optional — pre-fills on signup)</span>}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setAdminToken(null); setTokenError(''); }}
              placeholder="email@example.com"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35]"
            />
          </div>

          {/* Admin: generate token before showing link */}
          {role === 'admin' && !adminToken && (
            <div className="space-y-2">
              {tokenError && <p className="text-xs text-red-500">{tokenError}</p>}
              <button
                onClick={generateAdminToken}
                disabled={generatingToken || !email}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-[#111827] text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap"
              >
                {generatingToken ? <i className="ri-loader-4-line animate-spin text-sm"></i> : <i className="ri-key-2-line text-sm"></i>}
                {generatingToken ? 'Generating…' : 'Generate Secure Invite Link'}
              </button>
              <p className="text-[10px] text-gray-400 text-center">Creates a one-time link tied to this email. Single use only.</p>
            </div>
          )}

          {role === 'admin' && adminToken && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
              <i className="ri-checkbox-circle-fill text-emerald-500 flex-shrink-0"></i>
              <p className="text-xs text-emerald-700 font-medium">Secure invite token generated for <strong>{email}</strong></p>
            </div>
          )}

          {/* Link */}
          {link && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700">Invite Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg truncate font-mono">
                  {link}
                </div>
                <button
                  onClick={copyLink}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                    copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}></i>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer whitespace-nowrap">
              Close
            </button>
            {link && (
              <button onClick={copyLink} className="flex-1 py-2.5 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#e55a27] cursor-pointer whitespace-nowrap">
                {copied ? '✓ Copied' : 'Copy Invite Link'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
