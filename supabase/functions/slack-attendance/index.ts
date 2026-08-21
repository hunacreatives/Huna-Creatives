// v3 — overtime comes from hub_overtime_requests (approved), not Slack parsing
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCaller, adminClient, authErrorResponse } from '../_shared/requireCaller.ts';

const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN');
const CHANNEL_ID = 'C0830PCGQK1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MAX_HOURS_FIXED = 8; // billable cap for fixed-rate contractors

const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
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

  // Contractor-facing: any signed-in hub user, but never the bare anon key.
  try { await getCaller(req, adminClient()); }
  catch (e) { const r = authErrorResponse(e, cors); if (r) return r; throw e; }
  if (!SLACK_BOT_TOKEN) return new Response(JSON.stringify({ error: 'SLACK_BOT_TOKEN not configured' }), { status: 500, headers: cors });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check for backfill date: query param (?date=2026-05-20) or request body ({ date })
    const url = new URL(req.url);
    let backfillDate = url.searchParams.get('date');
    let slackEventText = '';

    if (req.method === 'POST') {
      try {
        const body = await req.json();

        if (body?.type === 'url_verification') {
          return new Response(JSON.stringify({ challenge: body.challenge }), { headers: cors });
        }

        if (body?.type === 'event_callback') {
          slackEventText = (body?.event?.text || '').trim().toLowerCase();
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
      // midnight PH to 36h later — covers overnight shifts (11 PM on) and their 7 AM off next day
      const dayStart = new Date(`${backfillDate}T00:00:00+08:00`);
      const dayEnd = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000);
      oldest = String(dayStart.getTime() / 1000);
      latest = String(dayEnd.getTime() / 1000);
    } else {
      // Rolling 18h window for live mode
      const windowStart = new Date(now.getTime() - 18 * 60 * 60 * 1000);
      oldest = String(windowStart.getTime() / 1000);
    }

    // Fetch messages — only care about on/off punches now
    const slack = await slackGet(
      `conversations.history?channel=${CHANNEL_ID}&oldest=${oldest}${latest ? `&latest=${latest}` : ''}&limit=500`
    );

    if (!slack.ok) {
      return new Response(JSON.stringify({ error: slack.error }), { status: 400, headers: cors });
    }

    const messages = [...(slack.messages || [])].reverse();

    const userPunches: Record<string, { status: 'on' | 'off'; ts: number }[]> = {};
    const hourlyOnMessages: { slackId: string; ts: string }[] = [];

    for (const msg of messages) {
      const text = (msg.text || '').trim().toLowerCase();

      if ((text === 'on' || text === 'off') && msg.user) {
        if (!userPunches[msg.user]) userPunches[msg.user] = [];
        userPunches[msg.user].push({ status: text as 'on' | 'off', ts: parseFloat(msg.ts) });

        if (text === 'on' && msg.reply_count > 0) {
          hourlyOnMessages.push({ slackId: msg.user, ts: msg.ts });
        }
      }
      // No overtime parsing from Slack — OT comes from hub_overtime_requests
    }

    // Resolve hourly hours from "on" thread replies
    const hourlyHoursByTs: Record<number, number> = {};

    await Promise.all(
      hourlyOnMessages.map(async ({ slackId, ts }) => {
        const thread = await slackGet(`conversations.replies?channel=${CHANNEL_ID}&ts=${ts}`);
        if (!thread.ok) return;
        for (const reply of thread.messages || []) {
          if (reply.ts === ts) continue;
          if (reply.user !== slackId) continue;
          const num = parseFloat((reply.text || '').trim());
          if (!isNaN(num) && num > 0) {
            hourlyHoursByTs[parseFloat(ts)] = num;
            break;
          }
        }
      })
    );

    // Get all active contractors
    const { data: contractors } = await supabase
      .from('hub_users')
      .select('id, full_name, avatar_url, department, email, status, slack_id, slack_username, payment_type, shift_start')
      .eq('status', 'active');

    const slackIdMap: Record<string, any> = {};
    const emailMap: Record<string, any> = {};
    const slackUsernameMap: Record<string, any> = {};
    for (const c of contractors || []) {
      if (c.slack_id) slackIdMap[c.slack_id] = c;
      emailMap[c.email?.toLowerCase()] = c;
      if (c.slack_username) slackUsernameMap[c.slack_username.toLowerCase().replace(/^@/, '')] = c;
    }

    const slackIds = [...new Set(Object.keys(userPunches))];
    const slackEmailMap: Record<string, string> = {};
    const slackDisplayNameMap: Record<string, string> = {};

    // Only need the Slack profile lookup as a fallback for users not already
    // matched directly by slack_id — slack_id is the reliable key since it
    // doesn't depend on Slack's users:read.email scope or email matching
    // hub_users.email exactly (email/display-name matching has silently
    // dropped punches before — see Angela slack_username fix).
    const unmatchedSlackIds = slackIds.filter((slackId) => !slackIdMap[slackId]);

    await Promise.all(
      unmatchedSlackIds.map(async (slackId) => {
        const info = await slackGet(`users.info?user=${slackId}`);
        if (info.ok) {
          const email = info.user?.profile?.email;
          if (email) slackEmailMap[slackId] = email.toLowerCase();
          const display = (info.user?.profile?.display_name || info.user?.profile?.real_name || '').toLowerCase().replace(/^@/, '');
          if (display) slackDisplayNameMap[slackId] = display;
        }
      })
    );

    const punchedEmails = new Set<string>();
    const attendance: any[] = [];
    const hoursUpserts: any[] = [];
    const hoursInProgress: any[] = [];

    for (const slackId of slackIds) {
      const punches = userPunches[slackId] || [];
      const email = slackEmailMap[slackId];
      const displayName = slackDisplayNameMap[slackId];
      const hubUser = slackIdMap[slackId] ?? (email ? emailMap[email] : null) ?? (displayName ? slackUsernameMap[displayName] : null);
      if (hubUser?.email) punchedEmails.add(hubUser.email);
      else if (email) punchedEmails.add(email);

      const latestPunch = punches[punches.length - 1];

      const punchList = punches.map((p) => ({
        status: p.status,
        time: new Date(p.ts * 1000).toISOString(),
      }));

      // Pair punches into discrete on/off shifts. A query window can contain
      // more than one shift for the same person (split shifts, or an early
      // stray punch) — treating the whole window as a single first-on→last-off
      // span silently merges separate shifts and misattributes hours to the
      // wrong calendar date (e.g. an 8am-off gets bridged all the way to an
      // 11pm-on the same day, then the combined span gets stamped onto
      // whichever day the *first* on-punch happened to fall on).
      const shifts: { on: { status: 'on'; ts: number }; off?: { status: 'off'; ts: number } }[] = [];
      let openOn: { status: 'on'; ts: number } | null = null;
      for (const p of punches) {
        if (p.status === 'on') {
          if (openOn) shifts.push({ on: openOn });
          openOn = p;
        } else if (p.status === 'off' && openOn) {
          shifts.push({ on: openOn, off: p });
          openOn = null;
        }
      }
      if (openOn) shifts.push({ on: openOn });

      const isHourly = hubUser?.payment_type === 'hourly';

      const shiftDateFor = (onTs: number) => {
        const punchMs = onTs * 1000;
        const punchDate = new Date(punchMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        const punchHour = parseInt(new Date(punchMs).toLocaleString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', hour12: false }));
        const shiftStartHour = hubUser?.shift_start ? parseInt(hubUser.shift_start.split(':')[0]) : null;
        // Overnight shift: starts at/after 8 PM, and punch-in is before noon → previous day
        if (shiftStartHour !== null && shiftStartHour >= 20 && punchHour < 12) {
          const prev = new Date(punchMs - 24 * 60 * 60 * 1000);
          return prev.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
        }
        return punchDate;
      };

      // Aggregate each shift's hours under its own date, in case two shifts
      // in the window land on different calendar days.
      const dateAgg: Record<string, { hoursRaw: number; hoursCapped: number; firstOn: number; lastOff: number | null }> = {};

      for (const shift of shifts) {
        const date = shiftDateFor(shift.on.ts);
        const threadHours = hourlyHoursByTs[shift.on.ts];

        let hoursRaw = 0;
        let hoursCapped = 0;

        if (isHourly && threadHours != null) {
          hoursRaw = threadHours;
          hoursCapped = threadHours;
        } else if (shift.off && shift.off.ts > shift.on.ts) {
          hoursRaw = (shift.off.ts - shift.on.ts) / 3600;
          hoursCapped = Math.min(hoursRaw, MAX_HOURS_FIXED);
        } else if (!isHourly && threadHours != null) {
          hoursRaw = threadHours;
          hoursCapped = Math.min(threadHours, MAX_HOURS_FIXED);
        }

        if (!dateAgg[date]) {
          dateAgg[date] = { hoursRaw: 0, hoursCapped: 0, firstOn: shift.on.ts, lastOff: shift.off?.ts ?? null };
        }
        const agg = dateAgg[date];
        agg.hoursRaw += hoursRaw;
        agg.hoursCapped += hoursCapped;
        agg.firstOn = Math.min(agg.firstOn, shift.on.ts);
        if (shift.off) agg.lastOff = agg.lastOff !== null ? Math.max(agg.lastOff, shift.off.ts) : shift.off.ts;
      }

      // Fixed-rate billable cap applies per day, not per shift.
      if (!isHourly) {
        for (const agg of Object.values(dateAgg)) {
          agg.hoursCapped = Math.min(agg.hoursCapped, MAX_HOURS_FIXED);
        }
      }

      // overtime_hours is NOT set here — it is written when admin approves hub_overtime_requests
      if (hubUser) {
        for (const [date, agg] of Object.entries(dateAgg)) {
          const row = {
            user_id: hubUser.id,
            date,
            hours_raw: parseFloat(agg.hoursRaw.toFixed(2)),
            hours_capped: parseFloat(agg.hoursCapped.toFixed(2)),
            first_on: new Date(agg.firstOn * 1000).toISOString(),
            last_off: agg.lastOff !== null ? new Date(agg.lastOff * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          };
          if (agg.hoursRaw > 0) {
            hoursUpserts.push(row);
          } else {
            hoursInProgress.push(row);
          }
        }
      }

      // Live summary row reflects the most recent shift for this user
      const lastShift = shifts[shifts.length - 1];
      const lastShiftDate = lastShift ? shiftDateFor(lastShift.on.ts) : todayDate;
      const lastShiftAgg = dateAgg[lastShiftDate];
      let effectiveStatus = latestPunch?.status ?? 'absent';
      if (lastShift && !lastShift.off && hourlyHoursByTs[lastShift.on.ts] != null) effectiveStatus = 'off';

      if (latestPunch) {
        attendance.push({
          hub_user_id: hubUser?.id || null,
          email: email || null,
          full_name: hubUser?.full_name || `Slack user (${slackId})`,
          avatar_url: hubUser?.avatar_url || null,
          department: hubUser?.department || null,
          shift_date: lastShiftDate,
          status: effectiveStatus,
          last_punch: new Date(latestPunch.ts * 1000).toISOString(),
          punches: punchList,
          hours_today: parseFloat((lastShiftAgg?.hoursCapped ?? 0).toFixed(2)),
          overtime_today: 0,
        });
      }
    }

    // Upsert daily hours — do NOT touch overtime_hours column (managed by OT approval flow)
    // Also never overwrite rows that were manually edited by an admin (is_manual = true)
    if (hoursUpserts.length > 0) {
      const userDatePairs = hoursUpserts.map((r: any) => `(user_id.eq.${r.user_id},date.eq.${r.date})`);
      const { data: manualRows } = await supabase
        .from('hub_daily_hours')
        .select('user_id, date')
        .eq('is_manual', true)
        .or(userDatePairs.join(','));
      const manualSet = new Set((manualRows || []).map((r: any) => `${r.user_id}::${r.date}`));
      const safeUpserts = hoursUpserts.filter((r: any) => !manualSet.has(`${r.user_id}::${r.date}`));
      if (safeUpserts.length > 0) {
        await supabase
          .from('hub_daily_hours')
          .upsert(safeUpserts, { onConflict: 'user_id,date' });
      }
    }

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
          shift_date: null,
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
