import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

// ── VAPID JWT helpers ─────────────────────────────────────────────────────────

function base64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function makeVapidJwt(audience: string): Promise<string> {
  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 12 * 3600, sub: VAPID_SUBJECT })),
  );
  const signingInput = `${header}.${payload}`;

  const privateKeyBytes = base64urlDecode(VAPID_PRIVATE_KEY);
  // VAPID private key is a raw 32-byte EC scalar — import as raw
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    buildPkcs8(privateKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cryptoKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64urlEncode(sig)}`;
}

function buildPkcs8(rawPrivate: Uint8Array): ArrayBuffer {
  // Wrap a raw P-256 private key scalar into PKCS#8 DER for Web Crypto import
  const header = new Uint8Array([
    0x30, 0x41, // SEQUENCE
    0x02, 0x01, 0x00, // INTEGER version=0
    0x30, 0x13, // SEQUENCE (algorithm)
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
    0x04, 0x27, // OCTET STRING (ECPrivateKey)
    0x30, 0x25, // SEQUENCE ECPrivateKey
    0x02, 0x01, 0x01, // INTEGER version=1
    0x04, 0x20, // OCTET STRING (private key)
  ]);
  const buf = new Uint8Array(header.length + rawPrivate.length);
  buf.set(header);
  buf.set(rawPrivate, header.length);
  return buf.buffer;
}

// ── Web Push ──────────────────────────────────────────────────────────────────

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await makeVapidJwt(audience);

  const publicKeyBytes = base64urlDecode(VAPID_PUBLIC_KEY);
  const vapidHeader = `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`;

  // Encrypt the payload using Web Push encryption (RFC 8291 / ece)
  const encrypted = await encryptPayload(p256dh, auth, JSON.stringify(payload));

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '86400',
    },
    body: encrypted,
  });

  if (!res.ok && res.status !== 201) {
    const text = await res.text();
    throw new Error(`Push failed ${res.status}: ${text}`);
  }
}

// ── RFC 8291 aes128gcm encryption ─────────────────────────────────────────────

async function encryptPayload(p256dhB64: string, authB64: string, plaintext: string): Promise<ArrayBuffer> {
  const p256dh = base64urlDecode(p256dhB64);
  const authSecret = base64urlDecode(authB64);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  // Generate ephemeral ECDH key pair
  const ephemeralKey = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ephemeralPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeralKey.publicKey),
  );

  // Import recipient's public key
  const recipientKey = await crypto.subtle.importKey(
    'raw', p256dh, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: recipientKey }, ephemeralKey.privateKey, 256),
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK via HKDF-SHA256
  const prk = await hkdf(authSecret, sharedSecret, concat(
    new TextEncoder().encode('WebPush: info\x00'),
    p256dh,
    ephemeralPublicRaw,
  ), 32);

  // Content encryption key and nonce
  const cek = await hkdf(salt, prk, new TextEncoder().encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(salt, prk, new TextEncoder().encode('Content-Encoding: nonce\x00'), 12);

  const cekKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // Pad the plaintext (2-byte length + padding delimiter)
  const padded = new Uint8Array(plaintextBytes.length + 2);
  padded.set(plaintextBytes);
  padded[plaintextBytes.length] = 0x02; // padding delimiter

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cekKey, padded),
  );

  // Build aes128gcm record header: salt(16) + rs(4) + keyid_len(1) + keyid
  const rs = plaintextBytes.length + 2 + 16; // record size
  const header = new Uint8Array(21 + ephemeralPublicRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = ephemeralPublicRaw.length;
  header.set(ephemeralPublicRaw, 21);

  return concat(header, ciphertext).buffer;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const keyMat = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    keyMat, len * 8,
  );
  return new Uint8Array(bits);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { out.set(a, offset); offset += a.length; }
  return out;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { user_id, title, body, url } = await req.json();
    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'user_id, title, body required' }), { status: 400, headers: cors });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subs } = await supabase
      .from('hub_push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (!subs?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: cors });
    }

    const results = await Promise.allSettled(
      subs.map((s) => sendWebPush(s.endpoint, s.p256dh, s.auth, { title, body, url })),
    );

    // Remove stale subscriptions (gone/expired endpoints return 404 or 410)
    const stale: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const msg = String(r.reason);
        if (msg.includes('404') || msg.includes('410')) stale.push(subs[i].endpoint);
        else console.error('send-push error', { endpoint: subs[i].endpoint, err: msg });
      }
    });
    if (stale.length) {
      await supabase.from('hub_push_subscriptions').delete().in('endpoint', stale);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(JSON.stringify({ ok: true, sent }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
