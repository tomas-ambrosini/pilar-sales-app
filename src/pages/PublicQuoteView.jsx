import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, Zap, Shield, HelpCircle, HardDrive, Tag, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatQuoteId } from '../utils/formatters';
import SignaturePad from '../components/SignaturePad';

export default function PublicQuoteView() {
    const { id } = useParams();
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // VIEW -> CONTRACT -> DEPOSIT -> CLOSED
    const [viewState, setViewState] = useState('VIEW'); 
    
    // Deposit State
    const [depositMethod, setDepositMethod] = useState('');
    const [depositAmount, setDepositAmount] = useState('');

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
            setLoading(true);
            
            const price = proposal.amount || 0;
            let tierName = 'Proposal Details';
            let tierData = null;
            if (proposal.proposal_data?.tiers) {
                tierName = ['good', 'better', 'best'].find(t => proposal.proposal_data.tiers[t]?.salesPrice === price) || 'System';
                tierData = proposal.proposal_data.tiers[tierName] || proposal.proposal_data.tiers['good'];
            }

            const snapshot = {
                tier: tierName,
                price: price,
                brand: tierData ? tierData.brand : 'Unknown',
                model: tierData ? tierData.series : 'Unknown',
                features: tierData ? tierData.features : [],
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
                    status: 'Approved',
                    proposal_data: updatedPayload
                })
                .eq('id', id);

            if (error) throw error;
            
            setProposal(prev => ({...prev, status: 'Approved', proposal_data: updatedPayload}));
            setViewState('DEPOSIT');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            toast.error("Error finalizing your signature. Please contact your rep.");
        } finally {
            setLoading(false);
        }
    };

    const handleDepositSave = async () => {
        try {
            setLoading(true);
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
            toast.success("Deal Locked & Closed!");
        } catch (err) {
            toast.error("Failed to log deposit.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && !proposal) return <div className="h-screen flex items-center justify-center p-6 text-slate-500">Loading your proposal...</div>;
    
    if (error) return (
        <div className="h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
           <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm">
             <div className="w-16 h-16 bg-rose-50 text-rose-500 flex items-center justify-center rounded-full mx-auto mb-4"><HelpCircle size={32}/></div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Quote Not Found</h2>
             <p className="text-slate-500 text-sm">We couldn't locate this proposal. Please contact your sales representative for a new link.</p>
           </div>
        </div>
    );

    const price = proposal.amount || 0;
    // Attempt to pull Good/Better/Best selected tier natively if it exists
    let tierName = 'Proposal Details';
    let tierData = null;
    
    if (proposal.proposal_data?.tiers) {
        tierName = ['good', 'better', 'best'].find(t => proposal.proposal_data.tiers[t]?.salesPrice === price) || 'System Configuration';
        tierData = proposal.proposal_data.tiers[tierName] || proposal.proposal_data.tiers['good'];
    }

    return (
        <div className="min-h-screen bg-[#fafafc] px-4 py-8 lg:py-12 flex justify-center">
            <div className="w-full max-w-2xl">
                
                {/* Clean Header */}
                <header className="mb-8 text-center sm:text-left">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Pilar Home</h1>
                    <p className="text-sm font-semibold text-slate-500">Prepared exclusively for {proposal.customer}</p>
                </header>

                <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden mb-8">
                    
                    {/* Hero Impact Area */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary-500/20 blur-3xl rounded-full"></div>
                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary-200 mb-4 border border-white/10">
                                {tierName} {tierData ? `— ${tierData.tons} Ton` : ''}
                            </span>
                            <h2 className="text-3xl font-black tracking-tight mb-2">Total Investment</h2>
                            <div className="text-5xl font-black tracking-tighter text-white">
                                ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {proposal.applied_promo_code && (
                                <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                                    <Tag size={14} className="text-emerald-300" />
                                    <span className="text-sm font-bold text-emerald-100 uppercase tracking-wide">
                                        {proposal.applied_promo_code} ({proposal.applied_discount_percent}% Off)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features Breakdown */}
                    {tierData && (
                        <div className="p-8">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">What's Included in Your System</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                   <div className="mt-0.5 text-primary-500"><HardDrive size={18}/></div>
                                   <div>
                                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Equipment</p>
                                       <p className="font-bold text-slate-800 text-sm">{tierData.brand} {tierData.series || 'Series'}</p>
                                   </div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                   <div className="mt-0.5 text-primary-500"><Zap size={18}/></div>
                                   <div>
                                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Efficiency</p>
                                       <p className="font-bold text-slate-800 text-sm">Up to {tierData.seer || 18} SEER2</p>
                                   </div>
                                </div>
                            </div>
                            
                            <ul className="mt-6 space-y-3">
                                {tierData.features && tierData.features.map((feat, idx) => (
                                   <li key={idx} className="flex gap-3 text-sm font-medium text-slate-600 items-start">
                                      <div className="mt-0.5 text-emerald-500"><CheckCircle size={16}/></div>
                                      {feat}
                                   </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {/* Why Pilar Home Trust Elements */}
                    {(viewState === 'VIEW' || viewState === 'CONTRACT') && (
                        <div className="px-8 pb-8">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                <h4 className="text-[11px] uppercase tracking-widest font-black text-primary-600 mb-4">Why Homeowners Choose Pilar Home</h4>
                                <ul className="space-y-4">
                                    <li className="flex gap-3">
                                        <div className="mt-0.5 text-slate-400"><CheckCircle size={16}/></div>
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-800 block">Professional, quality-driven service</span>
                                            <span className="text-slate-500 font-medium">Expert installation mapped to industry best practices.</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-0.5 text-slate-400"><CheckCircle size={16}/></div>
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-800 block">Transparent proposal options</span>
                                            <span className="text-slate-500 font-medium">No hidden fees. The price you see is exactly what you pay.</span>
                                        </div>
                                    </li>
                                    <li className="flex gap-3">
                                        <div className="mt-0.5 text-slate-400"><CheckCircle size={16}/></div>
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-800 block">Ongoing support from our team</span>
                                            <span className="text-slate-500 font-medium">We stand by our work long after the installation is complete.</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Frictionaless Acceptance Bottom Area */}
                    <div className="p-8 bg-slate-50 border-t border-slate-100">
                        {viewState === 'CLOSED' ? (
                            <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-8 sm:p-12 text-center text-white mt-4">
                                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-primary-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                                <div className="relative z-10 space-y-6">
                                    <div className="mx-auto w-24 h-24 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center mb-8 border-4 border-slate-900/50">
                                        <CheckCircle size={48} className="text-white" strokeWidth={2.5}/>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-3xl font-black tracking-tight text-white">Deal Authorized & Locked</h3>
                                        <p className="text-lg text-slate-300 font-medium">Congratulations! Your system has been officially secured.</p>
                                    </div>

                                    <div className="max-w-md mx-auto bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 mb-8 text-left space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Reference ID</span>
                                            <span className="font-mono text-sm font-black text-emerald-400">{formatQuoteId(proposal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Deposit Received</span>
                                            <span className="text-sm font-black text-white">{proposal.proposal_data?.deposit_data?.method || 'None'} / ${(proposal.proposal_data?.deposit_data?.amount || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">System Tier</span>
                                            <span className="text-sm font-black text-white capitalize">{proposal.proposal_data?.approval_snapshot?.tier || 'System'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                                        <a 
                                           href={`mailto:?subject=Signed Contract - ${proposal.customer}&body=Hello,%0D%0A%0D%0AHere is a secure link to your finalized contract and deposit receipt. This link acts as your digital record:%0D%0A${window.location.href}%0D%0A%0D%0AThank you!`}
                                           className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 font-black tracking-wide py-4 px-8 rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 inline-flex items-center justify-center gap-2"
                                        >
                                           <Mail size={18}/> Email Receipt & Contract
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ) : viewState === 'DEPOSIT' ? (
                            <div className="py-6 bg-white border border-slate-200 rounded-2xl shadow-sm px-6 max-w-md mx-auto">
                                <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">Signature Captured</h3>
                                <p className="text-sm font-medium text-amber-600 bg-amber-50 rounded p-2 mb-6 text-center border border-amber-100">Please hand the device back to your representative to log the initial deposit.</p>
                                
                                <div className="space-y-4">
                                    <div>
                                       <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Deposit Method</label>
                                       <select className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-primary-500 text-slate-800" value={depositMethod} onChange={e=>setDepositMethod(e.target.value)}>
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
                                           <label className="text-xs font-bold text-slate-700 uppercase mb-1 block">Deposit Amount ($)</label>
                                           <input type="number" className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-primary-500 font-mono text-slate-800" placeholder="1000.00" value={depositAmount} onChange={e=>setDepositAmount(e.target.value)}/>
                                        </div>
                                    )}
                                    <button 
                                        onClick={handleDepositSave}
                                        disabled={loading || (!depositMethod || (depositMethod !== 'None' && !depositAmount))}
                                        className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl transition-all shadow-md flex justify-center mt-2 disabled:opacity-50"
                                    >
                                        {loading ? 'Processing...' : 'Finalize Deal & Log Component'}
                                    </button>
                                </div>
                            </div>
                        ) : viewState === 'CONTRACT' ? (
                            <div className="-mx-8 -mb-8">
                                <SignaturePad onSave={handleSignatureSave} onCancel={() => setViewState('VIEW')} />
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Ready to move forward?</h3>
                                <p className="text-sm text-slate-500 mb-4 font-medium">Click below to proceed to the electronic signature capture.</p>
                                <button 
                                   onClick={handleAcceptClick}
                                   className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                   Accept Proposal & Sign Contract
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                <footer className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mt-8">
                    Powered by Pilar Home
                </footer>
            </div>
        </div>
    );
}
