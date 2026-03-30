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
        setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));
        const { error } = await supabase.from('proposals').update(updatedData).eq('id', id);
        if (error) {
            console.error('Failed to update proposal:', error);
            fetchProposals();
        }
    };

    const deleteProposal = async (id) => {
        setProposals(prev => prev.filter(p => p.id !== id));
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
