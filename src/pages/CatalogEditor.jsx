import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, Box, PenTool, Layers, Calculator, UploadCloud, RefreshCw, Component, Check } from 'lucide-react';
import Modal from '../components/Modal';

export default function CatalogEditor() {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [margins, setMargins] = useState(null);
  const [loading, setLoading] = useState(true);

  // Forms State
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  
  const initialEquipState = { id: null, brand: '', series: '', tons: '', seer: '', condenser_model: '', ahu_model: '', system_cost: '', retail_price: '', image_url: '' };
  const initialLaborState = { id: null, category: 'Labor', item_name: '', cost: '' };

  const [activeEquip, setActiveEquip] = useState(initialEquipState);
  const [activeLabor, setActiveLabor] = useState(initialLaborState);
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formulaStr, setFormulaStr] = useState('(cost + (cost * reserve)) / (1 - margin)');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [equipRes, laborRes, marginRes] = await Promise.all([
        supabase.from('equipment_catalog').select('*').order('brand').order('series').order('tons'),
        supabase.from('labor_rates').select('*').order('category').order('item_name'),
        supabase.from('margin_settings').select('*').eq('id', 1).single()
      ]);
      
      if (equipRes.data) setEquipment(equipRes.data);
      if (laborRes.data) setLaborRates(laborRes.data);
      if (marginRes.data) setMargins(marginRes.data);
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Equipment Handlers ---
  const handleSaveEquip = async (e) => {
    e.preventDefault();
    const payload = {
      brand: activeEquip.brand,
      series: activeEquip.series,
      tons: parseFloat(activeEquip.tons),
      seer: parseFloat(activeEquip.seer),
      condenser_model: activeEquip.condenser_model,
      ahu_model: activeEquip.ahu_model,
      system_cost: parseFloat(activeEquip.system_cost),
      retail_price: parseFloat(activeEquip.retail_price || 0),
      image_url: activeEquip.image_url
    };

    let error;
    if (activeEquip.id) {
       const res = await supabase.from('equipment_catalog').update(payload).eq('id', activeEquip.id);
       error = res.error;
    } else {
       const res = await supabase.from('equipment_catalog').insert([payload]);
       error = res.error;
    }

    if (error && error.message.includes('image_url')) {
       alert('To save images, please run this SQL in your Supabase Dashboard:\nALTER TABLE equipment_catalog ADD COLUMN image_url text;');
    } else if (error) {
       alert(error.message);
    } else {
       setIsEquipModalOpen(false);
       fetchData();
    }
  };

  const handleDeleteEquip = async (id) => {
    if (window.confirm("Are you sure you want to permanently delete this SKU?")) {
      await supabase.from('equipment_catalog').delete().eq('id', id);
      fetchData();
    }
  };

  // --- Labor Handlers ---
  const handleSaveLabor = async (e) => {
    e.preventDefault();
    const payload = {
      category: activeLabor.category,
      item_name: activeLabor.item_name,
      cost: parseFloat(activeLabor.cost)
    };

    let error;
    if (activeLabor.id) {
       const res = await supabase.from('labor_rates').update(payload).eq('id', activeLabor.id);
       error = res.error;
    } else {
       const res = await supabase.from('labor_rates').insert([payload]);
       error = res.error;
    }
    
    if (error) {
       alert(error.message);
    } else {
       setIsLaborModalOpen(false);
       fetchData();
    }
  };

  const handleDeleteLabor = async (id) => {
    if (window.confirm("Delete this labor rate? It will not affect past proposals.")) {
      await supabase.from('labor_rates').delete().eq('id', id);
      fetchData();
    }
  };

  // --- Utilities ---
  const applyPricingFormula = () => {
     if (!activeEquip.system_cost || !margins) return;
     try {
       const cost = parseFloat(activeEquip.system_cost);
       const margin = margins.good_margin || 0.35; // Default formula to Good Tier Target
       const reserve = margins.service_reserve;
       // Execute arbitrary formula string securely
       const evaluateMath = new Function('cost', 'margin', 'reserve', `return ${formulaStr}`);
       const finalPrice = evaluateMath(cost, margin, reserve);
       
       if (isNaN(finalPrice)) throw new Error('Mathematical evaluation failed');
       setActiveEquip({...activeEquip, retail_price: finalPrice.toFixed(2)});
     } catch (error) {
       alert('Formula Error: Ensure your math format is correct (e.g., standard JS operators).');
     }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('catalog-images').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('catalog-images').getPublicUrl(fileName);
      setActiveEquip(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      alert('Failed to upload image. Ensure bucket "catalog-images" exists.\nError: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) return <div className="page-container flex justify-center items-center"><span className="text-slate-400 flex items-center gap-2"><RefreshCw className="animate-spin"/> Syncing Live Catalog...</span></div>;

  const uniqueBrands = [...new Set(equipment.map(e => e.brand).filter(Boolean))];

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Catalog & Subcontractors</h1>
          <p className="page-subtitle">Manage internal equipment SKUs and baseline labor capabilities.</p>
        </div>
        {activeTab === 'equipment' ? (
           <button className="primary-action-btn flex items-center gap-2" onClick={() => { setActiveEquip(initialEquipState); setIsEquipModalOpen(true); }}>
              <Plus size={18} /> New System
           </button>
        ) : (
           <button className="primary-action-btn flex items-center gap-2" onClick={() => { setActiveLabor(initialLaborState); setIsLaborModalOpen(true); }}>
              <Plus size={18} /> New Service Item
           </button>
        )}
      </header>

      {/* Primary Module Navigation Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max mb-6">
        <button onClick={() => setActiveTab('equipment')} className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast flex items-center gap-2 ${activeTab === 'equipment' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}>
          <Box size={16} /> Central Equipment Database
        </button>
        <button onClick={() => setActiveTab('labor')} className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast flex items-center gap-2 ${activeTab === 'labor' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}>
          <PenTool size={16} /> Add-ons & Labor Rates
        </button>
      </div>

      <div className="glass-panel overflow-hidden border border-slate-200 shadow-sm">
         {activeTab === 'equipment' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 leading-tight">
                    <th className="p-4 font-semibold w-16 text-center">Image</th>
                    <th className="p-4 font-semibold">Brand & Series</th>
                    <th className="p-4 font-semibold">Tonnage / SEER</th>
                    <th className="p-4 font-semibold">Models (Condenser / Air Handler)</th>
                    <th className="p-4 font-semibold text-right">Raw Cost</th>
                    <th className="p-4 font-semibold text-right">Target Retail</th>
                    <th className="p-4 font-semibold text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {equipment.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-500 font-medium tracking-wide">No equipment SKUs found. Add a system above.</td></tr>
                   ) : (
                      equipment.map(item => (
                         <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                           <td className="p-3 text-center">
                              {item.image_url ? (
                                 <img src={item.image_url} alt="SKU" className="w-10 h-10 object-contain rounded bg-white border border-slate-200 mx-auto group-hover:scale-110 transition-transform"/>
                              ) : (
                                 <div className="w-10 h-10 bg-slate-100 border border-slate-200 text-slate-300 rounded mx-auto flex items-center justify-center">
                                    <Component size={18} />
                                 </div>
                              )}
                           </td>
                           <td className="p-3">
                              <div className="font-bold text-slate-800">{item.brand}</div>
                              <div className="text-xs text-slate-500 font-mono tracking-wide">{item.series} Series</div>
                           </td>
                           <td className="p-3">
                              <div className="flex gap-2 text-xs">
                                 <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded font-bold">{item.tons} Ton</span>
                                 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200">{item.seer} SEER</span>
                              </div>
                           </td>
                           <td className="p-3 text-xs text-slate-500 font-mono">
                              <div className="mb-0.5 truncate max-w-[150px]" title={`Condenser: ${item.condenser_model}`}>{item.condenser_model || '-'}</div>
                              <div className="truncate max-w-[150px]" title={`Air Handler: ${item.ahu_model}`}>{item.ahu_model || '-'}</div>
                           </td>
                           <td className="p-3 text-right font-bold text-danger-600">
                              ${item.system_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </td>
                           <td className="p-3 text-right">
                              <span className="font-bold text-success-700 bg-success-50 px-3 py-1 rounded border border-success-200 inline-block">
                                 ${item.retail_price?.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                              </span>
                           </td>
                           <td className="p-3 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="text-slate-400 hover:text-primary-600 transition-fast" onClick={() => { setActiveEquip(item); setIsEquipModalOpen(true); }}><Edit2 size={16} /></button>
                                 <button className="text-slate-400 hover:text-danger hover:bg-red-50 p-1 rounded transition-fast" onClick={() => handleDeleteEquip(item.id)}><Trash2 size={16} /></button>
                              </div>
                           </td>
                         </tr>
                      ))
                   )}
                </tbody>
              </table>
            </div>
         )}

         {activeTab === 'labor' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 leading-tight">
                    <th className="p-4 font-semibold w-1/4">Financial Category</th>
                    <th className="p-4 font-semibold w-1/2">Service or Material Line Item</th>
                    <th className="p-4 font-semibold text-right">Fixed Cost</th>
                    <th className="p-4 font-semibold text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {laborRates.length === 0 ? (
                      <tr><td colSpan="4" className="p-8 text-center text-slate-500 font-medium tracking-wide">No labor rates or subcontractors configured yet.</td></tr>
                   ) : (
                      laborRates.map(labor => (
                         <tr key={labor.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                           <td className="p-4">
                              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 flex items-center w-max rounded uppercase tracking-wider border border-slate-200">
                                 {labor.category}
                              </span>
                           </td>
                           <td className="p-4 font-semibold text-slate-800">{labor.item_name}</td>
                           <td className="p-4 text-right font-bold font-mono text-slate-700">
                              ${labor.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </td>
                           <td className="p-4 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="text-slate-400 hover:text-primary-600 transition-fast" onClick={() => { setActiveLabor(labor); setIsLaborModalOpen(true); }}><Edit2 size={16} /></button>
                                 <button className="text-slate-400 hover:text-danger hover:bg-red-50 p-1 rounded transition-fast" onClick={() => handleDeleteLabor(labor.id)}><Trash2 size={16} /></button>
                              </div>
                           </td>
                         </tr>
                      ))
                   )}
                </tbody>
              </table>
            </div>
         )}
      </div>

      {/* EQUIPMENT MODAL COMPONENT */}
      <Modal isOpen={isEquipModalOpen} onClose={() => setIsEquipModalOpen(false)} title={activeEquip?.id ? "Edit Equipment SKU" : "New System Profile"}>
         <form className="modal-form" onSubmit={handleSaveEquip}>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Brand Name</label>
                 <input className="input-field w-full font-semibold" list="brand-options" value={activeEquip.brand} onChange={e => setActiveEquip({...activeEquip, brand: e.target.value})} required/>
                 <datalist id="brand-options">
                    {uniqueBrands.map(b => <option key={b} value={b} />)}
                 </datalist>
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Series Line</label>
                 <input className="input-field w-full font-semibold" value={activeEquip.series} onChange={e => setActiveEquip({...activeEquip, series: e.target.value})} placeholder="e.g. XR14" required/>
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tonnage</label>
                 <input type="number" step="0.5" className="input-field w-full font-mono bg-slate-50 border-slate-200" value={activeEquip.tons} onChange={e => setActiveEquip({...activeEquip, tons: e.target.value})} required/>
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">SEER2 Specs</label>
                 <input type="number" step="0.5" className="input-field w-full font-mono bg-slate-50 border-slate-200" value={activeEquip.seer} onChange={e => setActiveEquip({...activeEquip, seer: e.target.value})} required/>
               </div>
               <div className="col-span-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Internal Condenser Model Code</label>
                 <input className="input-field w-full text-slate-600 font-mono text-xs" value={activeEquip.condenser_model} onChange={e => setActiveEquip({...activeEquip, condenser_model: e.target.value})}/>
               </div>
               <div className="col-span-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Internal Air Handler Model Code</label>
                 <input className="input-field w-full text-slate-600 font-mono text-xs" value={activeEquip.ahu_model} onChange={e => setActiveEquip({...activeEquip, ahu_model: e.target.value})}/>
               </div>
            </div>

            <div className="border-t border-slate-100 my-4 pt-4 px-1">
               <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide"><Layers size={14}/> Marketing Assets</h4>
               <div className="bg-slate-50 p-3 rounded-md border border-slate-200 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                     {activeEquip.image_url ? <img src={activeEquip.image_url} className="w-full h-full object-cover" alt="Preview"/> : <UploadCloud className="text-slate-300"/>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                     <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer hover:bg-white transition-colors block w-max">
                        {uploadingImage ? 'Uploading securely...' : 'Upload Image URL (.png, .jpg)'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage}/>
                     </label>
                     <p className="text-[9px] text-slate-400 mt-1 pl-1 font-mono break-all truncate">{activeEquip.image_url || 'No secure asset attached.'}</p>
                  </div>
               </div>
            </div>

            <div className="border-t border-slate-100 mt-4 pt-4 bg-[#F8FAFC] p-4 rounded-b-lg -mx-6 -mb-6">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide"><Calculator size={14}/> Integrated Pricing Engine</h4>
                  <button type="button" onClick={applyPricingFormula} className="text-[9px] font-bold bg-primary-100 text-primary-700 px-3 py-1 rounded shadow-sm hover:bg-primary-200 transition-colors uppercase tracking-wider focus:ring-2 ring-primary-500">
                     Execute Target Script
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-4 bg-white p-3 border border-slate-200 rounded-md shadow-sm">
                  <div>
                    <label className="text-[10px] font-bold text-danger-500 uppercase tracking-widest block mb-1">Company Base Cost</label>
                    <input type="number" step="0.01" className="w-full p-2 rounded bg-danger-50 border border-danger-100 font-mono font-black text-danger-700" value={activeEquip.system_cost} onChange={e => setActiveEquip({...activeEquip, system_cost: e.target.value})} required/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-success-600 uppercase tracking-widest block mb-1">Minimum Retail Baseline</label>
                    <input type="number" step="0.01" className="w-full p-2 rounded bg-success-50 border border-success-200 font-mono font-black text-success-700 shadow-inner" value={activeEquip.retail_price} onChange={e => setActiveEquip({...activeEquip, retail_price: e.target.value})}/>
                  </div>
                  
                  <div className="col-span-2 mt-2 input-field bg-slate-50 border border-slate-200 p-2 rounded flex flex-col">
                     <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Pricing Strategy Array Script</span>
                     <input type="text" className="w-full text-slate-600 font-mono text-[11px] bg-transparent outline-none" value={formulaStr} onChange={e => setFormulaStr(e.target.value)}/>
                  </div>
               </div>
               
               <div className="flex gap-3 justify-end mt-5">
                  <button type="button" className="btn-secondary" onClick={() => setIsEquipModalOpen(false)}>Discard Edits</button>
                  <button type="submit" className="btn-primary shadow-md">Complete Setup</button>
               </div>
            </div>
         </form>
      </Modal>

      {/* SUBCONTRACTOR & LABOR MODAL COMPONENT */}
      <Modal isOpen={isLaborModalOpen} onClose={() => setIsLaborModalOpen(false)} title={activeLabor?.id ? "Edit System Add-on" : "Create Technical Add-on Matrix"}>
         <form className="modal-form" onSubmit={handleSaveLabor}>
            <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg shadow-inner mb-6 space-y-4">
               
               <div className="form-group mb-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Tax Categorization Protocol</label>
                  <select className="input-field w-full font-bold text-sm bg-white shadow-sm border-slate-300" value={activeLabor.category} onChange={e => setActiveLabor({...activeLabor, category: e.target.value})} required>
                     <option value="Labor">Tax Exempt Structural Labor</option>
                     <option value="Install">Tax Exempt Install Components</option>
                     <option value="Subcontract">3rd Party Subcontractor Payout</option>
                     <option value="Permit">City Building Code Permit</option>
                     <option value="Material">Standard Taxable Material Line</option>
                     <option value="Miscellaneous">Unclassified Miscellaneous</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">Controls exactly how this line item executes inside the Phase-10 State Sales Tax math engine on proposals.</p>
               </div>
               
               <div className="form-group mb-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Customer/Tech Visible Array Name</label>
                  <input className="input-field w-full font-semibold border-slate-300" value={activeLabor.item_name} onChange={e => setActiveLabor({...activeLabor, item_name: e.target.value})} placeholder="e.g. Crane Overhead Extraction" required/>
               </div>
               
               <div className="form-group mb-0 relative">
                  <label className="text-[10px] font-black text-danger-600 uppercase tracking-widest block mb-1">Internal Floor Cost Injection ($)</label>
                  <input type="number" step="0.01" className="input-field w-full border-danger-300 text-danger-700 font-mono font-black shadow-inner bg-danger-50 text-xl pl-6 py-3" value={activeLabor.cost} onChange={e => setActiveLabor({...activeLabor, cost: e.target.value})} required/>
                  <span className="absolute left-3 top-[30px] font-black text-danger-400 text-xl">$</span>
                  <p className="text-[9px] text-danger-500/80 mt-1.5 font-bold tracking-wide uppercase">DANGER: This cost is completely invisible, and natively offset to the customer total mapped to targeted margin arrays.</p>
               </div>
            </div>
            
            <div className="modal-actions pt-2 border-t border-slate-100">
               <button type="button" className="btn-secondary" onClick={() => setIsLaborModalOpen(false)}>Discard Override</button>
               <button type="submit" className="btn-primary shadow-md px-8 group flex items-center gap-2">Deploy Live <Check size={16} className="text-white opacity-50 group-hover:opacity-100 transition-opacity"/></button>
            </div>
         </form>
      </Modal>

    </div>
  );
}
