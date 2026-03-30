import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCatalog();
        const channel = supabase.channel('realtime_catalog')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'equipment_catalog' }, () => {
                fetchCatalog();
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

    return (
        <CatalogContext.Provider value={{ catalog, addEquipment, updateEquipment, deleteEquipment, loading }}>
            {children}
        </CatalogContext.Provider>
    );
}

export function useCatalog() {
    const context = useContext(CatalogContext);
    if (!context) throw new Error('useCatalog must be used within a CatalogProvider');
    return context;
}
