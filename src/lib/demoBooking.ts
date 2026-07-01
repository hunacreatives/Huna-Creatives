// Where the demo's "Book a call" CTAs point. Swap this one line to change it.
export const BOOKING_URL = 'https://calendly.com/hunacreatives/30min';

// Where leaving the demo ("Exit the demo") sends the visitor.
export const DEMO_EXIT_URL = 'https://www.hunacreatives.com/sentro';

export function openBooking() {
  window.open(BOOKING_URL, '_blank', 'noopener,noreferrer');
}

// Leave the demo → the Sentro marketing page. Clears the demo flag directly
// (NOT via demoSignOut's setState, which would flip isDemo→false and trip the
// auth guard's redirect to /hub/login before this navigation runs).
export function exitDemo() {
  try {
    localStorage.removeItem('hub_demo');
    localStorage.removeItem('hub_demo_role');
  } catch { /* ignore */ }
  window.location.href = DEMO_EXIT_URL;
}
