import { supabase } from './src/supabaseClient.js';

async function test() {
    const { data: opps, error } = await supabase.from('opportunities').select(`
        id, households ( household_name, addresses!households_service_address_id_fkey ( id, street_address, city ) )
    `).limit(1);
    
    console.log(JSON.stringify(opps, null, 2));
}

test();
