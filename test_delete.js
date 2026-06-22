import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');

async function test() {
  const { data, error } = await supabase.from('proposals').select('*').limit(1);
  console.log('Query:', data, error);
  if (data && data.length > 0) {
      const { error: delErr } = await supabase.from('proposals').delete().eq('id', data[0].id);
      console.log('Delete error:', delErr);
  }
}
test();
