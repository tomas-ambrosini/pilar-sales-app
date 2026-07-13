const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(addressString) {
    const fetchCoords = async (query) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'PilarSalesApp/1.0' } });
            const data = await res.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            }
        } catch (e) {
            console.warn('Geocode error:', e);
        }
        return null;
    };

    let coords = await fetchCoords(addressString);
    if (coords) return coords;

    let cleaned = addressString.replace(/(?:\b(?:Unit|Apt\.?|Ste\.?|Suite)\b|#)\s*[a-zA-Z0-9\-]+/gi, '');
    cleaned = cleaned.split(',')
                     .map(p => p.trim())
                     .filter(p => p.length > 0)
                     .join(', ');

    if (cleaned !== addressString.trim() && cleaned.length > 0) {
        await delay(1500); // Rate limit before second attempt
        console.log(`Fallback: Geocoding cleaned address: "${cleaned}"`);
        coords = await fetchCoords(cleaned);
        if (coords) return coords;
    }

    const parts = cleaned.split(',').map(p => p.trim());
    if (parts.length >= 2) {
        if (parts.length >= 3) {
            const cityState = parts.slice(-2).join(', ').replace(/\s*\d{5}.*$/, '').trim(); // strip zip code
            if (cityState) {
                await delay(1500);
                console.log(`Fallback 2: Geocoding city/state: "${cityState}"`);
                coords = await fetchCoords(cityState);
                if (coords) return coords;
            }
        } else {
            const city = parts.slice(-1).join(', ');
            if (city) {
                await delay(1500);
                console.log(`Fallback 2: Geocoding city: "${city}"`);
                coords = await fetchCoords(city);
                if (coords) return coords;
            }
        }
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

    console.log(`Found ${addresses.length} addresses. Backfilling missing...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const addr of addresses) {
        // Skip if already geocoded
        if (addr.property_details && addr.property_details.lat && addr.property_details.lng) {
            continue;
        }

        const addressString = `${addr.street_address || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`.replace(/,\s*,/g, ',');
        console.log(`Geocoding: ${addressString}`);
        
        const coords = await geocodeAddress(addressString);
        if (coords) {
            const updatedDetails = {
                ...(addr.property_details || {}),
                lat: coords.lat,
                lng: coords.lng
            };
            
            const { error: updateError } = await supabase.from('addresses').update({ property_details: updatedDetails }).eq('id', addr.id);
            
            if (updateError) {
                console.error(`Error updating ${addr.id}:`, updateError.message);
            } else {
                console.log(`Updated ${addr.street_address} -> ${coords.lat}, ${coords.lng}`);
                successCount++;
            }
        } else {
            console.log(`Still could not geocode ${addressString}`);
            failCount++;
        }
        
        await delay(1500);
    }
    
    console.log(`Done! Backfilled ${successCount} addresses. Failed: ${failCount}.`);
}

run();
