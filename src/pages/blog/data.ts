export interface BlogArticle {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
  isoDate: string;
  heroImage: string;
  heroImagePosition?: string;
  author: { name: string; role: string; avatar: string };
  seo: {
    description: string;
    keywords: string[];
  };
  body: {
    type: 'heading' | 'paragraph' | 'quote' | 'list';
    content: string;
    items?: string[];
  }[];
  cta: { heading: string; body: string };
  relatedSlugs: string[];
}

export const blogArticles: BlogArticle[] = [
  {
    slug: 'fs-architects-website-sentro-hub-staff-app',
    category: 'Case Study',
    title: 'FS Architects: A Website, an Operations Hub, and a Staff App',
    excerpt:
      'Most studios need a portfolio site. FS Architects needed that plus somewhere to run the practice \u2014 payroll, leave, appraisals and project operations \u2014 and a way for staff to reach it from a phone. Three builds, one system.',
    readTime: '7 min read',
    date: 'August 22, 2026',
    isoDate: '2026-08-22',
    heroImage: '/images/fsarchitects-home.png',
    author: {
      name: 'Francis Fiel Roble',
      role: 'Founder & Creative Director',
      avatar: '/images/team-francis-fiel-roble.webp',
    },
    seo: {
      description:
        'How Huna Creatives built the FS Architects website, a custom Sentro operations hub, and an installable staff app \u2014 web design and development for an architecture practice in the Philippines.',
      keywords: [
        'architecture website design Philippines',
        'web development Philippines',
        'HR software Philippines',
        'custom staff app Philippines',
        'architecture firm branding',
        'Sentro OS',
        'FS Architects',
        'Huna Creatives',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'An architecture practice has two audiences that never meet. There are clients, who need to see the work and understand whether this studio can be trusted with a building. And there is the team, who need to file leave, log hours, and keep projects moving. Most studios solve the first with a website and the second with a spreadsheet.',
      },
      {
        type: 'paragraph',
        content:
          'FS Architects decided to solve both properly. What we built for them at <a href="https://fsarchitects.ph" target="_blank" rel="noopener noreferrer">fsarchitects.ph</a> is really three things: the public site, their own instance of our operations hub, and an installable app so the team can reach it from a phone.',
      },
      { type: 'heading', content: 'The site: let the buildings be the loudest thing' },
      {
        type: 'paragraph',
        content:
          'Architecture sites fail in a specific way \u2014 they over-design around the work until the interface competes with the buildings. We went the other direction. A quiet, gallery-like presentation, generous space, and project pages that let a render fill the screen without a caption fighting for attention.',
      },
      {
        type: 'paragraph',
        content:
          'The practice works across Mindanao and takes commissions from commercial clients like BYD Butuan through to private residences, so the site runs trilingual navigation \u2014 English, Spanish and Chinese \u2014 rather than assuming every prospective client reads the same language. That is a structural decision, not a plugin: it shapes how every page is built.',
      },
      {
        type: 'quote',
        content:
          'For an architecture studio, restraint is the credential. If your website is the loudest thing you have designed, that tells a client something.',
      },
      { type: 'heading', content: 'The hub: where the practice actually runs' },
      {
        type: 'paragraph',
        content:
          'Behind the public site sits their own instance of <a href="/blog/sentro-os-hr-operations-hub-creative-agencies-philippines">Sentro</a>, the HR and operations hub we built for creative teams in the Philippines. Not a generic SaaS subscription \u2014 their own deployment, shaped to how the practice works.',
      },
      {
        type: 'list',
        content: 'What it handles day to day:',
        items: [
          'Attendance and daily hours, feeding directly into payroll instead of being retyped',
          'Leave and time-off requests, with the practice\u2019s own policy encoded rather than approximated',
          'Payroll runs, payslips and the approval trail behind them',
          'Performance appraisals as a staged workflow, not a form emailed around',
          'Project and task tracking, so studio operations sit next to the people data',
        ],
      },
      {
        type: 'paragraph',
        content:
          'The detail that matters most there is the last-mile one: time off flows into payroll automatically. That single connection removes an entire category of month-end reconciliation, which is the sort of thing nobody notices when it works and everybody notices when it does not.',
      },
      { type: 'heading', content: 'The app: because nobody clocks in at a desktop' },
      {
        type: 'paragraph',
        content:
          'A hub only earns its keep if people actually use it, and staff are rarely at a laptop when they need to file a request or clock in. So the hub is also an installable app \u2014 it sits on the home screen with its own icon, opens straight to login without browser furniture, and keeps working through the patchy connectivity that is a fact of life on site.',
      },
      {
        type: 'paragraph',
        content:
          'We built it as a progressive web app rather than shipping to the app stores. For an internal tool used by one practice, store review cycles and separate iOS and Android codebases are cost with no return. Staff install it from a link, and updates reach everyone the moment we deploy.',
      },
      { type: 'heading', content: 'Why one team for all three' },
      {
        type: 'paragraph',
        content:
          'These are usually three separate vendors: an agency for the site, a SaaS subscription for HR, and a developer for anything custom. The seams between them are where the cost hides \u2014 data retyped between systems, branding drifting apart, and nobody owning the parts in between.',
      },
      {
        type: 'paragraph',
        content:
          'Running it as one engagement meant the public site, the hub and the app share a visual language and a codebase lineage. You can see the site itself in our <a href="/portfolio/web-design">web design portfolio</a>, alongside work like <a href="/portfolio/project/hulma-cebu">Hulma Cebu</a> and SmartGrid Western.',
      },
      {
        type: 'paragraph',
        content:
          'If you are running a practice on spreadsheets and a template site, the gap between those two things is probably costing more than you think. <a href="/contact">Come tell us how you work</a>.',
      },
    ],
    cta: {
      heading: 'Need more than a website?',
      body: 'We build the public site, the system behind it, and the app your team actually opens. Tell us what your practice runs on.',
    },
    relatedSlugs: [
      'sentro-os-hr-operations-hub-creative-agencies-philippines',
      'digital-invitations-evites-cebu',
      'cooperative-plumbing-drain-employee-owned-branding',
    ],
  },
  {
    slug: 'whisk-up-matcha-brand-identity-cebu',
    category: 'Case Study',
    title: 'Whisk Up Matcha: Building a Matcha Brand Identity From Scratch',
    excerpt:
      'A new matcha brand with no existing equity, in a category where every competitor reaches for the same green leaf. How we built Whisk Up Matcha around a monstera silhouette and a palette drawn entirely from the landscape of the plant.',
    readTime: '6 min read',
    date: 'June 11, 2026',
    isoDate: '2026-06-11',
    heroImage: '/images/wum-hero.webp',
    author: {
      name: 'Thamara Ong',
      role: 'Partner & Senior Brand Strategist',
      avatar: '/images/team-thamara-ong.webp',
    },
    seo: {
      description:
        'How Huna Creatives built the Whisk Up Matcha brand identity from scratch \u2014 strategy, monstera-leaf logo mark, nature-drawn colour palette and full logo suite for a Philippine matcha caf\u00e9 brand.',
      keywords: [
        'matcha caf\u00e9 branding Philippines',
        'caf\u00e9 logo design Cebu',
        'food and beverage branding Philippines',
        'matcha brand identity',
        'Whisk Up Matcha',
        'branding agency food beverage Philippines',
        'Huna Creatives Cebu',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Matcha has gone from niche wellness trend to mainstream caf\u00e9 staple across the Philippines, and the number of matcha-focused brands has grown with it. Whisk Up Matcha arrived with no existing brand equity and one hard problem: every competitor in the category reaches for the same visual shorthand. A green leaf, a bamboo whisk, a serif in sage.',
      },
      {
        type: 'heading',
        content: 'Building an identity from the ground up',
      },
      {
        type: 'paragraph',
        content:
          'Whisk Up Matcha needed everything \u2014 brand strategy, logo, colour system, a full logo suite, and the visual language to carry it forward. The brief called for warm and grounded: not the clinical minimalism of health-food brands, not the generic green-leaf aesthetic of every matcha competitor, but something rooted in the living world the plant comes from. We built the identity around a monstera leaf silhouette \u2014 botanical, distinctive, and connected to that world without being literal about the tea itself.',
      },
      {
        type: 'quote',
        content:
          'The best food and beverage brands do not just make you want to buy the product. They make you want to be the kind of person who drinks it.',
      },
      {
        type: 'heading',
        content: 'A colour story drawn from the landscape',
      },
      {
        type: 'paragraph',
        content:
          'The palette came entirely from the landscape of matcha: Forest Green for the tea itself, Olive for the dried leaf, Amber for the terracotta of the teaware, Dark Brown for soil, and a warm Cream tying it together. The result reads earthy and elegant at once \u2014 the visual equivalent of a caf\u00e9 that takes its ingredients as seriously as its interiors.',
      },
      {
        type: 'paragraph',
        content:
          'The full logo suite \u2014 horizontal lockup, stacked variation, mark only \u2014 was drawn to hold up at every scale, from a 16mm cup stamp to a billboard. That range matters more in food and beverage than almost any other category, because the mark spends most of its life very small and slightly wet.',
      },
      {
        type: 'heading',
        content: 'Why matcha branding is its own problem',
      },
      {
        type: 'paragraph',
        content:
          'Matcha sits at an awkward intersection \u2014 healthy but indulgent, traditional but photogenic, Japanese in origin but global in appeal. An identity in this category has to hold both sides: honour the ritual without becoming a museum piece, and speak to an audience who found matcha through social media without becoming disposable.',
      },
      {
        type: 'paragraph',
        content:
          'We worked on a second matcha brand in the same period with the opposite brief \u2014 an established caf\u00e9 that needed evolution rather than invention. That story is in <a href="/blog/uji-matcha-cafe-logo-refinement-baguio-makati">the Uji-Matcha Caf\u00e9 refinement</a>, and the contrast between the two is the clearest illustration we have of how differently the same category can be approached.',
      },
      {
        type: 'paragraph',
        content:
          'The complete work is in our portfolio: <a href="/portfolio/project/whisk-up-matcha">Whisk Up Matcha brand identity</a>. For more café work, see <a href="/blog/peak-coffee-roasters-branding-cebu-it-park">Peak Coffee Roasters</a> or the full <a href="/services">range of what we do</a>.',
      },
    ],
    cta: {
      heading: 'Building a caf\u00e9 or beverage brand?',
      body: 'We build food and beverage identities made to survive a crowded shelf and a small cup. Tell us what you are opening.',
    },
    relatedSlugs: [
      'uji-matcha-cafe-logo-refinement-baguio-makati',
      'peak-coffee-roasters-branding-cebu-it-park',
      'the-second-haus-branding-consignment',
    ],
  },
  {
    slug: 'uji-matcha-cafe-logo-refinement-baguio-makati',
    category: 'Case Study',
    title: 'Uji-Matcha Caf\u00e9: Refining a Logo for a Brand That Was About to Expand',
    excerpt:
      'Uji-Matcha Caf\u00e9 built its following in Baguio, then opened in Makati. A brand crossing cities puts pressure on a logo that a single location never does \u2014 here is how we refined the mark without erasing what its regulars already recognised.',
    readTime: '6 min read',
    date: 'August 22, 2026',
    isoDate: '2026-08-22',
    heroImage: '/images/uji-hero.webp',
    // Portrait source (1440x1800) in a wide banner. The mark sits at roughly
    // mid-height, so the default 'center top' crop cut it off.
    heroImagePosition: '50% 50%',
    author: {
      name: 'Thamara Ong',
      role: 'Partner & Senior Brand Strategist',
      avatar: '/images/team-thamara-ong.webp',
    },
    seo: {
      description:
        'How Huna Creatives refined the Uji-Matcha Caf\u00e9 logo for a brand expanding from Baguio to Makati \u2014 three evolution directions, scalability fixes, and why refinement beats a rebrand when you already have an audience.',
      keywords: [
        'logo refinement Philippines',
        'caf\u00e9 rebrand Philippines',
        'Uji-Matcha Caf\u00e9',
        'matcha caf\u00e9 branding Philippines',
        'logo redesign Baguio',
        'brand evolution Makati',
        'food and beverage branding Philippines',
        'Huna Creatives',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Uji-Matcha Caf\u00e9 started in Baguio in January 2024, in front of Saint Louis University, and built a genuine local following before adding a kiosk at SM City Baguio. It has since opened in Makati, at Legazpi Village \u2014 three branches, and a brand that now has to work for people who have never been to the original.',
      },
      {
        type: 'paragraph',
        content:
          'That shift is exactly the moment a logo gets tested. A mark can be slightly imperfect for years while your customers know you by your storefront. The moment you open in a city where nobody does, it has to carry the introduction by itself.',
      },
      {
        type: 'heading',
        content: 'Refining without erasing',
      },
      {
        type: 'paragraph',
        content:
          'The brand already existed and had an audience \u2014 that was the constraint, not the problem. The existing logo had scalability issues: detailed line work that broke down at small sizes, inconsistent stroke weight, a slight visual imbalance. The brief was to fix those without discarding the chasen (matcha whisk) and bowl character its regulars already recognised.',
      },
      {
        type: 'quote',
        content:
          'When a brand already has an audience, recognition is an asset on the balance sheet. Refinement protects it. A rebrand spends it.',
      },
      {
        type: 'heading',
        content: 'Three directions, one clear answer',
      },
      {
        type: 'list',
        content: 'We presented three evolution paths:',
        items: [
          'Direction A \u2014 Refined Evolution: keep the whisk-in-bowl illustration, improve proportions, balance and stroke consistency for scalability',
          'Direction B \u2014 New Brand Expression: an abstract "UJI" lettermark with the chasen integrated into the letterforms, bold and modern',
          'Direction C \u2014 Unified Expression: the "U" merged with the whisk, the most conceptually unified of the three',
          'Typography: Cinzel for display, echoing classical structure and Japanese craft heritage, paired with Gilroy for body copy',
          'Colours: Forest Green, Charcoal, Amber and Sky Blue \u2014 bridging Japanese heritage and contemporary caf\u00e9 aesthetics',
        ],
      },
      {
        type: 'heading',
        content: 'What expansion demands of a mark',
      },
      {
        type: 'paragraph',
        content:
          'A single-location caf\u00e9 can lean on its space to do the branding. A multi-branch one cannot. The mark has to survive a mall directory, a delivery app thumbnail, a paper cup and a shopfront sign \u2014 often at sizes where fine line work simply disappears. Most of the refinement work was about exactly that: making the mark legible at 16 pixels without losing what makes it specific at full size.',
      },
      {
        type: 'paragraph',
        content:
          'It is the same discipline behind the identity systems we build from scratch, just applied in reverse \u2014 preserving equity instead of creating it. The contrast is clearest against <a href="/blog/whisk-up-matcha-brand-identity-cebu">Whisk Up Matcha</a>, a matcha brand we built with no existing equity at all, in the same period.',
      },
      {
        type: 'heading',
        content: 'The portfolio',
      },
      {
        type: 'paragraph',
        content:
          'The complete refinement study is in our portfolio: <a href="/portfolio/project/uji-matcha-cafe">Uji-Matcha Caf\u00e9 logo refinement</a>. If you are running a caf\u00e9 or beverage brand that has outgrown its original identity, that is the work to look at \u2014 or see the full <a href="/services">range of what we do</a>.',
      },
    ],
    cta: {
      heading: 'Has your brand outgrown its logo?',
      body: 'Expanding to a new city is the moment it shows. We refine identities without throwing away the recognition you have already earned.',
    },
    relatedSlugs: [
      'whisk-up-matcha-brand-identity-cebu',
      'peak-coffee-roasters-branding-cebu-it-park',
      'digital-invitations-evites-cebu',
    ],
  },
  {
    slug: 'digital-invitations-evites-cebu',
    category: 'Web Design',
    title: 'Digital Invitations in Cebu: Why Couples Are Giving Their Wedding Its Own Website',
    excerpt:
      'A Viber group and a JPEG cannot answer questions at 11pm the night before. Here is how digital invitations work for Cebu weddings and milestone birthdays \u2014 what belongs on the page, what RSVP tracking actually saves you, and what we built for real Cebu events.',
    readTime: '7 min read',
    date: 'August 19, 2026',
    isoDate: '2026-08-19',
    heroImage: '/images/evite-carlo-trixia.png',
    author: {
      name: 'Francis Fiel Roble',
      role: 'Founder & Creative Director',
      avatar: '/images/team-francis-fiel-roble.webp',
    },
    seo: {
      description:
        'Digital invitations and wedding websites for Cebu events. How evites handle RSVP tracking, directions and dress code for Cebu weddings and milestone birthdays \u2014 with real examples from Huna Creatives.',
      keywords: [
        'digital invitation Cebu',
        'wedding website Cebu',
        'evite Philippines',
        'online invitation Cebu',
        'Cebu wedding RSVP',
        'birthday invitation website',
        'web design Cebu',
        'Huna Creatives',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Every Cebu event runs on the same three questions. Where exactly is it. What am I supposed to wear. Am I still on the list. When the invitation is a JPEG in a Viber group, those questions come back to the host \u2014 one at a time, by private message, usually the night before.',
      },
      {
        type: 'paragraph',
        content:
          'A digital invitation moves all of it to one link. Not a form, not a Facebook event \u2014 an actual page on its own domain that holds the details, takes the RSVP, and stays live until the day itself. We have built several of these for Cebu couples and families, and the pattern that makes them work is consistent enough to write down.',
      },
      { type: 'heading', content: 'What a Cebu event page actually needs' },
      {
        type: 'paragraph',
        content:
          'Cebu creates specific problems a generic template does not solve. Guests fly in from Manila and abroad. Venues sit in Mactan, up in Balamban, or down south past Carcar, where a pinned map matters more than an address. And the guest list crosses generations, so the page has to work for a titito on an old Android as well as a cousin on the latest iPhone.',
      },
      {
        type: 'list',
        content: 'The details that stop the follow-up questions:',
        items: [
          'A live map pin, not a typed address \u2014 Cebu venues are frequently unfindable by name alone',
          'Ceremony and reception times stated separately, with travel time between them',
          'Dress code shown, not described \u2014 a colour swatch settles arguments that paragraphs do not',
          'RSVP that records who is coming, plus the plus-ones and the meal notes',
          'A page that loads on mobile data, because most guests will open it in transit',
        ],
      },
      {
        type: 'paragraph',
        content:
          'That last point is the one templates fail. A heavy invitation page on a slow connection is functionally a broken invitation. We treat mobile weight as a design constraint from the start \u2014 the same discipline we apply to client sites, which we wrote about in <a href="/portfolio/web-design">web design that converts, not just impresses</a>.',
      },
      { type: 'heading', content: 'Carlo & Trixia: an invitation that opens' },
      {
        type: 'paragraph',
        content:
          'For <a href="https://carloandtrixia.com" target="_blank" rel="noopener noreferrer">carloandtrixia.com</a> we started with a wax-sealed envelope. You click the seal, it breaks, and the invitation unfolds \u2014 story, entourage, dress code, RSVP. It is one small moment of ceremony that a JPEG cannot do, and it sets the tone before a single detail is read.',
      },
      {
        type: 'paragraph',
        content:
          'Underneath the flourish, it is a working tool. The RSVP feeds a list the couple can actually read, so the headcount stops living in screenshots. The dress code has its own section, so nobody has to ask. And because it sits on its own domain, it can be printed on the physical invite as a short line: scan for details.',
      },
      {
        type: 'quote',
        content:
          'The invitation is the first thing your guests experience. It should feel like the event, not like a form.',
      },
      { type: 'heading', content: 'Milestone birthdays deserve the same treatment' },
      {
        type: 'paragraph',
        content:
          'Weddings get the budget, but 30ths, 40ths and 50ths carry the same logistics. We built <a href="https://gelat30.com" target="_blank" rel="noopener noreferrer">gelat30.com</a> around hand-lettered type and pressed-flower watercolour, and <a href="https://tercelat41.com" target="_blank" rel="noopener noreferrer">tercelat41.com</a> with glitter-cut numerals styled like a printed keepsake. Different personalities entirely \u2014 which is the point. A milestone invitation should look like the person, not like a template someone else used last month.',
      },
      {
        type: 'paragraph',
        content:
          'That is a branding decision as much as a design one. The same thinking we bring to <a href="/services">brand identity work</a> applies at the scale of a single event: choose a voice, commit to it, and let every element follow.',
      },
      { type: 'heading', content: 'What it costs you not to have one' },
      {
        type: 'paragraph',
        content:
          'The real expense of a JPEG invitation is not design \u2014 it is your own time. Every unanswered question becomes a message you personally reply to, in the week you are least able to. Multiply that across two hundred guests and the maths gets uncomfortable.',
      },
      {
        type: 'list',
        content: 'What a live page absorbs on your behalf:',
        items: [
          'Directions, at any hour, without you answering',
          'Headcount that updates itself instead of living in a notebook',
          'Late changes \u2014 a moved time or venue reaches everyone instantly',
          'Dietary and plus-one details collected once, in one place',
          'A gallery link afterwards, on the same domain guests already have',
        ],
      },
      { type: 'heading', content: 'Working with a Cebu team' },
      {
        type: 'paragraph',
        content:
          'We are based in Cebu, which matters more than it sounds. We know which venues are hard to find, how Philippine guest lists actually behave, and why a page has to survive a patchy signal in Balamban. You can see the full range of what we build on our <a href="/portfolio/web-design">web design portfolio</a>, alongside client work like <a href="/portfolio/project/hulma-cebu">Hulma Cebu</a>.',
      },
      {
        type: 'paragraph',
        content:
          'If you are planning something \u2014 a wedding, a 30th, a debut \u2014 the invitation is the first thing anyone sees. It is worth more than a screenshot. Come <a href="/contact">talk to us</a> about it.',
      },
    ],
    cta: {
      heading: 'Planning a Cebu wedding or milestone?',
      body: 'We design digital invitations that handle the details so you do not have to. Tell us about your event.',
    },
    relatedSlugs: [
      'milestone-birthday-evite-pickleball',
    ],
  },
  {
    slug: 'milestone-birthday-evite-pickleball',
    category: 'Web Design',
    title: 'A Pickleball Birthday Invite, and What It Taught Us About Themed Evites',
    excerpt:
      'We built a 30th birthday invitation around pickleball \u2014 one paddle, one court, one button. Here is why committing hard to a single theme outperforms the elegant, generic invitation almost every time, and how that applies to events anywhere in the Philippines.',
    readTime: '6 min read',
    date: 'August 22, 2026',
    isoDate: '2026-08-22',
    heroImage: '/images/evite-claudy.png',
    author: {
      name: 'Francis Fiel Roble',
      role: 'Founder & Creative Director',
      avatar: '/images/team-francis-fiel-roble.webp',
    },
    seo: {
      description:
        'How a pickleball-themed 30th birthday evite was designed, and why committing to one strong theme beats a generic invitation. Digital invitation design for events across the Philippines.',
      keywords: [
        'birthday invitation website',
        'digital invitation Philippines',
        'evite design Philippines',
        '30th birthday invitation',
        'themed invitation design',
        'online RSVP Philippines',
        'pickleball birthday',
        'Huna Creatives',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'When Claudy came to us about her 30th, she did not ask for an elegant invitation. She asked for a pickleball one. That is a better brief than it sounds, and the result \u2014 <a href="https://claudyat30.com" target="_blank" rel="noopener noreferrer">claudyat30.com</a> \u2014 taught us something we now bring to every event page we build.',
      },
      { type: 'heading', content: 'Commit to the theme or drop it' },
      {
        type: 'paragraph',
        content:
          'The instinct with a themed invitation is to hedge. Add a small racket icon in the corner, keep the rest tasteful and neutral, call it a nod. That hedge produces the worst of both outcomes: it is no longer elegant, and it was never actually fun.',
      },
      {
        type: 'paragraph',
        content:
          'So we went the other way. The whole page is a pickleball court, shot from above, in a colour palette that has no business being subtle. A paddle with her name on it lies across the corner. The RSVP button does not say RSVP \u2014 it says Ready to Dink? A guest knows within half a second what kind of party this is and whether they are dressing for it.',
      },
      {
        type: 'quote',
        content:
          'A theme that is only half-applied reads as a mistake. A theme that is fully applied reads as a decision.',
      },
      { type: 'heading', content: 'One page, one action' },
      {
        type: 'paragraph',
        content:
          'The other discipline here is restraint about function. There is one button. Not a navigation bar, not a schedule, not a gallery \u2014 one button, with a single line of copy underneath telling you what happens when you press it.',
      },
      {
        type: 'paragraph',
        content:
          'This is the same principle that governs a landing page for a business, and it is the one clients most often push back on. Every extra option you offer reduces the chance any single one gets taken. We have written about this in the commercial context in <a href="/portfolio/web-design">web design that converts, not just impresses</a> \u2014 an invitation is simply the purest version of it. There is exactly one thing you want a guest to do.',
      },
      {
        type: 'list',
        content: 'What we deliberately left off the page:',
        items: [
          'A menu \u2014 there is nowhere else to go',
          'A countdown timer, which adds pressure without adding information',
          'A photo gallery, which belongs after the event and not before',
          'Anything requiring a guest to create an account or install an app',
        ],
      },
      { type: 'heading', content: 'The theme has to survive the RSVP' },
      {
        type: 'paragraph',
        content:
          'Most themed invitations break at the form. The front is beautifully art-directed, then the RSVP throws you to a stock form in an unrelated typeface, and the illusion collapses at the exact moment you need the guest to act.',
      },
      {
        type: 'paragraph',
        content:
          'Carrying the design through the RSVP is unglamorous work and it is the part that matters. Same palette, same type, same voice in the confirmation message. The guest never leaves the world you built. It is the same argument for consistency we make about brands in <a href="/services">the power of consistent visual branding</a>, compressed into a single page.',
      },
      { type: 'heading', content: 'Themes travel further than you expect' },
      {
        type: 'paragraph',
        content:
          'A strong theme is not limited to sport. We have built the same commitment into very different personalities \u2014 <a href="https://gelat30.com" target="_blank" rel="noopener noreferrer">gelat30.com</a> in hand-lettered script over pressed flowers, <a href="https://tercelat41.com" target="_blank" rel="noopener noreferrer">tercelat41.com</a> in glitter-cut numerals built like a keepsake, and <a href="https://carloandtrixia.com" target="_blank" rel="noopener noreferrer">carloandtrixia.com</a> as a wax-sealed envelope that opens.',
      },
      {
        type: 'paragraph',
        content:
          'None of them share a template. Each one starts from the person and works outward, which is exactly how we approach identity work generally \u2014 see <a href="/services">brand strategy before design</a>. The event is small, but the method is the same.',
      },
      { type: 'heading', content: 'Anywhere in the Philippines' },
      {
        type: 'paragraph',
        content:
          'Because these are just websites, geography stops mattering. We are based in Cebu and have built invitations for events in Manila, Baguio and the provinces \u2014 the whole engagement happens over messages and calls. If you are planning something in Cebu specifically, we covered the local logistics in <a href="/blog/digital-invitations-evites-cebu">digital invitations in Cebu</a>.',
      },
      {
        type: 'paragraph',
        content:
          'You can see more of these in our <a href="/portfolio/web-design">web design portfolio</a>. When you are ready, <a href="/contact">tell us about your event</a> \u2014 including the theme you assume is too silly to work. Those are usually the good ones.',
      },
    ],
    cta: {
      heading: 'Got a theme in mind?',
      body: 'The stranger the better. We design digital invitations that commit properly \u2014 tell us what you are planning.',
    },
    relatedSlugs: [
      'digital-invitations-evites-cebu',
    ],
  },
  {
    slug: 'cooperative-plumbing-drain-employee-owned-branding',
    category: 'Case Study',
    title: 'Branding an Employee-Owned Trade Company — Cooperative Plumbing & Drain',
    excerpt:
      'How do you make an ownership model visible on a service van? Inside the brand strategy and identity system Huna Creatives built for Cooperative Plumbing & Drain — a monogram drawn from water ripples and pipeline forms, a deliberately narrow palette, and an eleven-page brand platform.',
    readTime: '8 min read',
    date: 'August 21, 2026',
    isoDate: '2026-08-21',
    heroImage: '/images/coop-hero.webp',
    author: {
      name: 'Thamara Ong',
      role: 'Partner & Senior Brand Strategist',
      avatar: '/images/team-thamara-ong.webp',
    },
    seo: {
      description:
        'A case study in branding for the skilled trades: how Huna Creatives built the identity and brand strategy for Cooperative Plumbing & Drain, an employee-owned plumbing company — monogram design, color system, typography, positioning, and brand voice.',
      keywords: [
        'plumbing company branding',
        'home services brand identity',
        'employee-owned company branding',
        'trade company logo design',
        'skilled trades branding agency',
        'monogram logo design',
        'brand strategy for service businesses',
        'HVAC and plumbing marketing',
        'Cooperative Plumbing and Drain',
        'Huna Creatives case study',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Most plumbing brands look the same, and they look that way on purpose. A cartoon mascot with a wrench. A red-and-blue palette borrowed from the hot and cold taps. A wordmark in a friendly rounded sans that is trying very hard to seem approachable. It is a visual language built on the assumption that customers hiring a trade are looking for something familiar and unthreatening. Cooperative Plumbing & Drain came to us as an exception to the category — and the brand needed to say so without shouting.',
      },
      {
        type: 'heading',
        content: 'The Brief: Make an Ownership Model Visible',
      },
      {
        type: 'paragraph',
        content:
          'Cooperative Plumbing & Drain is employee-owned. Every technician holds a stake in the business, which means the person crawling under your sink at 11pm has a direct financial interest in whether you call back. That is a genuine structural difference, and it changes real things: the recommendations customers get, the care taken on a job, the reason someone stays with the company for a decade.',
      },
      {
        type: 'paragraph',
        content:
          'It is also completely invisible. An ownership model does not show up on a van, a business card, or a Google listing. Our brief was to build an identity that signalled accountability and craftsmanship before a single word of explanation — established enough to win commercial property managers, warm enough for a homeowner with a burst pipe at midnight.',
      },
      {
        type: 'heading',
        content: 'Strategy First, Then Design',
      },
      {
        type: 'paragraph',
        content:
          'We do not open a design file until the strategy is settled, and this project is a good argument for why. Before any mark existed, we wrote the brand platform: purpose, vision, mission, positioning statement, differentiators, personality, archetypes, core values, and a customer promise. Eleven pages of it. That document is what made the design decisions obvious later — when you already know the brand is The Everyman with a streak of The Reformer, "never arrogant, never flashy, never corporate," you have ruled out about ninety percent of the visual options before you start. We have written more about <a href="/services">why strategy has to come before design</a> if you want the longer argument.',
      },
      {
        type: 'paragraph',
        content:
          'The platform landed on one line that everything else hangs from: Ownership Elevates Everyone. Not a tagline for advertising — a test for decisions. Every touchpoint had to reinforce it.',
      },
      {
        type: 'heading',
        content: 'The Monogram: Water Ripples and Pipeline Forms',
      },
      {
        type: 'paragraph',
        content:
          'The mark is built from two overlapping ideas — the concentric rings of a water ripple and the curved sections of pipeline. Trace it one way and it reads as COOP. Trace it another and it reads as CPD. Look at the centre and it resolves into an eye, which is the part that does the strategic work: it stands for the employee-owned, customer-focused attention at the heart of the business.',
      },
      {
        type: 'paragraph',
        content:
          'What the mark deliberately avoids is literalism. There is no wrench, no droplet, no pipe rendered as a pipe. Abstract geometry gives the brand room to grow beyond drains and gives it a quality most trade logos never achieve — it looks like it will still be right in twenty years. You can see the full logo suite and construction rationale in the <a href="/portfolio/project/cooperative-plumbing-drain">Cooperative Plumbing & Drain case study</a>.',
      },
      {
        type: 'heading',
        content: 'A Deliberately Narrow Palette',
      },
      {
        type: 'paragraph',
        content:
          'The color system is four values and a gradient: an off-white ground, a near-black, and two depths of navy. That is it. No accent color, no secondary palette, no seasonal variation. The vans are the clearest proof of why: a white body, a navy monogram blown up to fill the panel, and nothing else competing for attention on the road.',
      },
      {
        type: 'paragraph',
        content:
          'Restraint is the point. A narrow palette is harder to get wrong across the touchpoints a trade company actually uses — vehicle wraps, invoices, uniform embroidery, yard signs, a phone-sized web page. It also does something to perception: brands that use less color read as more confident, because they are not compensating. Navy carries the associations the brand wanted anyway — water, depth, competence, institutional trust — without anyone having to explain the choice.',
      },
      {
        type: 'heading',
        content: 'Typography: Engraved at the Top, Plainspoken Everywhere Else',
      },
      {
        type: 'paragraph',
        content:
          'Headlines are set in Copperplate Gothic. It is an unusual choice for the trades and a very deliberate one — Copperplate has the feel of a name cut into a building or stamped on a certificate, which is exactly the civic, permanent register a hundred-year-old-feeling company wants. Body copy is Open Sans, chosen because it disappears. Service descriptions, estimates, dispatch notes, and web copy all need to be read fast and never admired.',
      },
      {
        type: 'paragraph',
        content:
          'The pairing gives the brand two clear voices: formal where it signs its name, direct everywhere it does business. That consistency across touchpoints is what separates a brand from a logo — a point we make in more depth in <a href="/services">what a complete visual identity actually includes</a>.',
      },
      {
        type: 'heading',
        content: 'What the Trades Usually Get Wrong',
      },
      {
        type: 'list',
        content: 'Common branding mistakes in home services and skilled trades:',
        items: [
          'Leading with a mascot, which caps how seriously commercial clients take you',
          'Using a logo instead of a system — no guidelines, no lockup variants, no rules for how it behaves on a van versus an invoice',
          'Choosing colors for visibility alone, then discovering they are unusable in embroidery or single-color print',
          'Writing a tagline before writing a positioning statement',
          'Treating the brand as a launch project rather than something the whole team applies daily',
        ],
      },
      {
        type: 'paragraph',
        content:
          'The through-line is that most trade companies buy a logo when what they need is a brand — the strategy, the system, and the language to go with it. That gap is the single most common reason a rebrand fails to change anything commercially. It is the same argument we make for every category we work in: your <a href="/services">brand identity is your most valuable asset</a>, and it is the one most owner-operators underinvest in.',
      },
      {
        type: 'quote',
        content:
          'Unlike traditional service companies, our people do not simply work here. They help own what they build.',
      },
      {
        type: 'heading',
        content: 'The Result',
      },
      {
        type: 'paragraph',
        content:
          'Cooperative Plumbing & Drain launched with a complete brand platform: three logo lockups, a disciplined color and type system, a full brand board, and the eleven-page strategy that explains why each decision exists — then carried it into the touchpoints that actually meet customers. The monogram scales down to embroidery on a uniform placket and up to a full-side vehicle wrap without losing its read, which is the real test of an abstract mark. The identity does not announce the ownership model — it behaves like a company that has one. Clean, corporate in the good sense, confident without noise.',
      },
      {
        type: 'paragraph',
        content:
          'If you run a home services business, a trade company, or any operation where trust is the product, the work is worth a look. Browse the <a href="/portfolio/project/cooperative-plumbing-drain">full case study</a>, see the rest of our <a href="/portfolio">branding portfolio</a>, or read more about our <a href="/services">brand identity services</a>.',
      },
    ],
    cta: {
      heading: 'Building a brand for a business people have to trust?',
      body: 'We build identity systems for trade and service companies — strategy, monogram, logo suite, color and type systems, and the brand platform underneath. Start with a free discovery call.',
    },
    relatedSlugs: [
      'cooperative-plumbing-drain-employee-owned-branding',
    ],
  },
  {
    slug: 'peak-coffee-roasters-branding-cebu-it-park',
    category: 'Case Study',
    title: 'How We Branded Peak Coffee Roasters — Cebu\'s Boldest Specialty Café Identity',
    excerpt:
      'From a blank canvas to laser-cut wood signage, tasting cards, bean bags, and a complete visual system — how Huna Creatives built the brand identity for Peak Coffee Roasters, one of Cebu City\'s most ambitious specialty coffee concepts.',
    readTime: '7 min read',
    date: 'June 11, 2026',
    isoDate: '2026-06-11',
    heroImage: '/images/peak-coffee-pcr-1.webp',
    author: {
      name: 'Thamara Ong',
      role: 'Partner & Senior Brand Strategist',
      avatar: '/images/team-thamara-ong.webp',
    },
    seo: {
      description:
        'See how Huna Creatives built the complete brand identity for Peak Coffee Roasters in Cebu — logo suite, packaging, cups, menus, tasting cards, signage, and social media templates for a specialty coffee brand competing at the highest level in Cebu IT Park and beyond.',
      keywords: [
        'specialty coffee branding Cebu',
        'coffee shop brand identity Cebu',
        'café branding Cebu City',
        'coffee shop logo design Cebu',
        'branding agency IT Park Cebu',
        'specialty coffee Cebu IT Park',
        'restaurant branding Cebu',
        'Peak Coffee Roasters',
        'Huna Creatives Cebu',
        'café logo design Philippines',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Cebu City\'s coffee scene has never been more competitive. From Ayala Center to IT Park and Lahug, specialty cafés are opening every quarter — and the ones that last are not just the ones with the best beans. They are the ones with the strongest brands. Peak Coffee Roasters came to us with a clear brief: build an identity that matches the obsession and precision behind specialty coffee. No compromises. No generic café aesthetic. A brand built to command the room — and the shelf, the cup, the menu, and the feed.',
      },
      {
        type: 'heading',
        content: 'The Challenge: Standing Out in Cebu\'s Saturated Coffee Market',
      },
      {
        type: 'paragraph',
        content:
          'IT Park in Cebu City is one of the most caffeine-dense square kilometers in the Philippines. Dozens of cafés compete for the same BPO workers, tech professionals, and weekend crowd. Most of them look the same — the same neutral palettes, the same minimalist sans-serif, the same "artisan" aesthetic that stopped feeling artisan years ago. Peak Coffee Roasters needed to be unmistakably different. The brand had to communicate precision and craft — not just on a menu, but across every single touchpoint.',
      },
      {
        type: 'heading',
        content: 'The Strategy: Minimal System, Maximum Presence',
      },
      {
        type: 'paragraph',
        content:
          'We built the PCR identity around a geometric symbol — a mark constructed from the brand\'s initials P, C, and R, forming a path going upward. Clean, precise, and immediately legible at any size. The primary palette is Black, Grey, and White — a deliberate decision that forces everything to live or die on form and composition, not color. Secondary tones of Mahogany, Sky Blue, and Bean provide warmth and specificity when needed. Outfit was chosen as the sole typeface — ExtraBold for display, Regular for labels — because its geometric precision works at every scale, from a 2mm stamp to a 2-meter backdrop.',
      },
      {
        type: 'quote',
        content:
          'Great café branding does not look like café branding. It looks like a brand that happens to be a café — with a point of view, a voice, and a visual language strong enough to carry the entire business.',
      },
      {
        type: 'heading',
        content: 'The Deliverables: 50+ Assets Across Every Touchpoint',
      },
      {
        type: 'list',
        content: 'What we delivered for Peak Coffee Roasters:',
        items: [
          'Full logo suite — PCR combination mark, horizontal, stacked, and icon versions across all colorways',
          'Branded cups — hot and cold cup designs that carry the identity into every hand that holds one',
          'Bean bag packaging — premium kraft packaging with full bleed brand application',
          'Paper bags and tissue — the entire take-out experience, branded end to end',
          'Café menu — typography-forward design that sells the philosophy before the product',
          'Tasting cards — detailed per-origin cards that position the café as a craft destination, not a commodity',
          'Sticker suite — collectible, giftable, and impossible not to put on everything',
          'Laser-cut wood signage — the physical brand presence that makes the space unmistakable',
          'Digital menu display — HD-formatted content for in-café screens',
          'Company ID cards — the internal brand that signals to staff this is a serious operation',
          'Full social media template suite — Instagram and Facebook templates for launches, promotions, and education content',
        ],
      },
      {
        type: 'heading',
        content: 'Why Specialty Cafés in Cebu Need More Than a Logo',
      },
      {
        type: 'paragraph',
        content:
          'The coffee shop owners who succeed long-term in Cebu — in IT Park, in Capitol, in the growing café strip along Escario — all share one thing: they treat their brand as seriously as they treat their beans. Your brand is the first thing a new customer sees before they taste a single sip. It is the reason someone chooses to photograph their drink and tag you. It is the reason a first-time customer becomes a regular. Peak Coffee Roasters understood this from day one. The investment in a complete brand system was not just about aesthetics — it was about building the infrastructure for a business that lasts.',
      },
      {
        type: 'heading',
        content: 'The Result: A Brand That Competes at the Highest Level',
      },
      {
        type: 'paragraph',
        content:
          'Peak Coffee Roasters launched with a brand identity that looked like it came from a studio in Tokyo or Melbourne — because the brief demanded nothing less. The complete system carries consistently from the first Instagram impression to the cup in the customer\'s hand, from the laser-cut sign on the wall to the tasting card on the table. Every touchpoint reinforces the same message: this is a café that cares about every detail. See the <a href="/portfolio/project/peak-coffee-roasters">full Peak Coffee Roasters case study</a> for the complete visual system.',
      },
    ],
    cta: {
      heading: 'Opening a café or restaurant in Cebu? Your brand is your most important first impression.',
      body: 'Huna Creatives builds complete brand identities for food and beverage businesses in Cebu City and across the Philippines — from IT Park concepts to regional chains. Let\'s build yours.',
    },
    relatedSlugs: [
      'whisk-up-matcha-brand-identity-cebu',
      'the-second-haus-branding-consignment',
    ],
  },
  {
    slug: 'the-second-haus-branding-consignment',
    category: 'Case Study',
    title: 'How We Built The Second Haus — A Premium Brand Identity for Cebu\'s Conscious Luxury Market',
    excerpt:
      'The resale and consignment market is growing fast in Cebu. The Second Haus needed a brand that felt as premium as the pieces it carries — curated, warm, and built to earn trust from style-conscious buyers from day one.',
    readTime: '6 min read',
    date: 'June 11, 2026',
    isoDate: '2026-06-11',
    heroImage: '/images/tsh-insta-unboxing.webp',
    author: {
      name: 'Thamara Ong',
      role: 'Partner & Senior Brand Strategist',
      avatar: '/images/team-thamara-ong.webp',
    },
    seo: {
      description:
        'See how Huna Creatives built a complete luxury brand identity for The Second Haus, a Cebu-based consignment boutique — logo, typography, color palette, packaging, dust bags, hang tags, and social media templates that positioned the brand as premium from launch day.',
      keywords: [
        'fashion brand identity Cebu',
        'consignment boutique branding Philippines',
        'luxury brand design Cebu',
        'branding agency Cebu Philippines',
        'logo design consignment store',
        'sustainable fashion brand Philippines',
        'boutique branding Cebu',
        'The Second Haus',
        'Huna Creatives brand identity',
        'pre-loved fashion branding Cebu',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'The resale and consignment market in the Philippines is having a moment. Platforms like Carousell and Instagram shops have normalized buying pre-loved — but the brands that are winning in this space are not the ones with the most listings. They are the ones that have figured out how to make secondhand feel as premium and curated as buying new. The Second Haus came to us with exactly that ambition: build a brand that earns the trust and desire of Cebu\'s most style-conscious shoppers.',
      },
      {
        type: 'heading',
        content: 'The Brief: Premium Consignment Without the Secondhand Stigma',
      },
      {
        type: 'paragraph',
        content:
          'The core challenge was positioning. Consignment carries a perception problem — for many shoppers, it still feels like buying someone\'s unwanted things. The Second Haus needed to flip that narrative entirely: every piece is curated, authenticated, and given a second life by people who genuinely love fashion. The brand had to communicate warmth and approachability without sacrificing the premium quality signal. Think: a beautifully curated boutique you want to spend time in, not a bazaar you feel slightly self-conscious about.',
      },
      {
        type: 'quote',
        content:
          'The best luxury resale brands do not apologize for being resale. They celebrate it — the story behind the piece, the sustainability angle, the thrill of the find. That was the territory we wanted The Second Haus to own.',
      },
      {
        type: 'heading',
        content: 'The Identity: Refined, Warm, and Intentional',
      },
      {
        type: 'paragraph',
        content:
          'We started with typography — a transitional serif logotype that felt elevated and timeless, paired with a clean geometric sans-serif for body copy and labels. The combination communicates curated luxury without stiffness. The palette — Charcoal, Warm Sand, Linen, Terracotta, and Sage — was built to feel like stepping into a beautifully dressed home: warm, collected, and instantly comfortable. Every color decision was made to evoke the feeling of pieces with history, not pieces that were simply owned by someone else.',
      },
      {
        type: 'heading',
        content: 'The Touchpoints That Built Trust',
      },
      {
        type: 'list',
        content: 'What we delivered for The Second Haus across 8 weeks:',
        items: [
          'Primary logotype, monogram mark, and inverted dark version — a complete logo suite built for every context',
          'Color system and typography hierarchy — the visual rulebook that keeps everything consistent',
          'Branded dust bags — the tactile brand moment that turns every purchase into an experience',
          'Hang tags and tissue paper — packaging designed to make unboxing feel like opening something new',
          'Launch campaign social content — the Instagram presence that introduced the brand to Cebu',
          'Brand guidelines document — everything the team needed to stay on-brand without the founders policing it',
          'Social media template suite — post templates that let the brand grow without losing visual consistency',
          'Editorial flat lay direction — the photography guidelines that made every product shot look like magazine editorial',
        ],
      },
      {
        type: 'heading',
        content: 'The Cebu Market: Why Brand Matters More Than Ever for Fashion and Retail',
      },
      {
        type: 'paragraph',
        content:
          'Fashion retail in Cebu City has become more competitive at every price point. The growth of online shopping, the rise of Instagram boutiques, and the increasing sophistication of Cebuano consumers means that brand perception is no longer a nice-to-have — it is the difference between a buyer choosing you or choosing the next account. The Second Haus launched into this market with a brand that could hold its own against established regional boutiques. Three times the social engagement in the first month compared to pre-brand launch metrics. 100% satisfaction on every brand deliverable. The numbers followed the brand.',
      },
      {
        type: 'heading',
        content: 'What Fashion and Retail Brands in Cebu Can Learn From This',
      },
      {
        type: 'paragraph',
        content:
          'The investment in a complete brand system — not just a logo — is what separates the boutiques that become institutions from the ones that quietly disappear. If your brand is inconsistent across your packaging, your social media, and your in-person experience, you are creating friction every time a potential customer encounters you. The Second Haus invested in getting it right from the very first touchpoint — and it shows. See the <a href="/portfolio/project/the-second-haus">full case study here</a>.',
      },
    ],
    cta: {
      heading: 'Launching a boutique, fashion label, or retail brand in Cebu?',
      body: 'Huna Creatives builds premium brand identities for fashion and retail businesses across the Philippines. From your first logo to your full packaging system — let\'s build something worth wearing.',
    },
    relatedSlugs: [
      'peak-coffee-roasters-branding-cebu-it-park',
      'whisk-up-matcha-brand-identity-cebu',
    ],
  },
  {
    slug: 'content-creation-that-builds-authority',
    category: 'Content Creation',
    title: 'How to Outsource Content Creation to a Filipino Agency Without Losing Your Brand Voice',
    excerpt:
      'The biggest fear when outsourcing content is losing the voice that makes your brand feel like yours. Here is how to hand off content creation to a Filipino agency and get back work that sounds exactly like you — only better.',
    readTime: '6 min read',
    date: 'February 25, 2026',
    isoDate: '2026-02-25',
    heroImage: '/images/blog-content-hero-001.jpg',
    author: {
      name: 'Francis Fiel Roble',
      role: 'Founder & Creative Director',
      avatar: '/images/team-francis-fiel-roble.webp',
    },
    seo: {
      description:
        'Learn how to outsource content creation to a Filipino agency without losing your brand voice. Huna Creatives in Cebu produces blogs, social content, and brand copy for international clients — on-brand, on-time, and built to attract leads.',
      keywords: [
        'outsource content creation Philippines',
        'Filipino content agency',
        'content creation agency Philippines',
        'outsource social media content',
        'hire Filipino content creators',
        'content agency Cebu',
        'outsource marketing Philippines',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Content is the fuel that drives every marketing channel — your blog, your social media, your email list, your SEO. But creating consistent, high-quality content takes time that most business owners and marketing teams simply do not have. Outsourcing to a Filipino content agency is one of the smartest operational decisions a growing brand can make in 2026 — but only if the handoff is done right. Read how <a href="/services">brands are outsourcing more than just content to the Philippines</a>.',
      },
      {
        type: 'heading',
        content: 'The Brand Voice Problem — and How to Solve It',
      },
      {
        type: 'paragraph',
        content:
          'The number one concern brands have about outsourcing content is that it will sound generic, off-brand, or obviously written by someone who does not know the business. This is a valid concern — and it is entirely avoidable. The solution is a thorough onboarding process that documents your brand voice before a single piece of content is written.',
      },
      {
        type: 'quote',
        content:
          'Brand voice is not about what you say — it is about how you say it. Document it clearly, share it thoroughly, and a great content team will protect it more carefully than you do.',
      },
      {
        type: 'heading',
        content: 'What a Proper Content Outsourcing Onboarding Looks Like',
      },
      {
        type: 'list',
        content: 'Before we write a single word, Huna Creatives captures:',
        items: [
          'Your brand voice guide — tone, personality, words you use, words you avoid',
          'Your target audience — who they are, what they care about, what keeps them up at night',
          'Your content goals — SEO traffic, social engagement, lead generation, or all three',
          'Examples of content you love and content you hate',
          'Your approval workflow — how feedback works and what turnaround you need',
          'Topic briefs for the first three months of content',
        ],
      },
      {
        type: 'heading',
        content: 'Why Filipino Content Teams Perform Well for International Clients',
      },
      {
        type: 'paragraph',
        content:
          'Filipino writers and content creators are native English speakers raised on Western media, culture, and business communication. This is not a small thing. The cultural fluency means the content does not need heavy editing to feel natural to US, Australian, or UK audiences. Combined with strong research skills, fast turnaround times, and competitive rates, Filipino content teams deliver a cost-to-quality ratio that is genuinely hard to match anywhere else in the world.',
      },
      {
        type: 'heading',
        content: 'What to Expect Month by Month',
      },
      {
        type: 'paragraph',
        content:
          'Month one is always about calibration — learning your voice, testing formats, and refining the workflow. By month two, the content starts to feel native to your brand. By month three, you have a content machine that runs predictably and requires minimal input from your team. This is where the compounding value of outsourced content creation really begins to show. <a href="/contact">Talk to Huna Creatives</a> about a content engagement that fits your brand.',
      },
    ],
    cta: {
      heading: 'Get content that sounds like you — and performs better than you have time to create.',
      body: "Huna Creatives produces brand content for international clients that is on-voice, on-brand, and built to attract leads. Let's talk about your content needs.",
    },
    relatedSlugs: [
      'cooperative-plumbing-drain-employee-owned-branding',
    ],
  },
  {
    slug: 'startup-branding-identity-guide',
    category: 'Brand Identity',
    title: "The Startup Founder's Complete Guide to Brand Identity in 2026",
    excerpt:
      'Your brand is being formed whether you are intentional about it or not. Every pitch deck, every social post, every client email is shaping how people perceive your startup. Here is how to take control of that perception from day one.',
    readTime: '8 min read',
    date: 'January 28, 2026',
    isoDate: '2026-01-28',
    heroImage: '/images/blog-startup-brand-hero-001.jpg',
    author: {
      name: 'Thamara Ong',
      role: 'Partner & Senior Brand Strategist',
      avatar: '/images/team-thamara-ong.webp',
    },
    seo: {
      description:
        'The complete 2026 guide to building a brand identity for your startup from scratch. Learn what startup branding actually includes, when to invest, and how Filipino creative agencies deliver world-class brand identities at startup-friendly rates.',
      keywords: [
        'startup branding guide 2026',
        'build brand identity startup',
        'startup logo design',
        'brand identity for new business',
        'startup branding Philippines',
        'brand identity guide founders',
        'creative agency for startups',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Most startup founders treat branding as a phase 2 problem — something to figure out after the product is built, after the first customers come in, after the MVP is validated. The problem with this approach is that your brand is already being formed in phase 1. Every investor deck, every early customer interaction, every LinkedIn post is contributing to a brand perception that is being shaped whether you are intentional about it or not.',
      },
      {
        type: 'heading',
        content: 'The Real Cost of Delaying Your Brand',
      },
      {
        type: 'paragraph',
        content:
          'Founders who delay branding often find themselves pivoting their visual identity after they have already built an audience — a process that is expensive, confusing to customers, and completely avoidable. Getting the brand right early, even at a minimal viable level, gives you a foundation that scales. It also signals to investors, partners, and early customers that you are serious.',
      },
      {
        type: 'quote',
        content:
          'Investors do not just evaluate your product — they evaluate whether they believe you can build a company. A strong brand says: we have thought about how we want the world to see us. That matters more than most founders realize.',
      },
      {
        type: 'heading',
        content: 'Phase 1: Define Before You Design',
      },
      {
        type: 'paragraph',
        content:
          'Before any designer touches your brand, you need answers to five questions: What problem does your startup solve and for whom? What values drive the way you work? Who are your direct competitors and how do you want to be positioned relative to them? What emotion do you want customers to feel when they interact with your brand? What does success look like in 5 years? These answers are the strategic brief that drives every design decision.',
      },
      {
        type: 'heading',
        content: 'Phase 2: The Core Identity System',
      },
      {
        type: 'list',
        content: 'The minimum viable brand identity for a startup launching in 2026:',
        items: [
          'Primary logo — versatile, scalable, and distinctive at any size',
          'Color palette — 2 to 3 primary colors with exact hex and RGB codes',
          'Typography — one display font and one body font, with size hierarchy defined',
          'Brand voice guide — 1 page documenting your tone, personality, and language rules',
          'Social media profile assets — profile photo, cover image, and story templates',
          'Pitch deck template — branded and ready for investor presentations',
        ],
      },
      {
        type: 'heading',
        content: 'Phase 3: Building for Scale',
      },
      {
        type: 'paragraph',
        content:
          'Once you have validated the business and the brand is working, the next phase is building a complete brand system that your growing team can use without you policing every design decision. This means comprehensive brand guidelines, template libraries, and a visual system that is strong enough to stay consistent whether it is being used by your in-house designer, a freelancer, or an external agency. Read more about <a href="/services">what a complete visual identity actually includes</a>.',
      },
      {
        type: 'heading',
        content: 'Why More Founders Are Going to Filipino Agencies for This Work',
      },
      {
        type: 'paragraph',
        content:
          'The value proposition is straightforward. Filipino <a href="/services">creative agencies</a> deliver strategic, world-class brand identities at a fraction of what US or European studios charge for the same scope. The English fluency is native. The cultural understanding of Western markets is deep. The quality ceiling — when you find the right agency — is as high as anywhere in the world. For founders who need to stretch every dollar, this is not a compromise. It is a smart decision. <a href="/portfolio">See our work</a> and judge for yourself.',
      },
    ],
    cta: {
      heading: 'Build your startup brand the right way from day one.',
      body: "Huna Creatives builds strategic brand identities for early-stage startups at rates that make sense for pre-revenue companies. Let's talk.",
    },
    relatedSlugs: [
    ],
  },
  {
    slug: 'social-media-content-strategy-2025',
    category: 'Digital Marketing',
    title: 'Social Media Strategy for Philippine Businesses in 2026: What Is Actually Working',
    excerpt:
      'The playbook that worked in 2023 is obsolete. Filipino consumers are more sophisticated, algorithms have changed, and the brands growing on social media in 2026 are doing something fundamentally different. Here is what it is.',
    readTime: '7 min read',
    date: 'January 21, 2026',
    isoDate: '2026-01-21',
    heroImage: '/images/blog-social-strategy-hero-001.jpg',
    author: {
      name: 'Francis Fiel Roble',
      role: 'Founder & Creative Director',
      avatar: '/images/team-francis-fiel-roble.webp',
    },
    seo: {
      description:
        'What social media strategy is actually working for Philippine businesses in 2026? Huna Creatives shares the content frameworks, platform strategies, and engagement tactics that are growing brands in Cebu and across the Philippines right now.',
      keywords: [
        'social media strategy Philippines 2026',
        'social media marketing Philippines',
        'content strategy Cebu 2026',
        'Instagram strategy Philippines',
        'TikTok marketing Philippines 2026',
        'social media agency Philippines',
        'digital marketing Cebu 2026',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'If your social media strategy in 2026 still looks like it did in 2022 — a mix of product shots, motivational quotes, and promotional posts on a fixed weekly schedule — you are not just behind. You are invisible. The platforms have changed, the algorithms have changed, and most importantly, your audience has changed. Filipino consumers are consuming more content than ever, but they are also better than ever at filtering out brands that are not giving them something worth stopping for.',
      },
      {
        type: 'heading',
        content: 'What the Algorithm Actually Rewards in 2026',
      },
      {
        type: 'paragraph',
        content:
          'Across Instagram, Facebook, and TikTok, the algorithm signal that matters most in 2026 is watch time and save rate — not likes, not follower count. Content that people watch all the way through and save for later is content that gets distributed. This fundamentally changes what you should be creating: less promotional, more genuinely valuable. Teach something. Show something. Say something worth remembering.',
      },
      {
        type: 'quote',
        content:
          'In 2026, the most powerful social media strategy for Philippine businesses is embarrassingly simple: create content so useful that people save it, and so genuine that people share it. Everything else is noise.',
      },
      {
        type: 'heading',
        content: 'The Platform Breakdown: Where to Focus for Philippine Brands',
      },
      {
        type: 'list',
        content: 'Platform-by-platform strategy for 2026:',
        items: [
          'Facebook — still dominant for reaching Filipino audiences 28 and above, essential for local service businesses and community-driven brands',
          'Instagram — the primary platform for visual industries: food, fashion, beauty, interiors, hospitality, and creative services',
          'TikTok — highest organic reach of any platform right now, essential for brands willing to show personality and behind-the-scenes content',
          'YouTube Shorts — underused by Philippine brands, high reward for businesses that can commit to short educational content',
          'LinkedIn — essential if your customers are businesses, decision-makers, or professionals',
        ],
      },
      {
        type: 'heading',
        content: 'The Content Mix That Is Working for Cebu Brands Right Now',
      },
      {
        type: 'paragraph',
        content:
          'The brands in Cebu that are growing fastest on social media are doing roughly this: 40% educational content that genuinely teaches their audience something useful, 30% behind-the-scenes content that shows the people and process behind the business, 20% social proof and results — testimonials, before-and-afters, case studies — and 10% direct promotional content. The ratio matters. Too much promotion and your engagement drops. Too little and you never convert followers into customers.',
      },
      {
        type: 'heading',
        content: 'The Compounding Effect: Why Consistency Beats Virality',
      },
      {
        type: 'paragraph',
        content:
          'One viral post will not build your business. Consistent, quality content posted over twelve months will. The brands that dominate social media in their categories are not the ones chasing trends — they are the ones showing up with the same quality, the same voice, and the same value week after week. This is what builds the kind of brand recognition and trust that turns followers into paying customers. At Huna Creatives, every <a href="/services">social media strategy</a> we build is designed for the long game — because that is where the real returns are. <a href="/contact">Let us build yours.</a>',
      },
    ],
    cta: {
      heading: 'Build a social media presence that compounds over time.',
      body: "Huna Creatives creates social media strategies and content for businesses in Cebu and across the Philippines. Let's build yours.",
    },
    relatedSlugs: [
      'content-creation-that-builds-authority',
    ],
  },
  {
    slug: 'print-design-still-matters',
    category: 'Brand Identity',
    title: 'Graphic Design Services in Cebu: Premium Brand Collateral That Makes People Remember You',
    excerpt:
      'In a city full of tarpaulins and generic business cards, premium graphic design is one of the sharpest competitive advantages available to Cebu businesses. Here is how to use it.',
    readTime: '6 min read',
    date: 'January 14, 2026',
    isoDate: '2026-01-14',
    heroImage: '/images/blog-print-design-hero-001.jpg',
    author: {
      name: 'Katleen Nellas',
      role: 'Senior Graphic Designer',
      avatar: '/images/team-katleen-nellas.webp',
    },
    seo: {
      description:
        'Looking for graphic design services in Cebu? Huna Creatives designs premium brand collateral for businesses in Cebu City — business cards, brochures, packaging, event materials, and digital assets that make your brand impossible to forget.',
      keywords: [
        'graphic design Cebu',
        'graphic designer Cebu City',
        'brand collateral Cebu',
        'print design Philippines',
        'business card design Cebu',
        'brochure design Cebu City',
        'design agency Cebu',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Walk into any networking event in Cebu City and collect the business cards. When you get home, spread them on the table. Some will be instantly forgettable — printed on thin stock, generic layout, Times New Roman. One or two will make you stop. Premium paper, a thoughtful design, a finish that makes you run your thumb across it. Those businesses already have an advantage before a single word has been exchanged. That is what great graphic design does.',
      },
      {
        type: 'heading',
        content: 'Why Print Still Matters in a Digital World',
      },
      {
        type: 'paragraph',
        content:
          'The case for print has actually gotten stronger as everything has gone digital. Because everyone has moved online, physical brand materials have become rarer — and rarer things get more attention. A beautifully designed brochure left in a client\'s office, premium packaging that turns delivery into an experience, an event backdrop that commands the room — these physical touchpoints create brand impressions that no digital ad can replicate.',
      },
      {
        type: 'quote',
        content:
          'In a digital world, great print design is a luxury signal. It says: we care enough about our brand to invest in the physical experience. That message lands before anyone reads a single word.',
      },
      {
        type: 'heading',
        content: 'Graphic Design Services Cebu Businesses Actually Need',
      },
      {
        type: 'list',
        content: 'What Huna Creatives designs for Cebu businesses:',
        items: [
          'Business cards — thick stock, premium finish, designed to be kept instead of thrown away',
          'Brochures and company profiles — your offline sales tool for B2B meetings and events',
          'Packaging design — for food, retail, and product businesses that want unboxing to feel premium',
          'Event materials — backdrops, pull-up banners, programs, and booth design',
          'Presentation decks — investor pitches and client proposals that look as good as your work',
          'Social media graphics — on-brand digital assets that look consistent across every platform',
        ],
      },
      {
        type: 'heading',
        content: 'The Bridge Between Print and Digital',
      },
      {
        type: 'paragraph',
        content:
          'The smartest brand collateral in 2026 bridges physical and digital. A QR code on a premium brochure that leads to a beautifully designed landing page. Packaging designed to be photographed and shared on Instagram. Business cards that link to a digital portfolio or booking page. At Huna Creatives, we design <a href="/services">brand materials that work in both worlds</a> — so your physical touchpoints amplify your digital presence instead of existing separately from it. Browse our <a href="/portfolio">portfolio</a> to see how we bridge print and digital for Cebu businesses.',
      },
      {
        type: 'heading',
        content: 'Getting Print Right: What Most Cebu Businesses Miss',
      },
      {
        type: 'paragraph',
        content:
          'Great print design requires understanding print production — color modes, bleed, resolution, paper stock, and finishing options like matte lamination, spot UV, or foil. These technical details are the difference between a print piece that looks amateur and one that looks premium. Our team handles every aspect from concept to print-ready files, ensuring your materials look as good in hand as they do on screen. <a href="/contact">Get a quote for your next print project.</a>',
      },
    ],
    cta: {
      heading: 'Make your brand impossible to forget — in print and online.',
      body: "Huna Creatives designs premium brand collateral for businesses in Cebu City and across the Philippines. From business cards to full campaign materials, let's make something worth keeping.",
    },
    relatedSlugs: [
    ],
  },
  {
    slug: 'sentro-os-hr-operations-hub-creative-agencies-philippines',
    category: 'Tools & Operations',
    title: 'Sentro OS: The HR and Operations Hub Built for Creative Agencies in the Philippines',
    excerpt:
      'Most HR tools were built for corporations. Sentro OS was built for creative agencies — attendance via Slack, one-click payroll, client project tracking, and contracts, all in one system designed specifically for how Philippine agencies actually work.',
    readTime: '7 min read',
    date: 'March 25, 2026',
    isoDate: '2026-03-25',
    heroImage: '/images/blog-sentro-os-hero.png',
    heroImagePosition: '50% 20%',
    author: {
      name: 'Francis Fiel Roble',
      role: 'Founder & Creative Director',
      avatar: '/images/team-francis-fiel-roble.webp',
    },
    seo: {
      description:
        'Sentro OS is a custom-built HR and operations hub for creative agencies in the Philippines. Manage attendance, payroll, time-off, overtime, client projects, and contracts — all in one system built specifically for Philippine agencies and remote creative teams.',
      keywords: [
        'HR software Philippines creative agency',
        'operations hub Philippines',
        'payroll system creative agency Philippines',
        'attendance tracking Slack Philippines',
        'agency management software Philippines',
        'Sentro OS',
        'HR system for agencies Cebu',
      ],
    },
    body: [
      {
        type: 'paragraph',
        content:
          'Running a creative agency in the Philippines means juggling things that most HR software was never designed to handle — contractors on different rate structures, attendance tracked through Slack, payroll split between peso and dollar payments, client projects that need to connect to team costs, and a level of operational complexity that spreadsheets stopped being able to manage a long time ago. We know this because we lived it at <a href="/about">Huna Creatives</a>. <a href="/sentro">Sentro OS</a> is the system we built to solve it.',
      },
      {
        type: 'heading',
        content: 'What Sentro OS Actually Is',
      },
      {
        type: 'paragraph',
        content:
          'Sentro OS is a custom-built internal operations hub for creative agencies, design firms, and marketing studios. It brings together the functions that agency owners spend the most time managing manually — attendance, payroll, time-off, overtime, contracts, client projects, and team HR — into a single, branded system built specifically for how agencies in the Philippines operate. It is not a generic HR tool with a local skin. It is built from the ground up for this context.',
      },
      {
        type: 'heading',
        content: 'The Features That Actually Matter for Philippine Agencies',
      },
      {
        type: 'list',
        content: 'What Sentro OS manages out of the box:',
        items: [
          'Attendance via Slack — team members punch in and out from a Slack channel, timestamps captured automatically',
          'Payroll automation — calculates pay per period for hourly, fixed-rate, and project-based contractors, including USD-to-PHP conversion',
          'Time-off and overtime management — requests, approvals, and balance tracking in one place',
          'Client project tracking — contract value, collections, costs, and team payouts per project',
          'Digital contracts — generate, send, and track contractor agreements without leaving the system',
          'Team dashboard — see who is online, who is on leave, and where every project stands at a glance',
        ],
      },
      {
        type: 'quote',
        content:
          'We built Sentro OS because every HR tool we tried was designed for a company with 500 employees in an office building. We needed something that worked for a lean, remote creative team — and nothing like it existed.',
      },
      {
        type: 'heading',
        content: 'Who Sentro OS Is For',
      },
      {
        type: 'paragraph',
        content:
          'Sentro OS is built for creative agencies, design studios, marketing firms, and any service-based team that manages a mix of remote contractors and staff. It is particularly suited to Philippine-based agencies operating on a combination of local and international clients — where payroll involves multiple currencies, payment types, and rate structures that generic HR tools simply cannot handle cleanly.',
      },
      {
        type: 'heading',
        content: 'The Problem With Generic HR Software for Agencies',
      },
      {
        type: 'paragraph',
        content:
          'Tools like BambooHR, Workday, and even local payroll apps are built for traditional employment structures — fixed salaries, office-based attendance, standard benefit calculations. Creative agencies rarely look like this. You have contractors on project rates, freelancers on hourly arrangements, team members in different time zones, and clients whose project budgets are directly tied to team costs. Sentro OS is built around this reality, not the corporate HR template.',
      },
      {
        type: 'heading',
        content: 'Pricing and Setup',
      },
      {
        type: 'paragraph',
        content:
          'Sentro OS starts at ₱2,500 per month with a one-time ₱15,000 setup fee for small teams on the Starter plan. The Growth plan — designed for larger agencies with more complex payroll and project tracking needs — runs ₱5,999 per month with a ₱25,000 setup. Enterprise pricing is available for custom builds and agencies that need white-labeled versions for their own clients. Every plan includes onboarding support — we set the system up with you, not just for you.',
      },
      {
        type: 'heading',
        content: 'Why We Built It and Why We Are Offering It to Other Agencies',
      },
      {
        type: 'paragraph',
        content:
          'Huna Creatives built <a href="/sentro">Sentro OS</a> to run our own agency operations. After using it internally and seeing how dramatically it reduced the time we spent on HR administration and payroll, we realized it could do the same for other agencies dealing with the same problems. If you are managing a creative team in the Philippines and spending hours each week on attendance tracking, payroll calculations, and contract administration — <a href="/sentro">Sentro OS</a> was built for exactly your situation.',
      },
    ],
    cta: {
      heading: 'Stop managing your agency with spreadsheets.',
      body: 'Sentro OS is the operations hub built for creative agencies in the Philippines. See how it works and get your team set up — starting at ₱2,500/month.',
    },
    relatedSlugs: [
    ],
  },
];

export const getBlogArticle = (slug: string): BlogArticle | undefined =>
  blogArticles.find((a) => a.slug === slug);

export const getFeaturedArticles = (count = 3): BlogArticle[] =>
  blogArticles.slice(0, count);
