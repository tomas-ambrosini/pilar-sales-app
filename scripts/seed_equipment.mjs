import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const filterSizes = ['20x25x1', '16x25x1', '20x20x1', '14x20x1', '20x25x4'];
const brands = ['Daikin', 'Trane', 'Carrier', 'Lennox', 'Ruud', 'Goodman'];

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
}

async function seedEquipment() {
  console.log('Fetching addresses...');
  const { data: addresses, error } = await supabase.from('addresses').select('*');
  
  if (error) {
    console.error('Error fetching addresses:', error);
    return;
  }
  
  let updateCount = 0;

  for (const address of addresses) {
    let pd = address.property_details;
    if (!pd || !pd.units || pd.units.length === 0) continue;
    
    let modified = false;
    for (const unit of pd.units) {
      if (!unit.serial_number || unit.serial_number === '') {
        unit.serial_number = 'SN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        modified = true;
      }
      if (!unit.model_number || unit.model_number === '') {
        unit.model_number = 'MDL-' + Math.floor(1000 + Math.random() * 9000);
        modified = true;
      }
      if (!unit.install_date || unit.install_date === '') {
        unit.install_date = getRandomDate(new Date(2018, 0, 1), new Date());
        modified = true;
      }
      if (!unit.parts_warranty_years || unit.parts_warranty_years === '') {
        unit.parts_warranty_years = '10';
        modified = true;
      }
      if (!unit.labor_warranty_years || unit.labor_warranty_years === '') {
        unit.labor_warranty_years = Math.random() > 0.5 ? '2' : '1';
        modified = true;
      }
      if (!unit.filter_size || unit.filter_size === '') {
        unit.filter_size = filterSizes[Math.floor(Math.random() * filterSizes.length)];
        modified = true;
      }
    }
    
    if (modified) {
      console.log(`Updating address ${address.id} (${address.street_address})...`);
      const { error: updateError } = await supabase.from('addresses').update({ property_details: pd }).eq('id', address.id);
      if (updateError) {
        console.error('Failed to update address:', address.id, updateError);
      } else {
        updateCount++;
      }
    }
  }
  
  console.log(`Successfully seeded equipment data for ${updateCount} addresses.`);
}

seedEquipment();
