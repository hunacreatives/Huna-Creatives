// Data for Chris's password-protected SmartGrid dashboard. The password lives
// only in the SMARTGRID_DASHBOARD_PASSWORD secret and is checked here, so
// nothing is returned without it. Only client-safe fields leave this function:
// no commissions, no queue/lock internals, notes only where there's a result.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  { auth: { persistSession: false } },
);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-dashboard-password, authorization, apikey, x-client-info",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function passwordMatches(given: string, expected: string) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function fetchAll(build: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

function clientStatus(l: any): string {
  if (l.status === "complete") return "Complete";
  if (l.status === "attempted") return "Out of attempts";
  if (l.status === "callback_pending") return "Callback scheduled";
  return l.last_worked_at ? "Called – will retry" : "Not called yet";
}

const RESULT_OUTCOMES = new Set(["interested", "callback"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("SMARTGRID_DASHBOARD_PASSWORD");
  if (!expected) return json({ error: "Dashboard is not configured" }, 503);
  const given = req.headers.get("x-dashboard-password") || "";
  if (!given || !(await passwordMatches(given, expected))) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "Incorrect password" }, 401);
  }

  try {
    const { data: projects, error: projErr } = await supabase
      .from("hub_projects").select("id").eq("project_name", "SmartGrid Western").limit(1);
    if (projErr || !projects?.length) throw new Error("SmartGrid Western project not found");
    const projectId = projects[0].id;

    const [leads, activity, callerRes, incentives] = await Promise.all([
      fetchAll((from, to) =>
        supabase.from("hub_project_leads")
          .select("id, account_name, primary_contact, phone, email, status, attempts_count, callback_date, callback_time, next_call_goal, meeting_scheduled, meeting_scheduled_at, bill_received, bill_received_at, email_reply_received, email_reply_received_at, last_worked_at, last_caller_id, call_notes")
          .eq("project_id", projectId).order("id").range(from, to)),
      fetchAll((from, to) =>
        supabase.from("hub_project_activity")
          .select("id, entity_id, user_id, created_at, meta")
          .eq("project_id", projectId).eq("action", "lead_outcome_logged").order("id").range(from, to)),
      supabase.from("hub_project_contractors")
        .select("hub_users(id, full_name)").eq("project_id", projectId).eq("project_role", "Cold Caller"),
      // What SmartGrid owes Huna per result. Caller pay is separate and never sent here.
      fetchAll((from, to) =>
        supabase.from("hub_project_commissions")
          .select("id, lead_id, milestone, amount, created_at, paid, paid_at")
          // Billable results only; old 'email' rows (address captured) were never billable
          .eq("project_id", projectId).in("milestone", ["reply", "meeting", "bill"]).order("id").range(from, to)),
    ]);
    if (callerRes.error) throw callerRes.error;

    const callers = ((callerRes.data || []) as any[])
      .map((r) => r.hub_users).filter(Boolean)
      .map((u: any) => ({ id: u.id as string, name: u.full_name as string }));

    const hasResult = (l: any) =>
      !!l.email || l.meeting_scheduled || l.bill_received || l.status === "callback_pending";

    const accountById = new Map(leads.map((l) => [l.id, l.account_name]));

    return json({
      generatedAt: new Date().toISOString(),
      incentives: incentives.map((c) => ({
        id: c.id,
        account: accountById.get(c.lead_id) || "(removed)",
        milestone: c.milestone,
        amount: Number(c.amount),
        at: c.created_at,
        paid: !!c.paid,
        paidAt: c.paid_at,
      })),
      callers,
      calls: activity
        .filter((a) => a.user_id && a.meta?.outcome && a.meta.outcome !== "skip")
        .map((a) => ({
          id: a.id,
          leadId: String(a.entity_id),
          callerId: a.user_id,
          at: a.created_at,
          outcome: a.meta.outcome,
          emailFound: !!a.meta.email_found,
          notes: RESULT_OUTCOMES.has(a.meta.outcome) || a.meta.email_found ? a.meta.notes || null : null,
        })),
      leads: leads.map((l) => ({
        id: l.id,
        account: l.account_name,
        contact: l.primary_contact,
        phone: l.phone,
        email: l.email,
        status: clientStatus(l),
        attempts: l.attempts_count,
        callbackDate: l.status === "callback_pending" ? l.callback_date : null,
        callbackTime: l.status === "callback_pending" ? l.callback_time : null,
        nextGoal: l.status === "callback_pending" ? l.next_call_goal : null,
        meetingBooked: !!l.meeting_scheduled,
        meetingAt: l.meeting_scheduled_at,
        billReceived: !!l.bill_received,
        billAt: l.bill_received_at,
        replied: !!l.email_reply_received,
        repliedAt: l.email_reply_received_at,
        lastCallerId: l.last_caller_id,
        lastCalledAt: l.last_worked_at,
        notes: hasResult(l) ? l.call_notes : null,
      })),
    });
  } catch (err) {
    console.error("smartgrid-client-dashboard error:", err);
    return json({ error: "Could not load dashboard data" }, 500);
  }
});
