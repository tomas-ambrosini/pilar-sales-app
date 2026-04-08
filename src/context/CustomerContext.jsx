import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CustomerContext = createContext(null);

export function CustomerProvider({ children }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomers();
        
        // Listen to changes on households, so when one is added we refresh
        const channel = supabase.channel('realtime_customers')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'households' }, () => {
                fetchCustomers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchCustomers = async () => {
        try {
            let { data, error } = await supabase
                .from('households')
                .select(`
                    id,
                    household_name,
                    tags,
                    created_at,
                    addresses!addresses_household_id_fkey ( id, street_address, city, state, zip, property_details, is_primary_residence ),
                    contacts ( id, first_name, last_name, primary_phone, email, role ),
                    opportunities ( id, status, urgency_level, issue_description, created_at ),
                    work_orders ( id, work_order_number, status, urgency_level, created_at )
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
                            tags,
                            created_at,
                            addresses!addresses_household_id_fkey ( id, street_address, city, state, zip, property_details, is_primary_residence ),
                            contacts ( id, first_name, last_name, primary_phone, email, role ),
                            opportunities ( id, status, urgency_level, issue_description, created_at ),
                            work_orders ( id, work_order_number, status, urgency_level, created_at )
                        `)
                        .order('created_at', { ascending: false });
                        
                    data = legacyRes.data;
                    if (legacyRes.error) throw legacyRes.error;
                } else {
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
                        tags: household.tags || [],
                        addedDate: new Date(household.created_at).toLocaleDateString(),
                        opportunities: household.opportunities || [],
                        work_orders: household.work_orders || [],
                        raw: household // Keep full relational data for advanced CRM views
                    };
                });
                setCustomers(formatted);
            }
        } catch (error) {
            console.error('Error fetching relational customers:', error.message);
        } finally {
            setLoading(false);
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
                    household_name: customerData.name + ' Account',
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
            
            // In a full production app, this would deeply update the 3 tables natively.
            if (updatedData.tags) {
                await supabase.from('households').update({ tags: updatedData.tags }).eq('id', id);
            }
            if (updatedData.name) {
                const nameParts = (updatedData.name || '').split(' ');
                await supabase.from('contacts').update({ 
                     first_name: nameParts[0] || 'Unknown', 
                     last_name: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '' 
                }).eq('household_id', id);
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

    const deleteCustomer = async (id) => {
        try {
            // Optimistic delete
            setCustomers(prev => prev.filter(c => c.id !== id));
            
            // We no longer cascade delete records to preserve history.
            // We only soft-delete the top-level household record to hide it from the global directory.
            const { error } = await supabase.from('households').update({ is_active: false }).eq('id', id);
            if (error) throw error;

            fetchCustomers();
        } catch (error) {
            console.error('Failed to deeply delete household & dependencies:', error);
            fetchCustomers(); // Restore on fail
        }
    };

    return (
        <CustomerContext.Provider value={{ customers, addCustomer, updateCustomer, deleteCustomer, updatePropertyDetails, addPropertyToCustomer, loading }}>
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
