import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const CHANNEL_ID = 'C0830PCGQK1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_HOURS_FIXED = 24; // wall-clock cap for on/off punch sessions

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

async function slackGet(path: string) {
  const res = await fetch(`https://slack.com/api/${path}`, {
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check for backfill date: query param (?date=2026-05-20) or request body ({ date })
    const url = new URL(req.url);
    let backfillDate = url.searchParams.get('date');
    let slackEventText = '';

    if (req.method === 'POST') {
      try {
        const body = await req.json();

        // Slack URL verification challenge
        if (body?.type === 'url_verification') {
          return new Response(JSON.stringify({ challenge: body.challenge }), { headers: cors });
        }

        // Slack event callback — only process message events with "off" text
        if (body?.type === 'event_callback') {
          slackEventText = (body?.event?.text || '').trim().toLowerCase();
          // Only run full sync when someone types "on" or "off"
          if (slackEventText !== 'on' && slackEventText !== 'off') {
            return new Response(JSON.stringify({ ok: true }), { headers: cors });
          }
        }

        if (body?.date) backfillDate = body.date;
      } catch { /* no body */ }
    }

    const phOffset = 8 * 60;
    const now = new Date();
    const phNow = new Date(now.getTime() + phOffset * 60 * 1000);
    const todayDate = backfillDate ?? phNow.toISOString().split('T')[0];

    let oldest: string;
    let latest: string | null = null;

    if (backfillDate) {
      // Start at midnight PH, end at noon next day — covers overnight shifts
      const dayStart = new Date(`${backfillDate}T00:00:00+08:00`);
      const dayEndOvernight = new Date(`${backfillDate}T00:00:00+08:00`);
      dayEndOvernight.setDate(dayEndOvernight.getDate() + 1);
      dayEndOvernight.setHours(dayEndOvernight.getHours() + 12); // noon next day PH
      oldest = String(dayStart.getTime() / 1000);
      latest = String(dayEndOvernight.getTime() / 1000);
    } else {
      // Rolling 18h window for live mode
      const windowStart = new Date(now.getTime() - 18 * 60 * 60 * 1000);
      oldest = String(windowStart.getTime() / 1000);
    }

    // Fetch messages
    const slack = await slackGet(
      `conversations.history?channel=${CHANNEL_ID}&oldest=${oldest}${latest ? `&latest=${latest}` : ''}&limit=500`
    );

    if (!slack.ok) {
      return new Response(JSON.stringify({ error: slack.error }), { status: 400, headers: cors });
    }

    const messages = [...(slack.messages || [])].reverse();

    // Per user: on/off punches
    const userPunches: Record<string, { status: 'on' | 'off'; ts: number }[]> = {};

    // Per user: overtime messages (messages that start with "overtime" and have replies)
    const overtimeMessages: { slackId: string; ts: string }[] = [];

    // Per user: "on" messages with thread replies (hourly contractors log hours in thread)
    const hourlyOnMessages: { slackId: string; ts: string }[] = [];

    for (const msg of messages) {
      const text = (msg.text || '').trim().toLowerCase();

      if ((text === 'on' || text === 'off') && msg.user) {
        if (!userPunches[msg.user]) userPunches[msg.user] = [];
        userPunches[msg.user].push({ status: text as 'on' | 'off', ts: parseFloat(msg.ts) });

        // Track "on" messages with replies — used for hourly hour logging
        if (text === 'on' && msg.reply_count > 0) {
          hourlyOnMessages.push({ slackId: msg.user, ts: msg.ts });
        }
      }

      // Detect "Overtime" posts that have at least one thread reply
      if (text.startsWith('overtime') && msg.user && msg.reply_count > 0) {
        overtimeMessages.push({ slackId: msg.user, ts: msg.ts });
      }
    }

    // Resolve overtime hours per Slack user by reading thread replies
    const overtimeBySlackId: Record<string, number> = {};

    await Promise.all(
      overtimeMessages.map(async ({ slackId, ts }) => {
        const thread = await slackGet(`conversations.replies?channel=${CHANNEL_ID}&ts=${ts}`);
        if (!thread.ok) return;
        for (const reply of thread.messages || []) {
          if (reply.ts === ts) continue; // skip parent
          if (reply.user !== slackId) continue;
          const num = parseFloat((reply.text || '').trim());
          if (!isNaN(num) && num > 0) {
            overtimeBySlackId[slackId] = (overtimeBySlackId[slackId] || 0) + num;
            break;
          }
        }
      })
    );

    // Resolve hourly hours from "on" thread replies (hourly contractors type hours in thread)
    const hourlyHoursBySlackId: Record<string, number> = {};

    await Promise.all(
      hourlyOnMessages.map(async ({ slackId, ts }) => {
        const thread = await slackGet(`conversations.replies?channel=${CHANNEL_ID}&ts=${ts}`);
        if (!thread.ok) return;
        for (const reply of thread.messages || []) {
          if (reply.ts === ts) continue; // skip parent
          if (reply.user !== slackId) continue;
          const num = parseFloat((reply.text || '').trim());
          if (!isNaN(num) && num > 0) {
            hourlyHoursBySlackId[slackId] = num;
            break; // use the first numeric reply
          }
        }
      })
    );

    // Get all active contractors
    const { data: contractors } = await supabase
      .from('hub_users')
      .select('id, full_name, avatar_url, department, email, status, slack_username, payment_type')
      .eq('status', 'active');

    const emailMap: Record<string, any> = {};
    const slackUsernameMap: Record<string, any> = {};
    for (const c of contractors || []) {
      emailMap[c.email?.toLowerCase()] = c;
      if (c.slack_username) slackUsernameMap[c.slack_username.toLowerCase().replace(/^@/, '')] = c;
    }

    // Resolve Slack user info (email + display name)
    const slackIds = [...new Set([...Object.keys(userPunches), ...Object.keys(overtimeBySlackId), ...Object.keys(hourlyHoursBySlackId)])];
    const slackEmailMap: Record<string, string> = {};
    const slackDisplayNameMap: Record<string, string> = {};

    await Promise.all(
      slackIds.map(async (slackId) => {
        const info = await slackGet(`users.info?user=${slackId}`);
        if (info.ok) {
          const email = info.user?.profile?.email;
          if (email) slackEmailMap[slackId] = email.toLowerCase();
          const display = (info.user?.profile?.display_name || info.user?.profile?.real_name || '').toLowerCase().replace(/^@/, '');
          if (display) slackDisplayNameMap[slackId] = display;
        }
      })
    );

    // Build attendance result + persist hours
    const punchedEmails = new Set<string>();
    const attendance: any[] = [];
    const hoursUpserts: any[] = [];

    // Collect all slackIds that punched, logged overtime, or logged hourly hours
    const allSlackIds = [...new Set([...Object.keys(userPunches), ...Object.keys(overtimeBySlackId), ...Object.keys(hourlyHoursBySlackId)])];

    for (const slackId of allSlackIds) {
      const punches = userPunches[slackId] || [];
      const email = slackEmailMap[slackId];
      // Match by email first, then fall back to Slack display name vs slack_username
      const displayName = slackDisplayNameMap[slackId];
      const hubUser = (email ? emailMap[email] : null) ?? (displayName ? slackUsernameMap[displayName] : null);
      if (hubUser?.email) punchedEmails.add(hubUser.email);
      else if (email) punchedEmails.add(email);

      const latestPunch = punches[punches.length - 1];
      const status = latestPunch?.status ?? 'absent';

      const punchList = punches.map((p) => ({
        status: p.status,
        time: new Date(p.ts * 1000).toISOString(),
      }));

      const firstOn = punches.find(p => p.status === 'on');
      const lastOff = [...punches].reverse().find(p => p.status === 'off');

      const isHourly = hubUser?.payment_type === 'hourly';
      const threadHours = hourlyHoursBySlackId[slackId];

      let hoursRaw = 0;
      let hoursCapped = 0;
      let effectiveStatus = status;

      if (isHourly && threadHours != null) {
        // Hourly contractors self-report hours — no cap, trust their input
        hoursRaw = threadHours;
        hoursCapped = threadHours;
        effectiveStatus = 'off';
      } else if (firstOn && lastOff && lastOff.ts > firstOn.ts) {
        // Standard on/off punch — cap wall-clock duration
        hoursRaw = (lastOff.ts - firstOn.ts) / 3600;
        hoursCapped = Math.min(hoursRaw, MAX_HOURS_FIXED);
      } else if (!isHourly && threadHours != null && firstOn) {
        // Fixed contractor thread hours
        hoursRaw = threadHours;
        hoursCapped = Math.min(threadHours, MAX_HOURS_FIXED);
        effectiveStatus = 'off';
      }

      const overtimeHours = overtimeBySlackId[slackId] || 0;

      if (hubUser && (hoursRaw > 0 || overtimeHours > 0)) {
        hoursUpserts.push({
          user_id: hubUser.id,
          date: todayDate,
          hours_raw: parseFloat(hoursRaw.toFixed(4)),
          hours_capped: parseFloat(hoursCapped.toFixed(4)),
          overtime_hours: parseFloat(overtimeHours.toFixed(2)),
          first_on: firstOn ? new Date(firstOn.ts * 1000).toISOString() : null,
          last_off: lastOff ? new Date(lastOff.ts * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        });
      }

      if (latestPunch) {
        attendance.push({
          hub_user_id: hubUser?.id || null,
          email: email || null,
          full_name: hubUser?.full_name || `Slack user (${slackId})`,
          avatar_url: hubUser?.avatar_url || null,
          department: hubUser?.department || null,
          status: effectiveStatus,
          last_punch: new Date(latestPunch.ts * 1000).toISOString(),
          punches: punchList,
          hours_today: parseFloat(hoursCapped.toFixed(2)),
          overtime_today: parseFloat(overtimeHours.toFixed(2)),
        });
      }
    }

    // Upsert daily hours
    if (hoursUpserts.length > 0) {
      await supabase
        .from('hub_daily_hours')
        .upsert(hoursUpserts, { onConflict: 'user_id,date' });
    }

    // Add absent contractors
    for (const c of contractors || []) {
      if (!punchedEmails.has(c.email)) {
        attendance.push({
          hub_user_id: c.id,
          email: c.email,
          full_name: c.full_name,
          avatar_url: c.avatar_url,
          department: c.department,
          status: 'absent',
          last_punch: null,
          punches: [],
          hours_today: 0,
          overtime_today: 0,
        });
      }
    }

    const order: Record<string, number> = { on: 0, off: 1, absent: 2 };
    attendance.sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));

    return new Response(JSON.stringify({ attendance }), { headers: cors });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: cors });
  }
});
