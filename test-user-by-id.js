import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    // try checking auth users using a query function if available, or just check user_profiles again, maybe without RLS
    const { data } = await supabase.from('user_profiles').select('*').eq('id', '02e7a65f-a2a2-4cee-af8e-e6cbd44b55f1');
    console.log(data);
}
test();
