import type { BlogArticle } from './data';

// The RSVP Studio launch posts (Nov 2026): how the platform was built, and the
// motion work made for its launch. Listed first among the case studies.

const rsvpBuildPost: BlogArticle = {
  slug: 'rsvp-studio-digital-invitation-website-cebu-philippines',
  category: 'Case Study',
  title: 'Building The RSVP Studio: Digital Invitations Made in Cebu',
  excerpt:
    'We used to hand-build wedding and birthday invitation websites one at a time. Then we turned the method into a platform. Here is how we designed and built The RSVP Studio: 27 designs, a builder, RSVPs, emails, payments and a free seating chart maker.',
  readTime: '9 min read',
  date: 'November 4, 2026',
  isoDate: '2026-11-04',
  heroImage: '/images/blog-rsvp-studio-hero.webp',
  author: {
    name: 'Francis Fiel Roble',
    role: 'Founder & Creative Director',
    avatar: '/images/team-francis-fiel-roble.webp',
  },
  seo: {
    description:
      'How our Cebu studio built The RSVP Studio, a digital invitation and RSVP website platform for Filipino weddings, debuts, christenings and 1st birthdays.',
    keywords: [
      'digital invitation Philippines',
      'wedding website Philippines',
      'online RSVP Philippines',
      'evite Cebu',
      'debut invitation website',
      'christening invitation online',
      '1st birthday digital invitation',
      'free wedding website builder Philippines',
      'seating chart maker Philippines',
      'ting hun invitation',
      'web design Cebu',
      'The RSVP Studio',
    ],
  },
  body: [
    {
      type: 'paragraph',
      content:
        'Before The RSVP Studio was a product, it was a habit. We built invitation websites for people we knew: a wax-sealed envelope that opens for a wedding, a pickleball court for a 30th, glitter-cut numerals for a 41st. Each one was its own codebase, its own guest list, its own late night. They worked. They also did not scale past us.',
    },
    {
      type: 'paragraph',
      content:
        'On November 2, 2026 we launched <a href="https://thersvpstudio.com" target="_blank" rel="noopener noreferrer">thersvpstudio.com</a>, the platform those builds turned into. Hosts pick a design, add their details and photos, and share one link. Guests RSVP on the page. This is how we designed and built it, end to end, from a studio in Cebu.',
    },
    { type: 'heading', content: 'Where it started: four invitations, four codebases' },
    {
      type: 'paragraph',
      content:
        'The early sites are written up in <a href="/blog/digital-invitations-evites-cebu">digital invitations in Cebu</a> and <a href="/blog/milestone-birthday-evite-pickleball">our pickleball birthday evite</a>. What those builds taught us was less about design than about plumbing. Every event needed the same five things: a page that loads on mobile data, a map pin, a dress code you can see, a form that records who is coming, and a list the host can actually read.',
    },
    {
      type: 'paragraph',
      content:
        'Every one of those sites ended with the same footer line: "Made with love by The RSVP Studio." The name came before the product. The product was the decision to stop rebuilding the plumbing for every event and put our time into the part guests see.',
    },
    { type: 'heading', content: 'The brand: a stationery shop, not an app' },
    {
      type: 'paragraph',
      content:
        'Event software tends to look like event software: bright gradients, confetti, a dashboard with a party hat on it. We wanted the opposite. The RSVP Studio reads like a stationer that happens to build websites. Lora, a bookish serif, carries the headlines. Inter does the work in forms and dashboards. The base is warm off-white and deep navy ink, with one blue for every button that matters.',
    },
    {
      type: 'paragraph',
      content:
        'The only playful thing is a cast of paper characters. They show up as profile pictures, in the loading screen, and in the closing scene of each service page, where the sun or the moon comes out depending on the visitor\'s clock. The tagline is the brief in one line: "Your celebration is our celebration, too."',
    },
    { type: 'heading', content: '27 designs, built by hand for Filipino occasions' },
    {
      type: 'paragraph',
      content:
        'The library launched with 27 designs. Every one is hand-built. No two share a layout, and none is a colour swap of another. The rule we settled on for the Premium designs is one physical scene, the whole page long. Riviera is a single yacht seen from above on a live-rendered sea. Poolside is a resort pool whose water is drawn in real time, with the names tiled into the pool floor. Summit is a climb up a Philippine rainforest mountain as the guest scrolls.',
    },
    {
      type: 'paragraph',
      content:
        'Then there are the occasions most invitation platforms abroad do not think about. A debut, the 18th birthday that marks a young woman\'s coming of age here, has its own program: 18 Roses, 18 Candles, and more and more often 18 Treasures. A christening comes with Ninongs and Ninangs. A Chinese-Filipino engagement has its own tea ceremony and its own calendar. A generic "Party" template handles none of that.',
    },
    {
      type: 'list',
      content: 'Designs made for how Filipino families celebrate:',
      items: [
        'Capiz: a wedding inside a bahay na bato, opening through an amber-lit capiz window, with the entourage set as a lit capiz screen',
        'Simbahan: a wedding that walks the guest down a church aisle',
        'Debut Issue: an 18th birthday as a fashion magazine, with her 18 Roses, Candles and Treasures as numbered pages and a tear-out reply card',
        'Calado: a christening and first birthday with the baby\'s name embroidered into a hoop, the Ninongs and Ninangs stitched as a sampler, and "Maraming salamat po" at the close',
        'Ting Hun: three engagement designs (Rice Paper, Lacquer Door and Porcelain Garden) with traditional characters and the lunar date shown beside the Gregorian one',
      ],
    },
    {
      type: 'image',
      content: '/images/blog-rsvp-studio-phone-designs.webp',
      alt: 'Capiz, Debut Issue, Calado and Simbahan digital invitation designs on phone screens',
      caption: 'Capiz, Debut Issue, Calado and Simbahan on a phone. Most guests will only ever see the phone version, so that is the one we design first.',
    },
    {
      type: 'paragraph',
      content:
        'Scrolling is where most animated invitations fall apart, so we wrote one scroll engine and every scroll design uses it. On phones, the browser does the scrolling and the page snaps to the next section: one swipe, one stop. Nothing fights the phone\'s own momentum. On desktop, a trackpad flick or the arrow keys move one section at a time. We tested this frame by frame on real iPhone recordings, because a swipe that stalls halfway reads as a broken invitation.',
    },
    {
      type: 'quote',
      content:
        'A guest does not know what a framework is. They know whether the page moved when they swiped it.',
    },
    { type: 'heading', content: 'The builder: edit the invitation, not a form about it' },
    {
      type: 'paragraph',
      content:
        'Most website builders give you a form on the left and a preview on the right. Ours started there. It now lets hosts click the words on the invitation itself and type, with undo. A Details panel holds everything else, and each design\'s own fields sit in the section they describe. Hosts can switch designs at any time and their details and photos carry over.',
    },
    {
      type: 'list',
      content: 'What the builder handles for a Filipino guest list:',
      items: [
        'Entourage presets for a wedding (parents, principal sponsors, candle, veil, cord and coin sponsors), a debut (18 Roses, 18 Candles, 18 Treasures, escort), a christening (Ninongs and Ninangs) and a Ting Hun',
        'Motif colours shown as swatches beside the dress code',
        'Cash gifts: a GCash, Maya or bank QR code guests can scan from the site',
        'An RSVP deadline, and custom RSVP questions for meals, songs or shuttles',
        'A site password for private events, on free and Premium sites alike',
        'A free web address on our domain, or your own .com, .co, .net, .wedding, .love or .party from ₱1,499 a year',
      ],
    },
    {
      type: 'image',
      content: '/images/blog-rsvp-studio-designs.webp',
      alt: 'The RSVP Studio Build Your Website page with design cards for Simbahan, Promenade and Safari and filters for Wedding, Ting Hun, Debut and Christening',
      caption: 'The design gallery filters by occasion: Wedding, Ting Hun, Birthday, Debut, Christening and 1st birthday, and more.',
    },
    { type: 'heading', content: 'The guest side: one link, no app, no account' },
    {
      type: 'paragraph',
      content:
        'Guests open a link and reply on the page. They do not download anything or make an account. Under the venue there is "Open in Maps" and "Add to calendar", the two things guests reach for first. Every guest who replies gets a confirmation email with the date, the venue, a map link and a calendar link.',
    },
    {
      type: 'paragraph',
      content:
        'For hosts who need tighter control, every name on the invite list gets a personal link, so replies match the right guest. On Premium, each guest\'s seats cap how many people they can bring, and the host can make the RSVP invite-only. That answers the most common Filipino guest-list problem in software instead of in an awkward group chat. Premium sites can also let guests find their table by typing their name, and share their own photos to a page on the site.',
    },
    {
      type: 'paragraph',
      content:
        'Older guests were part of the brief, not an afterthought. Local planners note that most Filipino adults over 50 get their links through Viber or Facebook Messenger, so the invitation has to work as a link pasted into those apps. That is why the link preview got its own engineering, covered below. The same planners note that principal sponsors and older relatives still expect a printed card, so we built the site to sit beside print, not replace it. A short web address reads well on a card.',
    },
    { type: 'heading', content: 'RSVP management and the emails behind it' },
    {
      type: 'paragraph',
      content:
        'Each event gets a dashboard with a Guests tab: replies, an invite list that shows who has not answered, a reminder message ready to copy, answers to every RSVP question, and a CSV export. RSVP management is free with every website, whether we design it or the host builds it.',
    },
    {
      type: 'image',
      content: '/images/blog-rsvp-studio-rsvp-dashboard.webp',
      alt: 'RSVP management dashboard showing guest replies, party size, dietary notes and messages',
      caption: 'Replies land in one list with party size, dietary notes and messages, instead of scattered across Viber threads.',
    },
    {
      type: 'paragraph',
      content:
        'Email goes out through Resend under our own domain. We designed it the same way we designed the invitations. Guest confirmations come as a navy ticket with gold italics and a small polaroid of the cover photo, because those emails come from the hosts and should look like it. Free sites send hosts one summary a day of new RSVPs. Premium sends an email the moment each guest replies, sends confirmations in the hosts\' names, and reminds guests who said yes two days before the event.',
    },
    {
      type: 'table',
      content: 'Free and Premium websites on The RSVP Studio',
      columns: ['', 'Free', 'Premium'],
      rows: [
        ['Price', '₱0', '₱499 once per site'],
        ['Designs', 'Every Standard design', 'Every design, including Premium'],
        ['Guest confirmation emails', 'Yes', 'Yes, sent in the hosts\' names'],
        ['Host RSVP emails', 'One daily summary', 'One per reply, as it happens'],
        ['Custom RSVP questions', '1', 'Up to 5'],
        ['Reminder 2 days before', 'No', 'Yes'],
        ['Find your table, guest photos, invite-only', 'No', 'Yes'],
        ['Stays online', 'Until 30 days after the event', 'A year after the event'],
      ],
    },
    { type: 'heading', content: 'Payments in pesos, the way people here pay' },
    {
      type: 'paragraph',
      content:
        'Payments run through PayMongo, so hosts pay with GCash, Maya, a card or QR Ph from any banking app. The receipt is our own branded email, and it appears in the dashboard as soon as the payment clears. The same checkout handles Premium, web addresses and invoices for the sites we design for clients. Semi-Custom websites start at ₱3,000 and Custom websites at ₱8,000.',
    },
    { type: 'heading', content: 'The studio side, and Mesa' },
    {
      type: 'paragraph',
      content:
        'Behind the public site is the console our team runs the business from: enquiries and leads with replies sent in our own branded email, client projects and invoices, a support inbox, and the template library with its display order. Hosts get their own dashboard. Coordinators and creators get a partner page with their own link.',
    },
    {
      type: 'paragraph',
      content:
        'We also built Mesa, a free seating chart maker. Paste a guest list in whatever shape it is in, from a Google Forms export to "Fam. Reyes - 4", and Mesa reads it into households and groups. Start from a Philippine wedding layout with a presidential table, a debut layout with tables for the 18 Roses and 18 Candles, or a lauriat of 12-seat rounds. "Seat everyone" places guests without splitting households and says why each guest sits where they do. No sign-up to start, no guest limit.',
    },
    {
      type: 'image',
      content: '/images/blog-rsvp-studio-mesa-seating.webp',
      alt: 'Mesa free seating chart maker showing a wedding floor plan with sponsor and entourage tables',
      caption: 'Mesa, the free seating chart maker, with sponsor, entourage and family tables.',
    },
    { type: 'heading', content: 'Link previews and performance: the unglamorous half' },
    {
      type: 'paragraph',
      content:
        'An invitation link pasted into a group chat is judged by its preview before anyone taps it. Each published site gets a 1200 by 630 preview image, cropped around the focal point of the cover photo, which is the shape Facebook, Messenger, iMessage and WhatsApp all show. Every publish refreshes it, so the preview never shows last week\'s photo. Titles and descriptions are rendered on the server, so they show up even though the site itself is an app.',
    },
    {
      type: 'paragraph',
      content:
        'The Philippines had 98.0 million internet users at the end of 2025, according to DataReportal. Most of them will open an invitation on a phone, often on mobile data. So phone photos, which come off the camera at 3 to 15 MB, are shrunk in the browser before they upload, then served from Cloudflare. The design gallery uses still cards, so it does not lag while you browse 27 animated designs. Scenes redraw every frame while the page is moving and keep idle motion light when it is not. The stack is React on the front end, Supabase for accounts and data, Vercel for hosting, PayMongo for payments and Resend for email: each picked because it does one job for the host and does it reliably.',
    },
    { type: 'heading', content: 'Launch, and what comes next' },
    {
      type: 'paragraph',
      content:
        'Serious work on the platform started in mid-September 2026. It went live on November 2, 2026, after a launch-week audit that added guards against email abuse, branded receipts, retries on failed sends, and proper 404 pages.',
    },
    {
      type: 'paragraph',
      content:
        'The lesson holds from those first four invitations. Design gets the guest to open the link. The plumbing gets them to reply. A platform has to do both well for every event, every time, without us at the keyboard.',
    },
    {
      type: 'paragraph',
      content:
        'If you are planning a wedding, a debut, a christening or a first birthday, <a href="https://thersvpstudio.com/build" target="_blank" rel="noopener noreferrer">start a site for free</a>. If you run a business that needs its own platform built properly, the same team is behind our <a href="/portfolio/web-design">web design work</a> and builds like <a href="/blog/asana-ormoc-pilates-studio-website-booking-hub">Asana Ormoc</a>. <a href="/contact">Tell us what you are building</a>.',
    },
  ],
  faqs: [
    {
      q: 'Is there a free wedding website builder in the Philippines?',
      a: 'Yes. The RSVP Studio lets you design, preview and publish a wedding, birthday, debut or christening website with any Standard design for free, with an RSVP form, a guest list and a confirmation email for every guest. Premium is a one-time ₱499 per site.',
    },
    {
      q: 'How do I collect RSVPs for a Filipino wedding or debut online?',
      a: 'Share one invitation link in Viber, Messenger or by email. Guests reply on the page without an app or an account, and every reply lands in your guest list with party size and any answers you asked for. Personal links let you match replies to each guest and cap their seats.',
    },
    {
      q: 'Can a digital invitation include the entourage and principal sponsors?',
      a: 'Yes. The builder has presets for a wedding entourage (parents, principal sponsors, and candle, veil, cord and coin sponsors), a debut (18 Roses, 18 Candles, 18 Treasures), a christening (Ninongs and Ninangs) and a Ting Hun, one name per line.',
    },
    {
      q: 'Can guests send cash gifts through GCash or Maya?',
      a: 'Yes. Add your GCash, Maya or bank QR code under Gifts in the builder and guests can scan it straight from the invitation website. Payments to The RSVP Studio itself accept GCash, Maya, cards and QR Ph through PayMongo.',
    },
    {
      q: 'How much does a custom invitation website cost?',
      a: 'Building your own is free, with Premium at ₱499 per site. If you want us to design it, Semi-Custom websites start at ₱3,000 and Custom websites at ₱8,000. Your own web address starts at ₱1,499 a year.',
    },
    {
      q: 'Is there a free seating chart maker for Filipino weddings and debuts?',
      a: 'Yes. Mesa by The RSVP Studio is free, with no guest limit and no sign-up needed to start. It has layouts for a Philippine wedding with a presidential table, a debut with 18 Roses and 18 Candles tables, and a lauriat of 12-seat rounds. A free account lets you download the chart as a PDF and share it.',
    },
  ],
  sources: [
    { label: 'DataReportal — Digital 2026: The Philippines', url: 'https://datareportal.com/reports/digital-2026-philippines' },
    { label: 'Wikipedia — Philippine debut', url: 'https://en.wikipedia.org/wiki/Philippine_debut' },
    {
      label: 'EventNest — Tips for Managing RSVPs Online When Your Ninongs and Ninangs Are Not Tech Savvy',
      url: 'https://eventnest.ph/blog/tips-for-managing-rsvps-online-when-your-ninongs-and-ninangs-are-not-tech-savvy',
    },
    {
      label: 'EventNest — Digital Wedding Invitations in the Philippines: Are They Socially Acceptable?',
      url: 'https://eventnest.ph/blog/digital-wedding-invitations-in-the-philippines-are-they-socially-acceptable',
    },
  ],
  cta: {
    service: 'Website Design',
    heading: 'Need a platform, not just a page?',
    body: 'We designed and built The RSVP Studio end to end, from the brand to the payments. Tell us what your business needs to run online.',
  },
  relatedSlugs: [
    'digital-invitations-evites-cebu',
    'milestone-birthday-evite-pickleball',
    'asana-ormoc-pilates-studio-website-booking-hub',
  ],
};

const motionPost: BlogArticle = {
  slug: 'motion-graphics-reels-cebu-philippines',
  category: 'Case Study',
  title: 'Motion Graphics in Cebu: How We Made Four Launch Reels',
  excerpt:
    "For The RSVP Studio's launch we made four vertical reels and a 3D launch carousel. Here is the process behind motion graphics and short-form video at Huna, with the frame sizes, timings and mistakes left in.",
  readTime: '8 min read',
  date: 'November 4, 2026',
  isoDate: '2026-11-04',
  heroImage: '/images/blog-motion-graphics-hero.webp',
  author: {
    name: 'Francis Fiel Roble',
    role: 'Founder & Creative Director',
    avatar: '/images/team-francis-fiel-roble.webp',
  },
  seo: {
    description:
      'How a Cebu studio makes motion graphics, Reels and video ads: script, storyboard, motion, voice-over and export specs, using four real launch reels as the example.',
    keywords: [
      'motion graphics Cebu',
      'motion graphics Philippines',
      'video ads Philippines',
      'Reels ads Philippines',
      'animated reels for business Philippines',
      'short-form video production Cebu',
      'motion design studio Philippines',
      'TikTok video ads Philippines',
      'explainer video Cebu',
      'broadcast graphics Philippines',
      'product launch video Philippines',
      'Huna Creatives',
    ],
  },
  body: [
    {
      type: 'paragraph',
      content:
        'On November 2, 2026, we launched <a href="https://thersvpstudio.com" target="_blank" rel="noopener noreferrer">The RSVP Studio</a>, our platform for event websites and digital invitations. A launch needs things that move. In one week we made four vertical reels and a four-slide launch carousel.',
    },
    {
      type: 'paragraph',
      content:
        'This post is how we make motion graphics, using that work as the example. It is the same process we use for brands in Cebu and across the Philippines who need Reels, video ads or a product walkthrough. The numbers are real. So are the mistakes.',
    },
    { type: 'heading', content: 'Why short-form video, and why vertical' },
    {
      type: 'paragraph',
      content:
        'The Digital 2026 Philippines report counts 95.8 million social media user identities, an average of 33 hours and 50 minutes a week on social media, and 97.8% of internet users going online by phone. Your customer is holding a phone upright. The video should be shaped like the phone.',
    },
    {
      type: 'paragraph',
      content:
        'The platforms say the same thing. Meta recommends 9:16 video with audio, with key messages kept inside the safe zone, for Reels ads. TikTok asks for 9:16, sound, and the proposition in the first three seconds. None of that is taste. It is the shape of the screen and the length of a thumb.',
    },
    { type: 'heading', content: 'The four reels' },
    {
      type: 'list',
      content: 'Each one had a single job:',
      items: [
        'The walkthrough (58 seconds, 9:16 and 4:5, 60 fps). Build an event website from gallery to published link, then watch a guest open it and reply. Posted the day before launch.',
        'The pickleball reel (20 seconds, 30 fps). Three pickleball designs on three courts seen from above. One ball is rallied between them, and every paddle hit whips the camera to the next design.',
        'The custom website reel (25 seconds, 30 fps). A pencil sketch of a couple’s wax seal and lake scene, drawn stroke by stroke, that washes into their real wedding website.',
        'The Mesa reel (42 seconds, 30 fps). An introduction to the free seating chart maker. One room, one camera, with the app’s screens rising out of the floor plan.',
      ],
    },
    {
      type: 'paragraph',
      content:
        'All four use real product. Nothing on a phone screen is a mock-up. We filmed the real site in a browser running five times slower than normal, so every frame of a fast interaction comes out clean. Then we built the reels in code and rendered them frame by frame.',
    },
    { type: 'heading', content: 'Our process, step by step' },
    {
      type: 'list',
      content: 'Every motion job, from a 15-second Reel to a broadcast package, runs in the same order:',
      items: [
        'Brief. One sentence on what the viewer should do or know at the end. If it needs two sentences, it is two videos.',
        'Script, written as spoken sentences. Even with no voice-over, the script sets the rhythm.',
        'Storyboard, built around one signature moment. Everything else is in service of it.',
        'Static design. Every frame that matters is designed as a still first, usually as layered SVG artwork, so motion has clean layers to move.',
        'Motion. Timing, easing and camera, cut to the script’s clock.',
        'Sound and voice-over. Music, effects and voice mixed to a consistent loudness.',
        'Exports. One master, then every size and format each platform or broadcaster asks for.',
      ],
    },
    { type: 'heading', content: 'Script: write it the way a person says it' },
    {
      type: 'paragraph',
      content:
        'Our first cut of the Mesa reel ran 23 seconds and opened with lines like "77 guests. 1 seating chart." On a slide, that is copy. Read aloud, it sounds like nobody. We threw it out.',
    },
    {
      type: 'paragraph',
      content:
        'The rewrite was a script a person would say to a friend, voiced as one continuous take: "Paste your guest list into Mesa, however it’s typed." We transcribed the take to get the time of every word, then cut the picture to it. Hard cuts land on sentence starts. Captions show the full sentence being spoken.',
    },
    {
      type: 'quote',
      content:
        'Short lines are fine. Stat fragments are not. If you would not say it out loud, it does not go in the voice-over.',
    },
    { type: 'heading', content: 'Storyboard: one signature moment' },
    {
      type: 'paragraph',
      content:
        'A reel can survive average scenes. It cannot survive having no moment people remember. So each storyboard starts from one.',
    },
    {
      type: 'paragraph',
      content:
        'In the pickleball reel, it is the paddle hit. The ball crosses the court, the paddle swings in from off-frame, and the camera whips to the next phone with motion blur. The whole transition takes 1.2 seconds. It happens twice, then the reel ends on the three designs side by side.',
    },
    {
      type: 'image',
      content: '/images/blog-motion-paddle-whip.webp',
      alt: 'Five frames from the pickleball reel between 6.9 and 8.1 seconds, showing a paddle hit, a motion-blurred camera whip, and the next pickleball invitation design landing',
      caption: 'The signature moment, frame by frame. Paddle hit at 6.9s, whip at 7.2 to 7.4s, the next design settles by 8.1s.',
    },
    {
      type: 'paragraph',
      content:
        'In the custom website reel, the moment is the turn from sketch to real. The pencil draws the monogram loosely, then firmly, from 0.3 to 4.6 seconds, then the seal around it. The lake scene is sketched in like a time-lapse. At 10.6 seconds a sepia wash turns the drawing into the couple’s actual envelope page, and a tap opens their live site.',
    },
    {
      type: 'image',
      content: '/images/blog-motion-sketch-to-site.webp',
      alt: 'Five frames from the custom website reel: a pencil monogram, a sketched lake scene with a wax seal, the phone outlined in pencil, a sepia wash, and the real wedding website at sunset',
      caption: 'From pencil to the real site in 17 seconds. The sketch was traced from the actual page, so the wash lines up exactly.',
    },
    {
      type: 'paragraph',
      content:
        'The sketch is not a filter. We traced the lines from their real page and gave every line a time to be drawn, in the order a hand would draw it. The pencil sound is generated from the same stroke timings, so you hear each line as it appears.',
    },
    { type: 'heading', content: 'Static design: layers before motion' },
    {
      type: 'paragraph',
      content:
        'Motion goes wrong when it starts from a flattened image. Nothing can move independently, and every change means starting over.',
    },
    {
      type: 'paragraph',
      content:
        'The same rule holds for sponsor and broadcast graphics. Our designer builds every size as layered SVG statics: 4K 16:9, 9:16 and 1:1 title cards, popup banners and logo bugs. Broadcast specs often require the artwork to stay still, so the motion goes on top, in light rather than movement: glints, flashes and fades.',
    },
    {
      type: 'paragraph',
      content:
        'For The RSVP Studio, the statics were the product itself: the real designs, filmed off the live site. The launch carousel went further. We built it as 3D scenes in Blender, with paper characters on acrylic stands, props and the live site on a laptop screen, and animated the fourth slide.',
    },
    {
      type: 'image',
      content: '/images/blog-motion-launch-carousel.webp',
      alt: 'Four square launch carousel slides rendered in 3D: a laptop with paper characters on pink, design cards on blue, a printed invitation on wine red, and a phone on yellow',
      caption: 'The launch carousel, rendered as 3D scenes. Each slide has its own colour.',
    },
    { type: 'heading', content: 'Motion: be intentional about what the eye follows' },
    {
      type: 'paragraph',
      content:
        'The Mesa reel went through several versions in one day. One note on an early cut: "Scenes too zoomed in." Another: when Lola is dragged to a new table, the shot did not show where she was going.',
    },
    {
      type: 'paragraph',
      content:
        'The fix was a rule, not a tweak. Phones fill the width of the frame. Desktop dialogs are shown whole first, then the camera pushes in on what the voice names. The Lola shot holds the stage, the presidential table and table 7 at once. A dashed line shows her path, and a ring follows her and pulses when she lands.',
    },
    {
      type: 'image',
      content: '/images/blog-motion-one-room.webp',
      alt: 'Four frames from the Mesa reel showing a seating plan as a 3D floor, a dashed path as a guest is dragged to the presidential table, and an app panel rising from the floor',
      caption: 'One room, one camera. The seating plan is a floor in true perspective, and the app’s screens rise out of it next to what they control.',
    },
    {
      type: 'paragraph',
      content:
        'The final version keeps one camera in one room for the full 42 seconds. The plan is a floor in perspective. Each screen pops up from it like a pop-up book, next to the part of the room it is about, and folds back down. The finale floods the room blue for "It’s all free," with confetti.',
    },
    { type: 'heading', content: 'Sound and voice-over' },
    {
      type: 'paragraph',
      content:
        'Voice-over is voiced as one take, then cut at its pauses and placed on the picture. In the pickleball reel, the line "Game plan. What to wear. What to bring." exposed a timing problem: the sections were not on screen when they were said. We moved the captions to 8.5, 9.4 and 10.35 seconds and sped up the scroll, so each section appears as it is named.',
    },
    {
      type: 'paragraph',
      content:
        'Music ducks 5 to 10 dB under the voice. Every reel is mastered to around -14 LUFS, so it plays at the same level as everything else in the feed. And every reel carries captions, because some people will always watch muted.',
    },
    {
      type: 'image',
      content: '/images/blog-motion-walkthrough-storyboard.webp',
      alt: 'Twelve frames from the 58-second walkthrough reel, from picking a design and adding names to a guest replying on a phone and the launch countdown',
      caption: 'The walkthrough as a contact sheet: 12 frames from 58 seconds. Each caption lands on the scene it describes.',
    },
    { type: 'heading', content: 'Exports: one master, every size' },
    {
      type: 'table',
      content: 'The formats we deliver most. Broadcast specs are set by each broadcaster; the rows below are a typical brief.',
      columns: ['Deliverable', 'Frame size', 'Frame rate', 'File', 'Used for'],
      rows: [
        ['Reel / TikTok / Shorts', '1080 × 1920 (9:16)', '30 fps; 60 fps for screen walkthroughs', 'H.264 MP4, about -14 LUFS', 'Organic posts and boosted ads'],
        ['Feed video', '1080 × 1350 (4:5)', '60 fps', 'H.264 MP4', 'Facebook and Instagram feed'],
        ['Carousel slide', '1080 × 1080 (1:1), rendered larger', 'Stills; last slide animated', 'JPG, plus MP4 for the animated slide', 'Launch post'],
        ['Reel cover', '1080 × 1920', 'Still', 'JPG', 'Thumbnail on the profile grid'],
        ['Broadcast title card', '3840 × 2160 (4K 16:9)', '25 fps', 'ProRes 4444 with alpha', 'On-air sponsor cards'],
        ['Social title card', '9:16 and 1:1', 'To the program’s spec', 'ProRes 4444 with alpha', 'The program’s own social posts'],
        ['Popup banner and logo bug', 'To the broadcaster’s spec', 'To the broadcaster’s spec', 'ProRes 4444 with alpha', 'Overlays on the program'],
      ],
    },
    {
      type: 'paragraph',
      content:
        'Transparent overlays need an alpha channel. Apple’s ProRes 4444 family is the only ProRes codec that carries one, which is why broadcasters ask for it. Social video does not need transparency, so it ships as a normal MP4 with captions burned in.',
    },
    { type: 'heading', content: 'What we learned' },
    {
      type: 'list',
      content: 'Notes we now apply to every motion job:',
      items: [
        'Open on the payoff. A slow opening, like a scrolling list, loses the first three seconds you were given.',
        'Cut the picture to the voice, not the voice to the picture. Natural speech has its own rhythm, and forcing it breaks it.',
        'One swipe, one idea. Each beat holds long enough to read its caption, then moves. No beat carries two messages.',
        'Show the whole thing before you zoom. A viewer needs to know where they are before you show them a detail.',
        'Fake gestures look fake. A drawn finger tapping a screen looked fake, so we show taps as a screen-recording touch dot.',
        'Caption for sound-off, mix for sound-on. Both audiences are real.',
      ],
    },
    { type: 'heading', content: 'Motion graphics for brands in Cebu and the Philippines' },
    {
      type: 'paragraph',
      content:
        'We are a small studio in Cebu. Motion work is done over messages and calls, so the brand can be in Cebu, Manila, Davao or abroad. If you already have a brand system, motion is built from it. If you do not, start with <a href="/services">brand identity</a>, because motion multiplies whatever it is given.',
    },
    {
      type: 'paragraph',
      content:
        'For the invitation side of this work, see <a href="/blog/digital-invitations-evites-cebu">digital invitations in Cebu</a> and <a href="/blog/milestone-birthday-evite-pickleball">the pickleball evite</a> that started the theme. For more of our work, see the <a href="/portfolio">portfolio</a>. When you have something that needs to move, <a href="/contact">tell us about it</a>.',
    },
  ],
  faqs: [
    {
      q: 'How much do motion graphics cost in the Philippines?',
      a: 'It depends on length, the number of sizes, whether the artwork and footage already exist, 2D versus 3D, voice-over and music, and how many revision rounds are included. A 20-second Reel built from a finished brand system costs far less than a 3D product film or a multi-size broadcast package. Send us the brief and we will quote it.',
    },
    {
      q: 'How long does it take to make a Reel or video ad?',
      a: 'If the brand assets and the product are ready, a 20 to 45-second Reel takes days, not weeks. Most of the calendar is review. Broadcast packages take longer, because every size is checked against the broadcaster’s spec before delivery.',
    },
    {
      q: 'What size should a Reel or TikTok video ad be?',
      a: '9:16 vertical at 1080 × 1920, exported as an MP4. Keep text and logos inside the platform’s safe zone, so the caption and buttons do not cover them. We also deliver a 4:5 cut for the feed and a cover image when the post needs one.',
    },
    {
      q: 'Do I need a voice-over for a video ad?',
      a: 'Not always, but sound helps. Meta notes that Reels play with sound on by default, and TikTok recommends sound or music. We write the script as spoken sentences either way and caption every line, so the ad still works muted.',
    },
    {
      q: 'Can you deliver transparent video for broadcast or live streams?',
      a: 'Yes. Title cards, popup banners and logo bugs are delivered as ProRes 4444 with an alpha channel, at the frame size and frame rate the broadcaster sets, often 25 fps.',
    },
    {
      q: 'Do you only work with businesses in Cebu?',
      a: 'No. We are based in Cebu, but motion work happens over messages and calls. We work with brands across the Philippines and overseas.',
    },
  ],
  sources: [
    {
      label: 'Meltwater and We Are Social, Digital 2026 Philippines (summary)',
      url: 'https://www.meltwater.com/en/blog/social-media-statistics-philippines',
    },
    {
      label: 'Meta for Business, Instagram and Facebook Reels ads',
      url: 'https://www.facebook.com/business/ads/facebook-instagram-reels-ads',
    },
    {
      label: 'TikTok Ads, Creative best practices for performance ads',
      url: 'https://ads.tiktok.com/help/article/creative-best-practices?lang=en',
    },
    {
      label: 'Apple ProRes White Paper (April 2022)',
      url: 'https://www.apple.com/final-cut-pro/docs/Apple_ProRes.pdf',
    },
  ],
  cta: {
    service: 'Motion & Animation',
    heading: 'Need something that moves?',
    body: 'Reels, video ads, product walkthroughs and broadcast graphics, built from your brand and exported for every platform. Tell us what it needs to do.',
  },
  relatedSlugs: [
    'digital-invitations-evites-cebu',
    'milestone-birthday-evite-pickleball',
    'social-media-content-strategy-2025',
  ],
};

export const rsvpStudioLaunchArticles: BlogArticle[] = [rsvpBuildPost, motionPost];
