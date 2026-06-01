import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const { data, error } = await supabase
        .from('households')
        .select(`
            id,
            opportunities ( id, service_address_id )
        `)
        .limit(1);
        
    console.log("Opportunities check:", error ? error.message : "Success");
    
    const { data: data2, error: error2 } = await supabase
        .from('households')
        .select(`
            id,
            work_orders ( id, service_address_id )
        `)
        .limit(1);
        
    console.log("Work orders check:", error2 ? error2.message : "Success");
}

testQuery();
