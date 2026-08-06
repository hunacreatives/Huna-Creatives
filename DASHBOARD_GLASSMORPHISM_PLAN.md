# Plan: Apple-style glassmorphism for the employee Dashboard

## Goal
Make `/hub/contractor/dashboard` feel current and a little delightful —
without turning into a mess of blur and gradients. The brief is "excite the
team," not "redesign everything." Scope this to ONE consistent system
applied uniformly, not per-card improvisation — that's what keeps it from
looking messy.

## What's already there to build on
- `backdrop-blur` is already used 11x across `dashboard/page.tsx` and
  `projects/page.tsx` (pill toggles, tab switchers) — the codebase already
  has the visual language, it's just never been applied to the main content
  cards, which are flat `bg-white border border-gray-100`.
- No dark mode anywhere on this page (0 `dark:` classes) — light mode only,
  which simplifies the glass system (no need to design two versions).
- Brand colors already in use: `#FF6B35` (accent orange), `#111827`
  (near-black text/buttons), `#1c2b3a`/`#2d4a6e` (hero gradient navy).

## The one core problem
Every card is opaque (`bg-white`) sitting on a flat `bg-gray-50` page
background. Glassmorphism needs something *behind* the glass to actually
blur — on a flat background, `backdrop-blur` on a card does nothing visible.
So the real fix isn't "add blur to cards," it's:

1. Give the page itself a soft ambient background (a few large, very
   low-opacity blurred color blobs, fixed behind all content, barely
   noticeable, slow-drifting) — same technique as the lava-lamp hero, but
   turned down to near-subliminal (opacity ~8-12%, huge blur radius) so it
   reads as depth, not decoration.
2. THEN make cards translucent (`bg-white/60 backdrop-blur-xl`) so they
   pick up that ambient color as a soft tint — this is what actually
   produces the "glass" look, not the blur alone.

## The restrained system (apply everywhere, no exceptions)
To avoid messiness, define this once and reuse it identically on every
card — don't let each section invent its own glass treatment:

- **Card**: `bg-white/65 backdrop-blur-xl border border-white/70 rounded-3xl
  shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)]` — one shadow recipe, one
  border recipe, everywhere.
- **Section title**: bump to `text-base font-bold` (already used on the new
  To-Do List / Active Projects cards) — keep this as the ONE header style,
  don't mix `text-sm font-semibold` (old style, still on Team/World
  Clock/Requests/Time-off) with the newer `text-base font-bold`.
- **Icon chips**: replace solid saturated squares (`bg-rose-50 text-rose-500`
  etc. — fine as-is actually, already pastel) — keep these, they're already
  restrained. Don't touch what isn't broken.
- **Spacing**: consistent `p-5` card padding, `space-y-4` between cards
  (currently a mix of `p-4`/`p-5` and `space-y-3`/`space-y-4` — pick one of
  each and apply everywhere).
- **Accent color discipline**: orange (`#FF6B35`) stays reserved for
  primary actions and live/urgent states only (overdue badges, primary
  buttons) — not for decoration. This is what keeps "clean" from tipping
  into "busy."

## What NOT to do (the messiness guardrails)
- Don't add blur/glass to small interactive elements (buttons, toggles,
  badges) — reserve it for card-level containers only. Glass-on-glass
  nested everywhere is what makes these redesigns look chaotic.
- Don't introduce a second accent color. One orange, used sparingly, plus
  the existing navy for the hero — no new gradients elsewhere.
- Don't animate everything. The hero's lava-lamp blobs stay unique to the
  hero; the page-wide ambient background should be near-static (very slow,
  barely perceptible) so it doesn't compete for attention.
- Don't touch data/logic — this is a pure visual pass over the same
  structure already in place (hero → To-Do List → Active Projects →
  Announcements → Quick Links, right column: Team → World Clock → Requests
  → Time-off).

## Suggested order of execution
1. Add the page-wide ambient background (behind everything, one time).
2. Convert the two newest cards (To-Do List, Active Projects) to the glass
   recipe first — they already have the right header style, least risk.
3. Convert the remaining cards (Announcements, Quick Links, Team, World
   Clock, Requests, Time-off) to match, normalizing header size/spacing at
   the same time so nothing looks like a leftover from the old style.
4. Leave the hero card as-is (it's already the most "Apple" thing on the
   page — dark glass, lava blobs, photo) — just make sure the cards below
   it now feel like they belong to the same design family instead of a
   flat list underneath a fancy header.

## What I'd want confirmed before building
- Keeping the page in light mode only (no dark mode ask here)?
- OK with a real visual pass (not just adding blur) — meaning card
  backgrounds go semi-transparent, which changes contrast slightly — should
  still be easily readable, but it's a genuine visual shift, not a token
  swap.
