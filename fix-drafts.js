import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
    const { data: proposals, error } = await supabase.from('proposals').select('*').is('associated_opportunity_id', null);
    if (error) { console.error("Error fetching:", error); return; }
    
    console.log(`Found ${proposals.length} proposals missing opportunities.`);
    for (const prop of proposals) {
        console.log(`Fixing proposal ${prop.id} for customer ${prop.customer}...`);
        
        let householdId = prop.proposal_data?.wizard_state?.selectedCustomerId || prop.proposal_data?.household_id;
        
        if (!householdId) {
            console.log("No household ID found in proposal data, skipping...");
            continue;
        }

        const { data: newOpp, error: oppErr } = await supabase.from('opportunities').insert([{
            household_id: householdId,
            status: 'Quoting', // PIPELINE_STATES.QUOTING
            urgency_level: 'Low',
            issue_description: 'Auto-generated Opportunity for drafted Proposal',
            assigned_salesperson_id: prop.created_by,
            proposal_data: { type: 'SALES', wizard_state: prop.proposal_data?.wizard_state },
            is_active: true
        }]).select('id').single();
        
        if (oppErr) {
            console.error("Error creating opp:", oppErr);
        } else if (newOpp) {
            const updatedProposalData = { ...prop.proposal_data, associated_opportunity_id: newOpp.id };
            if (updatedProposalData.wizard_state) updatedProposalData.wizard_state.associated_opportunity_id = newOpp.id;
            
            const { error: updateErr } = await supabase.from('proposals').update({
                associated_opportunity_id: newOpp.id,
                proposal_data: updatedProposalData
            }).eq('id', prop.id);
            
            if (updateErr) console.error("Error updating proposal:", updateErr);
            else console.log(`Fixed proposal ${prop.id}!`);
        }
    }
}
fix();
