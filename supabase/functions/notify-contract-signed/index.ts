import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { FRANCIS_SIG } from '../_shared/francisSig.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = 'Huna Creatives <contact@hunacreatives.com>';
const ADMIN_EMAIL = 'contact@hunacreatives.com';
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://hunacreatives.com';
const DRIVE_FOLDER_ID = '1Pvqf6N4ZkBWimTVlbwzn1zKi04cP1jkM';

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

function fmtDate(iso: string) {
  return new Date(iso.includes('T') ? iso : iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

async function getGoogleAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('OAuth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function generatePdf(htmlContent: string, filename: string): Promise<Uint8Array | null> {
  try {
    const accessToken = await getGoogleAccessToken();
    const enc = new TextEncoder();
    const fileBytes = enc.encode(htmlContent);
    const boundary = 'huna_contract_boundary';
    const meta = JSON.stringify({ name: filename, parents: [DRIVE_FOLDER_ID], mimeType: 'application/vnd.google-apps.document' });
    const part1 = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`);
    const part2 = enc.encode(`--${boundary}\r\nContent-Type: text/html\r\n\r\n`);
    const part3 = enc.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(part1.length + part2.length + fileBytes.length + part3.length);
    body.set(part1, 0);
    body.set(part2, part1.length);
    body.set(fileBytes, part1.length + part2.length);
    body.set(part3, part1.length + part2.length + fileBytes.length);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body }
    );
    const uploaded = await uploadRes.json();
    if (!uploadRes.ok) throw new Error('Drive upload failed: ' + JSON.stringify(uploaded));

    const fileId: string = uploaded.id;

    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!exportRes.ok) throw new Error(`Drive PDF export failed: ${exportRes.status}`);
    const pdfBytes = new Uint8Array(await exportRes.arrayBuffer());

    // Clean up temp Drive file
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(() => {});

    return pdfBytes;
  } catch (e) {
    console.error('PDF generation error:', e);
    return null;
  }
}

function buildContractHtml(contract: any): string {
  const signedAt = contract.signed_at ? fmtDate(contract.signed_at) : '';
  const createdAt = contract.created_at ? fmtDate(contract.created_at) : '';
  const HUNA_LOGO = 'https://www.hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png';

  // Table-based layout — Google Docs ignores flex/grid so we use <table> for two-column rows
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #111; line-height: 1.65; margin: 0; padding: 0; }
  h1.contract-title { font-size: 20pt; font-weight: 800; color: #111; margin: 0 0 6pt; text-transform: uppercase; letter-spacing: 0.02em; }
  p.contract-subtitle { font-size: 10.5pt; font-weight: 700; margin: 0 0 14pt; color: #111; }
  h2.section-between { font-size: 14pt; font-weight: 800; margin: 20pt 0 8pt; text-transform: uppercase; }
  h2 { font-size: 13pt; font-weight: 800; margin: 20pt 0 6pt; text-transform: uppercase; color: #111; }
  h3 { font-size: 10.5pt; font-weight: 700; margin: 12pt 0 4pt; color: #111; }
  p { margin: 0 0 8pt; text-align: justify; }
  ul { margin: 4pt 0 8pt 18pt; padding: 0; }
  ul li { margin-bottom: 4pt; text-align: justify; }
  hr.section-divider { border: none; border-top: 1px solid #d1d5db; margin: 16pt 0; }
  strong.highlight { color: #D64F1E; }
</style>
</head>
<body style="margin:0;padding:28pt 52pt;">

  <!-- Letterhead: two-column table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6pt;">
    <tr>
      <td valign="top">
        <img src="${HUNA_LOGO}" alt="Huna Creatives" height="48" style="display:block;border:0;">
        <p style="font-size:9pt;color:#555;font-style:italic;margin:4pt 0 0;">Let's bring your <em>hunahuna</em> to life.</p>
      </td>
      <td valign="top" align="right" style="font-size:9pt;color:#444;line-height:1.8;">
        (032) 505 6921 | +63 952 447 2602<br>
        contact@hunacreatives.com<br>
        Cebu, Philippines, 6004
      </td>
    </tr>
  </table>

  <!-- Accent rule -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24pt;">
    <tr>
      <td width="40%" height="3" bgcolor="#D64F1E" style="font-size:0;line-height:0;">&nbsp;</td>
      <td width="60%" height="3" bgcolor="#e5e7eb" style="font-size:0;line-height:0;">&nbsp;</td>
    </tr>
  </table>

  <!-- Contract body -->
  ${contract.body}

  <!-- Signature divider -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24pt;margin-bottom:0;">
    <tr><td height="1" bgcolor="#e5e7eb" style="font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>

  <!-- Signature block: two-column table -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24pt;">
    <tr>
      <td width="48%" valign="top" style="padding-right:16pt;">
        <p style="font-size:10pt;font-weight:700;margin:0 0 2pt;"><strong>HUNA CREATIVES</strong></p>
        <p style="font-size:9pt;color:#6b7280;margin:0 0 16pt;">Service Provider</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="height:52px;">
          <tr><td height="52" valign="bottom" style="height:52px;padding:0 0 4pt;">
            <img src="${FRANCIS_SIG}" alt="Francis Fiel Roble signature" style="height:52px;width:auto;max-width:220px;display:block;border:0;">
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td height="1" bgcolor="#111111" style="font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
        <p style="font-size:8.5pt;color:#6b7280;margin:4pt 0 0;">Francis Fiel Roble &middot; ${createdAt}</p>
      </td>
      <td width="4%"></td>
      <td width="48%" valign="top">
        <p style="font-size:10pt;font-weight:700;margin:0 0 2pt;"><strong>CLIENT</strong></p>
        <p style="font-size:9pt;color:#6b7280;margin:0 0 16pt;">Authorized Representative</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="height:52px;">
          <tr><td height="52" valign="bottom" style="height:52px;padding:0 0 4pt;font-size:19pt;font-family:'Segoe Script','Bradley Hand','Brush Script MT','Snell Roundhand','Apple Chancery',cursive;color:#1f2937;line-height:1.1;white-space:nowrap;">${contract.signer_name ?? ''}</td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td height="1" bgcolor="#111111" style="font-size:0;line-height:0;">&nbsp;</td></tr>
        </table>
        <p style="font-size:8.5pt;color:#6b7280;margin:4pt 0 0;">${contract.signer_name ?? ''} &middot; ${signedAt}</p>
      </td>
    </tr>
  </table>

  <!-- Signed badge -->
  <table width="100%" cellpadding="10" cellspacing="0" border="1" bordercolor="#bbf7d0" style="margin-top:20pt;border-collapse:collapse;background-color:#f0fdf4;">
    <tr>
      <td style="font-size:9.5pt;color:#15803d;">
        &#10003; Electronically signed by <strong>${contract.signer_name ?? ''}</strong> on ${signedAt}. Valid under R.A. 8792 (Electronic Commerce Act of the Philippines).
      </td>
    </tr>
  </table>

  <p style="text-align:center;font-size:9pt;color:#9ca3af;margin-top:24pt;">Huna Creatives &middot; contact@hunacreatives.com &middot; Cebu, Philippines</p>

</body>
</html>`;
}

async function run(slug: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: contract, error: cErr } = await supabase
    .from('hub_client_contracts')
    .select('*, hub_projects(project_name, client_name, contact_email)')
    .eq('slug', slug)
    .single();

  if (cErr || !contract) { console.error('Contract not found:', cErr); return; }

  const project = (contract as any).hub_projects;
  let clientEmail = project?.contact_email;
  let clientName = project?.client_name ?? contract.signer_name ?? 'Client';
  // Contractor agreements have no project — send the signed copy to the contractor.
  if (!clientEmail && (contract as any).contractor_id) {
    const { data: hu } = await supabase.from('hub_users').select('full_name, email').eq('id', (contract as any).contractor_id).maybeSingle();
    if (hu?.email) { clientEmail = hu.email; clientName = hu.full_name ?? clientName; }
  }
  const firstName = clientName.split(' ')[0];
  const signedAt = contract.signed_at ? fmtDate(contract.signed_at) : new Date().toLocaleDateString();
  const contractUrl = `${SITE_URL}/c/${slug}`;

  const safeTitle = (contract.title ?? 'Contract').replace(/[^a-zA-Z0-9 _-]/g, '').trim();
  const pdfBytes = await generatePdf(buildContractHtml(contract), `${safeTitle} - Signed`);

  // ── Notify admin ──
  const adminHtml = `<!DOCTYPE html><html><head>
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>
  .logo-dark { display: none; }
  @media (prefers-color-scheme: dark) { .logo-light { display: none !important; } .logo-dark { display: block !important; } }
  [data-ogsc] .logo-light { display: none !important; }
  [data-ogsc] .logo-dark { display: block !important; }
</style>
</head><body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif">
<div style="max-width:520px;margin:40px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#111111;padding:24px 36px">
    <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna" height="24" class="logo-light" style="display:block;border:0">
    <img src="https://hunacreatives.com/images/547b59870e776a20eb28e4f20931787c.png" alt="Huna" height="24" class="logo-dark" style="display:none;border:0">
  </div>
  <div style="height:3px;background:linear-gradient(90deg,#16a34a,#4ade80)"></div>
  <div style="padding:32px 36px">
    <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#16a34a;margin:0 0 8px">Contract Signed</p>
    <h1 style="font-size:20px;font-weight:800;color:#111827;margin:0 0 20px">${contract.title}</h1>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin-bottom:24px">
      <p style="font-size:13px;color:#374151;margin:0 0 6px"><strong>Client:</strong> ${clientName}</p>
      <p style="font-size:13px;color:#374151;margin:0 0 6px"><strong>Signed as:</strong> ${contract.signer_name}</p>
      <p style="font-size:13px;color:#374151;margin:0 0 6px"><strong>Date:</strong> ${signedAt}</p>
      ${clientEmail ? `<p style="font-size:13px;color:#374151;margin:0"><strong>Email:</strong> ${clientEmail}</p>` : ''}
    </div>
    <a href="${contractUrl}" style="display:inline-block;padding:12px 28px;background:#111827;color:#fff;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px">View Signed Contract →</a>
  </div>
  <div style="padding:16px 36px;background:#fafafa;border-top:1px solid #f3f4f6">
    <p style="font-size:11px;color:#9ca3af;margin:0">© ${new Date().getFullYear()} Huna Creatives</p>
  </div>
</div></body></html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject: `✓ Contract signed — ${contract.title} (${clientName})`, html: adminHtml }),
  }).then(r => r.json()).then(r => console.log('Admin notified:', r.id));

  if (!clientEmail) { console.log('No client email — skipping client notification'); return; }

  // ── Send signed copy to client ──
  const clientHtml = `<!DOCTYPE html><html><head>
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>
  .logo-dark { display: none; }
  @media (prefers-color-scheme: dark) { .logo-light { display: none !important; } .logo-dark { display: block !important; } }
  [data-ogsc] .logo-light { display: none !important; }
  [data-ogsc] .logo-dark { display: block !important; }
</style>
</head><body style="margin:0;padding:0;background:#f0ede8;font-family:-apple-system,BlinkMacSystemFont,Arial,sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#111111;padding:28px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>
        <img src="https://hunacreatives.com/images/fc04818c74ad69bdfb22b93a6a0c6a72.png" alt="Huna Creatives" height="28" class="logo-light" style="display:block;border:0">
        <img src="https://hunacreatives.com/images/547b59870e776a20eb28e4f20931787c.png" alt="Huna Creatives" height="28" class="logo-dark" style="display:none;border:0">
      </td>
      <td align="right"><span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#FF6B35;border:1px solid rgba(255,107,53,0.35);padding:5px 10px">SIGNED</span></td>
    </tr></table>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,#D64F1E 0%,#ff9a72 100%)"></div>
  <div style="padding:36px 40px 32px">
    <p style="font-size:15px;font-weight:600;color:#111827;margin:0 0 16px">Hi ${firstName},</p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px">
      Thank you for signing your contract with Huna Creatives! We're excited to work with you.
      ${pdfBytes ? 'Your signed copy is attached to this email as a PDF.' : 'You can view your signed contract using the button below.'}
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 18px;margin:0 0 24px">
      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px">${contract.title}</p>
      <p style="font-size:12px;color:#6b7280;margin:0 0 4px">Signed by: <strong style="color:#374151">${contract.signer_name}</strong></p>
      <p style="font-size:12px;color:#6b7280;margin:0">Date: <strong style="color:#374151">${signedAt}</strong></p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>
      <td align="center">
        <a href="${contractUrl}" style="display:inline-block;padding:12px 32px;background:#D64F1E;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:6px">View Signed Contract</a>
      </td>
    </tr></table>
    <p style="font-size:13px;color:#374151;line-height:1.7;margin:0">If you have any questions, don't hesitate to reach out. We'll be in touch soon with next steps.</p>
  </div>
  <div style="padding:20px 40px;background:#fafafa;border-top:1px solid #f3f4f6">
    <p style="font-size:11px;color:#9ca3af;margin:0 0 4px">Questions? <a href="mailto:contact@hunacreatives.com" style="color:#9ca3af">contact@hunacreatives.com</a></p>
    <p style="font-size:11px;color:#d1d5db;margin:0">© ${new Date().getFullYear()} Huna Creatives · Cebu, Philippines</p>
  </div>
</div></body></html>`;

  const clientPayload: any = {
    from: FROM_EMAIL,
    to: clientEmail,
    reply_to: 'contact@hunacreatives.com',
    subject: `Your signed contract — ${contract.title}`,
    html: clientHtml,
  };

  if (pdfBytes) {
    let binary = '';
    for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
    clientPayload.attachments = [{ filename: `${safeTitle} - Signed.pdf`, content: btoa(binary) }];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(clientPayload),
  });
  const result = await res.json();
  if (!res.ok) console.error('Client email error:', JSON.stringify(result));
  else console.log('Client signed copy sent:', result.id, '→', clientEmail);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { slug } = await req.json();
    if (!slug) return new Response(JSON.stringify({ error: 'slug required' }), { status: 400, headers: cors });
    // @ts-ignore
    EdgeRuntime.waitUntil(run(slug));
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
