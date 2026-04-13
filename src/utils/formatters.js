export const formatQuoteId = (proposal) => {
    if (!proposal) return 'UNKNOWN';
    
    let rawId = '';
    
    // Check if there is an existing proposal_number. 
    // If it already looks like "P2026-...", just return it directly
    if (proposal.proposal_number && String(proposal.proposal_number).startsWith('P')) {
         return String(proposal.proposal_number);
    } else if (proposal.proposal_number) {
         rawId = String(proposal.proposal_number);
    } else if (proposal.id) {
         rawId = String(proposal.id);
    }
    
    if (!rawId) return 'UNKNOWN';
    
    // Fallback for legacy IDs (or numeric proposal_numbers)
    const dateSafe = new Date(proposal.created_at || proposal.updated_at || Date.now());
    const year = dateSafe.getFullYear();
    
    // If the legacy ID is fundamentally short (like '26') or numeric-looking
    if (rawId.length < 10) {
        return `P${year}-${rawId.padStart(6, '0')}-TEST`;
    }
    
    // If it's a long UUID
    return `P${year}-${rawId.substring(0, 8).toUpperCase()}-TEST`;
};
