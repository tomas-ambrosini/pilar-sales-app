const { createClient } = require('@supabase/supabase-js');
const pkg = require('./package.json');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
   const [k, v] = line.split('=');
   if(k) env[k] = v;
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
   const {data} = await supabase.from('proposals').select('id, status, amount, proposal_data').order('created_at', {ascending: false}).limit(5);
   console.log(JSON.stringify(data, null, 2));
}
run();
