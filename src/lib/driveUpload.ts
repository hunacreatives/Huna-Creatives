import { supabase } from './supabase';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function uploadFileToDrive(
  file: File,
  type: string,
  meta: Record<string, string> = {},
): Promise<string | null> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File is too large (max 100 MB). This file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
  }

  const buffer = await file.arrayBuffer();
  const base64Content = toBase64(buffer);

  const { data, error } = await supabase.functions.invoke('upload-to-drive', {
    body: { filename: file.name, mimeType: file.type || 'application/octet-stream', base64Content, type, meta },
  });

  if (error || !data?.success) {
    const msg = data?.error ?? error?.message ?? 'Upload failed';
    throw new Error(msg);
  }
  return data.url as string;
}
