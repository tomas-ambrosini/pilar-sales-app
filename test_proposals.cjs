const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    console.log("Testing proposals query...");
    const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .limit(1);

    if (error) {
        console.error("ERROR:", error);
    } else {
        console.log("SUCCESS:", data.length, "rows");
    }
}
test();
