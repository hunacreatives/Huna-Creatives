// Comparison and pricing posts: the questions buyers ask AI assistants
// ("how much does branding cost in the Philippines", "freelancer or studio").
// Same BlogArticle shape as data.ts; listed first on /blog.
//
// Outside figures are dated and linked in each post's `sources`. When a price
// changes (ours or anyone's), update the post and set updatedIsoDate.
import type { BlogArticle } from './data';

const FRANCIS = {
  name: 'Francis Fiel Roble',
  role: 'Founder & Creative Director',
  avatar: '/images/team-francis-fiel-roble.webp',
};

const SRC = {
  ninetyNine: { label: '99designs — Logo design ("a professionally designed logo from $249"), checked October 2026', url: 'https://99designs.com/logo-design' },
  fiverr: { label: 'Fiverr Help Center — Creating a Gig (minimum starting price $5; some categories higher)', url: 'https://help.fiverr.com/hc/en-us/articles/360010451397-Creating-a-Gig' },
  hireTalent: { label: 'Hire Talent PH — What to pay Filipino graphic designers (January 2026)', url: 'https://hiretalent.ph/what-to-pay-filipino-graphic-designers' },
  indeed: { label: 'Indeed Philippines — Senior graphic artist salaries (July 2026)', url: 'https://ph.indeed.com/salaries/senior-graphic-artist-Salaries' },
  sss: { label: 'Forvis Mazars — SSS contribution rate increased to 15% (2025)', url: 'https://www.forvismazars.com/ph/en/insights/hr-payroll-alerts/sss-contribution-rates-increased-to-15' },
  philhealth: { label: 'Philstar — PhilHealth retains 5% premium rate for 2025', url: 'https://www.philstar.com/headlines/2025/01/14/2414018/philhealth-retains-premium-rate-amount-2025' },
  pagibig: { label: 'Forvis Mazars — Pag-IBIG Circular 460 (contribution cap)', url: 'https://forvismazars.com/ph/en/insights/hr-payroll-alerts/pag-ibig-circular-460' },
  pd851: { label: 'Presidential Decree No. 851 — 13th month pay (LawPhil)', url: 'https://lawphil.net/statutes/presdecs/pd1975/pd_851_1975.html' },
  laborCode: { label: 'Labor Code of the Philippines, PD 442 — Arts. 86, 87, 93, 94, 95 (LawPhil)', url: 'https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html' },
  kami: { label: 'KAMI — Payroll software vs spreadsheets in the Philippines (May 2026)', url: 'https://kamiworkforce.com/ph/blog/payroll-software-vs-spreadsheets-philippines/' },
  shopifyPricing: { label: 'Shopify Philippines — Pricing, checked October 2026', url: 'https://www.shopify.com/ph/pricing' },
  shopifyThemes: { label: 'Shopify Theme Store — paid themes, checked October 2026', url: 'https://themes.shopify.com/themes?price%5B%5D=paid' },
};

export const comparisonArticles: BlogArticle[] = [
  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'branding-cost-philippines',
    category: 'Brand Identity',
    title: 'How Much Does Branding Cost in the Philippines? (2026)',
    excerpt:
      'DIY, Fiverr, 99designs, a freelancer, or a studio: what each one costs in 2026, what you actually get for the money, and how to compare quotes that look nothing alike.',
    readTime: '8 min read',
    date: 'October 17, 2026',
    isoDate: '2026-10-17',
    heroImage: '/images/peak-coffee-app-cups.webp',
    heroImagePosition: 'center',
    author: FRANCIS,
    seo: {
      description:
        'What branding costs in the Philippines in 2026: DIY, Fiverr from $5, 99designs from $249, freelancers, and studio brand identities from ₱35,000. What each includes.',
      keywords: ['branding cost Philippines', 'logo design price Philippines', 'brand identity cost', 'how much is a logo Philippines', 'Cebu branding agency'],
    },
    verdict: [
      { option: 'DIY (Canva and similar)', bestFor: 'Testing an idea this week with no budget. Plan to replace it.' },
      { option: 'Fiverr or 99designs', bestFor: 'A logo file for a side project. You get a mark, not a system.' },
      { option: 'Philippine freelancer', bestFor: 'A defined job, if you find a strong one and can write the brief yourself.' },
      { option: 'Design studio', bestFor: 'A business that will print, sign, post and hire under this brand for years.' },
    ],
    body: [
      {
        type: 'paragraph',
        content:
          'Ask five people what branding costs in the Philippines and you will get five answers between free and six figures. They are not lying. They are pricing different things. A logo is one file. A brand identity is the logo plus the rules for using it — colours, type, layouts, and how it behaves on a cup, a sign, a payslip and an Instagram grid. Most of the price gap comes from that difference.',
      },
      { type: 'heading', content: 'What branding costs in the Philippines in 2026' },
      {
        type: 'table',
        content: 'Marketplace prices are in US dollars, as listed by each platform in October 2026. Huna prices are our published starting points.',
        columns: ['Option', 'What it costs', 'What you get', 'Timeline', 'Best for'],
        rows: [
          ['DIY (Canva and similar)', 'Free to a monthly subscription', 'A logo assembled from a template other businesses can use too', 'A day', 'Testing an idea before spending'],
          ['Fiverr', 'Gigs start at $5; each seller sets packages above that', 'Logo files, scoped by the seller’s package', 'Days', 'A logo for a side project'],
          ['99designs', 'From $249', 'A contest: several designers submit concepts, you pick one', 'Depends on the contest', 'Seeing many directions quickly'],
          ['Philippine freelancer', 'Quoted per job; varies widely', 'Whatever the brief and the person cover', 'Varies', 'Small jobs with a clear brief'],
          ['Huna Creatives (studio)', '₱35,000–₱150,000 in the PH; from $1,500 elsewhere', 'Strategy, logo suite, colour and type system, applications; full guidelines at the top of the range', '6–10 weeks', 'A brand that has to hold up for years'],
        ],
      },
      {
        type: 'callout',
        content:
          '<strong>Our prices, plainly:</strong> a Huna brand identity starts at ₱35,000 in the Philippines and $1,500 for clients abroad. A complete system with detailed brand guidelines sits near ₱150,000. Every quote is custom and comes back within 24 hours.',
      },
      { type: 'heading', content: 'Why the prices are so far apart' },
      {
        type: 'paragraph',
        content:
          'Two quotes for "a logo" can describe completely different jobs. Before comparing numbers, compare what is on the list. These are the things that move the price most:',
      },
      {
        type: 'list',
        content: 'What you are paying for:',
        items: [
          'Research before drawing — who the customers are, what competitors look like, where the brand has to live.',
          'How many directions you see. For Uji-Matcha Café we presented three before refining one.',
          'Applications. Peak Coffee Roasters needed the mark to work on cups, bean bags, menus, tasting cards, stickers and laser-cut signage.',
          'Guidelines — the document that lets a printer, a social media manager or a new hire use the brand without guessing.',
          'Files and ownership: every format you will need, and the rights in writing.',
        ],
      },
      {
        type: 'paragraph',
        content:
          'For a sense of scale: <a href="/blog/whisk-up-matcha-brand-identity-cebu">Whisk Up Matcha</a> was built from nothing in six weeks — a monstera-leaf mark that still reads stamped 16mm wide on a cup, a five-colour palette, and a logo suite in every colourway. <a href="/blog/peak-coffee-roasters-branding-cebu-it-park">Peak Coffee Roasters</a> took ten weeks because the job included packaging and signage, not just the mark.',
      },
      { type: 'cta', content: '' },
      { type: 'heading', content: 'The cheap option is rarely the cheap one' },
      {
        type: 'paragraph',
        content:
          'A ₱2,000 logo is inexpensive until it goes on a tarpaulin, a storefront, two hundred paper bags and a delivery rider’s shirt. Replacing a brand later means reprinting all of it. The logo was never the expensive part. Everything you put it on is.',
      },
      {
        type: 'paragraph',
        content:
          'That does not mean every business needs a studio on day one. If you are still testing whether people will buy, a template logo is a reasonable placeholder. The mistake is treating the placeholder as the brand once the business is real.',
      },
      { type: 'heading', content: 'How to compare branding quotes' },
      {
        type: 'list',
        content: 'Ask every designer or agency the same questions:',
        items: [
          'What exactly is delivered? Ask for the list of files and applications, not a description.',
          'How many directions will I see, and how many rounds of revisions are included?',
          'Is there research or strategy before design, or does drawing start on day one?',
          'Do I get brand guidelines, and how detailed are they?',
          'Who owns the final artwork, and is that written into the agreement?',
          'What is the timeline, and what do you need from me to keep it?',
        ],
      },
      {
        type: 'paragraph',
        content:
          'A quote that answers all six is easy to compare. A quote that only says "logo package" is not cheaper; it is unclear.',
      },
      { type: 'heading', content: 'Where Huna fits' },
      {
        type: 'paragraph',
        content:
          'If you need a logo file by Friday, we are the wrong call, and we will say so. If the brand has to work across signage, packaging, social media and hiring — and you would rather do it once — that is the work we do. See the full range on our <a href="/services">services page</a> or in the <a href="/portfolio/branding">branding portfolio</a>.',
      },
    ],
    faqs: [
      {
        q: 'How much does a logo cost in the Philippines?',
        a: 'Anywhere from free to six figures, depending on what is included. DIY tools are free or a monthly subscription. Fiverr gigs start at $5 and 99designs logos from $249. A full brand identity from a Philippine studio such as Huna Creatives starts at ₱35,000, with complete brand guideline systems near ₱150,000.',
      },
      {
        q: 'What is the difference between a logo and a brand identity?',
        a: 'A logo is the mark. A brand identity is the mark plus the system around it: colour palette, typefaces, layouts, logo variations, and guidelines for using them on packaging, signage, social media and documents.',
      },
      {
        q: 'How long does branding take?',
        a: 'A full brand identity at Huna takes six to ten weeks. Whisk Up Matcha took six weeks; Peak Coffee Roasters took ten because it included packaging and signage.',
      },
      {
        q: 'Do I own the logo after I pay?',
        a: 'You should, but only an agreement makes it certain. Ask for full ownership of the final artwork in writing before you pay the final invoice, whoever you hire.',
      },
      {
        q: 'Can businesses outside the Philippines work with Huna Creatives?',
        a: 'Yes. Brand identity work for international clients starts at $1,500, quoted in US dollars, with the same 24-hour quote turnaround.',
      },
    ],
    sources: [SRC.ninetyNine, SRC.fiverr],
    cta: {
      service: 'Brand Identity & Logo Design',
      heading: 'Get a brand identity quote in 24 hours.',
      body: 'Tell us what the brand has to do and where it has to live. From ₱35,000 in the Philippines, $1,500 elsewhere.',
      label: 'Get a Brand Quote',
    },
    relatedSlugs: ['whisk-up-matcha-brand-identity-cebu', 'peak-coffee-roasters-branding-cebu-it-park'],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'filipino-graphic-designer-vs-design-studio',
    category: 'Outsourcing',
    title: 'Hiring a Filipino Graphic Designer vs a Philippine Design Studio',
    excerpt:
      'For companies outside the Philippines: what a remote Filipino designer costs, what a studio costs, and the part nobody prices in — who manages the work.',
    readTime: '7 min read',
    date: 'October 17, 2026',
    isoDate: '2026-10-17',
    heroImage: '/images/uji-insta-merch.webp',
    heroImagePosition: 'center 40%',
    author: FRANCIS,
    seo: {
      description:
        'Outsourcing design to the Philippines: a remote Filipino designer ($450–$1,800/month) vs a project freelancer vs a design studio. Costs, management, and when each fits.',
      keywords: ['hire Filipino graphic designer', 'outsource graphic design Philippines', 'Philippine design agency', 'Filipino designer cost', 'design studio vs freelancer'],
    },
    verdict: [
      { option: 'Full-time remote designer', bestFor: 'Steady daily production of the same kind of work, with someone on your side to direct it.' },
      { option: 'Project freelancer', bestFor: 'One defined job with a clear brief and a fixed end.' },
      { option: 'Philippine design studio', bestFor: 'Brand, web and campaign work that needs several skills and one accountable lead.' },
    ],
    body: [
      {
        type: 'paragraph',
        content:
          'Filipino designers are good, English-fluent and affordable, which is why so many overseas companies hire them. The question is not whether to work with Philippine talent. It is which arrangement: one person on your payroll, a freelancer per project, or a studio. Each costs something different, and the biggest cost is not on the invoice.',
      },
      { type: 'heading', content: 'The three ways to hire design in the Philippines' },
      {
        type: 'table',
        content: 'Remote designer rates from Hire Talent PH (January 2026). Huna prices are published starting points, in US dollars.',
        columns: ['Option', 'Typical cost', 'Who manages the work', 'Skill range', 'When they are away', 'Best for'],
        rows: [
          ['Full-time remote designer', '$450–$800/month entry level; $900–$1,800 mid-level', 'You', 'One person’s', 'Work stops', 'Daily social graphics, ads, decks'],
          ['Project freelancer', 'Quoted per job, plus platform fees on Upwork or Fiverr', 'You', 'One person’s', 'Work stops', 'One-off jobs with a clear brief'],
          ['Philippine design studio (Huna)', 'Brand from $1,500; websites from $4,500; social retainers from $800/month', 'The studio’s lead', 'Brand, web, social, content, print', 'The studio covers it', 'Launches, rebrands, websites, campaigns'],
        ],
      },
      { type: 'heading', content: 'The cost nobody prices in: direction' },
      {
        type: 'paragraph',
        content:
          'A remote designer at $900 a month is a bargain if someone on your team writes clear briefs, reviews work daily and owns the brand decisions. Without that person, you get fast output with no point of view, and the hours you save on design get spent on feedback.',
      },
      {
        type: 'paragraph',
        content:
          'A studio costs more per hour because the direction is included. Someone reads your brief, pushes back on it, decides what good looks like, and checks the work before you see it. You are buying the judgment along with the hands.',
      },
      { type: 'cta', content: '' },
      { type: 'heading', content: 'When one remote designer is the right call' },
      {
        type: 'list',
        content: 'Hire a dedicated designer when:',
        items: [
          'The work is high-volume and repeatable — weekly social posts, ad variations, sales decks.',
          'Your brand system already exists, so the job is applying it, not inventing it.',
          'Someone in-house has time to direct them every day.',
        ],
      },
      { type: 'heading', content: 'When a studio is the better spend' },
      {
        type: 'list',
        content: 'Work with a studio when:',
        items: [
          'You are building or rebuilding the brand itself, and the foundation has to be right.',
          'The project needs several skills at once: strategy, identity, web, copy, photography.',
          'You need one accountable lead rather than another person to manage.',
          'The need is uneven — heavy for a launch, light for months after.',
        ],
      },
      {
        type: 'paragraph',
        content:
          'Many companies do both: a studio builds the system once, then a dedicated designer runs it day to day. That is usually the cheapest version of good.',
      },
      { type: 'heading', content: 'Working across time zones' },
      {
        type: 'paragraph',
        content:
          'Cebu is 12 to 13 hours ahead of New York, depending on daylight saving, and 15 to 16 hours ahead of the US West Coast. For project work that can be an advantage: feedback sent at the end of your day lands at the start of ours, so work moves while you sleep. International work is quoted in US dollars.',
      },
      {
        type: 'paragraph',
        content:
          'See what that looks like in practice in our <a href="/portfolio">portfolio</a>, or the starting prices on our <a href="/services">services page</a>.',
      },
    ],
    faqs: [
      {
        q: 'How much does it cost to hire a Filipino graphic designer?',
        a: 'For overseas companies, a full-time remote Filipino graphic designer typically costs $450–$800 a month at entry level and $900–$1,800 at mid-level, according to Hire Talent PH (January 2026). Project freelancers quote per job.',
      },
      {
        q: 'Is a Philippine design studio more expensive than a freelancer?',
        a: 'Per hour, usually yes. A studio includes creative direction, several skills and someone accountable for the result. At Huna Creatives, brand identities start at $1,500, websites at $4,500 and social media retainers at $800 a month.',
      },
      {
        q: 'Can I hire a studio for ongoing work, not just one project?',
        a: 'Yes. Huna runs monthly retainers for social media (from $800 a month) and content creation (from $1,200 a month), alongside one-off brand and web projects.',
      },
      {
        q: 'What time zone does a Cebu design studio work in?',
        a: 'Philippine Standard Time, UTC+8 — 12 to 13 hours ahead of New York. Feedback sent at the end of a US workday arrives at the start of the Philippine one.',
      },
    ],
    sources: [SRC.hireTalent],
    cta: {
      href: 'https://calendly.com/hunacreatives/30min',
      heading: 'Talk it through in 30 minutes.',
      body: 'Tell us what you need designed and how often. We will tell you honestly whether a studio, a freelancer or a hire fits better.',
      label: 'Book a 30-Minute Call',
    },
    relatedSlugs: ['branding-cost-philippines', 'content-creation-that-builds-authority'],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'in-house-graphic-designer-vs-design-studio-cost',
    category: 'Business',
    title: 'In-House Designer vs Design Studio: True Monthly Cost in the Philippines',
    excerpt:
      'A ₱25,000 designer does not cost ₱25,000. Here is the full monthly cost of a hire in 2026 — SSS, PhilHealth, Pag-IBIG, 13th month — next to what a studio retainer costs.',
    readTime: '7 min read',
    date: 'October 17, 2026',
    isoDate: '2026-10-17',
    heroImage: '/images/peak-coffee-app-menu.webp',
    heroImagePosition: 'center',
    author: FRANCIS,
    seo: {
      description:
        'The true monthly cost of an in-house graphic designer in the Philippines in 2026 (salary, SSS, PhilHealth, Pag-IBIG, 13th month) vs a design studio retainer.',
      keywords: ['in-house designer vs agency Philippines', 'graphic designer salary Philippines 2026', 'cost of hiring a designer Philippines', 'design retainer Philippines', 'SSS PhilHealth Pag-IBIG employer share'],
    },
    verdict: [
      { option: 'Hire in-house', bestFor: 'Design is daily, the formats repeat, and someone needs to be in the room.' },
      { option: 'Studio retainer', bestFor: 'Steady monthly work that spans social, print and campaigns, without a full-time hire.' },
      { option: 'Studio project', bestFor: 'A brand, website or launch that has to be built once and built properly.' },
    ],
    body: [
      {
        type: 'paragraph',
        content:
          'The salary is the number everyone compares. It is also the smallest part of the decision. An employee comes with government contributions, a 13th month, leave, equipment, software and the time it takes to hire them. A studio comes with none of that, and a different set of trade-offs.',
      },
      { type: 'heading', content: 'What a ₱25,000 designer actually costs per month' },
      {
        type: 'paragraph',
        content:
          'Hire Talent PH puts a mid-level graphic designer in Metro Manila at ₱21,000–₱30,000 a month (January 2026); Indeed lists senior graphic artists at an average of ₱30,465 (July 2026). Take ₱25,000 as the middle. Here is what the employer pays on top of it:',
      },
      {
        type: 'table',
        content: 'Employer shares at 2025–2026 rates. Employee shares are deducted from the salary and are not included.',
        columns: ['Cost', 'Per month', 'How it is worked out'],
        rows: [
          ['Basic salary', '₱25,000', 'Middle of the Metro Manila range'],
          ['SSS (employer share)', '₱2,530', '10% of the ₱25,000 salary credit, plus ₱30 employees’ compensation'],
          ['PhilHealth (employer share)', '₱625', 'Half of the 5% premium'],
          ['Pag-IBIG (employer share)', '₱200', '2%, capped at ₱200'],
          ['13th month pay', '₱2,083', '1/12 of the year’s basic salary'],
          ['Total', '₱30,438', 'About ₱365,000 a year — before equipment, software or hiring time'],
        ],
      },
      {
        type: 'paragraph',
        content:
          'That total still leaves out a computer that can run design software, the software licences, the weeks spent hiring, and cover when the designer is on leave — employees earn five days of service incentive leave a year after their first year, under the Labor Code.',
      },
      { type: 'heading', content: 'What the same money buys from a studio' },
      {
        type: 'table',
        content: 'Huna starting prices for Philippine clients. Final scope and price are quoted per client.',
        columns: ['Option', 'Monthly cost', 'What you get'],
        rows: [
          ['In-house designer', '₱30,400+', 'One person, full time, one skill set, managed by you'],
          ['Social media retainer', 'From ₱10,000', 'Planned and designed social content from a team'],
          ['Content creation retainer', 'From ₱20,000', 'Photography, video and copy alongside design'],
          ['Brand identity project', 'From ₱35,000 once', 'The system everything else is designed from'],
        ],
      },
      {
        type: 'callout',
        content:
          'A retainer is not a full-time designer, and it should not be sold as one. It is a fixed scope each month, delivered by people who also do strategy, photography and copy. If you need forty hours of design a week, every week, hire.',
      },
      { type: 'cta', content: '' },
      { type: 'heading', content: 'When hiring in-house wins' },
      {
        type: 'list',
        content: 'Hire when:',
        items: [
          'There is enough repeatable work to fill a full week, every week.',
          'Turnaround is measured in hours: same-day promos, store signage, sales collateral.',
          'Your brand system already exists and the job is applying it.',
          'Someone senior can direct the designer and review the work.',
        ],
      },
      { type: 'heading', content: 'When a studio wins' },
      {
        type: 'list',
        content: 'Use a studio when:',
        items: [
          'Your needs change month to month — social this month, packaging next.',
          'You need more than one skill: design plus copy, photography or web.',
          'The brand itself needs building or fixing first.',
          'You do not want to manage a creative hire, or carry the cost between busy months.',
        ],
      },
      {
        type: 'paragraph',
        content:
          'The two are not mutually exclusive. A common setup is a studio for the <a href="/blog/branding-cost-philippines">brand system</a> and campaigns, and one in-house designer who applies it day to day.',
      },
    ],
    faqs: [
      {
        q: 'How much does it cost to hire a graphic designer in the Philippines?',
        a: 'A mid-level designer in Metro Manila earns about ₱21,000–₱30,000 a month (Hire Talent PH, January 2026). On a ₱25,000 salary, the employer’s SSS, PhilHealth and Pag-IBIG shares plus 13th month pay bring the monthly cost to about ₱30,438, before equipment, software and hiring time.',
      },
      {
        q: 'What are the employer contributions for a ₱25,000 salary in 2026?',
        a: 'SSS ₱2,530 (10% of the salary credit plus ₱30 employees’ compensation), PhilHealth ₱625 (half of 5%), and Pag-IBIG ₱200 (2%, capped). 13th month pay adds about ₱2,083 a month.',
      },
      {
        q: 'Is a design agency cheaper than an in-house designer?',
        a: 'For uneven or varied work, usually yes: Huna’s social media retainers start at ₱10,000 a month and content retainers at ₱20,000. For forty hours of repeatable design a week, an in-house hire is better value.',
      },
    ],
    sources: [SRC.hireTalent, SRC.indeed, SRC.sss, SRC.philhealth, SRC.pagibig, SRC.pd851, SRC.laborCode],
    cta: {
      service: 'Digital Design (Social Media, Ads)',
      heading: 'See what a retainer would cover.',
      body: 'Tell us what you make each month. We will scope a retainer and quote it within 24 hours — from ₱10,000 a month.',
      label: 'Get a Retainer Quote',
    },
    relatedSlugs: ['filipino-graphic-designer-vs-design-studio', 'social-media-content-strategy-2025'],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'payroll-excel-vs-hr-software-philippines',
    category: 'Sentro OS',
    title: 'Payroll in Excel vs HR Software for Small Philippine Teams',
    excerpt:
      'Spreadsheets work until they don’t. The Philippine payroll rules a small team has to get right in 2026, where Excel breaks, and what the alternatives cost.',
    readTime: '8 min read',
    date: 'October 17, 2026',
    isoDate: '2026-10-17',
    heroImage: '/images/sentro/hub-payroll.webp',
    heroImagePosition: 'left top',
    author: FRANCIS,
    seo: {
      description:
        'Excel vs HR and payroll software for small Philippine businesses in 2026: SSS, PhilHealth, Pag-IBIG, 13th month, overtime and holiday rules, and what each option costs.',
      keywords: ['payroll Excel vs software Philippines', 'HR software small business Philippines', 'payroll system Philippines', 'SSS PhilHealth Pag-IBIG computation', 'Sentro OS'],
    },
    verdict: [
      { option: 'Excel or Google Sheets', bestFor: 'A handful of employees on fixed salaries, no overtime, and one person who understands every formula.' },
      { option: 'Off-the-shelf payroll app', bestFor: 'A standard setup you are happy to configure yourself, priced per employee.' },
      { option: 'Sentro OS', bestFor: 'Small teams that want attendance, leave, payroll, payslips and SOPs in one place — set up for them, not by them.' },
    ],
    body: [
      {
        type: 'paragraph',
        content:
          'Most small Philippine businesses run payroll in a spreadsheet, and for a while that is fine. The trouble is not the arithmetic. It is the rules: contribution tables that change, holiday premiums that depend on the calendar, overtime that depends on the day, and leave that has to land in the right cutoff. A spreadsheet holds all of that in one person’s head.',
      },
      { type: 'heading', content: 'What Philippine payroll has to get right' },
      {
        type: 'table',
        content: 'Rates as of 2025–2026. Sources are listed at the end of the post.',
        columns: ['Rule', 'What it requires', 'Where spreadsheets slip'],
        rows: [
          ['SSS', '15% of the monthly salary credit (10% employer, 5% employee); credit from ₱5,000 to ₱35,000', 'Bracket lookups copied from last year’s table'],
          ['PhilHealth', '5% premium split evenly, on a ₱10,000 floor and ₱100,000 ceiling', 'Floor and ceiling forgotten for low or high earners'],
          ['Pag-IBIG', '2% each from employer and employee, capped at ₱200', 'Cap not applied after a raise'],
          ['13th month pay', '1/12 of the year’s basic salary, paid by December 24', 'Mid-year hires and unpaid leave prorated by hand'],
          ['Overtime', '+25% of the hourly rate on ordinary days; more on rest days and holidays', 'Rest-day and holiday overtime treated as ordinary'],
          ['Night shift differential', '+10% for work between 10 PM and 6 AM', 'Shifts that cross midnight split wrongly'],
          ['Regular holidays', '200% of the daily rate if worked', 'Holiday calendar updated late, or not at all'],
          ['Service incentive leave', 'Five days a year after one year of service', 'Balances tracked in a separate file, or in chat'],
        ],
      },
      {
        type: 'paragraph',
        content:
          'None of these is hard on its own. Together, every cutoff, for every employee, they are where errors come from — and payroll errors are the kind employees notice first.',
      },
      { type: 'heading', content: 'What the options cost' },
      {
        type: 'table',
        content: 'Payroll app range from KAMI (May 2026). Sentro OS prices are current introductory rates.',
        columns: ['Option', 'Cost', 'Setup', 'Covers'],
        rows: [
          ['Excel or Google Sheets', 'Free, plus the hours each cutoff takes', 'You build it', 'Whatever you build and maintain'],
          ['Cloud payroll apps', 'Roughly ₱100–₱500 per employee a month', 'You configure it', 'Payroll, usually; HR modules vary by plan'],
          ['Sentro OS — Starter', '₱2,500/month for 5 seats, plus ₱15,000 one-time setup', 'We build it with you', 'Attendance, payroll, documents, projects'],
          ['Sentro OS — Growth', '₱5,999/month for 10 seats, plus ₱25,000 one-time setup', 'We build it with you', 'Adds overtime and time-off approvals, project payouts, audit log'],
        ],
      },
      {
        type: 'callout',
        content:
          '<strong>What Sentro OS is, plainly:</strong> not an app you sign up for. Each team gets its own instance, configured around its roles, schedules and pay types over two to four weeks, then maintained by us. That is why there is a setup fee. <a href="/sentro">See how it works</a>.',
      },
      { type: 'cta', content: '' },
      { type: 'heading', content: 'When a spreadsheet is enough' },
      {
        type: 'list',
        content: 'Stay on Excel if all of these are true:',
        items: [
          'Everyone is on a fixed monthly salary.',
          'Nobody works overtime, nights, rest days or holidays.',
          'One person owns the file, understands every formula, and has a backup.',
          'Leave requests are rare and easy to track.',
        ],
      },
      { type: 'heading', content: 'When it is time to move' },
      {
        type: 'list',
        content: 'Move when any of these start happening:',
        items: [
          'Payroll takes most of a day each cutoff.',
          'Hourly, fixed-rate and project-based employees share one payroll.',
          'Attendance lives in one place, leave in another, and payroll in a third.',
          'An employee has caught a payslip error.',
          'Only one person can run payroll, and they want a holiday.',
        ],
      },
      { type: 'heading', content: 'How Sentro OS handles it' },
      {
        type: 'paragraph',
        content:
          'We built Sentro OS for Huna first, then for clients. Employees punch in and out from Slack; the hub records the time, flags overtime and feeds it into payroll. Time off approved in the hub lands in the right cutoff automatically. For <a href="/blog/fs-architects-website-sentro-hub-staff-app">FS Architects</a>, the same system runs attendance, leave, payroll, payslips and staged appraisals, and installs on staff phones like an app.',
      },
    ],
    faqs: [
      {
        q: 'Can I do payroll in Excel in the Philippines?',
        a: 'Yes, for a small team on fixed salaries with no overtime, night work or holiday work. It gets risky once pay types mix, contribution tables change, or only one person understands the file.',
      },
      {
        q: 'How much is payroll software in the Philippines?',
        a: 'Cloud payroll apps run roughly ₱100–₱500 per employee a month (KAMI, May 2026). Sentro OS, which Huna Creatives sets up and maintains for each team, is ₱2,500 a month for 5 seats with a ₱15,000 setup, or ₱5,999 a month for 10 seats with a ₱25,000 setup.',
      },
      {
        q: 'What are the 2026 SSS, PhilHealth and Pag-IBIG rates?',
        a: 'SSS is 15% of the monthly salary credit (10% employer, 5% employee) on credits from ₱5,000 to ₱35,000. PhilHealth is 5%, split evenly, on a ₱10,000 floor and ₱100,000 ceiling. Pag-IBIG is 2% each from employer and employee, capped at ₱200.',
      },
      {
        q: 'Is Sentro OS a SaaS I can sign up for?',
        a: 'No. Each team gets its own instance, configured by Huna Creatives around how the team works over two to four weeks, then maintained after launch.',
      },
    ],
    sources: [SRC.sss, SRC.philhealth, SRC.pagibig, SRC.pd851, SRC.laborCode, SRC.kami],
    cta: {
      href: '/sentro',
      heading: 'See Sentro OS run a real payroll.',
      body: 'Attendance, leave, payroll and payslips in one hub, set up for your team. Try the live demo or book a call.',
      label: 'See Sentro OS',
    },
    relatedSlugs: ['sentro-os-hr-operations-hub-creative-agencies-philippines', 'fs-architects-website-sentro-hub-staff-app'],
  },

  // ─────────────────────────────────────────────────────────────────────
  {
    slug: 'shopify-theme-vs-custom-shopify-build-philippines',
    category: 'Web Design',
    title: 'Shopify Theme vs Custom Shopify Build in the Philippines',
    excerpt:
      'A theme gets you selling this week. A custom build gets you a store that looks like nobody else’s. What each costs in 2026, and how to tell which one you need.',
    readTime: '7 min read',
    date: 'October 17, 2026',
    isoDate: '2026-10-17',
    heroImage: '/images/hulma-cebu-preview.jpg',
    heroImagePosition: 'center top',
    author: FRANCIS,
    seo: {
      description:
        'Shopify theme ($0–$430) vs a custom Shopify build in the Philippines (from ₱70,000) in 2026: upfront cost, monthly cost, speed, and which one your store needs.',
      keywords: ['Shopify theme vs custom', 'custom Shopify store Philippines', 'Shopify developer Philippines cost', 'ecommerce website cost Philippines', 'Shopify pricing Philippines'],
    },
    verdict: [
      { option: 'Shopify theme', bestFor: 'A new store testing products, with a small catalog and a tight budget.' },
      { option: 'Custom Shopify build', bestFor: 'A brand that sells on how it looks and feels, and has outgrown a template.' },
    ],
    body: [
      {
        type: 'paragraph',
        content:
          'Shopify makes it possible to open a store in an afternoon. That is its strength and, eventually, its problem: thousands of stores start from the same few themes, and customers can tell. The question is not whether themes are bad. It is whether your store has reached the point where looking like everyone else costs you sales.',
      },
      { type: 'heading', content: 'What each option costs in 2026' },
      {
        type: 'table',
        content: 'Shopify prices in US dollars as listed on shopify.com/ph and the Theme Store in October 2026. Huna price is our starting point for a custom build.',
        columns: ['', 'Shopify theme', 'Custom Shopify build'],
        rows: [
          ['Upfront', '24 free themes; paid themes listed at about $150–$430', 'Huna custom builds from ₱70,000'],
          ['Shopify plan', 'Basic from $25/month, or $19/month billed yearly', 'Same — the plan does not change'],
          ['How it looks', 'Shared with every store on the same theme', 'Designed around your brand and products'],
          ['Speed', 'Fast until apps pile up for missing features', 'Features built in, fewer apps'],
          ['Changes later', 'Limited to the theme’s settings', 'Anything, by the team that built it'],
          ['Best for', 'Testing products quickly', 'A brand ready to look like itself'],
        ],
      },
      {
        type: 'callout',
        content:
          '<strong>Where we stand:</strong> Huna does not install or resell themes. Every site we build is custom. If a theme fits your store, you do not need us — and that is a fine place to be. When the budget is tight, we phase the build down rather than reach for a template.',
      },
      { type: 'heading', content: 'Why themes get expensive later' },
      {
        type: 'paragraph',
        content:
          'A theme covers the common case. Anything outside it — a size guide that knows your products, bundles, a lookbook, a wholesale form — usually becomes an app, and most apps are another monthly subscription. A few apps in, the store is slower, the monthly bill has grown, and the theme still looks like the one your competitor uses.',
      },
      {
        type: 'paragraph',
        content:
          'A custom build moves that cost to the front. You pay once to have the features designed into the store, and keep paying only the Shopify plan and whatever apps you genuinely need.',
      },
      { type: 'cta', content: '' },
      { type: 'heading', content: 'Start with a theme if' },
      {
        type: 'list',
        content: 'A theme is the right call when:',
        items: [
          'You are still finding out which products sell.',
          'The catalog is small and the product photos do the selling.',
          'You need to be live in days, not weeks.',
        ],
      },
      { type: 'heading', content: 'Go custom if' },
      {
        type: 'list',
        content: 'A custom build pays for itself when:',
        items: [
          'Your brand is part of what customers are buying.',
          'You are paying for several apps to fill gaps the theme leaves.',
          'The store has to do something specific — bookings, bundles, wholesale, multiple languages.',
          'You have proof people buy, and now want them to remember where.',
        ],
      },
      { type: 'heading', content: 'What a custom build looks like at Huna' },
      {
        type: 'paragraph',
        content:
          'We design the store from the brand outward, build it on Shopify so you keep its checkout and payments, and hand over a site your team can update. Not every client needs Shopify: for <a href="/blog/asana-ormoc-pilates-studio-website-booking-hub">Asana Ormoc</a> the job was a studio site with its own booking system, and for <a href="/blog/hulma-cebu-architectural-fiberglass-website">Hulma Cebu</a> a catalog and lead flow for architects. See more in our <a href="/portfolio/web-design">web design portfolio</a>.',
      },
    ],
    faqs: [
      {
        q: 'How much does a Shopify website cost in the Philippines?',
        a: 'The Shopify Basic plan is $25 a month, or $19 a month billed yearly (October 2026). Themes are free or a one-time $150–$430. A custom Shopify build from a Philippine studio such as Huna Creatives starts at ₱70,000.',
      },
      {
        q: 'Is a custom Shopify theme worth it?',
        a: 'When your brand is part of what customers buy, or you are paying for several apps to cover features the theme lacks. For a new store still testing products, a theme is usually the better first step.',
      },
      {
        q: 'Can I switch from a theme to a custom build later?',
        a: 'Yes. Products, customers and orders stay in Shopify; only the storefront is rebuilt. Many stores start on a theme and go custom once sales are proven.',
      },
      {
        q: 'Does Huna Creatives set up Shopify themes?',
        a: 'No. Huna builds custom sites only. If budget is tight, the build is phased rather than replaced with a template.',
      },
    ],
    sources: [SRC.shopifyPricing, SRC.shopifyThemes],
    cta: {
      service: 'Website Design',
      heading: 'Price a custom store.',
      body: 'Tell us what you sell and what the store has to do. Custom Shopify builds from ₱70,000, quoted within 24 hours.',
      label: 'Get a Web Quote',
    },
    relatedSlugs: ['asana-ormoc-pilates-studio-website-booking-hub', 'hulma-cebu-architectural-fiberglass-website'],
  },
];
