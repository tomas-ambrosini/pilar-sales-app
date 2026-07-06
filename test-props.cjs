const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
async function test() {
    const { data } = await supabase.from('proposals').select('id, customer, created_by').limit(5);
    console.log(data);
}
test();
