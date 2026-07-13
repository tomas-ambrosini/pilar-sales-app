const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: opps } = await supabase.from('opportunities').select('id, proposal_data');
  const { data: props } = await supabase.from('proposals').select('id, associated_opportunity_id');
  
  const oppIdsFromProps = new Set(props.map(p => p.associated_opportunity_id).filter(Boolean));
  
  const orphanedOpps = opps.filter(o => 
     !oppIdsFromProps.has(o.id) && 
     o.proposal_data && 
     o.proposal_data.type !== 'SERVICE' // Only sales opps
  );
  
  for (const opp of orphanedOpps) {
     const { error } = await supabase.from('opportunities').update({ is_active: false, status: 'Voided' }).eq('id', opp.id);
     console.log('Fixed:', opp.id, error);
  }
}
run();
