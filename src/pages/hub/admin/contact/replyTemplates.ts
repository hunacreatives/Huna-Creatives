// Starting points for the reply composer. Bodies use the reply markup
// (supabase/functions/_shared/emailBody.ts): ## heading, - bullets, 1. steps, **bold**.

export interface ReplyTemplate {
  id: string;
  label: string;
  hint: string;
  body: (name: string, service: string | null) => string;
}

export const replyTemplates: ReplyTemplate[] = [
  {
    id: 'overview',
    label: 'Social media overview',
    hint: 'Monthly social package and a call to action',
    body: (name, service) => `Hi ${name},

Thank you for reaching out${service ? ` about ${service}` : ''}.

Here's a quick overview of how we work:

## Social Media Design — from ₱10,000 / month
- 8 deliverables per month (feed posts, carousels, or Stories sets)
- On-brand templates so your feed stays consistent
- Caption writing and hashtag research
- Scheduling, publishing, and a monthly performance snapshot
- 2 revision rounds per deliverable

The best next step is a short call so we can tailor a package to your goals. You can also request a formal quotation using the button below.

Looking forward to connecting.

Warm regards,
The Huna Creatives Team`,
  },
  {
    id: 'booking',
    label: 'Booking website',
    hint: 'Inclusions, from ₱100,000, scoping questions',
    body: (name) => `Hi ${name},

Thanks for reaching out.

Here's what a booking website from us includes:

## Design and build
- A fully custom design built around your brand. We don't use templates.
- Core pages: Home, Classes, Schedule, Pricing, About, FAQs, Contact, and Policies/Terms
- Built for phones first, since that's where most of your clients will find you

## Booking and payments
- A live schedule where clients pick a class or date and book a spot
- Spot limits per session, so you never overbook
- Online payment by card, GCash or Maya, confirmed automatically
- Class packs and credits if you sell multi-class bundles
- Client accounts so returning clients can see their bookings and remaining credits
- An email confirmation for every booking

## Admin dashboard
- Manage your schedule, classes, prices, and site content yourself, with no developer needed
- See every booking and payment in one place

## Rates
Booking websites start at **₱100,000**. Your final price depends on what the site needs to handle, so I'll send a fixed quote within 24 hours of hearing back from you. There are no hidden fees.

To put that quote together, could you tell me:

1. What do you offer? Drop-in classes, class packs, private sessions, retreats, or a mix?
2. Are most of your clients local or international? This affects which payment methods and currency we set up.
3. Do clients pay in full when they book, or do you take a deposit first?
4. Do you already have a logo, brand colors, photos, and a domain name?
5. Do you have a launch date in mind?

Once I have these, I'll send the full quote with the timeline.

Best,
Francis
Huna Creatives`,
  },
  {
    id: 'blank',
    label: 'Blank',
    hint: 'Greeting and sign-off only',
    body: (name) => `Hi ${name},


Best,
The Huna Creatives Team`,
  },
];
