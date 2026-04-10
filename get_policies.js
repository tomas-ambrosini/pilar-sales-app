import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const res = await supabase.rpc('get_policies');
  console.log(res);
}
// Actually, RPC get_policies doesn't exist by default.
