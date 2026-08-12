import Navigation from '../../../components/feature/Navigation';
import Footer from '../../home/components/Footer';
import { useSEO } from '../../../hooks/useSEO';

const LAST_UPDATED = 'August 10, 2026';

export default function TermsOfServicePage() {
  useSEO({
    title: 'Terms of Service — Huna Creatives',
    description: 'The terms that govern your use of hunacreatives.com and our creative services.',
    canonical: '/terms',
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 font-body">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-[#2D5A5D]">Legal</span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold font-display leading-tight text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-8 text-sm sm:text-[15px] leading-relaxed text-gray-700">
          <section>
            <p>
              These Terms of Service ("Terms") govern your use of hunacreatives.com (the "Site") and your
              engagement with Huna Creatives ("Huna," "we," "us," or "our") for creative services. By using the
              Site or engaging our services, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Use of the Site</h2>
            <p>
              You may browse the Site and use its forms (contact, project inquiry, careers) for their intended
              purpose. You agree not to misuse the Site — including attempting to disrupt its operation, scrape
              content without permission, or submit false or misleading information through our forms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Services &amp; Engagements</h2>
            <p>
              Content on this Site — including pricing indicators, service descriptions, and portfolio work — is
              for informational purposes and does not constitute a binding offer. Actual project scope, pricing,
              timelines, and deliverables are defined in a separate proposal, quote, or signed agreement between
              Huna Creatives and the client, which governs that engagement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Intellectual Property</h2>
            <p>
              Unless otherwise agreed in a signed client contract, all content on this Site — including the Huna
              Creatives name, logo, portfolio work, and site design — is the property of Huna Creatives and may not
              be reproduced or used without our written permission. Ownership and licensing of work delivered to
              clients is governed by the applicable project agreement, not by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Job Applications</h2>
            <p>
              By submitting an application through our Careers page, you confirm that the information and files
              provided are accurate and that you have the right to share them with us. Submitting an application
              does not guarantee an interview, offer, or response.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Disclaimer &amp; Limitation of Liability</h2>
            <p>
              The Site is provided "as is" without warranties of any kind. To the fullest extent permitted by law,
              Huna Creatives is not liable for any indirect, incidental, or consequential damages arising from your
              use of the Site. This does not limit any warranties or liability terms set out in a signed client
              agreement, which take precedence for that engagement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Third-Party Links</h2>
            <p>
              The Site may link to third-party websites (e.g. social media, portfolio pieces hosted elsewhere). We
              aren't responsible for the content or practices of sites we don't operate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of the Philippines. Any disputes arising from
              these Terms or use of the Site will be subject to the exclusive jurisdiction of the courts of Cebu
              City, Philippines.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. The "Last updated" date above reflects the most recent
              revision. Continued use of the Site after changes means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact Us</h2>
            <p>
              Questions about these Terms? Reach us at{' '}
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
