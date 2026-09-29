import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function getSmartGridLeads() {
  try {
    // Find SmartGrid Western project
    const { data: projects, error: projErr } = await supabase
      .from("hub_projects")
      .select("id")
      .eq("project_name", "SmartGrid Western")
      .limit(1);

    if (projErr || !projects || projects.length === 0) {
      throw new Error("SmartGrid Western project not found");
    }

    const projectId = projects[0].id;

    // Get all leads with basic info
    const { data: leads, error: leadsErr } = await supabase
      .from("hub_project_leads")
      .select(
        "id, account_name, phone, email, primary_contact, status, outcome, assigned_to, attempts_count, callback_date, callback_time, created_at"
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (leadsErr) throw leadsErr;

    return leads || [];
  } catch (err) {
    console.error("Error getting leads:", err);
    throw err;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "OPTIONS") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const leads = await getSmartGridLeads();
    return new Response(JSON.stringify(leads), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch leads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
