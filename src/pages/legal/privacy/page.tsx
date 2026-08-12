import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { useSEO } from '../../../hooks/useSEO';

const LAST_UPDATED = 'August 10, 2026';

export default function PrivacyPolicyPage() {
  useSEO({
    title: 'Privacy Policy — Huna Creatives',
    description: 'How Huna Creatives collects, uses, and protects your personal information.',
    canonical: '/privacy',
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 font-body">
      <Navigation invertOnScroll barTheme="light" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">Legal</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm sm:text-[15px] leading-relaxed text-gray-700">
          <section>
            <p>
              Huna Creatives ("Huna," "we," "us," or "our") respects your privacy. This policy explains what
              information we collect when you visit hunacreatives.com or work with us, how we use it, and the
              choices you have. By using this site, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Information you give us directly</strong> — your name, email, phone number, and project details when you submit a contact, project inquiry, or job application form.</li>
              <li><strong>Application materials</strong> — resumes, portfolio links, and related files submitted through our Careers page.</li>
              <li><strong>Usage data</strong> — pages visited, general location (country/city level), device and browser type, and how you interact with the site, collected automatically via analytics (see Cookies &amp; Analytics below).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Cookies &amp; Analytics</h2>
            <p className="mb-2">
              We use Google Analytics to understand how visitors use our site so we can improve it. Google
              Analytics uses cookies and similar technologies to collect anonymized/aggregated usage data.
            </p>
            <p>
              On your first visit, we ask for your consent before any analytics cookies are set. You can accept
              or decline at any time via the cookie banner, and your choice is remembered on this device. Declining
              does not affect your ability to browse the site or contact us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To respond to inquiries and provide quotes or proposals for creative services.</li>
              <li>To evaluate job applications submitted through our Careers page.</li>
              <li>To understand site usage and improve content, design, and performance.</li>
              <li>To communicate with existing clients about active projects.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Third-Party Services</h2>
            <p>
              We use trusted third-party services to operate this site and our business, including hosting
              (Vercel), database and backend infrastructure (Supabase), email delivery, and cloud storage for
              application materials (Google Drive). These providers only receive the information necessary to
              perform their function and are bound by their own privacy and security practices.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Rights</h2>
            <p>
              Under the Philippine Data Privacy Act of 2012, you have the right to access, correct, or request
              deletion of your personal information, and to object to or withdraw consent for its processing.
              To exercise any of these rights, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Retention</h2>
            <p>
              We retain contact and project information for as long as needed to provide our services and comply
              with legal obligations. Job application materials are retained for a reasonable evaluation period
              and deleted or anonymized afterward unless you're hired or ask us to keep them on file.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. The "Last updated" date at the top reflects the most
              recent revision. Continued use of the site after changes means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact Us</h2>
            <p>
              Questions about this policy or your data? Reach us at{' '}
              <a href="mailto:contact@hunacreatives.com" className="text-orange-600 hover:underline">contact@hunacreatives.com</a>{' '}
              or (032) 505 6921.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
