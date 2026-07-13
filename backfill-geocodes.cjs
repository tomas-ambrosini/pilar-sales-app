const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode(addressString) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'PilarSalesApp/1.0 (prototype)'
            }
        });
        const data = await res.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {
        console.error('Geocode error for', addressString, e.message);
    }
    return null;
}

async function run() {
    console.log('Fetching addresses...');
    const { data: addresses, error } = await supabase.from('addresses').select('*');
    
    if (error) {
        console.error('Error fetching addresses:', error);
        return;
    }

    console.log(`Found ${addresses.length} addresses. Backfilling...`);
    
    let successCount = 0;
    
    for (const addr of addresses) {
        // Skip if already geocoded
        if (addr.property_details && addr.property_details.lat && addr.property_details.lng) {
            console.log(`Skipping ${addr.street_address}, already geocoded.`);
            continue;
        }

        const addressString = `${addr.street_address}, ${addr.city}, ${addr.state} ${addr.zip}`;
        console.log(`Geocoding: ${addressString}`);
        
        const coords = await geocode(addressString);
        if (coords) {
            const updatedDetails = {
                ...(addr.property_details || {}),
                lat: coords.lat,
                lng: coords.lng
            };
            
            // Note: Since RLS is enabled, we need to bypass it or use admin-action. 
            // Wait, we only have ANON_KEY. Let's try direct update, if RLS blocks, we use the Edge Function.
            const { error: updateError } = await supabase.from('addresses').update({ property_details: updatedDetails }).eq('id', addr.id);
            
            if (updateError) {
                console.error(`Error updating ${addr.id}:`, updateError.message);
            } else {
                console.log(`Updated ${addr.street_address} -> ${coords.lat}, ${coords.lng}`);
                successCount++;
            }
        } else {
            console.log(`Could not geocode ${addressString}`);
        }
        
        // Respect Nominatim rate limits (1 request per second)
        await delay(1500);
    }
    
    console.log(`Done! Backfilled ${successCount} addresses.`);
}

run();
