import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8').split('\n');
let url = '', key = '';
for (const line of env) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1];
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1];
}
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.rpc('execute_sql', { query: "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'user_profiles_role_check';" });
  if (error) {
    console.log("RPC error:", error);
    // fallback, let's just query a user to see what roles exist
    const { data: users, error: uErr } = await supabase.from('user_profiles').select('role').limit(20);
    console.log("Roles found in DB:", [...new Set(users?.map(u => u.role))]);
  } else {
    console.log(data);
  }
}
test();
