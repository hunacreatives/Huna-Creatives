#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  try {
    // Get project ID
    const { data: projects, error: projErr } = await supabase
      .from('hub_projects')
      .select('id')
      .eq('project_name', 'SmartGrid Western')
      .limit(1);

    if (projErr || !projects || !projects[0]) {
      console.error('Project not found');
      process.exit(1);
    }

    const projectId = projects[0].id;

    // Get Kirk and Venice user IDs
    const { data: users, error: userErr } = await supabase
      .from('hub_users')
      .select('id, full_name')
      .in('full_name', ['Kirk Vega', 'Venice Buot']);

    if (userErr) {
      console.error('Error fetching users:', userErr);
      process.exit(1);
    }

    const kirk = users.find(u => u.full_name === 'Kirk Vega');
    const venice = users.find(u => u.full_name === 'Venice Buot');

    if (!kirk || !venice) {
      console.error('Kirk Vega or Venice Buot not found in database');
      process.exit(1);
    }

    console.log(`Found Kirk (${kirk.id}) and Venice (${venice.id})`);

    // Get first 60 unassigned leads
    const { data: leads, error: leadsErr } = await supabase
      .from('hub_project_leads')
      .select('id')
      .eq('project_id', projectId)
      .is('assigned_to', null)
      .order('created_at', { ascending: true })
      .limit(60);

    if (leadsErr) {
      console.error('Error fetching leads:', leadsErr);
      process.exit(1);
    }

    if (!leads || leads.length < 60) {
      console.error(`Not enough unassigned leads. Found: ${leads?.length || 0}, need: 60`);
      process.exit(1);
    }

    // Split: first 30 to Kirk, next 30 to Venice
    const kirkLeadIds = leads.slice(0, 30).map(l => l.id);
    const veniceLeadIds = leads.slice(30, 60).map(l => l.id);

    console.log(`\nAssigning ${kirkLeadIds.length} leads to Kirk...`);
    const { error: kirkErr } = await supabase
      .from('hub_project_leads')
      .update({ assigned_to: kirk.id })
      .in('id', kirkLeadIds);

    if (kirkErr) {
      console.error('Error assigning to Kirk:', kirkErr);
      process.exit(1);
    }

    console.log(`Assigning ${veniceLeadIds.length} leads to Venice...`);
    const { error: veniceErr } = await supabase
      .from('hub_project_leads')
      .update({ assigned_to: venice.id })
      .in('id', veniceLeadIds);

    if (veniceErr) {
      console.error('Error assigning to Venice:', veniceErr);
      process.exit(1);
    }

    console.log(`\n✓ Successfully assigned 30 leads to Kirk and 30 to Venice`);
    console.log('They will see these in the Lead Tracker tabs immediately.');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
