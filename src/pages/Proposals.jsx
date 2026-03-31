import React, { useState, useEffect } from 'react';
import { computeCommission, getRetailFromBest, getFloorPrice } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useProposals } from '../context/ProposalContext';
import { useCustomers } from '../context/CustomerContext';
import { Plus, Check, FileText, Edit2, Trash2, ArrowRight, CalendarClock } from 'lucide-react';
import Modal from '../components/Modal';
import ProposalViewerModal from '../components/ProposalViewerModal';
import './Proposals.css';
import ProposalWizard from '../components/ProposalWizard';

export default function Proposals() {
  const { proposals, addProposal, updateProposal, deleteProposal, loading } = useProposals();
  const [showWizard, setShowWizard] = useState(false);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [deletingProposal, setDeletingProposal] = useState(null);
  const [editForm, setEditForm] = useState({ customer: '', amount: '', status: '' });
  
  if (loading) return <div className="page-container flex-center"><h3>Loading Proposals...</h3></div>;
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
        const confirmClone = window.confirm("This proposal is locked because it was already Sent or Approved. Would you like to clone this into a new V2 Draft to edit?");
        if (confirmClone) {
           // 1. Mark old as Rejected
           updateProposal(editingProposal.id, { status: 'Rejected (Replaced)' });
           
           // 2. Force clone by stripping ID
           const clonedData = { ...editingProposal };
           delete clonedData.id;
           clonedData.status = 'Draft';
           setShowWizard(clonedData);
           setEditingProposal(null);
        }
     } else {
        setShowWizard(editingProposal);
        setEditingProposal(null);
     }
  };

  const handleAcceptProposal = async (tierName, tierData, proposal) => {
     // 1. Build Work Order Payload
     const workOrderNotes = `
**FIELD WORK ORDER**
Accepted Tier: ${tierName}
Equipment: ${tierData.brand} ${tierData.series} (${tierData.tons} Ton)
Included Add-ons / Features:
${(tierData.features || []).map(f => `- ${f}`).join('\n')}

> System Note: Proposal ${proposal.id} automatically converted to Job on ${new Date().toLocaleDateString()}.
`.trim();

     // 2. Perform DB Update on Opportunity
     const oppId = proposal.proposal_data?.associated_opportunity_id;
     if (oppId) {
         try {
             // Retrieve existing notes to not overwrite completely if we don't want to, but architecture says Work Order overwrites dispatcher notes (or appends)
             // Let's simply overwrite with the pure operational checklist for the field crew.
             await supabase.from('opportunities').update({
                 status: 'Deal Won',
                 dispatch_notes: workOrderNotes
             }).eq('id', oppId);
         } catch(e) {
             console.error("Failed to sync opportunity:", e);
         }
     }

     // 3. Update Proposal Status and Lock Amount
     await updateProposal(proposal.id, { 
         status: 'Approved',
         amount: tierData.salesPrice
     });

     alert(`Proposal Approved! Deal Won for ${tierName} Tier. \n\nWork Order officially generated and pushed to the Dispatch Calendar!`);
     setViewingProposal(null);
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
        {proposals.length === 0 ? (
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
                  <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                     <CalendarClock size={12}/> Generated: {proposal.date}
                  </p>
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
                    onClick={() => setViewingProposal(proposal)}
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
                 <Edit2 size={16}/> Reconfigure Quote in Wizard
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
        onAccept={handleAcceptProposal}
      />
    </div>
  );
}
