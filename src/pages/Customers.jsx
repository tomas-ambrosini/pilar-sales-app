import React, { useState } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, Plus, Phone, Mail, MapPin, ChevronRight, User as UserIcon, Users, Calendar, FileText, Edit2, Trash2, Tag, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import './Customers.css';
import { useCustomers } from '../context/CustomerContext';
import toast from 'react-hot-toast';
import { useProposals } from '../context/ProposalContext';
import ProposalViewerModal from '../components/ProposalViewerModal';
import ContractDocumentModal from '../components/ContractDocumentModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { PIPELINE_STATES } from '../utils/pipelineControls';

function CustomerList() {
  const navigate = useNavigate();
  const { customers, archivedCustomers, loading, addCustomer, restoreCustomer, forceDeleteCustomer } = useCustomers();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(() => searchParams.get('action') === 'new');
  const [viewMode, setViewMode] = useState('active');

  React.useEffect(() => {
     if (searchParams.get('action') === 'new') {
        setIsAddCustomerOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
     }
  }, [searchParams]);

  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    tags: ''
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCloseModal = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '', address: '' });
    setIsAddCustomerOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email && !formData.phone) {
        toast.error("You must provide either a phone number or email address.");
        return;
    }

    const result = await addCustomer({
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });

    if (result && !result.success) {
        if (result.message) {
            alert(result.message);
        } else {
            console.error(result.error);
            alert("An error occurred while creating the customer.");
        }
        return;
    }

    handleCloseModal();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1 flex items-center gap-3">
            <Users className="text-primary-600" size={28} />
            Customer Directory
          </h1>
          <p className="text-slate-500 font-medium">Centralized database for all customer contacts.</p>
        </div>
        <button 
          onClick={() => setIsAddCustomerOpen(true)}
          className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700"
        >
          <Plus size={18} /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
             <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium placeholder-slate-400 shadow-sm" 
                  placeholder="Search by name, address, or phone..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             
             {user?.role !== 'SALES' && (
                 <div className="flex bg-slate-200/50 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('active')}
                        className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all ${viewMode === 'active' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Active
                    </button>
                    <button 
                        onClick={() => setViewMode('archived')}
                        className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all ${viewMode === 'archived' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Archived Graveyard
                    </button>
                 </div>
             )}
          </div>

          <div className="overflow-x-auto">
        {loading ? (
           <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest">
                   <th className="p-4 px-6 font-medium">Customer Name</th>
                   <th className="p-4 px-6 font-medium">Contact</th>
                   <th className="p-4 px-6 font-medium">Service Address</th>
                   <th className="p-4 px-6"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {[1, 2, 3, 4, 5].map((i) => (
                 <tr key={i} className="animate-pulse">
                   <td className="p-4 px-6">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                       <div className="h-4 bg-slate-200 rounded w-32"></div>
                     </div>
                   </td>
                   <td className="p-4 px-6">
                     <div className="h-4 bg-slate-200 rounded w-24 mb-1.5"></div>
                     <div className="h-3 bg-slate-200 rounded w-32"></div>
                   </td>
                   <td className="p-4 px-6">
                     <div className="h-4 bg-slate-200 rounded w-48 mb-1.5"></div>
                     <div className="h-3 bg-slate-200 rounded w-24"></div>
                   </td>
                   <td className="p-4 px-6 text-right">
                     <div className="h-4 bg-slate-200 rounded w-4 inline-block"></div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         ) : viewMode === 'active' && customers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
              <UserIcon size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No customers yet</h3>
            <p className="text-xs font-medium text-slate-500 mb-6">Create your first customer profile to start generating quotes.</p>
            <button className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-bold px-4 py-2 rounded-xl text-sm shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:outline-none flex items-center gap-2" onClick={() => setIsAddCustomerOpen(true)}>
              <Plus size={16} /> Add Your First Customer
            </button>
          </div>
        ) : viewMode === 'archived' && archivedCustomers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
             <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
               <Trash2 size={32} />
             </div>
             <h3 className="text-sm font-bold text-slate-900 mb-1">Graveyard Empty</h3>
             <p className="text-xs font-medium text-slate-500">No archived customers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left bg-white">
            <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4 px-6">Customer Name</th>
                  <th className="p-4 px-6">Contact</th>
                  <th className="p-4 px-6">Service Address</th>
                  <th className="p-4 px-6 text-right"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {(viewMode === 'active' ? customers : archivedCustomers)
                 .filter(c => {
                     const sq = searchQuery.toLowerCase();
                     return (
                         (c.name && c.name.toLowerCase().includes(sq)) || 
                         (c.address && c.address.toLowerCase().includes(sq)) || 
                         (c.phone && c.phone.includes(sq)) ||
                         (c.email && c.email.toLowerCase().includes(sq))
                     );
                 })
                 .sort((a,b) => a.name.localeCompare(b.name))
                 .map((customer) => (
                 <tr 
                   key={customer.id} 
                   onClick={(e) => {
                       if (viewMode === 'active') navigate(`/customers/${customer.id}`);
                       // Archived customers do nothing on row click except via Restore button
                   }}
                   className={`transition-colors group ${viewMode === 'active' ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                 >
                   <td className="p-4 px-6">
                     <span className={`font-bold text-slate-900 ${viewMode === 'archived' ? 'opacity-50' : ''}`}>{customer.name}</span>
                     {customer.tags && customer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                           {customer.tags.map((t, idx) => (
                              <span key={idx} className={`bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-widest flex items-center gap-1 ${viewMode === 'archived' ? 'opacity-50' : ''}`}><Tag size={10}/> {t}</span>
                           ))}
                        </div>
                     )}
                   </td>
                   <td className={`p-4 px-6 ${viewMode === 'archived' ? 'opacity-50' : ''}`}>
                      <div className="text-xs font-medium text-slate-600 flex flex-col gap-1">
                        {customer.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400 transition-colors"/> {customer.phone}</span>}
                        {customer.email && <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400 transition-colors"/> {customer.email}</span>}
                        {(!customer.phone && !customer.email) && <span className="text-slate-400 italic">No contact info</span>}
                      </div>
                   </td>
                   <td className={`p-4 px-6 ${viewMode === 'archived' ? 'opacity-50' : ''}`}>
                     <span className="text-sm font-medium text-slate-600 line-clamp-1 flex items-center gap-1.5">
                        <MapPin size={14} className="text-slate-400 transition-colors shrink-0"/> {customer.address || <span className="italic">No address on file</span>}
                     </span>
                   </td>
                   <td className="p-4 px-6 text-right">
                     {viewMode === 'active' ? (
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-600 transition-colors inline-block" />
                     ) : (
                        <div className="flex items-center justify-end gap-2">
                           <button 
                              onClick={(e) => { e.stopPropagation(); restoreCustomer(customer.id); }}
                              className="bg-white border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1"
                           >
                              Restore
                           </button>
                           {user?.role === 'SUPER_ADMIN' && (
                              <button 
                                 onClick={(e) => { 
                                     e.stopPropagation(); 
                                     if(window.confirm(`WARNING: Force delete completely wipes ${customer.name} and all associated data. This cannot be undone. Proceed?`)) {
                                         forceDeleteCustomer(customer.id);
                                     }
                                 }}
                                 className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0"
                                 title="Force Wipe"
                              >
                                 <Trash2 size={16} />
                              </button>
                           )}
                        </div>
                     )}
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </div>

      <Modal
        isOpen={isAddCustomerOpen}
        onClose={handleCloseModal}
        title="Add New Customer"
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input type="text" id="firstName" placeholder="Enter first name" value={formData.firstName} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input type="text" id="lastName" placeholder="Enter last name" value={formData.lastName} onChange={handleInputChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="email@example.com" value={formData.email} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" placeholder="(555) 555-5555" value={formData.phone} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input type="text" id="address" placeholder="123 Main St" value={formData.address} onChange={handleInputChange} />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input type="text" id="tags" placeholder="Residential, VIP" value={formData.tags} onChange={handleInputChange} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PropertyDetailsCard({ location, index }) {
   const { updatePropertyDetails } = useCustomers();
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState({
       year_built: location.property_details?.year_built || '',
       sq_footage: location.property_details?.sq_footage || '',
       current_system: location.property_details?.current_system || '',
       system_type: location.property_details?.system_type || '',
       tenant_name: location.property_details?.tenant_name || '',
       tenant_phone: location.property_details?.tenant_phone || ''
   });

   const handleSave = () => {
       updatePropertyDetails(location.id, formData);
       setIsEditing(false);
   };

   return (
        <section className="detail-card glass-panel" style={{ marginBottom: '1rem' }}>
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
             <h2 className="card-title mb-0 flex items-center gap-2"><MapPin size={16} className="text-primary-500"/> Property {index}: <span className="text-slate-600 text-sm font-normal truncate">{location.street_address} {location.city && `, ${location.city}`}</span></h2>
             {isEditing ? (
                 <div className="flex gap-2">
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-700" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded" onClick={handleSave}>Save Specs</button>
                 </div>
             ) : (
                <button className="text-xs font-bold text-slate-400 hover:text-primary-500 flex items-center gap-1" onClick={() => setIsEditing(true)}>
                   <Edit2 size={12}/> Edit Specs
                </button>
             )}
          </div>
          
          {isEditing ? (
             <div className="grid grid-cols-2 gap-4">
               <div className="form-group mb-0">
                  <label className="text-xs">Year Built</label>
                  <input type="text" className="w-full border p-1 rounded mt-1" value={formData.year_built} onChange={e => setFormData({...formData, year_built: e.target.value})} placeholder="e.g. 1995" />
               </div>
               <div className="form-group mb-0">
                  <label className="text-xs">Sq Footage</label>
                  <input type="text" className="w-full border p-1 rounded mt-1" value={formData.sq_footage} onChange={e => setFormData({...formData, sq_footage: e.target.value})} placeholder="e.g. 2500" />
               </div>
               <div className="form-group mb-0">
                  <label className="text-xs">Current System</label>
                  <input type="text" className="w-full border p-1 rounded mt-1" value={formData.current_system} onChange={e => setFormData({...formData, current_system: e.target.value})} placeholder="e.g. Carrier 3-Ton" />
               </div>
               <div className="form-group mb-0">
                  <label className="text-xs">System Type</label>
                  <input type="text" className="w-full border p-1 rounded mt-1" value={formData.system_type} onChange={e => setFormData({...formData, system_type: e.target.value})} placeholder="e.g. Split Gas" />
               </div>
               
               {!location.is_primary_residence && (
                  <>
                    <div className="form-group mb-0">
                       <label className="text-xs text-primary-600 font-bold">Tenant/Admin Name</label>
                       <input type="text" className="w-full border border-primary-100 bg-primary-50 p-1 rounded mt-1" value={formData.tenant_name} onChange={e => setFormData({...formData, tenant_name: e.target.value})} placeholder="e.g. John Smith" />
                    </div>
                    <div className="form-group mb-0">
                       <label className="text-xs text-primary-600 font-bold">Tenant/Admin Phone</label>
                       <input type="tel" className="w-full border border-primary-100 bg-primary-50 p-1 rounded mt-1" value={formData.tenant_phone} onChange={e => setFormData({...formData, tenant_phone: e.target.value})} placeholder="(555) 555-5555" />
                    </div>
                  </>
               )}
             </div>
          ) : (
             <>
               <div className="info-grid relative mb-2">
                 <div className="info-group">
                   <label>Year Built</label>
                   <p>{location.property_details?.year_built || 'Unknown'}</p>
                 </div>
                 <div className="info-group">
                   <label>Sq Footage</label>
                   <p>{location.property_details?.sq_footage || 'Unknown'}</p>
                 </div>
                 <div className="info-group">
                   <label>Current System</label>
                   <p>{location.property_details?.current_system || 'Unknown'}</p>
                 </div>
                 <div className="info-group">
                   <label>System Type</label>
                   <p>{location.property_details?.system_type || 'Unknown'}</p>
                 </div>
               </div>

               {!location.is_primary_residence && (location.property_details?.tenant_name || location.property_details?.tenant_phone) && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-3 w-full">
                     <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                        <UserIcon size={16}/>
                     </div>
                     <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5" style={{ marginBottom: '2px' }}>Site Contact / Tenant</p>
                        <p className="font-semibold text-slate-800 text-sm m-0" style={{ marginBottom: 0 }}>
                           {location.property_details?.tenant_name || 'No Name Provided'}
                        </p>
                        {location.property_details?.tenant_phone && (
                           <p className="text-xs text-slate-500 m-0 mt-0.5 flex items-center gap-1" style={{ marginTop: '2px' }}>
                              <Phone size={10} /> {location.property_details?.tenant_phone}
                           </p>
                        )}
                     </div>
                  </div>
               )}
             </>
          )}
        </section>
   );
}

function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, updateCustomer, deleteCustomer, addPropertyToCustomer, refreshData } = useCustomers();
  const { proposals } = useProposals();
  const { user } = useAuth();
  
  const [isStartDealOpen, setIsStartDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ urgency: 'Medium', issue_description: '' });
  
  const [activeQuickAction, setActiveQuickAction] = useState(null);
  const [isCreateProposalOpen, setIsCreateProposalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [newPropertyAddress, setNewPropertyAddress] = useState('');
  const [viewingProposal, setViewingProposal] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  
  const customer = customers.find(c => c.id.toString() === id.toString());
  
  const primaryLocations = (customer?.locations || []).filter(loc => loc.is_primary_residence);
  const managedLocations = (customer?.locations || []).filter(loc => !loc.is_primary_residence);
  
  // Cross-pollinate data
  const customerProposals = proposals?.filter(p => p.customer?.trim().toLowerCase() === customer?.name?.trim().toLowerCase()) || [];

  const [editFormData, setEditFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.address || '',
    tags: customer?.tags ? customer.tags.join(', ') : ''
  });

  if (!customer) {
    return <div className="page-container flex-center"><h3>Customer Not Found or Deleted</h3><button className="bg-primary-600 font-bold text-white px-5 py-2.5 rounded-xl shadow-md mt-4" onClick={() => navigate('/customers')}>Go Back</button></div>;
  }

  const handleEditChange = (e) => {
    const { id, value } = e.target;
    setEditFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updatedCustomer = {
      ...editFormData,
      tags: editFormData.tags ? editFormData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    updateCustomer(customer.id, updatedCustomer);
    setIsEditModalOpen(false);
  };

    const handleAddProperty = async (e) => {
    e.preventDefault();
    if (!newPropertyAddress.trim()) return;
    await addPropertyToCustomer(id, newPropertyAddress);
    setIsAddPropertyOpen(false);
    setNewPropertyAddress('');
  };

  const handleCreateDeal = async (e) => {
     e.preventDefault();
     if (!customer) return;
     
     const primaryLoc = customer.locations?.find((loc) => loc.is_primary_residence) || customer.locations?.[0];
     
     const { error } = await supabase.from('opportunities').insert({
         household_id: customer.id,
         service_address_id: primaryLoc ? primaryLoc.id : null,
         assigned_salesperson_id: user?.id,
         urgency_level: dealForm.urgency,
         issue_description: dealForm.issue_description,
         status: PIPELINE_STATES.NEW_LEAD
     });
     
     if (error) {
         alert("Database Error: " + error.message);
     } else {
         setIsStartDealOpen(false);
         setDealForm({ urgency: 'Medium', issue_description: '' });
         if (refreshData) refreshData();
     }
  };

  const handleDelete = () => {
      deleteCustomer(customer.id);
      navigate('/customers');
  };

  const activeDealsCount = (customer.opportunities || []).filter(opp => opp.status !== 'Lost' && opp.status !== 'Approved').length;

  return (
    <div className="page-container customer-detail">
      <button className="back-btn" onClick={() => navigate('/customers')}>
        <ChevronRight size={18} className="icon-flip" /> Back to Customers
      </button>

      <div className="detail-header glass-panel">
        <div className="detail-header-main">
          <div className="detail-avatar large">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h1 className="detail-name">{customer.name}</h1>
            <div className="customer-tags" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {customer.tags && customer.tags.map(tag => (
                <span key={tag} className="inline-block rounded-full font-semibold bg-slate-100 text-slate-600 px-2 py-1 text-xs">{tag}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="contact-actions">
          <button className="icon-btn outline" onClick={() => setIsEditModalOpen(true)} title="Edit Customer"><Edit2 size={18} /></button>
          <button className="icon-btn outline" onClick={() => setActiveQuickAction('Call Customer')} title="Call Customer"><Phone size={18} /></button>
          <button className="icon-btn outline" onClick={() => setActiveQuickAction('Email Customer')} title="Email Customer"><Mail size={18} /></button>
          <button className="icon-btn outline" style={{color: 'var(--color-danger)', borderColor: 'var(--color-danger)'}} onClick={() => setIsDeleteModalOpen(true)} title="Archive Customer"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="detail-content-grid">
        <section className="detail-card glass-panel">
          <h2 className="card-title">Contact Information</h2>
          <div className="info-list">
            <div className="info-item">
              <MapPin size={16} className="text-slate-400" />
              <span>{customer.address}</span>
            </div>
            <div className="info-item">
              <Phone size={16} className="text-slate-400" />
              <span>{customer.phone}</span>
            </div>
            <div className="info-item">
              <Mail size={16} className="text-slate-400" />
              <span>{customer.email}</span>
            </div>
          </div>
        </section>

        <div className="locations-wrapper" style={{ gridColumn: '1 / -1' }}>
           {/* Primary Residence Section */}
           {primaryLocations.length > 0 && (
             <div className="mb-6">
                 <div className="flex justify-between items-center w-full mb-3">
                    <h2 className="card-title text-slate-800 m-0">Primary Residence</h2>
                 </div>
                 {primaryLocations.map((loc, index) => (
                     <PropertyDetailsCard key={loc.id} location={loc} index={index + 1} />
                 ))}
             </div>
           )}

           {/* Managed Properties Section */}
           <div>
                 <div className="flex justify-between items-center w-full mb-3">
                    <h2 className="card-title text-slate-800 m-0">Managed Properties</h2>
                    <button onClick={() => setIsAddPropertyOpen(true)} className="btn-secondary text-xs flex items-center gap-1">
                        <Plus size={14} /> Add Property
                    </button>
                 </div>
                 {managedLocations.length > 0 ? (
                     managedLocations.map((loc, index) => (
                         <PropertyDetailsCard key={loc.id} location={loc} index={primaryLocations.length + index + 1} />
                     ))
                 ) : (
                     <div className="detail-card glass-panel flex-center p-6"><p className="text-slate-500 font-medium text-sm">No managed properties recorded.</p></div>
                 )}
           </div>
        </div>

        {/* --- NEW: ERP LIFECYCLE TRACKING --- */}
        <section className="detail-card glass-panel full-width mt-2 mb-6 border-l-4 border-l-primary-500 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-bl-full opacity-50 pointer-events-none"></div>
          <div className="card-header-row mb-6 relative z-10">
            <h2 className="card-title text-slate-800 m-0">ERP Lifecycle & Operations</h2>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-200">System Activity</div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
             {/* Opportunities / Pipeline */}
             <div className="bg-white border rounded-lg p-5 shadow-sm border-slate-200 hover:border-primary-300 transition-colors">
                 <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 tracking-wider text-[11px] uppercase text-primary-600 flex items-center justify-between">
                    <span>
                       Sales Pipeline
                       <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full ml-2">{customer.opportunities?.length || 0}</span>
                    </span>
                    <button onClick={() => setIsStartDealOpen(true)} className="text-[9px] bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded shadow-sm flex items-center gap-1 transition-colors hover:cursor-pointer">
                       <Plus size={10} /> Start New Deal
                    </button>
                 </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {customer.opportunities?.length > 0 ? customer.opportunities.map(opp => (
                      <div key={opp.id} className="relative pl-4">
                         <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_0_4px_rgba(14,165,233,0.1)]"></div>
                         <div className="absolute left-1 top-4 bottom-[-16px] w-[2px] bg-slate-100 last:hidden"></div>
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-700">{opp.status}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono leading-none flex items-center justify-center">#{opp.id.substring(0,8).toUpperCase()}</span>
                         </div>
                         <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{opp.issue_description || 'No issue description recorded'}</p>
                      </div>
                   )) : <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded text-center">No active deals found.</div>}
                </div>
             </div>

             {/* Work Orders */}
             <div className="bg-white border rounded-lg p-5 shadow-sm border-slate-200 hover:border-amber-300 transition-colors">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 tracking-wider text-[11px] uppercase text-amber-600 flex items-center justify-between">
                   Dispatch Hub <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{customer.work_orders?.length || 0}</span>
                </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {customer.work_orders?.length > 0 ? customer.work_orders.map(wo => (
                      <div key={wo.id} className="relative pl-4">
                         <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.1)]"></div>
                         <div className="absolute left-1 top-4 bottom-[-16px] w-[2px] bg-slate-100 last:hidden"></div>
                         <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm text-slate-700">{wo.status}</span>
                            <span className="text-[10px] bg-amber-50 px-1.5 py-0.5 rounded text-amber-700 font-mono font-bold leading-none flex items-center justify-center border border-amber-200/50">#{wo.work_order_number}</span>
                         </div>
                         <p className="text-xs text-slate-500">Urgency: <span className="font-medium text-slate-600">{wo.urgency_level}</span></p>
                      </div>
                   )) : <div className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded text-center">No scheduled operations logs.</div>}
                </div>
             </div>
          </div>
        </section>

        <section className="detail-card glass-panel full-width">
          <div className="card-header-row">
            <h2 className="card-title">Proposals & Quotes</h2>
            <button className="text-btn text-primary" onClick={() => setIsCreateProposalOpen(true)}>Create New</button>
          </div>
          
          {customerProposals.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
               {customerProposals.map(prop => (
                 <div key={prop.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between" onClick={() => {
                        if (prop.status === 'Approved') {
                           const matchedTierName = ['good', 'better', 'best'].find(t => prop.proposal_data?.tiers[t]?.salesPrice === prop.amount) || 'good';
                           const matchedTierData = prop.proposal_data?.tiers[matchedTierName];
                           setViewingContract({ proposal: prop, tierName: matchedTierName.toUpperCase(), tierData: matchedTierData, date: prop.date });
                        } else {
                           setViewingProposal(prop);
                        }
                 }}>
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{prop.id}</span>
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prop.status === 'Approved' ? 'bg-success-100 text-success-800' : prop.status === 'Sent' ? 'bg-secondary-100 text-secondary-800' : 'bg-slate-100 text-slate-600'}`}>{prop.status}</span>
                    </div>
                    <div className="text-lg font-bold text-slate-800 mb-1">${(prop.amount || 0).toLocaleString()}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                       <Clock size={12}/> {prop.date}
                    </div>
                 </div>
               ))}
            </div>
          ) : (
             <div className="empty-state">
                <FileText size={32} className="text-slate-300" />
                <p>No proposals generated yet.</p>
             </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={isCreateProposalOpen}
        onClose={() => setIsCreateProposalOpen(false)}
        title="Create New Proposal"
      >
        <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
            The Proposal Generator for <strong>{customer.name}</strong> will open the Proposal Wizard.
          </p>
          <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setIsCreateProposalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={() => navigate('/proposals')}>
              Go to Wizard
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeQuickAction !== null}
        onClose={() => setActiveQuickAction(null)}
        title={activeQuickAction}
      >
        <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
          {activeQuickAction === 'Call Customer' && (
            <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
              Initiating call to <strong>{customer.phone}</strong> for <strong>{customer.name}</strong>.
            </p>
          )}
          {activeQuickAction === 'Email Customer' && (
            <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
              Opening email client to send email to <strong>{customer.email}</strong> for <strong>{customer.name}</strong>.
            </p>
          )}
          <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setActiveQuickAction(null)}>
              Close
            </button>
            {activeQuickAction === 'Call Customer' && (
              <a href={`tel:${customer.phone}`} className="btn-primary">
                Call Now
              </a>
            )}
            {activeQuickAction === 'Email Customer' && (
              <a href={`mailto:${customer.email}`} className="btn-primary">
                Send Email
              </a>
            )}
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Details"
      >
        <form className="modal-form" onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input type="text" id="name" value={editFormData.name} onChange={handleEditChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={editFormData.email} onChange={handleEditChange} />
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input type="tel" id="phone" value={editFormData.phone} onChange={handleEditChange} />
          </div>
          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input type="text" id="address" value={editFormData.address} onChange={handleEditChange} />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input type="text" id="tags" value={editFormData.tags} onChange={handleEditChange} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Archive Customer"
      >
        <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
          {activeDealsCount > 0 ? (
             <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-left mb-6">
                <h4 className="font-bold flex items-center gap-2 mb-2"><Trash2 size={18}/> Active Deals Detected!</h4>
                <p className="text-sm">This customer currently has <strong>{activeDealsCount} active deal(s)</strong> in the sales pipeline.</p>
                <p className="text-sm mt-2">Archiving this customer will not delete the deals natively, resulting in orphaned "ghost deals" visible in the pipeline.</p>
                {user.role === 'SALES' ? (
                   <p className="font-black text-xs uppercase tracking-wider mt-4 bg-red-100 p-2 rounded text-center">Action Blocked: Please cancel deals first.</p>
                ) : (
                   <p className="font-bold text-xs uppercase tracking-wider mt-4 bg-red-100 p-2 rounded text-center text-red-800">Admin Override Permitted</p>
                )}
             </div>
          ) : (
             <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
                Are you sure you want to archive <strong>{customer.name}</strong>? They will be hidden from the Active Directory.
             </p>
          )}

          <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
            <button className="btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </button>
            <button 
               className="btn-primary" 
               style={{ background: activeDealsCount > 0 && user.role === 'SALES' ? 'var(--color-slate-300)' : 'var(--color-danger)' }} 
               onClick={handleDelete}
               disabled={activeDealsCount > 0 && user.role === 'SALES'}
            >
              Confirm Archive
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Property Modal */}
      <Modal
         isOpen={isAddPropertyOpen}
         onClose={() => setIsAddPropertyOpen(false)}
         title={`Add Property to ${customer.name}`}
      >
         <form className="modal-form" onSubmit={handleAddProperty}>
            <p className="text-sm text-slate-500 mb-4">
               Attach a new physical property location to this customer account.
            </p>
            <div className="form-group">
               <label htmlFor="propAddress">Property Street Address</label>
               <input 
                  type="text" 
                  id="propAddress" 
                  value={newPropertyAddress} 
                  onChange={e => setNewPropertyAddress(e.target.value)} 
                  placeholder="e.g. 100 Main St"
                  required 
               />
            </div>
            <div className="modal-actions mt-6">
               <button type="button" className="btn-secondary" onClick={() => setIsAddPropertyOpen(false)}>Cancel</button>
               <button type="submit" className="btn-primary">Add Property</button>
            </div>
         </form>
      </Modal>

      {/* Viewer Modal Instance */}
      <ProposalViewerModal 
          isOpen={!!viewingProposal} 
          onClose={() => setViewingProposal(null)} 
          proposal={viewingProposal} 
          onViewContract={(proposalData) => {
             setViewingProposal(null);
             const matchedTierName = ['good', 'better', 'best'].find(t => proposalData.proposal_data?.tiers[t]?.salesPrice === proposalData.amount) || 'good';
             const matchedTierData = proposalData.proposal_data?.tiers[matchedTierName];
             setViewingContract({ proposal: proposalData, tierName: matchedTierName?.toUpperCase(), tierData: matchedTierData, date: proposalData.date });
          }}
      />

      <ContractDocumentModal 
        isOpen={!!viewingContract}
        onClose={() => setViewingContract(null)}
        contractData={viewingContract}
      />

      <Modal isOpen={isStartDealOpen} onClose={() => setIsStartDealOpen(false)} title="Originate New CRM Lead">
         <form onSubmit={handleCreateDeal}>
            <div className="p-4 bg-primary-50 border border-primary-100 rounded-lg mb-4 text-sm text-primary-800">
               <strong className="block mb-1">Customer: {customer?.name}</strong>
               Creating a new Lead drops it directly into the Sales Pipeline for the intake team to process.
            </div>
            
            <div className="form-group mb-3">
               <label className="text-xs font-bold text-slate-600 mb-1 block">Urgency / Severity</label>
               <select className="w-full border p-2 rounded-lg" value={dealForm.urgency} onChange={e => setDealForm({...dealForm, urgency: e.target.value})}>
                  <option value="Low">Low - Working Condition</option>
                  <option value="Medium">Medium - Failing/Noisy</option>
                  <option value="High">Emergency - System Down</option>
               </select>
            </div>
            
            <div className="form-group mb-4">
               <label className="text-xs font-bold text-slate-600 mb-1 block">Lead Context / Reported Issue</label>
               <textarea 
                  required
                  rows={4}
                  className="w-full border p-2 rounded-lg text-sm bg-white" 
                  placeholder="Customer called regarding AC making a loud noise..."
                  value={dealForm.issue_description}
                  onChange={e => setDealForm({...dealForm, issue_description: e.target.value})}
               />
            </div>
            
            <div className="flex justify-end gap-2 border-t pt-4 border-slate-200">
               <button type="button" className="btn-secondary" onClick={() => setIsStartDealOpen(false)}>Cancel</button>
               <button type="submit" className="btn-primary flex items-center gap-2"><Plus size={14}/> Generate Deal</button>
            </div>
         </form>
      </Modal>

    </div>
  );
}

export default function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/:id" element={<CustomerDetail />} />
    </Routes>
  );
}
