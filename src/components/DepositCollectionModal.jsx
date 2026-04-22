import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, CreditCard, Banknote, Landmark, Smartphone, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { formatQuoteId } from '../utils/formatters';

export default function DepositCollectionModal({ isOpen, onClose, contractData, onSuccess }) {
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Credit Card');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const { proposal, tierName, tierData } = contractData || {};
    const totalAmount = tierData?.salesPrice || proposal?.amount || 0;

    const paymentMethods = [
        { id: 'Credit Card', icon: CreditCard },
        { id: 'Check', icon: Briefcase },
        { id: 'Cash', icon: Banknote },
        { id: 'Zelle', icon: Smartphone },
        { id: 'Financing', icon: Landmark }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const depositAmount = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(depositAmount) || depositAmount < 0) {
            setError("Please enter a valid deposit amount.");
            setIsSubmitting(false);
            return;
        }

        if (depositAmount > totalAmount) {
            setError("Deposit cannot exceed the total contract amount.");
            setIsSubmitting(false);
            return;
        }

        try {
            // Create Invoice
            const invoiceData = {
                proposal_id: proposal.id,
                customer_id: proposal.customer_id || null,
                amount: depositAmount,
                payment_method: paymentMethod,
                status: 'Paid',
                notes: `Deposit. Reference: ${reference || 'None'}. Total Contract: $${totalAmount}. Balance Due: $${totalAmount - depositAmount}.`
            };

            const { error: invoiceError } = await supabase
                .from('invoices')
                .insert([invoiceData]);

            if (invoiceError) throw invoiceError;

            // Update proposal_data with deposit info for easy UI access
            const updatedProposalData = {
                ...(proposal.proposal_data || {}),
                deposit_collected: true,
                deposit_amount: depositAmount,
                deposit_method: paymentMethod
            };

            const { error: proposalError } = await supabase
                .from('proposals')
                .update({ proposal_data: updatedProposalData })
                .eq('id', proposal.id);

            if (proposalError) throw proposalError;

            // Optional: Generate Work Order here
            const workOrderData = {
                proposal_id: proposal.id,
                customer_id: proposal.customer_id || null,
                status: 'Pending Scheduling',
                job_notes: 'Generated automatically post-contract signing.'
            };
            await supabase.from('work_orders').insert([workOrderData]);

            if (onSuccess) {
                onSuccess(depositAmount);
            }
            onClose();
        } catch (err) {
            console.error("Failed to record deposit:", err);
            setError(err.message || "Failed to record deposit. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !contractData) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
                <motion.div 
                    initial={{ scale: 0.95, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 10, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
                >
                    <div className="bg-[#f8fafc] border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-full">
                                <CheckCircle size={20} className="fill-current text-emerald-100/50" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Contract Executed</h2>
                                <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">Record Deposit Payment</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-500">Customer</span>
                                <span className="text-sm font-black text-slate-800">{proposal?.customer}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-500">Quote ID</span>
                                <span className="text-sm font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">{formatQuoteId(proposal)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                <span className="text-sm font-bold text-slate-800">Total Contract Value</span>
                                <span className="text-lg font-black text-emerald-600">${totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Deposit Amount Collected ($)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 font-bold sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="block w-full pl-7 pr-12 sm:text-sm border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 py-3 font-bold text-slate-800 shadow-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                                {amount && !isNaN(parseFloat(amount)) && (
                                    <p className="mt-2 text-xs font-medium text-slate-500 flex justify-between">
                                        <span>Remaining Balance:</span>
                                        <span className="font-bold text-slate-700">
                                            ${Math.max(0, totalAmount - parseFloat(amount)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Payment Method</label>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {paymentMethods.map((method) => {
                                        const Icon = method.icon;
                                        const isSelected = paymentMethod === method.id;
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setPaymentMethod(method.id)}
                                                className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-all ${
                                                    isSelected 
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500' 
                                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                            >
                                                <Icon size={20} className="mb-1" />
                                                <span className="text-[10px] font-bold tracking-wide uppercase">{method.id}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Reference Notes (Optional)</label>
                                <input
                                    type="text"
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Check number, transaction ID, etc."
                                    className="block w-full sm:text-sm border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 py-2.5 px-3 font-medium text-slate-800 shadow-sm"
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-xl font-bold transition-colors"
                                >
                                    Skip & View Contract
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-primary-600 text-white hover:bg-primary-700 px-4 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
