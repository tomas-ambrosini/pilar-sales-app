import React, { useState, useEffect } from 'react';
import { computeCommission, getRetailFromBest, getFloorPrice } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useProposals } from '../context/ProposalContext';
import { useCustomers } from '../context/CustomerContext';
import { Search, Plus, Calendar, Settings, ShieldCheck, Mail, Printer, AlertTriangle, FileText, Share, Clock, Home, PenTool, CheckCircle, Smartphone, Edit2, Trash2, ArrowRight, CalendarClock, Lock, Link, Copy, ThumbsDown, RotateCcw } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import './Proposals.css';
import { PIPELINE_STATES, PipelineController } from '../utils/pipelineControls';
import ProposalWizard from '../components/ProposalWizard';
import ProposalDetailsModal from '../components/ProposalDetailsModal';
import ProposalViewerModal from '../components/ProposalViewerModal';
import ContractDocumentModal from '../components/ContractDocumentModal';
import SignaturePad from '../components/SignaturePad';
import ProposalComments from '../components/ProposalComments';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatQuoteId } from '../utils/formatters';

export default function Proposals() {
  const { user } = useAuth();
  const { proposals, addProposal, updateProposal, deleteProposal, loading } = useProposals();
  const { customers } = useCustomers();
  const [searchParams] = useSearchParams();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardConfig, setWizardConfig] = useState(null);
  const [inspectingProposal, setInspectingProposal] = useState(null);

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
     } else if (searchParams.get('action') === 'resume' && searchParams.get('id')) {
         const id = searchParams.get('id');
         const targetProposal = proposals.find(p => p.id === id);
         if (targetProposal && targetProposal.status === 'Draft') {
             if (targetProposal.created_by && targetProposal.created_by !== user?.id) {
                 toast.error('Access Denied: This draft is locked by its creator.');
                 window.history.replaceState({}, document.title, window.location.pathname);
                 return;
             }
             setWizardConfig({ id: targetProposal.id, ...targetProposal });
             setShowWizard(true);
         }
         window.history.replaceState({}, document.title, window.location.pathname);
     }
  }, [searchParams, proposals, user]);

  const [viewingProposal, setViewingProposal] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [signingContract, setSigningContract] = useState(null);
  const [deletingProposal, setDeletingProposal] = useState(null);
  const [markingLost, setMarkingLost] = useState(null);
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');
  const [filterMode, setFilterMode] = useState('All');

  const handleRowClick = (proposal) => {
      setInspectingProposal(proposal);
  };

  if (showWizard) return <ProposalWizard onComplete={() => setShowWizard(false)} addProposal={addProposal} updateProposal={updateProposal} editModeData={wizardConfig} />;


  const handleDeleteOpen = (proposal) => {
    setDeletingProposal(proposal);
  };



  const handleMarkLostConfirm = async () => {
    if (!lostReason) return toast.error('Please select a reason.');
    
    await updateProposal(markingLost.id, {
        status: 'Lost',
        proposal_data: {
            ...(markingLost.proposal_data || {}),
            lost_reason: lostReason,
            lost_notes: lostNotes,
            lost_at: new Date().toISOString(),
            lost_by: user?.id
        }
    });
    setMarkingLost(null);
    setLostReason('');
    setLostNotes('');
    toast.success('Proposal marked as lost.');
  };

  const handleReopen = async (proposal) => {
      await updateProposal(proposal.id, { status: 'Sent' });
      toast.success('Proposal re-opened successfully.');
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
      window.location.assign(`mailto:?subject=${subject}&body=${body}`);
      
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
             signature_data: signatureData,
             accepted_tier_data: tierData,
             accepted_tier_name: tierName
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-1">
            <FileText className="text-primary-600" size={28} />
            Sales Proposals & Estimates
          </h1>
          <p className="text-slate-500 font-medium">Track and generate equipment replacement quotes.</p>
        </div>
        <button 
          onClick={() => setShowWizard(true)}
          className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700"
        >
          <Plus size={18} /> Generate Quote
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
          
          <div className="p-4 border-b border-slate-100 flex gap-2 overflow-x-auto bg-slate-50 custom-scrollbar">
             {['All', 'Draft', 'Sent', 'Approved', 'Lost'].map(mode => (
                 <button 
                    key={mode} 
                    onClick={() => setFilterMode(mode)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap ${filterMode === mode ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                 >
                    {mode}
                 </button>
             ))}
          </div>

          <div className="flex flex-col w-full">

            {(() => {
               const filteredProposals = proposals.filter(p => filterMode === 'All' || p.status === filterMode);
               
               if (filteredProposals.length === 0) {
                  return (
                     <div className="m-8 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-12 flex flex-col items-center justify-center">
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
                 <div className="w-full">
                   <div className="overflow-x-auto">
                 {loading ? (
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                         <th className="p-4 px-6 font-medium text-left">Customer / ID</th>
                         <th className="p-4 px-6 font-medium text-center">Status</th>
                         <th className="p-4 px-6 font-medium text-left">Est. Value</th>
                         <th className="p-4 px-6 font-medium text-center hidden lg:table-cell">Rep Owner</th>
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
                       <th className="p-4 px-6 font-medium text-left">Customer / ID</th>
                       <th className="p-4 px-6 font-medium text-center">Status</th>
                       <th className="p-4 px-6 font-medium text-left">Est. Value</th>
                       <th className="p-4 px-6 font-medium text-center hidden lg:table-cell">Rep Owner</th>
                       <th className="p-4 px-6 font-medium text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {filteredProposals.map(proposal => {
                        let badgeColors = 'bg-slate-100 text-slate-600 border-slate-200';
                        if (proposal.status === 'Sent') {
                           badgeColors = 'bg-blue-50 text-blue-700 border-blue-200';
                        } else if (proposal.status === 'Approved') {
                           badgeColors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        } else if (proposal.status === 'Lost') {
                           badgeColors = 'bg-red-50 text-red-700 border-red-200';
                        }
            
                        return (
                          <React.Fragment key={proposal.id}>
                          <tr className="group bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleRowClick(proposal)}>
                            {/* COL 1: Customer & Date */}
                            <td className="p-4 px-6">
                              <div className="flex items-center gap-4 min-w-[250px]">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 bg-slate-100 shrink-0">
                                    {proposal.customer?.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'C'}
                                 </div>
                                 <div className="flex flex-col min-w-0 pr-4">
                                    <h3 className="text-[15px] font-black text-slate-900 truncate leading-tight mb-0.5">{proposal.customer}</h3>
                                    <p className="text-xs font-semibold text-slate-500 flex items-center flex-wrap">
                                       <span className="whitespace-nowrap">{new Date(proposal.updated_at || proposal.created_at).toLocaleDateString()}</span> 
                                       <span className="text-slate-300 mx-1.5 whitespace-nowrap">•</span> 
                                       <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 whitespace-nowrap" title={proposal.proposal_number ? `Legacy ID: ${proposal.id}` : ''}>{formatQuoteId(proposal)}</span>
                                    </p>
                                 </div>
                              </div>
                            </td>

                            {/* COL 2: Status */}
                            <td className="p-4 px-6 text-center">
                              <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeColors}`}>
                                {proposal.status}
                              </span>
                            </td>

                            {/* COL 3: Pricing */}
                            <td className="p-4 px-6 text-left">
                              <div className="flex flex-col items-start justify-center truncate">
                                 {(!proposal.status || ['Draft', 'Sent', 'Opened', 'Lost'].includes(proposal.status)) ? (() => {
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
                              <div className="flex items-center justify-center">
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
                            <td className="p-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-3 flex-nowrap">
                                 {/* Hover Utilities */}
                                 <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                    {['super_admin', 'admin'].includes((user?.role || '').toLowerCase()) && (
                                       <button className="p-2 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors" onClick={() => handleDeleteOpen(proposal)} title="Force Delete"><Trash2 size={16} /></button>
                                    )}
                                    {['Sent', 'Opened'].includes(proposal.status) && (
                                       <button className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors" onClick={() => setMarkingLost(proposal)} title="Mark as Lost"><ThumbsDown size={16} /></button>
                                    )}
                                    {proposal.status === 'Lost' && (
                                       <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" onClick={() => handleReopen(proposal)} title="Re-open Proposal"><RotateCcw size={16} /></button>
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
                                   className={`flex items-center justify-center gap-1.5 text-xs font-black py-2.5 rounded-lg shrink-0 w-[110px] shadow-sm transition-all focus:ring-2 focus:ring-offset-1 outline-none ${
                                       proposal.status === 'Approved' 
                                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 border border-emerald-600' 
                                          : proposal.status === 'Sent'
                                          ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600 border border-blue-700'
                                          : proposal.status === 'Lost'
                                          ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-none'
                                          : 'bg-slate-500 text-white hover:bg-slate-600 focus:ring-slate-500 border border-slate-600'
                                   }`}
                                   onClick={() => {
                                       if (proposal.status === 'Approved') {
                                          const matchedTierName = proposal.proposal_data?.accepted_tier_name || ['good', 'better', 'best'].find(t => proposal.proposal_data?.tiers?.[t]?.salesPrice === proposal.amount) || 'good';
                                          const matchedTierData = proposal.proposal_data?.accepted_tier_data || proposal.proposal_data?.tiers?.[matchedTierName];
                                          setViewingContract({ proposal, tierName: matchedTierName.toUpperCase(), tierData: matchedTierData, date: proposal.date });
                                       } else if (proposal.status === 'Draft') {
                                          if (proposal.created_by && proposal.created_by !== user?.id) {
                                              toast.error('Access Denied: This draft is locked by its creator.');
                                              return;
                                          }
                                          setWizardConfig({ id: proposal.id, ...proposal });
                                          setShowWizard(true);
                                       } else {
                                          setViewingProposal(proposal.status === 'Lost' ? { ...proposal, isReadOnly: true } : proposal);
                                       }
                                   }}
                                 >
                                    {proposal.status === 'Approved' ? 'Contract' : proposal.status === 'Sent' ? 'Preview' : proposal.status === 'Lost' ? 'Review' : 'Resume'}
                                 </button>
                              </div>
                            </td>
                          </tr>
                          
                          </React.Fragment>
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
       </div>


      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingProposal} onClose={() => setDeletingProposal(null)} title="Delete Proposal">
        <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
            Are you sure you want to delete proposal <strong>{deletingProposal ? formatQuoteId(deletingProposal) : ''}</strong> for <strong>{deletingProposal?.customer}</strong>? This action cannot be undone.
          </p>
          <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setDeletingProposal(null)}>Cancel</button>
            <button className="btn-primary" style={{ background: 'var(--color-danger)' }} onClick={handleDeleteConfirm}>Delete Proposal</button>
          </div>
        </div>
      </Modal>

      {/* Mark Lost Modal */}
      <Modal isOpen={!!markingLost} onClose={() => setMarkingLost(null)} title="Mark Deal as Lost">
         <div className="p-4 space-y-4">
            <p className="text-sm text-slate-600 mb-4">You are marking the proposal for <strong>{markingLost?.customer}</strong> as lost. Please provide a reason to track attrition.</p>
            
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Reason <span className="text-red-500">*</span></label>
               <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  value={lostReason} 
                  onChange={(e) => setLostReason(e.target.value)}
                  required
               >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Too Expensive">Too Expensive</option>
                  <option value="Went with Competitor">Went with Competitor</option>
                  <option value="Financing Denied">Financing Denied</option>
                  <option value="No Response / Ghosted">No Response / Ghosted</option>
                  <option value="Timing / Not Ready">Timing / Not Ready</option>
                  <option value="Scope Changed">Scope Changed</option>
                  <option value="Duplicate / Invalid Lead">Duplicate / Invalid Lead</option>
                  <option value="Other">Other</option>
               </select>
            </div>
            
            <div className="space-y-1.5">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Additional Notes (Optional)</label>
               <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 text-sm min-h-[80px] focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  placeholder="Any details on why this was lost?"
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
               ></textarea>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-6">
               <button className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition-colors" onClick={() => setMarkingLost(null)}>Cancel</button>
               <button className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors shadow-sm" onClick={handleMarkLostConfirm} disabled={!lostReason}>Mark as Lost</button>
            </div>
         </div>
      </Modal>

      {/* Internal Proposal Details Modal */}
      <ProposalDetailsModal
        proposal={inspectingProposal}
        onClose={() => setInspectingProposal(null)}
        onLaunchViewer={(proposal) => {
            setInspectingProposal(null);
            if (proposal.status === 'Approved') {
               const matchedTierName = proposal.proposal_data?.accepted_tier_name || ['good', 'better', 'best'].find(t => proposal.proposal_data?.tiers?.[t]?.salesPrice === proposal.amount) || 'good';
               const matchedTierData = proposal.proposal_data?.accepted_tier_data || proposal.proposal_data?.tiers?.[matchedTierName];
               setViewingContract({ proposal, tierName: matchedTierName.toUpperCase(), tierData: matchedTierData, date: proposal.date });
            } else {
               setViewingProposal(proposal.status === 'Lost' ? { ...proposal, isReadOnly: true } : proposal);
            }
        }}
      />

      <ProposalViewerModal
        isOpen={!!viewingProposal}
        onClose={() => setViewingProposal(null)}
        onBack={viewingProposal?.isReadOnly ? () => {
           setViewingProposal(null);
           setTimeout(() => setInspectingProposal(viewingProposal), 50);
        } : undefined}
        proposal={viewingProposal}
        onAccept={handleInitiateAcceptance}
        onViewContract={(proposalData) => {
           setViewingProposal(null);
           // Build a dummy state to view past contracts natively
           const matchedTierName = proposalData.proposal_data?.accepted_tier_name || ['good', 'better', 'best'].find(t => proposalData.proposal_data?.tiers?.[t]?.salesPrice === proposalData.amount) || 'good';
           const matchedTierData = proposalData.proposal_data?.accepted_tier_data || proposalData.proposal_data?.tiers?.[matchedTierName];
           setViewingContract({ proposal: proposalData, tierName: matchedTierName?.toUpperCase(), tierData: matchedTierData, date: proposalData.date });
        }}
      />

      {/* Signature Capture Overlay */}
      {signingContract && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
           <div className="absolute -inset-10 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSigningContract(null)}></div>
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
