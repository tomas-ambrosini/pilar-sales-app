export const formatQuoteId = (proposal) => {
    if (!proposal) return 'UNKNOWN';
    if (proposal.proposal_number) return proposal.proposal_number;
    
    // Fallback for legacy IDs that don't have a proposal_number yet
    const idSafe = proposal.id ? String(proposal.id) : '';
    const dateSafe = new Date(proposal.created_at || proposal.updated_at || Date.now());
    const year = dateSafe.getFullYear();
    
    // If the legacy ID is fundamentally short (like '26') or numeric-looking
    if (idSafe.length < 10) {
        return `P${year}-${idSafe.padStart(6, '0')}-TEST`;
    }
    
    // If it's a long UUID
    return `P${year}-${idSafe.substring(0, 8).toUpperCase()}-TEST`;
};
