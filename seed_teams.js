import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseKey);

const newTeams = [
    'USA', 'Mexico', 'Argentina', 'Brazil', 'Colombia',
    'England', 'France', 'Spain', 'Portugal', 'Germany',
    'Egypt', 'South Africa', 'Ghana', 'Morocco', 'Senegal',
    'Japan', 'South Korea', 'New Zealand', 'Australia', 'Uzbekistan'
];

async function main() {
    // fetch existing
    const { data: existing, error } = await supabase.from('camp_teams').select('*');
    if (error) {
        console.error("Error fetching", error);
        return;
    }
    console.log("Found", existing.length, "teams");

    const existingNames = existing.map(t => t.name);

    // identify to delete
    const toDelete = existing.filter(t => !newTeams.includes(t.name));
    for (let t of toDelete) {
        await supabase.from('camp_teams').delete().eq('id', t.id);
        console.log("Deleted", t.name);
    }

    // identify to insert
    const toInsert = newTeams.filter(name => !existingNames.includes(name));
    for (let name of toInsert) {
        await supabase.from('camp_teams').insert({ name: name, points: 0 });
        console.log("Inserted", name);
    }
    
    console.log("Done");
}

main();
