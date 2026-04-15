import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PipelineController } from '../utils/pipelineControls';
import toast from 'react-hot-toast';

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
                .select('*, user_profiles(full_name)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setProposals(data);
        } catch (error) {
            console.error('Error fetching proposals:', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Creates a draft natively in the DB without optimistic UI flooding
    const createDraft = async (draftData) => {
        const newId = crypto.randomUUID();
        const newDraft = {
            id: newId,
            status: 'Draft',
            customer: draftData.customer || 'Unknown Customer',
            amount: draftData.amount || 0,
            associated_opportunity_id: draftData.associated_opportunity_id || null,
            proposal_data: draftData.proposal_data || null,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase.from('proposals')
            .insert([newDraft])
            .select('*, user_profiles(full_name)')
            .single();
            
        if (error) {
            console.error('Failed to create draft proposal:', error);
            return null;
        }
        
        if (draftData.associated_opportunity_id) {
            try {
               await PipelineController.startProposal(draftData.associated_opportunity_id, draftData.associated_opportunity_status);
            } catch (e) {
               console.warn("Pipeline transition caught: ", e.message);
            }
        }

        // Push secretly into local memory without triggering major UI snapping
        setProposals(prev => [data, ...prev]);
        return data; 
    };

    const addProposal = async (proposalData) => {
        // Generate new PR UUID locally, letting Postgres DB handle proposal_number sequence natively
        const nextId = crypto.randomUUID();

        const newProposal = {
            id: nextId,
            customer: proposalData.customer,
            amount: proposalData.amount,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Sent',
            associated_opportunity_id: proposalData.associated_opportunity_id || null,
            proposal_data: proposalData.proposal_data || null,
            updated_at: new Date().toISOString()
        };

        // Insert to live Supabase database and retrieve joined profile data
        const { data, error } = await supabase.from('proposals')
            .insert([newProposal])
            .select('*, user_profiles(full_name)')
            .single();
        
        if (error) {
            console.error('Failed to create proposal live:', error);
            // Revert on failure by refreshing the real list
            fetchProposals(); 
        } else {
            // Update local UI state with the exact database response (so user_profiles is included)
            setProposals(prev => [data, ...prev]);

            if (proposalData.associated_opportunity_id) {
                try {
                    await PipelineController.sendProposal(proposalData.associated_opportunity_id, proposalData.associated_opportunity_status);
                } catch (e) {
                    console.warn("Skipped transition: ", e.message);
                }
            }
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
        
        // Auto-sync status to Pipeline Opportunity strictly through Execution controls
        if (updatedData.status && oppId) {
            try {
                if (updatedData.status === 'Approved') await PipelineController.approveDeal(oppId, 'PROPOSAL_SENT');
                else if (updatedData.status === 'Lost') await PipelineController.markLost(oppId, 'PROPOSAL_SENT', null, updatedData.proposal_data?.lost_reason || 'Proposal Lost');
                else if (['Sent', 'Opened'].includes(updatedData.status)) await PipelineController.sendProposal(oppId, 'PROPOSAL_BUILDING');
            } catch (syncError) {
                console.warn('Pipeline Sync Warning:', syncError.message);
            }
        }
    };

    const deleteProposal = async (id) => {
        const oldProposal = proposals.find(p => p.id === id);
        if (!oldProposal) return;
        const oppId = oldProposal?.proposal_data?.associated_opportunity_id;

        // Optimistic UI update
        setProposals(prev => prev.filter(p => p.id !== id));
        
        try {
            // Explicitly scrape any nested comments before deleting
            await supabase.from('proposal_comments').delete().eq('proposal_id', id);

            // Fully wipe proposal first
            const { data, error } = await supabase.from('proposals').delete().eq('id', id).select();

            if (error) {
                console.error('Failed to delete proposal (Error object):', error);
                alert(`Supabase Error: ${error.message}`);
                fetchProposals();
                return;
            }

            if (!data || data.length === 0) {
                console.warn('Failed to delete proposal: 0 rows affected (RLS constraint)');
                alert('Database Warning: Deletion failed because the row was locked or access was restricted by Postgres RLS.');
                fetchProposals();
                return;
            }

            // Wipe generated architectural constraints in downstream systems
            if (oppId) {
                await supabase.from('work_orders').delete().eq('opportunity_id', oppId);
                const { error: oppError } = await supabase.from('opportunities').delete().eq('id', oppId);
                if (oppError) {
                    console.log('Opportunity cleanup deferred:', oppError.message);
                }
            }
        } catch (err) {
            console.error('Fatal Javascript Exception during deletion:', err);
            alert(`JS Error: ${err.message}`);
            fetchProposals();
        }
    };

    return (
        <ProposalContext.Provider value={{ proposals, createDraft, addProposal, updateProposal, deleteProposal, loading }}>
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
