import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HUB_URL = 'https://www.hunacreatives.com/hub/admin/attendance';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function sendPush(user_id: string, title: string, body: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, title, body, url: HUB_URL }),
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const payload = await req.json();

    // Supabase webhook sends { type, table, record, old_record }
    const record = payload.record;
    const oldRecord = payload.old_record;
    const eventType = payload.type; // INSERT or UPDATE

    if (!record?.user_id) return new Response('no user_id', { headers: cors });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get contractor name
    const { data: user } = await supabase
      .from('hub_users')
      .select('full_name')
      .eq('id', record.user_id)
      .single();

    const name = user?.full_name ?? 'Someone';

    let title: string;
    let body: string;

    if (eventType === 'INSERT') {
      title = `${name} clocked in`;
      body = 'Now in the office';
    } else if (eventType === 'UPDATE' && record.last_off && !oldRecord?.last_off) {
      const hours = record.hours_raw ? parseFloat(record.hours_raw).toFixed(1) : '?';
      title = `${name} clocked out`;
      body = `Logged ${hours}h today`;
    } else {
      return new Response('no push needed', { headers: cors });
    }

    // Send push to all owners and admins
    const { data: admins } = await supabase
      .from('hub_users')
      .select('id')
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .neq('id', record.user_id);

    await Promise.all((admins ?? []).map(a => sendPush(a.id, title, body)));

    return new Response(JSON.stringify({ sent: (admins ?? []).length }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
