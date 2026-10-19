// Sample data for the Salt & Stillness demo. Generated around today's date so
// the schedule always looks current. Deterministic: same day → same numbers.

import type {
  ClassType, DemoState, Instructor, Location, Member, Order, Product, Promo, Retreat,
  RetreatBooking, Session, StaffMember, Video, Wallet, Booking, LocationId,
} from './types';
import { addDays, studioDateKey, studioInstant } from './format';

const IMG = '/images/demo-wellness';
export const IMAGES = {
  hero: `${IMG}/sunset.webp`,
  cove: `${IMG}/cove.webp`,
  bay: `${IMG}/bay.webp`,
  shore: `${IMG}/shore.webp`,
  boardwalk: `${IMG}/boardwalk.webp`,
  studio: `${IMG}/studio-class.jpg`,
  mats: `${IMG}/studio-mats.jpg`,
  yoga: `${IMG}/beach-yoga.webp`,
};

export const PHOTO_CREDITS =
  'Photos: Vyacheslav Argenberg (CC BY 4.0), GoToVan (CC BY 2.0), JupitReyes (CC BY-SA 4.0), Grand Velas Riviera Maya (CC BY-SA 2.0), via Wikimedia Commons.';

export const BRAND = {
  name: 'Salt & Stillness',
  full: 'Salt & Stillness Yoga',
  email: 'hello@saltandstillness.com',
  whatsapp: '+63 917 555 0142',
  instagram: '@saltandstillness',
  owner: 'Mara',
};

// Small seeded random so every reload shows the same numbers.
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const hash = (str: string) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

const TODAY = studioDateKey();
const daysAgoIso = (n: number, hhmm = '10:00') => studioInstant(addDays(TODAY, -n), hhmm);

export const locations: Location[] = [
  {
    id: 'beach', name: 'Seaside', area: 'Beachfront studio',
    address: '12 Shore Road',
    image: IMAGES.shore, mapUrl: 'https://maps.google.com/',
    rooms: [{ id: 'ocean', name: 'Ocean room', capacity: 18 }, { id: 'garden', name: 'Garden deck', capacity: 10 }],
    blurb: 'An open-air studio on the beach. Sunrise and sunset classes, sound baths on the deck.',
  },
  {
    id: 'town', name: 'Downtown', area: 'City studio',
    address: '88 Main Street, 2nd floor',
    image: IMAGES.studio, mapUrl: 'https://maps.google.com/',
    rooms: [{ id: 'palm', name: 'Main room', capacity: 14 }],
    blurb: 'A bright second-floor studio in the middle of town. Early classes before work, slow ones after.',
  },
];

export const instructors: Instructor[] = [
  { id: 'maya', name: 'Maya Reyes', styles: ['Vinyasa', 'Hatha'], locations: ['beach'], color: '#c96f4a',
    bio: 'Founder-teacher. 500-hour trained, teaching since 2014. Strong, steady flows with clear cues.' },
  { id: 'jonas', name: 'Jonas Lind', styles: ['Yin', 'Breathwork'], locations: ['beach'], color: '#5b7f6e',
    bio: 'Swedish-born yin and breathwork teacher. Long holds, quiet rooms, sound bowls at the end.' },
  { id: 'isla', name: 'Isla Cruz', styles: ['Pilates', 'Vinyasa'], locations: ['town'], color: '#2f7d8c',
    bio: 'Mat pilates and mobility. Small cues, big difference in how you move day to day.' },
  { id: 'paolo', name: 'Paolo Santos', styles: ['Hatha', 'Restorative'], locations: ['beach', 'town'], color: '#8a6d3b',
    bio: 'Iyengar-influenced hatha. Props, alignment, and plenty of time to get it right.' },
  { id: 'kai', name: 'Kai Navarro', styles: ['Restorative', 'Yin'], locations: ['town'], color: '#7a5c8e',
    bio: 'Teaches the online yin series and restorative evenings downtown. Former nurse.' },
];

export const classTypes: ClassType[] = [
  { id: 'sunrise', name: 'Sunrise Vinyasa', style: 'Vinyasa', level: 'All levels', duration: 60, format: 'studio',
    description: 'A warming flow to start the day. Expect sun salutations, standing balances and a long savasana.' },
  { id: 'hatha', name: 'Slow Flow Hatha', style: 'Hatha', level: 'Beginner', duration: 60, format: 'studio',
    description: 'Fewer poses, held longer, with clear cues. Good first class.' },
  { id: 'sunset', name: 'Sunset Flow', style: 'Vinyasa', level: 'Intermediate', duration: 75, format: 'studio',
    description: 'Our signature class. A stronger flow to end the day.' },
  { id: 'yin', name: 'Yin & Sound', style: 'Yin', level: 'All levels', duration: 75, format: 'studio',
    description: 'Long floor holds followed by a sound bath. Bring a layer.' },
  { id: 'breath', name: 'Breathwork', style: 'Breathwork', level: 'All levels', duration: 45, format: 'studio',
    description: 'Guided breathing practice to settle the nervous system. No yoga experience needed.' },
  { id: 'pilates', name: 'Mat Pilates', style: 'Pilates', level: 'All levels', duration: 50, format: 'studio',
    description: 'Core, glutes and posture work on the mat. Small group, plenty of cues.' },
  { id: 'restore', name: 'Restorative', style: 'Restorative', level: 'All levels', duration: 75, format: 'studio',
    description: 'Bolsters, blankets and very little effort. A reset after a long week.' },
  { id: 'live-flow', name: 'Morning Flow (live)', style: 'Vinyasa', level: 'All levels', duration: 45, format: 'online',
    description: 'Streamed live from the studio. Join from anywhere; replay for 7 days.' },
  { id: 'live-yin', name: 'Evening Yin (live)', style: 'Yin', level: 'All levels', duration: 60, format: 'online',
    description: 'A live yin class to wind down. Camera optional.' },
];

// Weekly timetable. dow: 0 = Sunday.
const TIMETABLE: { dow: number[]; time: string; classTypeId: string; loc: LocationId | null; room: string | null; teacher: string; cap: number }[] = [
  { dow: [1, 2, 3, 4, 5, 6, 0], time: '07:00', classTypeId: 'sunrise', loc: 'beach', room: 'ocean', teacher: 'maya', cap: 18 },
  { dow: [1, 3, 5], time: '09:30', classTypeId: 'hatha', loc: 'beach', room: 'garden', teacher: 'paolo', cap: 10 },
  { dow: [2, 4, 6], time: '09:30', classTypeId: 'breath', loc: 'beach', room: 'garden', teacher: 'jonas', cap: 10 },
  { dow: [1, 2, 3, 4, 5, 6, 0], time: '17:00', classTypeId: 'sunset', loc: 'beach', room: 'ocean', teacher: 'maya', cap: 18 },
  { dow: [1, 3, 5, 0], time: '19:00', classTypeId: 'yin', loc: 'beach', room: 'garden', teacher: 'jonas', cap: 10 },
  { dow: [1, 2, 3, 4, 5, 6], time: '06:30', classTypeId: 'pilates', loc: 'town', room: 'palm', teacher: 'isla', cap: 14 },
  { dow: [2, 4, 6], time: '10:00', classTypeId: 'hatha', loc: 'town', room: 'palm', teacher: 'paolo', cap: 14 },
  { dow: [1, 3, 5, 0], time: '17:30', classTypeId: 'restore', loc: 'town', room: 'palm', teacher: 'kai', cap: 14 },
  { dow: [1, 3, 5], time: '07:30', classTypeId: 'live-flow', loc: null, room: null, teacher: 'maya', cap: 60 },
  { dow: [2, 4], time: '18:30', classTypeId: 'live-yin', loc: null, room: null, teacher: 'kai', cap: 60 },
];

function buildSessions(): Session[] {
  const out: Session[] = [];
  for (let offset = -7; offset < 21; offset++) {
    const key = addDays(TODAY, offset);
    const [y, m, d] = key.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    TIMETABLE.forEach((t, i) => {
      if (!t.dow.includes(dow)) return;
      out.push({
        id: `s-${key}-${i}`, classTypeId: t.classTypeId, locationId: t.loc, roomId: t.room,
        instructorId: t.teacher, start: studioInstant(key, t.time), capacity: t.cap,
        seriesId: `series-${i}`, status: 'scheduled',
        joinUrl: t.loc ? undefined : 'https://zoom.us/j/0000000000',
      });
    });
  }
  // A sub and a cancellation so the admin and guest views have something to show.
  const sub = out.find((s) => s.start.startsWith(addDays(TODAY, 2)) && s.classTypeId === 'sunset');
  if (sub) { sub.substituteFor = 'maya'; sub.instructorId = 'paolo'; }
  const cancelled = out.find((s) => s.start.startsWith(addDays(TODAY, 4)) && s.classTypeId === 'restore');
  if (cancelled) { cancelled.status = 'cancelled'; cancelled.cancelNote = 'Teacher unwell — everyone credited back.'; }
  return out;
}

export const sessions = buildSessions();

/** Booked count for a session (deterministic). Early classes and sunset fill up. */
export function bookedCount(s: Session): number {
  const r = rng(Math.abs(hash(s.id)))();
  const isPast = s.start < new Date().toISOString();
  const popular = ['sunset', 'sunrise', 'pilates'].includes(s.classTypeId);
  const base = s.locationId === null ? 0.35 : popular ? 0.72 : 0.45;
  const daysOut = (new Date(s.start).getTime() - Date.now()) / 86400000;
  const decay = isPast ? 1 : Math.max(0.25, 1 - daysOut / 14);
  return Math.min(s.capacity, Math.round(s.capacity * Math.min(1, (base + r * 0.4) * decay)));
}

/** Waitlist length for full sessions. */
export const waitlistCount = (s: Session) => (bookedCount(s) >= s.capacity ? 1 + (Math.abs(hash(s.id)) % 4) : 0);

export const products: Product[] = [
  { id: 'intro', kind: 'intro', name: 'Intro week', price: 1500, credits: 3, validityDays: 7, locations: 'all', includesOnDemand: false, active: true,
    description: '3 classes in your first 7 days. New guests only.' },
  { id: 'dropin', kind: 'dropin', name: 'Drop-in', price: 750, credits: 1, validityDays: 30, locations: 'all', includesOnDemand: false, active: true,
    description: 'One class at either studio.' },
  { id: 'pack5', kind: 'pack', name: '5-class pass', price: 3250, credits: 5, validityDays: 60, locations: 'all', includesOnDemand: false, active: true,
    description: 'Use at either studio within 60 days. Shareable with a friend.' },
  { id: 'pack10', kind: 'pack', name: '10-class pass', price: 6000, credits: 10, validityDays: 90, locations: 'all', includesOnDemand: true, popular: true, active: true,
    description: 'Use at either studio within 90 days. Includes the on-demand library while active.' },
  { id: 'monthly', kind: 'monthly', name: 'Unlimited monthly', price: 7500, credits: null, validityDays: 30, locations: 'all', includesOnDemand: true, active: true,
    description: 'Every class at both studios, plus live and on-demand online classes. Renews monthly; freeze anytime.' },
  { id: 'online', kind: 'online', name: 'Online membership', price: 990, credits: null, validityDays: 30, locations: [], includesOnDemand: true, active: true,
    description: 'All live online classes and the full on-demand library. Monthly.' },
];

const MEMBER_ROWS: [string, string, string, LocationId, string[]][] = [
  ['Sophie Laurent', 'France', 'Europe/Paris', 'beach', ['Regular']],
  ['Liam O\'Connor', 'Ireland', 'Europe/Dublin', 'beach', []],
  ['Hannah Becker', 'Germany', 'Europe/Berlin', 'beach', ['Retreat guest']],
  ['Chloe Martin', 'Australia', 'Australia/Sydney', 'beach', ['Regular', 'Monthly']],
  ['Noah Williams', 'United States', 'America/Los_Angeles', 'town', ['Early bird']],
  ['Ava Thompson', 'United Kingdom', 'Europe/London', 'beach', ['First-timer']],
  ['Bea Villanueva', 'Philippines', 'Asia/Manila', 'beach', ['Local', 'Monthly']],
  ['Miguel Ramos', 'Philippines', 'Asia/Manila', 'town', ['Local', 'Early bird']],
  ['Emma de Vries', 'Netherlands', 'Europe/Amsterdam', 'beach', ['Retreat guest']],
  ['Jack Wilson', 'Australia', 'Australia/Melbourne', 'town', ['Early bird']],
  ['Yuki Tanaka', 'Japan', 'Asia/Tokyo', 'beach', []],
  ['Sara Lindqvist', 'Sweden', 'Europe/Stockholm', 'beach', ['Regular']],
  ['Isabella Rossi', 'Italy', 'Europe/Rome', 'beach', ['First-timer']],
  ['Ethan Kim', 'South Korea', 'Asia/Seoul', 'town', []],
  ['Olivia Brown', 'Canada', 'America/Toronto', 'beach', ['Online']],
  ['Lucas Silva', 'Brazil', 'America/Sao_Paulo', 'town', ['Early bird']],
  ['Mia Fischer', 'Switzerland', 'Europe/Zurich', 'beach', ['Retreat guest']],
  ['Daniel Cohen', 'Israel', 'Asia/Jerusalem', 'beach', []],
  ['Grace Tan', 'Singapore', 'Asia/Singapore', 'beach', ['Regular']],
  ['Leah Murphy', 'New Zealand', 'Pacific/Auckland', 'town', ['Monthly']],
  ['Carmen Ortiz', 'Spain', 'Europe/Madrid', 'beach', []],
  ['Tom Becker', 'Germany', 'Europe/Berlin', 'beach', ['First-timer']],
  ['Ana Reyes', 'Philippines', 'Asia/Manila', 'beach', ['Local']],
  ['Josh Miller', 'United States', 'America/New_York', 'beach', ['Online']],
  ['Freya Hansen', 'Denmark', 'Europe/Copenhagen', 'town', []],
  ['Priya Nair', 'India', 'Asia/Kolkata', 'beach', ['Retreat guest']],
  ['Ella Jones', 'Australia', 'Australia/Brisbane', 'beach', []],
  ['Marco Bianchi', 'Italy', 'Europe/Rome', 'town', ['Early bird']],
  ['Zoe Clarke', 'United Kingdom', 'Europe/London', 'beach', ['Regular']],
  ['Nina Petrova', 'Bulgaria', 'Europe/Sofia', 'beach', []],
];

export const members: Member[] = MEMBER_ROWS.map(([name, country, timezone, home, tags], i) => ({
  id: `m${i + 1}`, name, country, timezone, homeLocation: home, tags,
  email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.') + '@example.com',
  phone: country === 'Philippines' ? `+63 917 555 ${String(1000 + i * 37).slice(-4)}` : `+${10 + i} 555 0${100 + i}`,
  joinedAt: daysAgoIso(5 + ((i * 23) % 280)),
  notes: i === 3 ? 'Prefers front row by the bay. Lower back injury — offer props.' : i === 9 ? 'Asked about the March retreat.' : '',
  waiverSigned: i % 7 !== 5,
}));

/** The demo guest who is "signed in" on the guest site. */
export const ME = members[3]; // Chloe Martin, Sydney

export const wallets: Wallet[] = [
  { id: 'w1', memberId: 'm4', productId: 'pack10', creditsTotal: 10, creditsLeft: 6, purchasedAt: daysAgoIso(24), expiresAt: studioInstant(addDays(TODAY, 66), '23:59'), status: 'active' },
  { id: 'w2', memberId: 'm7', productId: 'monthly', creditsTotal: null, creditsLeft: null, purchasedAt: daysAgoIso(12), expiresAt: studioInstant(addDays(TODAY, 18), '23:59'), status: 'active' },
  { id: 'w3', memberId: 'm1', productId: 'pack5', creditsTotal: 5, creditsLeft: 1, purchasedAt: daysAgoIso(50), expiresAt: studioInstant(addDays(TODAY, 3), '23:59'), status: 'active' },
  { id: 'w4', memberId: 'm20', productId: 'monthly', creditsTotal: null, creditsLeft: null, purchasedAt: daysAgoIso(20), expiresAt: studioInstant(addDays(TODAY, 10), '23:59'), status: 'frozen', frozenUntil: addDays(TODAY, 9) },
  { id: 'w5', memberId: 'm12', productId: 'pack10', creditsTotal: 10, creditsLeft: 2, purchasedAt: daysAgoIso(80), expiresAt: studioInstant(addDays(TODAY, 5), '23:59'), status: 'active' },
  { id: 'w6', memberId: 'm15', productId: 'online', creditsTotal: null, creditsLeft: null, purchasedAt: daysAgoIso(8), expiresAt: studioInstant(addDays(TODAY, 22), '23:59'), status: 'active' },
  { id: 'w7', memberId: 'm6', productId: 'intro', creditsTotal: 3, creditsLeft: 2, purchasedAt: daysAgoIso(1), expiresAt: studioInstant(addDays(TODAY, 6), '23:59'), status: 'active' },
  { id: 'w8', memberId: 'm19', productId: 'pack10', creditsTotal: 10, creditsLeft: 8, purchasedAt: daysAgoIso(9), expiresAt: studioInstant(addDays(TODAY, 81), '23:59'), status: 'active' },
  { id: 'w9', memberId: 'm8', productId: 'monthly', creditsTotal: null, creditsLeft: null, purchasedAt: daysAgoIso(3), expiresAt: studioInstant(addDays(TODAY, 27), '23:59'), status: 'active' },
  { id: 'w10', memberId: 'm4', productId: 'pack5', creditsTotal: 5, creditsLeft: 0, purchasedAt: daysAgoIso(120), expiresAt: daysAgoIso(60), status: 'used' },
];

/** Member names attending a session, in a stable order (first `bookedCount` of a shuffled list). */
export function rosterFor(s: Session): Member[] {
  const r = rng(Math.abs(hash(s.id + 'roster')));
  const pool = members.filter((m) => s.locationId === null || m.homeLocation === s.locationId || r() > 0.6);
  const shuffled = [...pool].sort(() => r() - 0.5);
  return shuffled.slice(0, Math.min(bookedCount(s), shuffled.length));
}

const myUpcoming = sessions.filter((s) => s.start > new Date().toISOString() && s.locationId === 'beach' && s.status === 'scheduled');
export const bookings: Booking[] = [
  { id: 'b1', sessionId: myUpcoming.find((s) => s.classTypeId === 'sunset')?.id ?? myUpcoming[0].id, memberId: ME.id, status: 'booked', walletId: 'w1', orderId: null, createdAt: daysAgoIso(1) },
  { id: 'b2', sessionId: myUpcoming.find((s) => s.classTypeId === 'yin')?.id ?? myUpcoming[1].id, memberId: ME.id, status: 'booked', walletId: 'w1', orderId: null, createdAt: daysAgoIso(1) },
  ...sessions.filter((s) => s.start > new Date().toISOString() && s.locationId === null).slice(0, 1)
    .map((s): Booking => ({ id: 'b-online', sessionId: s.id, memberId: ME.id, status: 'booked', walletId: 'w1', orderId: null, createdAt: daysAgoIso(1) })),
  { id: 'b3', sessionId: myUpcoming.filter((s) => s.classTypeId === 'sunrise')[2]?.id ?? myUpcoming[2].id, memberId: ME.id, status: 'waitlist', walletId: null, orderId: null, createdAt: daysAgoIso(0) },
  ...sessions.filter((s) => s.start < new Date().toISOString() && s.locationId === 'beach' && s.classTypeId === 'sunrise').slice(0, 4)
    .map((s, i): Booking => ({ id: `bp${i}`, sessionId: s.id, memberId: ME.id, status: 'checked_in', walletId: 'w1', orderId: null, createdAt: s.start })),
];

const itineraryWeek = [
  { day: 1, title: 'Arrive and settle', items: [{ time: '2:00 pm', label: 'Check-in and welcome drink' }, { time: '5:00 pm', label: 'Opening circle and sunset flow' }, { time: '7:30 pm', label: 'Welcome dinner' }] },
  { day: 2, title: 'Foundations', items: [{ time: '7:00 am', label: 'Sunrise vinyasa' }, { time: '9:00 am', label: 'Breakfast' }, { time: '11:00 am', label: 'Breathwork workshop' }, { time: '5:00 pm', label: 'Yin & sound' }] },
  { day: 3, title: 'Day out', items: [{ time: '7:00 am', label: 'Gentle hatha' }, { time: '9:00 am', label: 'Guided coastal walk and swim' }, { time: '6:30 pm', label: 'Dinner on the beach' }] },
  { day: 4, title: 'Stillness', items: [{ time: '7:00 am', label: 'Silent morning practice' }, { time: '10:00 am', label: 'Free time — massage optional' }, { time: '5:00 pm', label: 'Restorative and yoga nidra' }] },
  { day: 5, title: 'Integration', items: [{ time: '7:00 am', label: 'Sunrise vinyasa' }, { time: '11:00 am', label: 'Workshop: keeping a home practice' }, { time: '7:00 pm', label: 'Closing dinner' }] },
  { day: 6, title: 'Depart', items: [{ time: '7:00 am', label: 'Final flow' }, { time: '9:00 am', label: 'Breakfast and check-out' }, { time: '11:00 am', label: 'Airport transfer (optional)' }] },
];

export const retreats: Retreat[] = [
  {
    id: 'r1', slug: 'salt-day', kind: 'day', title: 'Salt Day: a one-day reset', locationId: 'beach',
    startDate: addDays(TODAY, 12), endDate: addDays(TODAY, 12),
    summary: 'Two classes, a long lunch and a sound bath. Back home by sunset.',
    description: 'A full day away from your phone. We start with a slow practice, walk the shore and swim before a long lunch, and finish with yin and a sound bath as the light goes.',
    images: [IMAGES.cove, IMAGES.bay, IMAGES.yoga, IMAGES.shore, IMAGES.hero],
    capacity: 16, ticketPrice: 4500, rooms: [],
    addOns: [{ id: 'a1', name: '60-min massage after class', price: 1800 }, { id: 'a2', name: 'Hotel pickup', price: 400 }],
    itinerary: [{ day: 1, title: 'The day', items: [{ time: '8:00 am', label: 'Slow flow in the Ocean room' }, { time: '10:00 am', label: 'Shore walk and swim' }, { time: '12:30 pm', label: 'Long lunch' }, { time: '4:30 pm', label: 'Yin & sound bath' }, { time: '6:00 pm', label: 'Sunset and goodbye' }] }],
    included: ['Two classes', 'Lunch and drinks', 'Sound bath', 'Mats and props'],
    notIncluded: ['Hotel pickup (add-on)', 'Tips'],
    instructorIds: ['maya', 'jonas'],
    gettingThere: 'Meet at the Seaside studio. Free parking on Shore Road.',
    cancellation: 'Full refund up to 7 days before. After that, move to another date for free.',
    faqs: [{ q: 'I have never done yoga. Can I come?', a: 'Yes. Both classes are all levels and the teachers offer options throughout.' }, { q: 'What if the weather is bad?', a: 'We move everything indoors to the Ocean room. The day still runs.' }],
    status: 'published',
  },
  {
    id: 'r2', slug: 'stillness-week', kind: 'multi', title: 'Stillness Week by the Sea', locationId: 'beach',
    startDate: addDays(TODAY, 58), endDate: addDays(TODAY, 63),
    summary: 'Five nights, twelve classes, one day out. Small group, all levels.',
    description: 'Six days built around two practices a day, slow mornings and long dinners. Stay at our partner eco-lodge a short walk from the studio. We keep the group to 14 so every teacher knows your name by day two.',
    images: [IMAGES.hero, IMAGES.cove, IMAGES.shore, IMAGES.yoga, IMAGES.bay],
    capacity: 14, ticketPrice: null,
    rooms: [
      { id: 'rr1', name: 'Private garden hut', type: 'private', pricePerPerson: 68000, sleeps: 1, available: 2, description: 'Queen bed, outdoor shower, garden view.' },
      { id: 'rr2', name: 'Shared ocean cabana', type: 'shared', pricePerPerson: 54000, sleeps: 2, available: 3, description: 'Two single beds, sea-view deck. Share with a friend or we match you.' },
      { id: 'rr3', name: 'Couples suite', type: 'private', pricePerPerson: 61000, sleeps: 2, available: 0, description: 'King bed, ocean view. Price per person, two people.' },
    ],
    addOns: [{ id: 'a3', name: 'Airport transfer (both ways)', price: 1500 }, { id: 'a4', name: 'Extra night before', price: 6500 }, { id: 'a5', name: '90-min massage', price: 2400 }],
    itinerary: itineraryWeek,
    included: ['5 nights at the eco-lodge', 'All meals (plant-forward)', '12 classes and 2 workshops', 'Guided day out', 'Welcome pack'],
    notIncluded: ['Flights', 'Airport transfer (add-on)', 'Travel insurance', 'Massages (add-on)'],
    instructorIds: ['maya', 'jonas', 'paolo'],
    gettingThere: 'The nearest airport is 40 minutes away. We can book your transfer, or send directions if you are driving.',
    cancellation: '30% deposit holds your place. Balance due 45 days before. Deposit refundable up to 60 days before; after that, credit toward a future retreat.',
    faqs: [{ q: 'Do I need to be experienced?', a: 'No. Classes are all levels; teachers offer options for every pose.' }, { q: 'Can I come alone?', a: 'Most guests do. Pick a private hut, or a shared cabana and we will match you.' }, { q: 'Can you handle food allergies?', a: 'Yes. Tell us on the pre-arrival form.' }],
    status: 'published',
  },
  {
    id: 'r3', slug: 'breath-and-balance', kind: 'multi', title: 'Breath & Balance: a long weekend', locationId: 'town',
    startDate: addDays(TODAY, 72), endDate: addDays(TODAY, 75),
    summary: 'Three nights of breathwork, pilates and slow flow with the Downtown team.',
    description: 'A long weekend away with the Downtown teachers. Mornings on the mat, afternoons free, evenings for breathwork and rest. Built for beginners and regulars alike.',
    images: [IMAGES.boardwalk, IMAGES.yoga, IMAGES.bay, IMAGES.cove, IMAGES.hero],
    capacity: 12, ticketPrice: null,
    rooms: [
      { id: 'rr4', name: 'Private villa room', type: 'private', pricePerPerson: 42000, sleeps: 1, available: 4, description: 'Double bed, garden terrace.' },
      { id: 'rr5', name: 'Shared twin', type: 'shared', pricePerPerson: 34000, sleeps: 2, available: 3, description: 'Two single beds.' },
    ],
    addOns: [{ id: 'a6', name: 'Private session with a teacher', price: 2500 }, { id: 'a7', name: 'Airport transfer', price: 1200 }],
    itinerary: itineraryWeek.slice(0, 4).map((d, i) => ({ ...d, title: ['Arrive', 'Breath', 'Balance', 'Depart'][i] })),
    included: ['3 nights', 'Breakfast and dinner', '3 breathwork sessions', '6 classes'],
    notIncluded: ['Flights', 'Lunch', 'Private sessions (add-on)'],
    instructorIds: ['isla', 'kai'],
    gettingThere: 'We share the venue and directions once you book. Transfers can be added.',
    cancellation: '30% deposit. Balance due 45 days before.',
    faqs: [{ q: 'I have never done breathwork.', a: 'Most guests haven\'t. Every session starts from the basics.' }],
    status: 'published',
  },
  {
    id: 'r4', slug: 'new-year-reset', kind: 'multi', title: 'New Year Reset (draft)', locationId: 'beach',
    startDate: addDays(TODAY, 110), endDate: addDays(TODAY, 114),
    summary: 'Draft — dates and rooms not final.', description: '', images: [IMAGES.bay], capacity: 14, ticketPrice: null,
    rooms: [], addOns: [], itinerary: [], included: [], notIncluded: [], instructorIds: ['maya'],
    gettingThere: '', cancellation: '', faqs: [], status: 'draft',
  },
];

export const retreatBookings: RetreatBooking[] = [
  ['r2', 'm3', 'rr1', 70400, 70400, { diet: 'Vegetarian', flight: 'PR 2941 · arrives 1:10 pm', health: '', emergency: 'Jonas Becker +49 151 5550', waiver: true }],
  ['r2', 'm9', 'rr2', 55500, 16650, { diet: 'None', flight: '', health: 'Pregnant (2nd trimester)', emergency: 'Pieter de Vries', waiver: true }],
  ['r2', 'm17', 'rr2', 54000, 54000, { diet: 'Gluten-free', flight: '5J 5047 · arrives 10:45 am', health: '', emergency: 'Lea Fischer', waiver: true }],
  ['r2', 'm26', 'rr1', 70500, 20400, { diet: 'Vegan', flight: '', health: '', emergency: '', waiver: false }],
  ['r2', 'm1', 'rr2', 54000, 16200, { diet: 'None', flight: '', health: 'Knee surgery 2024', emergency: 'Marc Laurent', waiver: true }],
  ['r2', 'm12', 'rr3', 61000, 61000, { diet: 'Pescatarian', flight: 'PR 2941 · arrives 1:10 pm', health: '', emergency: 'Erik Lindqvist', waiver: true }],
  ['r2', 'm21', 'rr3', 61000, 18300, { diet: 'None', flight: '', health: '', emergency: '', waiver: false }],
  ['r1', 'm6', null, 4500, 4500, { diet: '', flight: '', health: '', emergency: '', waiver: true }],
  ['r1', 'm13', null, 6300, 6300, { diet: '', flight: '', health: '', emergency: '', waiver: true }],
  ['r1', 'm22', null, 4900, 4900, { diet: '', flight: '', health: '', emergency: '', waiver: false }],
  ['r1', 'm4', null, 4500, 4500, { diet: '', flight: '', health: '', emergency: '', waiver: true }],
  ['r3', 'm10', 'rr4', 54500, 15600, { diet: 'None', flight: '', health: '', emergency: '', waiver: false }],
  ['r3', 'm16', 'rr5', 42000, 12600, { diet: 'None', flight: '', health: '', emergency: '', waiver: true }],
].map(([retreatId, memberId, roomId, total, paid, forms], i) => ({
  id: `rb${i + 1}`, retreatId: retreatId as string, memberId: memberId as string, roomId: roomId as string | null,
  guests: 1, addOnIds: [], total: total as number, paid: paid as number,
  status: 'confirmed' as const, createdAt: daysAgoIso(3 + i * 4), forms: forms as RetreatBooking['forms'],
}));

const ORDER_SEED: [string, Order['kind'], string, number, 'PHP' | 'USD', Order['method'], Order['status'], LocationId | null, number][] = [
  ['m6', 'pass', 'Intro week', 1500, 'USD', 'card', 'paid', 'beach', 1],
  ['m19', 'pass', '10-class pass', 6000, 'PHP', 'gcash', 'paid', 'beach', 9],
  ['m8', 'pass', 'Unlimited monthly', 7500, 'PHP', 'gcash', 'paid', 'town', 3],
  ['m13', 'retreat', 'Salt Day + massage', 6300, 'USD', 'card', 'paid', 'beach', 2],
  ['m22', 'retreat', 'Salt Day + pickup', 4900, 'USD', 'paypal', 'paid', 'beach', 4],
  ['m3', 'retreat', 'Stillness Week · Private hut + transfer', 70400, 'USD', 'card', 'paid', 'beach', 30],
  ['m9', 'retreat', 'Stillness Week · deposit', 16650, 'USD', 'card', 'paid', 'beach', 22],
  ['m11', 'dropin', 'Drop-in · Sunset Flow', 750, 'USD', 'card', 'paid', 'beach', 0],
  ['m25', 'dropin', 'Drop-in · Mat Pilates', 750, 'USD', 'card', 'paid', 'town', 0],
  ['m2', 'dropin', 'Drop-in · Sunrise Vinyasa', 750, 'USD', 'card', 'paid', 'beach', 1],
  ['m15', 'online', 'Online membership', 990, 'USD', 'card', 'paid', null, 8],
  ['m24', 'rental', 'Rental · Hips & hamstrings (48h)', 350, 'USD', 'card', 'paid', null, 2],
  ['m20', 'pass', 'Unlimited monthly · renewal', 7500, 'USD', 'card', 'failed', 'town', 1],
  ['m5', 'pass', '5-class pass', 3250, 'USD', 'card', 'paid', 'town', 6],
  ['m14', 'pass', '5-class pass', 3250, 'USD', 'paypal', 'refunded', 'town', 11],
  ['m27', 'dropin', 'Drop-in · Yin & Sound', 750, 'USD', 'card', 'paid', 'beach', 2],
  ['m28', 'dropin', 'Drop-in · Mat Pilates', 750, 'USD', 'card', 'paid', 'town', 3],
  ['m4', 'pass', '10-class pass', 6000, 'USD', 'card', 'paid', 'beach', 24],
  ['m10', 'retreat', 'Breath & Balance · deposit', 15600, 'USD', 'card', 'paid', 'town', 14],
  ['m7', 'pass', 'Unlimited monthly', 7500, 'PHP', 'gcash', 'paid', 'beach', 12],
  ['m23', 'dropin', 'Drop-in · Slow Flow Hatha', 750, 'PHP', 'gcash', 'paid', 'beach', 5],
  ['m29', 'pass', '5-class pass', 3250, 'USD', 'card', 'paid', 'beach', 7],
  ['m30', 'dropin', 'Drop-in · Sunset Flow', 750, 'USD', 'paypal', 'pending', 'beach', 0],
  ['m18', 'pass', '10-class pass', 6000, 'USD', 'card', 'paid', 'beach', 16],
  ['m26', 'retreat', 'Stillness Week · deposit', 20400, 'USD', 'card', 'paid', 'beach', 18],
];

export const orders: Order[] = ORDER_SEED
  .map(([memberId, kind, label, total, cur, method, status, loc, days], i) => ({
    id: `o${i + 1}`, number: `SS-${1100 - i}`, memberId, kind, items: [{ label, amount: total }], total,
    chargedCurrency: cur, method, status, locationId: loc,
    createdAt: daysAgoIso(days, `${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`),
    refundNote: status === 'refunded' ? 'Change of plans — refunded to card.' : undefined,
  }))
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const videos: Video[] = [
  ['Morning flow for travel days', 'Vinyasa', 'All levels', 30, 'maya', 'Full body', IMAGES.hero, 'members', null, 1240],
  ['Hips & hamstrings', 'Yin', 'All levels', 45, 'jonas', 'Hips', IMAGES.shore, 'rental', 350, 980],
  ['Morning mobility', 'Pilates', 'All levels', 15, 'isla', 'Shoulders', IMAGES.mats, 'free', null, 2310],
  ['Strong sunset flow', 'Vinyasa', 'Intermediate', 60, 'maya', 'Core', IMAGES.cove, 'members', null, 760],
  ['Sleep-ready restorative', 'Restorative', 'All levels', 30, 'kai', 'Sleep', IMAGES.yoga, 'members', null, 1510],
  ['Box breathing basics', 'Breathwork', 'Beginner', 15, 'jonas', 'Stress', IMAGES.bay, 'free', null, 3020],
  ['Lower back relief', 'Hatha', 'Beginner', 30, 'paolo', 'Back', IMAGES.shore, 'members', null, 1390],
  ['Core and balance', 'Pilates', 'Intermediate', 45, 'isla', 'Balance', IMAGES.studio, 'rental', 350, 540],
  ['Yin for the upper body', 'Yin', 'All levels', 60, 'kai', 'Shoulders', IMAGES.cove, 'members', null, 620],
  ['20-minute reset', 'Vinyasa', 'Beginner', 20, 'maya', 'Full body', IMAGES.hero, 'members', null, 2050],
  ['Alignment: standing poses', 'Hatha', 'Beginner', 45, 'paolo', 'Legs', IMAGES.bay, 'members', null, 430],
  ['Sound bath (audio + visuals)', 'Yin', 'All levels', 30, 'jonas', 'Sleep', IMAGES.yoga, 'members', null, 1880],
].map(([title, style, level, duration, instructorId, focus, image, access, rentalPrice, views], i) => ({
  id: `v${i + 1}`, title: title as string, style: style as string, level: level as Video['level'],
  duration: duration as number, instructorId: instructorId as string, focus: focus as string, image: image as string,
  access: access as Video['access'], rentalPrice: rentalPrice as number | null,
  publishedAt: daysAgoIso(4 + i * 9), views: views as number,
}));

export const staff: StaffMember[] = [
  { id: 'st1', name: 'Mara Lopez', email: 'mara@saltandstillness.com', role: 'owner', locations: ['beach', 'town'] },
  { id: 'st2', name: 'Rina Dela Cruz', email: 'rina@saltandstillness.com', role: 'manager', locations: ['town'] },
  { id: 'st3', name: 'Joy Abad', email: 'frontdesk@saltandstillness.com', role: 'front_desk', locations: ['beach'] },
  ...instructors.map((t, i): StaffMember => ({ id: `st${i + 4}`, name: t.name, email: `${t.id}@saltandstillness.com`, role: 'instructor', locations: t.locations, instructorId: t.id })),
];

export const promos: Promo[] = [
  { id: 'p1', code: 'FIRSTFLOW', percentOff: 20, appliesTo: 'intro', uses: 41, maxUses: null, expiresAt: null, active: true },
  { id: 'p2', code: 'STILLNESS10', percentOff: 10, appliesTo: 'retreat', uses: 6, maxUses: 20, expiresAt: addDays(TODAY, 30), active: true },
  { id: 'p3', code: 'HOTELGUEST', percentOff: 15, appliesTo: 'dropin', uses: 88, maxUses: null, expiresAt: null, active: true },
  { id: 'p4', code: 'RAINYSEASON', percentOff: 25, appliesTo: 'pack', uses: 120, maxUses: 120, expiresAt: addDays(TODAY, -20), active: false },
];

export const activity: DemoState['activity'] = [
  { id: 'ac1', at: daysAgoIso(0, '06:12'), text: 'Yuki Tanaka bought a drop-in for Sunset Flow', icon: 'ri-shopping-bag-3-line' },
  { id: 'ac2', at: daysAgoIso(0, '05:40'), text: 'Ava Thompson booked Sunrise Vinyasa with her intro week', icon: 'ri-calendar-check-line' },
  { id: 'ac3', at: daysAgoIso(0, '04:55'), text: 'Waitlist: Zoe Clarke moved into Sunset Flow', icon: 'ri-arrow-up-circle-line' },
  { id: 'ac4', at: daysAgoIso(1, '21:20'), text: 'Leah Murphy\'s monthly renewal failed — card declined', icon: 'ri-error-warning-line' },
  { id: 'ac5', at: daysAgoIso(1, '18:02'), text: 'Isabella Rossi booked Salt Day (+ massage)', icon: 'ri-sun-line' },
  { id: 'ac6', at: daysAgoIso(1, '15:30'), text: 'Paolo Santos is covering Sunset Flow on ' + addDays(TODAY, 2).slice(5), icon: 'ri-user-shared-line' },
  { id: 'ac7', at: daysAgoIso(2, '11:45'), text: 'Priya Nair paid a deposit for Stillness Week', icon: 'ri-home-heart-line' },
];

/** Monthly revenue (PHP) for the last 6 months, by location. Used by reports and the Today chart. */
export const revenueByMonth = (() => {
  const out: { month: string; beach: number; town: number; online: number }[] = [];
  const [y, m] = TODAY.split('-').map(Number);
  const r = rng(42);
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1 - i, 1));
    const month = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(dt);
    const season = [0.7, 0.76, 0.84, 0.9, 0.98, 1.12][5 - i] ?? 1;
    out.push({
      month,
      beach: Math.round((310000 + r() * 60000) * season / 1000) * 1000,
      town: Math.round((150000 + r() * 40000) * season / 1000) * 1000,
      online: Math.round((32000 + r() * 12000) * (1 + (5 - i) * 0.08) / 100) * 100,
    });
  }
  return out;
})();

export const TODAY_KEY = TODAY;

// Lookups
export const byId = <T extends { id: string }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x])) as Record<string, T>;
export const LOC = byId(locations) as Record<LocationId, Location>;
export const TEACHER = byId(instructors);
export const CLASS = byId(classTypes);
export const MEMBER = byId(members);
export const PRODUCT = byId(products);
export const RETREAT = byId(retreats);
