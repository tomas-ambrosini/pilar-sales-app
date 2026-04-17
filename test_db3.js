import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const matchUrl = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const matchKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(matchUrl[1], matchKey[1]);

async function run() {
  const { data, error } = await supabase.from('proposals').select('*').limit(3).order('id', {ascending: false});
  console.log(JSON.stringify(data.map(d => ({id: d.id, tiers: d.proposal_data?.tiers})), null, 2));
}
run();
