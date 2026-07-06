require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectDeal() {
    const { data: prop, error: propErr } = await supabase
        .from('proposals')
        .select('*')
        .eq('quote_number', 'P2026-000139-TEST')
        .single();
        
    if (prop) {
        const oppId = prop.associated_opportunity_id;
        console.log("Found Opp ID:", oppId);
        
        const { data: job, error } = await supabase
            .from('opportunities')
            .select(`
                *,
                households (
                    *,
                    addresses (*)
                )
            `)
            .eq('id', oppId)
            .single();
            
        console.log("Error:", error);
        if (job) {
            console.log("Addresses:", JSON.stringify(job.households?.addresses, null, 2));
            console.log("Amount:", job.amount);
            console.log("Proposal Data Amount:", job.proposal_data?.total_contract_amount);
            console.log("Deposit:", job.proposal_data?.deposit_amount, job.proposal_data?.deposit_percentage);
            console.log("Proposal Data Details:", JSON.stringify(job.proposal_data, null, 2));
        }
    } else {
        console.log("Proposal not found", propErr);
    }
}

inspectDeal();
