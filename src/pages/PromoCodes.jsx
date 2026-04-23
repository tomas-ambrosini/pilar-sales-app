import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Save, X, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

export default function PromoCodes() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_percent: '',
    is_active: true,
    starts_at: '',
    expires_at: '',
    usage_limit: ''
  });

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setPromos(data || []);
    } catch (error) {
      toast.error('Failed to load promo codes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleOpenNew = () => {
    setEditingPromo(null);
    setFormData({
      code: '',
      description: '',
      discount_percent: '',
      is_active: true,
      starts_at: '',
      expires_at: '',
      usage_limit: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description || '',
      discount_percent: promo.discount_percent,
      is_active: promo.is_active,
      starts_at: promo.starts_at ? new Date(promo.starts_at).toISOString().slice(0, 16) : '',
      expires_at: promo.expires_at ? new Date(promo.expires_at).toISOString().slice(0, 16) : '',
      usage_limit: promo.usage_limit || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Construct payload
    const payload = {
      code: formData.code.trim().toUpperCase(),
      description: formData.description || null,
      discount_percent: parseFloat(formData.discount_percent),
      is_active: formData.is_active,
      starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit, 10) : null
    };

    if (payload.discount_percent <= 0 || payload.discount_percent > 100) {
      toast.error('Discount percent must be between 1 and 100');
      return;
    }

    try {
      if (editingPromo) {
        const { error } = await supabase
          .from('promo_codes')
          .update(payload)
          .eq('id', editingPromo.id);
        if (error) throw error;
        toast.success(`Updated ${payload.code}`);
      } else {
        const { error } = await supabase
          .from('promo_codes')
          .insert([payload]);
        if (error) {
          if (error.code === '23505') {
            throw new Error('Promo code already exists');
          }
          throw error;
        }
        toast.success(`Created ${payload.code}`);
      }
      setIsModalOpen(false);
      fetchPromos();
    } catch (error) {
      toast.error(error.message || 'Error saving promo code');
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promo.is_active })
        .eq('id', promo.id);
      if (error) throw error;
      toast.success(`${promo.code} is now ${!promo.is_active ? 'Active' : 'Inactive'}`);
      fetchPromos();
    } catch (error) {
      toast.error('Failed to toggle status');
    }
  };

  const filteredPromos = promos.filter(p => 
    p.code.toLowerCase().includes(search.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-1">
            <Megaphone className="text-primary-600" size={28} />
            Promo Codes
          </h1>
          <p className="text-slate-500 font-medium">Govern discount campaigns and monitor usage across proposals.</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700"
        >
          <Plus size={18} /> Add New Code
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
             <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Search by code or description..."
                 className="input-field pl-10 w-full bg-white transition-all focus:bg-slate-50 focus:border-primary-400"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
               />
             </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">Code</th>
                  <th className="p-4 font-bold text-right">Discount</th>
                  <th className="p-4 font-bold text-center">Status</th>
                  <th className="p-4 font-bold">Timing</th>
                  <th className="p-4 font-bold text-center">Usage</th>
                  <th className="p-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                   [1, 2, 3].map(i => (
                     <tr key={i} className="animate-pulse">
                       <td className="p-4"><div className="h-5 bg-slate-200 rounded w-24 mb-1"></div><div className="h-3 bg-slate-200 rounded w-32"></div></td>
                       <td className="p-4"><div className="h-5 bg-slate-200 rounded w-16 ml-auto"></div></td>
                       <td className="p-4"><div className="h-5 bg-slate-200 rounded-full w-20 mx-auto"></div></td>
                       <td className="p-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                       <td className="p-4"><div className="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
                       <td className="p-4"><div className="h-8 bg-slate-200 rounded w-20 ml-auto"></div></td>
                     </tr>
                   ))
                ) : filteredPromos.length === 0 ? (
                  <tr><td colSpan="6">
                     <div className="text-center py-16 flex flex-col items-center">
                       <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                         <Megaphone size={32} />
                       </div>
                       <h3 className="text-sm font-bold text-slate-900 mb-1">No promo codes</h3>
                       <p className="text-xs font-medium text-slate-500">There are no discount campaigns matching your search.</p>
                     </div>
                  </td></tr>
                ) : (
                  filteredPromos.map(promo => {
                    const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                    const isExhausted = promo.usage_limit && promo.times_used >= promo.usage_limit;
                    const canUse = promo.is_active && !isExpired && !isExhausted;
                    
                    return (
                      <tr key={promo.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-mono font-black text-slate-800 text-base">{promo.code}</div>
                          {promo.description && <div className="text-xs text-slate-500 mt-1">{promo.description}</div>}
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-black text-emerald-600 text-lg">{promo.discount_percent}%</div>
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleToggleActive(promo)} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors ${canUse ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                            {promo.is_active ? <CheckCircle size={12}/> : <XCircle size={12}/>}
                            {promo.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="text-xs font-semibold text-slate-600">
                             {promo.starts_at && <div>Starts: {new Date(promo.starts_at).toLocaleDateString()}</div>}
                             {promo.expires_at ? (
                               <div className={isExpired ? 'text-red-500' : ''}>Ends: {new Date(promo.expires_at).toLocaleDateString()}</div>
                             ) : (
                               <div className="text-slate-400">No Expiration</div>
                             )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className={`text-sm font-bold ${isExhausted ? 'text-red-500' : 'text-slate-700'}`}>
                            {promo.times_used} / {promo.usage_limit || '∞'}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleOpenEdit(promo)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors" title="Edit Promo"><Edit2 size={16}/></button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      <Modal isOpen={isModalOpen} title={editingPromo ? 'Edit Promo Code' : 'Create Promo Code'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="p-0">
            <div className="p-6 space-y-6">
              {/* Top Row: Code & Percentage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Promo Code *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Megaphone className="text-primary-400" size={16} />
                    </div>
                    <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 font-mono font-black text-slate-800 text-lg uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-300 placeholder:font-normal" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="SUMMER2026" />
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Discount % *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <span className="text-emerald-500 font-bold text-lg">%</span>
                    </div>
                    <input required type="number" step="0.01" min="0.01" max="100" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 font-black text-emerald-600 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-300 placeholder:font-normal" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} placeholder="15.00" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description (Internal)</label>
                <textarea rows="2" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Note: Only applies to Q4 pipeline deals..."></textarea>
              </div>

              {/* Date Ranges */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 border-dashed">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <CheckCircle className="text-slate-400" size={14}/> Validity Window
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Starts At</label>
                    <input type="datetime-local" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" value={formData.starts_at} onChange={e => setFormData({...formData, starts_at: e.target.value})} />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expires At</label>
                    <input type="datetime-local" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Limits and Status */}
              <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Usage Limit</label>
                  <input type="number" min="1" step="1" className="w-full max-w-[200px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400 placeholder:font-normal" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} placeholder="∞ Unlimited" />
                </div>
                
                <div className="flex-1 flex justify-end">
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input type="checkbox" className="sr-only peer" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                    <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 group-hover:shadow-md"></div>
                    <span className="ml-3 text-sm font-bold text-slate-700 uppercase tracking-wide">Active</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all">Cancel</button>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-8 py-2.5 rounded-xl shadow-md shadow-primary-600/20 transition-all flex items-center gap-2 transform active:scale-95">
                <Save size={18}/>
                {editingPromo ? 'Save Changes' : 'Create Promo Code'}
              </button>
            </div>
          </form>
      </Modal>

    </div>
  );
}
