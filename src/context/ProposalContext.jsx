import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ProposalContext = createContext(null);

export function ProposalProvider({ children }) {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch initial data from Supabase
    useEffect(() => {
        fetchProposals();
        
        // Setup Realtime Subscription
        const channel = supabase.channel('realtime_proposals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, payload => {
                fetchProposals(); // Re-fetch on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchProposals = async () => {
        try {
            const { data, error } = await supabase
                .from('proposals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setProposals(data);
        } catch (error) {
            console.error('Error fetching proposals:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addProposal = async (proposalData) => {
        // Generate new PR ID locally for visual immediate feedback
        const ids = proposals.map(p => parseInt(p.id.replace('PR-', ''))).filter(n => !isNaN(n));
        const nextNum = Math.max(1044, ...ids, 0) + 1;
        const nextId = `PR-${nextNum}`;

        const newProposal = {
            id: nextId,
            customer: proposalData.customer,
            amount: proposalData.amount,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Sent',
            proposal_data: proposalData.proposal_data || null
        };

        // Optimistic UI update
        setProposals(prev => [newProposal, ...prev]);

        // Push to live Supabase database
        const { error } = await supabase.from('proposals').insert([newProposal]);
        
        if (error) {
            console.error('Failed to create proposal live:', error);
            fetchProposals(); // Revert on failure
        }
    };

    const updateProposal = async (id, updatedData) => {
        const oldProposal = proposals.find(p => p.id === id);
        const oppId = oldProposal?.proposal_data?.associated_opportunity_id;
        
        setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
        const { error } = await supabase.from('proposals').update(updatedData).eq('id', id);
        
        if (error) {
            console.error('Failed to update proposal:', error);
            fetchProposals();
            return;
        }
        
        // Auto-sync status to Pipeline Opportunity
        if (updatedData.status && oppId) {
            let newOppStatus;
            if (updatedData.status === 'Approved') newOppStatus = 'Deal Won';
            else if (updatedData.status === 'Declined') newOppStatus = 'Lost';
            else if (['Sent', 'Opened'].includes(updatedData.status)) newOppStatus = 'Proposal Sent';

            if (newOppStatus) {
                const { error: syncError } = await supabase.from('opportunities').update({ status: newOppStatus }).eq('id', oppId);
                if (syncError) console.error('Pipeline Sync Error:', syncError);
            }
        }
    };

    const deleteProposal = async (id) => {
        const oldProposal = proposals.find(p => p.id === id);
        const oppId = oldProposal?.proposal_data?.associated_opportunity_id;

        setProposals(prev => prev.filter(p => p.id !== id));
        
        // Always attempt to delete associated downstream records to keep Kanban and Dispatch Hub synced
        try {
            // Priority 1: Clear Operations/Dispatch first to avoid Opportunity constraint violations
            await supabase.from('work_orders').delete().eq('proposal_id', id);
            
            // Priority 2: Clear Sales Pipeline deal
            if (oppId) {
                await supabase.from('opportunities').delete().eq('id', oppId);
            }
        } catch (e) {
            console.warn('Silent issue cascading delete, but continuing to delete proposal:', e);
        }

        const { error } = await supabase.from('proposals').delete().eq('id', id);
        if (error) {
            console.error('Failed to delete proposal:', error);
            fetchProposals();
        }
    };

    return (
        <ProposalContext.Provider value={{ proposals, addProposal, updateProposal, deleteProposal, loading }}>
            {children}
        </ProposalContext.Provider>
    );
}

export function useProposals() {
    const context = useContext(ProposalContext);
    if (!context) {
        throw new Error('useProposals must be used within a ProposalProvider');
    }
    return context;
}
