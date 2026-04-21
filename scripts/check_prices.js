import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: equip } = await supabase.from('equipment_catalog').select('*').ilike('brand', '%RUUD%');
  console.log("RUUD Equipment:");
  equip.forEach(e => console.log(`- ${e.brand} ${e.series} ${e.tons}T ${e.seer}SEER: $${e.system_cost}`));

  const { data: labor } = await supabase.from('labor_rates').select('*');
  console.log("\nAdd-ons/Labor:");
  labor.forEach(l => console.log(`- ${l.sku} ${l.item_name} (${l.category}): $${l.cost}`));

  const { data: margin } = await supabase.from('margin_settings').select('*');
  console.log("\nMargins:", margin);
}

inspect();
