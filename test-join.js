import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log("Testing opportunities fetch with service_address_id...");
    const { data: opData, error: opError } = await supabase
        .from('households')
        .select(`id, opportunities ( id, service_address_id )`)
        .limit(1);
    
    if (opError) console.error("Opportunities Error:", opError.message);
    else console.log("Opportunities Success");

    console.log("Testing work_orders fetch with opportunity_id...");
    const { data: woData, error: woError } = await supabase
        .from('households')
        .select(`id, work_orders ( id, opportunity_id )`)
        .limit(1);

    if (woError) console.error("Work Orders Error:", woError.message);
    else console.log("Work Orders Success");
}

testFetch();
