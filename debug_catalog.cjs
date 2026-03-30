const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCatalog() {
    const c = await supabase.from('equipment_catalog').select('*').limit(1);
    console.log("Catalog Table Check:", c.error ? c.error.message : c.data.length + " rows");
}

checkCatalog();
