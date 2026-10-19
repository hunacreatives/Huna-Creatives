// The demo's only shared state. Kept in memory: a refresh resets everything,
// which is what a click-through demo wants. Nothing is sent anywhere.

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import type { LocationId } from './types';
import { bookings as seedBookings } from './data';

export type Toast = { id: number; text: string; tone?: 'ok' | 'info' | 'warn' };
type AdminLoc = 'all' | LocationId;

type MyBooking = { sessionId: string; status: 'booked' | 'waitlist' };

interface DemoCtx {
  /** Guest's own timezone for "your time" (defaults to the browser's). */
  viewerTz: string;
  setViewerTz: (tz: string) => void;
  /** Sessions the demo guest has booked or waitlisted this visit. */
  myBookings: MyBooking[];
  book: (sessionId: string, status: MyBooking['status']) => void;
  cancelBooking: (sessionId: string) => void;
  /** Admin location switcher. */
  adminLoc: AdminLoc;
  setAdminLoc: (l: AdminLoc) => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
}

const Ctx = createContext<DemoCtx | null>(null);

const browserTz = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney'; } catch { return 'Australia/Sydney'; }
};

export function DemoWellnessProvider({ children }: { children: ReactNode }) {
  const [viewerTz, setViewerTz] = useState(() => {
    const tz = browserTz();
    // Visitors already in the Philippines see the same time twice; show a traveller's view instead.
    return tz === 'Asia/Manila' ? 'Australia/Sydney' : tz;
  });
  const [myBookings, setMyBookings] = useState<MyBooking[]>(() =>
    seedBookings.filter((b) => b.memberId === 'm4' && (b.status === 'booked' || b.status === 'waitlist'))
      .map((b) => ({ sessionId: b.sessionId, status: b.status as MyBooking['status'] })));
  const [adminLoc, setAdminLoc] = useState<AdminLoc>('all');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const book = useCallback((sessionId: string, status: MyBooking['status']) =>
    setMyBookings((b) => [...b.filter((x) => x.sessionId !== sessionId), { sessionId, status }]), []);
  const cancelBooking = useCallback((sessionId: string) =>
    setMyBookings((b) => b.filter((x) => x.sessionId !== sessionId)), []);

  const value = useMemo(() => ({ viewerTz, setViewerTz, myBookings, book, cancelBooking, adminLoc, setAdminLoc, toasts, toast }),
    [viewerTz, myBookings, book, cancelBooking, adminLoc, toasts, toast]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDemo outside DemoWellnessProvider');
  return c;
}

/** Base path for links inside the demo. */
export const BASE = '/demo/wellness';
export const to = (p = '') => `${BASE}${p}`;
