import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { HubClientContract } from '@/lib/types';

const HUNA_LOGO_URL = '/huna-logo.png';

export default function ClientContractSignPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<HubClientContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from('hub_client_contracts')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error || !data) { setNotFound(true); }
      else { setContract(data as HubClientContract); }
      setLoading(false);
    })();
  }, [slug]);

  const sign = async () => {
    if (!signerName.trim() || !agreed || !contract) return;
    setSigning(true);
    setError('');
    try {
      const { error: err } = await supabase
        .from('hub_client_contracts')
        .update({
          status: 'signed',
          signer_name: signerName.trim(),
          signed_at: new Date().toISOString(),
        })
        .eq('id', contract.id)
        .eq('status', 'sent');
      if (err) throw new Error(err.message);
      setDone(true);
      supabase.functions.invoke('notify-contract-signed', { body: { slug } }).catch(console.error);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf9' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #D64F1E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf9', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 18, color: '#374151', fontWeight: 600 }}>Contract not found</p>
        <p style={{ fontSize: 14, color: '#9ca3af' }}>This link may be invalid or the contract is no longer available.</p>
      </div>
    );
  }

  if (contract.status === 'signed' || done) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafaf9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 480, width: '100%', background: '#fff', borderRadius: 16, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="ri-checkbox-circle-fill" style={{ fontSize: 32, color: '#16a34a' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Contract Signed</h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Thank you{done && signerName ? `, ${signerName}` : ''}. Your signature has been recorded. You'll receive a copy from Huna Creatives.
          </p>
          <button
            onClick={() => navigate(`/c/${slug}`)}
            style={{ padding: '10px 24px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            View Signed Contract
          </button>
        </div>
      </div>
    );
  }

  if (contract.status === 'draft') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafaf9', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 16, color: '#374151', fontWeight: 600 }}>Contract not yet available for signing</p>
        <p style={{ fontSize: 13, color: '#9ca3af' }}>Please wait for Huna Creatives to send it your way.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={HUNA_LOGO_URL} alt="Huna Creatives" style={{ height: 32, width: 'auto' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <span style={{ fontSize: 13, color: '#6b7280' }}>Sign Contract</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Summary card */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: '#fff7f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ri-file-text-line" style={{ color: '#D64F1E', fontSize: 18 }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{contract.title}</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Huna Creatives · Cebu, Philippines</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            You are about to sign the contract above. Please make sure you have read the full document before proceeding.
            By typing your full name and clicking "Sign Contract", you agree to be legally bound by these terms.
          </p>
        </div>

        {/* Signing form */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 20 }}>Your Signature</h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Full Legal Name *
            </label>
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="Type your full name exactly as it appears on your ID"
              style={{ width: '100%', padding: '10px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box', fontFamily: 'Georgia, serif', transition: 'border-color 0.15s' }}
              onFocus={e => { e.target.style.borderColor = '#D64F1E'; }}
              onBlur={e => { e.target.style.borderColor = '#e5e7eb'; }}
            />
            {signerName && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#f9fafb', borderRadius: 6, borderLeft: '3px solid #D64F1E' }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px' }}>Signature preview</p>
                <p style={{ fontSize: 18, color: '#1f2937', margin: 0, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{signerName}</p>
              </div>
            )}
          </div>

          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', marginBottom: 20, padding: '12px 14px', background: '#fafaf9', borderRadius: 8, border: '1.5px solid #e5e7eb' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, accentColor: '#D64F1E', width: 14, height: 14 }}
            />
            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
              I have read and understood the full contract. I agree to all terms and conditions outlined above and accept them as legally binding.
            </span>
          </label>

          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={sign}
            disabled={!signerName.trim() || !agreed || signing}
            style={{ width: '100%', padding: '13px', background: (!signerName.trim() || !agreed || signing) ? '#d1d5db' : '#D64F1E', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: (!signerName.trim() || !agreed || signing) ? 'not-allowed' : 'pointer', transition: 'background 0.15s', letterSpacing: '0.02em' }}>
            {signing ? 'Signing...' : 'Sign Contract'}
          </button>

          <p style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center', marginTop: 14, lineHeight: 1.6, margin: '14px 0 0' }}>
            By signing, you agree this electronic signature is legally valid under R.A. 8792 (E-Commerce Act of the Philippines).
            Your name and timestamp will be recorded.
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => navigate(`/c/${slug}`)}
            style={{ background: 'none', border: 'none', fontSize: 13, color: '#9ca3af', cursor: 'pointer', padding: 0 }}>
            ← Back to contract
          </button>
        </div>
      </div>
    </div>
  );
}
