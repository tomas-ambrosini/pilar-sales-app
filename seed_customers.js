import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://rwzyejhpjayxpebxrybe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44');

async function wipeAndSeed() {
  console.log("Wiping old data...");
  const tablesToWipe = [
    'proposals', 'work_orders', 'opportunities', 'invoices', 
    'proposal_comments', 'activity_logs', 'contacts', 'addresses', 'households'
  ];

  for (const table of tablesToWipe) {
      console.log(`Wiping ${table}...`);
      const { data, error } = await supabase.from(table).select('id');
      if (data && data.length > 0) {
          const ids = data.map(d => d.id);
          // Delete in batches of 100 or just loop
          for (const id of ids) {
              await supabase.from(table).delete().eq('id', id);
          }
      }
  }

  console.log("Seeding fresh refined customers...");

  const customers = [
      {
          name: "Emily Chen",
          email: "emily.chen@example.com",
          phone: "(555) 123-4567",
          tags: ["VIP", "Residential"],
          properties: [
              {
                  street: "1428 Elm Street",
                  city: "Springwood",
                  state: "OH",
                  zip: "43081",
                  details: {
                      year_built: "1998",
                      sq_footage: "2400",
                      current_system: "Carrier 3-Ton 16 SEER",
                      system_type: "Heat Pump",
                      property_type: "Single Family",
                      access_notes: "Gate code: 1234. Beware of dog in backyard.",
                      tenant_name: "Emily Chen",
                      tenant_phone: "(555) 123-4567",
                      units: [
                          {
                              id: crypto.randomUUID(),
                              unit_number: "Main House HVAC",
                              system_type: "Heat Pump",
                              description: "Carrier 3-Ton 16 SEER Heat Pump",
                              history: [{ id: crypto.randomUUID(), date: "2020-05-15T00:00:00Z", type: "Installation", description: "Original installation by previous owner." }]
                          }
                      ]
                  }
              }
          ]
      },
      {
          name: "Marcus Johnson",
          email: "mjohnson88@example.com",
          phone: "(555) 987-6543",
          tags: ["Commercial", "Maintenance Plan"],
          properties: [
              {
                  street: "742 Evergreen Terrace",
                  city: "Springfield",
                  state: "IL",
                  zip: "62704",
                  details: {
                      year_built: "2005",
                      sq_footage: "1850",
                      current_system: "Trane 5-Ton RTU",
                      system_type: "Packaged AC",
                      property_type: "Townhouse",
                      access_notes: "Call 30 mins before arrival.",
                      tenant_name: "Marcus Johnson",
                      tenant_phone: "(555) 987-6543",
                      units: [
                          {
                              id: crypto.randomUUID(),
                              unit_number: "Rooftop Unit 1",
                              system_type: "Packaged AC",
                              description: "Trane 5-Ton RTU",
                              history: []
                          }
                      ]
                  }
              },
              {
                  street: "123 Fake Street",
                  city: "Springfield",
                  state: "IL",
                  zip: "62701",
                  details: {
                      year_built: "2010",
                      sq_footage: "3200",
                      current_system: "Lennox 10-Ton RTU",
                      system_type: "Packaged AC",
                      property_type: "Commercial Office",
                      access_notes: "Keypad code: 4321*",
                      tenant_name: "Springfield Corp",
                      tenant_phone: "(555) 555-0199",
                      units: [
                          {
                              id: crypto.randomUUID(),
                              unit_number: "Office RTU A",
                              system_type: "Packaged AC",
                              description: "Lennox 10-Ton RTU",
                              history: []
                          },
                          {
                              id: crypto.randomUUID(),
                              unit_number: "Office RTU B",
                              system_type: "Packaged AC",
                              description: "Lennox 10-Ton RTU",
                              history: []
                          }
                      ]
                  }
              }
          ]
      },
      {
          name: "Sarah Williams",
          email: "sarah.w@example.com",
          phone: "(555) 222-3333",
          tags: ["Residential", "New Lead"],
          properties: [
              {
                  street: "4 Privet Drive",
                  city: "Little Whinging",
                  state: "Surrey",
                  zip: "CR0 1AA",
                  details: {
                      year_built: "1985",
                      sq_footage: "1600",
                      current_system: "Goodman 2-Ton",
                      system_type: "Split AC",
                      property_type: "Single Family",
                      access_notes: "Knock loud, doorbell broken.",
                      tenant_name: "Sarah Williams",
                      tenant_phone: "(555) 222-3333",
                      units: []
                  }
              }
          ]
      },
      {
          name: "David Kim",
          email: "dkim.investments@example.com",
          phone: "(555) 888-9999",
          tags: ["Property Manager", "Commercial"],
          properties: [
              {
                  street: "100 Main Street, Suite 500",
                  city: "Metropolis",
                  state: "NY",
                  zip: "10001",
                  details: {
                      year_built: "2015",
                      sq_footage: "5000",
                      current_system: "Daikin VRV System",
                      system_type: "Split System",
                      property_type: "Commercial Retail",
                      access_notes: "Check in with security desk in lobby.",
                      tenant_name: "Mega Store Inc",
                      tenant_phone: "(555) 777-8888",
                      units: [
                          { id: crypto.randomUUID(), unit_number: "Zone 1 AC", system_type: "Split System", description: "Daikin VRV System", history: [] },
                          { id: crypto.randomUUID(), unit_number: "Zone 2 AC", system_type: "Split System", description: "Daikin VRV System", history: [] }
                      ]
                  }
              },
              {
                  street: "400 Corporate Blvd, Bldg A",
                  city: "Metropolis",
                  state: "NY",
                  zip: "10002",
                  details: {
                      year_built: "2008",
                      sq_footage: "12000",
                      current_system: "Trane 20-Ton RTU",
                      system_type: "Packaged AC",
                      property_type: "Commercial Office",
                      access_notes: "Requires roof hatch key #4.",
                      tenant_name: "Tech Solutions LLC",
                      tenant_phone: "(555) 111-2222",
                      units: []
                  }
              },
              {
                  street: "88 Industrial Way",
                  city: "Gotham",
                  state: "NJ",
                  zip: "07001",
                  details: {
                      year_built: "1995",
                      sq_footage: "25000",
                      current_system: "York 50-Ton Chiller",
                      system_type: "Chilled Water",
                      property_type: "Warehouse",
                      access_notes: "Dock door 4 is unlocked.",
                      tenant_name: "Gotham Logistics",
                      tenant_phone: "(555) 333-4444",
                      units: []
                  }
              }
          ]
      }
  ];

  // Match existing households
  const { data: existingHouseholds } = await supabase.from('households').select('id, household_name');
  
  for (const cust of customers) {
      let hhId = null;
      const existing = existingHouseholds?.find(h => h.household_name.toLowerCase() === cust.name.toLowerCase());
      if (existing) {
          hhId = existing.id;
          console.log("Found existing household for:", cust.name);
          // Delete old contacts and addresses to be safe
          await supabase.from('contacts').delete().eq('household_id', hhId);
          await supabase.from('addresses').delete().eq('household_id', hhId);
      } else {
          console.log("Inserting new household for:", cust.name);
          const { data: hhData, error: hhErr } = await supabase.from('households').insert({
              household_name: cust.name,
              tags: cust.tags,
              is_active: true
          }).select().single();
          if (hhErr) { console.error("Error inserting household:", hhErr); continue; }
          hhId = hhData.id;
      }

      // 2. Insert Contact
      await supabase.from('contacts').insert({
          household_id: hhId,
          first_name: cust.name.split(' ')[0],
          last_name: cust.name.split(' ')[1] || '',
          email: cust.email,
          primary_phone: cust.phone,
          role: 'Primary'
      });

      // 3. Insert Addresses
      let firstAddrId = null;
      for (const prop of cust.properties) {
          const { data: addrData, error: addrErr } = await supabase.from('addresses').insert({
              household_id: hhId,
              street_address: prop.street,
              city: prop.city,
              state: prop.state,
              zip: prop.zip,
              property_details: prop.details,
              is_primary_residence: !firstAddrId
          }).select().single();
          
          if (addrErr) {
              console.error("Address Error:", addrErr);
          }
          if (!addrErr && !firstAddrId) {
              firstAddrId = addrData.id;
          }
      }

      // 4. Set service_address_id on Household
      if (firstAddrId) {
          await supabase.from('households').update({ service_address_id: firstAddrId }).eq('id', hhId);
      }
  }

  console.log("Seeding complete!");
}

wipeAndSeed();
