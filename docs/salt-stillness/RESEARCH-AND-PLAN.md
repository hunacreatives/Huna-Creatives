# Michelle (Tobey) — wellness booking platform: research + future build plan

Prospect: Michelle "Tobey" Tobias (tobias.emm@gmail.com), yoga business in El Nido, Palawan, multiple
locations. Today she uses Setmore. Sells drop-ins, class passes, monthly, one-day retreats, multi-day
retreats (accommodation later), wants online classes (live + on-demand). Guests mostly international,
pay in full. Business ~10 months old; has branding, logo, domain; no launch date. Also referred a
friend's 15–20 room wellness resort (activities bookable by hotel guests AND outside visitors).

Demo for her (Oct 2026): `hunacreatives.com/demo/wellness` — fictional "Salt & Stillness Yoga"
(El Nido + Siargao), UI only, sample data. This document is the research behind it and the plan for
the real build if she signs.

Research: 5 agents, Oct 19 2026 (guest booking UX, studio admin back ends, retreat platforms, online
classes + payments, UI benchmarks). Sources inline.

---

## 1. Competitor analysis

| Platform | Good at | Short for Michelle |
|---|---|---|
| Setmore (hers) | Fast setup, simple calendar, reminders, free tier | No passes/memberships on pricing page; weak multi-location; in PH only PayPal works (Square/Stripe unavailable); recurring class seats multiply (9 × 6 = 54); timezone mix-ups; no retreats or video library. [pricing](https://www.setmore.com/pricing), [Capterra](https://www.capterra.com/p/122035/SetMore/reviews/?page=22) |
| Mindbody | Marketplace, deep reports | "Outdated", "clunky", owners "constantly auditing" reports; iframe widget kills tracking. [Capterra](https://capterra.com/p/40229/MINDBODY/reviews/?page=9) |
| Momence | Waitlists, Zoom per class, on-demand rentals/subscriptions | Location buried on cards, false "payment failed", price climbs per user |
| Arketa | Customizable dashboard, refund-on-cancel flow, one credit for in-person + online | Mixed reliability; local-time-by-default. [cancel flow](https://help.arketa.com/schedule/classes/cancel-a-class) |
| bsport | Best booking flow: 3 taps, state-aware button (Book / Opens soon / Join waitlist), one-click booking from a link | Back end freezes, slow setup. [flow](https://intercom.help/bsport-helpcenter/en/articles/15886048-new-branded-app-booking-flow-group-activities-workshops) |
| Walla / Glofox | Fill-rate reports; auto waitlist (Walla); roaming memberships (Glofox) | Walla shows viewer's timezone only (wrong for travellers) [doc](https://support.hellowalla.com/client-timezone-display-walla-support-center); Glofox reports not exportable |
| BookRetreats / WeTravel / Retreat Guru | Strong retreat pages, deposits, manifests, payment plans | BookRetreats 15% commission + 3% processing [fees](https://help.bookretreats.com/en/articles/2501284-how-do-fees-work-on-bookretreats-com); WeTravel slow verification; Retreat Guru complex |

### Where a custom build wins (pitch points)
1. Passes, credits, memberships and retreats in one system.
2. El Nido time first for in-person classes, guest's own time underneath (Setmore/Walla get this wrong).
3. Book from a shared link without signing up (tourists from Instagram/hotels) — bsport pattern.
4. Retreats as a real product (rooms, add-ons, forms, manifest), no 15% marketplace cut.
5. Online classes on the same credits; Join unlocks 15 min before; on-demand library.
6. International cards in USD via Xendit (Setmore in PH = PayPal only).
7. "Needs attention" panel: waitlists, retreat balances, failed payments, expiring passes.
8. Bookings on her own domain (GA4/Ads tracking works; Mindbody iframe can't).

---

## 2. Guest-facing patterns to build
- **Schedule:** sticky 14-day strip; list grouped Morning/Afternoon/Evening; Location = first filter chip; chips for Style, Level, Teacher, Time, In-studio/Online (multi-select, Stripe filter pattern). Week grid only as a desktop toggle. Location visible on every class card.
- **Class row:** time (tabular), duration, class, teacher · location, spots left / Waitlist, Book.
- **Booking sheet:** bottom sheet (mobile) / 440–480px right drawer (desktop). One state-aware button. Payment choice radio cards ("Use 10-class pass (6 left)", "Drop-in", "Intro offer"). One policy line. Button shows the price.
- **Waitlist:** full-page status "You're #3 on the waitlist — not booked yet". Auto-promote + charge.
- **Checkout:** guest checkout first, ~8 fields, wallets first; currency on every price; "≈ US$" guide.
- **Confirmation:** add to calendar (.ics + Google), directions, manage booking, pass balance. No confetti.
- **Pricing:** 3–4 cards (drop-in, 5, 10, unlimited monthly) + intro offer line; price per class; validity; which locations; one plain "Most popular" border; no strikethrough/countdowns.
- **Retreat page (Airbnb/BookRetreats order):** gallery (1 large + 4), facts line, 7:5 columns with sticky booking card (mobile bottom bar); overview, day-by-day accordion itinerary, included / not included, room cards (private/shared, per person, spots left), add-ons (transfer, massage, extra night), teachers, getting to El Nido (ENI/PPS), cancellation, FAQs. Show real spots left (competitors don't).
- **Day retreat = ticket; multi-day = package** (rooms, deposits/instalments optional, pre-arrival forms).
- **Online:** Live tab (El Nido time + "your time"; Join unlocks 15 min before, only in account; replay 7 days) and On-demand tab (filters: style, duration 15/30/45/60+, level, teacher, focus; favourites; continue watching; series). Access via membership, 48h rental, or bundled with retreats.
- **Account:** upcoming / waitlisted / past; credits with expiry; membership; receipts.

## 3. Admin patterns to build
- **Today:** one-line greeting + date, location switcher (All / El Nido / Siargao), 4 KPI tiles with trend (today's bookings, occupancy %, revenue MTD, active members), Today's classes (time, class, teacher, location, fill bar 14/18, Roster), Needs attention (failed renewals, waitlist promotions, unsigned waivers, retreat balances due, expiring passes) each with one action; then revenue chart + activity feed. No number shown twice.
- **Schedule:** week view by location, colour per instructor; edit "this date / this and future / all"; one-click substitute; cancel → note + refund to card or credit back + notify (email/WhatsApp). Capacity per room. Never delete silently (Arketa trap).
- **Roster:** row = avatar, name, first-timer flag, pass used + credits left, waiver, country, notes, check-in toggle; header "12 of 18 checked in"; no-show / late-cancel with fee + waive before it posts; walk-in add; waitlist promote.
- **Clients:** profile = visits, lifetime spend, wallets/credits, membership freeze with auto end date, notes, tags, timeline.
- **Retreats:** manifest per retreat: payment (deposit/balance), forms done/missing, room, diet; printable; duplicate retreat.
- **Products & promos:** drop-in/packs/monthly/retreats/on-demand with expiry, valid locations; promo codes.
- **Sales:** orders list (Stripe/Xero style), refund to card or credit, payouts (net after fees).
- **Reports:** compare locations; fill rate by time slot and instructor; revenue by product/location; CSV.
- **Staff & roles:** owner, manager, front desk, instructor (instructor sees only own classes).
- **On-demand library manager:** uploads, access rules, livestream links.

## 4. Payments (Philippines, international guests)
| Gateway | Intl cards | USD | Sole-prop docs |
|---|---|---|---|
| Xendit (recommend) | 4.2% + ₱10 (PHP) / 4% + US$1 (USD) + VAT — calculator conflicts (₱52), confirm | Yes, USD charge + payout | ID, TIN, DTI, BIR 2303, live site/socials |
| PayMongo (current clients, e.g. Asana) | 4.02% + ₱13.39 + VAT | No (PHP) | DTI, BIR 2303, ID; cards blocked without them (QR Ph only) |
| HitPay | 4% + ₱15 (USD rate conflicts on page) | Yes | DTI, BIR 2303, permit, bank proof |
| PayPal (secondary button) | 4.40% + US$0.30; +3% conversion | Yes | unverified |
| Stripe / Square | not available to PH businesses | — | — |
Sources: [Xendit pricing](https://www.xendit.co/en-ph/pricing/), [Xendit docs](https://help.xendit.co/hc/en-us/articles/11103239008793-PH-What-are-the-legal-documents-required-to-register-to-Xendit-for-Philippine-Merchants), [PayMongo pricing](https://www.paymongo.com/pricing), [HitPay](https://hitpayapp.com/ph/pricing), [PayPal PH fees](https://www.paypal.com/ph/webapps/mpp/merchant-fees), [Stripe global](https://stripe.com/global).

## 5. Friend's resort (15–20 rooms)
- Rooms via a booking engine (Cloudbeds / SiteMinder) — don't build room inventory.
- Wellness activities on our booking system: two prices (in-house vs outside visitor); hotel guests sign in with room number + surname and charge to room (Saoma pattern); visitors pay by card; QR codes in rooms; day passes; staff daily schedule; revenue split guest vs visitor.
- Bundles (stay + program) like Trybe "Overnights" if needed later.

## 6. UI rules (from the design research)
1. Glass only on floating layers (nav, filter bar, sticky booking card, sheets, drawers, KPI tiles); near-solid white (0.85–0.92) for lists, tables, forms, long text. Never glass on glass.
2. Orange only for glows/small accents (3.1:1 on white fails text). Teal #075056 for primary/selected (9.2:1). Ink #243037 for text.
3. Fallbacks: no backdrop-filter / reduced transparency → solid; reduced motion → static glows; admin uses dimmer static glows.
4. Serif display only (Fraunces), Inter for UI; 16px body (14px admin); 8px grid; card padding 24 (admin 16); radius 20 cards / 12 inputs / pill chips; tabular numerals for times and money; sentence case; no uppercase eyebrow labels.
5. Tables for homogeneous lists (44px rows, money right-aligned); status chips = soft tint + dot, max 5 statuses; details open in a right drawer; ⌘K search.
References: [NN/g glassmorphism](https://www.nngroup.com/articles/glassmorphism/), [Microsoft acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic), [Stripe patterns](https://docs.stripe.com/stripe-apps/patterns), [Linear refresh](https://linear.app/now/behind-the-latest-design-refresh), [Baymard checkout](https://baymard.com/blog/current-state-of-checkout-ux).

## 7. Real build — how it would work (when she signs)
- Fork the Asana Studio codebase (Sentro template, Supabase, PayMongo/Xendit) — it already has packs/credits wallets, bookings, capacity/waitlist, members, rosters, attendance, orders, promo codes, cancellations with credit refund.
- New for Michelle: locations on sessions/products, monthly time-based passes, retreats (day = ticket, multi-day = package with rooms/add-ons/forms/manifest), online classes (Zoom per session, join gate, on-demand library + rentals), Xendit (USD) + PayPal, timezone display rules, guest checkout, reminders (email; SMS/WhatsApp optional), staff roles.
- Her own Supabase project + Vercel project under her accounts (as with Asana). Mind free-plan limits: no per-minute crons, no heavy polling.
- Price as fixed quote after the call + monthly support retainer (custom needs care; Setmore includes it in subscription).
