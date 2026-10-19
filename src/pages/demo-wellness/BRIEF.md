# Salt & Stillness demo — build brief (for page builders)

A click-through **UI demo** of Huna's studio booking platform, shown to wellness prospects. It must read
as our own product, not something built for one client: no prospect names, places or details in the copy.
Fictional brand: **Salt & Stillness Yoga** (Seaside + Downtown studios, plus online). Routes: guest site at `/demo/wellness/*`, studio admin at `/demo/wellness/admin/*`.

## Scope: UI only
- Sample data from `lib/data.ts`. **No backend, no persistence, no real validation, no payments.**
- Interactions are light: open sheets/drawers, switch tabs, filter lists, toggle states with local
  `useState`, and confirm with `toast('…')` from `useDemo()`. A refresh resetting everything is fine.
- Don't build features beyond what a viewer would click in a 10-minute demo. Breadth and polish over depth.

## Files you may touch
Only the page files assigned to you (they exist as placeholders) plus new files in the same folder that
only your pages import (prefix them with your page name, e.g. `site/ScheduleClassRow.tsx`).
**Do not edit** `lib/*`, `ui/*`, `page.tsx`, or other agents' pages. If you need a helper, write it locally.
Do not commit, push, install packages, or run the dev server. Check your work with:
`cd ~/Huna-Creatives && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep demo-wellness`

## Read first
- `lib/types.ts` (model), `lib/data.ts` (sample data + lookups: LOC, TEACHER, CLASS, MEMBER, PRODUCT,
  RETREAT, bookedCount(), waitlistCount(), rosterFor(), ME, TODAY_KEY, revenueByMonth, IMAGES, BRAND),
  `lib/format.ts` (peso, usd, pesoWithUsd, studioTime, yourTime, tzCity, dayLabel, dateLabel,
  rangeLabel, relativeDay, studioDateKey, addDays, ago, pct), `lib/demo.tsx` (useDemo: viewerTz,
  setViewerTz, myBookings, book, cancelBooking, adminLoc, setAdminLoc, toast; `to(path)` builds links).
- `ui/kit.tsx`: Glass, Panel, Button, ButtonLink, btnClass, Chip, Badge (tones teal/green/amber/red/gray/blue),
  Avatar, Tabs, Stat, FillBar, Sheet (drawer desktop / bottom sheet mobile), PageTitle (admin prop),
  SectionTitle, Field, OptionCard, Toggle, Empty, Rows, Photo, Icon (Remix Icon class names, e.g.
  `ri-calendar-line`), cx.
- `ui/layouts.tsx`: Wrap (guest content width), LocationSwitch (admin All/Seaside/Downtown, reads
  `adminLoc`), Wordmark. Layouts are applied by `page.tsx`; your page renders content only.
- `ui/theme.css`: tokens (`var(--ink)`, `--ink-2`, `--ink-3`, `--line`, `--teal`, `--teal-soft`, `--orange`,
  `--sand`, `--ok`, `--warn`, `--bad`), classes `.serif`, `.num`, `.glass`, `.glass-strong`, `.paper`,
  `.input`, `table.tbl` (+ `.r`, `tr.clickable`), `.rise`, `.no-bar`.

## Design rules (follow strictly)
1. Huna frosted style, but readable: **glass only on floating layers** (sticky bars, sticky booking card,
   KPI tiles, sheets). Lists, tables, forms and long text sit on `Panel` (near-solid white). Never glass on glass.
2. **Teal `--teal` for actions and selected states. Orange is only for small accents/glows**, never text
   or buttons. Ink for text.
3. Guest site headings use `.serif` (Fraunces); admin uses Inter only. Sentence case. **No uppercase
   letter-spaced eyebrow labels. No coloured accent stripes on cards. No dark stat bands. No emoji.
   No exclamation points.** Copy is plain and concrete.
4. **No information shown twice** on a screen (e.g. don't repeat a price in the title and the button and
   a summary unless it's the checkout total). Stripe/Xero-style lists. Status chips = `Badge`.
5. Tabular numerals (`.num`) for times and money. Money in pesos via `peso()`; on the guest site show the
   US$ guide once where a price matters (`pesoWithUsd` or a small `≈ US$` line), not everywhere.
6. Times: in-person classes show **studio time first**, the guest's time second, small
   (`yourTime(iso, viewerTz)` + `tzCity(viewerTz)`). Online classes show the guest's time first.
   Admin shows studio time only.
7. Mobile first: works at 375px with no horizontal page scroll (wide tables scroll inside their Panel
   with `overflow-x-auto`). Tap targets ≥ 44px on the guest site. Desktop max width comes from `Wrap`.
8. Photos: only `IMAGES.*` from data.ts (6 photos — reuse them; crop with object-cover).
9. Empty and edge states where natural (full class → waitlist; cancelled class shown struck with note).

## URL contracts between pages (use `to(...)`)
- Checkout: `to('/checkout?product=<productId>')` | `to('/checkout?session=<sessionId>')` (drop-in for one class)
  | `to('/checkout?retreat=<slug>&room=<roomId|>&addons=a1,a2&guests=1&pay=deposit|full')`
- Confirmation: `to('/confirmation?type=class&session=<id>')` | `type=waitlist&session=<id>` |
  `type=pass&product=<id>` | `type=retreat&retreat=<slug>`
- Guest pages: `/schedule` (accepts `?location=elnido|siargao|online`), `/passes`, `/retreats`,
  `/retreats/<slug>`, `/online`, `/account`
- Admin: `/admin/classes/<sessionId>` (roster), `/admin/retreats/<retreatId>` (manifest),
  `/admin/clients?member=<memberId>` (opens that client's drawer), `/admin/sales`, `/admin/schedule`.

## Demo guest
`ME` (Chloe Martin, Sydney) is "signed in" on the guest site. She has a 10-class pass with 6 left
(wallet `w1`), bookings in `myBookings` from `useDemo()`. Booking with a pass = `book(id,'booked')` +
toast + link to confirmation; full class = `book(id,'waitlist')`.
