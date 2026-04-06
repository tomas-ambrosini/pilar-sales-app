import React, { useState, useEffect } from 'react';
import { computeCommission, getRetailFromBest, getFloorPrice } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useProposals } from '../context/ProposalContext';
import { useCustomers } from '../context/CustomerContext';
import { Plus, Check, FileText, Edit2, Trash2, ArrowRight, CalendarClock } from 'lucide-react';
import Modal from '../components/Modal';
import './Proposals.css';
import ProposalWizard from '../components/ProposalWizard';
import ProposalViewerModal from '../components/ProposalViewerModal';
import ContractDocumentModal from '../components/ContractDocumentModal';
import SignaturePad from '../components/SignaturePad';
import { useSearchParams } from 'react-router-dom';

export default function Proposals() {
  const { proposals, addProposal, updateProposal, deleteProposal, loading } = useProposals();
  const { customers } = useCustomers();
  const [searchParams] = useSearchParams();
  const [showWizard, setShowWizard] = useState(() => searchParams.get('action') === 'new');

  useEffect(() => {
     if (searchParams.get('action') === 'new') {
         setShowWizard(true);
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
  if (showWizard) return <ProposalWizard onComplete={() => setShowWizard(false)} addProposal={addProposal} updateProposal={updateProposal} editModeData={showWizard} />;

  const handleEditOpen = (proposal) => {
    setEditingProposal(proposal);
    setEditForm({ customer: proposal.customer, amount: proposal.amount, status: proposal.status });
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
     if (['Sent', 'Opened', 'Approved'].includes(editingProposal.status)) {
        // Automatically Clone to prevent state pollution on Approved deals
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
             // 1. Update Sales Pipeline Opportunity
             await supabase.from('opportunities').update({
                 status: 'Deal Won',
                 dispatch_notes: workOrderNotes
             }).eq('id', oppId);

             const { data: oppRow } = await supabase.from('opportunities').select('household_id').eq('id', oppId).single();
             if (oppRow?.household_id) {
                 // 3. Auto-spawn the Work Order in the Operations Database
                 await supabase.from('work_orders').insert({
                     opportunity_id: oppId,
                     household_id: oppRow.household_id,
                     status: 'Unscheduled',
                     execution_payload: { tierName, ...tierData, signature: signatureData },
                     dispatch_notes: workOrderNotes
                 });

                 // 4. Inject Verified Paper Trail to Customer CRM File
                 await supabase.from('activity_logs').insert({
                     household_id: oppRow.household_id,
                     activity_type: 'Contract Executed',
                     description: `Client signed Digital Contract for ${tierName} System. Work Order generated.`,
                     is_pinned_alert: true
                 });
             }
         } catch(e) {
             console.error("Failed to sync structural databases:", e);
         }
     }

     // 5. Update Proposal Status, Lock Amount, and Save Signature!
     const finalDbObj = { 
         status: 'Approved',
         amount: tierData.salesPrice,
         signature_data: signatureData
     };
     
     await updateProposal(proposal.id, finalDbObj);

     // Move to the View Contract state
     const finalContractData = { ...signingContract };
     finalContractData.proposal.signature_data = signatureData;
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
        {activeDraft && (
           <div className="col-span-1 border-2 border-primary-400 bg-primary-50/70 rounded-2xl p-6 shadow-md flex flex-col relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full border bg-primary-100 text-primary-700 border-primary-300">
                      Draft Saved
                    </span>
                 </div>
                 <button onClick={() => { localStorage.removeItem('pilar_wizard_draft'); setActiveDraft(null); }} className="text-xs text-slate-400 hover:text-danger-600 font-bold transition-colors">Discard</button>
              </div>
              <div className="mb-6 flex-1">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2 truncate">Unsaved Session</h3>
                 {activeDraft.selectedCustomerId && customers && customers.length > 0 ? (
                    <p className="text-sm font-bold text-slate-700 mb-1">
                       Customer: <span className="text-primary-700">{customers.find(c => c.id.toString() === activeDraft.selectedCustomerId?.toString())?.name || 'Unknown'}</span>
                    </p>
                 ) : null}
                 <p className="text-xs font-semibold text-slate-500">Pick up right where you left off.</p>
              </div>
              <div className="flex justify-end pt-4 border-t border-primary-200/50">
                 <button 
                   className="flex items-center gap-2 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
                   onClick={() => setShowWizard({ isDraft: true, ...activeDraft })}
                 >
                    Resume <ArrowRight size={14}/>
                 </button>
              </div>
           </div>
        )}
        
        {proposals.length === 0 && !activeDraft ? (
          <div className="col-span-full border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-sm rounded-2xl p-12 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4"><FileText size={32} /></div>
            <p className="text-slate-500 font-semibold mb-6">No proposals have been generated yet.</p>
            <button className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105" onClick={() => setShowWizard(true)}>
              <Plus size={18} /> Build First Quote
            </button>
          </div>
        ) : (
          proposals.map(proposal => {
            // Dynamic Status Badge Logic
            let badgeColors = 'bg-slate-100 text-slate-600 border-slate-200';
            if (proposal.status === 'Sent' || proposal.status === 'Opened') badgeColors = 'bg-blue-50 text-blue-600 border-blue-200';
            if (proposal.status === 'Approved') badgeColors = 'bg-emerald-50 text-emerald-600 border-emerald-200';
            if (proposal.status === 'Declined' || proposal.status?.includes('Rejected')) badgeColors = 'bg-rose-50 text-rose-600 border-rose-200';

            return (
              <div key={proposal.id} className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 hover:border-primary-300 transition-all duration-300 flex flex-col">
                
                {/* ID & Actions Top Bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                     <span className={`text-[9px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full border ${badgeColors}`}>
                       {proposal.status}
                     </span>
                     <span className="text-[10px] font-mono font-bold text-slate-400">{proposal.id}</span>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors" onClick={() => handleEditOpen(proposal)} title="Edit Details"><Edit2 size={14} /></button>
                     <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" onClick={() => setDeletingProposal(proposal)} title="Delete"><Trash2 size={14} /></button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="mb-6 flex-1">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight mb-2 truncate">{proposal.customer}</h3>
                  <div className="flex flex-col gap-1.5 mt-3">
                     <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                        <CalendarClock size={12}/> Generated: {proposal.date}
                     </p>
                     {proposal.proposal_data?.creator && (
                        <p className="text-[10px] font-bold text-primary-700 flex items-center gap-1.5 uppercase tracking-wider bg-primary-50 w-max px-2 py-0.5 rounded outline outline-1 outline-primary-200">
                           Rep: {proposal.proposal_data.creator}
                        </p>
                     )}
                  </div>
                </div>
                
                {/* Amount & CTA Footer */}
                <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Quote Amount</p>
                    <div className="text-2xl font-black text-slate-900 leading-none">
                       ${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <button 
                    className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-2 rounded-lg transition-colors border border-primary-100 shadow-sm"
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
                    View <ArrowRight size={14}/>
                  </button>
                </div>
              </div>
            );
          })
        )}
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
              <option value="Opened">Opened (Client Viewed)</option>
              <option value="Approved">Approved (Won Deal)</option>
              <option value="Declined">Declined (Lost Deal)</option>
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
