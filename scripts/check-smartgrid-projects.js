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
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase
    .from('hub_projects')
    .select('id, project_name, client_name');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('All SmartGrid projects:');
  const smartgrid = (data || []).filter(p =>
    p.project_name?.toLowerCase().includes('smartgrid') ||
    p.client_name?.toLowerCase().includes('smartgrid')
  );

  if (smartgrid.length === 0) {
    console.log('  None found');
    return;
  }

  smartgrid.forEach(p => {
    console.log(`  ID ${p.id}: ${p.project_name} (${p.client_name})`);
  });

  // Also check lead counts
  console.log('\nLead counts:');
  for (const p of smartgrid) {
    const { count, error: countErr } = await supabase
      .from('hub_project_leads')
      .select('*', { count: 'exact' })
      .eq('project_id', p.id)
      .limit(1);

    if (!countErr) {
      console.log(`  Project ${p.id}: ${count} leads`);
    }
  }
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
