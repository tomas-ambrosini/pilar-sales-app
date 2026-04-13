import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, Box, Pen, Layers, Calculator, UploadCloud, RefreshCw, Component, Check, Search, Filter, Package } from 'lucide-react';
import Modal from '../components/Modal';

export default function CatalogEditor() {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState([]);
  const [laborRates, setLaborRates] = useState([]);
  const [margins, setMargins] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('All');

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
        supabase.from('equipment_catalog').select('*').order('brand').order('series').order('tons').order('id'),
        supabase.from('labor_rates').select('*').order('category').order('item_name').order('id'),
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setFilterValue('All');
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

  // --- Derived State & Filters ---
  const uniqueBrands = [...new Set(equipment.map(e => e.brand).filter(Boolean))];
  const uniqueLaborCategories = [...new Set(laborRates.map(l => l.category).filter(Boolean))];

  const filteredEquipment = equipment.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      item.brand?.toLowerCase().includes(searchLower) ||
      item.series?.toLowerCase().includes(searchLower) ||
      item.condenser_model?.toLowerCase().includes(searchLower) ||
      item.ahu_model?.toLowerCase().includes(searchLower);
    const matchesFilter = filterValue === 'All' || item.brand === filterValue;
    return matchesSearch && matchesFilter;
  });

  const filteredLabor = laborRates.filter(labor => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      labor.item_name?.toLowerCase().includes(searchLower) ||
      labor.category?.toLowerCase().includes(searchLower);
    const matchesFilter = filterValue === 'All' || labor.category === filterValue;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-4 sm:px-8 pt-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Package className="text-primary-600" size={32} />
            Catalog & Subcontractors
          </h1>
          <p className="text-slate-500 font-medium mt-1">Manage internal equipment SKUs and baseline labor capabilities.</p>
        </div>
        {activeTab === 'equipment' ? (
           <button className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95" onClick={() => { setActiveEquip(initialEquipState); setIsEquipModalOpen(true); }}>
              <Plus size={18} /> New System
           </button>
        ) : (
           <button className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95" onClick={() => { setActiveLabor(initialLaborState); setIsLaborModalOpen(true); }}>
              <Plus size={18} /> New Service Item
           </button>
        )}
      </div>

      <div className="px-4 sm:px-8 pb-12 overflow-x-hidden w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
          
          {/* Action Bar Inside Card */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
             
             {/* Primary Module Navigation Tabs */}
             <div className="flex gap-2 overflow-x-auto custom-scrollbar w-full sm:w-auto">
                <button onClick={() => handleTabChange('equipment')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'equipment' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <Box size={14} className={activeTab === 'equipment' ? 'text-primary-300' : ''} /> Central Equipment Database
                </button>
                <button onClick={() => handleTabChange('labor')} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'labor' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <Pen size={14} className={activeTab === 'labor' ? 'text-primary-300' : ''} /> Add-ons & Labor Rates
                </button>
             </div>

             {/* Sleek Toolbar for Search and Filtering */}
             <div className="flex items-center gap-3 w-full sm:w-auto">
                 <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Search size={14} className="text-slate-400" />
                    </div>
                    <input 
                       type="text" 
                       className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none sm:text-xs font-semibold transition-colors" 
                       placeholder={activeTab === 'equipment' ? "Search codes..." : "Search services..."} 
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
                 <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-lg px-2 shrink-0">
                    <Filter size={14} className="text-slate-400" />
                    <select 
                       className="border-none bg-transparent focus:ring-0 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                       value={filterValue}
                       onChange={(e) => setFilterValue(e.target.value)}
                    >
                       <option value="All">All {activeTab === 'equipment' ? 'Brands' : 'Categories'}</option>
                       {activeTab === 'equipment' 
                         ? uniqueBrands.map(b => <option key={b} value={b}>{b}</option>)
                         : uniqueLaborCategories.map(c => <option key={c} value={c}>{c}</option>)
                       }
                    </select>
                 </div>
             </div>
          </div>
         {activeTab === 'equipment' && (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 leading-tight">

                    <th className="p-4 font-semibold">Brand & Series</th>
                    <th className="p-4 font-semibold">Tonnage / SEER</th>
                    <th className="p-4 font-semibold">Models (Condenser / Air Handler)</th>
                    <th className="p-4 font-semibold text-right">Raw Cost</th>
                    <th className="p-4 font-semibold text-right">Target Retail</th>
                    <th className="p-4 font-semibold text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {filteredEquipment.length === 0 ? (
                      <tr><td colSpan="6" className="p-12 text-center">
                         <Box size={40} className="text-slate-200 mx-auto mb-3" />
                         <span className="text-slate-500 font-medium tracking-wide">No equipment SKUs found matching your criteria.</span>
                      </td></tr>
                   ) : (
                      filteredEquipment.map(item => (
                         <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 hover:shadow-inner transition-colors group">

                           <td className="p-4">
                              <div className="font-black text-slate-800 tracking-tight text-base mb-0.5">{item.brand}</div>
                              <div className="text-xs text-slate-500 font-mono tracking-wide">{item.series} Series</div>
                           </td>
                           <td className="p-4">
                              <div className="flex gap-2 text-xs">
                                 <span className="bg-primary-50 text-primary-700 px-2.5 py-1 rounded-md font-bold border border-primary-100 shadow-sm">{item.tons} Ton</span>
                                 <span className="bg-white text-slate-600 px-2.5 py-1 rounded-md font-bold border border-slate-200 shadow-sm">{item.seer} SEER</span>
                              </div>
                           </td>
                           <td className="p-4 text-xs text-slate-500 font-mono">
                              <div className="mb-1 bg-slate-100 px-2 py-0.5 rounded truncate max-w-[160px] inline-block shadow-sm" title={`Condenser: ${item.condenser_model}`}>{item.condenser_model || '-'}</div>
                              <br/>
                              <div className="bg-slate-100 px-2 py-0.5 rounded truncate max-w-[160px] inline-block shadow-sm" title={`Air Handler: ${item.ahu_model}`}>{item.ahu_model || '-'}</div>
                           </td>
                           <td className="p-4 text-right font-black text-red-600 text-base">
                              ${item.system_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </td>
                           <td className="p-4 text-right">
                              <span className="font-black text-white bg-emerald-600 shadow-md px-3.5 py-1.5 rounded-full inline-block text-[13px] tracking-wide">
                                 ${item.retail_price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                           </td>
                           <td className="p-4 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="bg-white border border-slate-200 p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:border-primary-200 shadow-sm transform hover:scale-105 transition-all" onClick={() => { setActiveEquip(item); setIsEquipModalOpen(true); }}><Edit2 size={16} /></button>
                                 <button className="bg-white border border-slate-200 p-1.5 rounded-md text-slate-400 hover:text-danger hover:bg-red-50 hover:border-red-200 shadow-sm transform hover:scale-105 transition-all" onClick={() => handleDeleteEquip(item.id)}><Trash2 size={16} /></button>
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
                   {filteredLabor.length === 0 ? (
                      <tr><td colSpan="4" className="p-12 text-center">
                         <Pen size={40} className="text-slate-200 mx-auto mb-3" />
                         <span className="text-slate-500 font-medium tracking-wide">No labor rates or subcontractors found matching your criteria.</span>
                      </td></tr>
                   ) : (
                      filteredLabor.map(labor => (
                         <tr key={labor.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                           <td className="p-4">
                              <span className="bg-white shadow-sm text-slate-600 text-[10px] font-black px-2.5 py-1.5 flex items-center w-max rounded-md uppercase tracking-widest border border-slate-200">
                                 {labor.category}
                              </span>
                           </td>
                           <td className="p-4 font-black text-slate-800 text-base tracking-tight">{labor.item_name}</td>
                           <td className="p-4 text-right font-black font-mono text-slate-700 text-base">
                              ${labor.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                           </td>
                           <td className="p-4 text-center">
                              <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button className="bg-white border border-slate-200 p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:border-primary-200 shadow-sm transform hover:scale-105 transition-all" onClick={() => { setActiveLabor(labor); setIsLaborModalOpen(true); }}><Edit2 size={16} /></button>
                                 <button className="bg-white border border-slate-200 p-1.5 rounded-md text-slate-400 hover:text-danger hover:bg-red-50 hover:border-red-200 shadow-sm transform hover:scale-105 transition-all" onClick={() => handleDeleteLabor(labor.id)}><Trash2 size={16} /></button>
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



            <div className="border-t border-slate-100 mt-4 pt-4 bg-[#F8FAFC] p-4 rounded-b-lg -mx-6 -mb-6">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide"><Calculator size={14}/> Integrated Pricing Engine</h4>
                  <button type="button" onClick={applyPricingFormula} className="text-[9px] font-bold bg-primary-100 text-primary-700 px-3 py-1 rounded shadow-sm hover:bg-primary-200 transition-colors uppercase tracking-wider focus:ring-2 ring-primary-500">
                     Execute Target Script
                  </button>
               </div>
               
               <div className="grid grid-cols-2 gap-4 bg-white p-3 border border-slate-200 rounded-md shadow-sm">
                  <div>
                    <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-1">Company Base Cost</label>
                    <input type="number" step="0.01" className="w-full p-2.5 rounded bg-red-50 border border-red-100 font-mono font-black text-red-700 shadow-inner" value={activeEquip.system_cost} onChange={e => setActiveEquip({...activeEquip, system_cost: e.target.value})} required/>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">Minimum Retail Baseline</label>
                    <input type="number" step="0.01" className="w-full p-2.5 rounded bg-emerald-50 border border-emerald-200 font-mono font-black text-white bg-emerald-600 shadow-md transform scale-105" value={activeEquip.retail_price} onChange={e => setActiveEquip({...activeEquip, retail_price: e.target.value})}/>
                  </div>
                  
                  <div className="col-span-2 mt-2 input-field bg-slate-50 border border-slate-200 p-2.5 rounded flex flex-col shadow-inner">
                     <span className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Pricing Strategy Array Script</span>
                     <input type="text" className="w-full text-slate-600 font-mono text-[11px] bg-transparent outline-none" value={formulaStr} onChange={e => setFormulaStr(e.target.value)}/>
                  </div>
               </div>
               
               <div className="flex gap-3 justify-end mt-5">
                  <button type="button" className="btn-secondary font-bold" onClick={() => setIsEquipModalOpen(false)}>Discard Edits</button>
                  <button type="submit" className="btn-primary shadow-lg font-bold group">Complete Setup <Check size={16} className="text-white opacity-50 group-hover:opacity-100 transition-opacity ml-1 inline-block"/></button>
               </div>
            </div>
         </form>
      </Modal>

      {/* SUBCONTRACTOR & LABOR MODAL COMPONENT */}
      <Modal isOpen={isLaborModalOpen} onClose={() => setIsLaborModalOpen(false)} title={activeLabor?.id ? "Edit System Add-on" : "Create Technical Add-on Matrix"}>
         <form className="modal-form" onSubmit={handleSaveLabor}>
            <div className="bg-slate-50 p-5 border border-slate-200 rounded-lg shadow-inner mb-6 space-y-5">
               
               <div className="form-group mb-0">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Tax Categorization Protocol</label>
                  <select className="input-field w-full font-bold text-sm bg-white shadow-sm border-slate-300 py-3" value={activeLabor.category} onChange={e => setActiveLabor({...activeLabor, category: e.target.value})} required>
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Customer/Tech Visible Array Name</label>
                  <input className="input-field w-full font-bold text-base border-slate-300 py-3 shadow-sm" value={activeLabor.item_name} onChange={e => setActiveLabor({...activeLabor, item_name: e.target.value})} placeholder="e.g. Crane Overhead Extraction" required/>
               </div>
               
               <div className="form-group mb-0 relative">
                  <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-1.5">Internal Floor Cost Injection ($)</label>
                  <input type="number" step="0.01" className="input-field w-full border-red-300 text-red-700 font-mono font-black shadow-inner bg-red-50 text-2xl pl-8 py-4 rounded-lg" value={activeLabor.cost} onChange={e => setActiveLabor({...activeLabor, cost: e.target.value})} required/>
                  <span className="absolute left-3 top-[37px] font-black text-red-400 text-2xl">$</span>
                  <p className="text-[9px] text-red-500/80 mt-2 font-bold tracking-wide uppercase">DANGER: This cost is completely invisible, and natively offset to the customer total mapped to targeted margin arrays.</p>
               </div>
            </div>
            
            <div className="modal-actions pt-2 border-t border-slate-100">
               <button type="button" className="btn-secondary font-bold" onClick={() => setIsLaborModalOpen(false)}>Discard Override</button>
               <button type="submit" className="btn-primary shadow-lg font-bold px-8 group flex items-center gap-2">Deploy Live <Check size={16} className="text-white opacity-50 group-hover:opacity-100 transition-opacity"/></button>
            </div>
         </form>
      </Modal>

    </div>
  );
}
