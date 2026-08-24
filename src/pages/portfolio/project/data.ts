
export interface ProjectData {
  slug: string;
  category: string;
  categoryLabel: string;
  title: string;
  subtitle: string;
  tags: string[];
  client: string;
  timeline: string;
  industry: string;
  scope: string;
  heroImage: string;
  challenge: { heading: string; body: string };
  approach: { heading: string; body: string };
  logos: { image: string; label: string; bg: string; noInvert?: boolean; invert?: boolean }[];
  /** Optional full-width reference boards shown beneath the logo grid (concept rationale, colorway sheets). */
  boards?: { image: string; label: string; bg?: string; padded?: boolean }[];
  typography: {
    description: string;
    fonts: { role: string; family: string; weights: string; sample: string }[];
  };
  colors: { name: string; hex: string }[];
  applications: { image: string; label: string; objectPosition?: string }[];
  results: {
    summary: string;
    metrics: { value: string; label: string; detail: string }[];
  };
  testimonial?: { quote: string; author: string; role: string };
}

export const projectDataMap: Record<string, ProjectData> = {
  'the-second-haus': {
    slug: 'the-second-haus',
    category: 'branding',
    categoryLabel: 'Branding & Identity',
    title: 'The Second Haus',
    subtitle:
      'We helped a client build "The Second Haus" from the ground up — logo, typography, color palette, brand guidelines, and every touchpoint in between. A complete identity for a modern consignment boutique.',
    tags: [
      'Logo Design',
      'Typography',
      'Color Palette',
      'Brand Guidelines',
      'Stationery',
      'Packaging',
    ],
    client: 'The Second Haus',
    timeline: '8 Weeks',
    industry: 'Retail & Consignment',
    scope: 'Full Brand Identity',
    heroImage: '/images/tsh-insta-unboxing.webp',
    challenge: {
      heading: 'Building trust in secondhand luxury',
      body:
        'The Second Haus needed to stand apart in the crowded resale market. The challenge was creating a brand that felt as premium and curated as a first-hand luxury boutique, while celebrating the sustainability and story behind pre-loved pieces. The identity had to appeal to style-conscious shoppers who value quality, authenticity, and conscious consumption.',
    },
    approach: {
      heading: 'Refined, warm, and intentional',
      body:
        "We started with deep discovery — understanding the founder's vision, the target audience, and the competitive landscape. From there we developed a brand strategy rooted in warmth, sophistication, and approachability. Every design decision, from the serif logotype to the earthy palette, was made to evoke the feeling of walking into a beautifully curated home filled with treasures.",
    },
    logos: [
      {
        image:
          '/images/1827f559443c4bd66862b224554bca7a.png',
        label: 'Primary Logotype',
        bg: 'bg-white',
      },
      {
        image:
          '/images/0621f849f4034126c37da149fd5260fe.png',
        label: 'Monogram Mark',
        bg: 'bg-[#F5F0EB]',
      },
      {
        image:
          '/images/00aeb013a4d67b243a25dc14bf0b6e50.png',
        label: 'Inverted Version',
        bg: 'bg-[#2C2825]',
      },
    ],
    typography: {
      description:
        "We paired a refined transitional serif for headlines with a clean geometric sans-serif for body copy. The combination feels elevated yet approachable — perfectly reflecting the brand's personality of curated luxury without pretension.",
      fonts: [
        {
          role: 'Display / Headlines',
          family: 'Playfair Display',
          weights: 'Regular 400 · Medium 500 · Bold 700',
          sample: 'Curated with care, styled with intention.',
        },
        {
          role: 'Body / UI',
          family: 'DM Sans',
          weights: 'Regular 400 · Medium 500 · Semibold 600',
          sample:
            'Every piece tells a story. We believe in giving beautiful things a second life — because great style never goes out of fashion.',
        },
      ],
    },
    colors: [
      { name: 'Charcoal', hex: '#2C2825' },
      { name: 'Warm Sand', hex: '#C4A882' },
      { name: 'Linen', hex: '#F5F0EB' },
      { name: 'Terracotta', hex: '#B8705A' },
      { name: 'Sage', hex: '#8A9A7B' },
    ],
    applications: [
      {
        image: '/images/tsh-real-coming-soon-2.webp',
        label: 'Launch Campaign',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-tsh4.webp',
        label: 'Branded Dust Bag',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-tsh2.webp',
        label: 'Lifestyle Photography',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-tsh1.webp',
        label: 'Lifestyle Photography',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-tsh8.webp',
        label: 'Editorial Flat Lay',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-ad-0.webp',
        label: 'Social Media Templates',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-tsh10.webp',
        label: 'Product Photography',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-bag-1.webp',
        label: 'Instagram Content',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-bag-2.webp',
        label: 'Instagram Content',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-real-bag-3.webp',
        label: 'Instagram Content',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-insta-collection.webp',
        label: 'Collection Photography',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-insta-unboxing.webp',
        label: 'Unboxing Experience',
        objectPosition: 'center',
      },
      {
        image: '/images/tsh-insta-box-logo.webp',
        label: 'Branded Packaging',
        objectPosition: 'center',
      },
    ],
    results: {
      summary:
        'The Second Haus launched with a cohesive, premium brand identity that immediately resonated with their target audience and set them apart in the consignment market.',
      metrics: [
        {
          value: '40+',
          label: 'Brand Assets Delivered',
          detail: 'Logos, templates, guidelines & more',
        },
        {
          value: '3x',
          label: 'Social Engagement',
          detail: 'Compared to pre-brand launch',
        },
        {
          value: '100%',
          label: 'Brand Satisfaction',
          detail: 'Exceeded expectations on every deliverable',
        },
      ],
    },
    testimonial: {
      quote:
        "Huna Creatives didn't just design a logo — they gave The Second Haus a soul. Every detail, from the color palette to the hang tags, feels like it was made with so much care. I couldn't be happier.",
      author: 'Angelica L.',
      role: 'Founder, The Second Haus',
    },
  },

  'whisk-up-matcha': {
    slug: 'whisk-up-matcha',
    category: 'branding',
    categoryLabel: 'Branding & Identity',
    title: 'Whisk Up Matcha',
    subtitle:
      'A full brand identity for a matcha café rooted in warmth and nature — leaf mark, logotype, color palette, and a complete logo suite built to carry across every touchpoint from cups to social.',
    tags: ['Logo Design', 'Brand Identity', 'Color Palette', 'Brand Guidelines', 'Logo Suite'],
    client: 'Whisk Up Matcha',
    timeline: '6 Weeks',
    industry: 'Food & Beverage',
    scope: 'Full Brand Identity',
    heroImage: '/images/wum-hero.webp',
    challenge: {
      heading: 'A brand as warm as the drink itself',
      body:
        'Whisk Up Matcha needed an identity that felt both grounded and inviting — something that communicated the ritual of matcha without feeling overly minimal or clinical. The brand had to appeal to a health-conscious, aesthetically-driven audience while staying approachable enough for everyday visits.',
    },
    approach: {
      heading: 'Organic mark, earthy palette',
      body:
        'We built the identity around a monstera leaf silhouette — organic, recognizable, and instantly connected to the botanical world of matcha. Paired with a bold rounded logotype, the mark works both as a full lockup and a standalone icon. The palette draws from nature: forest green, olive, amber, and dark brown, anchored by a warm cream base.',
    },
    logos: [
      {
        image: '/images/wum-logo-h-green.webp',
        label: 'Primary Lockup',
        bg: 'bg-white',
      },
      {
        image: '/images/wum-logo-s-green.webp',
        label: 'Stacked Variation',
        bg: 'bg-white',
      },
      {
        image: '/images/wum-logo-s-dark.webp',
        label: 'Dark Version',
        bg: 'bg-black',
        noInvert: true,
      },
    ],
    typography: {
      description:
        "A single bold rounded serif carries the entire brand — expressive enough to feel handcrafted, structured enough to stay legible at any size. The typeface reinforces the brand's warmth without sacrificing clarity.",
      fonts: [
        {
          role: 'Logotype / Display',
          family: 'Rounded Serif',
          weights: 'Bold',
          sample: 'whisk up matcha',
        },
      ],
    },
    colors: [
      { name: 'Cream', hex: '#FEFCEF' },
      { name: 'Olive', hex: '#BEB767' },
      { name: 'Forest', hex: '#596B36' },
      { name: 'Amber', hex: '#C07A37' },
      { name: 'Dark Brown', hex: '#4A3B22' },
    ],
    applications: [
      { image: '/images/wum-cup-hand.webp', label: 'Branded Cup', objectPosition: 'center' },
      { image: '/images/wum-barista-pour.webp', label: 'Brand in Action', objectPosition: 'center' },
      { image: '/images/wum-cup-milk.webp', label: 'Product Photography', objectPosition: 'center' },
      { image: '/images/wum-strawberry-pour.webp', label: 'Strawberry Matcha', objectPosition: 'center' },
      { image: '/images/wum-product-pour.webp', label: 'Matcha Preparation', objectPosition: 'center' },
      { image: '/images/wum-stickers.webp', label: 'Branded Stickers', objectPosition: 'center' },
      { image: '/images/wum-stamp-cards.webp', label: 'Stamp Cards', objectPosition: 'center' },
      { image: '/images/wum-social-new.webp', label: 'Social Media Content', objectPosition: 'center' },
      { image: '/images/wum-event-summer.webp', label: 'Event Collateral', objectPosition: 'center' },
    ],
    results: {
      summary:
        'Whisk Up Matcha launched with a cohesive identity that felt immediately distinct — warm, natural, and built to scale across physical and digital touchpoints.',
      metrics: [
        { value: '20+', label: 'Brand Assets Delivered', detail: 'Logo suite, palette, guidelines' },
        { value: '5', label: 'Logo Variations', detail: 'Horizontal, stacked, mark — all colorways' },
        { value: '100%', label: 'Brand Satisfaction', detail: 'Exceeded expectations on every deliverable' },
      ],
    },
  },

  'uji-matcha-cafe': {
    slug: 'uji-matcha-cafe',
    category: 'branding',
    categoryLabel: 'Branding & Identity',
    title: 'Uji-Matcha Café',
    subtitle:
      'A logo refinement and brand evolution study for a Japanese matcha café — refining the original chasen mark, exploring three distinct directions, and delivering a complete identity system with color, typography, and a full suite of logo variations.',
    tags: ['Logo Refinement', 'Brand Identity', 'Logo Suite', 'Typography', 'Color Palette', 'Brand Guidelines'],
    client: 'Uji-Matcha Café',
    timeline: '6 Weeks',
    industry: 'Food & Beverage',
    scope: 'Logo Refinement & Brand Identity',
    heroImage: '/images/uji-hero.webp',
    challenge: {
      heading: 'Refining a mark without losing its soul',
      body:
        'Uji-Matcha Café had an existing logo with strong character — a chasen (matcha whisk) in a bowl — but it lacked scalability and visual consistency. The challenge was to refine the mark for modern use while honoring the ritual and heritage behind matcha culture. The new identity needed to work across every touchpoint, from cups to signage to digital, without losing what made the original feel authentic.',
    },
    approach: {
      heading: 'Three directions, one clear answer',
      body:
        'We presented three evolution paths: a refined version of the original illustration, a bold new abstract lettermark integrating the UJI initials with the chasen form, and a unified expression that merged the U letterform with the whisk. Paired with Cinzel for display and Gilroy for body copy, the identity balances Japanese heritage with a clean, modern aesthetic. The final palette — forest green, charcoal, amber, and sky blue — draws from the natural world of matcha.',
    },
    logos: [
      {
        image: '/images/uji-logo-mark.webp',
        label: 'Logo Mark',
        bg: 'bg-white',
        noInvert: true,
      },
      {
        image: '/images/uji-logo-mark.webp',
        label: 'On Forest Green',
        bg: 'bg-[#4b622c]',
        invert: true,
      },
      {
        image: '/images/uji-logo-mark.webp',
        label: 'On Charcoal',
        bg: 'bg-black',
      },
    ],
    typography: {
      description:
        "Cinzel brings classical structure to the display type — its Roman proportions echo the timeless quality of Japanese craft. Gilroy handles body copy with a clean, modern voice. Together they bridge heritage and contemporary without friction.",
      fonts: [
        {
          role: 'Display / Headlines',
          family: 'Cinzel',
          weights: 'Regular 400 · Bold 700',
          sample: 'UJI-MATCHA CAFÉ',
        },
        {
          role: 'Body / UI',
          family: 'Gilroy',
          weights: 'Regular 400 · Medium 500 · Bold 700',
          sample: 'This direction explores how Uji Matcha could evolve into a more iconic, modern, and future-facing identity while still honoring its heritage.',
        },
      ],
    },
    colors: [
      { name: 'Forest', hex: '#4b622c' },
      { name: 'Charcoal', hex: '#2E2E2E' },
      { name: 'Amber', hex: '#d15f18' },
      { name: 'Sky', hex: '#c5e2f1' },
      { name: 'White', hex: '#ffffff' },
    ],
    applications: [
      { image: '/images/uji-insta-pour.webp', label: 'Branded Cup', objectPosition: 'center' },
      { image: '/images/uji-insta-icecream.webp', label: 'Product Photography', objectPosition: 'center' },
      { image: '/images/uji-insta-drinks.webp', label: 'Lifestyle Photography', objectPosition: 'center' },
      { image: '/images/uji-insta-sifting.webp', label: 'Matcha Ritual', objectPosition: 'center' },
      { image: '/images/uji-insta-cafe.webp', label: 'Café Interior', objectPosition: 'center' },
      { image: '/images/uji-insta-merch.webp', label: 'Brand Merchandise', objectPosition: 'center' },
      { image: '/images/uji-insta-lifestyle.webp', label: 'Social Content', objectPosition: 'center' },
      { image: '/images/uji-insta-tiramisu.webp', label: 'Product Photography', objectPosition: 'center' },
    ],
    results: {
      summary:
        'Uji-Matcha Café received a refined, scalable identity rooted in their heritage — with a complete logo suite, color system, and typography that carries consistently across every touchpoint.',
      metrics: [
        { value: '3', label: 'Direction Proposals', detail: 'Refined, Lettermark & Unified' },
        { value: '10+', label: 'Logo Variations', detail: 'Color, scale, and background variants' },
        { value: '100%', label: 'Brand Satisfaction', detail: 'Exceeded expectations on every deliverable' },
      ],
    },
  },

  'peak-coffee-roasters': {
    slug: 'peak-coffee-roasters',
    category: 'branding',
    categoryLabel: 'Branding & Identity',
    title: 'Peak Coffee Roasters',
    subtitle:
      'A complete brand identity system for a specialty coffee roaster — from the PCR combination mark to bean bags, cups, menus, tasting cards, stickers, laser-cut signage, and a full social media suite. Bold, minimal, and built for the serious coffee drinker.',
    tags: [
      'Logo Design',
      'Brand Identity',
      'Brand Guidelines',
      'Packaging Design',
      'Menu Design',
      'Sticker Design',
      'Signage',
      'Social Media Templates',
      'Company ID',
    ],
    client: 'Peak Coffee Roasters',
    timeline: '10 Weeks',
    industry: 'Food & Beverage',
    scope: 'Full Brand Identity & Packaging',
    heroImage: '/images/peak-coffee-pcr-1.webp',
    challenge: {
      heading: 'Building a bold identity for serious specialty coffee',
      body:
        'Peak Coffee Roasters needed a visual identity that matched their philosophy: every detail intentional, every process shaped with purpose. The brand had to communicate precision and craft — not just on a menu or a cup, but across a complete system from the logo mark to laser-cut wood signage. The challenge was building something bold enough to command attention while staying rooted in the discipline that defines specialty coffee.',
    },
    approach: {
      heading: 'Minimal system, maximum presence',
      body:
        'We developed the PCR combination mark — a geometric symbol built from the brand\'s initials P, C, and R, forming a path going upward. The identity is anchored in a primary palette of Black, Grey, and White, supported by secondary tones of Mahogany, Sky Blue, and Bean. Outfit was chosen as the sole typeface for its clean geometry and bold presence at any scale. From there we extended the system across every touchpoint: packaging, cups, menus, tasting cards, stickers, tissue paper, laser-cut signage, and a full social media template suite.',
    },
    logos: [
      {
        image: '/images/peak-coffee-logo-primary.webp',
        label: 'Primary Lockup',
        bg: 'bg-white',
      },
      {
        image: '/images/peak-coffee-logo-alt.webp',
        label: 'Stacked Variation',
        bg: 'bg-[#afafaf]',
      },
      {
        image: '/images/peak-coffee-logo-dark.webp',
        label: 'Dark Background',
        bg: 'bg-black',
      },
    ],
    typography: {
      description:
        'Outfit carries the entire brand — Extrabold for headlines and display, Regular for body copy and labels. Its geometric precision works across every scale, from large signage to fine label copy, keeping the brand consistent and unmistakable wherever it appears.',
      fonts: [
        {
          role: 'Headlines / Display',
          family: 'Outfit',
          weights: 'ExtraBold 800',
          sample: 'From every cup to every detail, we bring stories to life.',
        },
        {
          role: 'Body / Labels',
          family: 'Outfit',
          weights: 'Regular 400 · Medium 500',
          sample:
            'Coffee goes beyond the cup — it becomes a medium for experience, craft, and connection. Rooted in specialty, every detail is intentional.',
        },
      ],
    },
    colors: [
      { name: 'Black', hex: '#000000' },
      { name: 'Grey', hex: '#afafaf' },
      { name: 'White', hex: '#ffffff' },
      { name: 'Bean', hex: '#42160b' },
      { name: 'Sky Blue', hex: '#b7e1f2' },
    ],
    applications: [
      {
        image: '/images/peak-coffee-app-cups.webp',
        label: 'Branded Coffee Cups',
      },
      {
        image: '/images/peak-coffee-app-beanbag.webp',
        label: 'Bean Bag Packaging',
      },
      {
        image: '/images/peak-coffee-app-paperbag.webp',
        label: 'Paper Bag',
      },
      {
        image: '/images/peak-coffee-app-menu.webp',
        label: 'Café Menu',
      },
      {
        image: '/images/peak-coffee-app-tasting-card.webp',
        label: 'Tasting Card',
      },
      {
        image: '/images/peak-coffee-app-stickers.webp',
        label: 'Sticker Suite',
      },
      {
        image: '/images/peak-coffee-pcr-2.webp',
        label: 'Tissue & Greaseproof Paper',
        objectPosition: 'top',
      },
      {
        image: '/images/peak-coffee-pcr-5.webp',
        label: 'Laser-Cut Wood Signage',
        objectPosition: 'center',
      },
      {
        image: '/images/peak-coffee-pcr-6.webp',
        label: 'Branded Serving Experience',
        objectPosition: 'top',
      },
      {
        image: '/images/peak-coffee-pcr-4.webp',
        label: 'Digital Menu Display',
        objectPosition: 'center',
      },
      {
        image: '/images/peak-coffee-app-insta.webp',
        label: 'Instagram Post Templates',
      },
      {
        image: '/images/peak-coffee-app-id.webp',
        label: 'Company ID',
      },
    ],
    results: {
      summary:
        'Peak Coffee Roasters launched with a fully realized brand identity system — one that carries consistently from the first Instagram impression to the cup in hand, and every touchpoint in between.',
      metrics: [
        {
          value: '50+',
          label: 'Brand Assets Delivered',
          detail: 'Logo suite, guidelines, packaging & more',
        },
        {
          value: '10+',
          label: 'Packaging Applications',
          detail: 'Cups, bags, stickers, cards, signage',
        },
        {
          value: '100%',
          label: 'Brand Satisfaction',
          detail: 'Exceeded expectations on every deliverable',
        },
      ],
    },
  },
};
