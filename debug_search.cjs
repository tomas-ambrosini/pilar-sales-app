const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkState() {
    console.log("\n=== Checking Opportunities (Pipeline) ===");
    const o = await supabase.from('opportunities').select('*');
    if (o.error) console.log("Opps Error:", o.error);
    else console.log("Opportunities Count:", o.data.length, JSON.stringify(o.data, null, 2));

    console.log("\n=== Checking Sales Pipeline Fetch ===");
    const fetch = await supabase
        .from('opportunities')
        .select(`
          id,
          status,
          urgency_level,
          issue_description,
          created_at,
          households (
             id,
             household_name,
             addresses ( street_address, city )
          )
        `);
    if (fetch.error) console.log("Fetch Error:", fetch.error);
    else console.log("Fetch Success, rows:", fetch.data.length);
}

checkState();
