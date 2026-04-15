import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Zap, Shield, HelpCircle, HardDrive, Tag, Mail, ArrowLeft, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatQuoteId } from '../utils/formatters';
import SignaturePad from '../components/SignaturePad';

export default function PublicQuoteView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewState, setViewState] = useState('VIEW'); // VIEW, CONTRACT, DEPOSIT, CLOSED
    const [error, setError] = useState(false);
    
    // Interactions
    const [selectedTierLevel, setSelectedTierLevel] = useState('better'); 
    const [depositMethod, setDepositMethod] = useState('');
    const [depositAmount, setDepositAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    useEffect(() => {
        const fetchProposal = async () => {
            try {
                const { data, error } = await supabase
                    .from('proposals')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error("Proposal not found.");
                
                setProposal(data);
                
                if (data.status === 'Closed') {
                    setViewState('CLOSED');
                } else if (data.status === 'Approved') {
                    // Contract signed, waiting on deposit
                    setViewState('DEPOSIT');
                }
            } catch (err) {
                setError("This proposal link is invalid or has expired.");
            } finally {
                setLoading(false);
            }
        };
        fetchProposal();
    }, [id]);

    const handleAcceptClick = () => {
        setViewState('CONTRACT');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSignatureSave = async (signatureData) => {
        try {
            setIsProcessing(true);
            
            const tiers = proposal.proposal_data?.tiers || {};
            const activeTierData = tiers[selectedTierLevel] || Object.values(tiers)[0];
            const price = activeTierData?.salesPrice || proposal.amount || 0;

            const snapshot = {
                tier: selectedTierLevel,
                price: price,
                brand: activeTierData ? activeTierData.brand : 'Unknown',
                model: activeTierData ? activeTierData.series : 'Unknown',
                features: activeTierData ? activeTierData.features : [],
                accepted_timestamp: new Date().toISOString()
            };

            const updatedPayload = { 
                ...proposal.proposal_data, 
                approval_snapshot: snapshot,
                signature_data: signatureData
            };

            const { error } = await supabase
                .from('proposals')
                .update({ 
                    amount: price, // lock in the exact chosen tier amount
                    status: 'Approved',
                    proposal_data: updatedPayload
                })
                .eq('id', id);

            if (error) throw error;
            
            setProposal(prev => ({...prev, amount: price, status: 'Approved', proposal_data: updatedPayload}));
            setViewState('DEPOSIT');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            toast.error("Error finalizing your signature. Please contact your rep.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDepositSave = async () => {
        try {
            setIsProcessing(true);
            const depositPayload = {
                collected: true,
                method: depositMethod || 'Other',
                amount: parseFloat(depositAmount) || 0,
                timestamp: new Date().toISOString()
            };
            
            const updatedPayload = {
                ...proposal.proposal_data,
                deposit_data: depositPayload
            };

            const { error } = await supabase
                .from('proposals')
                .update({ 
                    status: 'Closed',
                    proposal_data: updatedPayload
                })
                .eq('id', id);

            if (error) throw error;
            
            setProposal(prev => ({...prev, status: 'Closed', proposal_data: updatedPayload}));
            setViewState('CLOSED');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            toast.success("Deal Locked! Sending Receipt...");
            
            // Background dispatch of email
            supabase.functions.invoke('send-close-documents', {
                body: { proposalId: id }
            }).then(({ error: invokeError }) => {
                if (invokeError) {
                    toast.error("Deal closed, but receipt email failed to send.");
                } else {
                    toast.success("Client receipt email delivered!");
                }
            });
        } catch (err) {
            toast.error("Failed to log deposit.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading && !proposal) return <div className="min-h-screen bg-[#fafafc] flex items-center justify-center text-slate-500 font-medium">Loading presentation...</div>;
    
    if (error) return (
        <div className="h-screen flex flex-col items-center justify-center p-6 bg-[#fafafc]">
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm">
             <div className="w-16 h-16 bg-rose-50 text-rose-500 flex items-center justify-center rounded-full mx-auto mb-4"><HelpCircle size={32}/></div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Quote Not Found</h2>
             <p className="text-slate-500 text-sm">We couldn't locate this proposal. Please contact your sales representative for a new link.</p>
           </div>
        </div>
    );

    // ============================================
    // STATE: CLOSED (Finalized Screen)
    // ============================================
    if (viewState === 'CLOSED') {
        const snapshot = proposal.proposal_data?.approval_snapshot;
        const deposit = proposal.proposal_data?.deposit_data;
        const signatureStr = proposal.proposal_data?.signature_data;
        const finalTierName = snapshot?.tier || 'System';
        const finalPrice = snapshot?.price || proposal.amount || 0;

        return (
            <div className="min-h-screen bg-[#fafafc] px-4 py-8 flex flex-col items-center justify-center relative">
                {user && (
                    <button onClick={() => navigate('/proposals')} className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={16}/> Back to Dashboard
                    </button>
                )}
                
                <div className="w-full max-w-[600px] relative">
                    {/* The Full Page Receipt Form */}
                    <div className="bg-slate-900 rounded-[32px] p-8 sm:p-12 shadow-2xl relative overflow-hidden text-center border border-slate-800">
                        {/* Background subtle blurs */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                        <div className="relative z-10 w-full">
                            <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center mb-8 border-4 border-slate-900/50">
                                <CheckCircle size={48} className="text-white" strokeWidth={2.5}/>
                            </div>
                            
                            <h3 className="text-3xl font-black tracking-tight text-white mb-2">Deal Authorized & Locked</h3>
                            <p className="text-lg text-slate-300 font-medium mb-10">Congratulations! Your system has been officially secured.</p>

                            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-[20px] p-6 text-left space-y-4 mb-10 shadow-inner">
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Reference ID</span>
                                    <span className="font-mono text-sm font-black text-emerald-400">{formatQuoteId(proposal)}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">System Investment</span>
                                    <span className="text-sm font-black text-white">${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">System Tier</span>
                                    <span className="text-sm font-black text-white capitalize">{finalTierName} — {snapshot?.model || 'Equipment'}</span>
                                </div>
                                <div className="flex justify-between items-center pb-2">
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Deposit Received</span>
                                    <span className="text-sm font-black text-white">{deposit?.method || 'None'} <span className="text-slate-500 font-normal mx-2">/</span> ${(deposit?.amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {signatureStr && (
                                <div className="mb-8">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Electronic Authorization Record</p>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex justify-center w-full min-h-[100px] items-center mx-auto">
                                        <img src={signatureStr} alt="Customer Signature" className="max-h-[80px] invert opacity-80 mix-blend-screen" />
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500 mt-2">Signed on {new Date(snapshot?.accepted_timestamp).toLocaleString()}</p>
                                </div>
                            )}

                            <button 
                                onClick={async () => {
                                    setIsSendingEmail(true);
                                    const { error } = await supabase.functions.invoke('send-close-documents', { body: { proposalId: id } });
                                    setIsSendingEmail(false);
                                    if (error) toast.error("Failed to resend receipt.");
                                    else toast.success("Receipt resent successfully!");
                                }}
                                disabled={isSendingEmail}
                                className="w-full bg-white hover:bg-slate-50 text-slate-900 font-black tracking-wide py-4 px-8 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform hover:scale-[1.02] active:scale-95 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Mail size={18}/> {isSendingEmail ? 'Sending...' : 'Issue Replacement Receipt'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // STATES: VIEW, CONTRACT, DEPOSIT (Active Sales Flow)
    // ============================================
    
    // Tiers mapping
    const tiersObj = proposal.proposal_data?.tiers || {};
    const validTiers = ['good', 'better', 'best'].filter(t => !!tiersObj[t]);
    
    // Safety fallback
    const activeTierName = validTiers.includes(selectedTierLevel) ? selectedTierLevel : (validTiers[0] || 'good');
    const activeTierData = tiersObj[activeTierName];
    const currentPrice = activeTierData?.salesPrice || proposal.amount || 0;

    return (
        <div className="min-h-screen bg-[#fafafc] pb-24 relative">
            {/* Nav Hatch */}
            {user && (
                <div className="absolute top-6 left-6 z-50">
                    <button onClick={() => navigate('/proposals')} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/50 shadow-sm">
                        <ArrowLeft size={16}/> Back to Dashboard
                    </button>
                </div>
            )}
            
            <div className="max-w-6xl mx-auto px-4 pt-20 lg:pt-24">
                {/* Header */}
                <header className="mb-12 text-center">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">System Options</h1>
                    <p className="text-base font-semibold text-slate-500">Prepared exclusively for {proposal.customer}</p>
                </header>

                <div className={`grid grid-cols-1 ${validTiers.length === 3 ? 'lg:grid-cols-3' : validTiers.length === 2 ? 'lg:grid-cols-2 max-w-4xl mx-auto' : 'max-w-xl mx-auto'} gap-6 mb-12`}>
                   
                    {validTiers.map(tierKey => {
                        const tInfo = tiersObj[tierKey];
                        const isSelected = activeTierName === tierKey;
                        const isContractPhase = viewState === 'CONTRACT' || viewState === 'DEPOSIT';
                        
                        // If we are in signing/deposit phase, ONLY show the selected tier.
                        if (isContractPhase && !isSelected) return null;
                        
                        return (
                            <div 
                                key={tierKey} 
                                onClick={() => !isContractPhase && setSelectedTierLevel(tierKey)}
                                className={`
                                    relative bg-white rounded-[24px] overflow-hidden transition-all duration-300 transform
                                    ${isContractPhase ? 'col-span-full max-w-xl mx-auto w-full border-2 border-emerald-500 shadow-xl' : isSelected ? 'border-2 border-slate-900 shadow-xl scale-[1.02] z-10' : 'border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md cursor-pointer opacity-90'}
                                `}
                            >
                                {/* Recommended Badge */}
                                {tierKey === 'better' && !isContractPhase && (
                                    <div className="absolute top-0 inset-x-0 flex justify-center">
                                        <span className="bg-primary-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-b-md shadow-sm">Recommended</span>
                                    </div>
                                )}
                                
                                <div className={`p-8 text-center ${isSelected ? 'bg-slate-900 border-b border-slate-800' : 'bg-slate-50 border-b border-slate-100'}`}>
                                    <h3 className={`text-xl font-black uppercase tracking-wider mb-2 ${isSelected ? 'text-white' : 'text-slate-800'}`}>{tierKey}</h3>
                                    <div className={`text-4xl font-black tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                        ${(tInfo.salesPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <div className={`text-xs font-bold uppercase tracking-widest mt-3 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {tInfo.tons} Ton System
                                    </div>
                                </div>
                                
                                <div className="p-8">
                                    <div className="mb-6 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                                                <HardDrive size={14}/>
                                            </div>
                                            <div className="text-left">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Equipment</div>
                                                <div className="text-sm font-bold text-slate-800">{tInfo.brand} {tInfo.series || ''}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                                                <Zap size={14}/>
                                            </div>
                                            <div className="text-left">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Efficiency</div>
                                                <div className="text-sm font-bold text-slate-800">Up to {tInfo.seer || 18} SEER2</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <ul className="space-y-3 border-t border-slate-100 pt-6">
                                        {tInfo.features && tInfo.features.map((feat, idx) => (
                                           <li key={idx} className="flex gap-3 text-sm font-medium text-slate-600 items-start text-left">
                                              <div className="mt-0.5 text-emerald-500"><CheckCircle size={16}/></div>
                                              <span className="leading-snug">{feat}</span>
                                           </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Active Indicator (View Mode Only) */}
                                {!isContractPhase && isSelected && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Workflow Container */}
                <div className="max-w-xl mx-auto">
                    {viewState === 'VIEW' ? (
                        <div className="text-center animate-fade-in-up">
                            <button 
                                onClick={handleAcceptClick}
                                className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/20 text-white font-black tracking-wide py-4 px-12 rounded-xl transition-all shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 mx-auto text-lg"
                            >
                                <PenTool size={20}/> Build {activeTierName.charAt(0).toUpperCase() + activeTierName.slice(1)} Contract
                            </button>
                            <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">Pricing locked digitally</p>
                        </div>
                    ) : viewState === 'CONTRACT' ? (
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in-up">
                            <div className="bg-slate-900 p-6 text-center text-white">
                                <h3 className="text-xl font-black mb-1">Authorization Required</h3>
                                <p className="text-sm font-medium text-slate-400">Please provide your electronic signature below.</p>
                            </div>
                            <div className="p-8">
                                <SignaturePad onSave={handleSignatureSave} onCancel={() => setViewState('VIEW')} />
                            </div>
                        </div>
                    ) : viewState === 'DEPOSIT' ? (
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in-up">
                            <div className="bg-emerald-500 p-6 text-center text-white">
                                <h3 className="text-xl font-black mb-1">Signature Locked</h3>
                                <p className="text-sm font-bold text-emerald-100">Please hand device to representative to log initial transaction.</p>
                            </div>
                            <div className="p-8 space-y-5">
                                <div>
                                   <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 block">Deposit Method</label>
                                   <select className="w-full border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-slate-900 text-slate-800 font-bold transition-colors appearance-none bg-slate-50" value={depositMethod} onChange={e=>setDepositMethod(e.target.value)}>
                                      <option value="">Select Method...</option>
                                      <option value="Credit Card">Credit Card / Terminal</option>
                                      <option value="Check">Check</option>
                                      <option value="Cash">Cash</option>
                                      <option value="Financing">Financing Approved</option>
                                      <option value="None">No Deposit Required</option>
                                   </select>
                                </div>
                                {depositMethod !== 'None' && depositMethod !== '' && (
                                    <div>
                                       <label className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2 block">Deposit Amount ($)</label>
                                       <input type="number" className="w-full border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-slate-900 font-mono font-black text-slate-800 text-lg transition-colors bg-slate-50" placeholder="1000.00" value={depositAmount} onChange={e=>setDepositAmount(e.target.value)}/>
                                    </div>
                                )}
                                <button 
                                    onClick={handleDepositSave}
                                    disabled={isProcessing || (!depositMethod || (depositMethod !== 'None' && !depositAmount))}
                                    className="w-full bg-slate-900 hover:bg-black text-white font-black tracking-wide py-4 px-8 rounded-xl transition-all shadow-xl hover:-translate-y-1 mt-4 disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {isProcessing ? 'Processing...' : 'Finalize Contract & Issue Receipt'}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
