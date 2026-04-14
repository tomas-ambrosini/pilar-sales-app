import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'dummy_key';

// Read env variables if testing locally where they might be set in .env
let envFile = '';
try {
  envFile = fs.readFileSync('.env', 'utf8');
} catch (e) {}

const regexUrl = /VITE_SUPABASE_URL=(.*)/;
const regexKey = /VITE_SUPABASE_ANON_KEY=(.*)/;

const matchUrl = envFile.match(regexUrl);
const matchKey = envFile.match(regexKey);

const supabaseUrl = matchUrl ? matchUrl[1] : url;
const supabaseKey = matchKey ? matchKey[1] : key;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('proposals').select('proposal_data').eq('id', '39').single();
  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data?.proposal_data?.wizard_state?.systems, null, 2));
  }
}
run();
