import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
    if (hubUser) {
      if (hubUser.role === 'contractor') {
        navigate('/hub/contractor/dashboard', { replace: true });
      } else {
        navigate('/hub/admin/dashboard', { replace: true });
      }
    }
  }, [hubUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Clear any stale session first
      await supabase.auth.signOut();
      const { error: err } = await signIn(email, password);
      if (err) {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }
      // Fetch role directly, then hard-redirect to avoid React state race conditions
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase
          .from('hub_users')
          .select('role')
          .eq('id', authUser.id)
          .maybeSingle();
        const dest = profile?.role === 'contractor'
          ? '/hub/contractor/dashboard'
          : '/hub/admin/dashboard';
        window.location.href = dest;
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
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#1c1917] flex-col p-10 gap-8">
        {/* Logo */}
        <img src="/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-8 w-auto self-start" />

        {/* Team photo */}
        <div className="rounded-2xl overflow-hidden ring-1 ring-white/10">
          <img
            src="https://images.squarespace-cdn.com/content/v1/688d8b734aa1173915369520/f4405f8d-bb2d-4158-8112-4d2c495073e8/Screenshot+2025-08-05+at+12.46.35%E2%80%AFPM.png"
            alt="Huna Creatives Team"
            className="w-full h-[500px] object-cover"
            style={{ objectPosition: '70% top' }}
          />
        </div>

        {/* Copy */}
        <div className="space-y-3">
          <p className="text-white/35 text-xs tracking-[0.28em] uppercase font-medium">Team Portal</p>
          <h2 className="text-white text-2xl font-semibold leading-snug">
            Your team ops, all in one place.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            The Huna Contractor Hub is where the team clocks in and out via Slack, tracks hours, views payslips, submits requests, reads announcements, and accesses SOPs — all in one private portal.
          </p>
          <p className="text-white/25 text-xs">Private access — Huna Creatives team only.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <img src="/images/547b59870e776a20eb28e4f20931787c.png" alt="Huna Creatives" className="h-8 w-auto" />
          </div>

          <div className="space-y-2">
            <h1 className="text-[#111827] text-2xl font-bold">Sign in to your account</h1>
            <p className="text-gray-500 text-sm">Enter your credentials to continue</p>
          </div>

          {justSignedUp && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
              <i className="ri-checkbox-circle-line text-emerald-500 text-sm flex-shrink-0"></i>
              <p className="text-emerald-700 text-sm">Account created! Sign in with your new credentials.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="relative">
                <div className="w-10 h-full absolute left-0 top-0 flex items-center justify-center">
                  <i className="ri-mail-line text-gray-400 text-sm"></i>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hunacreatives.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button
                  type="button"
                  onClick={() => navigate('/hub/forgot-password')}
                  className="text-xs text-[#FF6B35] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="w-10 h-full absolute left-0 top-0 flex items-center justify-center">
                  <i className="ri-lock-line text-gray-400 text-sm"></i>
                </div>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className={showPass ? 'ri-eye-off-line text-sm' : 'ri-eye-line text-sm'}></i>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <i className="ri-error-warning-line text-red-500 text-sm flex-shrink-0"></i>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B35] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#e55a27] transition-colors disabled:opacity-60 cursor-pointer whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="ri-loader-4-line animate-spin text-sm"></i>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400">
            Private portal — Huna Creatives team only.<br />
            Contact HR if you need access.
          </p>
        </div>
      </div>
    </div>
  );
}