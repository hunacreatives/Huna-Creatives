// Salt & Stillness Yoga — demo data model. Everything lives in the browser
// (see store.tsx); nothing here talks to a server.

export type LocationId = 'beach' | 'town';

export interface Room { id: string; name: string; capacity: number }

export interface Location {
  id: LocationId;
  name: string;            // "Seaside"
  area: string;            // "Beachfront studio"
  address: string;
  image: string;
  mapUrl: string;
  rooms: Room[];
  blurb: string;
}

export interface Instructor {
  id: string;
  name: string;
  bio: string;
  styles: string[];
  locations: LocationId[];
  color: string;           // avatar tint
}

export type Level = 'All levels' | 'Beginner' | 'Intermediate' | 'Advanced';

export interface ClassType {
  id: string;
  name: string;
  style: string;           // Vinyasa, Yin, Hatha, Restorative, Pilates, Breathwork
  level: Level;
  duration: number;        // minutes
  description: string;
  format: 'studio' | 'online';
}

export interface Session {
  id: string;
  classTypeId: string;
  locationId: LocationId | null;   // null = online
  roomId: string | null;
  instructorId: string;
  start: string;                   // ISO instant
  capacity: number;
  seriesId: string | null;         // recurring template it came from
  status: 'scheduled' | 'cancelled';
  cancelNote?: string;
  joinUrl?: string;                // online only
  substituteFor?: string;          // original instructor id when subbed
}

export type ProductKind = 'dropin' | 'pack' | 'monthly' | 'intro' | 'online';

export interface Product {
  id: string;
  kind: ProductKind;
  name: string;
  price: number;                   // PHP
  credits: number | null;          // null = unlimited
  validityDays: number;
  locations: 'all' | LocationId[];
  includesOnDemand: boolean;
  description: string;
  popular?: boolean;
  active: boolean;
}

export type WalletStatus = 'active' | 'frozen' | 'expired' | 'used';

export interface Wallet {
  id: string;
  memberId: string;
  productId: string;
  creditsTotal: number | null;
  creditsLeft: number | null;
  purchasedAt: string;
  expiresAt: string;
  status: WalletStatus;
  frozenUntil?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;                 // "Australia"
  timezone: string;                // IANA
  joinedAt: string;
  tags: string[];
  notes: string;
  waiverSigned: boolean;
  homeLocation: LocationId;
}

export type BookingStatus = 'booked' | 'waitlist' | 'checked_in' | 'no_show' | 'late_cancel' | 'cancelled';

export interface Booking {
  id: string;
  sessionId: string;
  memberId: string;
  status: BookingStatus;
  walletId: string | null;         // credit used
  orderId: string | null;          // paid drop-in
  createdAt: string;
  feeWaived?: boolean;
}

export interface RetreatRoom {
  id: string;
  name: string;                    // "Private garden hut"
  type: 'private' | 'shared';
  pricePerPerson: number;          // PHP
  sleeps: number;
  available: number;               // rooms/beds left
  description: string;
}

export interface ItineraryDay { day: number; title: string; items: { time: string; label: string }[] }

export interface Retreat {
  id: string;
  slug: string;
  kind: 'day' | 'multi';
  title: string;
  locationId: LocationId;
  startDate: string;               // YYYY-MM-DD
  endDate: string;                 // same as start for day retreats
  summary: string;
  description: string;
  images: string[];
  capacity: number;
  ticketPrice: number | null;      // day retreats (PHP per person)
  rooms: RetreatRoom[];            // multi-day only
  addOns: { id: string; name: string; price: number }[];
  itinerary: ItineraryDay[];
  included: string[];
  notIncluded: string[];
  instructorIds: string[];
  gettingThere: string;
  cancellation: string;
  faqs: { q: string; a: string }[];
  status: 'published' | 'draft';
}

export interface RetreatBooking {
  id: string;
  retreatId: string;
  memberId: string;
  roomId: string | null;
  guests: number;
  addOnIds: string[];
  total: number;                   // PHP
  paid: number;                    // PHP
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  forms: { diet: string; flight: string; health: string; emergency: string; waiver: boolean };
}

export type OrderStatus = 'paid' | 'refunded' | 'failed' | 'pending';

export interface Order {
  id: string;
  number: string;                  // "SS-1042"
  memberId: string;
  kind: 'pass' | 'dropin' | 'retreat' | 'online' | 'rental';
  items: { label: string; amount: number }[];
  total: number;                   // PHP
  chargedCurrency: 'PHP' | 'USD';
  method: 'card' | 'paypal' | 'gcash';
  status: OrderStatus;
  createdAt: string;
  locationId: LocationId | null;
  refundNote?: string;
}

export interface Video {
  id: string;
  title: string;
  style: string;
  level: Level;
  duration: number;                // minutes
  instructorId: string;
  focus: string;                   // "Hips", "Back", "Sleep", "Core"
  image: string;
  access: 'members' | 'rental' | 'free';
  rentalPrice: number | null;      // PHP, 48h
  publishedAt: string;
  views: number;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'manager' | 'front_desk' | 'instructor';
  locations: LocationId[];
  instructorId?: string;
}

export interface Promo {
  id: string;
  code: string;
  percentOff: number;
  appliesTo: 'all' | ProductKind | 'retreat';
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  active: boolean;
}

export interface Settings {
  lateCancelHours: number;
  lateCancelFee: number;           // PHP
  noShowFee: number;               // PHP
  waitlistAuto: boolean;
  bookingWindowDays: number;
  usdRate: number;                 // PHP per USD, for the "≈ US$" guide
}

export interface ViewerPrefs {
  timezone: string;                // the guest's "your time"
  meId: string;                    // demo guest acting as the signed-in visitor
}

export interface DemoState {
  version: number;
  seededAt: string;
  locations: Location[];
  instructors: Instructor[];
  classTypes: ClassType[];
  sessions: Session[];
  products: Product[];
  members: Member[];
  wallets: Wallet[];
  bookings: Booking[];
  retreats: Retreat[];
  retreatBookings: RetreatBooking[];
  orders: Order[];
  videos: Video[];
  favourites: string[];            // video ids (the demo guest's)
  progress: Record<string, number>; // video id → 0..1 watched
  rentals: Record<string, string>; // video id → expires ISO
  staff: StaffMember[];
  promos: Promo[];
  settings: Settings;
  viewer: ViewerPrefs;
  activity: { id: string; at: string; text: string; icon: string }[];
}
