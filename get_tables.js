import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');

async function check() {
  const { data, error } = await supabase.from('service_calls').select('*');
  console.log('service_calls:', data?.length);
  
  const { data: d2 } = await supabase.from('jobs').select('*');
  console.log('jobs:', d2?.length);
}
check();
