import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');

async function test() {
  const { data: households } = await supabase.from('households').select('*');
  const { data: addresses } = await supabase.from('addresses').select('*');
  const { data: contacts } = await supabase.from('contacts').select('*');
  console.log('Households:', households?.length);
  console.log('Addresses:', addresses?.length);
  console.log('Contacts:', contacts?.length);
  console.log(JSON.stringify(households[0], null, 2));
}
test();
