import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

const SUPABASE_URL =
  (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string)
  || (import.meta.env.VITE_SUPABASE_URL as string)
  || '';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  || '';

interface PaymentLinkData {
  id: string;
  token: string;
  client_name: string;
  project_name: string;
  invoice_number: string;
  to_email: string;
  amount_due: number;
  due_date: string | null;
  line_items: { description: string; amount: string }[] | null;
  payment_terms: string | null;
  reference: string | null;
  status: 'open' | 'paid' | 'closed';
  paymongo_checkout_url: string | null;
  paid_at: string | null;
}

const fmt = (n: number | null) =>
  n == null ? '—' : `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const POLL_INTERVAL_MS = 5000;

export default function PublicPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const isDemoToken = token === 'demo' || token === 'preview';
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [link, setLink] = useState<PaymentLinkData | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const pollRef = useRef<number | null>(null);

  const fetchLink = async (): Promise<PaymentLinkData | null> => {
    if (!token) return null;
    if (isDemoToken) {
      let previewData = null;
      try {
        const stored = window.sessionStorage.getItem('previewInvoiceData');
        if (stored) previewData = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse preview invoice data:', e);
      }
      const qp = new URLSearchParams(window.location.search);
      const clientFromUrl = qp.get('client');
      if (token === 'preview' && clientFromUrl) {
        return {
          id: 'preview', token: 'preview',
          client_name: clientFromUrl,
          project_name: qp.get('project') || 'Project',
          invoice_number: qp.get('invoice') || '0000',
          to_email: '',
          amount_due: parseFloat(qp.get('amount') || '0') || 0,
          due_date: qp.get('due') || null,
          line_items: [{ description: qp.get('service') || 'Service', amount: qp.get('amount') || '0' }],
          payment_terms: null, reference: null, status: 'open',
          paymongo_checkout_url: null, paid_at: null,
        };
      }
      if (token === 'preview' && previewData) {
        return {
          id: 'preview', token: 'preview',
          client_name: previewData.client || 'Client Name',
          project_name: previewData.project || 'Project Name',
          invoice_number: previewData.invoice || '0000',
          to_email: '',
          amount_due: previewData.amount || 0,
          due_date: previewData.due || null,
          line_items: [{ description: previewData.service || 'Service', amount: String(previewData.amount || 0) }],
          payment_terms: null, reference: null, status: 'open',
          paymongo_checkout_url: null, paid_at: null,
        };
      }
      return {
        id: 'demo', token: 'demo', client_name: 'FS Architects', project_name: 'fsarchitects.ph',
        invoice_number: '0001', to_email: 'billing@example.com', amount_due: 28864.54,
        due_date: null, line_items: [{ description: 'Website Design', amount: '48864.54' }],
        payment_terms: 'Due upon receipt', reference: 'INV-0001', status: 'open',
        paymongo_checkout_url: null, paid_at: null,
      };
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-payment-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ token: token.trim() }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.ok || !body.link) return null;
    return body.link as PaymentLinkData;
  };

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetchLink()
      .then((data) => {
        if (!data) { setNotFound(true); return; }
        setLink(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Poll for payment confirmation while the client is away paying (e.g. in the
  // GCash app), plus re-check the moment they switch back to this tab.
  useEffect(() => {
    if (isDemoToken || !link || link.status === 'paid') return;

    const check = () => {
      fetchLink().then((data) => { if (data) setLink(data); }).catch(() => {});
    };
    pollRef.current = window.setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [link, isDemoToken]);

  const payNow = () => {
    if (!link?.paymongo_checkout_url) return;
    setRedirecting(true);
    window.location.href = link.paymongo_checkout_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-2xl text-gray-400"></i>
      </div>
    );
  }

  if (notFound || !link) {
    return (
      <div className="min-h-screen bg-[#f5f4f0] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-xl text-gray-400"></i>
          </div>
          <h1 className="text-lg font-bold text-[#111827]">Payment link unavailable</h1>
          <p className="text-sm text-gray-500 mt-2">This payment link is invalid, expired, or no longer active.</p>
        </div>
      </div>
    );
  }

  if (link.status === 'paid') {
    return (
      <div className="min-h-screen bg-[#f5f4f0]">
        <div className="bg-[#111827] px-6 py-4">
          <div className="max-w-xl mx-auto">
            <img src="https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-6" />
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-10 space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
              <i className="ri-check-double-line text-2xl text-emerald-600"></i>
            </div>
            <h1 className="text-2xl font-bold text-[#111827] mt-5">Payment confirmed!</h1>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Thanks for your payment for <span className="font-semibold text-[#111827]">{link.project_name}</span>. A receipt has been sent to your email.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs text-gray-500">
              <i className="ri-mail-line text-gray-400"></i>
              Questions? <a href="mailto:contact@hunacreatives.com" className="text-[#FF6B35] font-medium">contact@hunacreatives.com</a>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Explore Our Services</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <a href="https://www.hunacreatives.com/portfolio/web-design" target="_blank" rel="noreferrer"
                className="flex flex-col gap-2 px-5 py-5 hover:bg-gray-50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <i className="ri-computer-line text-sm text-[#FF6B35]"></i>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827] group-hover:text-[#FF6B35] transition-colors">Website Design</p>
                  <p className="text-xs text-gray-400 mt-0.5">Custom sites that convert</p>
                </div>
                <i className="ri-arrow-right-up-line text-xs text-gray-300 group-hover:text-[#FF6B35] transition-colors mt-auto"></i>
              </a>
              <a href="https://www.hunacreatives.com/portfolio/social-media" target="_blank" rel="noreferrer"
                className="flex flex-col gap-2 px-5 py-5 hover:bg-gray-50 transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center">
                  <i className="ri-instagram-line text-sm text-sky-500"></i>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111827] group-hover:text-[#FF6B35] transition-colors">Social Media Marketing</p>
                  <p className="text-xs text-gray-400 mt-0.5">Content & growth strategy</p>
                </div>
                <i className="ri-arrow-right-up-line text-xs text-gray-300 group-hover:text-[#FF6B35] transition-colors mt-auto"></i>
              </a>
            </div>
            <div className="px-5 pb-4 pt-1 border-t border-gray-50">
              <a href="https://hunacreatives.com/services" target="_blank" rel="noreferrer"
                className="text-xs text-[#FF6B35] font-medium hover:underline flex items-center gap-1">
                View all services <i className="ri-arrow-right-line"></i>
              </a>
            </div>
          </div>

          <a href="https://hunacreatives.com/sentro" target="_blank" rel="noreferrer"
            className="block bg-[#111827] rounded-2xl p-6 group hover:bg-[#0b1220] transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">Introducing</span>
                <h3 className="text-lg font-bold text-white mt-1">Sentro OS</h3>
                <p className="text-sm text-white/60 mt-1.5 leading-relaxed">
                  A smarter way to run your business — clients, projects, invoicing, and your team, all in one place.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF6B35]">
                  Learn more <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform"></i>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <i className="ri-layout-grid-line text-xl text-white/70"></i>
              </div>
            </div>
          </a>

          <p className="text-center text-xs text-gray-400 pb-2">© {new Date().getFullYear()} Huna Creatives</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0]">
      <div className="bg-[#111827] px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <img src="https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" className="h-6" />
          <span className="text-[10px] uppercase tracking-widest text-white/40">Secure Payment</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-4">

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 pt-6 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-[#FF6B35] font-semibold">Invoice Payment</p>
            <h1 className="text-xl font-bold text-[#111827] mt-1">{link.project_name}</h1>
            <p className="text-sm text-gray-500 mt-1">Hi {link.client_name.split(' ')[0]}, here's your outstanding balance.</p>
          </div>

          <div className="mx-6 mb-5 bg-[#111827] rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/50">Balance Due</p>
              <p className="text-2xl font-bold text-white mt-0.5">{fmt(link.amount_due)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/50">Invoice</p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">#{link.invoice_number.padStart(4, '0')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            <MetaCell label="Client" value={link.client_name} />
            <MetaCell label="Due" value={link.due_date ? new Date(`${link.due_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'} />
            <MetaCell label="Project" value={link.project_name} />
          </div>
        </div>

        {link.paymongo_checkout_url ? (
          <button onClick={payNow} disabled={redirecting || isDemoToken}
            className="w-full py-4 rounded-2xl bg-[#FF6B35] text-white text-base font-bold hover:bg-[#ea5c28] transition-colors cursor-pointer shadow-sm disabled:opacity-60">
            {redirecting ? 'Redirecting…' : isDemoToken ? 'Pay Now (demo — disabled)' : 'Pay Now'}
          </button>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-500">We couldn't generate your payment link. Please refresh this page.</p>
            <button onClick={() => window.location.reload()}
              className="mt-4 px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
              Refresh
            </button>
          </div>
        )}

        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-[#FF6B35]">How it works</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Tap Pay Now — you'll be taken to a secure checkout page.</li>
            <li>• Scan the QR code with GCash, Maya, or your bank's app.</li>
            <li>• Come back here — this page confirms automatically once payment clears.</li>
          </ul>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">
          Questions? Email{' '}
          <a href="mailto:contact@hunacreatives.com" className="text-gray-500 underline underline-offset-2">contact@hunacreatives.com</a>
          {' '}— please do not reply to invoice emails directly.
        </p>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-xs font-semibold text-[#111827] mt-0.5 truncate">{value}</p>
    </div>
  );
}
