import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log("Creating test opportunity...");
    const { data: household } = await supabase.from('households').select('id').limit(1).single();
    
    const { data, error } = await supabase.from('opportunities').insert({
        household_id: household.id,
        urgency_level: 'Medium',
        issue_description: 'Test Issue',
        dispatch_notes: 'Test Notes',
        status: 'New Lead'
    }).select().single();
    
    if (error) console.error("OPP ERR:", error);
    else console.log("Success:", data);
}
test();
