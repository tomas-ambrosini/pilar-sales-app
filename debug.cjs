const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
    console.log("=== Testing Delete ===");
    const { data: fetch2, error: err2 } = await supabase.from('households').select('id, household_name').limit(1);
    
    if (fetch2 && fetch2.length > 0) {
        console.log("Attempting to delete:", fetch2[0]);
        const { error: delErr } = await supabase.from('households').delete().eq('id', fetch2[0].id);
        console.log("DELETE ERROR (IF ANY):", delErr);
    } else {
        console.log("No households found to delete. This means the DB is empty.");
    }
}

testSupabase();
