const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
    const customerData = { email: 'tomasambrosini@gmail.com', phone: '3057944777' };
    const orQuery = [];
    if (customerData.email) orQuery.push(`email.eq."${customerData.email}"`);
    if (customerData.phone) orQuery.push(`primary_phone.eq."${customerData.phone}"`);
    
    console.log("TESTING QUERY:", orQuery.join(','));
    const { data: duplicates, error } = await supabase
        .from('contacts')
        .select('household_id, first_name, last_name, email')
        .or(orQuery.join(','))
        .limit(1);

    console.log("DUPLICATES:", duplicates);
    console.log("ERROR:", error);
}

testSupabase();
