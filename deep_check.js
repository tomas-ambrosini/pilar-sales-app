import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');

async function test() {
  const { data: svc } = await supabase.from('service_calls').select('id, status, created_at');
  console.log('service_calls (anon):', JSON.stringify(svc, null, 2));
  
  const { data: opps } = await supabase.from('opportunities').select('id, status, created_at');
  console.log('opportunities (anon):', JSON.stringify(opps, null, 2));
}
test();
