import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, User, Wrench, FileSignature, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MaintenanceWizard() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const oppId = searchParams.get('opp_id');
    
    const [loading, setLoading] = useState(true);
    const [opportunity, setOpportunity] = useState(null);
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (!oppId) {
            toast.error("No opportunity ID provided");
            navigate('/sales');
            return;
        }

        const fetchOpportunity = async () => {
            try {
                const { data, error } = await supabase
                    .from('opportunities')
                    .select('*, households(*, addresses(*))')
                    .eq('id', oppId)
                    .single();
                
                if (error) throw error;
                setOpportunity(data);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load opportunity");
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunity();
    }, [oppId, navigate]);

    if (loading) {
        return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Loading Maintenance Wizard...</div>;
    }

    if (!opportunity) {
        return <div className="p-10 text-center text-red-500">Error loading data.</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/sales')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Wrench size={18} className="text-blue-500" /> Maintenance Plan
                        </h1>
                        <p className="text-xs font-semibold text-slate-500">{opportunity.households?.household_name || 'Unknown Customer'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
                    <div className={`w-8 border-t-2 ${step >= 2 ? 'border-blue-600' : 'border-slate-200'}`}></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
                    <div className={`w-8 border-t-2 ${step >= 3 ? 'border-blue-600' : 'border-slate-200'}`}></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>3</div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 max-w-4xl w-full mx-auto p-6">
                {step === 1 && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <User className="text-blue-500" /> Customer Details
                        </h2>
                        {/* We will populate this with actual details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Name</span>
                                <span className="font-bold text-slate-700">{opportunity.households?.household_name}</span>
                            </div>
                        </div>
                        <div className="mt-8 flex justify-end">
                            <button onClick={() => setStep(2)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-blue-500/20 transition-all">
                                Next: Select Plan
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Wrench className="text-blue-500" /> Select Maintenance Plan
                        </h2>
                        {/* We will populate this with catalog items later */}
                        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl mb-8">
                            <p className="text-slate-500 font-medium">Plan selection UI will go here.</p>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-bold px-6 py-3">Back</button>
                            <button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-blue-500/20 transition-all">
                                Next: Review & Sign
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                            <FileSignature className="text-blue-500" /> Review & Sign
                        </h2>
                        <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-xl mb-8">
                            <p className="text-slate-500 font-medium">Contract and Signature pad will go here.</p>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setStep(2)} className="text-slate-500 hover:text-slate-800 font-bold px-6 py-3">Back</button>
                            <button onClick={() => {
                                toast.success("Maintenance Plan Sold!");
                                navigate('/sales');
                            }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all">
                                <CheckCircle size={18} /> Complete Sale
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
