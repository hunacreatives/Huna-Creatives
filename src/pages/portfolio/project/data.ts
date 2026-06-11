
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
  logos: { image: string; label: string; bg: string }[];
  typography: {
    description: string;
    fonts: { role: string; family: string; weights: string; sample: string }[];
  };
  colors: { name: string; hex: string }[];
  applications: { image: string; label: string }[];
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
    heroImage:
      '/images/686a4b13770b0b212e743808c854259d.png',
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
        image:
          '/images/de3dc4fe11e43aff6de19c4a7ce16556.png',
        label: 'Luxury Packaging Box',
      },
      {
        image:
          '/images/tsh-app-cards-001.jpg',
        label: 'Business Cards',
      },
      {
        image:
          '/images/tsh-app-tote-001.jpg',
        label: 'Tote Bag',
      },
      {
        image:
          '/images/tsh-app-packaging-001.jpg',
        label: 'Packaging',
      },
      {
        image:
          '/images/tsh-app-signage-001.jpg',
        label: 'Storefront Signage',
      },
      {
        image:
          '/images/tsh-app-tags-001.jpg',
        label: 'Hang Tags & Labels',
      },
      {
        image:
          '/images/tsh-app-social-001.jpg',
        label: 'Social Media Templates',
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
      author: 'Mariana Voss',
      role: 'Founder, The Second Haus',
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
      },
      {
        image: '/images/peak-coffee-pcr-5.webp',
        label: 'Laser-Cut Wood Signage',
      },
      {
        image: '/images/peak-coffee-pcr-6.webp',
        label: 'Branded Serving Experience',
      },
      {
        image: '/images/peak-coffee-pcr-4.webp',
        label: 'Digital Menu Display',
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
