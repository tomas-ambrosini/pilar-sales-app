import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: proposals } = await supabase.from('proposals').select('id, status').limit(2);
  console.log("Current proposals:", proposals);
  
  if (proposals && proposals.length > 0) {
     const id = proposals[0].id;
     console.log("Attempting to update id:", id);
     const res = await supabase.from('proposals').update({ status: 'Approved' }).eq('id', id).select();
     console.log("Update result:", res);
  }
}
check();
