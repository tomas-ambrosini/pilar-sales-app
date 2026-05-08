import { supabase } from './src/supabaseClient.js';

async function check() {
  const { data, error } = await supabase.from('opportunities').select('*').limit(1);
  console.log("Error:", error);
  if (data && data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    console.log("No data, but query successful?");
  }
}
check();
