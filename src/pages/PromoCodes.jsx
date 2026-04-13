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
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-4 sm:px-8 pt-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Megaphone className="text-primary-600" size={32} />
            Promo Codes
          </h1>
          <p className="text-slate-500 font-medium mt-1">Govern discount campaigns and monitor usage across proposals.</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-95"
        >
          <Plus size={18} /> Add New Code
        </button>
      </div>

      <div className="px-4 sm:px-8 pb-12 overflow-x-hidden w-full">
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
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic font-medium">Loading promo codes...</td></tr>
                ) : filteredPromos.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic font-medium">No promo codes found.</td></tr>
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
      </div>

      <Modal isOpen={isModalOpen} title={editingPromo ? 'Edit Promo Code' : 'Create Promo Code'} onClose={() => setIsModalOpen(false)}>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Promo Code String *</label>
                <input required type="text" className="input-field w-full font-mono font-bold uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="SUMMER10" />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Discount % *</label>
                <input required type="number" step="0.01" min="0.01" max="100" className="input-field w-full font-bold text-emerald-600" value={formData.discount_percent} onChange={e => setFormData({...formData, discount_percent: e.target.value})} placeholder="10.00" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Description (Internal)</label>
              <input type="text" className="input-field w-full" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Optional notes about this promo..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Starts At (Optional)</label>
                <input type="datetime-local" className="input-field w-full" value={formData.starts_at} onChange={e => setFormData({...formData, starts_at: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Expires At (Optional)</label>
                <input type="datetime-local" className="input-field w-full" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="col-span-1">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Usage Limit (Optional)</label>
                <input type="number" min="1" step="1" className="input-field w-full" value={formData.usage_limit} onChange={e => setFormData({...formData, usage_limit: e.target.value})} placeholder="Unlimited" />
              </div>
              <div className="col-span-1 flex items-center h-[42px]">
                <label className="flex items-center gap-2 cursor-pointer ml-2">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 rounded cursor-pointer" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                  <span className="text-sm font-bold text-slate-700">Code is Active</span>
                </label>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2">
                <Save size={18}/>
                {editingPromo ? 'Save Changes' : 'Create Promo Code'}
              </button>
            </div>
          </form>
      </Modal>

    </div>
  );
}
