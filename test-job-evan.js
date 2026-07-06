import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data } = await supabase.from('opportunities').select('id, assigned_salesperson_id, status, proposal_data').eq('status', 'QUOTING');
    console.log(JSON.stringify(data, null, 2));
}
test();
