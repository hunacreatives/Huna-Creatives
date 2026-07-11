import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { HubClientContract } from '@/lib/types';
import { HUNA_LOGO, FRANCIS_SIG } from '@/pages/hub/admin/documents/contractAssets';

function fmtDate(iso: string) {
  return new Date(iso + (iso.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

const CONTRACT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');

  .contract-doc { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; line-height: 1.65; }
  .contract-doc h1.contract-title { font-size: 20pt; font-weight: 800; color: #111; margin: 0 0 6pt; text-transform: uppercase; letter-spacing: 0.02em; }
  .contract-doc p.contract-subtitle { font-size: 10.5pt; font-weight: 700; margin: 0 0 14pt; color: #111; }
  .contract-doc h2.section-between { font-size: 14pt; font-weight: 800; margin: 20pt 0 8pt; text-transform: uppercase; }
  .contract-doc h2 { font-size: 13pt; font-weight: 800; margin: 20pt 0 6pt; text-transform: uppercase; color: #111; }
  .contract-doc h3 { font-size: 10.5pt; font-weight: 700; margin: 12pt 0 4pt; color: #111; }
  .contract-doc p { margin: 0 0 8pt; text-align: justify; }
  .contract-doc ul { margin: 4pt 0 8pt 18pt; padding: 0; }
  .contract-doc ul li { margin-bottom: 4pt; text-align: justify; }
  .contract-doc hr.section-divider { border: none; border-top: 1px solid #d1d5db; margin: 16pt 0; }
  .contract-doc strong.highlight { color: #D64F1E; }
  .contract-doc table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 10pt; }
  .contract-doc th { background: #e8f5e9; font-weight: 700; border: 1px solid #aaa; padding: 5pt 8pt; text-align: left; }
  .contract-doc td { border: 1px solid #ccc; padding: 5pt 8pt; vertical-align: top; }
`;

export default function ClientContractPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<HubClientContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #D64F1E', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (notFound || !contract) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 18, color: '#374151', fontWeight: 600 }}>Contract not found</p>
        <p style={{ fontSize: 14, color: '#9ca3af' }}>This link may be invalid or no longer available.</p>
      </div>
    );
  }

  const isSigned = contract.status === 'signed';
  const canSign = contract.status === 'sent';
  // Contractor agreements reuse this page; only the party labels change.
  const isContractor = !!contract.contractor_id;
  const hunaRole = isContractor ? 'Company' : 'Service Provider';
  const signerParty = isContractor ? 'CONTRACTOR' : 'CLIENT';
  const signerRole = isContractor ? 'Independent Contractor' : 'Authorized Representative';

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f4', fontFamily: 'system-ui, sans-serif' }}>
      <style>{CONTRACT_STYLES}</style>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={HUNA_LOGO} alt="Huna Creatives" style={{ height: 28, width: 'auto' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>|</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>{contract.title}</span>
        </div>
        {isSigned ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '4px 10px' }}>
            <i className="ri-shield-check-fill" style={{ color: '#16a34a', fontSize: 13 }} />
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Signed · {fmtDate(contract.signed_at!)}</span>
          </div>
        ) : canSign ? (
          <button
            onClick={() => navigate(`/c/${slug}/sign`)}
            style={{ padding: '7px 16px', background: '#D64F1E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Sign Contract
          </button>
        ) : (
          <span style={{ fontSize: 11, background: '#f3f4f6', color: '#9ca3af', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>Draft</span>
        )}
      </div>

      {/* Document */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ background: '#fff', boxShadow: '0 2px 20px rgba(0,0,0,0.07)', borderRadius: 4, overflow: 'hidden' }}>

          {/* Letterhead — every page would repeat this in print */}
          <div style={{ padding: '24px 52px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <img src={HUNA_LOGO} alt="Huna Creatives" style={{ height: 52, width: 'auto', display: 'block' }} />
                <p style={{ fontSize: 9, color: '#555', fontStyle: 'italic', marginTop: 4, fontFamily: 'Arial, sans-serif' }}>Let's bring your <em>hunahuna</em> to life.</p>
              </div>
              <div style={{ textAlign: 'right', fontSize: 9, color: '#444', lineHeight: 1.8, fontFamily: 'Arial, sans-serif' }}>
                (032) 505 6921 | +63 952 447 2602<br />
                contact@hunacreatives.com<br />
                Cebu, Philippines, 6004
              </div>
            </div>
            <div style={{ height: 3, background: 'linear-gradient(to right, #D64F1E 40%, #e5e7eb 40%)', marginBottom: 28 }} />
          </div>

          {/* Contract body */}
          <div
            className="contract-doc"
            style={{ padding: '0 52px 48px' }}
            dangerouslySetInnerHTML={{ __html: contract.body }}
          />

          {/* Signature block */}
          <div style={{ padding: '0 52px 48px', borderTop: '1px solid #e5e7eb', marginTop: 8 }}>
            {isSigned ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 32 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, margin: '0 0 2px', fontFamily: 'Arial, sans-serif' }}>HUNA CREATIVES</p>
                    <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>{hunaRole}</p>
                    <div style={{ height: 60, marginBottom: 4, background: '#fafafa', borderRadius: 4, display: 'flex', alignItems: 'center' }}>
                      <img src={FRANCIS_SIG} style={{ height: 52, width: 'auto', maxWidth: 200, mixBlendMode: 'multiply' }} alt="Signature" />
                    </div>
                    <div style={{ borderTop: '1px solid #111', paddingTop: 4 }}>
                      <p style={{ fontSize: 8.5, color: '#6b7280', margin: 0, fontFamily: 'Arial, sans-serif' }}>Francis Fiel Roble · {fmtDate(contract.created_at!)}</p>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, margin: '0 0 2px', fontFamily: 'Arial, sans-serif' }}>{signerParty}</p>
                    <p style={{ fontSize: 9, color: '#6b7280', margin: '0 0 16px', fontFamily: 'Arial, sans-serif' }}>{signerRole}</p>
                    <div style={{ height: 60, marginBottom: 4, borderBottom: '1px solid #111', display: 'flex', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 26, fontFamily: "'Dancing Script', Georgia, cursive", color: '#1f2937', paddingBottom: 6, lineHeight: 1 }}>{contract.signer_name}</span>
                    </div>
                    <div style={{ paddingTop: 4 }}>
                      <p style={{ fontSize: 8.5, color: '#6b7280', margin: 0, fontFamily: 'Arial, sans-serif' }}>{contract.signer_name} · {fmtDate(contract.signed_at!)}</p>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 20, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ri-shield-check-fill" style={{ color: '#16a34a', fontSize: 15, flexShrink: 0 }} />
                  <p style={{ fontSize: 10, color: '#15803d', margin: 0, fontFamily: 'Arial, sans-serif' }}>
                    Electronically signed by <strong>{contract.signer_name}</strong> on {fmtDate(contract.signed_at!)}. Valid under R.A. 8792 (Electronic Commerce Act of the Philippines).
                  </p>
                </div>
              </>
            ) : canSign ? (
              <div style={{ marginTop: 28 }}>
                <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 14px', fontFamily: 'Arial, sans-serif' }}>
                  Please read the full agreement above before signing. By signing, you accept all terms.
                </p>
                <button
                  onClick={() => navigate(`/c/${slug}/sign`)}
                  style={{ padding: '12px 28px', background: '#D64F1E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em' }}>
                  Review & Sign This Contract →
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 24 }}>This contract is in draft status and not yet open for signing.</p>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', marginTop: 20 }}>
          Sent via Huna Creatives · contact@hunacreatives.com · Cebu, Philippines
        </p>
      </div>
    </div>
  );
}
