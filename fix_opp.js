import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws }
});

async function fix() {
    const oppId = '726a03ff-786f-439d-8494-3768db3c2b6d';
    const { data, error } = await supabase.from('opportunities').update({ status: 'NEEDS_SCHEDULING' }).eq('id', oppId);
    console.log("Update Error:", error);
    
    const { data: checkData } = await supabase.from('opportunities').select('status').eq('id', oppId);
    console.log("Check:", checkData);
}
fix();
