import { supabase } from '../supabaseClient';

export const PIPELINE_STATES = {
  NEW_LEAD: 'NEW_LEAD',
  CONTACTED: 'CONTACTED',
  SURVEY_SCHEDULED: 'SURVEY_SCHEDULED',
  PROPOSAL_BUILDING: 'PROPOSAL_BUILDING',
  PROPOSAL_SENT: 'PROPOSAL_SENT',
  APPROVED: 'APPROVED',
  LOST: 'LOST'
};

const TRANSITIONS = {
  [PIPELINE_STATES.NEW_LEAD]: [PIPELINE_STATES.CONTACTED, PIPELINE_STATES.LOST],
  [PIPELINE_STATES.CONTACTED]: [PIPELINE_STATES.SURVEY_SCHEDULED, PIPELINE_STATES.PROPOSAL_BUILDING, PIPELINE_STATES.LOST],
  [PIPELINE_STATES.SURVEY_SCHEDULED]: [PIPELINE_STATES.PROPOSAL_BUILDING, PIPELINE_STATES.LOST],
  [PIPELINE_STATES.PROPOSAL_BUILDING]: [PIPELINE_STATES.PROPOSAL_SENT, PIPELINE_STATES.LOST],
  [PIPELINE_STATES.PROPOSAL_SENT]: [PIPELINE_STATES.APPROVED, PIPELINE_STATES.LOST],
  [PIPELINE_STATES.APPROVED]: [PIPELINE_STATES.PROPOSAL_SENT],
  [PIPELINE_STATES.LOST]: []
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
  
  const { error } = await supabase.from('opportunities').update({ 
      status: targetState, 
      ...additionalPayload 
  }).eq('id', jobId);
  
  if (error) throw error;
  return true;
}

export const PipelineController = {
  markContacted: (id, current) => executeTransition(id, current, PIPELINE_STATES.CONTACTED),
  scheduleSurvey: (id, current) => executeTransition(id, current, PIPELINE_STATES.SURVEY_SCHEDULED),
  startProposal: (id, current) => executeTransition(id, current, PIPELINE_STATES.PROPOSAL_BUILDING),
  sendProposal: (id, current) => executeTransition(id, current, PIPELINE_STATES.PROPOSAL_SENT),
  approveDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.APPROVED, payload),
  revertToSales: (id, current) => executeTransition(id, current, PIPELINE_STATES.PROPOSAL_SENT),
  markLost: async (id, current, householdId, reason) => {
      // Special logic: Log Activity
      if (householdId) {
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             activity_type: 'Deal Lost',
             description: `Deal marked as lost. Reason: ${reason}`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.LOST);
  }
};
