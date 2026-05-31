import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <style>{`
        @keyframes logo-float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-22px) rotate(1deg); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes glow-pulse-slow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50%       { opacity: 0.55; transform: scale(1.12); }
        }
        @keyframes orb-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(60px, -40px) scale(1.1); }
          70%       { transform: translate(-30px, 25px) scale(0.92); }
        }
        @keyframes orb-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          35%       { transform: translate(-50px, 50px) scale(1.08); }
          70%       { transform: translate(30px, -20px) scale(0.95); }
        }
        @keyframes orb-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(40px, 40px) scale(1.05); }
        }
        @keyframes form-in {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logo-in {
          from { opacity: 0; transform: translateY(40px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .logo-float { animation: logo-float 6s ease-in-out infinite; }
        .glow-1     { animation: glow-pulse 5s ease-in-out infinite; }
        .glow-2     { animation: glow-pulse-slow 7s ease-in-out infinite 1s; }
        .orb-a      { animation: orb-a 20s ease-in-out infinite; }
        .orb-b      { animation: orb-b 26s ease-in-out infinite; }
        .orb-c      { animation: orb-c 18s ease-in-out infinite; }
        .form-in    { animation: form-in 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .logo-in    { animation: logo-in 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 100px rgba(255,255,255,0.9) inset !important;
          -webkit-text-fill-color: #1f2937 !important;
        }
      `}</style>

      {/* ── Left panel — form ─────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex flex-col min-h-screen">

        {/* Logo */}
        <div className="p-8 md:p-10 flex items-center gap-2.5 form-in">
          <div
            className="w-8 h-8 rounded-xl bg-[#FF6B35] flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 4px 14px rgba(255,107,53,0.35)' }}
          >
            <img src="/s-logo.png" alt="S" className="w-[18px] h-[18px] object-contain" style={{ filter: 'invert(1)' }} />
          </div>
          <span className="font-bold text-gray-900 tracking-wide text-sm">SENTRO <span className="text-[#FF6B35]">OS</span></span>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 md:px-14">
          <div className="w-full max-w-[380px] form-in" style={{ animationDelay: '0.1s' }}>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 leading-tight">Welcome back</h1>
              <p className="text-gray-400 text-sm mt-1.5">Sign in to access your workspace</p>
            </div>

            {justSignedUp && (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl mb-6">
                <i className="ri-checkbox-circle-line text-emerald-500 text-sm flex-shrink-0"></i>
                <p className="text-emerald-700 text-sm">Account created! Sign in to continue.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-500 tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 outline-none transition-all text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:border-[#FF6B35]"
                  style={{ transition: 'border 0.2s, background 0.2s' }}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-gray-500 tracking-wide">Password</label>
                  <button
                    type="button"
                    onClick={() => navigate('/hub/forgot-password')}
                    className="text-xs text-[#FF6B35] hover:text-[#e55a27] transition-colors cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 pr-10 py-3 text-sm rounded-xl border border-gray-200 outline-none transition-all text-gray-800 placeholder-gray-300 bg-gray-50 focus:bg-white focus:border-[#FF6B35]"
                    style={{ transition: 'border 0.2s, background 0.2s' }}
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
                <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-100 rounded-2xl">
                  <i className="ri-error-warning-line text-red-400 text-sm flex-shrink-0"></i>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF6B35] hover:bg-[#e55a27] active:scale-[0.98] text-white py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 cursor-pointer mt-2"
                style={{ boxShadow: '0 4px 20px rgba(255,107,53,0.35)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="ri-loader-4-line animate-spin text-sm"></i>
                    Signing in…
                  </span>
                ) : 'Sign in →'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 md:p-10 form-in" style={{ animationDelay: '0.2s' }}>
          <p className="text-xs text-gray-300">© Sentro OS {new Date().getFullYear()} · Restricted access</p>
        </div>
      </div>

      {/* ── Right panel — visual ──────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[52%] relative overflow-hidden flex-col items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #0e0805 0%, #160d06 50%, #0a0a0a 100%)' }}>

        {/* Background orbs */}
        <div className="orb-a absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.18) 0%, transparent 60%)' }} />
        <div className="orb-b absolute bottom-[-15%] left-[-8%] w-[550px] h-[550px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 60%)' }} />
        <div className="orb-c absolute top-[40%] right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,160,80,0.08) 0%, transparent 60%)' }} />

        {/* Floating S logo */}
        <div className="logo-in relative flex flex-col items-center">

          {/* Glow layers */}
          <div className="glow-1 absolute inset-0 rounded-[48px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,107,53,0.55) 0%, transparent 65%)', filter: 'blur(40px)', transform: 'scale(1.4)' }} />
          <div className="glow-2 absolute inset-0 rounded-[48px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,150,80,0.3) 0%, transparent 70%)', filter: 'blur(70px)', transform: 'scale(2)' }} />

          {/* Floating tile */}
          <div className="logo-float relative z-10">
            <div
              className="w-56 h-56 rounded-[52px] flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(32px)',
                WebkitBackdropFilter: 'blur(32px)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
            >
              {/* Inner orange tile */}
              <div
                className="w-36 h-36 rounded-[32px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(145deg, #FF6B35, #e55a27)',
                  boxShadow: '0 16px 48px rgba(255,107,53,0.5), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <img src="/s-logo.png" alt="S" className="w-20 h-20 object-contain" style={{ filter: 'invert(1)' }} />
              </div>
            </div>

            {/* Reflection */}
            <div
              className="w-56 mt-2 mx-auto pointer-events-none"
              style={{
                height: '80px',
                background: 'linear-gradient(to bottom, rgba(255,107,53,0.12), transparent)',
                borderRadius: '0 0 48px 48px',
                filter: 'blur(8px)',
                transform: 'scaleY(-1) translateY(0)',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Label */}
          <div className="mt-10 text-center z-10 relative">
            <p className="text-white/80 text-xl font-bold tracking-widest uppercase">Sentro OS</p>
            <p className="text-white/30 text-xs tracking-widest mt-1 uppercase">Operations Platform</p>
          </div>
        </div>
      </div>
    </div>
  );
}
