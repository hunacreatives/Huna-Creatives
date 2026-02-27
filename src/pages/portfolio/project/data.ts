
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
      'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/686a4b13770b0b212e743808c854259d.png',
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
          'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/1827f559443c4bd66862b224554bca7a.png',
        label: 'Primary Logotype',
        bg: 'bg-white',
      },
      {
        image:
          'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/0621f849f4034126c37da149fd5260fe.png',
        label: 'Monogram Mark',
        bg: 'bg-[#F5F0EB]',
      },
      {
        image:
          'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/00aeb013a4d67b243a25dc14bf0b6e50.png',
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
          'https://static.readdy.ai/image/08981d36cd0b73cf08022d4d82071d03/de3dc4fe11e43aff6de19c4a7ce16556.png',
        label: 'Luxury Packaging Box',
      },
      {
        image:
          'https://readdy.ai/api/search-image?query=premium%20business%20card%20mockup%20for%20luxury%20consignment%20boutique%20The%20Second%20Haus%20elegant%20serif%20logo%20on%20thick%20cotton%20stock%20warm%20sand%20and%20charcoal%20colors%20on%20natural%20linen%20surface%20soft%20daylight%20editorial%20photography%20warm%20tones&width=600&height=400&seq=tsh-app-cards-001&orientation=landscape',
        label: 'Business Cards',
      },
      {
        image:
          'https://readdy.ai/api/search-image?query=elegant%20branded%20tote%20bag%20mockup%20for%20luxury%20consignment%20boutique%20warm%20cream%20cotton%20tote%20with%20charcoal%20serif%20logo%20The%20Second%20Haus%20hanging%20on%20wooden%20hook%20against%20warm%20white%20wall%20soft%20natural%20light%20editorial%20style%20photography&width=600&height=400&seq=tsh-app-tote-001&orientation=landscape',
        label: 'Tote Bag',
      },
      {
        image:
          'https://readdy.ai/api/search-image?query=luxury%20tissue%20paper%20and%20branded%20packaging%20mockup%20for%20consignment%20boutique%20warm%20sand%20colored%20tissue%20with%20subtle%20logo%20pattern%20inside%20elegant%20charcoal%20gift%20box%20on%20cream%20surface%20soft%20daylight%20editorial%20photography&width=600&height=400&seq=tsh-app-packaging-001&orientation=landscape',
        label: 'Packaging',
      },
      {
        image:
          'https://readdy.ai/api/search-image?query=modern%20storefront%20signage%20mockup%20for%20luxury%20consignment%20boutique%20elegant%20serif%20lettering%20The%20Second%20Haus%20in%20charcoal%20on%20warm%20cream%20facade%20with%20brass%20details%20and%20a%20potted%20olive%20tree%20soft%20golden%20hour%20light%20editorial%20photography&width=600&height=400&seq=tsh-app-signage-001&orientation=landscape',
        label: 'Storefront Signage',
      },
      {
        image:
          'https://readdy.ai/api/search-image?query=branded%20hang%20tags%20and%20clothing%20labels%20mockup%20for%20luxury%20consignment%20boutique%20warm%20sand%20and%20charcoal%20colors%20elegant%20serif%20typography%20on%20thick%20cotton%20stock%20draped%20over%20linen%20fabric%20soft%20natural%20light%20editorial%20photography&width=600&height=400&seq=tsh-app-tags-001&orientation=landscape',
        label: 'Hang Tags & Labels',
      },
      {
        image:
          'https://readdy.ai/api/search-image?query=social%20media%20post%20templates%20mockup%20for%20luxury%20consignment%20boutique%20displayed%20on%20phone%20screen%20warm%20earth%20tones%20elegant%20serif%20typography%20cohesive%20instagram%20grid%20on%20cream%20desk%20surface%20soft%20daylight%20editorial%20photography&width=600&height=400&seq=tsh-app-social-001&orientation=landscape',
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
          label: 'Client Satisfaction',
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
};
