const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log("Setting up mock testing data...");

    // 1. Get a valid crew
    const { data: crews, error: cErr } = await supabase.from('crews').select('id, crew_name').limit(1);
    if (cErr || !crews || crews.length === 0) {
        console.error("No crews found. Please create a crew first.");
        return;
    }
    const crewId = crews[0].id;
    const crewName = crews[0].crew_name;
    console.log(`Using Crew: ${crewName} (${crewId})`);

    // 2. Get a valid household
    const { data: households, error: hErr } = await supabase.from('households').select('id, household_name').limit(1);
    if (hErr || !households || households.length === 0) {
        console.error("No households found.");
        return;
    }
    const householdId = households[0].id;
    console.log(`Using Household: ${households[0].household_name} (${householdId})`);

    // 3. Create a service call for today
    const today = new Date();
    // Move scheduled start to the middle of the day (e.g. 12:00 PM)
    today.setHours(12, 0, 0, 0);

    const mockJob = {
        household_id: householdId,
        status: 'Pending',
        urgency_level: 'STANDARD',
        issue_description: 'Tracker Test Job - Generated for Demo',
        scheduled_date: today.toISOString().split('T')[0],
        scheduled_time_block: '12:00 PM - 2:00 PM',
        assigned_crew_id: crewId
    };

    const { data, error } = await supabase.from('opportunities').insert([mockJob]).select();
    
    if (error) {
        console.error("Error creating mock job:", error);
    } else {
        console.log("Success! Mock job created:");
        console.log(data[0]);
    }
}

run();
