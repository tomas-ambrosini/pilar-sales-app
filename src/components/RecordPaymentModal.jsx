import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Banknote, Landmark, Smartphone, Briefcase, Loader2, CheckCircle } from 'lucide-react';

export default function RecordPaymentModal({ isOpen, onClose, invoice, onRecordPayment }) {
    const [amount, setAmount] = useState(invoice ? Math.max(0, parseFloat(invoice.balance_due || invoice.amount || 0)).toString() : '');
    const [paymentMethod, setPaymentMethod] = useState('Credit Card');
    const [reference, setReference] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        if (isOpen && invoice) {
            setAmount(Math.max(0, parseFloat(invoice.balance_due ?? invoice.amount ?? 0)).toString());
            setPaymentMethod('Credit Card');
            setReference('');
            setError(null);
        }
    }, [isOpen, invoice]);

    const paymentMethods = [
        { id: 'Credit Card', icon: CreditCard },
        { id: 'Check', icon: Briefcase },
        { id: 'Cash', icon: Banknote },
        { id: 'Zelle', icon: Smartphone },
        { id: 'Financing', icon: Landmark }
    ];

    if (!isOpen || !invoice) return null;

    const totalAmount = parseFloat(invoice.amount || invoice.total_contract_amount || 0);
    const balanceDue = parseFloat(invoice.balance_due ?? totalAmount);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        const paymentAmount = parseFloat(amount.replace(/,/g, ''));
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            setError("Please enter a valid payment amount greater than $0.");
            setIsSubmitting(false);
            return;
        }

        if (paymentAmount > balanceDue) {
            setError(`Payment cannot exceed the remaining balance of $${balanceDue.toLocaleString()}.`);
            setIsSubmitting(false);
            return;
        }

        try {
            await onRecordPayment({
                amount: paymentAmount,
                method: paymentMethod,
                reference: reference
            });
            onClose();
        } catch (err) {
            setError(err.message || "Failed to record payment. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm modal-layout-wrapper"
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
                                <Banknote size={20} className="fill-current text-emerald-100/50" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">Record Payment</h2>
                                <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">Apply to Invoice #{invoice.id.substring(0, 6).toUpperCase()}</p>
                            </div>
                        </div>
                        <button onClick={onClose} disabled={isSubmitting} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-500">Customer</span>
                                <span className="text-sm font-black text-slate-800 truncate max-w-[200px]">{invoice.proposals?.customer || 'Unknown Customer'}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-500">Invoice Total</span>
                                <span className="text-sm font-bold text-slate-600">${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 mt-2">
                                <span className="text-sm font-bold text-slate-800">Remaining Balance</span>
                                <span className="text-lg font-black text-rose-600">${balanceDue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-widest uppercase mb-1">Payment Amount ($)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 font-bold sm:text-sm">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0.01"
                                        max={balanceDue}
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
                                        <span>New Balance After Payment:</span>
                                        <span className="font-bold text-slate-700">
                                            ${Math.max(0, balanceDue - parseFloat(amount)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 tracking-widest uppercase mb-2">Payment Method</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                                    disabled={isSubmitting}
                                    className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 bg-primary-600 text-white hover:bg-primary-700 px-4 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                    Apply Payment
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
