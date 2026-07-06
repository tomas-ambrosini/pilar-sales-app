import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: addresses, error } = await supabase.from('addresses').select('*').or('city.is.null,zip.is.null,city.eq."",zip.eq.""');
    if (error) {
        console.error("Error fetching", error);
        return;
    }
    console.log(JSON.stringify(addresses, null, 2));
}
main();
