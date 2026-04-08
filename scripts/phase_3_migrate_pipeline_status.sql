-- Phase 3: Normalize Opportunity Statuses to Strict Enums

-- 1. NEW_LEAD
UPDATE opportunities 
SET status = 'NEW_LEAD' 
WHERE status = 'New Lead';

-- 2. CONTACTED
UPDATE opportunities 
SET status = 'CONTACTED' 
WHERE status IN ('Contact Attempted', 'Contacted');

-- 3. SURVEY_SCHEDULED
UPDATE opportunities 
SET status = 'SURVEY_SCHEDULED' 
WHERE status = 'Site Survey Scheduled';

-- 4. PROPOSAL_BUILDING
UPDATE opportunities 
SET status = 'PROPOSAL_BUILDING' 
WHERE status IN ('Proposal Building', 'Building Quote');

-- 5. PROPOSAL_SENT
UPDATE opportunities 
SET status = 'PROPOSAL_SENT' 
WHERE status = 'Proposal Sent';

-- 6. APPROVED
UPDATE opportunities 
SET status = 'APPROVED' 
WHERE status IN ('Deal Won / Setup', 'Deal Won', 'Approved');

-- 7. LOST
UPDATE opportunities 
SET status = 'LOST' 
WHERE status IN ('Lost Deal', 'Lost');
