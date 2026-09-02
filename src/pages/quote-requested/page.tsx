import { useSearchParams } from 'react-router-dom';
import Navigation from '../../components/feature/Navigation';
import Footer from '../home/components/Footer';
import { useSEO } from '../../hooks/useSEO';

// Landing page the request-quotation edge function redirects to after a
// prospect clicks "Request a formal quotation" in a contact reply email.
// Supabase edge functions can't serve rendered HTML (the gateway forces
// text/plain + a sandbox CSP), so the function does its work and 302s here
// with ?s=<status>.

type Status = 'ok' | 'already' | 'invalid' | 'error';

const COPY: Record<Status, { heading: string; body: string }> = {
  ok: {
    heading: "Thank you — we're on it.",
    body: 'We’ve received your request for a formal quotation. Someone from the team will put one together and send it to your inbox shortly. You can close this tab.',
  },
  already: {
    heading: "You're all set.",
    body: 'We’ve already logged your request and someone from the team is on it. We’ll be in touch by email shortly.',
  },
  invalid: {
    heading: "This link isn't valid.",
    body: 'It may have expired or been mistyped. Just reply to our email and we’ll sort out your quotation directly.',
  },
  error: {
    heading: 'We hit a snag.',
    body: 'We couldn’t record your request just now. Please reply to our email and we’ll take care of it for you.',
  },
};

export default function QuoteRequestedPage() {
  const [params] = useSearchParams();
  const raw = params.get('s') as Status | null;
  const status: Status = raw && raw in COPY ? raw : 'ok';
  const { heading, body } = COPY[status];

  useSEO({
    title: 'Quotation Requested — Huna Creatives',
    description: 'Your request for a formal quotation has been received.',
    canonical: '/quote-requested',
  });

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#243037] font-body flex flex-col">
      <Navigation invertOnScroll />

      <main className="flex-1 flex items-center justify-center px-5 py-32">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-[#243037]/8 shadow-[0_20px_60px_rgba(36,48,55,0.10)] overflow-hidden">
          <div className="h-1.5 bg-[#FF5B05]" />
          <div className="px-8 sm:px-10 py-10 sm:py-12 text-center">
            <div className="mx-auto mb-6 h-12 w-12 rounded-full bg-[#FF5B05]/10 flex items-center justify-center">
              <i className={`${status === 'ok' || status === 'already' ? 'ri-check-line' : 'ri-error-warning-line'} text-2xl text-[#FF5B05]`} />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-[#243037]">
              {heading}
            </h1>
            <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-[#243037]/60">
              {body}
            </p>
            <a
              href="https://www.hunacreatives.com"
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-full bg-[#243037] text-white text-xs font-semibold tracking-wide uppercase hover:bg-[#075056] transition-colors"
            >
              Back to Huna Creatives
              <i className="ri-arrow-right-line" />
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
