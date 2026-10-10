import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

interface Lead {
  id: string;
  project_id: number;
  assigned_to: string | null;
  attempts_count: number;
  status: string;
  locked_by: string | null;
  locked_at: string | null;
}

interface Contractor {
  id: string;
  full_name: string;
}

export async function processSmartGridQueue() {
  console.log("[SmartGrid Queue] Processing started");

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
    console.log(`[SmartGrid Queue] Processing project ${projectId}`);

    // Get all contractors for the project
    const { data: contractors, error: contractorErr } = await supabase
      .from("hub_project_contractors")
      .select("hub_users(id, full_name)")
      .eq("project_id", projectId)
      .eq("project_role", "Cold Caller");

    if (contractorErr) throw contractorErr;

    const contractorList: Contractor[] = (contractors || [])
      .map((pc: any) => pc.hub_users)
      .filter(Boolean);

    if (contractorList.length === 0) {
      console.log("[SmartGrid Queue] No contractors found");
      return { success: true, message: "No contractors found" };
    }

    console.log(
      `[SmartGrid Queue] Found ${contractorList.length} contractors`
    );
    const callerIds = contractorList.map((c) => c.id);

    // 1. Release leads a caller has held for 2+ days without calling (missed
    //    shifts). Their callbacks stay theirs; the rest go back to the shared pool.
    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data: staleCallbacks, error: staleCbErr } = await supabase
      .from("hub_project_leads")
      .update({ locked_by: null, locked_at: null, status: "callback_pending" })
      .eq("project_id", projectId)
      .not("locked_by", "is", null)
      .lt("locked_at", cutoff)
      .eq("outcome", "callback")
      .not("callback_date", "is", null)
      .select("id");
    if (staleCbErr) throw staleCbErr;

    const { data: staleOthers, error: staleErr } = await supabase
      .from("hub_project_leads")
      .update({ locked_by: null, locked_at: null, status: "new", assigned_to: null })
      .eq("project_id", projectId)
      .not("locked_by", "is", null)
      .lt("locked_at", cutoff)
      .select("id");
    if (staleErr) throw staleErr;

    const staleLocks = [...(staleCallbacks || []), ...(staleOthers || [])];
    if (staleLocks.length > 0) {
      console.log(`[SmartGrid Queue] Released ${staleLocks.length} leads held 2+ days`);
    }

    // 2. Reassign: if a lead has 3+ attempts and is assigned, move to other caller
    const { data: overAttemptedLeads, error: overErr } = await supabase
      .from("hub_project_leads")
      .select("id, assigned_to, attempts_count")
      .eq("project_id", projectId)
      .in("status", ["calling", "new"])
      .is("retired_at", null)
      .gte("attempts_count", 3)
      .lt("attempts_count", 6);

    if (overErr) throw overErr;

    if (overAttemptedLeads && overAttemptedLeads.length > 0) {
      console.log(
        `[SmartGrid Queue] Reassigning ${overAttemptedLeads.length} leads (3-5 attempts)`
      );

      for (const lead of overAttemptedLeads) {
        if (!lead.assigned_to) continue; // Skip unassigned

        // Find the other caller
        const otherCallerId = callerIds.find((id) => id !== lead.assigned_to);
        if (!otherCallerId) continue;

        const { error: reassignErr } = await supabase
          .from("hub_project_leads")
          .update({
            assigned_to: otherCallerId,
            locked_by: null,
            status: "new",
          })
          .eq("id", lead.id);

        if (reassignErr) {
          console.error(`[SmartGrid Queue] Error reassigning lead ${lead.id}:`, reassignErr);
        }
      }
    }

    // 3. Park: mark leads with 6+ attempts as 'attempted'
    const { data: maxAttemptLeads, error: maxErr } = await supabase
      .from("hub_project_leads")
      .select("id")
      .eq("project_id", projectId)
      .gte("attempts_count", 6)
      .neq("status", "attempted");

    if (maxErr) throw maxErr;

    if (maxAttemptLeads && maxAttemptLeads.length > 0) {
      console.log(
        `[SmartGrid Queue] Parking ${maxAttemptLeads.length} leads (6+ attempts)`
      );
      const { error: parkErr } = await supabase
        .from("hub_project_leads")
        .update({ status: "attempted", locked_by: null })
        .eq("project_id", projectId)
        .gte("attempts_count", 6)
        .neq("status", "attempted");

      if (parkErr) {
        console.error("[SmartGrid Queue] Error parking leads:", parkErr);
      }
    }

    console.log("[SmartGrid Queue] Processing completed successfully");
    return {
      success: true,
      message: "Queue processing completed",
      staleLocks: staleLocks?.length || 0,
      reassigned: overAttemptedLeads?.length || 0,
      parked: maxAttemptLeads?.length || 0,
    };
  } catch (err) {
    console.error("[SmartGrid Queue] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Basic auth check (GitHub Actions will send a secret in header)
  const authHeader = req.headers.get("authorization");
  const expectedSecret = Deno.env.get("CRON_SECRET");

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await processSmartGridQueue();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});
