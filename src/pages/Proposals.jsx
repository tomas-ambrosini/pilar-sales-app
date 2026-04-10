import React, { useState, useEffect } from 'react';
import { computeCommission, getRetailFromBest, getFloorPrice } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useProposals } from '../context/ProposalContext';
import { useCustomers } from '../context/CustomerContext';
import { Search, Plus, Calendar, Settings, ShieldCheck, Mail, Printer, AlertTriangle, FileText, Share, Clock, Home, PenTool, CheckCircle, Smartphone, Edit2, Trash2, ArrowRight, CalendarClock, Lock, Link, Copy } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import './Proposals.css';
import { PIPELINE_STATES, PipelineController } from '../utils/pipelineControls';
import ProposalWizard from '../components/ProposalWizard';
import ProposalViewerModal from '../components/ProposalViewerModal';
import ContractDocumentModal from '../components/ContractDocumentModal';
import SignaturePad from '../components/SignaturePad';
import { useSearchParams } from 'react-router-dom';

export default function Proposals() {
  const { proposals, addProposal, updateProposal, deleteProposal, loading } = useProposals();
  const { customers } = useCustomers();
  const [searchParams] = useSearchParams();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardConfig, setWizardConfig] = useState(null);

  useEffect(() => {
     const draftCustStr = localStorage.getItem('pilar_draft_customer');
     if (draftCustStr) {
         try {
            const draftCust = JSON.parse(draftCustStr);
            setWizardConfig({
                isDraft: true,
                step: 1,
                selectedCustomerId: draftCust.household_id || draftCust.customer_id || '',
                selectedLocationId: draftCust.site_survey_data?.property_id || '',
                survey: draftCust.site_survey_data || null,
                proposal_data: { associated_opportunity_id: draftCust.id || draftCust.dbId }
            });
            setShowWizard(true);
         } catch(e){}
         localStorage.removeItem('pilar_draft_customer');
     } else if (searchParams.get('action') === 'new') {
         setShowWizard(true);
         setWizardConfig(true);
         window.history.replaceState({}, document.title, window.location.pathname);
     }
  }, [searchParams]);

  const [viewingProposal, setViewingProposal] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [signingContract, setSigningContract] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [deletingProposal, setDeletingProposal] = useState(null);
  const [editForm, setEditForm] = useState({ customer: '', amount: '', status: '' });
  const [activeDraft, setActiveDraft] = useState(null);
  const [filterMode, setFilterMode] = useState('All');

  useEffect(() => {
     if (!showWizard && typeof window !== 'undefined') {
         const draftStr = localStorage.getItem('pilar_wizard_draft');
         if (draftStr) {
             try { setActiveDraft(JSON.parse(draftStr)); } catch(e){}
         } else {
             setActiveDraft(null);
         }
     }
  }, [showWizard]);
  
  if (loading && proposals.length === 0) return <div className="page-container flex-center"><h3>Loading Proposals...</h3></div>;
  if (showWizard) return <ProposalWizard onComplete={() => setShowWizard(false)} addProposal={addProposal} updateProposal={updateProposal} editModeData={wizardConfig} />;

  const handleEditOpen = (proposal) => {
    if (proposal.status === 'Approved') return;
    setEditingProposal(proposal);
    setEditForm({ customer: proposal.customer, amount: proposal.amount, status: proposal.status });
  };

  const handleDeleteOpen = (proposal) => {
    if (proposal.status === 'Approved') return;
    setDeletingProposal(proposal);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateProposal(editingProposal.id, {
       customer: editForm.customer,
       amount: parseFloat(editForm.amount) || 0,
       status: editForm.status
    });
    setEditingProposal(null);
  };

  const handleReopenInWizard = () => {
     if (editingProposal?.status === 'Approved') return; // Additional security lock
     if (['Sent', 'Opened'].includes(editingProposal.status)) {
        // Automatically Clone to prevent state pollution on active deals
        updateProposal(editingProposal.id, { status: 'Rejected (Replaced)' });
        
        // Force clone by stripping ID
        const clonedData = { ...editingProposal };
        delete clonedData.id;
        clonedData.status = 'Draft';
        setShowWizard(clonedData);
        setEditingProposal(null);
     } else {
        setShowWizard(editingProposal);
        setEditingProposal(null);
     }
  };

  const getProposalUrl = (id) => {
     const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
     return `${baseUrl}/quote/${id}`;
  };

  const handleCopyLink = async (proposal) => {
    try {
      await navigator.clipboard.writeText(getProposalUrl(proposal.id));
      toast.success('Link Copied to Clipboard!');
      // Explicitly NOT changing status to 'Sent' just for copying a link quietly.
    } catch (e) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyMessage = async (proposal) => {
    try {
      const url = getProposalUrl(proposal.id);
      const message = `Hi ${proposal.customer.split(' ')[0]},\n\nI just put together your Pilar Home proposal. You can review all options here:\n\n${url}\n\nLet me know what you think when you're ready.`;
      await navigator.clipboard.writeText(message);
      toast.success('Message Copied to Clipboard!');
      
      const isNewSend = proposal.status === 'Draft';
      if (isNewSend) await updateProposal(proposal.id, { status: 'Sent' });
      
      // Minimal Analytics Trail
      if (proposal.proposal_data?.associated_opportunity_id) {
         try {
             const opp = await supabase.from('opportunities').select('household_id').eq('id', proposal.proposal_data.associated_opportunity_id).single();
             if (opp.data?.household_id) {
                 await supabase.from('activity_logs').insert({
                     household_id: opp.data.household_id,
                     activity_type: 'Quote Sent',
                     description: `Proposal link copied to clipboard. Status advanced to Sent.`
                 });
             }
         } catch(e) {}
      }
    } catch (e) {
      toast.error('Failed to copy message');
    }
  };

  const handleMailto = async (proposal) => {
      const url = getProposalUrl(proposal.id);
      const subject = encodeURIComponent(`Your Pilar Home Proposal - ${proposal.customer}`);
      const body = encodeURIComponent(`Hi ${proposal.customer.split(' ')[0]},\n\nI just put together your Pilar Home proposal. You can review all options securely here:\n\n${url}\n\nLet me know what you think when you're ready.\n\nBest,`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      
      const isNewSend = proposal.status === 'Draft';
      if (isNewSend) await updateProposal(proposal.id, { status: 'Sent' });
      
      // Minimal Analytics Trail
      if (proposal.proposal_data?.associated_opportunity_id) {
         try {
             const opp = await supabase.from('opportunities').select('household_id').eq('id', proposal.proposal_data.associated_opportunity_id).single();
             if (opp.data?.household_id) {
                 await supabase.from('activity_logs').insert({
                     household_id: opp.data.household_id,
                     activity_type: 'Quote Sent',
                     description: `Proposal triggered via Mailto protocol. Status advanced to Sent.`
                 });
             }
         } catch(e) {}
      }
  };

  const handleInitiateAcceptance = (tierName, tierData, proposal) => {
     // Instead of instantly fulfilling the database, we launch the Signature Capture
     setViewingProposal(null);
     setSigningContract({ proposal, tierName, tierData, date: new Date().toLocaleDateString() });
  };

  const executeSignedContract = async (signatureData) => {
     if (!signingContract) return;
     const { tierName, tierData, proposal } = signingContract;

     // 1. Build Work Order Payload
     const workOrderNotes = `
**FIELD WORK ORDER**
Accepted Tier: ${tierName}
Equipment: ${tierData.brand} ${tierData.series} (${tierData.tons} Ton)
Included Add-ons / Features:
${(tierData.features || []).map(f => `- ${f}`).join('\n')}

> System Note: Proposal ${proposal.id} electronically signed and converted to Job on ${new Date().toLocaleDateString()}.
`.trim();

     const oppId = proposal.proposal_data?.associated_opportunity_id;
     if (oppId) {
         try {
             // 1. Get existing opportunity data
             const { data: oppRow } = await supabase.from('opportunities').select('household_id, proposal_data').eq('id', oppId).single();
             
             // 2. We inject the accepted tier and signature into the Opportunity's proposal_data payload
             const updatedOppPayload = {
                 ...(oppRow?.proposal_data || proposal.proposal_data || {}),
                 selected_tier: tierName,
                 signature: signatureData,
                 manager_approved: false // explicitly flag for Operations Queue
             };

             // 3. Update Sales Pipeline Opportunity. (It will now sit in Operations waiting for Manager Approval)
             try {
                // If it is generated from scratch, we assume it went from PROPOSAL_SENT to APPROVED.
                await PipelineController.approveDeal(oppId, PIPELINE_STATES.PROPOSAL_SENT, {
                     dispatch_notes: workOrderNotes,
                     proposal_data: updatedOppPayload
                });
             } catch (e) {
                console.warn(e);
             }

             // 3b. Simultaneously auto-generate the Operational Work Order for Dispatch
             await supabase.from('work_orders').insert({
                 opportunity_id: oppId,
                 household_id: oppRow?.household_id,
                 status: 'Unscheduled',
                 urgency_level: 'Medium',
                 execution_payload: {
                     tierName: tierName,
                     systemSize: tierData.tons,
                     brand: tierData.brand,
                     series: tierData.series,
                     features: tierData.features
                 },
                 dispatch_notes: workOrderNotes
             });

             if (oppRow?.household_id) {
                 // 4. Inject Verified Paper Trail to Customer CRM File
                 await supabase.from('activity_logs').insert({
                     household_id: oppRow.household_id,
                     activity_type: 'Contract Executed (Pending Approval)',
                     description: `Client signed Digital Contract for ${tierName} System. Awaiting Manager Approval in Operations.`,
                     is_pinned_alert: true
                 });
             }
         } catch(e) {
             console.error("Failed to sync structural databases:", e);
         }
     }

     // 5. Update Proposal Status, Lock Amount, and Save Signature in JSON Payload!
     const finalDbObj = { 
         status: 'Approved',
         amount: tierData.salesPrice,
         proposal_data: {
             ...(proposal.proposal_data || {}),
             signature_data: signatureData
         }
     };
     
     await updateProposal(proposal.id, finalDbObj);

     // Move to the View Contract state
     const finalContractData = { ...signingContract };
     finalContractData.proposal.proposal_data = { ...(finalContractData.proposal.proposal_data || {}), signature_data: signatureData };
     setSigningContract(null);
     setViewingContract(finalContractData);
  };

  const handleDeleteConfirm = () => {
    deleteProposal(deletingProposal.id);
    setDeletingProposal(null);
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Sales Proposals & Estimates</h1>
          <p className="page-subtitle">Track and generate equipment replacement quotes.</p>
        </div>
        <button className="primary-action-btn" onClick={() => setShowWizard(true)}>
          <Plus size={18} /> Generate Quote
        </button>
      </header>
      
      <div className="flex gap-2 mb-6 mt-4 animate-in fade-in slide-in-from-bottom-2">
         {['All', 'Draft', 'Sent', 'Approved'].map(mode => (
             <button 
                key={mode} 
                onClick={() => setFilterMode(mode)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filterMode === mode ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
             >
                {mode}
             </button>
         ))}
      </div>

      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
         {activeDraft && filterMode === 'All' && (
           <div className="border border-primary-200 bg-primary-50 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-white shadow-sm text-primary-600 rounded-full flex items-center justify-center font-bold shrink-0">
                    <PenTool size={18} />
                 </div>
                 <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                       Unsaved Session 
                       <span className="text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded border bg-white text-primary-700 border-primary-200">
                          Draft Saved
                       </span>
                    </h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                       {activeDraft.selectedCustomerId && customers && customers.length > 0 ? `Customer: ${customers.find(c => c.id.toString() === activeDraft.selectedCustomerId?.toString())?.name || 'Unknown'}` : 'Pick up right where you left off.'}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                 <button onClick={() => { localStorage.removeItem('pilar_wizard_draft'); setActiveDraft(null); }} className="text-xs text-slate-400 hover:text-danger-600 font-bold transition-colors px-2 py-1">Discard</button>
                 <button 
                   className="flex items-center gap-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors shadow-sm shrink-0"
                   onClick={() => setShowWizard({ isDraft: true, ...activeDraft })}
                 >
                    Resume Quote <ArrowRight size={14}/>
                 </button>
              </div>
           </div>
         )}
        
        {(() => {
           const filteredProposals = proposals.filter(p => filterMode === 'All' || p.status === filterMode);
           
           if (filteredProposals.length === 0 && (!activeDraft || filterMode !== 'All')) {
              return (
                 <div className="border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px]">
                   <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><FileText size={32} /></div>
                   <p className="text-slate-500 font-semibold mb-6">No proposals found {filterMode !== 'All' ? `for ${filterMode}` : 'yet'}.</p>
                   {filterMode === 'All' && (
                     <button className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105" onClick={() => setShowWizard(true)}>
                       <Plus size={18} /> Build First Quote
                     </button>
                   )}
                 </div>
              );
           }
           
           return (
             <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col mt-4 w-full">
               <div className="overflow-x-auto">
                 {loading ? (
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                         <th className="p-4 px-6 font-medium">Customer / ID</th>
                         <th className="p-4 px-6 font-medium">Status</th>
                         <th className="p-4 px-6 font-medium">Est. Value</th>
                         <th className="p-4 px-6 font-medium hidden lg:table-cell">Rep Owner</th>
                         <th className="p-4 px-6 font-medium text-right">Actions</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {[1, 2, 3, 4, 5].map((i) => (
                         <tr key={i} className="animate-pulse">
                           <td className="p-4 px-6">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                               <div className="flex flex-col">
                                 <div className="h-4 bg-slate-200 rounded w-32 mb-1.5"></div>
                                 <div className="h-3 bg-slate-200 rounded w-24"></div>
                               </div>
                             </div>
                           </td>
                           <td className="p-4 px-6">
                             <div className="h-6 bg-slate-200 rounded-md w-20"></div>
                           </td>
                           <td className="p-4 px-6">
                             <div className="h-4 bg-slate-200 rounded w-24 mb-1.5"></div>
                             <div className="h-3 bg-slate-200 rounded w-16"></div>
                           </td>
                           <td className="p-4 px-6 hidden lg:table-cell">
                             <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                               <div className="h-4 bg-slate-200 rounded w-24"></div>
                             </div>
                           </td>
                           <td className="p-4 px-6 text-right">
                             <div className="h-8 bg-slate-200 rounded w-24 ml-auto"></div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 ) : (
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                       <th className="p-4 px-6 font-medium">Customer / ID</th>
                       <th className="p-4 px-6 font-medium">Status</th>
                       <th className="p-4 px-6 font-medium">Est. Value</th>
                       <th className="p-4 px-6 font-medium hidden lg:table-cell">Rep Owner</th>
                       <th className="p-4 px-6 font-medium text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredProposals.map(proposal => {
                        let badgeColors = 'bg-slate-100 text-slate-600 border-slate-200';
                        let borderAccent = 'border-transparent';
                        if (proposal.status === 'Sent') {
                           badgeColors = 'bg-blue-50 text-blue-700 border-blue-200';
                           borderAccent = 'border-l-[3px] border-l-blue-500';
                        } else if (proposal.status === 'Approved') {
                           badgeColors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                           borderAccent = 'border-l-[3px] border-l-emerald-500';
                        }
            
                        return (
                          <tr key={proposal.id} className={`group bg-white hover:bg-slate-50 transition-colors ${borderAccent}`}>
                            {/* COL 1: Customer & Date */}
                            <td className="p-4 px-6">
                              <div className="flex items-center gap-4 min-w-[250px]">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-slate-500 bg-white border border-slate-200 shadow-sm shrink-0">
                                    {proposal.customer?.charAt(0) || 'C'}
                                 </div>
                                 <div className="flex flex-col min-w-0 pr-4">
                                    <h3 className="text-[15px] font-black text-slate-900 truncate leading-tight mb-0.5">{proposal.customer}</h3>
                                    <p className="text-xs font-semibold text-slate-500 truncate flex items-center">
                                       {new Date(proposal.updated_at || proposal.created_at).toLocaleDateString()} 
                                       <span className="text-slate-300 mx-1.5">•</span> 
                                       <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 truncate">{proposal.id.split('-')[0]}</span>
                                    </p>
                                 </div>
                              </div>
                            </td>

                            {/* COL 2: Status */}
                            <td className="p-4 px-6">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeColors}`}>
                                {proposal.status}
                              </span>
                            </td>

                            {/* COL 3: Pricing */}
                            <td className="p-4 px-6">
                              <div className="flex flex-col justify-center truncate">
                                 {(!proposal.status || ['Draft', 'Sent', 'Opened'].includes(proposal.status)) ? (() => {
                                     const tiers = proposal.proposal_data?.tiers || {};
                                     const prices = [tiers.good?.salesPrice, tiers.better?.salesPrice, tiers.best?.salesPrice].filter(Boolean);
                                     if (prices.length > 0) {
                                         const min = Math.min(...prices);
                                         const max = Math.max(...prices);
                                         return (
                                            <>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Est. Range</span>
                                              <span className="text-sm font-black text-slate-700 truncate">
                                                 ${min.toLocaleString()} <span className="text-slate-300 font-normal mx-0.5">-</span> ${max.toLocaleString()}
                                              </span>
                                            </>
                                         );
                                     }
                                     return (
                                          <>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Est. Value</span>
                                            <span className="text-sm font-black text-slate-700 truncate">
                                               ${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                          </>
                                     );
                                 })() : (
                                    <>
                                      <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Accepted</span>
                                      <span className="text-sm font-black text-emerald-700 truncate">
                                         ${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </span>
                                    </>
                                 )}
                              </div>
                            </td>

                            {/* COL 4: Owner */}
                            <td className="p-4 px-6 hidden lg:table-cell">
                              <div className="flex items-center">
                                 {proposal.user_profiles?.full_name ? (
                                    <div className="flex items-center gap-2 bg-white py-1.5 px-3 rounded-lg border border-slate-200 shadow-sm max-w-[150px]">
                                       <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-black uppercase shrink-0 text-slate-700 bg-slate-100">
                                          {proposal.user_profiles.full_name.charAt(0)}
                                       </div>
                                       <span className="text-xs font-bold text-slate-700 uppercase tracking-wide truncate">{proposal.user_profiles.full_name.split('@')[0]}</span>
                                    </div>
                                 ) : (
                                    <span className="text-xs font-medium text-slate-400 italic">Unassigned</span>
                                 )}
                              </div>
                            </td>

                            {/* COL 5: Actions */}
                            <td className="p-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-3 flex-nowrap">
                                 {/* Hover Utilities */}
                                 <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                    {proposal.status !== 'Approved' && (
                                       <>
                                          <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" onClick={() => handleEditOpen(proposal)} title="Edit Details"><Edit2 size={16} /></button>
                                          <button className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors" onClick={() => handleDeleteOpen(proposal)} title="Delete"><Trash2 size={16} /></button>
                                       </>
                                    )}
                                 </div>

                                 {/* Email/Copy/Link Group */}
                                 <div className="flex items-center border border-slate-200 rounded-lg shrink-0 bg-white shadow-sm overflow-hidden min-w-max">
                                    <button onClick={() => handleMailto(proposal)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors border-r border-slate-200" title="Email Client"><Mail size={16} /></button>
                                    <button onClick={() => handleCopyMessage(proposal)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors border-r border-slate-200" title="Copy Message"><Copy size={16} /></button>
                                    <button onClick={() => handleCopyLink(proposal)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors" title="Copy Link"><Link size={16} /></button>
                                 </div>

                                 {/* Main Action Button */}
                                 <button 
                                   className={`flex items-center justify-center gap-1.5 text-xs font-black py-2.5 rounded-lg shrink-0 w-[110px] shadow-sm transition-all focus:ring-2 focus:ring-offset-1 outline-none ${proposal.status === 'Approved' ? 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 border border-emerald-600' : 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 border border-slate-900'}`}
                                   onClick={() => {
                                       if (proposal.status === 'Approved') {
                                          const matchedTierName = ['good', 'better', 'best'].find(t => proposal.proposal_data?.tiers[t]?.salesPrice === proposal.amount) || 'good';
                                          const matchedTierData = proposal.proposal_data?.tiers[matchedTierName];
                                          setViewingContract({ proposal, tierName: matchedTierName.toUpperCase(), tierData: matchedTierData, date: proposal.date });
                                       } else {
                                          setViewingProposal(proposal);
                                       }
                                   }}
                                 >
                                    {proposal.status === 'Approved' ? 'Contract' : proposal.status === 'Sent' ? 'Preview' : 'Resume'}
                                 </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                   </tbody>
                 </table>
                 )}
               </div>
             </div>
           );
         })()}
       </div>

      {/* Edit Proposal Modal */}
      <Modal isOpen={!!editingProposal} onClose={() => setEditingProposal(null)} title={`Edit Proposal ${editingProposal?.id}`}>
        <form className="modal-form" onSubmit={handleEditSubmit}>
          <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-4">
             <p className="text-sm mb-2"><strong className="text-slate-500 uppercase text-xs">Customer Name:</strong><br/>{editForm.customer}</p>
             <p className="text-sm"><strong className="text-slate-500 uppercase text-xs">Generated Quote Amount:</strong><br/>${parseFloat(editForm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="form-group">
            <label className="font-bold text-slate-700">Proposal Status</label>
            <p className="text-xs text-slate-500 mb-2">Changing the status here will automatically update the corresponding Deal in the Sales Pipeline.</p>
            <select className="input-field w-full font-semibold" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Approved">Approved (Won Deal)</option>
            </select>
          </div>
          <div className="modal-actions mt-6 flex-col">
            <div className="flex w-full gap-4">
              <button type="button" className="btn-secondary flex-1" onClick={() => setEditingProposal(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1">Update Status</button>
            </div>
            <div className="w-full mt-4 pt-4 border-t border-slate-200">
               <p className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">Modify Equipment</p>
               <button type="button" onClick={handleReopenInWizard} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition text-sm flex items-center justify-center gap-2 shadow-sm">
                 <Edit2 size={16}/> {['Sent', 'Opened', 'Approved'].includes(editingProposal?.status) ? "Clone to New Revision" : "Reconfigure Quote in Wizard"}
               </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingProposal} onClose={() => setDeletingProposal(null)} title="Delete Proposal">
        <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
            Are you sure you want to delete proposal <strong>{deletingProposal?.id}</strong> for <strong>{deletingProposal?.customer}</strong>? This action cannot be undone.
          </p>
          <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setDeletingProposal(null)}>Cancel</button>
            <button className="btn-primary" style={{ background: 'var(--color-danger)' }} onClick={handleDeleteConfirm}>Delete Proposal</button>
          </div>
        </div>
      </Modal>

      {/* Digital Quote Viewer Modal */}
      <ProposalViewerModal
        isOpen={!!viewingProposal}
        onClose={() => setViewingProposal(null)}
        proposal={viewingProposal}
        onAccept={handleInitiateAcceptance}
        onViewContract={(proposalData) => {
           setViewingProposal(null);
           // Build a dummy state to view past contracts natively
           const matchedTierName = ['good', 'better', 'best'].find(t => proposalData.proposal_data?.tiers[t]?.salesPrice === proposalData.amount);
           const matchedTierData = proposalData.proposal_data?.tiers[matchedTierName];
           setViewingContract({ proposal: proposalData, tierName: matchedTierName?.toUpperCase(), tierData: matchedTierData, date: proposalData.date });
        }}
      />

      {/* Signature Capture Overlay */}
      {signingContract && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSigningContract(null)}></div>
           <div className="relative z-10 w-full max-w-lg">
              <SignaturePad 
                onSave={(signatureData) => executeSignedContract(signatureData)} 
                onCancel={() => setSigningContract(null)} 
              />
           </div>
        </div>
      )}

      {/* Verified Mock PDF Contract Modal */}
      <ContractDocumentModal 
        isOpen={!!viewingContract}
        onClose={() => setViewingContract(null)}
        contractData={viewingContract}
      />
    </div>
  );
}
