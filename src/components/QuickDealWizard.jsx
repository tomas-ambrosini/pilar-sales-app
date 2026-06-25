import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, Search, User, MapPin, CheckCircle, ArrowRight, ArrowLeft, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCustomerName } from '../utils/formatters';
import { useCustomers } from '../context/CustomerContext';
import { useNavigate } from 'react-router-dom';
import { PIPELINE_STATES } from '../utils/pipelineControls';
import { useProposals } from '../context/ProposalContext';
import { useAuth } from '../context/AuthContext';

export default function QuickDealWizard({ isOpen, onClose }) {
    const { customers } = useCustomers();
    const { createDraft } = useProposals();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    
    const [formData, setFormData] = useState({
        customer_id: '',
        customer_name: ''
    });

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSearchQuery('');
            setSearchResults([]);
            setHasSearched(false);
            setFormData({ customer_id: '', customer_name: '' });
        }
    }, [isOpen]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.length > 1) {
                const q = searchQuery.toLowerCase();
                const matches = customers.filter(c => 
                    c.name?.toLowerCase().includes(q) || 
                    c.phone?.includes(q) || 
                    c.address?.toLowerCase().includes(q)
                ).slice(0, 10);
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

    const handleInitializeQuote = async () => {
        if (!formData.customer_id) {
            toast.error("Please select a customer.");
            setStep(1);
            return;
        }

        setSaving(true);
        try {
            // 1. Create a new Opportunity (Lead) in the CRM
            const { data: oppData, error: oppError } = await supabase.from('opportunities').insert({
                household_id: formData.customer_id,
                status: PIPELINE_STATES.QUOTING,
                urgency_level: 'Medium',
                assigned_salesperson_id: user?.id,
                proposal_data: { 
                    type: 'SALES', 
                    intaken_by: user?.full_name || 'System',
                    dispatcher: user?.full_name || 'System'
                }
            }).select().single();

            if (oppError) throw oppError;

            // 2. Initialize the Draft using ProposalContext
            const newDraft = await createDraft({
                customer: formData.customer_name,
                amount: 0,
                associated_opportunity_id: oppData.id,
                proposal_data: {
                    associated_opportunity_id: oppData.id,
                    wizard_state: {
                        step: 2,
                        selectedCustomerId: formData.customer_id,
                        selectedLocationId: '' // Let the wizard handle location selection
                    }
                }
            });

            if (newDraft && newDraft.id) {
                toast.success("Quote initialized successfully!");
                onClose();
                navigate(`/proposals?action=resume&id=${newDraft.id}`);
            } else {
                throw new Error("Failed to create draft payload.");
            }
        } catch (error) {
            toast.error("Failed to initialize quote pipeline.");
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
                            <DollarSign className="text-primary-500" />
                            New Deal Setup
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Select a customer to initialize the quoting engine</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={24} className="text-slate-400" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full relative">
                    <motion.div 
                        className="absolute left-0 top-0 bottom-0 bg-primary-500"
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
                                            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-base font-medium focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                        />
                                    </div>
                                    
                                    <div className="mt-4 space-y-2">
                                        {searchResults.map(c => (
                                            <div 
                                                key={c.id}
                                                onClick={() => selectCustomer(c)}
                                                className="p-4 bg-slate-50 hover:bg-primary-50 border border-slate-100 hover:border-primary-200 rounded-xl cursor-pointer transition-all flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-800">{formatCustomerName(c.name)}</p>
                                                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                                        <MapPin size={14}/> {c.address || 'No address'}
                                                    </p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-primary-500 group-hover:text-primary-500 transition-colors">
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
                                <div className="text-center py-10">
                                    <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle size={40} className="text-primary-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">Customer Selected</h3>
                                    <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
                                        You selected <strong>{formData.customer_name}</strong>. Click below to initialize the CRM Lead and enter the quoting engine.
                                    </p>
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
                            onClick={handleInitializeQuote} 
                            disabled={saving}
                            className="px-8 py-3 font-black text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/20 rounded-xl transition-all flex items-center gap-2"
                        >
                            <DollarSign size={18} /> {saving ? 'Initializing...' : 'Initialize Quote'}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
