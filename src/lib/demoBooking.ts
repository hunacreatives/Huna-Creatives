// Where the demo's "Book a call" CTAs point. Swap this one line to change it.
export const BOOKING_URL = 'https://calendly.com/hunacreatives/30min';

// Where leaving the demo ("Exit the demo") sends the visitor.
export const DEMO_EXIT_URL = 'https://www.hunacreatives.com/sentro';

export function openBooking() {
  window.open(BOOKING_URL, '_blank', 'noopener,noreferrer');
}
