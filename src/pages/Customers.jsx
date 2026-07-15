import React, { useState, useEffect, useDeferredValue } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Search, Plus, Phone, Mail, MapPin, ChevronRight, User as UserIcon, Users, Calendar, FileText, Edit2, Trash2, Tag, Clock, Zap, Activity, Settings, AlertTriangle, Box, Shield, CalendarClock } from 'lucide-react';
import SlideDrawer from '../components/SlideDrawer';
import Modal from '../components/Modal';
import './Customers.css';
import { useCustomers } from '../context/CustomerContext';
import toast from 'react-hot-toast';
import { useProposals } from '../context/ProposalContext';
import ProposalViewerModal from '../components/ProposalViewerModal';
import ContractDocumentModal from '../components/ContractDocumentModal';
import InvoiceDocument from '../components/InvoiceDocument';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { supabase } from '../supabaseClient';
import { PIPELINE_STATES } from '../utils/pipelineControls';
import { formatQuoteId, formatPhoneNumber } from '../utils/formatters';

function CustomerList() {
  const navigate = useNavigate();
  const { customers, archivedCustomers, loading, addCustomer, restoreCustomer, forceDeleteCustomer } = useCustomers();
  const { user } = useAuth();
  const { activeRole, ROLES } = useRole();
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
    city: '',
    zip: '',
    tags: '',
    sameAsService: true,
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: ''
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleCloseModal = () => {
    setFormData({ 
      firstName: '', lastName: '', email: '', phone: '', 
      address: '', city: '', zip: '', tags: '', sameAsService: true, 
      billingAddress: '', billingCity: '', billingState: '', billingZip: '' 
    });
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
      city: formData.city,
      state: 'FL',
      zip: formData.zip,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      billing_address: formData.sameAsService ? formData.address : formData.billingAddress,
      billing_city: formData.sameAsService ? formData.city : formData.billingCity,
      billing_state: formData.sameAsService ? 'FL' : formData.billingState,
      billing_zip: formData.sameAsService ? formData.zip : formData.billingZip
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

  const handleExportCSV = () => {
     if (activeRole !== ROLES.ADMIN) {
         toast.error("Unauthorized: Only Admins can export the customer directory.");
         return;
     }
     
     const headers = ['Name', 'Email', 'Phone', 'Address', 'Tags', 'Status'];
     const rows = customers.map(c => [
         `"${c.name || ''}"`,
         `"${c.email || ''}"`,
         `"${c.phone || ''}"`,
         `"${c.address || ''}"`,
         `"${(c.tags || []).join('; ')}"`,
         c.active_maintenance_agreement ? '"VIP"' : '""'
     ]);
     
     const csvString = [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
     const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     
     const link = document.createElement("a");
     link.setAttribute("href", url);
     link.setAttribute("download", `pilar_customers_export_${new Date().toISOString().split('T')[0]}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     
     // Clean up
     setTimeout(() => URL.revokeObjectURL(url), 100);
     
     toast.success("Customer directory exported successfully.");
  };

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredCustomers = React.useMemo(() => {
     const sourceList = viewMode === 'active' ? customers : archivedCustomers;
     return sourceList
       .filter(c => {
           if (!deferredSearchQuery) return true;
           const cleanSq = deferredSearchQuery.toLowerCase().replace(/\s+/g, '');
           return c.searchIndex && c.searchIndex.includes(cleanSq);
       })
       .sort((a,b) => a.name.localeCompare(b.name));
  }, [customers, archivedCustomers, viewMode, deferredSearchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-primary-600" size={28} />
            Customer Directory
          </h1>
          <p className="text-slate-500 font-medium mt-1">Centralized database for all customer contacts.</p>
        </div>
        <div className="flex gap-2">
          {activeRole === ROLES.ADMIN && (
            <button 
              onClick={handleExportCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 border border-slate-200"
            >
              Export CSV
            </button>
          )}
          <button 
            onClick={() => setIsAddCustomerOpen(true)}
            className="bg-gradient-to-tr from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md active:scale-95 border border-slate-700"
          >
            <Plus size={18} /> Add Customer
          </button>
        </div>
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
                        className={`text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-md transition-all ${viewMode === 'active' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Active
                    </button>
                    <button 
                        onClick={() => setViewMode('archived')}
                        className={`text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 rounded-md transition-all ${viewMode === 'archived' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Archived
                    </button>
                 </div>
             )}
          </div>

          <div className="overflow-x-auto">
        {loading ? (
           <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
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
                       <div className="w-9 h-9 rounded-full bg-slate-100"></div>
                       <div>
                         <div className="h-4 bg-slate-100 rounded-md w-32 mb-2"></div>
                         <div className="h-3 bg-slate-100 rounded-md w-16"></div>
                       </div>
                     </div>
                   </td>
                   <td className="p-4 px-6">
                     <div className="h-3 bg-slate-100 rounded-md w-24 mb-2"></div>
                     <div className="h-3 bg-slate-100 rounded-md w-32"></div>
                   </td>
                   <td className="p-4 px-6">
                     <div className="h-4 bg-slate-100 rounded-md w-48 mb-2"></div>
                     <div className="h-3 bg-slate-100 rounded-md w-24"></div>
                   </td>
                   <td className="p-4 px-6 text-right">
                     <div className="h-4 bg-slate-100 rounded-md w-4 inline-block"></div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         ) : viewMode === 'active' && customers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
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
             <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
               <Trash2 size={32} />
             </div>
             <h3 className="text-sm font-bold text-slate-900 mb-1">Graveyard Empty</h3>
             <p className="text-xs font-medium text-slate-500">No archived customers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left bg-white">
            <thead>
               <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="p-4 px-6">Customer Name</th>
                  <th className="p-4 px-6">Contact</th>
                  <th className="p-4 px-6">Service Address</th>
                  <th className="p-4 px-6 text-right"></th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {filteredCustomers.length === 0 ? (
                 <tr>
                   <td colSpan="4" className="p-16 text-center">
                     <div className="flex flex-col items-center justify-center">
                       <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-5 border border-slate-100 shadow-sm">
                         <Search size={36} />
                       </div>
                       <h3 className="text-base font-bold text-slate-900 mb-1">No customers found</h3>
                       <p className="text-sm font-medium text-slate-500 mb-6">We couldn't find any matching "{searchTerm}".</p>
                       <button className="bg-primary-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md hover:bg-primary-700 hover:shadow-lg transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 flex items-center gap-2" onClick={() => setIsAddCustomerOpen(true)}>
                         <Plus size={18} /> Add New Customer
                       </button>
                     </div>
                   </td>
                 </tr>
               ) : (
                 filteredCustomers.slice(0, 100).map((customer) => (
                 <tr 
                   key={customer.id} 
                   onClick={(e) => {
                       if (viewMode === 'active') navigate(`/customers/${customer.id}`);
                       // Archived customers do nothing on row click except via Restore button
                   }}
                   className={`transition-all group ${viewMode === 'active' ? (customer.active_maintenance_agreement ? 'bg-amber-50/30 hover:bg-amber-50/60 hover:shadow-[inset_0_0_0_1px_rgba(251,191,36,0.3)] cursor-pointer' : 'hover:bg-primary-50/50 hover:shadow-[inset_0_0_0_1px_rgba(14,165,233,0.1)] cursor-pointer') : ''}`}
                 >
                   <td className="p-4 px-6">
                     <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${viewMode === 'archived' ? 'bg-slate-100 text-slate-400' : (customer.active_maintenance_agreement ? 'bg-amber-100 text-amber-700 border border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.2)]' : 'bg-primary-100 text-primary-700 border border-primary-200')}`}>
                           {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                           <div className="flex items-center gap-2">
                               <span className={`font-bold text-slate-900 ${viewMode === 'archived' ? 'opacity-50' : ''}`}>{customer.name}</span>
                               {customer.active_maintenance_agreement && viewMode === 'active' && (
                                   <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-widest flex items-center gap-1">
                                       <Shield size={10} /> VIP
                                   </span>
                               )}
                           </div>
                           {customer.tags && customer.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                 {customer.tags.map((t, idx) => (
                                    <span key={idx} className={`bg-white text-slate-600 border border-slate-200 shadow-sm px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-widest flex items-center gap-1 ${viewMode === 'archived' ? 'opacity-50' : ''}`}><Tag size={10}/> {t}</span>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                   </td>
                   <td className={`p-4 px-6 ${viewMode === 'archived' ? 'opacity-50' : ''}`}>
                      <div className="text-xs font-medium text-slate-600 flex flex-col gap-1">
                        {customer.phone && <a href={`tel:${customer.phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors"><Phone size={12} className="text-slate-400 group-hover:text-primary-400 transition-colors"/> {customer.phone}</a>}
                        {customer.email && <a href={`mailto:${customer.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 hover:text-primary-600 transition-colors"><Mail size={12} className="text-slate-400 group-hover:text-primary-400 transition-colors"/> {customer.email}</a>}
                        {(!customer.phone && !customer.email) && <span className="text-slate-400 italic">No contact info</span>}
                      </div>
                   </td>
                   <td className={`p-4 px-6 ${viewMode === 'archived' ? 'opacity-50' : ''}`}>
                     <span className="text-sm font-medium text-slate-600 line-clamp-1 flex flex-col gap-1">
                        <span className="flex items-center gap-1.5">
                           <MapPin size={14} className="text-slate-400 transition-colors shrink-0"/> {customer.address || <span className="italic">No address on file</span>}
                        </span>
                        {customer.locations?.length > 1 && (
                           <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded w-max">+{customer.locations.length - 1} more propert{customer.locations.length - 1 === 1 ? 'y' : 'ies'}</span>
                        )}
                        {(() => {
                           let latestDate = customer.latestActivityDate || null;
                           if (customer.activity_logs?.length > 0) {
                               const actDate = new Date(customer.activity_logs[0].created_at).getTime();
                               if (!latestDate || actDate > latestDate) latestDate = actDate;
                           }
                           return (
                              <span className="text-[10px] text-slate-400 font-medium italic mt-0.5 flex items-center gap-1">
                                 <Clock size={10} /> 
                                 {latestDate ? `Last activity: ${new Date(latestDate).toLocaleDateString()}` : 'No recent history'}
                              </span>
                           );
                        })()}
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
                           {['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role) && (
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
               )))}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </div>

      <SlideDrawer
        isOpen={isAddCustomerOpen}
        onClose={handleCloseModal}
        title="Add New Customer"
        width="max-w-2xl"
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" placeholder="Enter first name" value={formData.firstName} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" placeholder="Enter last name" value={formData.lastName} onChange={handleInputChange} required />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" placeholder="email@example.com" value={formData.email} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" placeholder="(555) 555-5555" value={formData.phone} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="address">Service Address</label>
            <input type="text" id="address" placeholder="123 Main St" value={formData.address} onChange={handleInputChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input type="text" id="city" placeholder="Miami" value={formData.city} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label htmlFor="zip">Zip Code</label>
                <input type="text" id="zip" placeholder="33101" value={formData.zip} onChange={handleInputChange} />
              </div>
          </div>
          <div className="form-group bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 mb-2">
             <label className="flex items-center gap-2 cursor-pointer mb-2 text-sm font-semibold text-slate-700">
                 <input 
                     type="checkbox" 
                     id="sameAsService"
                     checked={formData.sameAsService} 
                     onChange={(e) => setFormData(prev => ({...prev, sameAsService: e.target.checked}))}
                     className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                 />
                 Billing Address is same as Service Address
             </label>

             {!formData.sameAsService && (
                 <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 gap-4">
                     <div>
                         <label htmlFor="billingAddress">Billing Street</label>
                         <input required={!formData.sameAsService} type="text" id="billingAddress" value={formData.billingAddress} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <div className="col-span-1">
                             <label htmlFor="billingCity">City</label>
                             <input required={!formData.sameAsService} type="text" id="billingCity" value={formData.billingCity} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                         </div>
                         <div className="col-span-1">
                             <label htmlFor="billingState">State</label>
                             <input required={!formData.sameAsService} type="text" id="billingState" value={formData.billingState} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                         </div>
                         <div className="col-span-1">
                             <label htmlFor="billingZip">Zip</label>
                             <input required={!formData.sameAsService} type="text" id="billingZip" value={formData.billingZip} onChange={handleInputChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                         </div>
                     </div>
                 </div>
             )}
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags (comma separated)</label>
            <input type="text" id="tags" placeholder="Residential, VIP" value={formData.tags} onChange={handleInputChange} />
          </div>
          <div className="modal-actions pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" className="btn-secondary" onClick={handleCloseModal}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Customer
            </button>
          </div>
        </form>
      </SlideDrawer>
    </div>
  );
}

function PropertyDetailsCard({ location, index }) {
   const { updatePropertyDetails, deleteProperty } = useCustomers();
   const { activeRole, ROLES } = useRole();
   const { id } = useParams();
   const navigate = useNavigate();
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

   const handleDeleteProperty = async () => {
       if (window.confirm("Are you sure you want to permanently delete this property? All associated units will also be removed.")) {
           const { success, error } = await deleteProperty(location.id);
           if (!success) toast.error(error || "Failed to delete property");
           else toast.success("Property deleted successfully");
       }
   };

   return (
        <section className="detail-card glass-panel" style={{ marginBottom: '1rem' }}>
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4 mb-4 border-b border-slate-100 pb-2">
             <h2 className="card-title mb-0 flex items-center gap-2 w-full"><MapPin size={16} className="text-primary-500 shrink-0"/> Property {index}: <span className="text-slate-600 text-sm font-normal truncate">{location.street_address} {location.city && `, ${location.city}`}</span></h2>
             {isEditing ? (
                 <div className="flex gap-2">
                    <button className="text-xs font-bold text-slate-500 hover:text-slate-700" onClick={() => setIsEditing(false)}>Cancel</button>
                    <button className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded" onClick={handleSave}>Save Specs</button>
                 </div>
             ) : (
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                   <button className="text-xs font-bold text-white hover:bg-primary-700 bg-primary-600 px-3 py-1.5 rounded flex items-center justify-center gap-1 transition-all shadow-sm flex-1 md:flex-none min-w-[180px]" onClick={() => navigate(`/customers/${id}/address/${location.id}`)}>
                       View Lifecycle & Equipment <ChevronRight size={14}/>
                   </button>
                   <button className="text-xs font-bold text-slate-400 hover:text-primary-500 flex items-center gap-1" onClick={() => setIsEditing(true)}>
                      <Edit2 size={12}/> Edit Specs
                   </button>
                   {activeRole === ROLES.ADMIN && !location.is_primary_residence && (
                       <button className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1" onClick={handleDeleteProperty}>
                          <Trash2 size={12}/> Delete
                       </button>
                   )}
                </div>
             )}
          </div>
          
          {isEditing ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                       <input type="tel" className="w-full border border-primary-100 bg-primary-50 p-1 rounded mt-1" value={formData.tenant_phone} onChange={e => setFormData({...formData, tenant_phone: formatPhoneNumber(e.target.value)})} placeholder="(555) 555-5555" />
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
                
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:gap-4">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Installed Units</span>
                      <span className="text-sm font-black text-slate-700">{location.property_details?.units?.length || 0} Assets</span>
                   </div>
                   <div className="flex flex-col sm:border-l border-slate-200 sm:pl-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Lifecycle</span>
                      <span className="text-sm font-black text-primary-600">Click View to see Proposals & Work Orders</span>
                   </div>
                </div>
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
  const { canViewFinancials } = useRole();
  
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
  const [viewingInvoice, setViewingInvoice] = useState(null);
  
  const customer = customers.find(c => c.id.toString() === id.toString());
  
  const primaryLocations = (customer?.locations || []).filter(loc => loc.is_primary_residence);
  const managedLocations = (customer?.locations || []).filter(loc => !loc.is_primary_residence);
  
  // Cross-pollinate data
  const custNameLower = customer?.name?.trim().toLowerCase();
  const customerProposals = proposals?.filter(p => p.customer?.trim().toLowerCase() === custNameLower) || [];

  const [editFormData, setEditFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    address: customer?.primary_address_obj?.street_address || customer?.primary_address_obj?.street || '',
    city: customer?.primary_address_obj?.city || '',
    state: customer?.primary_address_obj?.state || '',
    zip: customer?.primary_address_obj?.zip || '',
    billing_address: customer?.billing_address_obj?.street_address || customer?.billing_address_obj?.street || '',
    billing_city: customer?.billing_address_obj?.city || '',
    billing_state: customer?.billing_address_obj?.state || '',
    billing_zip: customer?.billing_address_obj?.zip || '',
    tags: customer?.tags ? customer.tags.join(', ') : ''
  });

  if (!customer) {
    return <div className="page-container flex-center"><h3>Customer Not Found or Deleted</h3><button className="bg-primary-600 font-bold text-white px-5 py-2.5 rounded-xl shadow-md mt-4" onClick={() => navigate('/customers')}>Go Back</button></div>;
  }

  const handleEditChange = (e) => {
    const { id, value } = e.target;
    const finalValue = id === 'phone' ? formatPhoneNumber(value) : value;
    setEditFormData(prev => ({ ...prev, [id]: finalValue }));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const updatedCustomer = {
      ...editFormData,
      service_address_id: customer?.primary_address_obj?.id,
      billing_address_id: customer?.billing_address_obj?.id,
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
     
     const { data: oppData, error } = await supabase.from('opportunities').insert({
         household_id: customer.id,
         service_address_id: primaryLoc ? primaryLoc.id : null,
         assigned_salesperson_id: user?.id,
         urgency_level: dealForm.urgency,
         issue_description: dealForm.issue_description,
         proposal_data: { intaken_by: user?.full_name || 'System' },
         status: PIPELINE_STATES.NEW_LEAD
     }).select().single();

     if (!error) {
         await supabase.from('activity_logs').insert({
             household_id: customer.id,
             opportunity_id: oppData.id,
             activity_type: 'Lead Intaken',
             description: `Lead intaken directly from Customer Profile by ${user?.full_name || 'System'}.`
         });
     }
     
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
         <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-8 relative">
            <div className="absolute right-0 top-0 w-64 h-full bg-primary-500/10 rounded-l-full"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10  shadow-inner text-4xl font-black text-white">
                     {customer.name.charAt(0)}
                  </div>
                  <div>
                     <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
                         <h1 className="text-3xl font-black text-white tracking-tight">{customer.name}</h1>
                         <button 
                             onClick={() => updateCustomer(customer.id, { active_maintenance_agreement: !customer.active_maintenance_agreement })}
                             className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all ${customer.active_maintenance_agreement ? 'bg-amber-400 text-amber-900 shadow-[0_0_15px_rgba(251,191,36,0.4)]' : 'bg-white/10 text-slate-300 border border-white/20 hover:bg-white/20 hover:text-white'}`}
                         >
                             <Shield size={12} /> {customer.active_maintenance_agreement ? 'PM Active' : 'No PM'}
                         </button>
                     </div>
                     {customer.tags && customer.tags.length > 0 && (
                         <div className="flex flex-wrap gap-2">
                           {customer.tags.map(tag => (
                             <span key={tag} className="bg-white/5 border border-white/10 text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest flex items-center gap-1.5"><Tag size={10}/> {tag}</span>
                           ))}
                         </div>
                     )}
                  </div>
               </div>
               <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
                  <button onClick={() => {
                      setEditFormData({
                          name: customer?.name || '',
                          email: customer?.email || '',
                          phone: customer?.phone || '',
                          address: customer?.address || '',
                          tags: customer?.tags ? customer.tags.join(', ') : ''
                      });
                      setIsEditModalOpen(true);
                  }} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold" title="Edit Customer"><Edit2 size={16} /></button>
                  <a href={`tel:${customer.phone}`} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold" title="Call Customer"><Phone size={16} /></a>
                  <a href={`mailto:${customer.email}`} className="flex-1 md:flex-none justify-center bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold" title="Email Customer"><Mail size={16} /></a>
                  <button className="flex-1 md:flex-none justify-center bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold" onClick={() => setIsDeleteModalOpen(true)} title="Archive Customer"><Trash2 size={16} /></button>
               </div>
            </div>
         </div>
      </div>

      <div className="detail-content-grid">
        <section className="detail-card glass-panel">
          <h2 className="card-title">Contact Information</h2>
          <div className="info-list">
            <div className="info-item">
              <MapPin size={16} className="text-slate-400" />
              <span><span className="font-semibold text-slate-500 text-[10px] uppercase mr-1">Service:</span> {customer.address}</span>
            </div>
            <div className="info-item">
              <MapPin size={16} className="text-slate-400" />
              <span><span className="font-semibold text-slate-500 text-[10px] uppercase mr-1">Billing:</span> {customer.billing_address}</span>
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

        <section className="detail-card glass-panel" style={{ gridColumn: '1 / -1' }}>
           <h2 className="card-title">Activity Timeline & Audit Log</h2>
           <ActivityTimeline householdId={customer.id} />
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
            <button className="btn-primary" onClick={() => {
                localStorage.setItem('pilar_draft_customer', JSON.stringify({
                    household_id: customer.id
                }));
                navigate('/proposals');
            }}>
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
      <SlideDrawer
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer Details"
        width="max-w-4xl"
      >
        <form className="modal-form" onSubmit={handleEditSubmit}>
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-xs">Full Name</label>
              <input type="text" id="name" value={editFormData.name} onChange={handleEditChange} required className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-xs">Email Address</label>
                <input type="email" id="email" value={editFormData.email} onChange={handleEditChange} className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-xs">Phone Number</label>
                <input type="tel" id="phone" value={editFormData.phone} onChange={handleEditChange} className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                {/* Service Address */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Service Address</h4>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Street Address</label>
                            <input type="text" id="address" value={editFormData.address} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">City</label>
                            <input type="text" id="city" value={editFormData.city} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">State</label>
                            <input type="text" id="state" value={editFormData.state} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Zip</label>
                            <input type="text" id="zip" value={editFormData.zip} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                    </div>
                </div>

                {/* Billing Address */}
                <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Billing Address</h4>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Street Address</label>
                            <input type="text" id="billing_address" value={editFormData.billing_address} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">City</label>
                            <input type="text" id="billing_city" value={editFormData.billing_city} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">State</label>
                            <input type="text" id="billing_state" value={editFormData.billing_state} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">Zip</label>
                            <input type="text" id="billing_zip" value={editFormData.billing_zip} onChange={handleEditChange} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <label htmlFor="tags" className="block text-sm font-semibold text-slate-700 mb-1.5 uppercase tracking-wider text-xs">Tags (comma separated)</label>
              <input type="text" id="tags" value={editFormData.tags} onChange={handleEditChange} className="w-full border border-slate-200 p-3 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all outline-none" />
            </div>
          </div>
          <div className="modal-actions pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </SlideDrawer>

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
         <ProposalViewerModal isOpen={!!viewingProposal} onClose={() => setViewingProposal(null)} proposal={viewingProposal} onViewContract={(proposalData) => {
             setViewingProposal(null);
             const matchedTierName = ['good', 'better', 'best'].find(t => proposalData.proposal_data?.tiers[t]?.salesPrice === proposalData.amount) || 'good';
             const matchedTierData = proposalData.proposal_data?.tiers[matchedTierName];
             setViewingContract({ proposal: proposalData, tierName: matchedTierName?.toUpperCase(), tierData: matchedTierData, date: proposalData.date });
          }} />
         <ContractDocumentModal isOpen={!!viewingContract} onClose={() => setViewingContract(null)} contractData={viewingContract} />
         <InvoiceDocument isOpen={!!viewingInvoice} onClose={() => setViewingInvoice(null)} invoice={viewingInvoice} />

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

function ProjectCard({ project, navigate, setViewingProposal, setViewingContract, setViewingInvoice }) {
   const hasWorkOrders = project.work_orders?.length > 0;
   const hasProposals = project.proposals?.length > 0;
   const { canViewFinancials } = useRole();
   
   // If it has a proposal, show the proposal ID instead of the lead ID
   const displayId = hasProposals ? formatQuoteId(project.proposals[0]) : formatQuoteId(project);

   return (
      <div className="bg-white/60  border border-slate-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full">
         <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-400 to-primary-600"></div>
         
         {/* Header */}
         <div className="flex justify-between items-start mb-4">
            <div>
               <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100/50">{project.status || 'Draft'}</span>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">{displayId}</span>
               </div>
               <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{project.issue_description || 'Active Deal Pipeline'}</h3>
            </div>
         </div>

         <div className="mt-auto space-y-4">
            {/* Document Vault Section */}
            {hasProposals && (
               <div className="pt-4 border-t border-slate-100/80">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1"><FileText size={10}/> Document Vault</h4>
                  <div className="space-y-2">
                     {project.proposals.map(prop => (
                        <div key={prop.id} className="bg-white border border-slate-200 rounded-lg p-3 hover:border-primary-300 transition-colors shadow-sm group/prop">
                           <div className="flex justify-between items-center mb-2">
                              <div>
                                 <div className="text-xs font-bold text-slate-700 mb-0.5">{canViewFinancials() ? `$${(prop.amount || 0).toLocaleString()}` : '***'}</div>
                                 <div className="text-[9px] font-medium text-slate-400">{prop.date}</div>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${prop.status === 'Approved' ? 'bg-success-50 text-success-700 border border-success-200/50' : 'bg-slate-50 text-slate-600 border border-slate-200/50 group-hover/prop:bg-primary-50 group-hover/prop:text-primary-600 group-hover/prop:border-primary-200/50 transition-colors'}`}>{prop.status}</span>
                           </div>
                           <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                               <button onClick={() => setViewingProposal(['Approved', 'Lost', 'Voided'].includes(prop.status) ? { ...prop, isReadOnly: true } : prop)} className="flex-1 px-2 py-1.5 text-[10px] font-black bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-white hover:border-slate-300 transition-all text-center">Proposal</button>
                               
                               {['NEEDS_SCHEDULING', 'SCHEDULED', 'APPROVED', 'COMPLETED', 'CLOSED_WON'].includes(project.status) && (
                                   <button onClick={() => {
                                       const matchedTierName = prop.proposal_data?.accepted_tier_name || 'good';
                                       const matchedTierData = prop.proposal_data?.accepted_tier_data || prop.proposal_data?.tiers?.[matchedTierName];
                                       setViewingContract({
                                           proposal: prop,
                                           tierName: matchedTierName?.toUpperCase() || 'SYSTEM',
                                           tierData: matchedTierData || {},
                                           date: new Date(prop.updated_at || prop.created_at).toLocaleDateString()
                                       });
                                   }} className="flex-1 px-2 py-1.5 text-[10px] font-black bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-white hover:border-slate-300 transition-all text-center">Contract</button>
                               )}
                               
                               {['SCHEDULED', 'COMPLETED', 'CLOSED_WON'].includes(project.status) && (
                                   <button onClick={async () => {
                                       toast.loading('Loading invoice...', { id: 'inv' });
                                       const { data } = await supabase.from('invoices').select('*, proposals(*)').eq('proposal_id', prop.id).single();
                                       if (data) {
                                           toast.dismiss('inv');
                                           setViewingInvoice(data);
                                       } else {
                                           toast.error('Invoice not generated yet.', { id: 'inv' });
                                       }
                                   }} className="flex-1 px-2 py-1.5 text-[10px] font-black bg-slate-50 border border-slate-200 rounded text-slate-600 hover:bg-white hover:border-slate-300 transition-all text-center">Invoice</button>
                               )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* Work Orders Section */}
            {hasWorkOrders && (
               <div className="pt-4 border-t border-slate-100/80">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1"><Calendar size={10}/> Dispatch Schedule</h4>
                  <div className="space-y-2">
                     {project.work_orders.map(wo => {
                        let displayStatus = wo.status;
                        if (['COMPLETED', 'CLOSED_WON'].includes(project.status)) displayStatus = 'Completed';
                        else if (wo.scheduled_date) displayStatus = `Scheduled: ${new Date(wo.scheduled_date).toLocaleDateString()}`;
                        
                        return (
                        <div key={wo.id} className="bg-gradient-to-r from-amber-50/50 to-white border border-amber-100 rounded-lg p-2.5 flex justify-between items-center shadow-sm relative overflow-hidden">
                           <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                           <div className="pl-2">
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-0.5">
                                 {displayStatus}
                                 {wo.work_order_number && <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-mono border border-amber-200/50">#{wo.work_order_number}</span>}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium">Urgency: <span className="font-bold text-amber-700/80">{wo.urgency_level}</span></div>
                           </div>
                        </div>
                        );
                     })}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}

function AddressOperations({ id, addressId, address, customer, setViewingProposal, setViewingContract, setViewingInvoice }) {
   const { proposals } = useProposals();
   const navigate = useNavigate();

   const addressOpportunities = customer?.opportunities?.filter(opp => {
       const oppAddressId = opp.proposal_data?.service_address_id || opp.site_survey_data?.property_id || opp.site_survey_data?.service_address_id;
       if (oppAddressId) return oppAddressId === addressId;
       return true; // If no address assigned yet, show on all
   }) || [];
   const addressWorkOrders = customer?.work_orders?.filter(wo => wo.opportunity_id && addressOpportunities.some(opp => opp.id === wo.opportunity_id)) || [];
   
   const addressProposals = proposals?.filter(p => {
       const oppId = p.associated_opportunity_id || p.proposal_data?.associated_opportunity_id;
       if (oppId && addressOpportunities.some(opp => opp.id === oppId)) return true;
       if (p.proposal_data?.service_address_id === addressId) return true;
       if (p.customer?.trim().toLowerCase() === customer?.name?.trim().toLowerCase() && !oppId) return true; // fallback for loose leads
       return false;
   }) || [];

   const projects = addressOpportunities.map(opp => {
       const oppWorkOrders = addressWorkOrders.filter(wo => wo.opportunity_id === opp.id);
       const oppProposals = addressProposals.filter(p => p.associated_opportunity_id === opp.id || p.proposal_data?.associated_opportunity_id === opp.id);
       return {
           ...opp,
           work_orders: oppWorkOrders,
           proposals: oppProposals
       };
   });

   // Handle unassigned/loose proposals and work orders (edge case cleanup)
   const assignedWoIds = projects.flatMap(p => p.work_orders.map(w => w.id));
   const assignedPropIds = projects.flatMap(p => p.proposals.map(pr => pr.id));
   const looseWorkOrders = addressWorkOrders.filter(wo => !assignedWoIds.includes(wo.id));
   const looseProposals = addressProposals.filter(p => !assignedPropIds.includes(p.id));

   if (looseWorkOrders.length > 0) {
      projects.push({
         id: 'loose-wos',
         status: 'Orphaned Operations',
         issue_description: 'Unlinked Dispatch Items',
         created_at: new Date().toISOString(),
         work_orders: looseWorkOrders,
         proposals: []
      });
   }
   if (looseProposals.length > 0) {
      projects.push({
         id: 'loose-props',
         status: 'Orphaned Quotes',
         issue_description: 'Unlinked Financial Documents',
         created_at: new Date().toISOString(),
         work_orders: [],
         proposals: looseProposals
      });
   }

   return (
      <div className="space-y-6">
        <section className="detail-card glass-panel full-width border-l-4 border-l-primary-500 shadow-sm relative overflow-hidden bg-gradient-to-br from-white to-slate-50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-bl-full opacity-30 pointer-events-none mix-blend-multiply"></div>
          <div className="absolute bottom-0 left-32 w-48 h-48 bg-secondary-100 rounded-tr-full opacity-20 pointer-events-none mix-blend-multiply"></div>
          
          <div className="card-header-row mb-8 relative z-10 flex justify-between items-end border-b border-slate-100 pb-4">
            <div>
               <h2 className="card-title text-slate-800 m-0 mb-1 flex items-center gap-2">
                  <FileText size={20} className="text-primary-500"/> Active Projects
               </h2>
               <p className="text-xs text-slate-500 font-medium">Unified timeline of deals, quotes, and dispatch orders.</p>
            </div>
            {projects.length > 0 && (
               <div className="text-[10px] font-black uppercase tracking-widest text-primary-700 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-200/50 flex items-center gap-2 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.8)]"></span>
                  {projects.length} Active {projects.length === 1 ? 'Project' : 'Projects'}
               </div>
            )}
          </div>
          
          <div className="relative z-10">
             {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                   {projects.map(project => (
                      <ProjectCard key={project.id} project={project} navigate={navigate} setViewingProposal={setViewingProposal} setViewingContract={setViewingContract} setViewingInvoice={setViewingInvoice} />
                   ))}
                </div>
             ) : (
                <div className="text-center py-16 bg-white/60  border border-slate-200 border-dashed rounded-2xl shadow-sm transition-all hover:bg-white hover:border-slate-300">
                   <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm relative">
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary-100 rounded-full animate-ping opacity-75"></div>
                      <Plus size={24} className="text-slate-300" />
                   </div>
                   <h3 className="text-slate-700 font-bold mb-1 text-lg tracking-tight">No Active Projects</h3>
                   <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium">This property currently has no active sales pipeline or scheduled work orders.</p>
                   <button onClick={() => navigate('/pipeline')} className="mt-6 text-xs font-bold bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-lg shadow-sm hover:shadow hover:border-slate-300 hover:text-primary-600 transition-all flex items-center justify-center gap-2 mx-auto">
                       Open Pipeline <ChevronRight size={14}/>
                   </button>
                </div>
             )}
          </div>
        </section>
      </div>
   );
}

function AddressDetail() {
  const { id, addressId } = useParams();
  const navigate = useNavigate();
  const { customers, addUnitToAddress, deleteUnit } = useCustomers();
  
  const customer = customers.find(c => c.id === id);
  const address = customer?.locations?.find(l => l.id === addressId);
  
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ unit_number: '', system_type: '', description: '' });
  const [viewingProposal, setViewingProposal] = useState(null);
  const [viewingContract, setViewingContract] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  
  const [unitToDelete, setUnitToDelete] = useState(null);

  if (!customer || !address) {
     return <div className="page-container flex-center"><h3>Address Not Found</h3><button className="btn-primary mt-4" onClick={() => navigate(`/customers/${id}`)}>Go Back</button></div>;
  }

  const units = address.property_details?.units || [];

  const handleAddUnit = async (e) => {
     e.preventDefault();
     await addUnitToAddress(id, addressId, unitForm);
     setIsAddUnitOpen(false);
     setUnitForm({ unit_number: '', system_type: '', description: '' });
  };
  
  const handleDeleteUnit = async () => {
     if (!unitToDelete) return;
     await deleteUnit(id, addressId, unitToDelete.id);
     setUnitToDelete(null);
  };

  const parseSpecs = (desc) => {
      if (!desc) return [];
      const specs = [];
      const tonsMatch = desc.match(/(\d+(\.\d+)?)\s*Ton/i);
      const seerMatch = desc.match(/(\d+(\.\d+)?)\s*SEER/i);
      if (tonsMatch) specs.push({ label: tonsMatch[0], icon: <Activity size={12}/>, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' });
      if (seerMatch) specs.push({ label: seerMatch[0], icon: <Zap size={12}/>, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
      return specs;
  };

  return (
     <div className="page-container">
        <button className="back-btn group mb-6" onClick={() => navigate(`/customers/${id}`)}>
          <ChevronRight size={18} className="icon-flip group-hover:-translate-x-1 transition-transform" /> Back to Customer
        </button>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-xl mb-8 border border-slate-700/50 p-8">
           <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary-500/10 rounded-full"></div>
           <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-indigo-500/10 rounded-full"></div>
           <div className="relative z-10 flex justify-between items-center">
               <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Property Units</h1>
                  <p className="text-slate-300 flex items-center gap-2 font-medium"><MapPin size={16} className="text-primary-400"/> {address.street_address} {address.city && `, ${address.city}`}</p>
               </div>
               <button onClick={() => setIsAddUnitOpen(true)} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold">
                  <Plus size={16} /> Add Custom Unit
               </button>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
           {units.length > 0 ? units.map(unit => {
               const badges = parseSpecs(unit.description);
               return (
               <div key={unit.id} className="group relative bg-white border border-slate-200/80 rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary-300 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer" onClick={() => navigate(`/customers/${id}/address/${addressId}/unit/${unit.id}`)}>
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                                 <Settings size={18} className="text-slate-500" />
                             </div>
                             <div>
                                 <h3 className="font-extrabold text-lg text-slate-800 leading-tight">Unit {unit.unit_number}</h3>
                                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{unit.system_type || 'Unknown System'}</p>
                             </div>
                         </div>
                      </div>
                      
                      {badges.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                              {badges.map((b, i) => (
                                  <span key={i} className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md border ${b.color}`}>
                                      {b.icon} {b.label}
                                  </span>
                              ))}
                          </div>
                      )}
                      
                      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{unit.description || 'No description provided'}</p>
                  </div>
                  <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center mt-auto" onClick={(e) => e.stopPropagation()}>
                     <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-300"/> 
                        {unit.history?.length || 0} event{unit.history?.length !== 1 ? 's' : ''}
                     </div>
                     <button onClick={(e) => { e.preventDefault(); setUnitToDelete(unit); }} className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-full hover:bg-red-50 relative z-20">
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
           )}) : (
              <div className="col-span-full flex flex-col items-center justify-center p-16 bg-white/60  border border-slate-200 border-dashed rounded-2xl shadow-sm">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-inner">
                    <Box size={24} className="text-slate-300" />
                 </div>
                 <h3 className="text-slate-700 font-bold mb-1 text-lg">No Property Units</h3>
                 <p className="text-slate-500 font-medium max-w-sm text-center">Add manually or complete a digital proposal to automatically generate units here.</p>
              </div>
           )}
        </div>

        <AddressOperations id={id} addressId={addressId} address={address} customer={customer} setViewingProposal={setViewingProposal} setViewingContract={setViewingContract} setViewingInvoice={setViewingInvoice} />

        <Modal isOpen={isAddUnitOpen} onClose={() => setIsAddUnitOpen(false)} title="Add New Unit">
           <form className="modal-form" onSubmit={handleAddUnit}>
              <div className="form-group">
                 <label>Unit Number / Name</label>
                 <input type="text" value={unitForm.unit_number} onChange={e => setUnitForm({...unitForm, unit_number: e.target.value})} required placeholder="e.g. 1A or Rooftop AC" />
              </div>
              <div className="form-group">
                 <label>System Type</label>
                 <input type="text" value={unitForm.system_type} onChange={e => setUnitForm({...unitForm, system_type: e.target.value})} required placeholder="e.g. Heat Pump, Furnace" />
              </div>
              <div className="form-group">
                 <label>Description & Specs</label>
                 <textarea value={unitForm.description} onChange={e => setUnitForm({...unitForm, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" placeholder="e.g. Trane 3 Ton 16 SEER..." rows={3}></textarea>
              </div>
              <div className="modal-actions mt-6">
                 <button type="button" className="btn-secondary" onClick={() => setIsAddUnitOpen(false)}>Cancel</button>
                 <button type="submit" className="btn-primary">Save Unit</button>
              </div>
           </form>
        </Modal>

        <Modal isOpen={!!unitToDelete} onClose={() => setUnitToDelete(null)} title="Delete Unit?">
           <div className="p-4 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                 <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete {unitToDelete?.unit_number}?</h3>
              <p className="text-sm text-slate-500 mb-6">This will permanently remove the unit and its entire service history from the property. This cannot be undone.</p>
              <div className="flex gap-3 w-full">
                  <button onClick={() => setUnitToDelete(null)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-2.5 rounded-lg font-bold hover:bg-slate-50">Cancel</button>
                  <button onClick={handleDeleteUnit} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-bold shadow-sm transition-colors">Yes, Delete Unit</button>
              </div>
           </div>
        </Modal>

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
         
         <InvoiceDocument 
           isOpen={!!viewingInvoice} 
           onClose={() => setViewingInvoice(null)} 
           invoice={viewingInvoice} 
         />
     </div>
  );
}

function UnitDetail() {
  const { id, addressId, unitId } = useParams();
  const navigate = useNavigate();
  const { customers, addHistoryToUnit, updateUnit, mergeUnits, undoMerge } = useCustomers();
  const { canViewFinancials } = useRole();
  
  const customer = customers.find(c => c.id === id);
  const address = customer?.locations?.find(l => l.id === addressId);
  const unit = address?.property_details?.units?.find(u => u.id === unitId);
  
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [eventForm, setEventForm] = useState({ 
     type: 'Service', description: '', technician: '', cost: '', resolution: '',
     photos: [], 
     diagnostic_data: { high_pressure: '', low_pressure: '', superheat: '', subcooling: '', amps: '', volts: '' }
  });
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const handlePhotoUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      
      setUploadingMedia(true);
      try {
          const newPhotos = [];
          for (const file of files) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
              const filePath = `${id}/${unitId}/${fileName}`;
              
              const { error: uploadError } = await supabase.storage
                  .from('unit_media')
                  .upload(filePath, file);
                  
              if (uploadError) throw uploadError;
              
              const { data } = supabase.storage.from('unit_media').getPublicUrl(filePath);
              newPhotos.push(data.publicUrl);
          }
          
          setEventForm(prev => ({
              ...prev,
              photos: [...(prev.photos || []), ...newPhotos]
          }));
          toast.success("Photos uploaded successfully.");
      } catch (error) {
          console.error("Error uploading photo:", error);
          toast.error("Upload failed: Please ensure 'unit_media' bucket exists and is public.");
      } finally {
          setUploadingMedia(false);
      }
  };
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ 
     unit_number: '', system_type: '', description: '', brand: '', tonnage: '', seer: '',
     install_date: '', parts_warranty_years: '', labor_warranty_years: '', serial_number: '', model_number: '', filter_size: ''
  });

  if (!unit) {
     return <div className="page-container flex-center"><h3>Unit Not Found</h3><button className="btn-primary mt-4" onClick={() => navigate(`/customers/${id}/address/${addressId}`)}>Go Back</button></div>;
  }

  const handleAddEvent = async (e) => {
     e.preventDefault();
     await addHistoryToUnit(id, addressId, unitId, eventForm);
     setIsAddEventOpen(false);
     setEventForm({ 
         type: 'Service', description: '', technician: '', cost: '', resolution: '',
         photos: [], 
         diagnostic_data: { high_pressure: '', low_pressure: '', superheat: '', subcooling: '', amps: '', volts: '' }
     });
  };
  
  const handleEditUnit = async (e) => {
     e.preventDefault();
     await updateUnit(id, addressId, unitId, editForm);
     setIsEditOpen(false);
  };
  
  const openEdit = () => {
     setEditForm({ 
         unit_number: unit.unit_number || '', 
         system_type: unit.system_type || '', 
         description: unit.description || '',
         brand: unit.brand || '',
         tonnage: unit.tonnage || '',
         seer: unit.seer || '',
         install_date: unit.install_date || '',
         parts_warranty_years: unit.parts_warranty_years || '',
         labor_warranty_years: unit.labor_warranty_years || '',
         serial_number: unit.serial_number || '',
         model_number: unit.model_number || '',
         filter_size: unit.filter_size || ''
     });
     setIsEditOpen(true);
  };

  const handleMergeUnits = async (e) => {
     e.preventDefault();
     if (!mergeSourceId) return;
     const sourceId = mergeSourceId;
     setIsMergeOpen(false);
     setMergeSourceId('');
     
     // Wrap in setTimeout to ensure modal unmounts cleanly before context updates
     setTimeout(async () => {
         await mergeUnits(id, addressId, unitId, sourceId);
     }, 0);
  };

  const handleUndoMerge = async (eventId) => {
     if (window.confirm("Are you sure you want to undo this merge? The legacy unit will be restored and its history separated.")) {
        await undoMerge(id, addressId, unitId, eventId);
     }
  };

  const tonsMatch = unit.tonnage ? [unit.tonnage] : unit.description?.match(/(\d+(\.\d+)?)\s*Ton/i);
  const seerMatch = unit.seer ? [unit.seer] : unit.description?.match(/(\d+(\.\d+)?)\s*SEER/i);
  const brandMatch = unit.brand || unit.description?.split(' ')[0];

  return (
     <div className="page-container max-w-5xl mx-auto">
        <button className="back-btn group mb-6" onClick={() => navigate(`/customers/${id}/address/${addressId}`)}>
          <ChevronRight size={18} className="icon-flip group-hover:-translate-x-1 transition-transform" /> Back to Units
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
           <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-8 relative">
              <div className="absolute right-0 top-0 w-64 h-full bg-primary-500/10 rounded-l-full"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10  shadow-inner">
                        <Box size={32} className="text-white" />
                    </div>
                    <div>
                       <div className="flex items-center gap-3 mb-1">
                          <h1 className="text-3xl font-black text-white tracking-tight">{unit.unit_number}</h1>
                          <span className="bg-slate-800 border border-slate-600 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest">{unit.system_type || 'System'}</span>
                       </div>
                       <p className="text-white opacity-80 font-medium flex items-center gap-2 text-sm"><MapPin size={14}/> {address.street_address}</p>
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <button onClick={() => setIsMergeOpen(true)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold">
                       Merge History
                    </button>
                    <button onClick={openEdit} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold">
                       <Settings size={16} /> Edit Specs
                    </button>
                    <button onClick={() => setIsAddEventOpen(true)} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-bold border border-primary-400/50">
                       <Plus size={16} /> Log Activity
                    </button>
                 </div>
              </div>
           </div>
           <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 bg-slate-50/50">
               <div className="lg:col-span-2 space-y-6">
                  <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Technical Description</h3>
                      <p className="text-slate-700 leading-relaxed font-medium bg-white p-4 rounded-xl border border-slate-200 shadow-sm">{unit.description || 'No description provided.'}</p>
                  </div>
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Equipment Data</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1.5 hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Box size={12}/> Model Number</span>
                            <span className="text-base font-mono font-black text-slate-800 break-all">{unit.model_number || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1.5 hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Box size={12}/> Serial Number</span>
                            <span className="text-base font-mono font-black text-slate-800 break-all">{unit.serial_number || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1.5 hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CalendarClock size={12}/> Install Date</span>
                            <span className="text-base font-black text-slate-800">{unit.install_date ? new Date(unit.install_date).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:shadow-md transition-shadow">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Shield size={12}/> Warranties</span>
                            <div className="flex flex-col gap-2 mt-auto">
                                {['parts', 'labor'].map(type => {
                                   const years = type === 'parts' ? unit.parts_warranty_years : unit.labor_warranty_years;
                                   let status = 'Unknown';
                                   let statusClass = 'bg-slate-50 text-slate-500 border-slate-200';
                                   if (unit.install_date && years) {
                                       const install = new Date(unit.install_date);
                                       const expDate = new Date(install.setFullYear(install.getFullYear() + parseInt(years)));
                                       if (expDate > new Date()) {
                                           status = `Valid (${years} Yr)`;
                                           statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                       } else {
                                           status = `Expired (${years} Yr)`;
                                           statusClass = 'bg-red-50 text-red-700 border-red-200';
                                       }
                                   }
                                   return (
                                      <div key={type} className="flex justify-between items-center">
                                          <span className="text-xs font-bold text-slate-600 capitalize">{type}</span>
                                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${statusClass}`}>{status}</span>
                                      </div>
                                   )
                                })}
                            </div>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="space-y-6">
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">System Specifications</h3>
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <span className="text-sm font-bold text-slate-600">Brand</span>
                            <span className="text-sm font-bold text-slate-800">{brandMatch || 'N/A'}</span>
                        </div>
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Activity size={14} className="text-indigo-500"/> Tonnage</span>
                            <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{tonsMatch ? tonsMatch[0] : 'N/A'}</span>
                        </div>
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Zap size={14} className="text-emerald-500"/> Efficiency</span>
                            <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{seerMatch ? seerMatch[0] : 'N/A'}</span>
                        </div>
                        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                            <span className="text-sm font-bold text-slate-600">Filter Size</span>
                            <span className="text-sm font-bold text-slate-800">{unit.filter_size || 'N/A'}</span>
                        </div>
                     </div>
                  </div>
               </div>
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
              <h2 className="font-extrabold text-slate-800 text-xl flex items-center gap-2"><FileText size={20} className="text-primary-500"/> Clinical History</h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">{unit.history?.length === 1 ? '1 Event Logged' : (unit.history?.length || 0) + ' Events Logged'}</span>
           </div>
           <div className="p-0">
              {unit.history && unit.history.length > 0 ? (
                 <div className="relative border-l-2 border-slate-100 ml-8 my-8 space-y-8 py-4">
                    {[...unit.history].reverse().map((event, index) => (
                       <div key={event.id} className="relative pl-8 pr-8">
                          <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${event.type === 'Maintenance' ? 'bg-amber-400' : event.type === 'Installation' ? 'bg-success-500' : 'bg-primary-500'}`}></div>
                          <div onClick={() => setSelectedEvent(event)} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md hover:border-primary-300 transition-all cursor-pointer group">
                              <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded border uppercase tracking-widest ${event.type === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' : event.type === 'Installation' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-primary-50 text-primary-700 border-primary-200'}`}>
                                       {event.type}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Calendar size={12}/> {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                      {event.photos && event.photos.length > 0 && (
                                         <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded flex items-center gap-1"><Box size={10}/> {event.photos.length}</span>
                                      )}
                                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(event.date).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      {event.cost && <span className="font-black text-slate-700 bg-slate-100 px-2 py-1 rounded text-sm">{canViewFinancials() ? `$${parseFloat(event.cost).toLocaleString('en-US', {minimumFractionDigits: 2})}` : '***'}</span>}
                                      <button className="text-primary-600 hover:text-primary-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-primary-200/50 hover:bg-primary-50 transition-all shadow-sm" onClick={() => setSelectedEvent(event)}>Details</button>
                                  </div>
                              </div>
                              <p className="text-slate-600 text-sm mt-3 leading-relaxed font-medium line-clamp-2 group-hover:text-slate-800 transition-colors">{event.description?.replace(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/ig, (id) => 'P2026-' + id.substring(0,6).toUpperCase())}</p>
                              <div className="flex justify-between items-center mt-4">
                                   {event.technician ? <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider"><UserIcon size={12}/> Tech: {event.technician}</div> : <div></div>}
                                   <div className="text-[10px] font-bold text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Full Dossier <ChevronRight size={12}/></div>
                               </div>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="p-16 flex flex-col items-center justify-center text-center">
                     <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                         <Clock size={20} className="text-slate-300"/>
                     </div>
                     <p className="text-slate-500 font-bold text-lg">Clean Record</p>
                     <p className="text-slate-400 text-sm max-w-xs mt-1">No service history has been logged for this unit yet.</p>
                 </div>
              )}
           </div>
        </div>

        <Modal isOpen={isAddEventOpen} onClose={() => setIsAddEventOpen(false)} title="Log New Activity">
           <form className="modal-form" onSubmit={handleAddEvent}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                     <label>Activity Type</label>
                     <select value={eventForm.type} onChange={e => setEventForm({...eventForm, type: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white font-bold text-slate-700 outline-none focus:border-primary-500 transition-colors">
                        <option value="Service">🔧 Service / Repair</option>
                        <option value="Maintenance">🛡️ Maintenance</option>
                        <option value="Installation">📦 Installation</option>
                     </select>
                  </div>
                  <div className="form-group">
                     <label>Resolution Status</label>
                     <select value={eventForm.resolution} onChange={e => setEventForm({...eventForm, resolution: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white font-bold text-slate-700 outline-none focus:border-primary-500 transition-colors">
                        <option value="">-- Select Status --</option>
                        <option value="Fixed / Complete">Fixed / Complete</option>
                        <option value="Needs Parts">Needs Parts</option>
                        <option value="Recommended Replacement">Recommended Replacement</option>
                        <option value="Monitoring">Monitoring</option>
                     </select>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="form-group">
                     <label>Technician(s) Name</label>
                     <input type="text" value={eventForm.technician} onChange={e => setEventForm({...eventForm, technician: e.target.value})} placeholder="e.g. John Doe, Jane Smith" />
                  </div>
                  {canViewFinancials() && (
                      <div className="form-group">
                         <label>Cost / Invoice Amount</label>
                         <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                             <input type="number" step="0.01" style={{ paddingLeft: '1.75rem' }} value={eventForm.cost} onChange={e => setEventForm({...eventForm, cost: e.target.value})} placeholder="0.00" />
                         </div>
                      </div>
                  )}
              </div>
              
              <div className="mt-6 mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Diagnostic Data (Optional)</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
                      <div className="form-group">
                          <label className="text-[10px]">High Pressure</label>
                          <input type="text" className="text-xs p-2" value={eventForm.diagnostic_data.high_pressure} onChange={e => setEventForm({...eventForm, diagnostic_data: {...eventForm.diagnostic_data, high_pressure: e.target.value}})} placeholder="psig" />
                      </div>
                      <div className="form-group">
                          <label className="text-[10px]">Low Pressure</label>
                          <input type="text" className="text-xs p-2" value={eventForm.diagnostic_data.low_pressure} onChange={e => setEventForm({...eventForm, diagnostic_data: {...eventForm.diagnostic_data, low_pressure: e.target.value}})} placeholder="psig" />
                      </div>
                      <div className="form-group">
                          <label className="text-[10px]">Superheat</label>
                          <input type="text" className="text-xs p-2" value={eventForm.diagnostic_data.superheat} onChange={e => setEventForm({...eventForm, diagnostic_data: {...eventForm.diagnostic_data, superheat: e.target.value}})} placeholder="°F" />
                      </div>
                      <div className="form-group">
                          <label className="text-[10px]">Subcooling</label>
                          <input type="text" className="text-xs p-2" value={eventForm.diagnostic_data.subcooling} onChange={e => setEventForm({...eventForm, diagnostic_data: {...eventForm.diagnostic_data, subcooling: e.target.value}})} placeholder="°F" />
                      </div>
                      <div className="form-group">
                          <label className="text-[10px]">Compressor Amps</label>
                          <input type="text" className="text-xs p-2" value={eventForm.diagnostic_data.amps} onChange={e => setEventForm({...eventForm, diagnostic_data: {...eventForm.diagnostic_data, amps: e.target.value}})} placeholder="A" />
                      </div>
                      <div className="form-group">
                          <label className="text-[10px]">Voltage</label>
                          <input type="text" className="text-xs p-2" value={eventForm.diagnostic_data.volts} onChange={e => setEventForm({...eventForm, diagnostic_data: {...eventForm.diagnostic_data, volts: e.target.value}})} placeholder="V" />
                      </div>
                  </div>
              </div>

              <div className="form-group">
                 <label>Activity Description & Tech Notes</label>
                 <textarea value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" placeholder="Detailed notes about the work performed..." required rows={4}></textarea>
              </div>

              <div className="form-group mt-4">
                  <label className="flex items-center justify-between">
                     <span>Media Gallery</span>
                     <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{eventForm.photos?.length || 0} Photos Attached</span>
                  </label>
                  <div className="mt-2 border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center relative hover:bg-slate-100 transition-colors">
                      <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={uploadingMedia} />
                      {uploadingMedia ? (
                          <div className="flex flex-col items-center gap-2 text-primary-500">
                             <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                             <span className="text-xs font-bold">Uploading to Cloud...</span>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-500">
                              <Plus size={24} className="text-slate-400 mb-1" />
                              <span className="text-sm font-bold text-slate-600">Click to attach photos</span>
                              <span className="text-[10px] text-slate-400 font-medium">JPEG, PNG, HEIC</span>
                          </div>
                      )}
                  </div>
                  {eventForm.photos && eventForm.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                          {eventForm.photos.map((url, i) => (
                              <img key={i} src={url} alt="Attached media" className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                          ))}
                      </div>
                  )}
              </div>
              <div className="modal-actions mt-6">
                 <button type="button" className="btn-secondary" onClick={() => setIsAddEventOpen(false)}>Cancel</button>
                 <button type="submit" className="btn-primary">Save Activity</button>
              </div>
           </form>
        </Modal>
        
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Unit Specs">
           <form className="modal-form" onSubmit={handleEditUnit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-group">
                     <label>Unit Name / Number</label>
                     <input type="text" value={editForm.unit_number} onChange={e => setEditForm({...editForm, unit_number: e.target.value})} required placeholder="e.g. 1A" />
                  </div>
                  <div className="form-group">
                     <label>System Type</label>
                     <input type="text" value={editForm.system_type} onChange={e => setEditForm({...editForm, system_type: e.target.value})} required placeholder="e.g. Split System" />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="form-group">
                     <label>Brand</label>
                     <input type="text" value={editForm.brand} onChange={e => setEditForm({...editForm, brand: e.target.value})} placeholder="e.g. Daikin" />
                  </div>
                  <div className="form-group">
                     <label>Tonnage</label>
                     <input type="text" value={editForm.tonnage} onChange={e => setEditForm({...editForm, tonnage: e.target.value})} placeholder="e.g. 3 Ton" />
                  </div>
                  <div className="form-group">
                     <label>SEER</label>
                     <input type="text" value={editForm.seer} onChange={e => setEditForm({...editForm, seer: e.target.value})} placeholder="e.g. 16 SEER" />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="form-group">
                     <label>Serial Number</label>
                     <input type="text" value={editForm.serial_number} onChange={e => setEditForm({...editForm, serial_number: e.target.value})} placeholder="e.g. WX8482029" />
                  </div>
                  <div className="form-group">
                     <label>Model Number</label>
                     <input type="text" value={editForm.model_number} onChange={e => setEditForm({...editForm, model_number: e.target.value})} placeholder="e.g. GSX160361" />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="form-group">
                     <label>Filter Size</label>
                     <input type="text" value={editForm.filter_size} onChange={e => setEditForm({...editForm, filter_size: e.target.value})} placeholder="e.g. 20x25x1" />
                  </div>
                  <div className="form-group">
                     <label>Install Date</label>
                     <input type="date" value={editForm.install_date} onChange={e => setEditForm({...editForm, install_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                     <label>Warranty (Yrs)</label>
                     <div className="flex gap-2">
                        <input type="number" min="0" value={editForm.parts_warranty_years} onChange={e => setEditForm({...editForm, parts_warranty_years: e.target.value})} placeholder="Parts" className="w-full sm:w-1/2" />
                        <input type="number" min="0" value={editForm.labor_warranty_years} onChange={e => setEditForm({...editForm, labor_warranty_years: e.target.value})} placeholder="Labor" className="w-full sm:w-1/2" />
                     </div>
                  </div>
              </div>
              <div className="form-group">
                 <label>Description & Specs</label>
                 <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none" placeholder="Full specification string..." required rows={4}></textarea>
                 <p className="text-xs text-slate-400 mt-2 font-medium">Tonnage and SEER ratings will fallback to automated parsing from this description block if explicitly left blank above.</p>
              </div>
              <div className="modal-actions mt-6">
                 <button type="button" className="btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
                 <button type="submit" className="btn-primary">Save Changes</button>
              </div>
           </form>
        </Modal>

        <Modal isOpen={isMergeOpen} onClose={() => setIsMergeOpen(false)} title="Merge Legacy Unit">
           <form className="modal-form" onSubmit={handleMergeUnits}>
              <p className="text-sm text-slate-500 mb-4">Select an older unit at this address to merge into this one. The legacy unit's entire service history will be absorbed, and the legacy unit itself will be permanently deleted.</p>
              <div className="form-group">
                 <label>Select Unit to Absorb</label>
                 <select value={mergeSourceId} onChange={e => setMergeSourceId(e.target.value)} required className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white font-bold text-slate-700 outline-none focus:border-primary-500 transition-colors">
                    <option value="" disabled>-- Select a Unit --</option>
                    {address?.property_details?.units?.filter(u => u.id !== unitId).map(u => (
                        <option key={u.id} value={u.id}>Unit {u.unit_number} ({u.system_type || 'Unknown Type'})</option>
                    ))}
                 </select>
                 {address?.property_details?.units?.filter(u => u.id !== unitId).length === 0 && <p className="text-xs text-amber-600 mt-2 font-medium">There are no other units at this address to merge.</p>}
              </div>
              <div className="modal-actions mt-6">
                 <button type="button" className="btn-secondary" onClick={() => setIsMergeOpen(false)}>Cancel</button>
                 <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50" disabled={!mergeSourceId}>Merge Unit</button>
              </div>
           </form>
        </Modal>

        <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title="Event Dossier">
            {selectedEvent && (
                <div className="space-y-6">
                    <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${selectedEvent.type === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' : selectedEvent.type === 'Installation' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-primary-50 text-primary-700 border-primary-200'}`}>
                                    {selectedEvent.type}
                                </span>
                                {selectedEvent.resolution && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-widest">
                                        {selectedEvent.resolution}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-black text-slate-800">{new Date(selectedEvent.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                        </div>
                        {selectedEvent.cost && <div className="text-right">
                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cost</span>
                            <span className="font-black text-slate-800 text-xl">{canViewFinancials() ? `$${parseFloat(selectedEvent.cost).toLocaleString('en-US', {minimumFractionDigits: 2})}` : '***'}</span>
                        </div>}
                    </div>

                    {selectedEvent.technician && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><UserIcon size={14}/> Assigned Technicians</h4>
                            <p className="text-sm font-bold text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">{selectedEvent.technician}</p>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileText size={14}/> Technician Notes & Description</h4>
                        <div className="text-sm text-slate-700 bg-white p-4 rounded-xl border border-slate-200 shadow-sm leading-relaxed whitespace-pre-wrap">
                            {selectedEvent.description?.replace(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/ig, (id) => 'P2026-' + id.substring(0,6).toUpperCase())}
                        </div>
                    </div>

                    {selectedEvent.diagnostic_data && Object.values(selectedEvent.diagnostic_data).some(v => v) && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Activity size={14}/> Diagnostic Data</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {selectedEvent.diagnostic_data.high_pressure && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">High Pressure</div>
                                        <div className="text-sm font-black text-slate-700">{selectedEvent.diagnostic_data.high_pressure} <span className="text-xs font-bold text-slate-400">psig</span></div>
                                    </div>
                                )}
                                {selectedEvent.diagnostic_data.low_pressure && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Low Pressure</div>
                                        <div className="text-sm font-black text-slate-700">{selectedEvent.diagnostic_data.low_pressure} <span className="text-xs font-bold text-slate-400">psig</span></div>
                                    </div>
                                )}
                                {selectedEvent.diagnostic_data.superheat && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Superheat</div>
                                        <div className="text-sm font-black text-slate-700">{selectedEvent.diagnostic_data.superheat} <span className="text-xs font-bold text-slate-400">°F</span></div>
                                    </div>
                                )}
                                {selectedEvent.diagnostic_data.subcooling && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Subcooling</div>
                                        <div className="text-sm font-black text-slate-700">{selectedEvent.diagnostic_data.subcooling} <span className="text-xs font-bold text-slate-400">°F</span></div>
                                    </div>
                                )}
                                {selectedEvent.diagnostic_data.amps && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Compressor Amps</div>
                                        <div className="text-sm font-black text-slate-700">{selectedEvent.diagnostic_data.amps} <span className="text-xs font-bold text-slate-400">A</span></div>
                                    </div>
                                )}
                                {selectedEvent.diagnostic_data.volts && (
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Voltage</div>
                                        <div className="text-sm font-black text-slate-700">{selectedEvent.diagnostic_data.volts} <span className="text-xs font-bold text-slate-400">V</span></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {selectedEvent.photos && selectedEvent.photos.length > 0 && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Tag size={14}/> Media Gallery</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {selectedEvent.photos.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-slate-200 shadow-sm aspect-square bg-slate-100">
                                        <img src={url} alt={`Media ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-100">
                        <button onClick={() => setSelectedEvent(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg font-bold transition-colors">Close Dossier</button>
                    </div>
                </div>
            )}
        </Modal>
     </div>
  );
}

function ActivityTimeline({ householdId }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('household_id', householdId)
                .order('created_at', { ascending: false });
            if (!error && data) {
                setLogs(data);
            }
            setLoading(false);
        };
        fetchLogs();
    }, [householdId]);

    if (loading) return <div className="p-4 text-center text-slate-500 text-sm">Loading audit history...</div>;
    if (logs.length === 0) return <div className="p-4 text-center text-slate-500 text-sm">No activity recorded yet.</div>;

    return (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start relative pb-4 border-l-2 border-slate-100 ml-4 pl-4 last:border-transparent">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-primary-500 shadow-sm"></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{log.activity_type}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{log.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Customers() {
  return (
    <Routes>
      <Route path="/" element={<CustomerList />} />
      <Route path="/:id" element={<CustomerDetail />} />
      <Route path="/:id/address/:addressId" element={<AddressDetail />} />
      <Route path="/:id/address/:addressId/unit/:unitId" element={<UnitDetail />} />
    </Routes>
  );
}
