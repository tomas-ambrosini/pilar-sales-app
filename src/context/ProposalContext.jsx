import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PipelineController, PIPELINE_STATES } from '../utils/pipelineControls';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const ProposalContext = createContext(null);

export function ProposalProvider({ children }) {
    const { user } = useAuth();
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProposals = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        
        try {
            let query = supabase
                .from('proposals')
                .select('*, user_profiles(full_name)')
                .order('created_at', { ascending: false });

            if (user.role === 'SALES') {
                query = query.eq('created_by', user.id);
            } else if (user.role === 'MANAGER' || user.role === 'SUPER_ADMIN') {
                query = query.or(`created_by.eq.${user.id},status.neq.Draft`);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch Opportunities that are NEW_LEAD and SALES type
            const { data: leadData, error: leadErr } = await supabase
                .from('opportunities')
                .select(`id, urgency_level, issue_description, created_at, proposal_data, household_id, assigned_salesperson_id, households(id, household_name)`)
                .in('status', [PIPELINE_STATES.NEW_LEAD, PIPELINE_STATES.QUOTING])
                .eq('is_active', true);

            if (leadErr) console.warn("Failed to fetch leads for proposals: ", leadErr.message);

            // Fetch user profiles for manual join since foreign key might not exist
            const { data: usersData } = await supabase.from('user_profiles').select('id, full_name');
            const userMap = {};
            if (usersData) usersData.forEach(u => userMap[u.id] = u);

            let allData = data || [];
            
            if (leadData) {
                const mappedLeads = leadData
                    .filter(opp => opp.proposal_data?.type !== 'SERVICE')
                    .filter(opp => !allData.some(p => p.associated_opportunity_id === opp.id || p.proposal_data?.associated_opportunity_id === opp.id))
                    .map(opp => ({
                    id: opp.id, // Using opportunity ID as proposal ID for lead cards
                    is_lead: true,
                    status: 'Lead',
                    customer: (opp.households?.household_name || 'Unknown').replace(/ Account$/i, '').trim(),
                    amount: 0,
                    date: new Date(opp.created_at).toISOString(),
                    created_at: opp.created_at,
                    associated_opportunity_id: opp.id,
                    user_profiles: userMap[opp.assigned_salesperson_id] || null,
                    proposal_data: {
                        urgency: opp.urgency_level,
                        notes: opp.issue_description,
                        household_id: opp.household_id || opp.households?.id
                    }
                }));
                allData = [...mappedLeads, ...allData];
            }

            setProposals(allData);
        } catch (error) {
            console.error('Error fetching proposals:', error.message);
            toast.error('Failed to sync pipeline visibility.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch initial data from Supabase
    useEffect(() => {
        if (!user) return;
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
    }, [fetchProposals, user]);

    // Creates a draft natively in the DB without optimistic UI flooding
    const createDraft = async (draftData) => {
        const newId = crypto.randomUUID();
        const newDraft = {
            id: newId,
            status: draftData.status || 'Draft',
            customer: draftData.customer || 'Unknown Customer',
            amount: draftData.amount || 0,
            associated_opportunity_id: draftData.associated_opportunity_id || null,
            proposal_data: draftData.proposal_data || null,
            created_by: user?.id,
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
               const { data: oppData } = await supabase.from('opportunities').select('status').eq('id', draftData.associated_opportunity_id).single();
               if (oppData) await PipelineController.startProposal(draftData.associated_opportunity_id, oppData.status);
            } catch (e) {
               console.warn("Pipeline transition caught: ", e.message);
            }
        }

        // Push secretly into local memory without triggering major UI snapping
        setProposals(prev => {
            const filtered = prev.filter(p => !(p.is_lead && p.associated_opportunity_id === draftData.associated_opportunity_id));
            return [data, ...filtered];
        });
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
            status: proposalData.status || 'Sent',
            associated_opportunity_id: proposalData.associated_opportunity_id || null,
            proposal_data: proposalData.proposal_data || null,
            created_by: user?.id,
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
            return null;
        } else {
            // Update local UI state with the exact database response (so user_profiles is included)
            setProposals(prev => {
                const filtered = prev.filter(p => !(p.is_lead && p.associated_opportunity_id === proposalData.associated_opportunity_id));
                return [data, ...filtered];
            });

            if (proposalData.associated_opportunity_id) {
                try {
                    const { data: oppData } = await supabase.from('opportunities').select('status').eq('id', proposalData.associated_opportunity_id).single();
                    if (oppData) await PipelineController.sendProposal(proposalData.associated_opportunity_id, oppData.status);
                } catch (e) {
                    console.warn("Skipped transition: ", e.message);
                }
            }
            return data;
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
                const { data: oppData } = await supabase.from('opportunities').select('status').eq('id', oppId).single();
                if (oppData) {
                    if (updatedData.status === 'Approved') await PipelineController.approveDeal(oppId, oppData.status);
                    else if (updatedData.status === 'Lost') await PipelineController.markLost(oppId, oppData.status, null, updatedData.proposal_data?.lost_reason || 'Proposal Lost');
                    else if (['Sent', 'Opened'].includes(updatedData.status)) await PipelineController.sendProposal(oppId, oppData.status);
                    else if (updatedData.status === 'Pending Void') await PipelineController.requestVoid(oppId, oppData.status, null, updatedData.proposal_data?.void_reason || 'Void Requested');
                    else if (updatedData.status === 'Voided') await PipelineController.approveVoid(oppId, oppData.status, null);
                }
            } catch (syncError) {
                console.warn('Pipeline Sync Warning:', syncError.message);
            }
        }
    };

    const deleteProposal = async (id) => {
        const oldProposal = proposals.find(p => p.id === id);
        if (!oldProposal) return;
        const oppId = oldProposal?.associated_opportunity_id || oldProposal?.proposal_data?.associated_opportunity_id;

        // Optimistic UI update
        setProposals(prev => prev.filter(p => p.id !== id));
        
        try {
            if (oldProposal.is_lead) {
                // Lead cards don't exist in the proposals table yet, so skip straight to opportunity cleanup
                if (oppId) {
                    await supabase.from('work_orders').delete().eq('opportunity_id', oppId);
                    await supabase.from('opportunities').delete().eq('id', oppId);
                }
                fetchProposals();
                return;
            }

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
