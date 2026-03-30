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

export default function Proposals() {
  const { proposals, addProposal, updateProposal, deleteProposal, loading } = useProposals();
  const [showWizard, setShowWizard] = useState(false);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [editingProposal, setEditingProposal] = useState(null);
  const [deletingProposal, setDeletingProposal] = useState(null);
  const [editForm, setEditForm] = useState({ customer: '', amount: '', status: '' });
  
  if (loading) return <div className="page-container flex-center"><h3>Loading Proposals...</h3></div>;
  if (showWizard) return <ProposalWizard onComplete={() => setShowWizard(false)} addProposal={addProposal} />;

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
          <div className="form-group">
            <label>Customer Name</label>
            <input type="text" value={editForm.customer} onChange={e => setEditForm({...editForm, customer: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="input-field w-full" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Opened">Opened</option>
              <option value="Approved">Approved</option>
              <option value="Declined">Declined</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setEditingProposal(null)}>Cancel</button>
            <button type="submit" className="btn-primary">Save Changes</button>
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
      />
    </div>
  );
}

function ProposalWizard({ onComplete, addProposal }) {
  const [step, setStep] = useState(1);
  const { customers, addCustomer } = useCustomers();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  
  // Measurement Data State (Pilar Existing Conditions Form)
  const [survey, setSurvey] = useState({
    systemType: '', currentTonnage: '', gasRefrigerant: 'R410A', existingBrand: '', yearManufactured: '',
    mainBreakerAmps: '', condenserBreaker: '', disconnectCondition: 'Pass', whipCondition: 'Pass',
    condenserLocation: '', ahuLocation: '', ductCondition: '', condensateType: '', thermostat: '',
    m1: '', m2: '', m3: '', m4: '', m5: '', m6: '', m7: '', m8: '', m9: '', m10: '',
    m11: '', m12: '', m13: '', m14: '', m15: '', m16: '', m17: '',
    m18: '', m19: '', m20: '', m21: '', m22: '', m23: '', m24: '', m25: '', m26: '', m27: ''
  });
  
  // Photo State
  const [photos, setPhotos] = useState({ 
    condenser_wide: null, 
    condenser_data_plate: null, 
    indoor_unit_wide: null, 
    indoor_data_plate: null, 
    electrical_panel_open: null 
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(null);
  
  // Live Database Arrays
  const [catalog, setCatalog] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [margins, setMargins] = useState({ 
     sales_tax: 0.07, 
     service_reserve: 0.05, 
     good_margin: 0.35, 
     better_margin: 0.40, 
     best_margin: 0.45 
  });
  const [dbReady, setDbReady] = useState(false);

  // Selected State
  const [selectedTiers, setSelectedTiers] = useState({ best: null, better: null, good: null });
  const [addons, setAddons] = useState({});

  useEffect(() => {
    async function loadBackendData() {
      const [equip, labor, marg] = await Promise.all([
        supabase.from('equipment_catalog').select('*'),
        supabase.from('labor_rates').select('*'),
        supabase.from('margin_settings').select('*').eq('id', 1).single()
      ]);

      if (equip.data) setCatalog(equip.data);
      if (labor.data) setLaborRates(labor.data);
      if (marg.data) setMargins(marg.data);
      setDbReady(true);
    }
    loadBackendData();
  }, []);

  const handlePhotoUpload = async (field, file) => {
    if (!file) return;
    setUploadingPhoto(field);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${field}_${Date.now()}.${fileExt}`;
      // Group by selected customer or generic folder
      const folderPath = selectedCustomerId ? `${selectedCustomerId}` : 'orphan_surveys';
      const filePath = `${folderPath}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('surveys')
        .upload(filePath, file);

      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage
        .from('surveys')
        .getPublicUrl(filePath);

      setPhotos(prev => ({ ...prev, [field]: publicUrlData.publicUrl }));
    } catch (err) {
      console.error("Upload error:", err.message);
      alert("Failed to upload photo: " + err.message);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const toggleAddon = (laborId) => {
    setAddons(prev => ({ ...prev, [laborId]: !prev[laborId] }));
  };

  const updateSurveyAndTriggerSafetyNet = (field, value) => {
    setSurvey(prev => {
      const updated = { ...prev, [field]: value };
      
      // Smart Auto-Margin Safety Engine
      const newAddons = { ...addons };
      
      // Auto-add Crane if Roof
      const craneId = laborRates.find(l => l.item_name.toLowerCase().includes('crane'))?.id;
      if (craneId) newAddons[craneId] = (updated.condenserLocation === 'Roof');
      
      // Auto-add flush if R-22
      const flushId = laborRates.find(l => l.item_name.toLowerCase().includes('flush'))?.id;
      if (flushId) newAddons[flushId] = (updated.gasRefrigerant === 'R-22');

      // Auto-add disconnect box
      const discId = laborRates.find(l => l.item_name.toLowerCase().includes('disconnect'))?.id;
      if (discId) newAddons[discId] = (updated.disconnectCondition === 'Replace Required');

      // Auto-add attic labor
      const atticId = laborRates.find(l => l.item_name.toLowerCase().includes('attic'))?.id;
      if (atticId) newAddons[atticId] = (updated.ahuLocation === 'Attic');

      // Optional: Auto-disable them if condition reverts
      if (updated.condenserLocation !== 'Roof' && craneId && prev.condenserLocation === 'Roof') newAddons[craneId] = false;
      if (updated.gasRefrigerant !== 'R-22' && flushId && prev.gasRefrigerant === 'R-22') newAddons[flushId] = false;
      if (updated.disconnectCondition !== 'Replace Required' && discId && prev.disconnectCondition === 'Replace Required') newAddons[discId] = false;
      if (updated.ahuLocation !== 'Attic' && atticId && prev.ahuLocation === 'Attic') newAddons[atticId] = false;

      setAddons(newAddons);
      return updated;
    });
  };

  const calculateSalesPrice = (rawEquipCost, tierType = 'Good') => {
    if (!rawEquipCost) return 0;
    
    // Categorize selected physical Addons vs Subcontractor Labor
    const activeAddons = laborRates.filter(l => addons[l.id]);
    
    const taxableMaterials = activeAddons
      .filter(l => !['Labor', 'Install', 'Subcontract', 'Permit'].includes(l.category))
      .reduce((sum, item) => sum + item.cost, 0);

    const nontaxableLabor = activeAddons
      .filter(l => ['Labor', 'Install', 'Subcontract', 'Permit'].includes(l.category))
      .reduce((sum, item) => sum + item.cost, 0);

    // Apply Live Tax Rate only to Equipment + Taxable Materials
    const taxRate = margins.sales_tax || 0.07;
    const equipWithTax = (rawEquipCost + taxableMaterials) * (1 + taxRate); 
    
    const totalHardCost = equipWithTax + nontaxableLabor;
    
    // Automatic 1st Year Service Reserve Injection
    const costWithReserve = totalHardCost * (1 + (margins.service_reserve || 0.05)); 
    
    // Math Formula Target Divisor Algorithm
    let targetMargin = margins.good_margin || 0.35;
    if (tierType === 'Better') targetMargin = margins.better_margin || 0.40;
    if (tierType === 'Best') targetMargin = margins.best_margin || 0.45;
    
    const salesPrice = costWithReserve / (1 - targetMargin);
    return Math.round(salesPrice);
  };



  const generateProposal = async () => {
    const finalAmount = calculateSalesPrice(selectedTiers.better?.system_cost || selectedTiers.good?.system_cost || 0, 'Better');

    const cust = customers.find(c => c.id.toString() === selectedCustomerId.toString());
    if (!cust) return; // Prevent generating against nothing

    const customerName = cust.name;
    const targetHouseholdId = cust.id;

    // Identity the explicitly chosen location
    const selectedProp = cust.locations?.find(l => l.id.toString() === selectedLocationId.toString()) || cust.locations?.[0];
    const propAddressString = selectedProp ? `${selectedProp.street_address}${selectedProp.city ? ', ' + selectedProp.city : ''}` : 'Unknown Address';

    // Assemble the Premium Digital Proposal Output (including commission)
    const finalProposalData = {
      generatedAt: new Date().toISOString(),
      tiers: {
        best: selectedTiers.best ? {
          id: selectedTiers.best.id,
          brand: selectedTiers.best.brand,
          series: selectedTiers.best.series,
          tons: selectedTiers.best.tons,
          salesPrice: calculateSalesPrice(selectedTiers.best.system_cost, 'Best'),
          commission: computeCommission(calculateSalesPrice(selectedTiers.best.system_cost, 'Best'), getRetailFromBest(calculateSalesPrice(selectedTiers.best.system_cost, 'Best'))),
          features: ["Variable Speed Ultra Quiet", "Highest Efficiency Ratings", "Premium 12-Year Parts Warranty", "Advanced Dehumidification Control"]
        } : null,
        better: selectedTiers.better ? {
          id: selectedTiers.better.id,
          brand: selectedTiers.better.brand,
          series: selectedTiers.better.series,
          tons: selectedTiers.better.tons,
          salesPrice: calculateSalesPrice(selectedTiers.better.system_cost, 'Better'),
          commission: computeCommission(calculateSalesPrice(selectedTiers.better.system_cost, 'Better'), getRetailFromBest(calculateSalesPrice(selectedTiers.best.system_cost, 'Best'))),
          features: ["Two-Stage Enhanced Comfort", "High Efficiency SEER2", "10-Year Parts Warranty", "Consistent Temperature Control"]
        } : null,
        good: selectedTiers.good ? {
          id: selectedTiers.good.id,
          brand: selectedTiers.good.brand,
          series: selectedTiers.good.series,
          tons: selectedTiers.good.tons,
          salesPrice: calculateSalesPrice(selectedTiers.good.system_cost, 'Good'),
          commission: computeCommission(calculateSalesPrice(selectedTiers.good.system_cost, 'Good'), getRetailFromBest(calculateSalesPrice(selectedTiers.best.system_cost, 'Best'))),
          features: ["Single-Stage Operation", "Base Efficiency Standard", "5-Year Parts Warranty", "Cost-Effective Reliable Cooling"]
        } : null
      }
    };

    // ----- Retail & Floor calculations -----
    const approxRetail = getRetailFromBest(finalProposalData.tiers.best?.salesPrice || 0);
    const floorPrice = getFloorPrice(approxRetail);
    const tierPrices = [finalProposalData.tiers.best?.salesPrice, finalProposalData.tiers.better?.salesPrice, finalProposalData.tiers.good?.salesPrice].filter(Boolean);
    if (tierPrices.some(p => p < floorPrice)) {
      alert('One or more tier prices fall below the 75% floor. Please adjust the configuration.');
      return;
    }

    // Native Bridge: Push the structured survey JSONB payload directly into a new Pipeline opportunity
    if (targetHouseholdId) {
       const { error: oppError } = await supabase.from('opportunities').insert({
           household_id: targetHouseholdId,
           status: 'Proposal Sent',
           urgency_level: 'Medium',
           issue_description: `Auto-generated Digital Proposal with 3 Tiers for ${propAddressString}.`,
           site_survey_data: { ...survey, photos: photos, property_id: selectedProp?.id, property_address: propAddressString },
           proposal_data: finalProposalData
       });
       if (oppError) {
           console.error("Failed to insert Opportunity into Pipeline:", oppError);
       }

       addProposal({
          customer: customerName,
          amount: finalAmount,
          proposal_data: finalProposalData
       });
    } else {
       // Graceful fallback for legacy edge case without targetHouseholdId
       addProposal({
          customer: customerName,
          amount: finalAmount
       });
    }

    onComplete();
  };


  if (!dbReady) return <div className="page-container flex-center"><h3>Loading Live Pricing Engines...</h3></div>;
  const currentCustomer = selectedCustomerId ? customers.find(c => c.id.toString() === selectedCustomerId.toString()) : null;

  return (
    <div className="page-container fade-in">
      <div className="glass-panel" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">New Estimate Generator</h2>
          <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Step {step} of 4</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
        {step === 1 && (
          <div>
            <h3 className="font-bold mb-4 text-slate-700">1. Select or Create Customer Profile</h3>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                 <div>
                  <div className="flex justify-between items-end mb-2">
                     <label className="text-xs font-bold text-slate-500 uppercase">Search Existing Clients</label>
                     <a href="/customers" className="text-xs font-bold text-primary-600 hover:text-primary-700 underline">
                        + Form New Customer
                     </a>
                  </div>
                  <select 
                    className="w-full border border-slate-300 rounded p-3 bg-white font-semibold text-slate-700 mb-6"
                    value={selectedCustomerId}
                    onChange={e => {
                        setSelectedCustomerId(e.target.value);
                        setSelectedLocationId(''); // Reset location when customer changes
                    }}
                  >
                    <option value="">-- Choose a Customer Profile --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.address}</option>
                    ))}
                  </select>
                  
                  {currentCustomer && (
                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      {currentCustomer.locations && currentCustomer.locations.length > 1 ? (
                         <div className="mb-4 pb-4 border-b border-slate-100">
                           <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                              <span className="w-2 h-2 rounded-full bg-danger"></span>
                              Multiple Properties Found. Select Target Service Location:
                           </label>
                           <select 
                              className="w-full border-2 border-primary-500 rounded p-3 bg-primary-50 font-semibold text-primary-800"
                              value={selectedLocationId}
                              onChange={e => setSelectedLocationId(e.target.value)}
                           >
                              <option value="">-- Required: Choose specific location --</option>
                              {currentCustomer.locations.map(loc => (
                                 <option key={loc.id} value={loc.id}>
                                    {loc.is_primary_residence ? 'Primary Residence: ' : 'Managed Property: '} 
                                    {loc.street_address} {loc.city && `, ${loc.city}`}
                                 </option>
                              ))}
                           </select>
                         </div>
                      ) : currentCustomer.locations && currentCustomer.locations.length === 1 && (
                         <div className="mb-4 pb-4 border-b border-slate-100 flex items-center gap-2">
                             <Check size={16} className="text-success" />
                             <span className="text-sm font-semibold text-slate-600">Auto-locked to sole property: {currentCustomer.locations[0].street_address}</span>
                         </div>
                      )}

                      <h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Validate Information</h4>
                      <p className="text-sm"><strong>Name:</strong> {currentCustomer.name}</p>
                      <p className="text-sm"><strong>Primary Address:</strong> {currentCustomer.address || 'N/A'}</p>
                      <p className="text-sm"><strong>Phone:</strong> {currentCustomer.phone || 'N/A'}</p>
                      <p className="text-sm"><strong>Email:</strong> {currentCustomer.email || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 mt-2">*If this is incorrect, please update the Customer Profile under the Customers tab.</p>
                    </div>
                  )}
                </div>
            </div>
            
            <div className="flex justify-end mt-8 border-t border-slate-200 pt-6">
               <button 
                 className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto" 
                 onClick={() => {
                    // Auto-assign location if only 1 exists and none selected
                    if (currentCustomer && currentCustomer.locations?.length === 1 && !selectedLocationId) {
                        setSelectedLocationId(currentCustomer.locations[0].id);
                    }
                    setStep(2);
                 }}
                 disabled={!selectedCustomerId || (currentCustomer?.locations?.length > 1 && !selectedLocationId)}
               >
                 Next: Digital Site Survey ➔
               </button>
            </div>
          </div>
        )}

        {/* STEP 2: DIGITAL SITE SURVEY */}
        {step === 2 && (
          <div>
            <h3 className="font-bold mb-4 text-slate-700 flex items-center justify-between">
              <span>2. Existing Conditions / Site Survey</span>
            </h3>
            
            <div className="bg-slate-50 p-6 rounded border border-slate-200 mb-6 font-medium text-sm">
               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-[#2A9D8F] uppercase">A. Current Equipment</h4>
               <div className="grid grid-cols-5 gap-4 mb-6">
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">System Type</label>
                   <select className="input-field w-full mt-1" value={survey.systemType} onChange={e => updateSurveyAndTriggerSafetyNet('systemType', e.target.value)}>
                     <option value="">Select...</option>
                     <option>Split AC & Furnace</option><option>Heat Pump</option><option>Package Unit</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Current Tonnage</label>
                   <select className="input-field w-full mt-1" value={survey.currentTonnage} onChange={e => updateSurveyAndTriggerSafetyNet('currentTonnage', e.target.value)}>
                     <option value="">Select...</option>
                     <option>1.5</option><option>2.0</option><option>2.5</option><option>3.0</option><option>3.5</option><option>4.0</option><option>5.0</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Current Refrigerant</label>
                   <select className="input-field w-full mt-1" value={survey.gasRefrigerant} onChange={e => updateSurveyAndTriggerSafetyNet('gasRefrigerant', e.target.value)}>
                     <option value="R410A">R-410A</option><option value="R-22">R-22 (Triggers Flush Cost)</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Existing Brand</label>
                   <input className="input-field w-full mt-1" placeholder="e.g. Trane" value={survey.existingBrand} onChange={e => updateSurveyAndTriggerSafetyNet('existingBrand', e.target.value)} />
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Year Manufactured</label>
                   <input type="number" className="input-field w-full mt-1" placeholder="e.g. 2010" value={survey.yearManufactured} onChange={e => updateSurveyAndTriggerSafetyNet('yearManufactured', e.target.value)} />
                 </div>
               </div>

               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-[#2A9D8F] uppercase mt-4">B. Electrical Constraints</h4>
               <div className="grid grid-cols-4 gap-4 mb-6">
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Main Panel Amps</label>
                    <select className="input-field w-full mt-1" value={survey.mainBreakerAmps} onChange={e => updateSurveyAndTriggerSafetyNet('mainBreakerAmps', e.target.value)}>
                       <option value="">Select...</option><option>100A</option><option>150A</option><option>200A</option><option>200A+</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Condenser Breaker Size</label>
                    <select className="input-field w-full mt-1" value={survey.condenserBreaker} onChange={e => updateSurveyAndTriggerSafetyNet('condenserBreaker', e.target.value)}>
                       <option value="">Select...</option><option>20A</option><option>25A</option><option>30A</option><option>40A</option><option>50A</option><option>60A</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Disconnect Switch</label>
                    <select className="input-field w-full mt-1" value={survey.disconnectCondition} onChange={e => updateSurveyAndTriggerSafetyNet('disconnectCondition', e.target.value)}>
                       <option value="Pass">Pass</option><option value="Replace Required">Replace Required (Triggers Cost)</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500">Whip Condition</label>
                    <select className="input-field w-full mt-1" value={survey.whipCondition} onChange={e => updateSurveyAndTriggerSafetyNet('whipCondition', e.target.value)}>
                       <option value="Pass">Pass</option><option value="Replace">Replace</option>
                    </select>
                 </div>
               </div>

               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-[#2A9D8F] uppercase mt-4">C. Physical Constraints</h4>
               <div className="grid grid-cols-4 gap-4">
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Condenser Location</label>
                   <select className="input-field w-full mt-1" value={survey.condenserLocation} onChange={e => updateSurveyAndTriggerSafetyNet('condenserLocation', e.target.value)}>
                     <option value="">Select...</option>
                     <option value="Ground">Ground Level / Yard</option><option value="Roof">Roof (Triggers Crane)</option><option value="Side">Side Yard Narrow Access</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Air Handler Location</label>
                   <select className="input-field w-full mt-1" value={survey.ahuLocation} onChange={e => updateSurveyAndTriggerSafetyNet('ahuLocation', e.target.value)}>
                     <option value="">Select...</option>
                     <option value="Closet">Closet</option><option value="Garage">Garage</option><option value="Attic">Attic (Triggers Extra Labor)</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Ductwork Condition</label>
                   <select className="input-field w-full mt-1" value={survey.ductCondition} onChange={e => updateSurveyAndTriggerSafetyNet('ductCondition', e.target.value)}>
                     <option value="">Select...</option>
                     <option>Good</option><option>Needs Mastic/Sealing</option><option>Replace Plenums</option><option>Full Replace</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500">Thermostat Request</label>
                   <select className="input-field w-full mt-1" value={survey.thermostat} onChange={e => updateSurveyAndTriggerSafetyNet('thermostat', e.target.value)}>
                     <option value="">Select...</option>
                     <option>Replace with Smart (Ecobee/Nest)</option><option>Replace with Digital Basic</option><option>Keep Existing</option>
                   </select>
                 </div>
               </div>
            </div>

            <div className="bg-white p-6 rounded border border-slate-200">
               <h4 className="text-sm font-bold border-b pb-2 mb-4 text-[#2A9D8F] uppercase">System Measurements (1 - 27)</h4>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Box 1: Front View */}
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm">
                   <h5 className="font-black text-center text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2">FRONT VIEW</h5>
                   <div className="grid grid-cols-2 gap-3 text-xs">
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">1</div><input className="input-field w-full py-1 text-center" placeholder="Plenum W" value={survey.m1} onChange={e=>setSurvey({...survey, m1: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">2</div><input className="input-field w-full py-1 text-center" placeholder="AHU W" value={survey.m2} onChange={e=>setSurvey({...survey, m2: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">3</div><input className="input-field w-full py-1 text-center" placeholder="Ret Box W" value={survey.m3} onChange={e=>setSurvey({...survey, m3: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">4</div><input className="input-field w-full py-1 text-center" placeholder="L Clear" value={survey.m4} onChange={e=>setSurvey({...survey, m4: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">5</div><input className="input-field w-full py-1 text-center" placeholder="B Clear" value={survey.m5} onChange={e=>setSurvey({...survey, m5: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">6</div><input className="input-field w-full py-1 text-center" placeholder="AHU H" value={survey.m6} onChange={e=>setSurvey({...survey, m6: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">7</div><input className="input-field w-full py-1 text-center" placeholder="Top Clear" value={survey.m7} onChange={e=>setSurvey({...survey, m7: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">8</div><input className="input-field w-full py-1 text-center" placeholder="Door H" value={survey.m8} onChange={e=>setSurvey({...survey, m8: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">9</div><input className="input-field w-full py-1 text-center" placeholder="R Clear" value={survey.m9} onChange={e=>setSurvey({...survey, m9: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">10</div><input className="input-field w-full py-1 text-center" placeholder="Door W" value={survey.m10} onChange={e=>setSurvey({...survey, m10: e.target.value})}/></div>
                   </div>
                 </div>

                 {/* Box 2: Side View */}
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm">
                   <h5 className="font-black text-center text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2">SIDE VIEW</h5>
                   <div className="grid grid-cols-2 gap-3 text-xs">
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">11</div><input className="input-field w-full py-1 text-center" placeholder="Ceil H" value={survey.m11} onChange={e=>setSurvey({...survey, m11: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">12</div><input className="input-field w-full py-1 text-center" placeholder="Clearance" value={survey.m12} onChange={e=>setSurvey({...survey, m12: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">13</div><input className="input-field w-full py-1 text-center" placeholder="Plenum D" value={survey.m13} onChange={e=>setSurvey({...survey, m13: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">14</div><input className="input-field w-full py-1 text-center" placeholder="AHU D" value={survey.m14} onChange={e=>setSurvey({...survey, m14: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">15</div><input className="input-field w-full py-1 text-center" placeholder="Clearance" value={survey.m15} onChange={e=>setSurvey({...survey, m15: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">16</div><input className="input-field w-full py-1 text-center" placeholder="Ret Box D" value={survey.m16} onChange={e=>setSurvey({...survey, m16: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">17</div><input className="input-field w-full py-1 text-center" placeholder="Clearance" value={survey.m17} onChange={e=>setSurvey({...survey, m17: e.target.value})}/></div>
                   </div>
                 </div>

                 {/* Box 3: Horizontal */}
                 <div className="bg-slate-50 p-4 border border-slate-200 rounded shadow-sm">
                   <h5 className="font-black text-center text-slate-700 tracking-wider mb-4 border-b border-slate-200 pb-2">HORIZONTAL</h5>
                   <div className="grid grid-cols-2 gap-3 text-xs">
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">18</div><input className="input-field w-full py-1 text-center" placeholder="Access W" value={survey.m18} onChange={e=>setSurvey({...survey, m18: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">19</div><input className="input-field w-full py-1 text-center" placeholder="Access D" value={survey.m19} onChange={e=>setSurvey({...survey, m19: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">20</div><input className="input-field w-full py-1 text-center" placeholder="AHU L" value={survey.m20} onChange={e=>setSurvey({...survey, m20: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">21</div><input className="input-field w-full py-1 text-center" placeholder="AHU H" value={survey.m21} onChange={e=>setSurvey({...survey, m21: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">22</div><input className="input-field w-full py-1 text-center" placeholder="Plenum Top" value={survey.m22} onChange={e=>setSurvey({...survey, m22: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">23</div><input className="input-field w-full py-1 text-center" placeholder="Plenum End" value={survey.m23} onChange={e=>setSurvey({...survey, m23: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">24</div><input className="input-field w-full py-1 text-center" placeholder="Plenum B" value={survey.m24} onChange={e=>setSurvey({...survey, m24: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">25</div><input className="input-field w-full py-1 text-center" placeholder="Plenum C" value={survey.m25} onChange={e=>setSurvey({...survey, m25: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">26</div><input className="input-field w-full py-1 text-center" placeholder="Plenum D" value={survey.m26} onChange={e=>setSurvey({...survey, m26: e.target.value})}/></div>
                     <div className="flex items-center gap-2"><div className="bg-slate-300 text-slate-700 rounded w-6 h-6 flex items-center justify-center font-bold font-mono">27</div><input className="input-field w-full py-1 text-center" placeholder="Attic Pitch" value={survey.m27} onChange={e=>setSurvey({...survey, m27: e.target.value})}/></div>
                   </div>
                 </div>
               </div>
            </div>

            <div className="bg-slate-50 p-6 rounded border border-slate-200 mt-6">
               <div className="flex justify-between items-center border-b pb-2 mb-4">
                 <h4 className="text-sm font-bold text-[#2A9D8F] uppercase">Site Photos</h4>
                 <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">Optional for Testing</span>
               </div>
               <p className="text-xs text-slate-500 mb-4">Please upload visual proof of all constraints for the installation crew. These will uniquely appear in the pipeline Deal Command Center.</p>
               <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                 {[
                   { id: 'condenser_wide', label: 'Condenser (Wide)', desc: 'Show pad & yard' },
                   { id: 'condenser_data_plate', label: 'Condenser Plate', desc: 'Focus on model/serial' },
                   { id: 'indoor_unit_wide', label: 'Indoor Unit (Wide)', desc: 'Show clearances' },
                   { id: 'indoor_data_plate', label: 'Indoor Plate', desc: 'Focus on model/serial' },
                   { id: 'electrical_panel_open', label: 'Electrical Panel', desc: 'Show breaker load' }
                 ].map(photoObj => (
                   <div key={photoObj.id} className="border border-slate-200 rounded p-3 bg-white text-center shadow-sm relative overflow-hidden flex flex-col justify-between">
                     <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{photoObj.label}</label>
                        <p className="text-[9px] text-slate-400 mb-3 leading-tight">{photoObj.desc}</p>
                     </div>
                     
                     <div className="mt-auto">
                        {uploadingPhoto === photoObj.id ? (
                          <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50">
                             <div className="loader inline-block scale-50 m-0 p-0 border-t-primary-500"></div>
                          </div>
                        ) : photos[photoObj.id] ? (
                          <div className="relative group cursor-pointer inline-block w-full h-24">
                             <img src={photos[photoObj.id]} alt="Uploaded" className="w-full h-full object-cover rounded border border-slate-200 transition-opacity group-hover:opacity-75" />
                             <div 
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded"
                                onClick={() => setPhotos({...photos, [photoObj.id]: null})}
                             >
                                <span className="text-xs text-white font-bold p-1 bg-danger rounded">Remove</span>
                             </div>
                          </div>
                        ) : (
                          <div className="w-full h-24 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group">
                            <ImageIcon className="text-slate-400 mb-1 group-hover:text-primary-500 transition-colors" size={20} />
                            <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Upload Image</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                 if (e.target.files && e.target.files[0]) {
                                    handlePhotoUpload(photoObj.id, e.target.files[0]);
                                 }
                              }}
                            />
                          </div>
                        )}
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t border-slate-100">
               <button className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors" onClick={() => setStep(1)}>Back</button>
               <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors" onClick={() => setStep(3)}>Next: Verify Options ➔</button>
            </div>
          </div>
        )}

        {/* STEP 3: EQUIPMENT TIERS */}
        {step === 3 && (
          <div>
             <h3 className="font-bold mb-4 text-slate-700">3. Select Database Equipment Tiers</h3>
             {catalog.length === 0 ? (
                <div className="p-4 bg-orange-50 text-orange-800 rounded mb-4">
                  No equipment exists in the database. Please go to the <b>Catalog</b> menu to add items!
                </div>
             ) : (
                <div className="grid grid-cols-3 gap-4">
                  {['best', 'better', 'good'].map(tier => (
                    <div key={tier} className="border p-4 rounded bg-slate-50">
                      <h4 className="uppercase font-bold text-slate-500 mb-2">{tier} TIER</h4>
                      <select className="input-field w-full" 
                         onChange={e => setSelectedTiers({...selectedTiers, [tier]: catalog.find(c => c.id === e.target.value)})}
                      >
                         <option value="">- Select Model -</option>
                         {catalog.map(equip => (
                            <option key={equip.id} value={equip.id}>{equip.brand} {equip.series} - {equip.tons}T (${equip.system_cost})</option>
                         ))}
                      </select>
                    </div>
                  ))}
                </div>
             )}

             <h3 className="font-bold mt-8 mb-4 text-slate-700">Add-On Labors & Subcontracts</h3>
             <div className="grid grid-cols-2 gap-2">
               {laborRates.map(labor => (
                 <label key={labor.id} className="flex items-center gap-2 p-2 border rounded border-slate-200 cursor-pointer hover:bg-slate-50 transition-fast bg-white">
                   <input type="checkbox" checked={!!addons[labor.id]} onChange={() => toggleAddon(labor.id)} />
                   <span className="font-medium text-sm">{labor.item_name} <span className="text-slate-400">(${labor.cost})</span></span>
                 </label>
               ))}
             </div>

             <div className="flex justify-between mt-8 pt-4 border-t border-slate-200">
               <button className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors" onClick={() => setStep(2)}>Back</button>
               <button className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors" onClick={() => setStep(4)}>Next: Verify Margin Calculations ➔</button>
             </div>
          </div>
        )}

        {/* STEP 4: MARGIN VERIFICATION */}
        {step === 4 && (
          <div>
             <h3 className="font-bold mb-4 text-slate-700">4. Proposal Margin Verification</h3>
             <div className="bg-slate-50 p-6 rounded border border-slate-200">
               <div className="grid grid-cols-2 gap-y-4">
                  <span className="text-slate-500">Service Reserve Rule:</span><strong className="text-right text-amber-500">{(margins.service_reserve * 100).toFixed(0)}%</strong>
                  <span className="text-slate-500">State Sales Tax:</span><strong className="text-right text-slate-500">{(margins.sales_tax * 100).toFixed(2)}%</strong>
                  
                  <hr className="col-span-2" />
                  
                  <h4 className="col-span-2 uppercase text-xs font-bold text-slate-400 mt-2 border-t border-slate-200 pt-4 mb-2">Calculated Turnkey Retails</h4>
                  
                  <span className="font-bold text-slate-700 flex flex-col justify-center">BEST Tier <span className="text-primary-500 text-[10px]">({(margins.best_margin * 100).toFixed(0)}% Target)</span></span>
                  <strong className="text-right text-primary-600 text-xl">${calculateSalesPrice(selectedTiers.best?.system_cost, 'Best').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  
                  <span className="font-bold text-slate-700 flex flex-col justify-center">BETTER Tier <span className="text-emerald-600 text-[10px]">({(margins.better_margin * 100).toFixed(0)}% Target)</span></span>
                  <strong className="text-right text-emerald-600 text-xl">${calculateSalesPrice(selectedTiers.better?.system_cost, 'Better').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  
                  <span className="font-bold text-slate-700 flex flex-col justify-center">GOOD Tier <span className="text-slate-500 text-[10px]">({(margins.good_margin * 100).toFixed(0)}% Target)</span></span>
                  <strong className="text-right text-slate-600 text-xl">${calculateSalesPrice(selectedTiers.good?.system_cost, 'Good').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
               </div>
             </div>

               <div className="flex justify-between mt-8 pt-4 border-t border-slate-200">
               <button className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 font-bold text-sm transition-colors" onClick={() => setStep(3)}>Back</button>
               <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded font-bold flex items-center gap-2 transition-colors shadow-lg" onClick={generateProposal}><Check size={18} /> Finalize Proposal</button>
             </div>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
