import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function MaintenanceInvoiceModal({ isOpen, onClose, agreement, user }) {
    const [amount, setAmount] = useState(agreement?.proposal_data?.total_price || 0);
    const [saving, setSaving] = useState(false);

    if (!isOpen || !agreement) return null;

    const handleGenerate = async () => {
        if (!amount || amount <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        setSaving(true);
        try {
            const invoiceData = {
                proposal_id: agreement.proposal_id || agreement.id, // fallback
                customer_id: agreement.customer_id || null,
                invoice_type: 'Recurring Maintenance',
                total_contract_amount: parseFloat(amount),
                deposit_collected: 0,
                balance_due: parseFloat(amount),
                status: 'Pending',
                due_date: new Date().toISOString()
            };

            const { error: invoiceError } = await supabase.from('invoices').insert([invoiceData]);
            
            if (invoiceError) {
                console.warn("Invoice insert failed, but logging activity anyway.", invoiceError);
                toast.error("Warning: Invoice generation restricted by permissions, but activity logged.");
            } else {
                toast.success("Recurring invoice generated successfully!");
            }
            
            // Log activity on the opportunity
            await supabase.from('activity_logs').insert({
                opportunity_id: agreement.id,
                activity_type: 'Invoice Generated',
                description: `A recurring invoice for $${parseFloat(amount).toLocaleString()} was generated.`,
                created_by: user?.id
            });

            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate invoice.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[150] flex justify-end overflow-hidden">
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div 
                    initial={{ x: '100%', opacity: 0.5 }} 
                    animate={{ x: 0, opacity: 1 }} 
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
                >
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <div>
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <DollarSign className="text-emerald-500" size={20} />
                                Generate Invoice
                            </h2>
                            <p className="text-sm text-slate-500 mt-0.5">Recurring billing for {agreement.households?.household_name || 'Customer'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                                <input 
                                    type="number" 
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg pl-8 pr-3 py-3 text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleGenerate}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Generating...' : 'Generate Invoice'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
