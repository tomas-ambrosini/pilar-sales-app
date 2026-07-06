import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');

async function main() {
    const { data: existing, error } = await supabase.from('camp_teams').select('*');
    if (error) {
        console.error("Error fetching", error);
        return;
    }
    console.log("Found", existing.length, "teams:", existing.map(t => t.name).join(', '));
    
    const newTeams = [
        'USA', 'Mexico', 'Argentina', 'Brazil', 'Colombia',
        'England', 'France', 'Spain', 'Portugal', 'Germany',
        'Egypt', 'South Africa', 'Ghana', 'Morocco', 'Senegal',
        'Japan', 'South Korea', 'New Zealand', 'Australia', 'Uzbekistan'
    ];
    
    for (let t of existing) {
        if (!newTeams.includes(t.name)) {
            await supabase.from('camp_teams').delete().eq('id', t.id);
            console.log("Deleted", t.name);
        }
    }
    
    // Check missing
    const existingNames = existing.map(t => t.name);
    for (let name of newTeams) {
        if (!existingNames.includes(name)) {
            await supabase.from('camp_teams').insert({ name: name, points: 0 });
            console.log("Inserted", name);
        }
    }
}
main();
