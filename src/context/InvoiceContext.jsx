import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const InvoiceContext = createContext(null);

export function InvoiceProvider({ children }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
        
        const channel = supabase.channel('realtime_invoices')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, payload => {
                fetchInvoices();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchInvoices = async () => {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .order('issued_at', { ascending: false });

            if (error) throw error;
            if (data) setInvoices(data);
        } catch (error) {
            console.error('Error fetching invoices:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const addInvoice = async (invoiceData) => {
        const ids = invoices.map(i => parseInt(i.id.replace('INV-', ''))).filter(n => !isNaN(n));
        const nextNum = Math.max(1024, ...ids, 0) + 1;
        const nextId = `INV-${nextNum}`;

        const newInvoice = {
            id: nextId,
            ...invoiceData,
            status: 'Pending',
            issued_at: new Date().toISOString()
        };

        setInvoices(prev => [newInvoice, ...prev]);
        
        const { error } = await supabase.from('invoices').insert([newInvoice]);
        if (error) {
            console.error('Failed to insert invoice:', error.message);
            fetchInvoices();
        }
        return newInvoice;
    };

    const updateInvoice = async (id, updatedData) => {
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...updatedData } : inv));
        
        const { error } = await supabase.from('invoices').update(updatedData).eq('id', id);
        if (error) {
            console.error('Failed to update invoice:', error.message);
            fetchInvoices();
        }
    };

    return (
        <InvoiceContext.Provider value={{ invoices, addInvoice, updateInvoice, loading }}>
            {children}
        </InvoiceContext.Provider>
    );
}

export function useInvoices() {
    const context = useContext(InvoiceContext);
    if (!context) throw new Error('useInvoices must be used within an InvoiceProvider');
    return context;
}
