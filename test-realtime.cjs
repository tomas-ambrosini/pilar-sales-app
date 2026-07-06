const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const channel = supabase.channel('realtime_tasks')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'task_updates' }, (payload) => {
    console.log("RECEIVED PAYLOAD", payload);
  })
  .subscribe((status) => {
    console.log("STATUS", status);
    if (status === 'SUBSCRIBED') {
       supabase.from('task_updates').insert({
         task_id: 'some-fake-id',
         content: 'test'
       }).then(console.log).catch(console.log);
    }
  });

setTimeout(() => process.exit(0), 4000);
