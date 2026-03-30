const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkOpp() {
    const { data: h } = await supabase.from('households').select('id').limit(1).single();
    if (!h) return console.log("No household to attach to.");

    console.log("=== Testing Opps Insert ===");
    const { data, error } = await supabase.from('opportunities').insert({
        household_id: h.id,
        status: 'Proposal Sent',
        urgency_level: 'Medium',
        issue_description: 'Auto-generated via Digital Proposal Wizard.',
        site_survey_data: { test: true }
    });
    
    console.log("Opp Insert Error:", error);
    console.log("Success:", data);
}

checkOpp();
