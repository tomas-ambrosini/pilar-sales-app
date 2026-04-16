import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseKey);

const itemsRaw = [
    { category: 'Material', item_name: 'Indoor Unit (AHU/wall unit)', cost: 0.00 },
    { category: 'Material', item_name: 'Stand', cost: 0.00 },
    { category: 'Material', item_name: 'Aux Drain Pan', cost: 0.00 },
    { category: 'Material', item_name: 'Unit Float Switch', cost: 0.00 },
    { category: 'Material', item_name: 'Pan Float Switch', cost: 0.00 },
    { category: 'Material', item_name: 'PVC Drain Line 3/4" (per ft)', cost: 0.00 },
    { category: 'Material', item_name: 'PVC Drain Line 1-1/4" (per ft)', cost: 0.00 },
    { category: 'Material', item_name: 'Condensate Pump (110V)', cost: 0.00 },
    { category: 'Material', item_name: 'Condensate Pump (220V)', cost: 0.00 },
    { category: 'Material', item_name: 'Electrical Disconnect', cost: 0.00 },
    { category: 'Material', item_name: 'Electrical Breaker', cost: 0.00 },
    { category: 'Material', item_name: 'Whip', cost: 0.00 },
    { category: 'Material', item_name: 'CPVC Drain Line 1/2"', cost: 0.00 },
    { category: 'Material', item_name: 'CPVC Drain Line 3/4"', cost: 0.00 },
    { category: 'Material', item_name: 'PVC Fittings', cost: 0.00 },
    { category: 'Material', item_name: 'CPVC Fittings', cost: 0.00 },
    { category: 'Material', item_name: 'Copper Pipe', cost: 0.00 },
    { category: 'Material', item_name: 'Refrigerant Line Fittings', cost: 0.00 },
    { category: 'Material', item_name: 'Armaflex', cost: 0.00 },

    { category: 'Material', item_name: 'Outdoor Unit (CU)', cost: 0.00 },
    { category: 'Material', item_name: 'Concrete Slab', cost: 0.00 },
    { category: 'Material', item_name: 'Concrete Slab (Minisplit)', cost: 0.00 },
    { category: 'Material', item_name: 'Tie Down', cost: 0.00 },
    { category: 'Material', item_name: 'Roof Stand', cost: 0.00 },
    { category: 'Material', item_name: 'Wall Stand', cost: 0.00 },
    { category: 'Material', item_name: 'Line Cover', cost: 0.00 },
    { category: 'Material', item_name: 'Drier', cost: 0.00 },
    { category: 'Material', item_name: 'Refrigerant', cost: 0.00 },
    { category: 'Material', item_name: 'Refrigerant Lock Caps', cost: 0.00 },

    { category: 'Material', item_name: 'Fiberglass Sheet (1")', cost: 0.00 },
    { category: 'Material', item_name: 'Fiberglass Sheet (1.5")', cost: 0.00 },
    { category: 'Material', item_name: 'Fiberglass Sheet (2")', cost: 0.00 },
    { category: 'Material', item_name: 'Linear Supply Difuser Boot - 2 slots (18")', cost: 0.00 },
    { category: 'Material', item_name: 'Linear Supply Difuser Boot - 2 slots (24")', cost: 0.00 },
    { category: 'Material', item_name: 'Linear Supply Difuser Boot - 2 slots (36")', cost: 0.00 },
    { category: 'Material', item_name: 'Insulated Register Box (8" x 8")', cost: 0.00 },
    { category: 'Material', item_name: 'Insulated Register Box (6" x 6")', cost: 0.00 },
    { category: 'Material', item_name: 'Boot (18" x 18")', cost: 0.00 },
    { category: 'Material', item_name: 'Boot (12" x 12")', cost: 0.00 },
    { category: 'Material', item_name: 'Register Box (8" x 8")', cost: 0.00 },
    { category: 'Material', item_name: 'Linear Supply Grill - 2 slots (18")', cost: 0.00 },
    { category: 'Material', item_name: 'Linear Supply Grill - 2 slots (24")', cost: 0.00 },
    { category: 'Material', item_name: 'Linear Supply Grill - 2 slots (36")', cost: 0.00 },
    { category: 'Material', item_name: 'Return Grill (12" x 12")', cost: 0.00 },
    { category: 'Material', item_name: 'Return Grill (18" x 18")', cost: 0.00 },
    { category: 'Material', item_name: 'Return Grill (20" x 20")', cost: 0.00 },
    { category: 'Material', item_name: 'Flex Duct (4")', cost: 0.00 },
    { category: 'Material', item_name: 'Flex Duct (6")', cost: 0.00 },
    { category: 'Material', item_name: 'Flex Duct (8")', cost: 0.00 },
    { category: 'Material', item_name: 'Flex Duct (10")', cost: 0.00 },
    { category: 'Material', item_name: 'Flex Duct (12")', cost: 0.00 },
    { category: 'Material', item_name: 'Collar #4', cost: 0.00 },
    { category: 'Material', item_name: 'Collar #6', cost: 0.00 },
    { category: 'Material', item_name: 'Collar #8', cost: 0.00 },
    { category: 'Material', item_name: 'Collar #10', cost: 0.00 },
    { category: 'Material', item_name: 'Collar #12', cost: 0.00 },
    { category: 'Material', item_name: 'Hanger Strap', cost: 0.00 },
    { category: 'Material', item_name: 'Aluminum Tape', cost: 0.00 },
    { category: 'Material', item_name: 'Grey Tape', cost: 0.00 },
    { category: 'Material', item_name: 'Mastic (Duct Pasting)', cost: 0.00 },
    { category: 'Material', item_name: 'Brush', cost: 0.00 },

    { category: 'Material', item_name: 'Refrigerant Line 3/8" (per ft)', cost: 0.00 },
    { category: 'Material', item_name: 'Refrigerant Line 7/8" (per ft)', cost: 0.00 },
    { category: 'Material', item_name: 'Refrigerant Line 3/4" (per ft)', cost: 0.00 },
    { category: 'Material', item_name: 'Thermostat Wire', cost: 0.00 },
    { category: 'Material', item_name: 'PVC 6" Pipe', cost: 0.00 },
    { category: 'Material', item_name: 'PVC 6" Fittings', cost: 0.00 }
];

const items = itemsRaw.map(item => ({
    id: crypto.randomUUID(),
    ...item
}));

async function seed() {
    console.log(`Clearing out any old duplicates to prevent dirty data...`);
    // Delete any items that have the exact same names so we don't duplicate on multiple runs
    const itemNames = items.map(i => i.item_name);
    await supabase.from('labor_rates').delete().in('item_name', itemNames);

    console.log(`Inserting ${items.length} SKUs into labor_rates...`);
    const { data, error } = await supabase.from('labor_rates').insert(items).select();
    
    if (error) {
        console.error('Migration failed:', error);
    } else {
        console.log(`Success! Inserted ${data.length} components.`);
    }
}

seed();
