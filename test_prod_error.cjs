const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log("Testing base proposals query...");
    const { data: d1, error: e1 } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (e1) {
        console.error("Base query error:", e1);
    } else {
        console.log("Base query OK.");
    }

    console.log("Testing SALES role query...");
    // Mock user id
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    const { data: d2, error: e2 } = await supabase
        .from('proposals')
        .select('*')
        .eq('created_by', mockId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (e2) {
        console.error("SALES query error:", e2);
    } else {
        console.log("SALES query OK.");
    }

    console.log("Testing MANAGER role query...");
    const { data: d3, error: e3 } = await supabase
        .from('proposals')
        .select('*')
        .or(`created_by.eq.${mockId},status.neq.Draft`)
        .order('created_at', { ascending: false })
        .limit(1);

    if (e3) {
        console.error("MANAGER query error:", e3);
    } else {
        console.log("MANAGER query OK.");
    }
}
test();
