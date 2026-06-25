import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { debounce } from '../utils/debounce';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCatalog();
        const debouncedFetch = debounce(fetchCatalog, 1000);
        const channel = supabase.channel('realtime_catalog')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_catalog' }, () => {
                debouncedFetch();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchCatalog = async () => {
        try {
            const { data, error } = await supabase.from('equipment_catalog').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            if (data) setCatalog(data);
        } catch (error) {
            console.error('Error fetching catalog:', error);
        } finally {
            setLoading(false);
        }
    };

    const addEquipment = async (item) => {
        const { error } = await supabase.from('equipment_catalog').insert([item]);
        if (error) {
            console.error("Add Equipment Error:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const updateEquipment = async (id, updates) => {
        const { error } = await supabase.from('equipment_catalog').update(updates).eq('id', id);
        if (error) {
            console.error("Update Equipment Error:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const deleteEquipment = async (id) => {
        const { error } = await supabase.from('equipment_catalog').delete().eq('id', id);
        if (error) {
            console.error("Delete Equipment Error:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    };

    const contextValue = useMemo(() => ({ catalog, addEquipment, updateEquipment, deleteEquipment, loading }), [catalog, loading]);

    return (
        <CatalogContext.Provider value={contextValue}>
            {children}
        </CatalogContext.Provider>
    );
}

export function useCatalog() {
    const context = useContext(CatalogContext);
    if (!context) throw new Error('useCatalog must be used within a CatalogProvider');
    return context;
}
