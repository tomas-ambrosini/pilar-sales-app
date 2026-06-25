import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, User, Phone, Wrench, Save, ArrowRight, ArrowLeft, Search, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCustomerName } from '../utils/formatters';
import { useCustomers } from '../context/CustomerContext';

export default function ServiceCallWizard({ isOpen, onClose }) {
    const { customers } = useCustomers();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    
    const [formData, setFormData] = useState({
        customer_id: '',
        customer_name: '',
        call_type: 'MAINTENANCE',
        urgency: 'NORMAL',
        issue_description: ''
    });

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSearchQuery('');
            setSearchResults([]);
            setHasSearched(false);
            setFormData({
                customer_id: '',
                customer_name: '',
                call_type: 'MAINTENANCE',
                urgency: 'NORMAL',
                issue_description: ''
            });
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 1) {
                const q = searchQuery.toLowerCase();
                const matches = customers.filter(c => 
                    c.phone?.includes(q) || 
                    c.name?.toLowerCase().includes(q) || 
                    c.address?.toLowerCase().includes(q)
                ).slice(0, 10); // limit to 10 results
                setSearchResults(matches);
                setHasSearched(true);
            } else {
                setSearchResults([]);
                setHasSearched(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, customers]);

    const selectCustomer = (c) => {
        setFormData(prev => ({
            ...prev,
            customer_id: c.id,
            customer_name: c.name
        }));
        setStep(2);
    };

    const handleSave = async () => {
        if (!formData.customer_id) {
            toast.error("Please select a customer.");
            setStep(1);
            return;
        }
        if (!formData.issue_description.trim()) {
            toast.error("Issue description cannot be empty.");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('service_calls').insert([{
                customer_id: formData.customer_id,
                call_type: formData.call_type,
                urgency: formData.urgency,
                issue_description: formData.issue_description,
                status: 'Pending'
            }]);

            if (error) throw error;
            
            toast.success("Service Call logged successfully!");
            onClose();
        } catch (error) {
            toast.error("Failed to save service call to database.");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
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
                className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col"
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Wrench className="text-orange-500" />
                            Log Service Call
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Initialize a new service ticket and dispatch</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full relative">
                    <motion.div 
                        className="absolute left-0 top-0 bottom-0 bg-orange-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${(step / 2) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Select Customer</h3>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                                        <input 
                                            type="text"
                                            placeholder="Search by name, phone, or address..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-medium focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                        />
                                    </div>
                                    
                                    <div className="mt-4 space-y-2">
                                        {searchResults.map(c => (
                                            <div 
                                                key={c.id}
                                                onClick={() => selectCustomer(c)}
                                                className="p-4 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800">{formatCustomerName(c.name)}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                        <Phone size={14}/> {c.phone || 'No phone'}
                                                    </p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-orange-500 group-hover:text-orange-500 transition-colors">
                                                    <ArrowRight size={16} />
                                                </div>
                                            </div>
                                        ))}
                                        {hasSearched && searchResults.length === 0 && (
                                            <div className="text-center py-8 text-slate-500">
                                                No customers found matching "{searchQuery}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                            {formData.customer_name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-500 uppercase">Selected Customer</p>
                                            <p className="font-bold text-slate-800">{formData.customer_name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setStep(1)} className="text-sm font-bold text-orange-600 hover:text-orange-700">Change</button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Call Type</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none"
                                            value={formData.call_type}
                                            onChange={e => setFormData({...formData, call_type: e.target.value})}
                                        >
                                            <option value="MAINTENANCE">Maintenance</option>
                                            <option value="REPAIR">Repair</option>
                                            <option value="WARRANTY">Warranty</option>
                                            <option value="DIAGNOSTIC">Diagnostic</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Urgency</label>
                                        <select 
                                            className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all appearance-none"
                                            value={formData.urgency}
                                            onChange={e => setFormData({...formData, urgency: e.target.value})}
                                        >
                                            <option value="NORMAL">Normal</option>
                                            <option value="HIGH">High Priority</option>
                                            <option value="EMERGENCY">Emergency</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Issue Description (Required)</label>
                                    <textarea 
                                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all resize-none min-h-[160px]"
                                        placeholder="Describe the issue, symptoms, or customer requests in detail..."
                                        value={formData.issue_description}
                                        onChange={e => setFormData({...formData, issue_description: e.target.value})}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    {step > 1 ? (
                        <button onClick={() => setStep(step - 1)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2">
                            <ArrowLeft size={18} /> Back
                        </button>
                    ) : (
                        <div />
                    )}
                    
                    {step === 2 && (
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="px-8 py-3 font-black text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20 rounded-xl transition-all flex items-center gap-2"
                        >
                            <CheckCircle size={18} /> {saving ? 'Saving...' : 'Finalize & Dispatch'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
