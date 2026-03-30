import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, Wind, RefreshCw } from 'lucide-react';

export default function CatalogEditor() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State for new equipment
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEquip, setNewEquip] = useState({ brand: '', series: '', tons: '', seer: '', condenser_model: '', ahu_model: '', system_cost: '', retail_price: '', image_url: '' });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Edit State
  const [editingEquip, setEditingEquip] = useState(null);
  const [margins, setMargins] = useState(null); // Used for calculating formula
  const [formulaStr, setFormulaStr] = useState('(cost + (cost * reserve)) / (1 - margin)');

  useEffect(() => {
    fetchCatalogData();
    fetchMargins();
  }, []);

  const fetchMargins = async () => {
    const { data } = await supabase.from('margin_settings').select('*').eq('id', 1).single();
    if (data) setMargins(data);
  };

  const fetchCatalogData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('equipment_catalog').select('*').order('brand').order('series').order('tons').order('id');
      if (data) setEquipment(data);
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('equipment_catalog').insert([{
      ...newEquip,
      tons: parseFloat(newEquip.tons),
      seer: parseFloat(newEquip.seer),
      system_cost: parseFloat(newEquip.system_cost),
      retail_price: parseFloat(newEquip.retail_price || 0)
    }]);
    
    if (error && error.message.includes('image_url')) {
       alert('To save images, please run this SQL in your Supabase Dashboard: ALTER TABLE equipment_catalog ADD COLUMN image_url text;');
    } else if (!error) {
      setShowAddForm(false);
      setNewEquip({ brand: 'Trane', series: '', tons: '', seer: '', condenser_model: '', ahu_model: '', system_cost: '', retail_price: '', image_url: '' });
      fetchCatalogData();
    }
  };

  const handleUpdateEquipment = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('equipment_catalog').update({
      brand: editingEquip.brand,
      series: editingEquip.series,
      tons: parseFloat(editingEquip.tons),
      seer: parseFloat(editingEquip.seer),
      condenser_model: editingEquip.condenser_model,
      ahu_model: editingEquip.ahu_model,
      system_cost: parseFloat(editingEquip.system_cost),
      retail_price: parseFloat(editingEquip.retail_price || 0),
      image_url: editingEquip.image_url
    }).eq('id', editingEquip.id);

    if (error && error.message.includes('image_url')) {
       alert('To save images, please run this SQL in your Supabase Dashboard:\n\nALTER TABLE equipment_catalog ADD COLUMN image_url text;');
    } else if (!error) {
      setEditingEquip(null);
      fetchCatalogData();
    } else {
      alert(error.message);
    }
  };

  const applyPricingFormula = () => {
     if (!editingEquip.system_cost || !margins) return;
     try {
       const cost = parseFloat(editingEquip.system_cost);
       const margin = margins.gross_margin;
       const reserve = margins.service_reserve;
       // Execute arbitrary formula string securely
       const evaluateMath = new Function('cost', 'margin', 'reserve', `return ${formulaStr}`);
       const finalPrice = evaluateMath(cost, margin, reserve);
       
       if (isNaN(finalPrice)) throw new Error('Mathematical evaluation failed');
       setEditingEquip({...editingEquip, retail_price: finalPrice.toFixed(2)});
     } catch (error) {
       alert('Formula Error: Ensure your math format is correct (e.g., using variables like cost, margin, and standard JS operators).');
     }
  };

  const deleteEquipment = async (id) => {
    if (window.confirm("Delete this catalog item?")) {
      await supabase.from('equipment_catalog').delete().eq('id', id);
      fetchCatalogData();
    }
  };

  const handleImageUpload = async (e, setTargetState) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage bucket 'catalog-images'
      const { error: uploadError } = await supabase.storage
        .from('catalog-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
        
      if (uploadError) throw uploadError;
      
      // Get the persistent public URL
      const { data: { publicUrl } } = supabase.storage
        .from('catalog-images')
        .getPublicUrl(fileName);
        
      setTargetState(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please ensure you have created a PUBLIC storage bucket named "catalog-images" in your Supabase dashboard.\n\nError: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center items-center h-full"><span className="text-slate-400 flex items-center gap-2"><RefreshCw className="animate-spin"/> Loading Pilar Catalog System...</span></div>;

  // Group by Brand -> Series
  const groupedEquipment = equipment.reduce((acc, curr) => {
    const brand = curr.brand || 'Unknown Brand';
    if (!acc[brand]) acc[brand] = {};
    const series = curr.series || 'Standard';
    if (!acc[brand][series]) acc[brand][series] = [];
    acc[brand][series].push(curr);
    return acc;
  }, {});

  const uniqueBrands = [...new Set(equipment.map(e => e.brand).filter(Boolean))];

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-8 lg:p-12 font-sans fade-in">
      {/* Magazine Header Style */}
      <header className="mb-12 flex justify-between items-end border-b-2 border-slate-200 pb-6">
        <div>
          <h1 className="text-5xl font-light text-slate-800 tracking-tight mb-2">Equipment <span className="font-bold text-[#2A9D8F]">Collection</span></h1>
          <p className="text-slate-500 max-w-xl text-sm leading-relaxed">
            The master product catalog containing {equipment.length} verified SKUs. Select an item below to view specifications, system costs, or to manage active inventory.
          </p>
        </div>
        <button 
          className="bg-[#2A9D8F] hover:bg-[#21867a] text-white px-5 py-2.5 rounded-sm shadow-md transition-colors flex items-center gap-2 text-sm font-bold tracking-wide"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={18} /> New Product
        </button>
      </header>

      {showAddForm && (
        <div className="bg-white p-6 shadow-md border-l-4 border-[#2A9D8F] mb-12 max-w-3xl">
          <h2 className="font-bold text-lg mb-4 text-slate-800">Add New Product</h2>
          <form className="grid grid-cols-4 gap-4" onSubmit={handleAddEquipment}>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Brand</label>
              <input 
                 list="brand-options"
                 className="border border-slate-200 rounded p-2 w-full text-sm" 
                 value={newEquip.brand} 
                 onChange={e => setNewEquip({...newEquip, brand: e.target.value})} 
                 placeholder="Select or type new..."
                 required
              />
              <datalist id="brand-options">
                {uniqueBrands.map(b => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Series</label>
              <input placeholder="e.g. XL19i" className="border border-slate-200 rounded p-2 w-full text-sm" value={newEquip.series} onChange={e => setNewEquip({...newEquip, series: e.target.value})} required/>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 block mb-1">Tons</label>
               <input placeholder="Tons" type="number" step="0.5" className="border border-slate-200 rounded p-2 w-full text-sm" value={newEquip.tons} onChange={e => setNewEquip({...newEquip, tons: e.target.value})} required/>
            </div>
            <div>
               <label className="text-xs font-bold text-slate-500 block mb-1">SEER</label>
               <input placeholder="SEER" type="number" step="0.5" className="border border-slate-200 rounded p-2 w-full text-sm" value={newEquip.seer} onChange={e => setNewEquip({...newEquip, seer: e.target.value})} required/>
            </div>
            
            <div className="col-span-2">
               <label className="text-xs font-bold text-slate-500 block mb-1">Condenser Model</label>
               <input placeholder="Condenser Code" className="border border-slate-200 rounded p-2 w-full font-mono text-sm" value={newEquip.condenser_model} onChange={e => setNewEquip({...newEquip, condenser_model: e.target.value})} />
            </div>
            <div className="col-span-2">
               <label className="text-xs font-bold text-slate-500 block mb-1">Air Handler Model</label>
               <input placeholder="AHU Code" className="border border-slate-200 rounded p-2 w-full font-mono text-sm" value={newEquip.ahu_model} onChange={e => setNewEquip({...newEquip, ahu_model: e.target.value})} />
            </div>

            <div className="col-span-4 border border-slate-200 rounded p-3 bg-slate-50">
               <label className="text-xs font-bold text-slate-500 block mb-2 uppercase tracking-wider">Device Image (Optional)</label>
               <div className="flex items-center gap-4">
                 <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewEquip)} disabled={uploadingImage} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#2A9D8F] file:text-white hover:file:bg-[#21867a] cursor-pointer" />
                 {uploadingImage && <span className="text-xs text-[#2A9D8F] font-bold animate-pulse">Uploading to Supabase...</span>}
                 {newEquip.image_url && !uploadingImage && <span className="text-xs font-bold text-success-600">✓ Image attached securely.</span>}
               </div>
            </div>
            
            <div className="col-span-4 flex items-center justify-between mt-4 bg-slate-50 p-4 border border-slate-100">
               <div className="flex gap-4">
                 <div>
                   <label className="text-xs font-bold text-slate-400 block mb-1">Raw Cost</label>
                   <input placeholder="0.00" type="number" step="0.01" className="bg-white border text-danger-600 border-slate-200 p-2 w-32 font-bold shadow-sm" value={newEquip.system_cost} onChange={e => setNewEquip({...newEquip, system_cost: e.target.value})} required/>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-400 block mb-1">Retail Price</label>
                   <input placeholder="0.00" type="number" step="0.01" className="bg-white border text-success-600 border-slate-200 p-2 w-32 font-bold shadow-sm" value={newEquip.retail_price} onChange={e => setNewEquip({...newEquip, retail_price: e.target.value})} />
                 </div>
               </div>
               <div className="flex gap-3 items-end">
                 <button type="button" className="text-slate-500 hover:text-slate-700 text-sm font-bold px-4" onClick={() => setShowAddForm(false)}>Cancel</button>
                 <button type="submit" className="bg-[#2A9D8F] text-white px-6 py-2 rounded-sm font-bold shadow-md hover:bg-[#21867a]">Save Item</button>
               </div>
            </div>
          </form>
        </div>
      )}

      {/* Catalog Rendered as Magazine Groupings */}
      {Object.entries(groupedEquipment).map(([brand, seriesGroups]) => (
        <div key={brand} className="mb-16">
           <h2 className="text-3xl font-light text-slate-800 tracking-wide mb-8 border-l-4 pl-4 border-[#2A9D8F] bg-white bg-opacity-40 py-2 inline-block shadow-sm">
             {brand.toUpperCase()} <span className="font-bold">INVENTORY</span>
           </h2>

           {Object.entries(seriesGroups).map(([series, items]) => (
             <div key={series} className="mb-12">
               <h3 className="text-[#2A9D8F] font-semibold tracking-wide text-sm uppercase mb-4 pl-1">{series} Series Collection</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {items.map(item => (
                   <div key={item.id} className="bg-white shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden flex flex-col border border-slate-100 relative">
                     
                     {/* Overlay Edit/Delete Toolbar on Hover */}
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <button 
                          className="bg-white p-1.5 rounded-full text-slate-400 hover:text-[#2A9D8F] shadow-sm transform hover:scale-110 transition-transform"
                          onClick={() => setEditingEquip(item)}
                        >
                          <Edit2 size={14}/>
                        </button>
                        <button 
                          className="bg-white p-1.5 rounded-full text-slate-400 hover:text-red-500 shadow-sm transform hover:scale-110 transition-transform"
                          onClick={() => deleteEquipment(item.id)}
                        >
                          <Trash2 size={14}/>
                        </button>
                     </div>

                     {/* Image Placeholder Area (Grey box matching magazine style) */}
                     <div className="bg-[#F8F9FA] h-48 w-full flex items-center justify-center border-b border-slate-100 relative overflow-hidden group-hover:bg-slate-50 transition-colors">
                       {/* Floating Spec Badge */}
                       <div className="absolute top-4 left-4 flex gap-2 z-20">
                         <span className="bg-white text-slate-700 text-xs font-black px-2 py-1 shadow-sm border border-slate-100">
                           {item.tons} TON
                         </span>
                         <span className="bg-slate-800 text-white text-xs font-bold px-2 py-1 shadow-sm">
                           {item.seer} SEER
                         </span>
                       </div>
                       
                       {/* Central Graphic */}
                       {item.image_url ? (
                         <div className="w-full h-full flex items-center justify-center p-4">
                           <img src={item.image_url} alt="Equipment" className="max-w-full max-h-full object-contain mix-blend-multiply transform group-hover:scale-105 transition-transform duration-500" />
                         </div>
                       ) : (
                         <>
                           <Wind size={80} className="text-slate-200 absolute transform -rotate-12 opacity-50 scale-150" />
                           <div className="z-10 bg-white p-4 rounded-full shadow-sm border border-slate-100 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
                             <img src={`https://ui-avatars.com/api/?name=${item.brand}+${item.series}&background=random&color=fff`} className="w-12 h-12 rounded-full absolute opacity-20" alt="bg"/>
                             <Wind size={32} className={brand.toLowerCase() === 'trane' ? 'text-blue-500' : 'text-red-500'} />
                           </div>
                         </>
                       )}
                     </div>
                     
                     {/* Product Details Area */}
                     <div className="p-5 flex-1 flex flex-col relative grid-dots-bg">
                       <h4 className="text-lg font-bold text-slate-800 mb-1 tracking-tight truncate" title={`${brand} ${series} System`}>
                         {brand} {series} HVAC
                       </h4>
                       
                       {/* Expandable Description Area */}
                       <div className="text-xs text-slate-500 mb-4 space-y-2 flex-1">
                         <p className="border-l-2 border-slate-200 pl-2">
                           <span className="font-semibold text-slate-600 block">Condenser unit</span>
                           <span className="font-mono text-[11px] truncate block">{item.condenser_model || 'Standard Mount'}</span>
                         </p>
                         <p className="border-l-2 border-slate-200 pl-2">
                           <span className="font-semibold text-slate-600 block">Air Handler</span>
                           <span className="font-mono text-[11px] truncate block">{item.ahu_model || 'Standard Coil'}</span>
                         </p>
                       </div>
                       
                       <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                         <div className="flex flex-col">
                           <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Raw Cost</span>
                           <span className="font-bold text-slate-700">${item.system_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                         </div>
                         
                         {/* Magazine "Buy Now" style Call-to-Action */}
                         <div className="bg-[#59B2A8] text-white px-3 py-1.5 font-bold text-sm shadow-sm flex items-center gap-1 cursor-default">
                           ${item.retail_price?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                         </div>
                       </div>
                     </div>

                   </div>
                 ))}
               </div>

             </div>
           ))}
        </div>
      ))}

      {/* Edit Product Modal */}
      {editingEquip && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden fade-in border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xl tracking-tight">Edit Product Specifications</h3>
              <button className="text-slate-400 hover:text-slate-700 font-bold text-xl" onClick={() => setEditingEquip(null)}>&times;</button>
            </div>
            
            <form onSubmit={handleUpdateEquipment} className="p-6">
              <div className="grid grid-cols-4 gap-5 mb-6">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Brand</label>
                  <input className="input-field border rounded p-2.5 w-full font-semibold" value={editingEquip.brand} onChange={e => setEditingEquip({...editingEquip, brand: e.target.value})} required/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Series</label>
                  <input className="input-field border rounded p-2.5 w-full font-semibold" value={editingEquip.series} onChange={e => setEditingEquip({...editingEquip, series: e.target.value})} required/>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tons</label>
                  <input type="number" step="0.5" className="input-field border rounded p-2.5 w-full font-mono" value={editingEquip.tons} onChange={e => setEditingEquip({...editingEquip, tons: e.target.value})} required/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">SEER</label>
                  <input type="number" step="0.5" className="input-field border rounded p-2.5 w-full font-mono" value={editingEquip.seer} onChange={e => setEditingEquip({...editingEquip, seer: e.target.value})} required/>
                </div>
                
                <div className="col-span-2 border border-slate-200 rounded p-2.5 bg-white">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Upload Device Photo</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setEditingEquip)} disabled={uploadingImage} className="text-xs w-full file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer" />
                  {uploadingImage && <span className="text-[10px] text-[#2A9D8F] font-bold animate-pulse block mt-1">Uploading via Supabase Storage...</span>}
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Or Paste Image URL</label>
                  <input placeholder="https://example.com/ac.png" className="input-field border rounded p-2.5 w-full text-sm font-mono text-primary-600" value={editingEquip.image_url || ''} onChange={e => setEditingEquip({...editingEquip, image_url: e.target.value})} />
                </div>
                
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Condenser Model</label>
                  <input className="input-field border rounded p-2.5 w-full font-mono text-sm" value={editingEquip.condenser_model} onChange={e => setEditingEquip({...editingEquip, condenser_model: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">AHU Model</label>
                  <input className="input-field border rounded p-2.5 w-full font-mono text-sm" value={editingEquip.ahu_model} onChange={e => setEditingEquip({...editingEquip, ahu_model: e.target.value})} />
                </div>
              </div>

              {/* Pricing Formula Section */}
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 shadow-inner">
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center justify-between">
                  Financials
                  <button type="button" onClick={applyPricingFormula} className="text-xs font-bold bg-[#2A9D8F] text-white px-3 py-1.5 rounded hover:bg-[#21867a] shadow-sm transform active:scale-95 transition-all">
                    Execute Math Formula
                  </button>
                </h4>
                <div className="flex gap-6 items-end mb-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 block mb-1">Raw Cost ($)</label>
                    <input type="number" step="0.01" className="input-field border border-slate-300 rounded p-3 w-full font-black text-danger-600 text-lg shadow-sm" value={editingEquip.system_cost} onChange={e => setEditingEquip({...editingEquip, system_cost: e.target.value})} required/>
                  </div>
                  <div className="flex items-center text-slate-400 pb-3 font-black text-lg">➔</div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-success-700 block mb-1">Retail Price ($)</label>
                    <input type="number" step="0.01" className="input-field border border-success-300 bg-success-50 rounded p-3 w-full font-black text-success-700 text-lg shadow-sm" value={editingEquip.retail_price} onChange={e => setEditingEquip({...editingEquip, retail_price: e.target.value})} required/>
                  </div>
                </div>
                
                {/* Advanced Formula Editor */}
                <div className="bg-white border text-xs border-slate-200 rounded p-3 shadow-sm relative">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Editable Conversion Formula</label>
                  <input 
                     type="text" 
                     className="w-full font-mono text-primary-600 bg-transparent outline-none font-bold"
                     value={formulaStr}
                     onChange={e => setFormulaStr(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-semibold border-t border-slate-100 pt-2">
                    * Available variables: <code className="bg-slate-100 px-1 rounded text-pink-500">cost</code>, <code className="bg-slate-100 px-1 rounded text-pink-500">margin</code> ({margins?.gross_margin * 100}%), <code className="bg-slate-100 px-1 rounded text-pink-500">reserve</code> ({margins?.service_reserve * 100}%). You can use standard Excel math like <code className="bg-slate-100 px-1 rounded">cost * 2.5</code>.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" className="px-5 py-2 font-bold text-slate-500 hover:text-slate-800" onClick={() => setEditingEquip(null)}>Cancel</button>
                <button type="submit" className="bg-slate-800 text-white font-bold px-8 py-2 rounded shadow-md hover:bg-slate-900 transform active:scale-95 transition-all w-48">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx="true">{`
        .grid-dots-bg {
          background-image: radial-gradient(var(--color-slate-200) 1px, transparent 1px);
          background-size: 16px 16px;
          background-position: 0 0, 8px 8px;
        }
      `}</style>
    </div>
  );
}
