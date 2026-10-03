// "Follow the work" + Instagram / Facebook icons, shared by every client-facing
// email footer (leads, clients, applicants). Icons are hosted PNGs because email
// clients strip icon fonts and SVG.
//
// NOTE: the deploy workflow only redeploys functions whose own folder changed.
// After editing this file, touch each function that imports it so CI redeploys it:
//   grep -l followFooter supabase/functions/*/index.ts
export const INSTAGRAM_URL = 'https://www.instagram.com/hunacreatives/';
export const FACEBOOK_URL = 'https://www.facebook.com/hunacreatives/';
const ICON_BASE = 'https://www.hunacreatives.com/images/email/';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";

function icon(href: string, file: string, alt: string): string {
  return `<a href="${href}" style="text-decoration:none;display:inline-block;vertical-align:middle;margin-left:8px">`
    + `<img src="${ICON_BASE}${file}" width="18" height="18" alt="${alt}" style="display:block;border:0;outline:0;width:18px;height:18px"></a>`;
}

// Inline label + icons. labelColor: #888888 on the dark footer bar, #9ca3af on light footers.
export function followTheWork(labelColor = '#888888'): string {
  return `<span style="font-family:${FONT};font-size:10px;color:${labelColor};letter-spacing:0.08em;text-transform:uppercase;vertical-align:middle">Follow the work</span>`
    + icon(INSTAGRAM_URL, 'instagram.png', 'Instagram')
    + icon(FACEBOOK_URL, 'facebook.png', 'Facebook');
}
