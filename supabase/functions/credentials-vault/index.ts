import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Encrypts/decrypts client credential passwords with AES-256-GCM.
// The key lives ONLY in the CREDENTIALS_KEY function secret (base64, 32 bytes):
//   npx supabase secrets set CREDENTIALS_KEY="$(openssl rand -base64 32)"
// Ciphertext format: "v1:" + base64(iv) + ":" + base64(cipher)
//
// Actions (caller JWT is verified):
//   { action: 'encrypt', plaintext }        → { ciphertext }   (admin/owner/hr)
//   { action: 'decrypt', credential_id }    → { password, additional_info }
//       admin/owner/hr, or an employee assigned to the credential's client /
//       with an approved access request; lazy-migrates legacy plaintext rows
//   { action: 'migrate' }                   → { migrated }     (admin/owner/hr)

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const b64encode = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const b64decode = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('CREDENTIALS_KEY');
  if (!raw) throw new Error('CREDENTIALS_KEY secret is not set');
  return crypto.subtle.importKey('raw', b64decode(raw.trim()), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return `v1:${b64encode(iv)}:${b64encode(cipher)}`;
}

async function decrypt(ciphertext: string): Promise<string> {
  const [version, ivB64, dataB64] = ciphertext.split(':');
  if (version !== 'v1' || !ivB64 || !dataB64) throw new Error('Unrecognized ciphertext format');
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64decode(ivB64) }, key, b64decode(dataB64));
  return new TextDecoder().decode(plain);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    // Verify the caller is a logged-in hub user; role gates are per-action.
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: { user } = { user: null } } = await admin.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: cors });
    }
    const { data: hubUser } = await admin.from('hub_users').select('role').eq('id', user.id).maybeSingle();
    const isPrivileged = !!hubUser && ['owner', 'admin', 'hr'].includes(hubUser.role);

    const { action, plaintext, credential_id } = await req.json();

    if (action !== 'decrypt' && !isPrivileged) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: cors });
    }

    if (action === 'encrypt') {
      if (typeof plaintext !== 'string' || !plaintext) {
        return new Response(JSON.stringify({ error: 'plaintext required' }), { status: 400, headers: cors });
      }
      return new Response(JSON.stringify({ ok: true, ciphertext: await encrypt(plaintext) }), { headers: cors });
    }

    if (action === 'decrypt') {
      const { data: cred, error } = await admin
        .from('hub_credentials')
        .select('id, client_name, password, password_enc, additional_info, additional_info_enc')
        .eq('id', credential_id)
        .single();
      if (error || !cred) {
        return new Response(JSON.stringify({ error: 'Credential not found' }), { status: 404, headers: cors });
      }

      // Employees may decrypt only credentials they're entitled to: assigned
      // to the credential's client, or holding an approved access request.
      if (!isPrivileged) {
        const [{ data: assignedClient }, { data: approvedReq }] = await Promise.all([
          admin.from('hub_clients')
            .select('id')
            .eq('client_name', cred.client_name)
            .eq('assigned_contractor_id', user.id)
            .limit(1)
            .maybeSingle(),
          admin.from('hub_credential_requests')
            .select('id')
            .eq('credential_id', cred.id)
            .eq('contractor_id', user.id)
            .eq('status', 'approved')
            .limit(1)
            .maybeSingle(),
        ]);
        if (!assignedClient && !approvedReq) {
          return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403, headers: cors });
        }
      }

      let password: string | null = null;
      if (cred.password_enc) {
        password = await decrypt(cred.password_enc);
      } else if (cred.password) {
        // Legacy plaintext row — encrypt it now and clear the plaintext
        password = cred.password;
        await admin.from('hub_credentials')
          .update({ password_enc: await encrypt(cred.password), password: null })
          .eq('id', cred.id);
      }

      let additionalInfo: string | null = null;
      if (cred.additional_info_enc) {
        additionalInfo = await decrypt(cred.additional_info_enc);
      } else if (cred.additional_info) {
        additionalInfo = cred.additional_info;
        await admin.from('hub_credentials')
          .update({ additional_info_enc: await encrypt(cred.additional_info), additional_info: null })
          .eq('id', cred.id);
      }

      return new Response(JSON.stringify({ ok: true, password, additional_info: additionalInfo }), { headers: cors });
    }

    if (action === 'migrate') {
      const { data: rows } = await admin
        .from('hub_credentials')
        .select('id, password, additional_info')
        .or('password.not.is.null,additional_info.not.is.null');
      let migrated = 0;
      for (const row of rows ?? []) {
        const patch: Record<string, string | null> = {};
        if (row.password) {
          patch.password_enc = await encrypt(row.password);
          patch.password = null;
        }
        if (row.additional_info) {
          patch.additional_info_enc = await encrypt(row.additional_info);
          patch.additional_info = null;
        }
        if (Object.keys(patch).length === 0) continue;
        const { error } = await admin.from('hub_credentials').update(patch).eq('id', row.id);
        if (!error) migrated += 1;
      }
      return new Response(JSON.stringify({ ok: true, migrated }), { headers: cors });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
