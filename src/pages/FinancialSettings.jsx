import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calculator, ShieldAlert, Check, Activity, Percent, ArrowRight, Save, Receipt, Zap, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

export default function FinancialSettings() {
    const [settings, setSettings] = useState({
        good_margin: 0,
        better_margin: 0,
        best_margin: 0,
        service_reserve: 0,
        sales_tax: 0
    });
    const [initialSettings, setInitialSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('margin_settings').select('*').eq('id', 1).single();
            if (error) throw error;
            if (data) {
                setSettings(data);
                setInitialSettings(data);
            }
        } catch (err) {
            console.error("Failed to load global financial policies:", err);
            toast.error("Database connection fault loading margins.");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Parse raw integer/float and divide by 100 on save, but allow users to enter percentages normally!
        // Actually, the database currently stores them as decimals (e.g. 0.35, 0.07).
        // Best UX: Users type "35" into the box, we convert to 0.35 in state.
        
        let numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue < 0) numericValue = 0;
        
        // Map UI 100% scale back to 1.0 DB decimal Scale
        setSettings(prev => ({
            ...prev,
            [name]: numericValue / 100
        }));
    };

    const handleConfirmRequest = (e) => {
        e.preventDefault();
        
        // Validation Checks
        if (settings.good_margin < 0 || settings.better_margin < 0 || settings.best_margin < 0) {
            return toast.error("Margins cannot be negative.");
        }
        if (settings.best_margin >= 1 || settings.better_margin >= 1 || settings.good_margin >= 1) {
            return toast.error("Margins must be below 100%.");
        }
        
        // Open safety gate
        setIsConfirmModalOpen(true);
    };

    const executeSave = async () => {
        setIsConfirmModalOpen(false);
        setIsSaving(true);
        try {
            const payload = {
                good_margin: settings.good_margin,
                better_margin: settings.better_margin,
                best_margin: settings.best_margin,
                service_reserve: settings.service_reserve,
                sales_tax: settings.sales_tax,
                updated_at: new Date().toISOString()
            };
            
            const { error } = await supabase.from('margin_settings').update(payload).eq('id', 1);
            if (error) throw error;
            
            setInitialSettings(settings);
            toast.success("Global Margins Synchronized.", { icon: '🔐' });
        } catch (err) {
            console.error(err);
            toast.error("System failure committing margin arrays.");
        } finally {
            setIsSaving(false);
        }
    };

    // Derived states
    const hasChanges = initialSettings && JSON.stringify(settings) !== JSON.stringify(initialSettings);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center -mt-10 opacity-60">
                <Activity className="animate-spin text-primary-500 mb-4" size={42} />
                <span className="font-bold tracking-widest uppercase text-slate-500 text-sm">Synchronizing Database</span>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-6">
            
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1 flex items-center gap-3">
                        <Calculator className="text-slate-400" size={28}/> Global Pricing Policies
                    </h1>
                    <p className="text-slate-500 font-medium">Manage company-wide margin rules and reserve percentages.</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-emerald-600 font-bold bg-emerald-50 px-4 py-2 border border-emerald-100 rounded-xl shadow-sm">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Active & Enforcing
                </div>
            </header>

            {/* Editing Panel */}
            <form onSubmit={handleConfirmRequest} className="pb-32">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Main Settings Matrix */}
                    <div className="md:col-span-8 space-y-6">
                        
                        {/* Margins Block */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-6 pb-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Zap size={18} className="text-primary-500" />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">Financial Margins</h2>
                                </div>
                                <p className="text-sm font-medium text-slate-500 mb-6">These thresholds define the true target margin applied at each system tier.</p>
                            </div>
                            
                            <div className="p-6 pt-0">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition-all hover:bg-white hover:border-slate-300 hover:shadow-sm">
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Threshold</span>
                                            <span className="text-sm font-bold text-slate-700">Best Tier Margin</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="best_margin"
                                                step="0.01"
                                                value={(settings.best_margin * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white border border-slate-200 rounded-lg pr-12 pl-4 py-3 font-mono font-bold text-2xl text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">%</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition-all hover:bg-white hover:border-slate-300 hover:shadow-sm">
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Threshold</span>
                                            <span className="text-sm font-bold text-slate-700">Better Tier Margin</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="better_margin"
                                                step="0.01"
                                                value={(settings.better_margin * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white border border-slate-200 rounded-lg pr-12 pl-4 py-3 font-mono font-bold text-2xl text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">%</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between transition-all hover:bg-white hover:border-slate-300 hover:shadow-sm">
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Threshold</span>
                                            <span className="text-sm font-bold text-slate-700">Good Tier Margin</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="good_margin"
                                                step="0.01"
                                                value={(settings.good_margin * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white border border-slate-200 rounded-lg pr-12 pl-4 py-3 font-mono font-bold text-2xl text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">%</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Additional Factors Block */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Reserve */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <Calculator size={18} className="text-amber-500" />
                                            <h2 className="text-lg font-bold text-slate-900">Overhead Reserve</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="relative">
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="service_reserve"
                                                step="0.01"
                                                value={(settings.service_reserve * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-12 pl-4 py-3 font-mono font-bold text-2xl text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all shadow-sm"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">%</span>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        Inflates baseline Hard Cost prior to margin equations.
                                    </p>
                                </div>
                            </div>

                            {/* Taxes */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <Receipt size={18} className="text-blue-500" />
                                            <h2 className="text-lg font-bold text-slate-900">State Taxes</h2>
                                        </div>
                                    </div>
                                    
                                    <div className="relative">
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="sales_tax"
                                                step="0.01"
                                                value={(settings.sales_tax * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-12 pl-4 py-3 font-mono font-bold text-2xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">%</span>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                                        Compounded against any material mapped as Taxable.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Action Side Panel */}
                    <div className="md:col-span-4 space-y-4">
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl sticky top-6 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-900 mb-1">
                                Save Configuration
                            </h3>
                            <p className="text-sm font-medium text-slate-500 mb-6">Deploying changes alters future proposal prices immediately.</p>
                            
                            <div className="space-y-3">
                                <button 
                                    type="submit"
                                    disabled={!hasChanges || isSaving}
                                    className={`w-full flex justify-center items-center gap-2 font-bold py-3 px-6 rounded-xl transition-all ${hasChanges ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-500/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {isSaving ? <Activity className="animate-spin" size={18} /> : <Save size={18} />}
                                    Deploy Changes
                                </button>

                                {hasChanges && (
                                    <button 
                                        type="button"
                                        onClick={() => setSettings(initialSettings)}
                                        className="w-full flex justify-center py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                                    >
                                        Discard Edits
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <Modal 
                isOpen={isConfirmModalOpen} 
                onClose={() => setIsConfirmModalOpen(false)}
                title="Authorization Required"
                width="max-w-md"
            >
                <div className="p-6">
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl font-bold flex gap-3 text-sm mb-6 leading-relaxed">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                            DANGER: This will update global pricing rules and permanently alter the gross margin retail calculations for all future proposals generated by the sales team.
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" className="btn-secondary font-bold px-6 border border-slate-200 hover:border-slate-300 hover:bg-slate-50" onClick={() => setIsConfirmModalOpen(false)}>
                            Cancel Deployment
                        </button>
                        <button type="button" className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 font-bold px-8 py-2.5 rounded-lg flex items-center gap-2 transition-all outline-none" onClick={executeSave}>
                            Confirm Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
