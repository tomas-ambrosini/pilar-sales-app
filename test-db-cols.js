import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFetch() {
    console.log("Testing opportunities fetch...");
    const { data: opData, error: opError } = await supabase
        .from('opportunities')
        .select(`*`)
        .limit(1);
    
    if (opError) console.error("Opportunities Error:", opError);
    else console.log("Opportunities keys:", opData.length > 0 ? Object.keys(opData[0]) : "No data");

    console.log("Testing work_orders fetch...");
    const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select(`*`)
        .limit(1);

    if (woError) console.error("Work Orders Error:", woError);
    else console.log("Work Orders keys:", woData.length > 0 ? Object.keys(woData[0]) : "No data");
}

testFetch();
