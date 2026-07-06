import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy');
async function test() {
    if (supabase.supabaseKey === 'dummy') {
        console.log("No service role key");
        return;
    }
    const { data } = await supabase.from('user_profiles').select('id, full_name, role').eq('id', '02e7a65f-a2a2-4cee-af8e-e6cbd44b55f1');
    console.log(data);
}
test();
