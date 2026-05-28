import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getHubHomePath } from '@/lib/hubAuth';

export default function HubLoginPage() {
  const { signIn, hubUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justSignedUp = searchParams.get('welcome') === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (hubUser) navigate(getHubHomePath(hubUser.role), { replace: true });
  }, [hubUser, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err.message || 'Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('hub_users').select('role').eq('id', authUser.id).maybeSingle();
        window.location.href = getHubHomePath(profile?.role);
      } else {
        setError('Could not load your profile. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8f0fe 0%, #eef2ff 40%, #fdf4ef 100%)' }}>

      <style>{`
        @keyframes orb-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(40px, -30px) scale(1.08); }
          66%       { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(-50px, 30px) scale(1.1); }
          70%       { transform: translate(25px, -20px) scale(0.92); }
        }
        @keyframes orb-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(30px, 40px) scale(1.06); }
        }
        @keyframes orb-drift-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          35%       { transform: translate(-35px, -25px) scale(1.12); }
          75%       { transform: translate(20px, 15px) scale(0.9); }
        }
        @keyframes orb-drift-5 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          45%       { transform: translate(45px, -40px) scale(1.07); }
          80%       { transform: translate(-15px, 30px) scale(0.96); }
        }
        .orb-1 { animation: orb-drift-1 18s ease-in-out infinite; }
        .orb-2 { animation: orb-drift-2 22s ease-in-out infinite; }
        .orb-3 { animation: orb-drift-3 16s ease-in-out infinite; }
        .orb-4 { animation: orb-drift-4 25s ease-in-out infinite; }
        .orb-5 { animation: orb-drift-5 20s ease-in-out infinite; }
      `}</style>

      {/* Animated ambient orbs */}
      <div className="orb-1 absolute top-[-80px] right-[-60px] w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.18) 0%, transparent 65%)' }} />
      <div className="orb-2 absolute bottom-[-120px] left-[-80px] w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)' }} />
      <div className="orb-3 absolute top-[35%] left-[5%] w-[320px] h-[320px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 65%)' }} />
      <div className="orb-4 absolute bottom-[15%] right-[10%] w-[280px] h-[280px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 65%)' }} />
      <div className="orb-5 absolute top-[10%] left-[30%] w-[220px] h-[220px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 65%)' }} />

      {/* Card */}
      <div className="relative w-full max-w-[400px] mx-4">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-12 h-12 rounded-2xl bg-[#FF6B35] flex items-center justify-center mb-3 shadow-lg"
            style={{ boxShadow: '0 8px 24px rgba(255,107,53,0.30)' }}
          >
            <span className="text-white text-lg font-black">S</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Huna Creatives</p>
          <p className="text-gray-800 text-lg font-bold leading-tight">Sentro</p>
        </div>

        {/* Glass form card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.85)',
            boxShadow: '0 8px 40px rgba(99,120,200,0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}
        >
          <div className="mb-6">
            <h1 className="text-gray-800 text-xl font-bold">Welcome back</h1>
            <p className="text-gray-400 text-sm mt-0.5">Sign in to access your workspace</p>
          </div>

          {justSignedUp && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl mb-5">
              <i className="ri-checkbox-circle-line text-emerald-500 text-sm flex-shrink-0"></i>
              <p className="text-emerald-700 text-sm">Account created! Sign in to continue.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <i className="ri-mail-line text-sm"></i>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hunacreatives.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all text-gray-800 placeholder-gray-300"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(200,210,240,0.6)',
                  }}
                  onFocus={e => e.currentTarget.style.border = '1px solid rgba(255,107,53,0.4)'}
                  onBlur={e => e.currentTarget.style.border = '1px solid rgba(200,210,240,0.6)'}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/hub/forgot-password')}
                  className="text-xs text-[#FF6B35] hover:text-[#e55a27] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">
                  <i className="ri-lock-line text-sm"></i>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl outline-none transition-all text-gray-800 placeholder-gray-300"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid rgba(200,210,240,0.6)',
                  }}
                  onFocus={e => e.currentTarget.style.border = '1px solid rgba(255,107,53,0.4)'}
                  onBlur={e => e.currentTarget.style.border = '1px solid rgba(200,210,240,0.6)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-pointer transition-colors"
                >
                  <i className={showPass ? 'ri-eye-off-line text-sm' : 'ri-eye-line text-sm'}></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <i className="ri-error-warning-line text-red-400 text-sm flex-shrink-0"></i>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B35] hover:bg-[#e55a27] text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer mt-1"
              style={{ boxShadow: '0 4px 16px rgba(255,107,53,0.30)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin text-sm"></i>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400/70 mt-5">
          Restricted access · authorized personnel only
        </p>
      </div>
    </div>
  );
}
