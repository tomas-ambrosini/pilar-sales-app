import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

import ws from 'ws';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  },
  global: {
    fetch: fetch,
    headers: { 'x-my-custom-header': '123' },
  },
  realtime: {
    transport: ws,
  }
});

async function main() {
    // P2026-000178-TEST
    // First find the proposal with proposal_number 178
    const { data: proposal, error: proposalError } = await supabase
        .from('proposals')
        .select('*')
        .eq('proposal_number', 178)
        .single();
        
    if (proposalError) {
        console.error("Error finding proposal:", proposalError);
        return;
    }
    
    console.log("Found proposal:", proposal.id);
    const oppId = proposal.associated_opportunity_id || proposal.proposal_data?.associated_opportunity_id;
    
    if (!oppId) {
        console.error("No associated opportunity found for this proposal.");
        return;
    }
    
    console.log("Associated opportunity ID:", oppId);
    
    // Check current opp status
    const { data: opp, error: oppError } = await supabase
        .from('opportunities')
        .select('id, status')
        .eq('id', oppId)
        .single();
        
    if (oppError) {
        console.error("Error finding opportunity:", oppError);
        return;
    }
    
    console.log("Current Opportunity Status:", opp.status);
    
    if (opp.status === 'QUOTING' || opp.status === 'SENT') {
        const { error: updateError } = await supabase
            .from('opportunities')
            .update({ status: 'NEEDS_SCHEDULING' })
            .eq('id', oppId);
            
        if (updateError) {
            console.error("Failed to update opportunity:", updateError);
        } else {
            console.log("Successfully updated opportunity to NEEDS_SCHEDULING.");
        }
    } else {
        console.log("Opportunity is not in QUOTING state, it is in:", opp.status);
    }
}

main();
