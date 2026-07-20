import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Users, Truck, Plus, Check, Search, MapPin, Edit2, X, Trash2, Save, Building2, UserCircle, Mail, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPhoneNumber } from '../utils/formatters';

import SubcontractorJobHistory from '../components/SubcontractorJobHistory';
import OpportunityOverviewModal from '../components/OpportunityOverviewModal';
import ServiceCallModal from '../components/ServiceCallModal';

export default function Subcontractors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subcontractors, setSubcontractors] = useState([]);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showTechModal, setShowTechModal] = useState(null); // holds subcontractor ID
  const [editingSub, setEditingSub] = useState(null); // holds subcontractor object
  const [activeTab, setActiveTab] = useState('profile');
  
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [selectedServiceCall, setSelectedServiceCall] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: subsData, error: subsError } = await supabase
        .from('user_profiles')
        .select('*')
        .or('role.eq.SUBCONTRACTOR,department.eq.SUBCONTRACTOR')
        .order('full_name', { ascending: true });
        
      if (subsError) throw subsError;
      setSubcontractors(subsData || []);

      const { data: crewsData, error: crewsError } = await supabase
        .from('crews')
        .select('*')
        .not('subcontractor_id', 'is', null);
      if (crewsError) throw crewsError;
      setCrews(crewsData || []);
    } catch (err) {
      toast.error('Failed to load subcontractors.');
    } finally {
      setLoading(false);
    }
  };

  const handleInspectJob = async (job, type) => {
      try {
          toast.loading('Loading details...', { id: 'inspect_job' });
          if (type === 'SERVICE') {
              const { data, error } = await supabase.from('service_calls')
                  .select('*, households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )')
                  .eq('id', job.id).single();
              if (error) throw error;
              toast.dismiss('inspect_job');
              setSelectedServiceCall(data);
          } else {
              const { data, error } = await supabase.from('opportunities')
                  .select('*, households ( household_name, contacts ( primary_phone ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )')
                  .eq('id', job.id).single();
              if (error) throw error;
              toast.dismiss('inspect_job');
              setSelectedOpp(data);
          }
      } catch (err) {
          console.error("Failed to fetch full job data:", err);
          toast.error('Failed to load job details', { id: 'inspect_job' });
      }
  };

  const handleUpdateSub = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const updates = {
          subcontractor_company: fd.get('company'),
          full_name: fd.get('name'),
          phone: fd.get('phone')
      };

      try {
          toast.loading('Saving details...', { id: 'save-sub' });
          const { data, error } = await supabase.functions.invoke('admin-action', {
              body: { action: 'updateUser', payload: { targetUserId: editingSub.id, ...updates } }
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          
          setSubcontractors(subs => subs.map(s => s.id === editingSub.id ? { ...s, ...updates } : s));
          setEditingSub(prev => ({ ...prev, ...updates }));
          toast.success('Details updated!', { id: 'save-sub' });
      } catch (err) {
          toast.error(err.message || 'Error saving details', { id: 'save-sub' });
      }
  };

  const handleAddTech = async (e, subId) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const techName = fd.get('tech_name');
    const colorCode = fd.get('color_code') || '#64748b';

    try {
      toast.loading('Adding tech...', { id: 'add-tech' });
      const { data, error } = await supabase.from('crews').insert({
        crew_name: techName,
        subcontractor_id: subId,
        color_code: colorCode,
        is_active: true
      }).select().single();

      if (error) throw error;
      setCrews([...crews, data]);
      toast.success('Tech added to dispatch hub!', { id: 'add-tech' });
      setShowTechModal(null);
    } catch (err) {
      toast.error(err.message || 'Error adding tech', { id: 'add-tech' });
    }
  };

  const handleEditTech = async (e, crew) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const techName = fd.get('tech_name');
    const colorCode = fd.get('color_code') || '#64748b';

    try {
      toast.loading('Saving lane...', { id: 'edit-tech' });
      const { data, error } = await supabase.functions.invoke('admin-action', {
          body: { action: 'updateCrew', payload: { targetCrewId: crew.id, crew_name: techName, color_code: colorCode } }
      });

      if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed to update crew');
      setCrews(crews.map(c => c.id === crew.id ? { ...c, crew_name: techName, color_code: colorCode } : c));
      toast.success('Dispatch lane updated!', { id: 'edit-tech' });
      setShowTechModal(null);
    } catch (err) {
      toast.error(err.message || 'Error updating lane', { id: 'edit-tech' });
    }
  };

  const toggleTechStatus = async (crewId, currentStatus) => {
      try {
          const { data, error } = await supabase.functions.invoke('admin-action', {
              body: { action: 'updateCrew', payload: { targetCrewId: crewId, is_active: !currentStatus } }
          });
          if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed to update tech status.');
          setCrews(crews.map(c => c.id === crewId ? { ...c, is_active: !currentStatus } : c));
          toast.success(currentStatus ? 'Tech deactivated.' : 'Tech activated.');
      } catch (err) {
          toast.error("Failed to update tech status.");
      }
  };

  const handleDeleteTech = async (crewId) => {
      if (!window.confirm("Are you sure you want to delete this dispatch lane? This action cannot be undone.")) return;
      try {
          toast.loading('Deleting lane...', { id: 'delete-tech' });
          const { data, error } = await supabase.functions.invoke('admin-action', {
              body: { action: 'deleteCrew', payload: { targetCrewId: crewId } }
          });
          if (error || data?.error) throw new Error(error?.message || data?.error || 'Failed to delete lane.');
          setCrews(crews.filter(c => c.id !== crewId));
          toast.success('Dispatch lane deleted!', { id: 'delete-tech' });
      } catch (err) {
          toast.error(err.message || 'Error deleting lane', { id: 'delete-tech' });
      }
  };

  const filteredSubs = subcontractors.filter(s => {
      const q = searchTerm.toLowerCase();
      return (s.full_name?.toLowerCase().includes(q) || s.subcontractor_company?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  });

  return (
    <div className="p-6 space-y-6 relative h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-5">
           <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center border border-primary-200/50 shadow-inner shrink-0">
             <Building2 className="text-primary-600 drop-shadow-sm" size={28} />
           </div>
           <div>
             <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Subcontractors Directory</h1>
             <p className="text-sm text-slate-500 font-semibold">Click on a company to edit details and manage dispatchable technicians.</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-400 transition-all font-semibold placeholder-slate-400 shadow-sm" 
                  placeholder="Search by company or name..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

         <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
            {loading ? (
                <div className="text-center text-slate-400 py-10 font-bold">Loading subcontractors...</div>
            ) : filteredSubs.length === 0 ? (
                <div className="text-center text-slate-400 py-10 font-bold">No subcontractors found. Go to Account Management to create one.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSubs.map(sub => {
                        const subCrews = crews.filter(c => c.subcontractor_id === sub.id);
                        const activeCrews = subCrews.filter(c => c.is_active).length;
                        return (
                            <div key={sub.id} onClick={() => setEditingSub(sub)} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary-200 transition-all cursor-pointer flex flex-col group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="bg-primary-50 text-primary-600 p-2 rounded-full">
                                        <Edit2 size={14} />
                                    </div>
                                </div>
                                <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-50">
                                    <div className="pr-10">
                                        <h3 className="text-lg font-black text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-1">{sub.subcontractor_company || 'Unnamed Company'}</h3>
                                        <p className="text-sm font-semibold text-slate-500 flex items-center gap-2 mt-1.5 truncate">
                                            <UserCircle size={14} className="text-slate-400"/> {sub.full_name}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col justify-end">
                                    <div className="flex items-center gap-2">
                                        <Truck size={16} className={activeCrews > 0 ? "text-primary-500" : "text-slate-400"} />
                                        <span className="text-sm font-bold text-slate-600">
                                            {subCrews.length === 0 ? "No dispatch lanes" : `${activeCrews} active dispatch lane${activeCrews !== 1 ? 's' : ''}`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
         </div>
      </div>

      {/* Editing Drawer / Modal */}
      {editingSub && createPortal(
         <div className="fixed inset-0 z-[100] flex justify-center items-center p-6 bg-slate-900/20 backdrop-blur-sm transition-all">
            <div className="absolute inset-0" onClick={() => setEditingSub(null)}></div>
            <div className="relative w-full max-w-4xl max-h-full rounded-2xl bg-white shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-white shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingSub.subcontractor_company || 'Subcontractor Details'}</h2>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            {editingSub.id.split('-')[0]}
                        </span>
                    </div>
                    <button onClick={() => setEditingSub(null)} className="p-2 text-slate-400 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-slate-200 shadow-sm">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex px-8 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0 justify-start">
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => setActiveTab('profile')} 
                            className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white text-primary-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border border-transparent'}`}
                        >
                            Profile & Lanes
                        </button>
                        <button 
                            onClick={() => setActiveTab('history')} 
                            className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all ${activeTab === 'history' ? 'bg-white text-primary-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border border-transparent'}`}
                        >
                            Job History
                        </button>
                        <button 
                            onClick={() => setActiveTab('timesheet')} 
                            className={`px-5 py-2.5 text-sm font-black rounded-xl transition-all ${activeTab === 'timesheet' ? 'bg-white text-primary-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 border border-transparent'}`}
                        >
                            Timesheet
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/30">
                    {activeTab === 'timesheet' ? (
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={14} /> Clock In/Out History
                            </h3>
                            {(!editingSub.metadata?.time_logs || editingSub.metadata.time_logs.length === 0) ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <Clock size={32} className="mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm font-bold text-slate-500">No time logs available.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
                                    {[...(editingSub.metadata.time_logs)].reverse().map((log, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-slate-100 bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${log.action === 'Clocked In' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                                                <span className="font-bold text-slate-700 text-sm">{log.action}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'profile' ? (
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                            {/* Basic Info Form */}
                            <form id="edit-sub-form" onSubmit={handleUpdateSub} className="flex flex-col h-fit">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Building2 size={14} /> Profile Information
                                </h3>
                                
                                <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Company Name</label>
                                        <input type="text" name="company" defaultValue={editingSub.subcontractor_company} className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 focus:bg-white hover:border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm outline-none" required />
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Primary Contact</label>
                                        <input type="text" name="name" defaultValue={editingSub.full_name} className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 focus:bg-white hover:border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm outline-none" required />
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Phone Number</label>
                                        <input type="tel" name="phone" defaultValue={editingSub.phone} onChange={(e) => e.target.value = formatPhoneNumber(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 focus:bg-white hover:border-slate-300 p-2.5 rounded-xl text-sm font-bold text-slate-800 transition-all shadow-sm outline-none" placeholder="(555) 555-5555" />
                                    </div>
                                    
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Login Email</label>
                                        <div className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-sm font-bold text-slate-400 flex items-center shadow-inner cursor-not-allowed">
                                            {editingSub.email}
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <button type="submit" className="w-full justify-center px-4 py-3 text-sm font-black shadow-sm rounded-xl transition-all flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20 hover:-translate-y-0.5">
                                            <Save size={16} /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Dispatch Lanes Management */}
                            <div className="flex flex-col h-full max-h-full overflow-hidden">
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Truck size={14} /> Dispatch Lanes
                                    </h3>
                                    <button onClick={() => setShowTechModal(editingSub.id)} className="text-[10px] font-black text-primary-600 hover:text-primary-800 uppercase tracking-widest flex items-center gap-1.5 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-all">
                                        <Plus size={12}/> Add New
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                                    {(() => {
                                        const subCrews = crews.filter(c => c.subcontractor_id === editingSub.id);
                                        if (subCrews.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center h-full text-center py-12 bg-amber-50/50 border border-dashed border-amber-200 rounded-xl">
                                                    <Truck size={32} className="mx-auto text-amber-300 mb-3" />
                                                    <p className="text-sm font-bold text-amber-700">No dispatch lanes configured.</p>
                                                    <p className="text-xs font-medium text-amber-600 mt-1 max-w-[200px]">Add a lane to start assigning jobs to this subcontractor.</p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="space-y-3">
                                                {subCrews.map(crew => (
                                                    <div key={crew.id} className={`flex justify-between items-center p-3.5 border rounded-xl transition-all ${crew.is_active ? 'bg-slate-50 border-slate-200 shadow-inner' : 'bg-white border-slate-100 opacity-60'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-4 h-4 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: crew.color_code || '#cbd5e1' }}></div>
                                                            <span className={`text-sm font-bold ${!crew.is_active ? 'line-through text-slate-400' : 'text-slate-700'}`}>{crew.crew_name}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setShowTechModal(crew)} className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-700 px-3 py-1.5 rounded-lg border border-primary-200 hover:border-primary-300 hover:bg-white transition-all bg-primary-50 shadow-sm"><Edit2 size={12}/></button>
                                                            <button onClick={() => toggleTechStatus(crew.id, crew.is_active)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-white transition-all bg-slate-100 shadow-sm">
                                                                {crew.is_active ? 'Disable' : 'Enable'}
                                                            </button>
                                                            <button onClick={() => handleDeleteTech(crew.id)} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-300 hover:bg-white transition-all bg-red-50 shadow-sm flex items-center justify-center"><Trash2 size={12}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                    ) : (
                        <SubcontractorJobHistory 
                            subcontractorId={editingSub.id} 
                            crews={crews.filter(c => c.subcontractor_id === editingSub.id)}
                            onInspectJob={handleInspectJob}
                        />
                    )}
                </div>
            </div>
         </div>
      , document.body)}

      {/* Add Tech Modal (Overlays everything) */}
      {showTechModal && createPortal(
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200 modal-layout-wrapper">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowTechModal(null)}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
               <h3 className="text-lg font-black text-slate-900 mb-5 border-b pb-2">{typeof showTechModal === 'object' ? 'Edit Dispatch Lane' : 'New Dispatch Lane'}</h3>
               <form onSubmit={(e) => typeof showTechModal === 'object' ? handleEditTech(e, showTechModal) : handleAddTech(e, showTechModal)} className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Lane Name</label>
                     <input type="text" name="tech_name" required defaultValue={typeof showTechModal === 'object' ? showTechModal.crew_name : ''} className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold focus:ring-2 focus:ring-primary-500/20 outline-none mt-1.5" placeholder="e.g. Truck 1" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase">Lane Color Marker</label>
                     <div className="flex items-center gap-3 mt-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <input type="color" name="color_code" defaultValue={typeof showTechModal === 'object' ? showTechModal.color_code : "#3b82f6"} className="w-10 h-10 border-0 rounded cursor-pointer bg-transparent" />
                        <span className="text-xs font-semibold text-slate-500">Appears on Dispatch Hub</span>
                     </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 mt-2">
                     <button type="button" onClick={() => setShowTechModal(null)} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                     <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors">{typeof showTechModal === 'object' ? 'Save Changes' : 'Create Lane'}</button>
                  </div>
               </form>
            </div>
         </div>
      , document.body)}
      {/* Modals for Job History details */}
      {selectedOpp && (
          <OpportunityOverviewModal 
              isOpen={!!selectedOpp} 
              onClose={() => setSelectedOpp(null)} 
              job={selectedOpp} 
              onAction={() => {}} 
          />
      )}
      
      {selectedServiceCall && (
          <ServiceCallModal 
              isOpen={!!selectedServiceCall} 
              onClose={() => setSelectedServiceCall(null)} 
              serviceCall={selectedServiceCall} 
              onUpdate={() => {}} 
          />
      )}
    </div>
  );
}
