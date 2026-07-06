-- Phase 3 Migrations: Database Integrity & Concurrency

-- 1. Atomic JSONB Dispatch Notes Update
CREATE OR REPLACE FUNCTION update_dispatch_notes(opp_id UUID, new_notes TEXT)
RETURNS VOID AS $$
BEGIN
  -- If proposal_data is null, initialize it. If not, safely set the dispatch_notes key.
  UPDATE opportunities
  SET proposal_data = COALESCE(proposal_data, '{}'::jsonb) || jsonb_build_object('dispatch_notes', new_notes)
  WHERE id = opp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomic Pipeline Transition
CREATE OR REPLACE FUNCTION execute_pipeline_transition(
  job_id UUID,
  current_state TEXT,
  target_state TEXT,
  target_household_id UUID,
  act_type TEXT,
  act_desc TEXT,
  add_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  rows_affected INT;
BEGIN
  -- 1. Update the Opportunity state (Atomically ensures it hasn't changed behind our backs)
  UPDATE opportunities
  SET 
    status = target_state,
    proposal_data = COALESCE(proposal_data, '{}'::jsonb) || COALESCE(add_payload, '{}'::jsonb)
  WHERE id = job_id AND status = current_state;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;

  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'Pipeline Sync Error: Deal status changed behind the scenes or job does not exist. Refreshing is required.';
  END IF;

  -- 2. Insert Activity Log
  IF act_type IS NOT NULL AND target_household_id IS NOT NULL THEN
    INSERT INTO activity_logs (household_id, opportunity_id, activity_type, description)
    VALUES (target_household_id, job_id, act_type, act_desc);
  END IF;
  
  -- Both steps succeed, or both steps fail!
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
