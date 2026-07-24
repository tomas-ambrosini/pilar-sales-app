import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    realtime: { transport: ws }
});

async function check() {
    // 944339b9-55fa-490c-8ce4-c30adc81ac31 is the associated_opportunity_id for 179
    const url = process.env.VITE_SUPABASE_URL + '/rest/v1/opportunities?id=eq.944339b9-55fa-490c-8ce4-c30adc81ac31&select=status';
    const res = await fetch(url, { headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY }});
    const data = await res.json();
    console.log("Opportunity:", data);
}
check();
