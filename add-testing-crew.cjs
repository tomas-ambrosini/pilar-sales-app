require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function addCrew() {
  const { data, error } = await supabase.from('crews').insert({
    crew_name: 'Testing Crew 1',
    color_code: '#8b5cf6', // purple color for testing
    is_active: true,
    subcontractor_id: null
  });
  if (error) console.error("Error adding crew:", error);
  else console.log("Success! Testing crew added.");
}
addCrew();
