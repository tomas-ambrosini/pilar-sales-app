import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('equipment_catalog').update({ retail_price: null }).neq('id', 0);
  if (error) console.error(error);
  else console.log('Successfully wiped retail_price columns in the database.');
}

run();
