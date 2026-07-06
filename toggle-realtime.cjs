require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testRealtime() {
  console.log("Testing realtime...");
  supabase.channel('realtime_test')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'task_updates' }, (payload) => {
      console.log("RECEIVED PAYLOAD", payload);
    })
    .subscribe(async (status) => {
      console.log("STATUS", status);
      if (status === 'SUBSCRIBED') {
         const { data, error } = await supabase.from('task_updates').insert({
           task_id: 'a0794178-57bd-4f7f-af23-a1bf1868a2ab', // need to guess a real task ID or it will fail
           content: 'test'
         });
         console.log("Inserted?", error);
      }
    });
}
testRealtime();
setTimeout(() => process.exit(0), 8000);
