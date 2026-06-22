const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const file = fs.readFileSync('./src/supabaseClient.js', 'utf8');
const urlMatch = file.match(/const supabaseUrl = '([^']+)'/);
const keyMatch = file.match(/const supabaseAnonKey = '([^']+)'/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data, error } = await supabase.rpc('query_schema', { sql: "SELECT data_type FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role';" });
  console.log(data, error);
}
check();
