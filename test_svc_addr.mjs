import { supabase } from './src/supabaseClient.js';

async function test() {
    const { data: svc, error } = await supabase.from('service_calls').select(`
        id, households ( household_name, addresses!addresses_household_id_fkey ( street_address, city ) )
    `).limit(1);
    
    console.log(JSON.stringify(svc, null, 2));
}

test();
