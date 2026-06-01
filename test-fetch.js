import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFetch() {
    console.log("Testing opportunities fetch...");
    const { data: opData, error: opError } = await supabase
        .from('households')
        .select(`opportunities ( id, service_address_id )`)
        .limit(1);
    
    if (opError) console.error("Opportunities Error:", opError);
    else console.log("Opportunities Success");

    console.log("Testing work_orders fetch...");
    const { data: woData, error: woError } = await supabase
        .from('households')
        .select(`work_orders ( id, opportunity_id )`)
        .limit(1);

    if (woError) console.error("Work Orders Error:", woError);
    else console.log("Work Orders Success");
}

testFetch();
