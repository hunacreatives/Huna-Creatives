import http from 'http';
import { exec } from 'child_process';

const CLIENT_ID     = process.argv[2];
const CLIENT_SECRET = process.argv[3];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Usage: node get-refresh-token.mjs YOUR_CLIENT_ID YOUR_CLIENT_SECRET');
  process.exit(1);
}

const REDIRECT = 'http://localhost:3333';
const SCOPE    = 'https://www.googleapis.com/auth/drive';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

console.log('\nOpening browser...\n');
exec(`open "${authUrl}"`);

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) { res.end('No code'); return; }

  res.end('<h2>Got it! Check your terminal.</h2>');
  server.close();

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
  });

  const data = await tokenRes.json();
  if (data.refresh_token) {
    console.log('\n✅ SUCCESS\n');
    console.log('GOOGLE_REFRESH_TOKEN =', data.refresh_token);
    console.log('\nPaste this into Supabase secrets.\n');
  } else {
    console.log('\n❌ Failed:', JSON.stringify(data, null, 2));
  }
});

server.listen(3333, () => console.log('Waiting for Google callback on http://localhost:3333 ...'));
