// Small helpers shared by the guest Schedule and Home pages.

import type { Session } from '../lib/types';
import { TEACHER, bookedCount, waitlistCount } from '../lib/data';
import { yourTime } from '../lib/format';

/** Spots-left copy for a session: "3 spots left", "Full · 2 waiting", "12 spots". */
export function spots(s: Session) {
  const left = Math.max(0, s.capacity - bookedCount(s));
  if (left === 0) return { left, full: true, low: false, text: `Full · ${waitlistCount(s)} waiting` };
  const low = left <= 3;
  return { left, full: false, low, text: left === 1 ? '1 spot left' : low ? `${left} spots left` : `${left} spots` };
}

/** "Maya Reyes" or "Paolo Santos (covering for Maya)". */
export function teacherName(s: Session) {
  const t = TEACHER[s.instructorId];
  if (!s.substituteFor) return t.name;
  return `${t.name} (covering for ${TEACHER[s.substituteFor].name.split(' ')[0]})`;
}

/** Viewer time split into the clock part and an optional weekday ("Tue") when it falls on another day. */
export function yourTimeParts(iso: string, tz: string) {
  const full = yourTime(iso, tz);
  const m = full.match(/^(.*?[ap]m)(?:\s+(\w{3}))?$/i);
  return { time: m ? m[1] : full, day: m?.[2] ?? null, full };
}

/** Common traveller timezones for the "your time" picker. */
export const TZ_OPTIONS = [
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
];
