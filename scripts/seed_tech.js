import { createClient } from '@supabase/supabase-js';

// Reusing keys from src/supabaseClient.js
const supabaseUrl = 'https://rwzyejhpjayxpebxrybe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3enllamhwamF5eHBlYnhyeWJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTYwMDgsImV4cCI6MjA4OTU5MjAwOH0.ryE5wcyDNpZOInQD0XRC1YcE0RtxHfTz-WNj_2tIu44';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedData() {
    console.log("Seeding Field Tech Testing Data...");

    try {
        // 1. Create a dummy Household
        const { data: household, error: hError } = await supabase.from('households').insert({
            household_name: 'Stark Industries',
            tags: ['VIP', 'Commercial']
        }).select().single();
        
        if (hError) throw hError;
        console.log("Created Household:", household.id);

        // 2. Create Address
        const { data: address, error: aError } = await supabase.from('addresses').insert({
            household_id: household.id,
            street_address: '10880 Malibu Point',
            city: 'Malibu',
            state: 'CA',
            zip: '90265',
            is_primary_residence: true,
            property_details: {}
        }).select().single();

        if (aError) throw aError;
        console.log("Created Address:", address.id);

        // Map back to household
        await supabase.from('households').update({ service_address_id: address.id }).eq('id', household.id);

        // 3. Create Contact
        await supabase.from('contacts').insert({
            household_id: household.id,
            first_name: 'Tony',
            last_name: 'Stark',
            primary_phone: '(555) 123-4567',
            email: 'stark@avengers.io',
            role: 'owner'
        });

        // 4. Create an Opportunity
        const { data: opp, error: oError } = await supabase.from('opportunities').insert({
            household_id: household.id,
            status: 'Site Survey Scheduled',
            urgency_level: 'High',
            issue_description: 'Arc reactor cooling system failing. Needs emergency inspection.',
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time_block: '08:00 AM - 10:00 AM'
        }).select().single();

        if (oError) throw oError;
        console.log("Created Opportunity:", opp.id);

        // 5. Create a Work Order (Install) scheduled for today
        const { data: wo, error: wError } = await supabase.from('work_orders').insert({
            household_id: household.id,
            opportunity_id: opp.id,
            work_order_number: 'WO-' + Math.floor(Math.random() * 90000 + 10000),
            status: 'Scheduled',
            urgency_level: 'High',
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time_block: '12:00 PM - 04:00 PM',
            execution_payload: {
                tierName: 'Best Option',
                brand: 'Lennox Ultimate',
                tons: '5.0',
                salesPrice: 24500,
                features: ['Variable Speed Compressor', 'UV Light Purification', 'Hospital Grade Air Filtration']
            }
        }).select().single();

        if (wError) throw wError;
        console.log("Created Work Order:", wo.id);

        // 6. Create a second standard work order that is already En Route
        const { data: h2, error: h2Err } = await supabase.from('households').insert({ household_name: 'Wayne Manor' }).select().single();
        if (h2Err) throw new Error("h2 Err: " + JSON.stringify(h2Err));
        
        const { data: a2, error: a2Err } = await supabase.from('addresses').insert({ household_id: h2.id, street_address: '1007 Mountain Drive', city: 'Gotham', is_primary_residence: true }).select().single();
        await supabase.from('households').update({ service_address_id: a2.id }).eq('id', h2.id);
        
        await supabase.from('work_orders').insert({
            household_id: h2.id,
            work_order_number: 'WO-' + Math.floor(Math.random() * 90000 + 10000),
            status: 'En Route',
            urgency_level: 'Medium',
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time_block: '02:00 PM - 06:00 PM',
            execution_payload: {
                tierName: 'Good Option',
                brand: 'Goodman',
                tons: '4.0',
                salesPrice: 8500,
                features: ['Standard 14 SEER Replacement', 'Smart Thermostat Included']
            }
        });

        console.log("Data generation complete! You can now check the app.");
    } catch (e) {
        console.error("Failed to seed:", e.message);
    }
}

seedData();
