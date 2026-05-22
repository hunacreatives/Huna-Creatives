// v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const CHANNEL_ID = 'C0830PCGQK1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_HOURS_FIXED = 8; // billable cap for fixed-rate contractors (hourly contractors self-report, no cap)

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
      // Start at midnight PH — no latest filter so overnight off punches are always captured
      const dayStart = new Date(`${backfillDate}T00:00:00+08:00`);
      oldest = String(dayStart.getTime() / 1000);
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

    // Resolve overtime hours per Slack user — store with timestamp so we can bind to correct shift
    const overtimeEntries: Record<string, { ts: number; hours: number }[]> = {};

    await Promise.all(
      overtimeMessages.map(async ({ slackId, ts }) => {
        const thread = await slackGet(`conversations.replies?channel=${CHANNEL_ID}&ts=${ts}`);
        if (!thread.ok) return;
        for (const reply of thread.messages || []) {
          if (reply.ts === ts) continue;
          if (reply.user !== slackId) continue;
          const num = parseFloat((reply.text || '').trim());
          if (!isNaN(num) && num > 0) {
            if (!overtimeEntries[slackId]) overtimeEntries[slackId] = [];
            overtimeEntries[slackId].push({ ts: parseFloat(ts), hours: num });
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
    const hoursInProgress: any[] = [];

    // Collect all slackIds that punched, logged overtime, or logged hourly hours
    const allSlackIds = [...new Set([...Object.keys(userPunches), ...Object.keys(overtimeEntries), ...Object.keys(hourlyHoursBySlackId)])];

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
      // First off AFTER firstOn — prevents spanning multiple overnight shifts
      const lastOff = firstOn ? punches.find(p => p.status === 'off' && p.ts > firstOn.ts) : undefined;
      // Next "on" after firstOn — used to bound overtime to this shift only
      const nextOn = firstOn ? punches.find(p => p.status === 'on' && p.ts > firstOn.ts) : undefined;

      // Record hours under the date the shift STARTED (on punch), not when the function runs
      const shiftDate = firstOn
        ? new Date(firstOn.ts * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        : todayDate;

      // Only count overtime posted during THIS shift (after firstOn, before nextOn)
      const overtimeHoursForShift = (overtimeEntries[slackId] || [])
        .filter(e => !firstOn || (e.ts >= firstOn.ts && (!nextOn || e.ts < nextOn.ts)))
        .reduce((s, e) => s + e.hours, 0);

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

      const overtimeHours = overtimeHoursForShift;

      if (hubUser && (firstOn || overtimeHours > 0)) {
        const validLastOff = (lastOff && firstOn && lastOff.ts > firstOn.ts) ? new Date(lastOff.ts * 1000).toISOString() : null;
        const row = {
          user_id: hubUser.id,
          date: shiftDate,
          hours_raw: parseFloat(hoursRaw.toFixed(4)),
          hours_capped: parseFloat(hoursCapped.toFixed(4)),
          overtime_hours: parseFloat(overtimeHours.toFixed(2)),
          first_on: firstOn ? new Date(firstOn.ts * 1000).toISOString() : null,
          last_off: validLastOff,
          updated_at: new Date().toISOString(),
        };
        if (hoursRaw > 0 || overtimeHours > 0) {
          // Shift complete — always upsert with correct hours
          hoursUpserts.push(row);
        } else {
          // Shift in progress — only insert if no row exists yet, never overwrite completed hours
          hoursInProgress.push(row);
        }
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

    // In-progress (punched on, not off yet) — insert only, never overwrite completed hours
    if (hoursInProgress.length > 0) {
      await supabase
        .from('hub_daily_hours')
        .upsert(hoursInProgress, { onConflict: 'user_id,date', ignoreDuplicates: true });
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
