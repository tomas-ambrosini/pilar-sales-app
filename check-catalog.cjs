const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCatalog() {
    const { data, error } = await supabase.from('equipment_catalog').select('*');
    if (error) {
        console.error("Error fetching catalog items:", error);
        return;
    }

    const withCondenser = data.filter(d => d.condenser_model);
    const withoutCondenser = data.filter(d => !d.condenser_model);
    
    console.log(`Total items: ${data.length}`);
    console.log(`With condenser_model: ${withCondenser.length}`);
    console.log(`Without condenser_model: ${withoutCondenser.length}`);
    
    if (withoutCondenser.length > 0) {
        console.log("Sample without condenser_model:", withoutCondenser.slice(0, 3));
    }
}

checkCatalog();
