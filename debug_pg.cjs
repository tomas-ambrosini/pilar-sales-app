const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const content = fs.readFileSync('./src/supabaseClient.js', 'utf8');
const urlMatch = content.match(/VITE_SUPABASE_URL\s*\}?\s*\|\|\s*'([^']+)'/);
const keyMatch = content.match(/VITE_SUPABASE_ANON_KEY\s*\}?\s*\|\|\s*'([^']+)'/);

const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseAnonKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
    console.log("=== Testing Opportunities Table ===");
    const { data: fetch1, error: err1 } = await supabase.from('opportunities').select('*').limit(1);
    console.log("FETCH RESULT:", fetch1);
    if (err1) console.log("FETCH ERROR:", err1);
    
    console.log("=== Testing Households ===");
    const { data: fetch2, error: err2 } = await supabase.from('households').select('*').limit(1);
    console.log("FETCH RESULT:", fetch2);
    if (err2) console.log("FETCH ERROR:", err2);
    
    // Testing an insertion block that Proposals does!
    // const { error: insErr } = await supabase.from('opportunities').insert({
    //       household_id: fetch2?.[0]?.id,
    //       status: 'Proposal Sent',
    //       urgency_level: 'Medium',
    //       issue_description: 'Auto-generated via Digital Proposal Wizard.',
    //       site_survey_data: {}
    // });
    // console.log("INSERTION ERROR (IF ANY):", insErr);
}

testSupabase();
