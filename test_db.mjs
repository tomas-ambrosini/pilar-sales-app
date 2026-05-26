import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.local', 'utf-8');
const envUrlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const envKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = envUrlMatch ? envUrlMatch[1].trim() : null;
const supabaseKey = envKeyMatch ? envKeyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: dept } = await supabase.from('departments').select('*');
  console.log("Departments:", dept);
}
run();
