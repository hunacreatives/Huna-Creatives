import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

const INVITE_CODE = import.meta.env.VITE_HUB_INVITE_CODE || 'HUNASTAFF';
const ADMIN_INVITE_CODE = import.meta.env.VITE_HUB_ADMIN_INVITE_CODE || 'HUNAADMIN';

export default function HubSignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const prefillEmail = params.get('email') || '';
  const prefillName = params.get('name') || '';
  const prefillDept = params.get('dept') || '';
  const prefillTitle = params.get('title') || '';
  const prefillAvatar = params.get('avatar') || '';
  const prefillSlack = params.get('slack') || '';
  const code = params.get('code') || '';

  const isValidCode = (c: string) => c === INVITE_CODE || c === ADMIN_INVITE_CODE;
  const [step, setStep] = useState<'verify' | 'form'>(isValidCode(code) ? 'form' : 'verify');
  const [inviteCode, setInviteCode] = useState(code);
  const [codeError, setCodeError] = useState('');

  const [form, setForm] = useState({
    full_name: prefillName,
    email: prefillEmail,
    password: '',
    confirm_password: '',
    slack_username: prefillSlack,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const verifyCode = () => {
    if (isValidCode(inviteCode.trim().toUpperCase())) {
      setStep('form');
    } else {
      setCodeError('Invalid invite code. Please check with your admin.');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

    if (data.user) {
      // Check for pre-seeded rate data
      const { data: pending } = await supabase
        .from('hub_pending_rates')
        .select('*')
        .eq('email', form.email)
        .maybeSingle();

      const assignedRole = inviteCode.trim().toUpperCase() === ADMIN_INVITE_CODE ? 'admin' : 'contractor';

      const { error: insertErr } = await supabase.from('hub_users').insert({
        id: data.user.id,
        email: form.email,
        full_name: form.full_name,
        role: assignedRole,
        status: 'active',
        department: prefillDept || null,
        avatar_url: prefillAvatar || null,
        slack_username: form.slack_username || null,
        payment_type: pending?.payment_type || 'hourly',
        hourly_rate: pending?.hourly_rate || null,
        monthly_rate: pending?.monthly_rate || null,
        currency: pending?.currency || 'PHP',
        bank_name: pending?.bank_name || null,
        bank_account_number: pending?.bank_account_number || null,
        start_date: pending?.start_date || null,
      });
      if (insertErr) { setError(insertErr.message); setLoading(false); return; }
    }

    setLoading(false);
    navigate('/hub/login?welcome=1');
  };

  const inputClass = 'w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white transition-all';

  const hasPreload = !!(prefillName || prefillDept || prefillAvatar);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#111827] flex-col justify-between p-12">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
            <i className="ri-briefcase-4-fill text-white text-sm"></i>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Huna Hub</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-white text-3xl font-bold leading-tight">Welcome to the team.</h2>
          <p className="text-gray-400 text-base leading-relaxed">
            Create your account to access attendance tracking, announcements, payouts, and your team SOPs.
          </p>
        </div>
        <p className="text-gray-600 text-xs">Private portal — Huna Creatives team only.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="w-8 h-8 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <i className="ri-briefcase-4-fill text-white text-sm"></i>
            </div>
            <span className="text-[#111827] font-semibold text-lg tracking-tight">Huna Hub</span>
          </div>

          {step === 'verify' ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-[#111827] text-2xl font-bold">Enter invite code</h1>
                <p className="text-gray-500 text-sm">Ask your admin for the invite code to continue.</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setCodeError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                  placeholder="e.g. HUNASTAFF"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white uppercase tracking-widest font-mono"
                />
                {codeError && <p className="text-red-500 text-xs">{codeError}</p>}
              </div>
              <button onClick={verifyCode} className="w-full bg-[#FF6B35] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#e55a27] transition-colors cursor-pointer">
                Continue
              </button>
              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <button onClick={() => navigate('/hub/login')} className="text-[#FF6B35] hover:underline cursor-pointer">Sign in</button>
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-[#111827] text-2xl font-bold">Create your account</h1>
                <p className="text-gray-500 text-sm">Fill in your details to get started.</p>
              </div>

              {/* Pre-loaded profile card */}
              {hasPreload && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  {prefillAvatar ? (
                    <img src={prefillAvatar} alt={prefillName} className="w-12 h-12 rounded-full object-cover object-top flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">{prefillName.charAt(0)}</span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{prefillName}</p>
                    {prefillTitle && <p className="text-xs text-gray-500">{prefillTitle}</p>}
                    {prefillDept && <p className="text-xs text-emerald-600">{prefillDept}</p>}
                  </div>
                  <i className="ri-checkbox-circle-fill text-emerald-500 text-lg ml-auto"></i>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <div className="w-10 h-full absolute left-0 top-0 flex items-center justify-center">
                      <i className="ri-user-line text-gray-400 text-sm"></i>
                    </div>
                    <input type="text" required value={form.full_name} onChange={(e) => set('full_name', e.target.value)}
                      placeholder="Your full name" className={inputClass} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Email address</label>
                  <div className="relative">
                    <div className="w-10 h-full absolute left-0 top-0 flex items-center justify-center">
                      <i className="ri-mail-line text-gray-400 text-sm"></i>
                    </div>
                    <input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="you@email.com" className={inputClass} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <div className="w-10 h-full absolute left-0 top-0 flex items-center justify-center">
                      <i className="ri-lock-line text-gray-400 text-sm"></i>
                    </div>
                    <input type={showPass ? 'text' : 'password'} required value={form.password}
                      onChange={(e) => set('password', e.target.value)} placeholder="Min. 8 characters"
                      className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                      <i className={showPass ? 'ri-eye-off-line text-sm' : 'ri-eye-line text-sm'}></i>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <div className="relative">
                    <div className="w-10 h-full absolute left-0 top-0 flex items-center justify-center">
                      <i className="ri-lock-line text-gray-400 text-sm"></i>
                    </div>
                    <input type={showPass ? 'text' : 'password'} required value={form.confirm_password}
                      onChange={(e) => set('confirm_password', e.target.value)} placeholder="Re-enter password"
                      className={inputClass} />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0"></i>
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-[#FF6B35] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#e55a27] transition-colors disabled:opacity-60 cursor-pointer">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <i className="ri-loader-4-line animate-spin text-sm"></i>
                      Creating account...
                    </span>
                  ) : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400">
                Already have an account?{' '}
                <button onClick={() => navigate('/hub/login')} className="text-[#FF6B35] hover:underline cursor-pointer">Sign in</button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
