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
  
  if (opp?.status !== currentState) {
      const msg = `Pipeline Sync Error: Deal status changed behind the scenes (expected ${currentState}, got ${opp?.status}). Refreshing is required.`;
      console.warn(msg);
      throw new Error(msg);
  }
  
  const { error } = await supabase.from('opportunities').update({ 
      status: targetState, 
      ...additionalPayload 
  }).eq('id', jobId).eq('status', currentState);
  
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
          
          // --- AUTOMATIC UNIT CREATION REMOVED ---
          // Per Phase 3 directive, Operations team must manually register units to ensure accuracy.
      } else if (targetState === PIPELINE_STATES.SENT && currentState === PIPELINE_STATES.PENDING_VOID) {
          activityType = 'Pipeline Reverted';
          description = 'Deal was moved back to the Active Proposals board.';
      } else if (targetState === PIPELINE_STATES.SENT && currentState !== PIPELINE_STATES.PENDING_VOID) {
          activityType = 'Deal Proposed';
          description = 'Digital proposal finalized and marked as Sent.';
      }
      
      if (activityType) {
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single();
                  const userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
                  if (userName) {
                      description += ` (Action taken by: ${userName})`;
                  }
              }
          } catch(e) {
              console.error("Failed to append user name to audit log:", e);
          }

          const { error: logError } = await supabase.from('activity_logs').insert({
              household_id: opp.household_id,
              opportunity_id: jobId,
              activity_type: activityType,
              description: description
          });
          
          // ROLLBACK if the transaction fails partially
          if (logError) {
              console.error("Failed to insert activity log, but continuing pipeline transition:", logError.message);
          }
      }
  }
  
  return true;
}

export const PipelineController = {
  startProposal: (id, current) => executeTransition(id, current, PIPELINE_STATES.QUOTING),
  sendProposal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.SENT, payload),
  approveDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.NEEDS_SCHEDULING, payload),
  scheduleDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.SCHEDULED, payload),
  completeDeal: (id, current, payload = {}) => executeTransition(id, current, PIPELINE_STATES.COMPLETED, payload),
  revertToSales: (id, current) => executeTransition(id, current, PIPELINE_STATES.SENT),
  markLost: async (id, current, householdId, reason) => {
      // Special logic: Log Activity
      if (householdId) {
          let userName = '';
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single();
                  userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
              }
          } catch(_) {}
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Deal Lost',
             description: `Deal marked as lost. Reason: ${reason}${userName ? ` (Action taken by: ${userName})` : ''}`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.LOST);
  },
  requestVoid: async (id, current, householdId, reason) => {
      if (householdId) {
          let userName = '';
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single();
                  userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
              }
          } catch(_) {}
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Void Requested',
             description: `Deal void requested. Reason: ${reason}${userName ? ` (Action taken by: ${userName})` : ''}`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.PENDING_VOID);
  },
  approveVoid: async (id, current, householdId) => {
      if (householdId) {
          let userName = 'Admin';
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single();
                  userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
              }
          } catch(_) {}
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Void Approved',
             description: `Admin approved the void request. (Action taken by: ${userName})`
          });
      }
      return executeTransition(id, current, PIPELINE_STATES.VOIDED);
  },
  denyVoid: async (id, current, householdId, returnState = PIPELINE_STATES.SENT) => {
      if (householdId) {
          let userName = 'Admin';
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                  const { data: profile } = await supabase.from('user_profiles').select('full_name').eq('id', session.user.id).single();
                  userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email;
              }
          } catch(_) {}
          await supabase.from('activity_logs').insert({
             household_id: householdId,
             opportunity_id: id,
             activity_type: 'Void Denied',
             description: `Admin denied the void request. Returning to active pipeline. (Action taken by: ${userName})`
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
