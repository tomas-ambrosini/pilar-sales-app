import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { PipelineController, PIPELINE_STATES } from '../utils/pipelineControls';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { debounce } from '../utils/debounce';

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
                .select('*')
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
            
            if (!error && data) {
                const enriched = data.map(p => {
                    let profile = userMap[p.created_by];
                    if (!profile && p.created_by === user?.id) {
                        profile = { full_name: user?.user_metadata?.full_name || 'Me (Current User)' };
                    }
                    return {
                        ...p,
                        user_profiles: profile || { full_name: 'Unassigned' }
                    };
                });
                allData = enriched;
            }
            
            // ONE-TIME FIX for Orphaned Proposals that don't have an Opportunity
            if (user?.role === 'SUPER_ADMIN') {
                const orphaned = allData.filter(p => !p.associated_opportunity_id && ['Lead', 'Draft'].includes(p.status) && p.proposal_data?.wizard_state?.selectedCustomerId);
                if (orphaned.length > 0) {
                    console.log(`Auto-fixing ${orphaned.length} orphaned proposals...`);
                    for (const prop of orphaned) {
                        const householdId = prop.proposal_data.wizard_state.selectedCustomerId;
                        const { data: newOpp } = await supabase.from('opportunities').insert([{
                            household_id: householdId,
                            status: PIPELINE_STATES.QUOTING,
                            urgency_level: 'Low',
                            issue_description: 'Auto-generated Opportunity for legacy drafted Proposal',
                            assigned_salesperson_id: prop.created_by || user.id,
                            proposal_data: { type: 'SALES' },
                            is_active: true
                        }]).select('id').single();
                        
                        if (newOpp) {
                            const updatedData = { ...prop.proposal_data, associated_opportunity_id: newOpp.id };
                            if (updatedData.wizard_state) updatedData.wizard_state.associated_opportunity_id = newOpp.id;
                            await supabase.from('proposals').update({
                                associated_opportunity_id: newOpp.id,
                                proposal_data: updatedData
                            }).eq('id', prop.id);
                            
                            prop.associated_opportunity_id = newOpp.id;
                            prop.proposal_data = updatedData;
                        }
                    }
                }
            }
            
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
        const debouncedFetch = debounce(fetchProposals, 1000);
        const channel = supabase.channel('realtime_proposals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, payload => {
                debouncedFetch(); // Re-fetch on any change
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProposals, user]);

    // Creates a draft natively in the DB without optimistic UI flooding
    const createDraft = async (draftData) => {
        const newId = crypto.randomUUID();
        let finalOppId = draftData.associated_opportunity_id || null;

        if (!finalOppId && draftData.proposal_data?.wizard_state?.selectedCustomerId) {
            const { data: newOpp, error: oppErr } = await supabase.from('opportunities').insert([{
                household_id: draftData.proposal_data.wizard_state.selectedCustomerId,
                service_address_id: draftData.proposal_data.wizard_state.selectedLocationId || null,
                status: PIPELINE_STATES.QUOTING,
                urgency_level: 'Low',
                issue_description: 'Auto-generated Opportunity from Proposal Wizard',
                assigned_salesperson_id: user?.id,
                proposal_data: { type: 'SALES' },
                is_active: true
            }]).select('id').single();
            
            if (newOpp && !oppErr) {
                finalOppId = newOpp.id;
                
                // Update the draftData payload so the proposal links to this new opp
                if (!draftData.proposal_data) draftData.proposal_data = {};
                draftData.proposal_data.associated_opportunity_id = finalOppId;
                if (draftData.proposal_data.wizard_state) {
                    draftData.proposal_data.wizard_state.associated_opportunity_id = finalOppId;
                }
            }
        }

        const newDraft = {
            id: newId,
            status: draftData.status || 'Draft',
            customer: draftData.customer || 'Unknown Customer',
            amount: draftData.amount || 0,
            associated_opportunity_id: finalOppId,
            proposal_data: draftData.proposal_data || null,
            created_by: user?.id,
            updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase.from('proposals')
            .insert([newDraft])
            .select('*')
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
        if (data) {
            data.user_profiles = { full_name: user?.full_name || user?.user_metadata?.full_name || user?.email || 'Unknown' };
        }
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
            .select('*')
            .single();
        
        if (error) {
            console.error('Failed to create proposal live:', error);
            // Revert on failure by refreshing the real list
            fetchProposals();
            return null;
        } else {
            // Update local UI state with the exact database response
            if (data) {
                data.user_profiles = { full_name: user?.full_name || user?.user_metadata?.full_name || user?.email || 'Unknown' };
            }
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
        const oppId = oldProposal?.associated_opportunity_id || oldProposal?.proposal_data?.associated_opportunity_id;
        
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
                const { data: oppData } = await supabase.from('opportunities').select('status, service_address_id').eq('id', oppId).single();
                if (oppData) {
                    if (updatedData.status === 'Approved') {
                        await PipelineController.approveDeal(oppId, oppData.status);
                        
                        // AUTOMATION: Automatically register sold units to the customer's property history
                        if (oppData.service_address_id) {
                            try {
                                const propData = updatedData.proposal_data || oldProposal.proposal_data;
                                const amount = updatedData.amount || oldProposal.amount;
                                
                                const { data: addressData } = await supabase.from('addresses').select('property_details').eq('id', oppData.service_address_id).single();
                                
                                if (addressData) {
                                    const currentDetails = addressData.property_details || {};
                                    const existingUnits = currentDetails.units || [];
                                    const newUnits = [];
                                    
                                    // Helper function to extract exact system name from tier
                                    const getSystemTierName = () => {
                                        if (!propData?.tiers) return 'Premium System';
                                        const matchedTierName = Object.keys(propData.tiers).find(t => propData.tiers[t]?.salesPrice === amount) || 'good';
                                        return `${matchedTierName.charAt(0).toUpperCase() + matchedTierName.slice(1)} System`;
                                    };

                                    if (propData?.systemTiers && propData.systemTiers.length > 0) {
                                        // Complex proposal with explicitly named multi-systems
                                        propData.systemTiers.forEach(sys => {
                                            newUnits.push({
                                                id: crypto.randomUUID(),
                                                unit_number: sys.systemName || sys.name || 'New Install',
                                                system_type: 'Installed System',
                                                description: `System installed from Proposal`,
                                                history: [
                                                    {
                                                        id: crypto.randomUUID(),
                                                        date: new Date().toISOString(),
                                                        type: 'Installation',
                                                        technician: 'Installation Crew',
                                                        cost: amount / propData.systemTiers.length, // Split cost approximately if multiple
                                                        description: `System sold and installed via Proposal approval.`
                                                    }
                                                ]
                                            });
                                        });
                                    } else {
                                        // Standard Proposal (Single System)
                                        newUnits.push({
                                            id: crypto.randomUUID(),
                                            unit_number: 'New Install',
                                            system_type: getSystemTierName(),
                                            description: `System installed from Proposal`,
                                            history: [
                                                {
                                                    id: crypto.randomUUID(),
                                                    date: new Date().toISOString(),
                                                    type: 'Installation',
                                                    technician: 'Installation Crew',
                                                    cost: amount,
                                                    description: `System sold and installed via Proposal approval.`
                                                }
                                            ]
                                        });
                                    }
                                    
                                    await supabase.from('addresses').update({
                                        property_details: {
                                            ...currentDetails,
                                            units: [...existingUnits, ...newUnits]
                                        }
                                    }).eq('id', oppData.service_address_id);
                                }
                            } catch (autoErr) {
                                console.warn('Automation failed to create unit:', autoErr.message);
                            }
                        }
                    }
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

    const contextValue = useMemo(() => ({ proposals, createDraft, addProposal, updateProposal, deleteProposal, loading }), [proposals, loading]);

    return (
        <ProposalContext.Provider value={contextValue}>
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
