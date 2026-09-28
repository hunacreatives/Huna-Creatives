#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
let SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('ERROR: VITE_PUBLIC_SUPABASE_URL not found in .env');
  process.exit(1);
}

// If service key not in env, prompt for it
if (!SUPABASE_SERVICE_KEY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  SUPABASE_SERVICE_KEY = await new Promise(resolve => {
    rl.question('Enter SUPABASE_SERVICE_KEY (Service Role Secret from Supabase): ', answer => {
      rl.close();
      resolve(answer);
    });
  });
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  console.log('Starting SmartGrid Western lead import...\n');

  // Find SmartGrid Western project
  console.log('Finding SmartGrid Western project...');
  const { data: projects, error: projError } = await supabase
    .from('hub_projects')
    .select('id, client_name, project_name')
    .eq('project_name', 'SmartGrid Western')
    .limit(1);

  if (projError || !projects || projects.length === 0) {
    console.error('ERROR: Could not find SmartGrid Western project');
    console.error(projError);
    process.exit(1);
  }

  const projectId = projects[0].id;
  console.log(`Found project: ${projects[0].project_name} (ID: ${projectId})\n`);

  // Read Excel file
  console.log('Reading CHLA Member List...');
  const excelPath = path.join(process.env.HOME || '/Users/francisfielroble', 'Downloads', 'CHLA Member List 9-2026.xlsx');

  if (!fs.existsSync(excelPath)) {
    console.error(`ERROR: File not found: ${excelPath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Read all data rows (A7:U1948 → 0-indexed A6:U1947)
  const dataRows = XLSX.utils.sheet_to_row_object_array(ws, {
    range: 'B7:U1948',
    header: ['account_name', 'number_of_rooms', 'mailing_street', 'mailing_city', 'mailing_state', 'mailing_zip', 'phone', 'physical_street', 'physical_city', 'physical_state', 'county', 'primary_contact', 'primary_contact_title', 'email', 'email_sent', 'operation_type', 'restaurant_on_site', 'cabbi_member', 'assigned_to', 'notes']
  });

  console.log(`Read ${dataRows.length} data rows`);

  // Prepare records for insertion
  const records = dataRows.map((row, idx) => ({
    project_id: projectId,
    account_name: row.account_name || null,
    number_of_rooms: row.number_of_rooms ? parseInt(row.number_of_rooms, 10) : null,
    mailing_street: row.mailing_street || null,
    mailing_city: row.mailing_city || null,
    mailing_state: row.mailing_state || null,
    mailing_zip: row.mailing_zip || null,
    phone: row.phone || null,
    physical_street: row.physical_street || null,
    physical_city: row.physical_city || null,
    physical_state: row.physical_state || null,
    county: row.county || null,
    primary_contact: row.primary_contact || null,
    primary_contact_title: row.primary_contact_title || null,
    email: row.email || null,
    operation_type: row.operation_type || null,
    restaurant_on_site: row.restaurant_on_site || null,
    cabbi_member: row.cabbi_member || null,
    notes: row.notes || null,
    status: 'new',
    attempts_count: 0,
    email_found: row.email ? true : false,
    phone_found: row.phone ? true : false,
    contact_name_found: row.primary_contact ? true : false,
  }));

  console.log(`Prepared ${records.length} records for insertion`);
  console.log(`First record: ${JSON.stringify(records[0], null, 2)}\n`);

  // Insert in batches (1000 at a time to avoid payload size issues)
  const batchSize = 1000;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length));
    console.log(`Inserting batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)...`);

    const { error } = await supabase
      .from('hub_project_leads')
      .insert(batch);

    if (error) {
      console.error(`ERROR in batch: ${error.message}`);
      console.error(error);
      process.exit(1);
    }

    inserted += batch.length;
    console.log(`  ✓ ${inserted}/${records.length}`);
  }

  console.log(`\n✓ Completed! Inserted ${inserted} leads into SmartGrid Western project.`);

  // Verify count
  const { data: verify, error: verifyError } = await supabase
    .from('hub_project_leads')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (!verifyError) {
    console.log(`✓ Verified: ${verify.length || 0} records now in hub_project_leads for this project`);
  }
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
