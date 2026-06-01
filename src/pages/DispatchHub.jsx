import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import { useAuth } from '../context/AuthContext';
import { Phone, User, MapPin, Search, Plus, AlertCircle, CalendarClock, Zap, CheckCircle2, UserCheck, Map } from 'lucide-react';
import { PIPELINE_STATES } from '../utils/pipelineControls';
import toast from 'react-hot-toast';
import DispatchCalendar from './DispatchCalendar';
import DispatchMap from '../components/DispatchMap';

export default function DispatchHub() {
   const { user } = useAuth();
   const { customers, addCustomer } = useCustomers();
   const [searchQuery, setSearchQuery] = useState('');
   const [searchResults, setSearchResults] = useState([]);
   const [matchedCustomer, setMatchedCustomer] = useState(null);
   const [isNewCustomer, setIsNewCustomer] = useState(false);
   const [loading, setLoading] = useState(false);
   const [activeTab, setActiveTab] = useState('map'); // default to map or intake

   // Customer Form
   const [customerForm, setCustomerForm] = useState({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      city: ''
   });

   // Opportunity / Service Form
   const [oppForm, setOppForm] = useState({
      type: 'SALES', // 'SALES' or 'SERVICE'
      urgency: 'Medium',
      callType: 'REPAIR', // 'REPAIR', 'MAINTENANCE', 'WARRANTY'
      tags: [],
      issueDescription: '',
      dispatchNotes: '',
      assignedSalespersonId: ''
   });

   // Sales Team Load
   const [teamLoad, setTeamLoad] = useState([]);

   React.useEffect(() => {
       const fetchTeamLoad = async () => {
           const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, avatar_url');
           const { data: oppsData } = await supabase.from('opportunities').select('assigned_salesperson_id, status').in('status', [PIPELINE_STATES.NEW_LEAD, PIPELINE_STATES.QUOTING, PIPELINE_STATES.SENT]);
           
           if (usersData) {
               const load = usersData.map(user => {
                   const count = oppsData ? oppsData.filter(o => o.assigned_salesperson_id === user.id).length : 0;
                   return { ...user, activeCount: count };
               }).sort((a, b) => a.activeCount - b.activeCount);
               setTeamLoad(load);
           }
       };
       fetchTeamLoad();
   }, []);

   const handleSearch = (e) => {
      const q = e.target.value.toLowerCase();
      setSearchQuery(q);
      
      if (q.length > 1) {
         const matches = customers.filter(c => 
            c.phone?.includes(q) || 
            c.name?.toLowerCase().includes(q) || 
            c.address?.toLowerCase().includes(q)
         );
         setSearchResults(matches);
      } else {
         setSearchResults([]);
      }
   };

   const handleCreateCustomer = async (e) => {
       e.preventDefault();
       setLoading(true);
       try {
           const fullName = `${customerForm.firstName} ${customerForm.lastName}`.trim();
           const response = await addCustomer({
              name: fullName,
              email: customerForm.email,
              phone: customerForm.phone,
              address: customerForm.address,
              city: customerForm.city,
              state: 'FL',
              zip: ''
           });
           
           if (!response.success) {
               toast.error(response.message || response.error || 'Failed to create customer');
               setLoading(false);
               return;
           }

           setMatchedCustomer({
               id: response.id,
               name: fullName,
               email: customerForm.email,
               phone: customerForm.phone,
               address: customerForm.address,
               city: customerForm.city
           });
           setIsNewCustomer(false);
           toast.success('Customer profile created successfully!');
       } catch (err) {
           toast.error(err.message);
       }
       setLoading(false);
   };

   const handleInjectOpportunity = async () => {
       if (!matchedCustomer) return toast.error("Please select or create a customer first.");
       if (!oppForm.issueDescription) return toast.error("Issue description is required.");
       
       setLoading(true);
       try {
           if (oppForm.type === 'SALES') {
               const { error } = await supabase.from('opportunities').insert({
                   household_id: matchedCustomer.id,
                   urgency_level: oppForm.urgency,
                   issue_description: oppForm.issueDescription,
                   dispatch_notes: oppForm.dispatchNotes,
                   assigned_salesperson_id: oppForm.assignedSalespersonId || null,
                   proposal_data: { type: oppForm.type },
                   status: PIPELINE_STATES.NEW_LEAD
               });

               if (error) throw error;
               
               toast.success(`Sales lead successfully injected!`);
           } else {
               // Service Routing
               const { error } = await supabase.from('service_calls').insert({
                   customer_id: matchedCustomer.id,
                   urgency: oppForm.urgency.toUpperCase(), // 'LOW', 'MEDIUM' -> 'NORMAL', 'HIGH' -> 'EMERGENCY'
                   issue_description: `${oppForm.issueDescription}\n\nDispatch Notes: ${oppForm.dispatchNotes}`,
                   status: 'Pending',
                   call_type: oppForm.callType,
                   tags: oppForm.tags
               });

               if (error) throw error;
               toast.success(`Service call successfully routed to Service Hub!`);
           }
           
           // Reset forms
           setSearchQuery('');
           setMatchedCustomer(null);
           setOppForm({ type: 'SALES', urgency: 'Medium', callType: 'REPAIR', tags: [], issueDescription: '', dispatchNotes: '', assignedSalespersonId: '' });
       } catch (err) {
           toast.error(err.message);
       }
       setLoading(false);
   };

   return (
       <div className="page-container fade-in flex flex-col h-full bg-slate-50/50">
           <header className="page-header pb-6 border-b border-slate-200">
               <div>
                   <h1 className="page-title text-3xl flex items-center gap-2"><Phone className="text-primary-600" /> Dispatch Hub</h1>
                   <p className="page-subtitle text-slate-500">Intake calls, log leads, and manage crew routing schedules.</p>
               </div>
               
               <div className="mt-6 flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-xl w-fit">
                    <button 
                        onClick={() => setActiveTab('intake')} 
                        className={`px-5 py-2.5 font-black text-sm rounded-lg transition-all flex items-center gap-2 ${activeTab === 'intake' ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                        <Plus size={16}/> Intake & Logging
                    </button>
                    <button 
                        onClick={() => setActiveTab('calendar')} 
                        className={`px-5 py-2.5 font-black text-sm rounded-lg transition-all flex items-center gap-2 ${activeTab === 'calendar' ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                        <CalendarClock size={16}/> Crew Routing
                    </button>
                    <button 
                        onClick={() => setActiveTab('map')} 
                        className={`px-5 py-2.5 font-black text-sm rounded-lg transition-all flex items-center gap-2 ${activeTab === 'map' ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                    >
                        <Map size={16}/> Live Map
                    </button>
               </div>
           </header>

           <div className="flex-1 overflow-hidden">
               {activeTab === 'intake' && (
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 h-full overflow-y-auto items-start">
                       {/* Left Column: Intake Search & Results */}
                       <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                           <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
                               <h2 className="font-bold flex items-center gap-2 text-slate-800"><Search size={18} className="text-primary-500" /> 1. Identify Caller</h2>
                           </div>
                           
                           <div className="p-6">
                               {!isNewCustomer && !matchedCustomer && (
                                   <div className="mb-2 flex flex-col gap-6">
                                       <div className="relative group">
                                           <Search className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                           <input 
                                              type="text" 
                                              placeholder="Search phone, name, or address..." 
                                              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 bg-slate-50 focus:bg-white transition-all text-sm text-slate-900 placeholder-slate-400 font-bold outline-none shadow-inner"
                                              value={searchQuery}
                                              onChange={handleSearch}
                                           />
                                           
                                           {searchResults.length > 0 && (
                                               <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[100] max-h-64 overflow-y-auto">
                                                   {searchResults.map(c => (
                                                       <div 
                                                          key={c.id} 
                                                          onClick={() => { setMatchedCustomer(c); setSearchResults([]); setSearchQuery(''); }}
                                                          className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                                       >
                                                           <div className="font-bold text-slate-800">{c.name || 'Unknown Customer'}</div>
                                                           <div className="text-[10px] font-bold text-slate-500 flex items-center gap-3 mt-1.5 flex-wrap uppercase tracking-wider">
                                                               {c.phone && <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" />{c.phone}</span>}
                                                               {(c.address || c.city) && <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" />{c.address}{c.address && c.city ? ', ' : ''}{c.city}</span>}
                                                           </div>
                                                       </div>
                                                   ))}
                                               </div>
                                           )}
                                       </div>
                                       
                                       <div className="flex flex-col items-center justify-center py-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                                          <User size={32} className="text-slate-300 mb-3" />
                                          <p className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-widest text-center px-4">Cannot find customer?</p>
                                          <button onClick={() => setIsNewCustomer(true)} className="px-5 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-primary-200 hover:text-primary-700 transition-all font-black text-xs text-slate-600 uppercase tracking-widest shadow-sm flex items-center gap-2 active:scale-95">
                                             <Plus size={16} /> Create New Profile
                                          </button>
                                       </div>
                                   </div>
                               )}

                               {matchedCustomer && (
                                   <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 border-2 border-primary-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                                       <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-200/50 rounded-full blur-2xl pointer-events-none"></div>
                                       <div className="absolute top-5 right-5 bg-primary-600 text-white p-1.5 rounded-full shadow-md"><CheckCircle2 size={20} /></div>
                                       <h3 className="font-black text-2xl text-slate-800 mb-2 tracking-tight">{matchedCustomer.name}</h3>
                                       <div className="flex items-center gap-2.5 text-slate-700 mb-2 font-medium"><Phone size={16} className="text-primary-600" /> {matchedCustomer.phone}</div>
                                       <div className="flex items-start gap-2.5 text-slate-700 font-medium"><MapPin size={16} className="text-primary-600 mt-0.5" /> {matchedCustomer.address}, {matchedCustomer.city}</div>
                                       <button onClick={() => { setMatchedCustomer(null); setSearchQuery(''); }} className="mt-5 px-4 py-2 bg-white/80 hover:bg-white border border-primary-200 rounded-lg text-xs font-black text-primary-700 transition-all uppercase tracking-wider shadow-sm">Change Customer</button>
                                   </div>
                               )}

                               {isNewCustomer && (
                                   <form onSubmit={handleCreateCustomer} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                       <div className="grid grid-cols-2 gap-4 mb-4">
                                           <div className="form-group">
                                               <label className="text-xs font-bold text-slate-500">First Name</label>
                                               <input required type="text" value={customerForm.firstName} onChange={e => setCustomerForm({...customerForm, firstName: e.target.value})} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                                           </div>
                                           <div className="form-group">
                                               <label className="text-xs font-bold text-slate-500">Last Name</label>
                                               <input required type="text" value={customerForm.lastName} onChange={e => setCustomerForm({...customerForm, lastName: e.target.value})} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                                           </div>
                                       </div>
                                       <div className="grid grid-cols-2 gap-4 mb-4">
                                           <div className="form-group">
                                               <label className="text-xs font-bold text-slate-500">Phone Number</label>
                                               <input required type="tel" value={customerForm.phone} onChange={e => setCustomerForm({...customerForm, phone: e.target.value})} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                                           </div>
                                           <div className="form-group">
                                               <label className="text-xs font-bold text-slate-500">Email Address</label>
                                               <input type="email" value={customerForm.email} onChange={e => setCustomerForm({...customerForm, email: e.target.value})} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                                           </div>
                                       </div>
                                       <div className="form-group mb-4">
                                           <label className="text-xs font-bold text-slate-500">Street Address</label>
                                           <input required type="text" value={customerForm.address} onChange={e => setCustomerForm({...customerForm, address: e.target.value})} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                                       </div>
                                       <div className="form-group mb-6">
                                           <label className="text-xs font-bold text-slate-500">City</label>
                                           <input required type="text" value={customerForm.city} onChange={e => setCustomerForm({...customerForm, city: e.target.value})} className="w-full border p-2.5 rounded-lg text-slate-900 placeholder-slate-400 bg-white" />
                                       </div>
                                       <div className="flex gap-3">
                                           <button type="button" onClick={() => setIsNewCustomer(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                                           <button type="submit" disabled={loading} className="btn-primary flex-1 py-2.5">Save Profile</button>
                                       </div>
                                   </form>
                               )}
                           </div>
                       </div>
                   </div>

                   {/* RIGHT PANEL: Opportunity Injection */}
                   <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
                       <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${matchedCustomer ? 'border-primary-300 ring-4 ring-primary-500/10' : 'border-slate-200 opacity-60 pointer-events-none grayscale-[50%]'}`}>
                           <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between">
                               <h2 className="font-bold flex items-center gap-2 text-slate-800"><Zap size={18} className="text-amber-500" /> 2. Intake Issue & Route</h2>
                           </div>
                           
                           <div className="p-6">
                               <div className="grid grid-cols-2 gap-6 mb-6">
                                   <div className="form-group">
                                       <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Opportunity Type</label>
                                       <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                                           <button 
                                              onClick={() => setOppForm({...oppForm, type: 'SALES'})}
                                              className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all duration-300 ${oppForm.type === 'SALES' ? 'bg-white shadow-md text-primary-700 ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                           >
                                              Sales Quote
                                           </button>
                                           <button 
                                              onClick={() => setOppForm({...oppForm, type: 'SERVICE'})}
                                              className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all duration-300 ${oppForm.type === 'SERVICE' ? 'bg-white shadow-md text-purple-700 ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                           >
                                              Service Call
                                           </button>
                                       </div>
                                       <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                           {oppForm.type === 'SALES' ? 'Will be routed directly to the Sales Proposals queue.' : 'Will be routed strictly to the Service Board.'}
                                        </p>
                                    </div>

                                    {oppForm.type === 'SERVICE' && (
                                        <div className="form-group mb-6 col-span-2">
                                            <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Service Call Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {['REPAIR', 'MAINTENANCE', 'WARRANTY', 'PROPOSAL_FOLLOWUP'].map(ctype => (
                                                    <button
                                                        key={ctype}
                                                        onClick={() => setOppForm({...oppForm, callType: ctype})}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${oppForm.callType === ctype ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                    >
                                                        {ctype.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="form-group">
                                        <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Response Urgency</label>
                                       <select 
                                          value={oppForm.urgency}
                                          onChange={(e) => setOppForm({...oppForm, urgency: e.target.value})}
                                          className={`w-full border p-2.5 rounded-lg text-sm font-bold ${oppForm.urgency === 'High' ? 'bg-red-50 text-red-700 border-red-200' : oppForm.urgency === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-700'}`}
                                       >
                                           <option value="Low">Low - Working/Maintenance</option>
                                           <option value="Medium">Medium - Failing/Noisy</option>
                                           <option value="High">Emergency - System Down!</option>
                                       </select>
                                   </div>
                               </div>

                               <div className="form-group mb-6">
                                   <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Customer Issue Description <span className="text-red-500">*</span></label>
                                   <textarea 
                                      value={oppForm.issueDescription}
                                      onChange={(e) => setOppForm({...oppForm, issueDescription: e.target.value})}
                                      className="w-full border border-slate-200 p-4 rounded-xl h-24 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white transition-all outline-none font-medium shadow-inner"
                                      placeholder="What is the customer reporting?"
                                   />
                               </div>

                               {oppForm.type === 'SALES' && (
                                   <div className="form-group mb-6">
                                       <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider flex items-center gap-2">
                                           <UserCheck size={14} className="text-primary-500" /> Sales Team Load Board
                                       </label>
                                       <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1">
                                           <div className="flex items-center gap-2 px-3 py-1 mb-1">
                                               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-1">Representative</span>
                                               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-16 text-center">Active</span>
                                               <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-24 text-center">Capacity</span>
                                           </div>
                                           {teamLoad.map(rep => {
                                               const isSelected = oppForm.assignedSalespersonId === rep.id;
                                               let capacityColor = 'bg-emerald-500';
                                               let capacityText = 'Ready';
                                               if (rep.activeCount > 2) { capacityColor = 'bg-amber-500'; capacityText = 'Busy'; }
                                               if (rep.activeCount > 5) { capacityColor = 'bg-red-500'; capacityText = 'Overloaded'; }

                                               return (
                                                   <button 
                                                      key={rep.id}
                                                      onClick={() => setOppForm({...oppForm, assignedSalespersonId: isSelected ? '' : rep.id})}
                                                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${isSelected ? 'bg-primary-50 border border-primary-200 shadow-sm ring-1 ring-primary-500/20' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                                                   >
                                                       <div className="flex-1 flex items-center gap-2 min-w-0">
                                                           {rep.avatar_url ? (
                                                               <img src={rep.avatar_url} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                                           ) : (
                                                               <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                                                   {rep.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?'}
                                                               </div>
                                                           )}
                                                           <span className={`text-sm font-bold truncate ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>{rep.full_name}</span>
                                                       </div>
                                                       <div className="w-16 text-center">
                                                           <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold font-mono">{rep.activeCount}</span>
                                                       </div>
                                                       <div className="w-24 flex items-center justify-center gap-1.5">
                                                           <div className={`w-2 h-2 rounded-full ${capacityColor}`}></div>
                                                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{capacityText}</span>
                                                       </div>
                                                   </button>
                                               );
                                           })}
                                           {teamLoad.length === 0 && (
                                              <div className="text-center py-4 text-xs font-medium text-slate-400 italic">No sales team members found.</div>
                                           )}
                                       </div>
                                       {oppForm.assignedSalespersonId === '' && teamLoad.length > 0 && (
                                           <p className="text-[10px] font-medium text-slate-400 mt-2 text-right">Leave unselected to push to the Unassigned queue.</p>
                                       )}
                                   </div>
                               )}

                               <div className="form-group mb-8">
                                   <label className="text-xs font-bold text-slate-500 mb-2 block uppercase tracking-wider">Internal Dispatch Notes</label>
                                   <textarea 
                                      value={oppForm.dispatchNotes}
                                      onChange={(e) => setOppForm({...oppForm, dispatchNotes: e.target.value})}
                                      className="w-full border-2 border-slate-200 p-4 rounded-xl h-20 bg-slate-50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none resize-none text-sm text-slate-900 placeholder-slate-400 font-medium"
                                      placeholder="Gate codes, pets, routing instructions..."
                                   />
                               </div>

                               <button 
                                  onClick={handleInjectOpportunity}
                                  disabled={loading}
                                  className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${oppForm.type === 'SALES' ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                               >
                                   <Zap size={20} /> 
                                   Inject {oppForm.type === 'SALES' ? 'Sales Lead' : 'Service Lead'}
                               </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

               {activeTab === 'calendar' && (
                   <div className="flex-1 overflow-hidden relative h-full">
                       <DispatchCalendar isSubView={true} />
                   </div>
               )}

               {activeTab === 'map' && (
                   <div className="flex-1 overflow-hidden relative h-full p-4 bg-slate-100">
                       <DispatchMap />
                   </div>
               )}
           </div>
       </div>
   );
}
