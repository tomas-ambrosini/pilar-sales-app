import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');
const { data } = await supabase.from('households').select('*').limit(1);
console.log(Object.keys(data[0]));
