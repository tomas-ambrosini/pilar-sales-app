CREATE OR REPLACE FUNCTION trigger_quote_accepted()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to 'Approved'
    IF NEW.status = 'Approved' AND OLD.status IS DISTINCT FROM 'Approved' THEN
        -- Safely notify the salesperson who created the proposal
        IF NEW.created_by IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, type, entity_type, entity_id, title, message, link)
            VALUES (
                NEW.created_by,
                'quote_accepted',
                'proposal',
                NEW.id::uuid, -- CAST IT TO UUID TO PREVENT CRASH IF id IS TEXT
                'Quote Accepted! 🎉',
                'Your proposal #' || COALESCE(NEW.proposal_number::text, 'ID') || ' has been approved by the customer.',
                '/proposals'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
