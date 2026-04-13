import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, Zap, Shield, HelpCircle, HardDrive } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PublicQuoteView() {
    const { id } = useParams();
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accepted, setAccepted] = useState(false);
    const [signature, setSignature] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);

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
                
                // If it is already approved, we just show a Read-Only state
                if (data.status === 'Approved') {
                    setAccepted(true);
                    setSignature(data.proposal_data?.signature_data || data.signature_data || 'Signed Electronically');
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
        if (!signature.trim()) {
           toast.error("Please type your name to accept.");
           return;
        }
        setShowConfirmation(true);
    };

    const handleConfirmAccept = async () => {
        setShowConfirmation(false);
        try {
            setLoading(true);
            
            // Build Approval Snapshot
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
                signer: signature,
                accepted_timestamp: new Date().toISOString()
            };

            const updatedPayload = { 
                ...proposal.proposal_data, 
                approval_snapshot: snapshot,
                signature_data: signature
            };

            const { error } = await supabase
                .from('proposals')
                .update({ 
                    status: 'Approved',
                    proposal_data: updatedPayload
                })
                .eq('id', id);

            if (error) throw error;
            
            setAccepted(true);
            setProposal(prev => ({...prev, status: 'Approved', proposal_data: updatedPayload}));
            toast.success("Proposal Accepted! Thank you.");
            
        } catch (err) {
            toast.error("Error finalizing your acceptance. Please contact your rep.");
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
                    {!accepted && (
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
                        {accepted ? (
                            <div className="text-center py-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Shield size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">You're all set!</h3>
                                <p className="text-base text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
                                    Your approval has been received. A Pilar Home team member will contact you shortly to confirm next steps and schedule your installation.
                                </p>
                                <div className="inline-block bg-slate-50 border border-slate-200 px-6 py-3 rounded-xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reference ID</p>
                                    <p className="font-mono font-bold text-slate-700" title={proposal.proposal_number ? `Legacy ID: ${proposal.id}` : ''}>{proposal.proposal_number || `PH-${proposal.id.substring(0,8).toUpperCase()}`}</p>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Ready to move forward?</h3>
                                <p className="text-sm text-slate-500 mb-4 font-medium">By typing your name and clicking Accept, you electronically authorize this proposal.</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                       type="text" 
                                       placeholder="Type your full name as signature" 
                                       className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 font-bold bg-white shadow-inner"
                                       value={signature}
                                       onChange={(e) => setSignature(e.target.value)}
                                    />
                                    <button 
                                       onClick={handleAcceptClick}
                                       disabled={loading}
                                       className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none sm:w-auto flex items-center justify-center gap-2"
                                    >
                                       {loading ? 'Processing...' : 'Accept & Move Forward'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Double Opt-In Modal Overlay */}
                {showConfirmation && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center mb-4">
                                <HelpCircle size={24}/>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Are you ready to move forward?</h3>
                            <p className="text-sm text-slate-600 mb-6">
                                You are electronically signing the <span className="font-bold">{tierName}</span> system proposal for <span className="font-bold">${price.toLocaleString()}</span>. 
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                    onClick={() => setShowConfirmation(false)}>
                                    Cancel
                                </button>
                                <button 
                                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors shadow-md"
                                    onClick={handleConfirmAccept}>
                                    Aprove Quote
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <footer className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Powered by Pilar Home
                </footer>
            </div>
        </div>
    );
}
