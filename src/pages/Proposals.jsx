import React, { useState, useEffect } from 'react';
import { computeCommission, getRetailFromBest, getFloorPrice } from '../utils/pricing';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useProposals } from '../context/ProposalContext';
import { useCustomers } from '../context/CustomerContext';
import { Plus, Check, FileText, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
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
      
      <div className="proposals-list">
        {proposals.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <FileText size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No proposals found.</p>
          </div>
        ) : (
          proposals.map(proposal => (
            <div key={proposal.id} className="proposal-card glass-panel fade-in">
              <div className="proposal-card-header">
                <div>
                  <h3 className="proposal-id flex items-center gap-3">
                    {proposal.id}
                    <div className="flex gap-2">
                       <button className="text-slate-400 hover:text-primary-600 transition-fast" onClick={() => handleEditOpen(proposal)} title="Edit Proposal"><Edit2 size={16} /></button>
                       <button className="text-slate-400 hover:text-danger transition-fast" onClick={() => setDeletingProposal(proposal)} title="Delete Proposal"><Trash2 size={16} /></button>
                    </div>
                  </h3>
                  <div className="proposal-customer">{proposal.customer}</div>
                </div>
                <div className="proposal-amount">${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="proposal-card-footer flex items-center gap-3">
                <span className="proposal-date">{proposal.date}</span>
                <span className={`status-badge status-${proposal.status?.toLowerCase().replace(' ', '-')}`}>
                  {proposal.status}
                </span>
                <button 
                  className="ml-auto text-xs font-bold text-primary-600 hover:text-primary-700 underline transition-colors"
                  onClick={() => setViewingProposal(proposal)}
                >
                  View Digital Quote
                </button>
              </div>
            </div>
          ))
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
