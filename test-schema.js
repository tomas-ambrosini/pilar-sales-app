import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data } = await supabase.from('opportunities').select('*').limit(1).maybeSingle();
    console.log(Object.keys(data));
}
test();
