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
  const { data: projects } = await supabase
    .from('hub_projects')
    .select('id')
    .eq('project_name', 'SmartGrid Western');

  if (!projects || !projects[0]) {
    console.error('Project not found');
    process.exit(1);
  }

  const projectId = projects[0].id;
  console.log(`Checking leads for project ${projectId}...`);

  const { data, count, error } = await supabase
    .from('hub_project_leads')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .limit(1);

  if (error) {
    console.error('Query error:', error);
    process.exit(1);
  }

  console.log(`Total leads in database: ${count || 0}`);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
