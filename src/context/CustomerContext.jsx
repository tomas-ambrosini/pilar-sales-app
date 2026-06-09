import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
    const { user } = useAuth();
    const [customers, setCustomers] = useState([]);
    const [archivedCustomers, setArchivedCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomers();
        
        // Listen to changes on households, so when one is added we refresh
        const channel = supabase.channel('realtime_customers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, () => {
                fetchCustomers();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'addresses' }, () => {
                fetchCustomers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Ensure we fetch archived customers once the user is loaded (since it relies on role logic)
    useEffect(() => {
        if (user) {
            fetchArchivedCustomers();
        }
    }, [user]);

    const fetchCustomers = async () => {
        try {
            let { data, error } = await supabase
                .from('households')
                .select(`
                    id,
                    household_name,
                    active_maintenance_agreement,
                    tags,
                    created_at,
                    addresses!addresses_household_id_fkey ( id, street_address, city, state, zip, property_details, is_primary_residence ),
                    contacts ( id, first_name, last_name, primary_phone, email, role ),
                    opportunities ( id, status, urgency_level, issue_description, created_at, proposal_data, site_survey_data ),
                    work_orders ( id, work_order_number, status, urgency_level, created_at, opportunity_id )
                `)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                // If it's a schema error (missing is_active), fallback to standard fetch
                if (error.code === '42703' && error.message.includes('is_active')) {
                    console.warn("Soft-delete 'is_active' column missing from households. Falling back to legacy query.");
                    const legacyRes = await supabase
                        .from('households')
                        .select(`
                            id,
                            household_name,
                            active_maintenance_agreement,
                            tags,
                            created_at,
                            addresses!addresses_household_id_fkey ( id, street_address, city, state, zip, property_details, is_primary_residence ),
                            contacts ( id, first_name, last_name, primary_phone, email, role ),
                            opportunities ( id, status, urgency_level, issue_description, created_at, proposal_data, site_survey_data ),
                            work_orders ( id, work_order_number, status, urgency_level, created_at, opportunity_id )
                        `)
                        .order('created_at', { ascending: false });
                        
                    data = legacyRes.data;
                    if (legacyRes.error) throw legacyRes.error;
                } else {
                    console.error("FATAL FETCH CUSTOMERS ERROR:", error);
                    throw error;
                }
            }

            if (data) {
                // Map relational data into the flat structure the rest of Pilar Home expects
                const formatted = data.map(household => {
                    const primaryContact = household.contacts && household.contacts.length > 0 ? household.contacts[0] : {};
                    const locations = household.addresses && household.addresses.length > 0 ? household.addresses : [];
                    const primaryAddress = locations[0] || {};
                    const addressString = primaryAddress.street_address ? `${primaryAddress.street_address} ${primaryAddress.city ? ', ' + primaryAddress.city : ''}`.trim() : 'No address provided';
                    
                    return {
                        id: household.id, // Primary key is the Household ID
                        household_name: household.household_name,
                        name: `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim() || household.household_name,
                        email: primaryContact.email || '',
                        phone: primaryContact.primary_phone || '',
                        address: addressString, // Still keeping this as fallback string for old ui
                        locations: locations, // New Multi-Location Array
                        active_maintenance_agreement: household.active_maintenance_agreement || false,
                        tags: household.tags || [],
                        addedDate: new Date(household.created_at).toLocaleDateString(),
                        opportunities: household.opportunities || [],
                        work_orders: household.work_orders || [],
                        latestActivityDate: (() => {
                            let latest = null;
                            if (locations) {
                                locations.forEach(l => {
                                    l.property_details?.units?.forEach(u => {
                                        u.history?.forEach(h => {
                                            const hDate = new Date(h.date).getTime();
                                            if (!latest || hDate > latest) latest = hDate;
                                        });
                                    });
                                });
                            }
                            return latest;
                        })(),
                        searchIndex: (() => {
                            const parts = [
                                primaryContact.first_name, primaryContact.last_name, household.household_name,
                                primaryContact.email, primaryContact.primary_phone,
                                ...(household.tags || [])
                            ];
                            if (locations) {
                                locations.forEach(l => {
                                    parts.push(l.street_address, l.city);
                                    l.property_details?.units?.forEach(u => {
                                        parts.push(u.unit_number, u.system_type, u.brand, u.description, u.model_number, u.serial_number);
                                    });
                                });
                            }
                            return parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, '');
                        })(),
                        raw: household // Keep full relational data for advanced CRM views
                    };
                });
                setCustomers(formatted);
            }
        } catch (error) {
            console.error('Error fetching relational customers:', error.message);
            toast.error("Fetch Error: " + (error.message || JSON.stringify(error)));
        } finally {
            setLoading(false);
        }
    };

    const fetchArchivedCustomers = async () => {
        if (!user) return;
        // Temporarily, ONLY Manager/Super Admin can view archived customers
        // because ownership tracking on households is not perfectly enforced yet.
        if (user.role === 'SALES') {
            setArchivedCustomers([]);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('households')
                .select(`
                    id,
                    household_name,
                    active_maintenance_agreement,
                    tags,
                    created_at,
                    addresses!addresses_household_id_fkey ( id, street_address, city, state, zip, property_details, is_primary_residence ),
                    contacts ( id, first_name, last_name, primary_phone, email, role ),
                    opportunities ( id, status, urgency_level, issue_description, created_at, proposal_data, site_survey_data ),
                    work_orders ( id, work_order_number, status, urgency_level, created_at, opportunity_id )
                `)
                .eq('is_active', false)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) {
                const formatted = data.map(household => {
                    const primaryContact = household.contacts && household.contacts.length > 0 ? household.contacts[0] : {};
                    const locations = household.addresses && household.addresses.length > 0 ? household.addresses : [];
                    const primaryAddress = locations[0] || {};
                    const addressString = primaryAddress.street_address ? `${primaryAddress.street_address} ${primaryAddress.city ? ', ' + primaryAddress.city : ''}`.trim() : 'No address provided';
                    
                    return {
                        id: household.id,
                        household_name: household.household_name,
                        name: `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim() || household.household_name,
                        email: primaryContact.email || '',
                        phone: primaryContact.primary_phone || '',
                        address: addressString,
                        locations: locations,
                        active_maintenance_agreement: household.active_maintenance_agreement || false,
                        tags: household.tags || [],
                        addedDate: new Date(household.created_at).toLocaleDateString(),
                        opportunities: household.opportunities || [],
                        work_orders: household.work_orders || [],
                        latestActivityDate: (() => {
                            let latest = null;
                            if (locations) {
                                locations.forEach(l => {
                                    l.property_details?.units?.forEach(u => {
                                        u.history?.forEach(h => {
                                            const hDate = new Date(h.date).getTime();
                                            if (!latest || hDate > latest) latest = hDate;
                                        });
                                    });
                                });
                            }
                            return latest;
                        })(),
                        searchIndex: (() => {
                            const parts = [
                                primaryContact.first_name, primaryContact.last_name, household.household_name,
                                primaryContact.email, primaryContact.primary_phone,
                                ...(household.tags || [])
                            ];
                            if (locations) {
                                locations.forEach(l => {
                                    parts.push(l.street_address, l.city);
                                    l.property_details?.units?.forEach(u => {
                                        parts.push(u.unit_number, u.system_type, u.brand, u.description, u.model_number, u.serial_number);
                                    });
                                });
                            }
                            return parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, '');
                        })(),
                        raw: household
                    };
                });
                setArchivedCustomers(formatted);
            }
        } catch (err) {
            console.error('Error fetching archived customers:', err.message);
        }
    };

    const addCustomer = async (customerData) => {
        try {
            // 0. Duplicate Detection
            if (customerData.email || customerData.phone) {
                const orQuery = [];
                if (customerData.email) orQuery.push(`email.eq."${customerData.email}"`);
                if (customerData.phone) orQuery.push(`primary_phone.eq."${customerData.phone}"`);
                
                if (orQuery.length > 0) {
                    const { data: duplicates } = await supabase
                        .from('contacts')
                        .select('household_id, first_name, last_name, email')
                        .or(orQuery.join(','))
                        .limit(1);

                    if (duplicates && duplicates.length > 0) {
                        return { 
                            success: false, 
                            duplicateId: duplicates[0].household_id, 
                            message: `A customer (${duplicates[0].first_name} ${duplicates[0].last_name}) already exists with this email or phone.` 
                        };
                    }
                }
            }

            // 1. Insert Household (Account) First so it gets an ID
            const { data: householdData, error: houseError } = await supabase.from('households')
                .insert({
                    household_name: customerData.name,
                    tags: customerData.tags || []
                })
                .select()
                .single();
            if (houseError) throw houseError;

            // 2. Insert Initial Address linked to Household
            let addressId = null;
            if (customerData.address) {
                const { data: addressData, error: addressError } = await supabase.from('addresses')
                    .insert({ 
                        street_address: customerData.address, 
                        city: '', state: '', zip: '',
                        household_id: householdData.id,
                        property_details: {},
                        is_primary_residence: true
                    })
                    .select()
                    .single();
                if (addressError) throw addressError;
                addressId = addressData.id;

                // Bind back legacy fallback
                await supabase.from('households').update({ service_address_id: addressId }).eq('id', householdData.id);
            }

            // 3. Insert Primary Contact
            const nameParts = (customerData.name || '').split(' ');
            const firstName = nameParts[0] || 'Unknown';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            
            const { error: contactError } = await supabase.from('contacts')
                .insert({
                    household_id: householdData.id,
                    first_name: firstName,
                    last_name: lastName,
                    primary_phone: customerData.phone || '',
                    email: customerData.email || ''
                });
            if (contactError) throw contactError;

            // Trigger optimistic refresh
            fetchCustomers();
            return { success: true, id: householdData.id };
        } catch (error) {
            console.error('Failed to create customer relations:', error);
            return { success: false, error: error.message };
        }
    };

    const updateCustomer = async (id, updatedData) => {
        try {
            // Optimistic fast update
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c));
            
            if (updatedData.tags) {
                await supabase.from('households').update({ tags: updatedData.tags }).eq('id', id);
            }
            if (updatedData.active_maintenance_agreement !== undefined) {
                await supabase.from('households').update({ active_maintenance_agreement: updatedData.active_maintenance_agreement }).eq('id', id);
            }
            
            const contactUpdates = {};
            if (updatedData.name) {
                const nameParts = (updatedData.name || '').split(' ');
                contactUpdates.first_name = nameParts[0] || 'Unknown';
                contactUpdates.last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
            }
            if (updatedData.email !== undefined) {
                contactUpdates.email = updatedData.email;
            }
            if (updatedData.phone !== undefined) {
                contactUpdates.primary_phone = updatedData.phone;
            }

            if (Object.keys(contactUpdates).length > 0) {
                const { data: updatedRows, error: updateErr } = await supabase.from('contacts')
                    .update(contactUpdates)
                    .eq('household_id', id)
                    .select('id');
                    
                if (updateErr) {
                    console.error("Supabase Contact Update Error:", updateErr);
                } else if (!updatedRows || updatedRows.length === 0) {
                    // LEGACY FIX: Customer has no contact row in the DB! We must force insert one.
                    await supabase.from('contacts').insert({ 
                        ...contactUpdates, 
                        household_id: id 
                    });
                }
            }
            
            fetchCustomers();
        } catch (e) {
            console.error("Failed to update customer", e);
        }
    };

    const updatePropertyDetails = async (addressId, newDetails) => {
        try {
            const { error } = await supabase.from('addresses').update({
                property_details: newDetails
            }).eq('id', addressId);

            if (error) throw error;
            fetchCustomers(); // Trigger global refresh to sync 
        } catch(e) {
            console.error("Failed to update property location specs", e);
        }
    };

    const addPropertyToCustomer = async (householdId, addressString) => {
        try {
            const { error } = await supabase.from('addresses').insert({
                household_id: householdId,
                street_address: addressString,
                city: '', state: '', zip: '',
                property_details: {},
                is_primary_residence: false
            });
            if (error) throw error;
            fetchCustomers();
            return { success: true };
        } catch (error) {
            console.error('Failed to add new property:', error);
            return { success: false, error: error.message };
        }
    };

    const addUnitToAddress = async (householdId, addressId, unitData) => {
        try {
            const customer = customers.find(c => c.id === householdId);
            const address = customer?.locations?.find(l => l.id === addressId);
            if (!address) throw new Error("Address not found");
            
            const currentDetails = address.property_details || {};
            const units = currentDetails.units || [];
            
            const newUnit = {
                id: crypto.randomUUID(),
                ...unitData,
                history: []
            };
            
            const newDetails = {
                ...currentDetails,
                units: [...units, newUnit]
            };
            
            await updatePropertyDetails(addressId, newDetails);
            return { success: true, unitId: newUnit.id };
        } catch (error) {
            console.error('Failed to add unit:', error);
            return { success: false, error: error.message };
        }
    };

    const updateUnit = async (householdId, addressId, unitId, unitData) => {
        try {
            const customer = customers.find(c => c.id === householdId);
            const address = customer?.locations?.find(l => l.id === addressId);
            if (!address) throw new Error("Address not found");
            
            const currentDetails = address.property_details || {};
            const units = currentDetails.units || [];
            
            const oldUnit = units.find(u => u.id === unitId);
            if (!oldUnit) throw new Error("Unit not found");
            
            const changes = [];
            if (unitData.unit_number && unitData.unit_number !== oldUnit.unit_number) changes.push(`Name changed from "${oldUnit.unit_number}" to "${unitData.unit_number}"`);
            if (unitData.system_type !== undefined && unitData.system_type !== oldUnit.system_type) changes.push(`Type changed from "${oldUnit.system_type || 'None'}" to "${unitData.system_type || 'None'}"`);
            if (unitData.brand !== undefined && unitData.brand !== oldUnit.brand) changes.push(`Brand changed to "${unitData.brand || 'None'}"`);
            if (unitData.tonnage !== undefined && unitData.tonnage !== oldUnit.tonnage) changes.push(`Tonnage changed to "${unitData.tonnage || 'None'}"`);
            if (unitData.seer !== undefined && unitData.seer !== oldUnit.seer) changes.push(`Efficiency changed to "${unitData.seer || 'None'}"`);
            if (unitData.description !== undefined && unitData.description !== oldUnit.description) changes.push(`Description updated`);
            
            let updatedHistory = oldUnit.history || [];
            if (changes.length > 0) {
                updatedHistory = [
                    ...updatedHistory,
                    {
                        id: crypto.randomUUID(),
                        type: 'System',
                        date: new Date().toISOString(),
                        description: `System specs updated: ${changes.join(', ')}.`,
                        technician: 'System Auto-Log',
                        cost: 0
                    }
                ];
            }
            
            const newDetails = {
                ...currentDetails,
                units: units.map(u => u.id === unitId ? { ...u, ...unitData, history: updatedHistory } : u)
            };
            
            await updatePropertyDetails(addressId, newDetails);
            return { success: true };
        } catch (error) {
            console.error('Failed to update unit:', error);
            return { success: false, error: error.message };
        }
    };

    const mergeUnits = async (householdId, addressId, targetUnitId, sourceUnitId) => {
        try {
            const customer = customers.find(c => c.id === householdId);
            const address = customer?.locations?.find(l => l.id === addressId);
            if (!address) throw new Error("Address not found");
            
            const currentDetails = address.property_details || {};
            const units = currentDetails.units || [];
            
            const targetUnit = units.find(u => u.id === targetUnitId);
            const sourceUnit = units.find(u => u.id === sourceUnitId);
            
            if (!targetUnit || !sourceUnit) throw new Error("Units not found");
            
            const mergeEvent = {
                id: crypto.randomUUID(),
                type: 'System',
                date: new Date().toISOString(),
                description: `Absorbed service history from legacy unit: ${sourceUnit.unit_number} (${sourceUnit.system_type || 'Unknown Type'}).`,
                technician: 'System Auto-Log',
                cost: 0,
                sourceUnitData: sourceUnit
            };
            
            const mergedHistory = [...(targetUnit.history || []), ...(sourceUnit.history || []), mergeEvent]
                .sort((a, b) => new Date(a.date) - new Date(b.date));
                
            const newUnits = units
                .filter(u => u.id !== sourceUnitId)
                .map(u => u.id === targetUnitId ? { ...u, history: mergedHistory } : u);
                
            const newDetails = {
                ...currentDetails,
                units: newUnits
            };
            
            await updatePropertyDetails(addressId, newDetails);
            return { success: true };
        } catch (error) {
            console.error('Failed to merge units:', error);
            return { success: false, error: error.message };
        }
    };

    const undoMerge = async (householdId, addressId, targetUnitId, eventId) => {
        try {
            const customer = customers.find(c => c.id === householdId);
            const address = customer?.locations?.find(l => l.id === addressId);
            if (!address) throw new Error("Address not found");
            
            const currentDetails = address.property_details || {};
            const units = currentDetails.units || [];
            
            const targetUnit = units.find(u => u.id === targetUnitId);
            if (!targetUnit) throw new Error("Unit not found");
            
            const mergeEvent = targetUnit.history?.find(e => e.id === eventId);
            if (!mergeEvent || !mergeEvent.sourceUnitData) throw new Error("Invalid merge event");
            
            const sourceUnitData = mergeEvent.sourceUnitData;
            
            const sourceHistoryIds = new Set(sourceUnitData.history?.map(e => e.id) || []);
            const newHistory = targetUnit.history.filter(e => e.id !== eventId && !sourceHistoryIds.has(e.id));
            
            const newUnits = units.map(u => u.id === targetUnitId ? { ...u, history: newHistory } : u);
            newUnits.push(sourceUnitData);
            
            const newDetails = {
                ...currentDetails,
                units: newUnits
            };
            
            await updatePropertyDetails(addressId, newDetails);
            return { success: true };
        } catch (error) {
            console.error('Failed to undo merge:', error);
            return { success: false, error: error.message };
        }
    };

    const deleteUnit = async (householdId, addressId, unitId) => {
        try {
            const customer = customers.find(c => c.id === householdId);
            const address = customer?.locations?.find(l => l.id === addressId);
            if (!address) throw new Error("Address not found");
            
            const currentDetails = address.property_details || {};
            const units = currentDetails.units || [];
            
            const newDetails = {
                ...currentDetails,
                units: units.filter(u => u.id !== unitId)
            };
            
            await updatePropertyDetails(addressId, newDetails);
            return { success: true };
        } catch (error) {
            console.error('Failed to delete unit:', error);
            return { success: false, error: error.message };
        }
    };

    const addHistoryToUnit = async (householdId, addressId, unitId, historyEvent) => {
        try {
            const customer = customers.find(c => c.id === householdId);
            const address = customer?.locations?.find(l => l.id === addressId);
            if (!address) throw new Error("Address not found");
            
            const currentDetails = address.property_details || {};
            const units = currentDetails.units || [];
            
            const newEvent = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                ...historyEvent
            };
            
            const newDetails = {
                ...currentDetails,
                units: units.map(u => {
                    if (u.id === unitId) {
                        return { ...u, history: [...(u.history || []), newEvent] };
                    }
                    return u;
                })
            };
            
            await updatePropertyDetails(addressId, newDetails);
            return { success: true };
        } catch (error) {
            console.error('Failed to add history to unit:', error);
            return { success: false, error: error.message };
        }
    };

    const deleteCustomer = async (id) => {
        try {
            // Optimistic delete
            setCustomers(prev => prev.filter(c => c.id !== id));
            
            // We no longer cascade delete records to preserve history.
            // We only soft-delete the top-level household record to hide it from the global directory.
            const { error } = await supabase.from('households').update({ is_active: false }).eq('id', id);
            if (error) throw error;

            fetchCustomers();
            fetchArchivedCustomers();
        } catch (error) {
            console.error('Failed to deeply delete household & dependencies:', error);
            fetchCustomers(); // Restore on fail
        }
    };

    const restoreCustomer = async (id) => {
        try {
            const { error } = await supabase.from('households').update({ is_active: true }).eq('id', id);
            if (error) throw error;

            fetchCustomers();
            fetchArchivedCustomers();
        } catch (error) {
            console.error('Failed to restore customer:', error);
        }
    };

    const forceDeleteCustomer = async (id) => {
        try {
            // Perform explicit cascading deletes to prevent Foreign Key constraint blocks
            await supabase.from('opportunities').delete().eq('household_id', id);
            await supabase.from('work_orders').delete().eq('household_id', id);
            await supabase.from('contacts').delete().eq('household_id', id);
            await supabase.from('addresses').delete().eq('household_id', id);
            
            const { error } = await supabase.from('households').delete().eq('id', id);
            if (error) throw error;

            setArchivedCustomers(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Failed to force delete customer:', error);
            alert("Could not physically wipe customer data. It may be linked to unremovable financial records.");
        }
    };

    return (
        <CustomerContext.Provider value={{ customers, archivedCustomers, addCustomer, updateCustomer, deleteCustomer, restoreCustomer, forceDeleteCustomer, fetchArchivedCustomers, updatePropertyDetails, addPropertyToCustomer, addUnitToAddress, updateUnit, deleteUnit, mergeUnits, undoMerge, addHistoryToUnit, loading }}>
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomers() {
    const context = useContext(CustomerContext);
    if (!context) {
        throw new Error('useCustomers must be used within a CustomerProvider');
    }
    return context;
}
