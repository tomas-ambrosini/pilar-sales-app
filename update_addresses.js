import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    await supabase.from('addresses').update({ state: 'FL', zip: '33186' }).eq('id', '7dac4863-2942-43d5-9889-f572a2a3adaa');
    await supabase.from('addresses').update({ state: 'FL', zip: '33134' }).eq('id', 'e74da1c7-08fe-4670-bfa3-f8535eac642d');
    await supabase.from('addresses').update({ state: 'FL', zip: '33141' }).eq('id', '4e10cdc4-0052-44ff-846a-9d5897222080');
    console.log("Updated addresses");
}
main();
