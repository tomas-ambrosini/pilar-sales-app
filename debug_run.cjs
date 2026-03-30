const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkState() {
    console.log("\n=== Testing Complex Fetch Query ===");
    const { data, error } = await supabase
        .from('households')
        .select(`
            id,
            household_name,
            tags,
            created_at,
            addresses!households_service_address_id_fkey ( id, street_address, city, state, zip ),
            contacts ( id, first_name, last_name, primary_phone, email, role )
        `);
    if (error) console.log("Complex Fetch Error:", error);
    else console.log("Complex Fetch Success, rows:", data.length, JSON.stringify(data[0], null, 2));
}

checkState();
