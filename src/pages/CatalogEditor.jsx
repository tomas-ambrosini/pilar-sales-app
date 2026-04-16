import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, Box, Pen, Layers, Calculator, UploadCloud, RefreshCw, Component, Check, Search, Filter, Package, ListOrdered } from 'lucide-react';
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
  const [laborSort, setLaborSort] = useState('Alphabetical');

  // Forms State
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  
  const initialEquipState = { id: null, brand: '', series: '', tons: '', seer: '', condenser_model: '', ahu_model: '', system_cost: '', retail_price: '', image_url: '' };
  const initialLaborState = { id: null, category: 'Labor', item_name: '', cost: '', sku: '', in_stock_quantity: 0 };

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
      cost: parseFloat(activeLabor.cost),
      sku: activeLabor.sku,
      in_stock_quantity: parseInt(activeLabor.in_stock_quantity) || 0
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
      labor.category?.toLowerCase().includes(searchLower) ||
      labor.sku?.toLowerCase().includes(searchLower);
    const matchesFilter = filterValue === 'All' || labor.category === filterValue;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
     if (laborSort === 'SKU') {
        const skuA = parseInt(a.sku) || Number.MAX_SAFE_INTEGER;
        const skuB = parseInt(b.sku) || Number.MAX_SAFE_INTEGER;
        return skuA - skuB;
     } else {
        return (a.item_name || '').localeCompare(b.item_name || '');
     }
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-1">
            <Package className="text-primary-600" size={28} />
            Catalog & Subcontractors
          </h1>
          <p className="text-slate-500 font-medium">Manage internal equipment SKUs and baseline labor capabilities.</p>
        </div>
        {activeTab === 'equipment' ? (
           <button className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700" onClick={() => { setActiveEquip(initialEquipState); setIsEquipModalOpen(true); }}>
              <Plus size={18} /> New System
           </button>
        ) : (
           <button className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700" onClick={() => { setActiveLabor(initialLaborState); setIsLaborModalOpen(true); }}>
              <Plus size={18} /> New Service Item
           </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
          
          {/* Action Bar Inside Card */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
             
             <div className="flex items-center gap-2 bg-slate-200/50 p-1 rounded-xl w-full sm:w-auto">
               <button className={`px-5 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none flex-1 sm:flex-none ${activeTab === 'equipment' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`} onClick={() => { setActiveTab('equipment'); setFilterValue('All'); setSearchTerm(''); }}>Systems</button>
               <button className={`px-5 py-2 rounded-lg font-bold text-sm transition-all focus:outline-none flex-1 sm:flex-none ${activeTab === 'labor' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`} onClick={() => { setActiveTab('labor'); setFilterValue('All'); setSearchTerm(''); }}>Service & Materials</button>
             </div>

             <div className="flex w-full sm:w-auto items-center gap-3">
                 <div className="relative flex-1 sm:flex-none sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                       type="text" 
                       placeholder={`Search ${activeTab}...`} 
                       className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium placeholder:text-slate-400 shadow-sm"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 shadow-sm select-wrapper relative">
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

                  {activeTab === 'labor' && (
                     <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 shadow-sm select-wrapper relative">
                        <ListOrdered size={14} className="text-slate-400" />
                        <select 
                           className="border-none bg-transparent focus:ring-0 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                           value={laborSort}
                           onChange={(e) => setLaborSort(e.target.value)}
                        >
                           <option value="Alphabetical">A-Z Name</option>
                           <option value="SKU">By SKU #</option>
                        </select>
                     </div>
                  )}

             </div>
          </div>
         {activeTab === 'equipment' && (
            <div className="w-full overflow-x-auto px-4 pb-4">
              <table className="w-full text-left border-separate border-spacing-y-3 whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                    <th className="px-6 py-2">Brand & Series</th>
                    <th className="px-6 py-2">Tonnage / SEER</th>
                    <th className="px-6 py-2">Models (Condenser / Air Handler)</th>
                    <th className="px-6 py-2 text-right">Raw Wholesale Cost</th>
                    <th className="px-6 py-2 text-right">Target Retail</th>
                    <th className="px-6 py-2 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {loading ? (
                     [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse bg-white shadow-sm rounded-xl">
                           <td className="px-6 py-5 rounded-l-xl border-y border-l border-slate-100"><div className="h-5 bg-slate-100 rounded w-24 mb-1.5"></div><div className="h-3 bg-slate-100 rounded w-16"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="flex gap-2"><div className="h-6 w-16 bg-slate-100 rounded-md"></div><div className="h-6 w-16 bg-slate-100 rounded-md"></div></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-4 bg-slate-100 rounded w-32 mb-1.5"></div><div className="h-4 bg-slate-100 rounded w-40"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-5 bg-slate-100 rounded w-20 ml-auto"></div></td>
                           <td className="px-6 py-5 rounded-r-xl border-y border-r border-slate-100"><div className="h-8 bg-slate-100 rounded w-16 mx-auto"></div></td>
                        </tr>
                     ))
                   ) : filteredEquipment.length === 0 ? (
                      <tr><td colSpan="6">
                         <div className="p-16 text-center flex flex-col items-center bg-white rounded-2xl border border-slate-100 shadow-sm mt-2">
                           <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                             <Box size={32} />
                           </div>
                           <h3 className="text-base font-black text-slate-800 mb-1">No equipment found</h3>
                           <p className="text-sm font-medium text-slate-500">There are no SKUs matching your current filters.</p>
                         </div>
                      </td></tr>
                   ) : (
                      filteredEquipment.map(item => (
                         <tr key={item.id} className="bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all group cursor-pointer" onClick={() => { setActiveEquip(item); setIsEquipModalOpen(true); }}>

                           <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-primary-100 transition-colors">
                              <div className="font-black text-slate-800 tracking-tight text-lg mb-0.5 leading-tight">{item.brand}</div>
                              <div className="text-xs text-slate-500 font-bold tracking-widest uppercase">{item.series} Series</div>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors">
                              <div className="flex gap-2 text-[11px] uppercase tracking-widest">
                                 <span className="bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg font-black border border-primary-100 shadow-sm">{item.tons} Ton</span>
                                 <span className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-bold border border-slate-200 shadow-sm">{item.seer} SEER</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors text-[11px] text-slate-500 font-mono font-bold">
                              <div className="mb-1.5 bg-slate-50/80 px-2.5 py-1 rounded-md max-w-[180px] truncate shadow-sm border border-slate-100 flex items-center justify-between" title={`Condenser: ${item.condenser_model}`}>
                                 <span className="opacity-50 text-[9px] mr-2">OUT</span> <span className="truncate">{item.condenser_model || '-'}</span>
                              </div>
                              <div className="bg-slate-50/80 px-2.5 py-1 rounded-md max-w-[180px] truncate shadow-sm border border-slate-100 flex items-center justify-between" title={`Air Handler: ${item.ahu_model}`}>
                                 <span className="opacity-50 text-[9px] mr-2">IN</span> <span className="truncate">{item.ahu_model || '-'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors text-right">
                              <span className="font-mono font-black text-slate-400 text-sm">$</span>
                              <span className="font-black text-slate-700 text-lg">{item.system_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors text-right">
                              <span className="font-black text-white bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] px-4 py-2 rounded-xl inline-block text-base tracking-tight border border-emerald-400 font-mono">
                                 ${item.retail_price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                           </td>
                           <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 group-hover:border-primary-100 transition-colors text-center relative" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-2">
                                 <button className="bg-white border text-danger hover:bg-red-50 border-red-100/50 hover:border-red-200 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold transition-all focus:outline-none focus:ring-2 ring-red-500/20" onClick={() => handleDeleteEquip(item.id)}>Delete</button>
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
            <div className="w-full overflow-x-auto px-4 pb-4">
              <table className="w-full text-left border-separate border-spacing-y-3 whitespace-nowrap">
                <thead>
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                    <th className="px-6 py-2 w-24">SKU</th>
                    <th className="px-6 py-2 w-1/5">Financial Category</th>
                    <th className="px-6 py-2 w-1/4">Service or Material Line Item</th>
                    <th className="px-6 py-2 text-center w-20">Stock</th>
                    <th className="px-6 py-2 text-right w-32">Raw Cost</th>
                    <th className="px-6 py-2 text-right w-32">Target Retail</th>
                    <th className="px-6 py-2 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                   {loading ? (
                     [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="animate-pulse bg-white shadow-sm rounded-xl">
                           <td className="px-6 py-5 rounded-l-xl border-y border-l border-slate-100"><div className="h-6 bg-slate-100 rounded-md w-24"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-5 bg-slate-100 rounded w-48"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-5 bg-slate-100 rounded w-20 mx-auto"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-8 bg-slate-100 rounded-md w-16 mx-auto"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-5 bg-slate-100 rounded w-20 ml-auto"></div></td>
                           <td className="px-6 py-5 border-y border-slate-100"><div className="h-5 bg-slate-100 rounded w-20 ml-auto"></div></td>
                           <td className="px-6 py-5 rounded-r-xl border-y border-r border-slate-100"><div className="h-8 bg-slate-100 rounded w-16 mx-auto"></div></td>
                        </tr>
                     ))
                   ) : filteredLabor.length === 0 ? (
                      <tr><td colSpan="7">
                         <div className="p-16 text-center flex flex-col items-center bg-white rounded-2xl border border-slate-100 shadow-sm mt-2">
                           <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                             <Pen size={32} />
                           </div>
                           <h3 className="text-base font-black text-slate-800 mb-1">No services matched</h3>
                           <p className="text-sm font-medium text-slate-500">There are no labor rates or materials matching your search.</p>
                         </div>
                      </td></tr>
                   ) : (
                      filteredLabor.map(labor => (
                         <tr key={labor.id} className="bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] rounded-2xl hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all group cursor-pointer" onClick={() => { setActiveLabor(labor); setIsLaborModalOpen(true); }}>
                           <td className="px-6 py-5 rounded-l-2xl border-y border-l border-slate-100 group-hover:border-primary-100 transition-colors">
                              <span className="font-mono text-slate-400 font-bold bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-inner">
                                 {labor.sku || '-'}
                              </span>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors">
                              <span className="bg-emerald-50/50 shadow-sm text-emerald-800 text-[10px] font-black px-3 py-1.5 flex items-center w-max rounded-md uppercase tracking-widest border border-emerald-100">
                                 {labor.category}
                              </span>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors">
                              <div className="font-black text-slate-800 text-base tracking-tight leading-loose">
                                 {labor.item_name}
                              </div>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors text-center">
                              <span className={`font-black px-3 py-1.5 rounded-lg text-xs shadow-sm border ${labor.in_stock_quantity > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                 {labor.in_stock_quantity || 0}
                              </span>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors text-right">
                              <span className="font-mono font-black text-slate-400 text-sm">$</span>
                              <span className="font-black text-slate-700 text-lg">
                                 {labor.cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                           </td>
                           <td className="px-6 py-5 border-y border-slate-100 group-hover:border-primary-100 transition-colors text-right">
                              {(() => {
                                  const rawCost = parseFloat(labor.cost || 0);
                                  const taxRate = margins?.sales_tax || 0.07;
                                  const reserve = margins?.service_reserve || 0.05;
                                  const margin = margins?.good_margin || 0.35;
                                  
                                  const isTaxExempt = ['Labor', 'Install', 'Subcontract', 'Permit'].includes(labor.category);
                                  const appliedTax = isTaxExempt ? 0 : taxRate;
                                  const projectedRetail = (rawCost * (1 + appliedTax) * (1 + reserve)) / (1 - margin);

                                  return (
                                      <span className="font-black text-white bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] px-4 py-2 rounded-xl inline-block text-base tracking-tight border border-emerald-400 font-mono">
                                         ${projectedRetail.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </span>
                                  );
                              })()}
                           </td>
                           <td className="px-6 py-5 rounded-r-2xl border-y border-r border-slate-100 group-hover:border-primary-100 transition-colors text-center relative" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center gap-2">
                                 <button className="bg-white border text-danger hover:bg-red-50 border-red-100/50 hover:border-red-200 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold transition-all focus:outline-none focus:ring-2 ring-red-500/20" onClick={() => handleDeleteLabor(labor.id)}>Delete</button>
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
      <Modal isOpen={isLaborModalOpen} onClose={() => setIsLaborModalOpen(false)} title={activeLabor?.id ? "Edit System Logistic / Material" : "Create Technical Add-on Matrix"}>
         <form className="flex flex-col h-full bg-slate-50 rounded-b-xl" onSubmit={handleSaveLabor}>
            <div className="p-6 space-y-6">
               
               {/* Identity Row */}
               <div className="grid grid-cols-2 gap-5">
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">SKU / Code Number</label>
                     <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-slate-800 font-bold focus:ring-2 ring-primary-500 outline-none transition-all shadow-inner" value={activeLabor.sku || ''} onChange={e => setActiveLabor({...activeLabor, sku: e.target.value})} placeholder="e.g. 1007"/>
                  </div>
                  <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">In-Stock Inventory Qty</label>
                     <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-slate-800 font-bold focus:ring-2 ring-primary-500 outline-none transition-all shadow-inner" value={activeLabor.in_stock_quantity || ''} onChange={e => setActiveLabor({...activeLabor, in_stock_quantity: e.target.value})} placeholder="0"/>
                  </div>
               </div>
               
               {/* Metadata Row */}
               <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-5">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Layers size={12}/> Tax Categorization Protocol</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-bold text-sm text-slate-700 focus:ring-2 ring-primary-500 outline-none shadow-sm cursor-pointer" value={activeLabor.category} onChange={e => setActiveLabor({...activeLabor, category: e.target.value})} required>
                         <option value="Labor">Tax Exempt Structural Labor</option>
                         <option value="Install">Tax Exempt Install Components</option>
                         <option value="Subcontract">3rd Party Subcontractor Payout</option>
                         <option value="Permit">City Building Code Permit</option>
                         <option value="Material">Standard Taxable Material Line</option>
                         <option value="Miscellaneous">Unclassified Miscellaneous</option>
                      </select>
                      <p className="text-[9px] text-slate-400 mt-2 font-bold tracking-wide uppercase">Controls exactly how this line item executes inside the Proposal State Sales Tax math engine.</p>
                   </div>
                   
                   <div className="border-t border-slate-100 pt-5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5"><Box size={12}/> Customer/Tech Visible Array Name</label>
                      <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-black text-lg text-slate-800 focus:ring-2 ring-primary-500 outline-none shadow-inner" value={activeLabor.item_name} onChange={e => setActiveLabor({...activeLabor, item_name: e.target.value})} placeholder="e.g. Concrete Slab" required/>
                   </div>
               </div>
               
               {/* Financial Engine Row */}
               <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
                  <div className="bg-slate-50 py-3 px-5 border-b border-slate-100 flex items-center gap-2">
                     <Calculator size={14} className="text-emerald-500" />
                     <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Internal Logistics Financial Engine</h4>
                  </div>
                  
                  <div className="p-5 flex flex-col md:flex-row gap-6 items-center">
                      <div className="flex-1 w-full relative">
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Raw Floor Cost Injection ($)</label>
                         <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xl">$</span>
                            <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-4 font-mono font-black text-2xl text-slate-800 focus:ring-2 ring-emerald-500 outline-none shadow-inner transition-all placeholder:text-slate-300" value={activeLabor.cost} onChange={e => setActiveLabor({...activeLabor, cost: e.target.value})} required placeholder="0.00"/>
                         </div>
                         <p className="text-[9px] text-amber-600/80 mt-2 font-bold tracking-wide uppercase leading-tight">DANGER: Offset to customer total mapped via Targeted Margin rules.</p>
                      </div>
                      
                      <div className="hidden md:flex h-16 w-px bg-slate-200"></div>
                      
                      <div className="flex-1 border border-slate-100 bg-emerald-50/50 rounded-xl p-4 w-full h-full flex flex-col justify-center">
                         {(() => {
                           const rawCost = parseFloat(activeLabor.cost || 0);
                           const taxRate = margins?.sales_tax || 0.07;
                           const reserve = margins?.service_reserve || 0.05;
                           const margin = margins?.good_margin || 0.35;
                           
                           const isTaxExempt = ['Labor', 'Install', 'Subcontract', 'Permit'].includes(activeLabor.category);
                           const appliedTax = isTaxExempt ? 0 : taxRate;
                           const projectedRetail = (rawCost * (1 + appliedTax) * (1 + reserve)) / (1 - margin);
                           
                           return (
                              <div className="text-center">
                                 <label className="text-[9px] font-black text-emerald-600/80 uppercase tracking-widest block mb-1">Live Retail Impact Projection</label>
                                 <div className="text-3xl font-black text-emerald-600 tracking-tight">${projectedRetail.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                                 <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Calculated via System Baseline Margins</div>
                              </div>
                           );
                         })()}
                      </div>
                  </div>
               </div>

            </div>
            
            <div className="bg-white px-6 py-4 border-t border-slate-200 flex justify-end gap-3 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] relative z-10">
               <button type="button" className="btn-secondary font-bold px-6 py-2.5 rounded-lg" onClick={() => setIsLaborModalOpen(false)}>Discard Edits</button>
               <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white shadow-sm font-bold px-8 py-2.5 rounded-lg group flex items-center gap-2 transform transition-all active:scale-95">Deploy to Database <Check size={16} className="opacity-60 group-hover:opacity-100 transition-opacity"/></button>
            </div>
         </form>
      </Modal>

    </div>
  );
}
