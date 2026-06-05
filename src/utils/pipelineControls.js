import { supabase } from '../supabaseClient';

export const PIPELINE_STATES = {
  NEW_LEAD: 'NEW_LEAD',
  QUOTING: 'QUOTING',
  SENT: 'SENT',
  NEEDS_SCHEDULING: 'NEEDS_SCHEDULING',
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  LOST: 'LOST',
  PENDING_VOID: 'PENDING_VOID',
  VOIDED: 'VOIDED'
};

const TRANSITIONS = {
  [PIPELINE_STATES.NEW_LEAD]: [PIPELINE_STATES.QUOTING, PIPELINE_STATES.LOST, PIPELINE_STATES.PENDING_VOID],
  [PIPELINE_STATES.QUOTING]: [PIPELINE_STATES.SENT, PIPELINE_STATES.LOST, PIPELINE_STATES.PENDING_VOID],
  [PIPELINE_STATES.SENT]: [PIPELINE_STATES.NEEDS_SCHEDULING, PIPELINE_STATES.LOST, PIPELINE_STATES.PENDING_VOID],
  [PIPELINE_STATES.NEEDS_SCHEDULING]: [PIPELINE_STATES.SCHEDULED, PIPELINE_STATES.SENT, PIPELINE_STATES.LOST, PIPELINE_STATES.PENDING_VOID],
  [PIPELINE_STATES.SCHEDULED]: [PIPELINE_STATES.COMPLETED, PIPELINE_STATES.NEEDS_SCHEDULING, PIPELINE_STATES.LOST, PIPELINE_STATES.PENDING_VOID],
  [PIPELINE_STATES.COMPLETED]: [],
  [PIPELINE_STATES.LOST]: [],
  [PIPELINE_STATES.PENDING_VOID]: [PIPELINE_STATES.VOIDED, PIPELINE_STATES.SENT, PIPELINE_STATES.QUOTING, PIPELINE_STATES.NEW_LEAD, PIPELINE_STATES.NEEDS_SCHEDULING, PIPELINE_STATES.SCHEDULED],
  [PIPELINE_STATES.VOIDED]: []
};

function canTransition(current, next) {
  if (!METHODS_ENABLED) return true; // Safety hook bypass if needed globally
  return TRANSITIONS[current]?.includes(next);
}

const METHODS_ENABLED = true;

/**
 * Attempts to advance the opportunity. Safely rejects if state constraints are violated.
 */
async function executeTransition(jobId, currentState, targetState, additionalPayload = {}) {
  if (!canTransition(currentState, targetState)) {
      const msg = `Pipeline Error: Cannot transition Deal from '${currentState}' block -> '${targetState}'.`;
      console.warn(msg);
      throw new Error(msg);
  }
  const { data: opp } = await supabase.from('opportunities').select('*').eq('id', jobId).single();
  
  const { error } = await supabase.from('opportunities').update({ 
      status: targetState, 
      ...additionalPayload 
  }).eq('id', jobId);
  
  if (error) throw error;
  
  if (opp && opp.household_id && currentState !== targetState) {
      let activityType = null;
      let description = null;
      
      if (targetState === PIPELINE_STATES.NEEDS_SCHEDULING) {
          activityType = 'Contract Signed';
          description = 'Customer approved the proposal. Deal converted to active job.';
      } else if (targetState === PIPELINE_STATES.SCHEDULED) {
          activityType = 'Job Scheduled';
          description = 'Operations team successfully dispatched and scheduled this job.';
      } else if (targetState === PIPELINE_STATES.COMPLETED) {
          activityType = 'Job Completed';
          description = 'The installation/service team has marked this job as successfully completed.';
          
          // --- AUTOMATIC UNIT CREATION ---
          try {
             const { data: prop } = await supabase.from('proposals').select('id, proposal_data, amount').eq('associated_opportunity_id', jobId).single();
             const svcAddrId = opp.proposal_data?.service_address_id || opp.site_survey_data?.property_id || opp.site_survey_data?.service_address_id;
             if (prop && (prop.proposal_data?.accepted_tier_data || prop.proposal_data?.systemTiers) && svcAddrId) {
                 // Try to get tier data directly, or extract from first system tier
                 let tierData = prop.proposal_data.accepted_tier_data;
                 let systemName = "New System";
                 if (!tierData && prop.proposal_data.systemTiers && prop.proposal_data.systemTiers.length > 0) {
                     const sys = prop.proposal_data.systemTiers[0];
                     systemName = sys.systemName || sys.name || systemName;
                     const acceptedName = prop.proposal_data.accepted_tier_name || 'good';
                     tierData = sys.tiers?.[acceptedName.toLowerCase()] || {};
                 }
                 
                 if (tierData) {
                     const { data: addrData } = await supabase.from('addresses').select('property_details').eq('id', svcAddrId).single();
                     
                     if (addrData) {
                         const pd = addrData.property_details || {};
                         const units = pd.units || [];
                         const newUnitId = crypto.randomUUID();
                         
                         const specsText = [tierData.brand, tierData.tons ? tierData.tons + ' Ton' : null, tierData.seer ? tierData.seer + ' SEER' : null, tierData.series].filter(Boolean).join(' ');
                         
                         units.push({
                             id: newUnitId,
                             unit_number: systemName,
                             system_type: tierData.type || "Split System",
                             description: specsText || "Specs not provided",
                             history: [{
                                 id: crypto.randomUUID(),
                                 date: new Date().toISOString(),
                                 type: 'Installation',
                                 description: `Installed new equipment per Proposal #${prop.id}.`,
                                 cost: prop.amount || 0,
                                 technician: 'Operations Team'
                             }]
                         });
                         
                         await supabase.from('addresses').update({ property_details: { ...pd, units } }).eq('id', svcAddrId);
                         description += ` Successfully registered new unit '${systemName}' to the property records.`;
                     }
                 }
             }
          } catch(err) {
             console.error("Failed to auto-create unit from proposal:", err);
          }
      } else if (targetState === PIPELINE_STATES.SENT && currentState === PIPELINE_STATES.PENDING_VOID) {
          activityType = 'Pipeline Reverted';
          description = 'Deal was moved back to the Active Proposals board.';
      }
      
      if (activityType) {
          await supabase.from('activity_logs').insert({
              household_id: opp.household_id,
              opportunity_id: jobId,
              activity_type: activityType,
              description: description
          });
      }
  }
  
  return true;
}

export const PipelineController = {
  startProposal: (id, current) => executeTransition(id, current, PIPELINE_STATES.QUOTING),
  sendProposal: (id, current) => executeTransition(id, current, PIPELINE_STATES.SENT),
  approveDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.NEEDS_SCHEDULING, payload),
  scheduleDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.SCHEDULED, payload),
  completeDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.COMPLETED, payload),
  revertToSales: (id, current) => executeTransition(id, current, PIPELINE_STATES.SENT),
  markLost: async (id, current, householdId, reason) => {
      // Special logic: Log Activity
      if (householdId) {
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Deal Lost',
             description: `Deal marked as lost. Reason: ${reason}`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.LOST);
  },
  requestVoid: async (id, current, householdId, reason) => {
      if (householdId) {
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Void Requested',
             description: `Deal void requested. Reason: ${reason}`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.PENDING_VOID);
  },
  approveVoid: async (id, current, householdId) => {
      if (householdId) {
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Void Approved',
             description: `Admin approved the void request.`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.VOIDED);
  },
  denyVoid: async (id, current, householdId, returnState = PIPELINE_STATES.SENT) => {
      if (householdId) {
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Void Denied',
             description: `Admin denied the void request. Returning to active pipeline.`
          });
      }
      return executeTransition(id, current, returnState);
  },
  assignDeal: async (id, salespersonId, householdId, salespersonName) => {
      const { error } = await supabase.from('opportunities').update({ assigned_salesperson_id: salespersonId }).eq('id', id);
      if (!error && householdId) {
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Deal Assigned',
             description: `Deal #${id.split('-')[0]} was assigned to ${salespersonName || 'a sales representative'}.`
          });
      }
      if (error) throw error;
  }
};
