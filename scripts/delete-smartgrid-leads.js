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
  // Find project
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
  console.log(`Found project ID: ${projectId}`);

  // Delete all existing leads
  console.log('Deleting existing leads...');
  const { data, error: delErr } = await supabase
    .from('hub_project_leads')
    .delete()
    .eq('project_id', projectId)
    .select();

  if (delErr) {
    console.error('Delete error:', delErr);
    process.exit(1);
  }

  console.log(`✓ Deleted ${data?.length || 0} leads\n`);
  console.log('Now run the seed script:');
  console.log('node scripts/seed-smartgrid-leads.js');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
