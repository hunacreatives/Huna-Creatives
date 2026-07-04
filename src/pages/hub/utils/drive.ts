// Stored receipt URLs are Drive "view" page links (https://drive.google.com/file/d/{id}/view),
// not direct image URLs — convert to the thumbnail API for use in <img src>.
export function getDriveThumbnailUrl(url: string | null | undefined, size = 400) {
  if (!url) return url ?? '';
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!match) return url;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w${size}`;
}
