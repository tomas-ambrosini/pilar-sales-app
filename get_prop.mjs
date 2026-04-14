import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envFile = '';
try {
  envFile = fs.readFileSync('.env', 'utf8');
} catch (e) {}

const regexUrl = /VITE_SUPABASE_URL=(.*)/;
const regexKey = /VITE_SUPABASE_ANON_KEY=(.*)/;

const matchUrl = envFile.match(regexUrl);
const matchKey = envFile.match(regexKey);

if (matchUrl && matchKey) {
  const supabase = createClient(matchUrl[1], matchKey[1]);
  const { data, error } = await supabase.from('proposals').select('proposal_data').eq('id', '39').single();
  if (data) {
    fs.writeFileSync('prop39.json', JSON.stringify(data.proposal_data, null, 2));
  }
}
