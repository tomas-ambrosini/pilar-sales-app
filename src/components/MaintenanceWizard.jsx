import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { useProposals } from '../context/ProposalContext';
import { Check, Shield, Wrench, Save, ArrowRight, ArrowLeft } from 'lucide-react';
import { PipelineController } from '../utils/pipelineControls';
import toast from 'react-hot-toast';

export default function MaintenanceWizard({ onComplete, addProposal, updateProposal, editModeData }) {
    const hasPreloadedData = typeof editModeData === 'object' && editModeData !== null;
    const isDraftLaunch = hasPreloadedData && (editModeData.isDraft === true || editModeData.status === 'Draft' || editModeData.status === 'Lead');
    const isEditing = hasPreloadedData && editModeData.id != null && !isDraftLaunch;
    
    const [step, setStep] = useState(() => hasPreloadedData ? (editModeData.step || editModeData.proposal_data?.wizard_state?.step || 1) : 1);
    
    const { customers } = useCustomers();
    const { user } = useAuth();
    const { createDraft } = useProposals();
    
    const [selectedCustomerId, setSelectedCustomerId] = useState(() => hasPreloadedData ? editModeData.selectedCustomerId || editModeData.household_id || editModeData.proposal_data?.wizard_state?.selectedCustomerId || '' : '');
    const [selectedLocationId, setSelectedLocationId] = useState('');
    
    const [unitsCovered, setUnitsCovered] = useState(() => hasPreloadedData ? (editModeData.proposal_data?.units_covered || 1) : 1);
    const [selectedFrequency, setSelectedFrequency] = useState(() => hasPreloadedData ? (editModeData.proposal_data?.frequency || null) : null); // 'quarterly', 'bi-monthly', 'monthly'
    
    const [draftServerId, setDraftServerId] = useState((isEditing || isDraftLaunch) ? editModeData.id : null);
    
    const PLANS = {
        'quarterly': { title: 'Quarterly', visits: 4, basePricePerVisit: 89.95, label: '4 Visits / Year' },
        'bi-monthly': { title: 'Every Other Month', visits: 6, basePricePerVisit: 84.95, label: '6 Visits / Year' },
        'monthly': { title: 'Monthly Visits', visits: 12, basePricePerVisit: 79.95, label: '12 Visits / Year' }
    };
    
    const calculatePrice = (freq) => {
        if (!freq) return 0;
        const plan = PLANS[freq];
        const unitMultiplier = 1 + ((unitsCovered - 1) * 0.5);
        const pricePerVisit = plan.basePricePerVisit * unitMultiplier;
        return (pricePerVisit * plan.visits).toFixed(2);
    };

    const handleSaveAndGenerate = async () => {
        if (!selectedCustomerId || !selectedFrequency) {
            toast.error('Please complete all selections.');
            return;
        }
        
        const customer = customers.find(c => c.id.toString() === selectedCustomerId.toString());
        if (!customer) return;
        
        const oppId = editModeData?.associated_opportunity_id || editModeData?.proposal_data?.associated_opportunity_id;
        
        const finalData = {
            type: 'MAINTENANCE',
            frequency: selectedFrequency,
            units_covered: unitsCovered,
            total_price: parseFloat(calculatePrice(selectedFrequency)),
            benefits: [
                '29 Point Inspection w/ each visit',
                'Filter Replacement',
                'Clean Drain Pan (add Pan Tabs to maintain algae free environment)',
                'Flush Drain Line',
                'Provide Energy Saving Tips'
            ],
            wizard_state: {
                selectedCustomerId,
                step: 4
            },
            associated_opportunity_id: oppId
        };

        try {
            if (draftServerId) {
                if (oppId) {
                    const { data: oppObj } = await supabase.from('opportunities').select('status').eq('id', oppId).single();
                    const currentStatus = oppObj ? oppObj.status : 'QUOTING';
                    
                    if (currentStatus !== 'SENT') {
                        await PipelineController.sendProposal(oppId, currentStatus, {
                            proposal_data: finalData
                        });
                    } else {
                        await supabase.from('opportunities').update({
                            proposal_data: finalData
                        }).eq('id', oppId);
                    }
                }
                
                if (updateProposal) {
                    await updateProposal(draftServerId, {
                        customer: customer.name,
                        status: 'Sent',
                        proposal_data: finalData,
                        updated_at: new Date().toISOString(),
                        associated_opportunity_id: oppId
                    });
                }
                toast.success('Maintenance Proposal Generated!');
            } else {
                toast.error('Draft ID missing, cannot finalize.');
                return;
            }
            onComplete();
        } catch (error) {
            console.error(error);
            toast.error('Failed to generate proposal.');
        }
    };
    
    const syncTimer = React.useRef(null);
    const isInitializingDraft = React.useRef(false);

    useEffect(() => {
        if (syncTimer.current) clearTimeout(syncTimer.current);

        syncTimer.current = setTimeout(async () => {
            const customerName = selectedCustomerId 
                ? customers.find(c => c.id.toString() === selectedCustomerId.toString())?.name || 'Unknown' 
                : 'Unknown Customer';
            
            const draftPayload = {
                type: 'MAINTENANCE',
                frequency: selectedFrequency,
                units_covered: unitsCovered,
                total_price: parseFloat(calculatePrice(selectedFrequency)) || 0,
                wizard_state: { step, selectedCustomerId },
                associated_opportunity_id: activeOppIdRef.current
            };

            const currentStatus = editModeData?.status || 'Lead';
            const updatedStatus = ['Lead', 'Draft', 'QUOTING'].includes(currentStatus) ? 'Draft' : currentStatus;
            
            if (['Sent', 'Completed', 'Lost'].includes(currentStatus)) return;

            if (!draftServerId) {
                if (isInitializingDraft.current) return;
                isInitializingDraft.current = true;
                try {
                    const draft = await createDraft({
                        customer: customerName,
                        amount: 0,
                        proposal_data: draftPayload,
                        associated_opportunity_id: draftPayload.associated_opportunity_id
                    });
                    if (draft && draft.id) {
                        setDraftServerId(draft.id);
                        if (draft.associated_opportunity_id) {
                            activeOppIdRef.current = draft.associated_opportunity_id;
                        }
                    }
                    else isInitializingDraft.current = false;
                } catch (err) {
                    isInitializingDraft.current = false;
                }
            } else if (updateProposal) {
                if (activeOppIdRef.current) {
                    draftPayload.associated_opportunity_id = activeOppIdRef.current;
                }
                await updateProposal(draftServerId, {
                    customer: customerName,
                    status: updatedStatus,
                    proposal_data: draftPayload,
                    updated_at: new Date().toISOString(),
                    associated_opportunity_id: draftPayload.associated_opportunity_id
                });
            }
        }, 1000);
        
        return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
    }, [step, selectedCustomerId, unitsCovered, selectedFrequency, draftServerId, createDraft, updateProposal, editModeData, customers]);

    const activeOppIdRef = useRef(editModeData?.associated_opportunity_id || editModeData?.proposal_data?.associated_opportunity_id || null);

    const [isForceSaving, setIsForceSaving] = useState(false);
    const forceSaveAndExit = async () => {
        setIsForceSaving(true);
        if (syncTimer.current) clearTimeout(syncTimer.current);
        
        const customerName = selectedCustomerId 
            ? customers.find(c => c.id.toString() === selectedCustomerId.toString())?.name || 'Unknown' 
            : 'Unknown Customer';
        
        const draftPayload = {
            type: 'MAINTENANCE',
            frequency: selectedFrequency,
            units_covered: unitsCovered,
            total_price: parseFloat(calculatePrice(selectedFrequency)) || 0,
            wizard_state: { step, selectedCustomerId },
            associated_opportunity_id: activeOppIdRef.current
        };

        const currentStatus = editModeData?.status || 'Lead';
        const updatedStatus = ['Lead', 'Draft', 'QUOTING'].includes(currentStatus) ? 'Draft' : currentStatus;
        
        let targetId = draftServerId;
        
        try {
            if (!targetId) {
                const draft = await createDraft({
                    customer: customerName,
                    amount: 0,
                    proposal_data: draftPayload,
                    associated_opportunity_id: draftPayload.associated_opportunity_id
                });
                if (draft) {
                    targetId = draft.id;
                    if (draft.associated_opportunity_id) {
                        activeOppIdRef.current = draft.associated_opportunity_id;
                        draftPayload.associated_opportunity_id = draft.associated_opportunity_id;
                    }
                }
            } else if (updateProposal) {
                await updateProposal(targetId, {
                    customer: customerName,
                    status: updatedStatus,
                    proposal_data: draftPayload,
                    updated_at: new Date().toISOString(),
                    associated_opportunity_id: draftPayload.associated_opportunity_id
                });
            }
        } catch (err) {
            console.error("Failed to force save draft:", err);
        }
        
        setIsForceSaving(false);
        onComplete();
    };

    const currentCustomer = selectedCustomerId ? customers.find(c => c.id.toString() === selectedCustomerId.toString()) : null;

    return (
        <div className="page-container fade-in flex flex-col pt-2 md:pt-6 pb-6 overflow-x-hidden w-full max-w-[100vw]">
            <AnimatePresence>
            </AnimatePresence>
            <div className="glass-panel p-4 md:p-8 max-w-[1000px] mx-auto w-full md:w-[95%] lg:w-full min-w-0 overflow-hidden shadow-sm md:shadow-glass">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4 shrink-0">
                    <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 truncate">
                        <Shield className="text-emerald-600 shrink-0"/> 
                        <span className="truncate">{isEditing ? `Editing Program: ${draftServerId}` : 'Maintenance Program Builder'}</span>
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 w-full md:w-auto">
                        <button 
                            className="text-[11px] font-bold px-4 py-2.5 rounded-lg border shadow-sm transition-all flex items-center gap-2 bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                            onClick={forceSaveAndExit} 
                            disabled={isForceSaving}
                        >
                            <Save size={14} className={isForceSaving ? "animate-pulse" : ""}/> {isForceSaving ? "Saving..." : "Save Draft & Exit"}
                        </button>
                        <div className="flex flex-wrap justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
                        {[1,2,3,4].map(num => (
                            <button 
                                key={num} 
                                onClick={() => { if (isEditing) setStep(num); else if (num < step) setStep(num); }}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${step === num ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200 cursor-pointer' : (isEditing || num < step) ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                            >
                                {(isEditing && step !== num) || num < step ? <Check size={14}/> : num}
                            </button>
                        ))}
                        </div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
                        
                        {step === 1 && (
                            <div>
                                <h3 className="font-bold mb-4 text-slate-700">1. Select or Create Customer Profile</h3>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:p-6 min-w-0">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-2 gap-1 sm:gap-0 shrink-0">
                                        <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Search Existing Clients</label>
                                        <a href="/customers" className="text-[10px] md:text-xs font-bold text-emerald-600 hover:text-emerald-700 underline">+ Form New Customer</a>
                                    </div>
                                    <select className="w-full max-w-full border border-slate-300 rounded p-3 bg-white font-semibold text-slate-700 mb-6 text-sm overflow-hidden text-ellipsis shrink-0 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none transition-all" value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); setSelectedLocationId(''); }}>
                                        <option value="">-- Choose a Customer Profile --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.address}</option>)}
                                    </select>
                                    
                                    {currentCustomer && (
                                        <div className="bg-white p-4 border border-slate-200 rounded shadow-sm shrink-0">
                                            <h4 className="font-bold text-slate-700 border-b pb-2 mb-2 text-sm">Validate Information</h4>
                                            <p className="text-sm"><strong>Name:</strong> {currentCustomer.name}</p>
                                            <p className="text-sm"><strong>Primary Address:</strong> {currentCustomer.address || 'N/A'}</p>
                                            <p className="text-sm"><strong>Phone:</strong> {currentCustomer.phone || 'N/A'}</p>
                                            <p className="text-sm"><strong>Email:</strong> {currentCustomer.email || 'N/A'}</p>
                                            <p className="text-[10px] text-slate-400 mt-2">*If this is incorrect, please update the Customer Profile under the Customers tab.</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end mt-8 border-t border-slate-200 pt-6">
                                    <button className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 w-max" onClick={() => setStep(2)} disabled={!selectedCustomerId}>Next: Equipment Scope <ArrowRight size={16}/></button>
                                </div>
                            </div>
                        )}
                        
                        {step === 2 && (
                            <div>
                                <h3 className="font-bold mb-2 text-slate-700">2. Equipment Scope</h3>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:p-5 min-w-0 flex flex-col items-center justify-center">
                                    <div className="text-center mb-4">
                                        <p className="text-slate-500 font-medium text-lg">How many HVAC units will this plan cover?</p>
                                    </div>
                                    
                                    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center w-full max-w-md">
                                        <div className="text-6xl font-black text-emerald-600 mb-6 tracking-tighter drop-shadow-sm">{unitsCovered}</div>
                                        <div className="flex items-center gap-6">
                                            <button onClick={() => setUnitsCovered(Math.max(1, unitsCovered - 1))} className="w-12 h-12 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 shadow-sm transition-all text-2xl font-bold active:scale-95">-</button>
                                            <span className="text-lg font-bold text-slate-700 w-24 text-center">{unitsCovered === 1 ? 'Unit' : 'Units'}</span>
                                            <button onClick={() => setUnitsCovered(unitsCovered + 1)} className="w-12 h-12 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 shadow-sm transition-all text-2xl font-bold active:scale-95">+</button>
                                        </div>
                                    </div>

                                    <div className="mt-4 text-center bg-blue-50 text-blue-800 px-5 py-3 rounded-xl text-sm font-semibold border border-blue-100 flex items-center gap-2 shadow-sm max-w-md w-full justify-center">
                                        <Shield size={18} className="shrink-0" />
                                        <span>Base price covers the 1st unit. Each additional unit is 50% off!</span>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-4 border-t border-slate-200 pt-4">
                                    <button className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 w-max" onClick={() => setStep(1)}><ArrowLeft size={16}/> Back</button>
                                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 w-max" onClick={() => setStep(3)}>Next: Select Program <ArrowRight size={16}/></button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div>
                                <h3 className="font-bold mb-2 text-slate-700">3. Select Program Frequency</h3>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:p-5 min-w-0 flex flex-col justify-center">
                                    <div className="text-center mb-4">
                                        <p className="text-slate-500 font-medium text-lg">Choose the maintenance schedule for {unitsCovered} {unitsCovered === 1 ? 'unit' : 'units'}.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto w-full">
                                        {Object.entries(PLANS).map(([key, plan]) => (
                                            <div key={key} onClick={() => setSelectedFrequency(key)} className={`relative bg-white p-4 md:p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex flex-col ${selectedFrequency === key ? 'border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.15)] scale-[1.02] z-10 bg-emerald-50/30' : 'border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1'}`}>
                                                {selectedFrequency === key && (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                                                        Selected
                                                    </div>
                                                )}
                                                <div className="text-center mb-4 border-b border-slate-100 pb-3">
                                                    <div className="text-lg font-black text-slate-800 uppercase tracking-tight">{plan.title}</div>
                                                    <div className="text-emerald-600 font-bold mt-1 text-xs uppercase tracking-widest">{plan.label}</div>
                                                </div>
                                                <div className="flex-1 flex flex-col items-center justify-center mb-4">
                                                    <div className="flex items-start">
                                                        <span className="text-xl font-bold text-slate-400 mt-1 mr-1">$</span>
                                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{calculatePrice(key)}</span>
                                                    </div>
                                                    <div className="text-sm text-slate-400 mt-2 uppercase tracking-widest font-bold">Total / Year</div>
                                                </div>
                                                <div className="bg-slate-50 rounded-xl p-4 text-sm font-semibold text-slate-600 text-center border border-slate-100 shadow-inner">
                                                    Includes {plan.visits} full 29-point inspections.
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-between mt-4 border-t border-slate-200 pt-4">
                                    <button className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 w-max" onClick={() => setStep(2)}><ArrowLeft size={16}/> Back</button>
                                    <button className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all flex items-center justify-center gap-2 w-max" onClick={() => setStep(4)} disabled={!selectedFrequency}>Next: Review & Draft <ArrowRight size={16}/></button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div>
                                <h3 className="font-bold mb-2 text-slate-700">4. Review Proposal</h3>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 md:p-5 min-w-0 flex items-center justify-center">
                                    
                                    <div className="bg-white rounded-3xl border border-emerald-500 shadow-[0_8px_40px_rgba(16,185,129,0.15)] overflow-hidden w-full max-w-3xl transform transition-all hover:scale-[1.01]">
                                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6 text-center relative overflow-hidden">
                                            <div className="absolute top-0 right-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-12">
                                                <Shield size={250} />
                                            </div>
                                            <Shield size={40} className="mx-auto mb-3 relative z-10 opacity-90" />
                                            <h4 className="text-2xl font-black uppercase tracking-tight relative z-10">Residential Service Agreement</h4>
                                            <div className="text-emerald-50 mt-2 font-bold text-base relative z-10 bg-emerald-700/50 inline-block px-4 py-1 rounded-full shadow-inner">{PLANS[selectedFrequency]?.title} • {unitsCovered} {unitsCovered === 1 ? 'Unit' : 'Units'} Covered</div>
                                        </div>
                                        <div className="p-6 md:p-8">
                                            <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100">
                                                <div className="text-slate-500 font-bold uppercase tracking-widest text-sm">Annual Investment</div>
                                                <div className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-1"><span className="text-xl text-slate-400 font-bold">$</span>{calculatePrice(selectedFrequency)}</div>
                                            </div>
                                            
                                            <h5 className="font-bold text-slate-800 mb-4 uppercase tracking-widest text-xs flex items-center gap-2">
                                                <Wrench size={14} className="text-emerald-600"/> Program Benefits Include:
                                            </h5>
                                            <ul className="space-y-3">
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full"><Check size={14} strokeWidth={3} className="text-emerald-600" /></div>
                                                    <span className="text-slate-700 font-semibold text-base">{PLANS[selectedFrequency]?.visits} Visits per Year</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full"><Check size={14} strokeWidth={3} className="text-emerald-600" /></div>
                                                    <span className="text-slate-700 font-semibold text-base">29 Point Inspection w/ each visit (Indoor & Outdoor)</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full"><Check size={14} strokeWidth={3} className="text-emerald-600" /></div>
                                                    <span className="text-slate-700 font-semibold text-base">Filter Replacement</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full"><Check size={14} strokeWidth={3} className="text-emerald-600" /></div>
                                                    <span className="text-slate-700 font-semibold text-base">Clean Drain Pan (with Pan Tabs)</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full"><Check size={14} strokeWidth={3} className="text-emerald-600" /></div>
                                                    <span className="text-slate-700 font-semibold text-base">Flush Drain Line</span>
                                                </li>
                                                <li className="flex items-start gap-4">
                                                    <div className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full"><Check size={14} strokeWidth={3} className="text-emerald-600" /></div>
                                                    <span className="text-slate-700 font-semibold text-base">Provide Energy Saving Tips</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between mt-4 border-t border-slate-200 pt-4">
                                    <button className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 w-max" onClick={() => setStep(3)}><ArrowLeft size={16}/> Back</button>
                                    <button className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-black uppercase tracking-widest py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 w-max active:scale-95" onClick={handleSaveAndGenerate}>
                                        <Save size={18} /> Generate Official Draft
                                    </button>
                                </div>
                            </div>
                        )}
                        
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
