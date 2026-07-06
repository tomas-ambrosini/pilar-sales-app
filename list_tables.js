import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // If we want to check other tables for addresses:
    // leads? 
    // Just try fetching from 'leads' and 'service_calls'
    let res = await supabase.from('leads').select('*').limit(1);
    console.log('leads:', res.error ? res.error.message : 'exists');
    
    res = await supabase.from('opportunities').select('*').limit(1);
    console.log('opportunities:', res.error ? res.error.message : 'exists');
}
main();
