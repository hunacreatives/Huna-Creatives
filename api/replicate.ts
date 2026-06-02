import type { VercelRequest, VercelResponse } from '@vercel/node';

const REPLICATE_API = 'https://api.replicate.com/v1';
const API_KEY = process.env.REPLICATE_API_KEY || process.env.VITE_REPLICATE_API_KEY || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function applyCors(res: VercelResponse) {
  Object.entries(CORS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Preflight
  if (req.method === 'OPTIONS') {
    applyCors(res);
    return res.status(200).end();
  }

  if (!API_KEY) {
    applyCors(res);
    return res.status(500).json({ error: 'REPLICATE_API_KEY not set in Vercel environment variables' });
  }

  const { path } = req.query;
  if (!path) {
    applyCors(res);
    return res.status(400).json({ error: 'Missing path' });
  }

  const upstreamPath = Array.isArray(path) ? path.join('/') : path;
  const url = `${REPLICATE_API}/${upstreamPath}`;

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    const data = await upstream.json();
    applyCors(res);
    return res.status(upstream.status).json(data);
  } catch (err) {
    applyCors(res);
    return res.status(500).json({ error: String(err) });
  }
}
