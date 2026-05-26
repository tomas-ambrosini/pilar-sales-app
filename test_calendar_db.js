import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: dept, error: e1 } = await supabase.from('departments').select('*');
  console.log("Departments:", dept ? dept.length : e1);
  const { data: ev, error: e2 } = await supabase.from('event_types').select('*');
  console.log("Event Types:", ev ? ev.length : e2);
}
check();
