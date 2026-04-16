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
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            
            {/* Header Banner */}
            <div className="bg-slate-900 px-6 py-12 md:px-12 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-emerald-500 shadow-md">
                
                {/* Background Decor */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-600/10 rounded-full blur-[80px] pointer-events-none"></div>
                <div className="absolute top-10 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500 text-white p-2.5 rounded-xl shadow-lg border border-emerald-400">
                            <Calculator size={26} />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase">Global Pricing Policies</h1>
                    </div>
                    <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg p-3 inline-flex flex-col gap-1 w-max mt-2">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldAlert size={12}/> Executive Financial Hub
                        </span>
                        <p className="text-sm font-semibold text-slate-300">Changes deployed here map instantly into all future proposals.</p>
                    </div>
                </div>

                <div className="relative z-10 flex md:flex-col gap-3 shrink-0 mt-2 md:mt-0">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col justify-center min-w-[200px] shadow-inner font-mono">
                        <span className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">Global Status</span>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                            <span className="text-emerald-400 font-bold text-sm tracking-widest">ONLINE & ENFORCING</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editing Panel */}
            <form onSubmit={handleConfirmRequest} className="max-w-6xl mx-auto p-6 md:p-12 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Main Settings Matrix */}
                    <div className="md:col-span-8 space-y-8">
                        
                        {/* Margins Block */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:border-slate-300 transition-colors">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="bg-primary-100 text-primary-600 p-1.5 rounded-md"><Zap size={16}/></div>
                                    <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">Financial Margins Matrix</h2>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 space-y-6 bg-white">
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    
                                    <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all">
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Threshold</span>
                                            <span className="text-sm font-black text-slate-800 uppercase">Best Tier Margin</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="best_margin"
                                                step="0.01"
                                                value={(settings.best_margin * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white border border-slate-300 rounded-lg pr-12 pl-4 py-3 font-mono font-black text-2xl text-primary-700 outline-none focus:ring-2 focus:ring-primary-500 shadow-inner"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                        </div>
                                    </div>

                                    <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all">
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Threshold</span>
                                            <span className="text-sm font-black text-slate-800 uppercase">Better Tier Margin</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="better_margin"
                                                step="0.01"
                                                value={(settings.better_margin * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white border border-slate-300 rounded-lg pr-12 pl-4 py-3 font-mono font-black text-2xl text-primary-700 outline-none focus:ring-2 focus:ring-primary-500 shadow-inner"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                        </div>
                                    </div>

                                    <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all">
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Target Threshold</span>
                                            <span className="text-sm font-black text-slate-800 uppercase">Good Tier Margin</span>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                name="good_margin"
                                                step="0.01"
                                                value={(settings.good_margin * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-white border border-slate-300 rounded-lg pr-12 pl-4 py-3 font-mono font-black text-2xl text-primary-700 outline-none focus:ring-2 focus:ring-primary-500 shadow-inner"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Additional Factors Block */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Reserve */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-amber-100 text-amber-600 p-1.5 rounded-md"><Calculator size={16}/></div>
                                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Logistical Reserve</h2>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="relative">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Service Reserve / Overhead Buffer</span>
                                        <div className="relative mt-2">
                                            <input 
                                                type="number"
                                                name="service_reserve"
                                                step="0.01"
                                                value={(settings.service_reserve * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-amber-50/30 border border-slate-300 rounded-lg pr-12 pl-4 py-3 font-mono font-black text-2xl text-amber-700 outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                                        Subtly inflates the baseline Hard Cost before margin equations apply.
                                    </p>
                                </div>
                            </div>

                            {/* Taxes */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md"><Receipt size={16}/></div>
                                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">State Taxes</h2>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="relative">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Active Sales Tax Threshold</span>
                                        <div className="relative mt-2">
                                            <input 
                                                type="number"
                                                name="sales_tax"
                                                step="0.01"
                                                value={(settings.sales_tax * 100).toFixed(2).replace(/\.00$/, '')}
                                                onChange={handleChange}
                                                required
                                                className="w-full bg-blue-50/30 border border-slate-300 rounded-lg pr-12 pl-4 py-3 font-mono font-black text-2xl text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                                        Automatically compounded against any material line flagged as a Taxable Item.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Action Side Panel */}
                    <div className="md:col-span-4 space-y-6">
                        <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl sticky top-8 shadow-xl">
                            <h3 className="font-black text-white text-lg flex items-center gap-2 uppercase tracking-wide mb-4">
                                Commit Station
                            </h3>
                            <div className="space-y-4">
                                <div className="border border-slate-700/50 bg-slate-900/50 p-4 rounded-xl text-slate-300 text-sm font-medium leading-relaxed shadow-inner">
                                    Any architectural changes enacted here will actively manipulate the native ERP Retail array pricing. 
                                </div>
                                
                                <button 
                                    type="submit"
                                    disabled={!hasChanges || isSaving}
                                    className={`w-full flex justify-center items-center gap-2 font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all shadow-lg ${hasChanges ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 active:scale-95' : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'}`}
                                >
                                    {isSaving ? <Activity className="animate-spin" /> : <Save size={18} />}
                                    Deploy Strategy
                                </button>

                                {hasChanges && (
                                    <button 
                                        type="button"
                                        onClick={() => setSettings(initialSettings)}
                                        className="w-full flex justify-center py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-white transition-colors"
                                    >
                                        Revert Overrides
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
                            DANGER: This will update global pricing rules and permanently alter the gross margin retail array calculations for all future proposals generated by the sales team.
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" className="btn-secondary font-bold px-6 border border-slate-200 hover:border-slate-300 hover:bg-slate-50" onClick={() => setIsConfirmModalOpen(false)}>
                            Cancel Deployment
                        </button>
                        <button type="button" className="bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20 font-black tracking-widest px-8 py-2.5 rounded-lg flex items-center gap-2 active:scale-95 transition-all outline-none" onClick={executeSave}>
                            Confirm Changes
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
