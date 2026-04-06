import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import { useInvoices } from '../context/InvoiceContext';
import { Phone, User, MapPin, AlertCircle, CalendarClock, ShieldAlert, CheckCircle2, Navigation, Search, MessageSquare, Edit3, Trash2, FileText, Zap, ShieldCheck } from 'lucide-react';
import DispatchCalendar from '../components/DispatchCalendar';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '../components/Modal';
import { useRole, ROLES } from '../context/RoleContext';

const PIPELINE_STAGES = [
  'New Lead', 'Contact Attempted', 'Site Survey Scheduled', 
  'Proposal Building', 'Proposal Sent', 'Deal Won', 
  'Job Completed', 'Lost',
  /* Work Order Specific */
  'Unscheduled', 'Scheduled', 'En Route', 'In Progress', 
  'Permit Pending', 'Pending Inspection', 'Failed Inspection', 'Completed', 'Closed'
];

export default function DispatchHub() {
   const { activeRole } = useRole();
   const { customers, addCustomer } = useCustomers();
   const { addInvoice } = useInvoices();
   const [searchPhone, setSearchPhone] = useState('');
   const [matchedCustomer, setMatchedCustomer] = useState(null);
   const [loading, setLoading] = useState(true);
   const [selectedJob, setSelectedJob] = useState(null);
   // Extended Modal States
   const [activeTab, setActiveTab] = useState('details');
   const [isEditingJob, setIsEditingJob] = useState(false);
   const [editJobForm, setEditJobForm] = useState({ issue_description: '', urgency: 'Medium', status: '' });
   const [deletingJob, setDeletingJob] = useState(false);

   
   // Form State (9-Step OSC Intake)
   const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      issueType: 'No AC / System Down',
      systemAge: 'Unknown',
      equipmentLocation: 'Attic / Exterior',
      isHomeowner: 'Yes',
      paymentMethod: 'Financing',
      gateCodeOrPets: '',
      notes: ''
   });

   // Calendar State
   const [pipeline, setPipeline] = useState({});

   useEffect(() => {
      fetchOpportunities();
      
      const oppChannel = supabase.channel('realtime_dispatch_opps')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => {
           fetchOpportunities();
        })
        .subscribe();
        
      const woChannel = supabase.channel('realtime_dispatch_wo')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders' }, () => {
           fetchOpportunities();
        })
        .subscribe();
  
      return () => {
          supabase.removeChannel(oppChannel);
          supabase.removeChannel(woChannel);
      };
   }, []);

   const fetchOpportunities = async () => {
      try {
         // 1. Fetch Sales Opportunities (Surveys/Leads)
         const { data: oppData, error: oppErr } = await supabase
           .from('opportunities')
           .select(`
             id, status, urgency_level, issue_description, site_survey_data, proposal_data,
             scheduled_date, scheduled_time_block, dispatch_notes, assigned_crew_id, created_at,
             households ( id, household_name, addresses!households_service_address_id_fkey ( street_address, city ) )
           `)
           .in('status', ['New Lead', 'Site Survey Scheduled']);
           
         if (oppErr) throw oppErr;

         // 2. Fetch Operations Work Orders (Installs/Jobs)
         const { data: woData, error: woErr } = await supabase
           .from('work_orders')
           .select(`
             id, work_order_number, status, urgency_level, execution_payload,
             scheduled_date, scheduled_time_block, dispatch_notes, assigned_crew_id, created_at,
             households ( id, household_name, addresses!households_service_address_id_fkey ( street_address, city ) )
           `);

         if (woErr && woErr.code !== 'PGRST205') throw woErr; // Ignore table missing error during migration
   
         const sortedMap = PIPELINE_STAGES.reduce((acc, stg) => { acc[stg] = []; return acc; }, {});
         
         // Process Opportunities
         if (oppData) {
           oppData.forEach(opp => {
             const addr = opp.households?.addresses;
             const addressString = addr ? `${addr.street_address}` : 'No address';
             const jobCard = {
               id: `opp_${opp.id}`,
               dbId: opp.id,
               type: 'opportunity',
               displayId: opp.id.substring(0,8).toUpperCase(),
               status: opp.status,
               customerName: opp.households?.household_name || 'Unknown',
               household_id: opp.households?.id,
               address: addressString,
               date: new Date(opp.created_at).toLocaleDateString(),
               urgency: opp.urgency_level,
               issue: opp.issue_description,
               surveyPhotos: opp.site_survey_data?.photos || null,
               proposalData: opp.proposal_data || null,
               scheduled_date: opp.scheduled_date,
               scheduled_time_block: opp.scheduled_time_block,
               dispatch_notes: opp.dispatch_notes,
               assigned_crew_id: opp.assigned_crew_id
             };
             if (sortedMap[opp.status]) sortedMap[opp.status].push(jobCard);
             else sortedMap['New Lead'].push(jobCard);
           });
         }

         // Process Work Orders
         if (woData) {
           woData.forEach(wo => {
             const addr = wo.households?.addresses;
             const addressString = addr ? `${addr.street_address}` : 'No address';
             const jobCard = {
               id: `wo_${wo.id}`,
               dbId: wo.id,
               type: 'work_order',
               displayId: wo.work_order_number,
               status: wo.status,
               customerName: wo.households?.household_name || 'Unknown',
               household_id: wo.households?.id,
               address: addressString,
               date: new Date(wo.created_at).toLocaleDateString(),
               urgency: wo.urgency_level,
               issue: wo.execution_payload?.tierName ? `Install: ${wo.execution_payload.tierName}` : 'Execution Job',
               execution_payload: wo.execution_payload,
               scheduled_date: wo.scheduled_date,
               scheduled_time_block: wo.scheduled_time_block,
               dispatch_notes: wo.dispatch_notes,
               assigned_crew_id: wo.assigned_crew_id,
               execution_payload: wo.execution_payload
             };
             if (sortedMap[wo.status]) sortedMap[wo.status].push(jobCard);
             else sortedMap['Unscheduled'].push(jobCard);
           });
         }

         setPipeline(sortedMap);
       } catch (err) {
         console.error("Error fetching pipeline:", err);
       } finally {
         setLoading(false);
       }
   };

   const handleScheduleJob = async (draggableId, crewId, dateStr) => {
      let originalStatus = null;
      let newStatus = null;
      let jobType = null;
      let dbId = null;

      setPipeline(prev => {
         const newPipe = { ...prev };
         for (const col of Object.keys(newPipe)) {
             const jobIndex = newPipe[col].findIndex(j => j.id === draggableId);
             if (jobIndex !== -1) {
                originalStatus = newPipe[col][jobIndex].status;
                jobType = newPipe[col][jobIndex].type;
                dbId = newPipe[col][jobIndex].dbId;
                const arr = [...newPipe[col]];
                
                newStatus = originalStatus;
                
                // State Machine Logic
                if (jobType === 'opportunity') {
                    if (dateStr && originalStatus === 'New Lead') newStatus = 'Site Survey Scheduled';
                    if (!dateStr && originalStatus === 'Site Survey Scheduled') newStatus = 'New Lead';
                } else if (jobType === 'work_order') {
                    if (dateStr && originalStatus === 'Unscheduled') newStatus = 'Scheduled';
                    if (!dateStr && originalStatus === 'Scheduled') newStatus = 'Unscheduled';
                }
                
                if (newStatus !== originalStatus) {
                   const jobCard = { ...arr[jobIndex], scheduled_date: dateStr, assigned_crew_id: crewId, status: newStatus };
                   arr.splice(jobIndex, 1);
                   newPipe[col] = arr;
                   if (!newPipe[newStatus]) newPipe[newStatus] = [];
                   newPipe[newStatus].push(jobCard);
                } else {
                   arr[jobIndex] = { ...arr[jobIndex], scheduled_date: dateStr, assigned_crew_id: crewId };
                   newPipe[col] = arr;
                }
                break;
             }
         }
         return newPipe;
      });
 
      // Push to Supabase
      if (originalStatus && dbId && jobType) {
         let dbUpdate = { scheduled_date: dateStr, assigned_crew_id: crewId };
         
         if (jobType === 'opportunity') {
             if (dateStr && originalStatus === 'New Lead') dbUpdate.status = 'Site Survey Scheduled';
             if (!dateStr && originalStatus === 'Site Survey Scheduled') dbUpdate.status = 'New Lead';
             await supabase.from('opportunities').update(dbUpdate).eq('id', dbId);
         } else if (jobType === 'work_order') {
             if (dateStr && originalStatus === 'Unscheduled') dbUpdate.status = 'Scheduled';
             if (!dateStr && originalStatus === 'Scheduled') dbUpdate.status = 'Unscheduled';
             await supabase.from('work_orders').update(dbUpdate).eq('id', dbId);
         }
      }
   };

   const handleStatusUpdate = async (job, newStatus) => {
      try {
         const updates = { status: newStatus };
         
         if (newStatus === 'En Route') {
             updates.dispatch_notes = (job.dispatch_notes || '') + `\n[${new Date().toLocaleTimeString()}] Crew En Route`;
         } else if (newStatus === 'In Progress') {
             updates.dispatch_notes = (job.dispatch_notes || '') + `\n[${new Date().toLocaleTimeString()}] Crew Arrived - Job Started`;
         } else if (newStatus === 'Completed') {
             updates.dispatch_notes = (job.dispatch_notes || '') + `\n[${new Date().toLocaleTimeString()}] Job Completed Successfully`;
         }

         if (job.type === 'opportunity') {
             await supabase.from('opportunities').update(updates).eq('id', job.dbId);
         } else {
             await supabase.from('work_orders').update(updates).eq('id', job.dbId);
             
             // Phase 8: Financial Automations
             if (newStatus === 'Completed') {
                 try {
                     const amount = job.execution_payload?.salesPrice || 0;
                     await addInvoice({
                         customer: job.customerName,
                         work_order_id: job.dbId,
                         household_id: job.household_id,
                         amount: amount
                     });
                     console.log('Automated Invoice Generated for', job.customerName, amount);
                 } catch (finErr) {
                     console.error('Finance sync failed:', finErr);
                 }
             }
         }
         
         setSelectedJob({ ...job, status: newStatus, dispatch_notes: updates.dispatch_notes || job.dispatch_notes });
         fetchOpportunities();
      } catch (err) {
         console.error("Failed to update status", err);
      }
   };

   // Smart Phone Lookup
   useEffect(() => {
      if (searchPhone.length >= 7) {
         const cleanSearch = searchPhone.replace(/\D/g, '');
         const match = customers.find(c => {
            const cleanCustPhone = (c.phone || '').replace(/\D/g, '');
            return cleanCustPhone.includes(cleanSearch);
         });
         
         if (match) {
            setMatchedCustomer(match);
            const nameParts = match.name.split(' ');
            setFormData(prev => ({
               ...prev,
               firstName: nameParts[0] || '',
               lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '',
               phone: match.phone || searchPhone,
               email: match.email || '',
               address: match.address || prev.address
            }));
         } else {
            setMatchedCustomer(null);
         }
      } else {
         setMatchedCustomer(null);
      }
   }, [searchPhone, customers]);

   
   const handleSaveEdit = async () => {
      if (!selectedJob) return;
      try {
         const updates = { 
             issue_description: editJobForm.issue_description, 
             urgency_level: editJobForm.urgency, 
             status: editJobForm.status 
         };
         
         const table = selectedJob.type === 'opportunity' ? 'opportunities' : 'work_orders';
         await supabase.from(table).update(updates).eq('id', selectedJob.dbId);
         
         setSelectedJob({ ...selectedJob, issue: editJobForm.issue_description, urgency: editJobForm.urgency, status: editJobForm.status });
         setIsEditingJob(false);
         fetchOpportunities();
      } catch (err) {
         alert("Failed to save: " + err.message);
      }
   };

   const handleDeleteJob = async () => {
      if (!selectedJob) return;
      try {
         setLoading(true);
         const table = selectedJob.type === 'opportunity' ? 'opportunities' : 'work_orders';
         const { error } = await supabase.from(table).delete().eq('id', selectedJob.dbId);
         if (error) throw error;
         setSelectedJob(null);
         setDeletingJob(false);
         fetchOpportunities();
      } catch (err) {
         alert("Failed to delete: " + err.message);
         setDeletingJob(false);
      } finally {
         setLoading(false);
      }
   };

   
   useEffect(() => {
      if (isEditingJob && selectedJob) {
         setEditJobForm({ 
            issue_description: selectedJob.issue || '', 
            urgency: selectedJob.urgency || 'Medium', 
            status: selectedJob.status || '' 
         });
      }
   }, [isEditingJob, selectedJob]);

   const handleDispatchSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);

      try {
         let householdId = matchedCustomer?.id;

         // 1. If not matched, auto-create customer to CRM
         if (!householdId) {
             const res = await addCustomer({
                 name: `${formData.firstName} ${formData.lastName}`.trim(),
                 phone: formData.phone,
                 email: formData.email,
                 address: formData.address,
                 tags: ['Dispatched Lead']
             });
             if (res.success) {
                 householdId = res.id;
             } else if (res.duplicateId) {
                 // Gracefully use the existing customer if they were matched by phone/email
                 householdId = res.duplicateId;
             } else {
                 throw new Error(res.error || res.message || "Failed to create customer.");
             }
         }

         // 2. Compute urgency based on Issue Type
         let urgency = 'Medium';
         if (formData.issueType.includes('System Down') || formData.issueType.includes('Leak')) urgency = 'High';
         if (formData.issueType.includes('Maintenance') || formData.issueType.includes('Estimate')) urgency = 'Low';

         // 3. Compile heavy diagnostic notes for Dispatch Details
         const compiledNotes = `
**OSC INTAKE LOG**
Issue: ${formData.issueType}
System Age: ${formData.systemAge}
Location: ${formData.equipmentLocation}
Homeowner: ${formData.isHomeowner}
Payment Method: ${formData.paymentMethod}
Gate/Pets: ${formData.gateCodeOrPets}
Details: ${formData.notes}
         `.trim();

         // 4. Create Opportunity in "Deal Won" or "Site Survey Scheduled" so it hits the Dispatch Board
         // Assuming Deal Won makes it visible in the drawer for Drag and Drop based on DispatchCalendar logic!
         const { error } = await supabase.from('opportunities').insert({
             household_id: householdId,
             urgency_level: urgency,
             issue_description: `${formData.issueType} - ${formData.notes}`,
             dispatch_notes: compiledNotes,
             status: 'New Lead' // Properly mapped to the start of the sales funnel
         });

         if (error) throw error;

         // Reset Form
         setFormData({
            firstName: '', lastName: '', phone: '', email: '', address: '',
            issueType: 'No AC / System Down', systemAge: 'Unknown', equipmentLocation: 'Attic / Exterior',
            isHomeowner: 'Yes', paymentMethod: 'Financing', gateCodeOrPets: '', notes: ''
         });
         setSearchPhone('');
         setMatchedCustomer(null);
         alert("Call successfully onboarded and pushed to the Dispatch Board!");

      } catch (err) {
         alert("Failed to create dispatch ticket: " + err.message);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="page-container flex flex-col h-full bg-slate-50/50">
         <header className="page-header shrink-0 pb-4">
            <div>
               <h1 className="page-title text-2xl flex items-center gap-2"><Navigation className="text-primary-500" /> {activeRole === ROLES.SUBCONTRACTOR ? 'Field Work Order Hub' : 'Executive Dispatch Hub'}</h1>
               <p className="page-subtitle">{activeRole === ROLES.SUBCONTRACTOR ? 'View your assigned jobs and routing' : 'OSC Intake Form & Live Service Routing'}</p>
            </div>
         </header>
         
         <div className="flex flex-1 overflow-hidden gap-6 h-full pb-4 items-stretch">
            
            {/* LEFT PANEL: SMART INTAKE FORM (30%) */}
            {activeRole !== ROLES.SUBCONTRACTOR && (
            <div className="w-[400px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col h-full overflow-hidden z-10">
               {/* Premium Header */}
               <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 shrink-0 flex items-center justify-between shadow-md relative overflow-hidden">
                  <div className="absolute -right-4 -top-4 opacity-10 blur-[2px]"><Phone size={80} /></div>
                  <h2 className="text-white font-extrabold text-lg flex items-center gap-2 relative z-10"><Phone size={18} className="text-primary-400"/> Live Call Intake</h2>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 border border-white/20 px-2 py-1.5 rounded relative z-10 shadow-sm backdrop-blur-sm">9-Step OSC</span>
               </div>

               <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-5 hide-scroll">
                  
                  {/* Card 1: Reverse Phone Lookup */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative hover:border-primary-200 transition-colors">
                     <div className="absolute -left-px top-4 bottom-4 w-1 bg-primary-500 rounded-r"></div>
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Search size={12}/> Caller Verification</label>
                     <div className="relative">
                        <Search className="absolute left-3 top-3 text-primary-400" size={16} />
                        <input 
                           type="tel" 
                           placeholder="Enter phone number..." 
                           className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-lg outline-none focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 transition-all font-mono text-sm font-bold text-slate-700 placeholder:font-normal placeholder:text-slate-400"
                           value={searchPhone}
                           onChange={(e) => setSearchPhone(e.target.value)}
                        />
                     </div>
                     <AnimatePresence>
                        {matchedCustomer && (
                           <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start gap-2 shadow-sm">
                              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                              <div className="text-xs text-emerald-800 flex-1 leading-relaxed">
                                 <strong className="font-black text-emerald-900 uppercase text-[10px] tracking-wider block mb-0.5">Match Found</strong>
                                 <span className="font-bold text-sm">{matchedCustomer.name}</span><br/>
                                 <span className="text-emerald-600 truncate block mt-0.5">{matchedCustomer.address}</span>
                              </div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>

                  <form onSubmit={handleDispatchSubmit} className="space-y-5">
                     
                     {/* Card 2: Client Profile */}
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><User size={12}/> Client Profile</label>
                        <div className="space-y-3">
                           <div className="grid grid-cols-2 gap-3">
                              <input required type="text" placeholder="First Name" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:bg-white transition-colors" />
                              <input required type="text" placeholder="Last Name" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:bg-white transition-colors" />
                           </div>
                           <input required type="tel" placeholder="Phone Number" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:bg-white transition-colors" />
                           <div className="relative mt-2">
                              <MapPin size={14} className="absolute left-3 top-2.5 text-slate-400" />
                              <input required type="text" placeholder="Full Home Address" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-primary-500 focus:bg-white transition-colors" />
                           </div>
                        </div>
                     </div>

                     {/* Card 3: Technical Diagnostics */}
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><ShieldAlert size={12}/> Technical Diagnostics</label>
                        
                        <div className="space-y-4">
                           <div>
                              <select className="w-full bg-rose-50 border border-rose-100 text-rose-900 font-bold rounded-lg px-3 py-2.5 text-sm outline-none focus:border-rose-400 cursor-pointer shadow-sm" value={formData.issueType} onChange={e=>setFormData({...formData, issueType: e.target.value})}>
                                 <option>No AC / System Down</option>
                                 <option>No Heat</option>
                                 <option>Water Leak / Freezing</option>
                                 <option>Strange Noise or Smell</option>
                                 <option className="text-emerald-700 font-bold bg-emerald-50">Routine Maintenance / Tune-up</option>
                                 <option>Thermostat Issue</option>
                                 <option className="text-primary-700 font-bold bg-primary-50">Free Estimate for Replacement</option>
                              </select>
                           </div>

                           <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                              <div>
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">System Age</label>
                                 <select className="w-full bg-white border border-slate-200 rounded text-xs px-2 py-1.5 outline-none focus:border-primary-400 text-slate-700 font-medium cursor-pointer" value={formData.systemAge} onChange={e=>setFormData({...formData, systemAge: e.target.value})}>
                                    <option>Unknown</option>
                                    <option>Under 5 Years</option>
                                    <option>5-10 Years</option>
                                    <option>10-15 Years</option>
                                    <option>15+ Years (Old)</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Location</label>
                                 <select className="w-full bg-white border border-slate-200 rounded text-xs px-2 py-1.5 outline-none focus:border-primary-400 text-slate-700 font-medium cursor-pointer" value={formData.equipmentLocation} onChange={e=>setFormData({...formData, equipmentLocation: e.target.value})}>
                                    <option>Attic / Exterior</option>
                                    <option>Garage / Closet</option>
                                    <option>Roof (Package Unit)</option>
                                    <option>Basement</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Homeowner?</label>
                                 <select className="w-full bg-white border border-slate-200 rounded text-xs px-2 py-1.5 outline-none focus:border-primary-400 text-slate-700 font-medium cursor-pointer" value={formData.isHomeowner} onChange={e=>setFormData({...formData, isHomeowner: e.target.value})}>
                                    <option>Yes (Decision Maker)</option>
                                    <option>Yes (Spouse absent)</option>
                                    <option>Renter / Tenant</option>
                                    <option>Property Manager</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Payment Plan</label>
                                 <select className="w-full bg-white border border-slate-200 rounded text-xs px-2 py-1.5 outline-none focus:border-primary-400 text-slate-700 font-medium cursor-pointer" value={formData.paymentMethod} onChange={e=>setFormData({...formData, paymentMethod: e.target.value})}>
                                    <option>Financing Included</option>
                                    <option>Cash / Check</option>
                                    <option>Credit Card</option>
                                 </select>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Card 4: Dispatch Notes */}
                     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><MessageSquare size={12}/> Dispatch Notes</label>
                        
                        <div className="space-y-3">
                           <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Access & Gate Codes (Dogs?)</label>
                              <input type="text" placeholder="e.g. Gate code #1234, beware of dog" value={formData.gateCodeOrPets} onChange={e=>setFormData({...formData, gateCodeOrPets: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500 focus:bg-white transition-colors" />
                           </div>
                           
                           <div>
                              <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">Caller Demeanor</label>
                              <textarea placeholder="Summarize the issue..." required value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full bg-amber-50/30 border border-slate-200 rounded-lg p-3 text-sm h-24 outline-none focus:border-amber-400 focus:bg-white transition-colors shadow-inner resize-none"></textarea>
                           </div>
                        </div>
                     </div>

                     <div className="sticky bottom-0 pt-2 pb-4 bg-slate-50/90 backdrop-blur-sm z-20">
                        <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm tracking-wide py-4 rounded-xl shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_25px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 border border-slate-700">
                           <CalendarClock size={18} className="text-primary-400"/>
                           {loading ? 'Processing Array...' : 'CREATE DISPATCH TICKET'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
            )}

            {/* RIGHT PANEL: SERVICE BOARD (70%) */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden relative">
               <DispatchCalendar 
                  pipeline={pipeline} 
                  onScheduleJob={handleScheduleJob}
                  onCardClick={j => { setSelectedJob(j); setActiveTab('details'); setIsEditingJob(false); }}
               />
               
               {/* Flyout Modal */}
               <Modal isOpen={selectedJob !== null} onClose={() => { setSelectedJob(null); setActiveTab('details'); }} title={`Deal #${selectedJob?.displayId}`}>
         <div className="flex flex-col h-full" style={{ minHeight: '400px' }}>
            <div className="flex border-b border-slate-200 mb-4 px-4 pt-2 gap-4 text-sm font-semibold text-slate-500">
               <button 
                  className={`pb-2 transition-colors ${activeTab === 'details' ? 'border-b-2 border-primary-500 text-primary-600' : 'hover:text-slate-700'}`}
                  onClick={() => setActiveTab('details')}
               >
                  Deal Details
               </button>
               <button 
                  className={`pb-2 transition-colors ${activeTab === 'photos' ? 'border-b-2 border-primary-500 text-primary-600' : 'hover:text-slate-700'}`}
                  onClick={() => setActiveTab('photos')}
               >
                  Survey Photos {selectedJob?.surveyPhotos && Object.values(selectedJob.surveyPhotos).some(Boolean) ? '📸' : ''}
               </button>
               <button 
                  className={`pb-2 transition-colors ${activeTab === 'proposal' ? 'border-b-2 border-primary-500 text-primary-600' : 'hover:text-slate-700'}`}
                  onClick={() => setActiveTab('proposal')}
               >
                  Generated Proposal {selectedJob?.proposalData ? '📝' : ''}
               </button>
             </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
               {activeTab === 'details' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                     {isEditingJob ? (
                        <div className="space-y-4">
                           <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">Edit Deal #{selectedJob?.displayId}</h3>
                           <div className="form-group">
                              <label className="text-xs font-bold text-slate-600 mb-1 block">Internal Notes / Issue</label>
                              <textarea 
                                 value={editJobForm.issue_description} 
                                 onChange={e => setEditJobForm({...editJobForm, issue_description: e.target.value})}
                                 className="w-full border border-slate-300 p-2 rounded-md min-h-[100px]"
                              />
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="form-group">
                                 <label className="text-xs font-bold text-slate-600 mb-1 block">Urgency</label>
                                 <select 
                                    value={editJobForm.urgency} 
                                    onChange={e => setEditJobForm({...editJobForm, urgency: e.target.value})}
                                    className="w-full border border-slate-300 p-2 rounded-md"
                                 >
                                    <option value="Low">Low - System Working</option>
                                    <option value="Medium">Medium - Failing / Noisy</option>
                                    <option value="High">Emergency - System Down!</option>
                                 </select>
                              </div>
                              <div className="form-group">
                                 <label className="text-xs font-bold text-slate-600 mb-1 block">Pipeline Status Override</label>
                                 <select 
                                    value={editJobForm.status} 
                                    onChange={e => setEditJobForm({...editJobForm, status: e.target.value})}
                                    className="w-full border border-slate-300 p-2 rounded-md bg-amber-50"
                                 >
                                    {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                 </select>
                              </div>
                           </div>
                           <div className="flex gap-2 justify-end pt-4">
                              <button onClick={() => setIsEditingJob(false)} className="btn-secondary">Cancel</button>
                              <button onClick={handleSaveEdit} className="btn-primary">Save Changes</button>
                           </div>
                        </div>
                     ) : (
                        <>
                           <h3 className="font-bold text-lg mb-1">{selectedJob?.customerName}</h3>
                           <p className="text-sm text-slate-500 mb-4">{selectedJob?.address}</p>
                           
                           <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-4 flex items-center justify-between">
                              <div>
                                 <p className="text-xs font-bold text-slate-400 mb-1">URGENCY</p>
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${selectedJob?.urgency === 'High' ? 'bg-red-100 text-red-700' : selectedJob?.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {selectedJob?.urgency}
                                 </span>
                              </div>
                              <div className="text-right">
                                 <p className="text-xs font-bold text-slate-400 mb-1">CURRENT STATUS</p>
                                 <p className="text-sm font-semibold text-slate-700">{selectedJob?.status}</p>
                              </div>
                           </div>

                           <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100">
                              <p className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1"><FileText size={14}/> INTERNAL NOTES</p>
                              <p className="text-slate-800 text-sm italic">{selectedJob?.issue || 'No notes provided by staff.'}</p>
                           </div>

                           
                           {activeRole !== ROLES.SUBCONTRACTOR && (
                              <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-6">
                                 <button onClick={() => setDeletingJob(true)} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold py-2 px-3 rounded flex items-center gap-1 transition-colors">
                                    <Trash2 size={14} /> Delete Job
                                 </button>
                                 <button onClick={() => setIsEditingJob(true)} className="btn-secondary text-xs flex items-center gap-1">
                                    <Edit3 size={14} /> Quick Edit
                                 </button>
                              </div>
                           )}
                           
                           {/* Ops & Dispatch Footer Actions */ }
                           <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-4">
                              {activeRole !== ROLES.SUBCONTRACTOR && (
                                 <button onClick={() => {}} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-2 shadow-sm text-xs">
                                    <Phone size={14}/> Notify Dispatch Crew
                                 </button>
                              )}
                              {activeRole === ROLES.SUBCONTRACTOR && (
                                 <>
                                    {selectedJob?.status === 'Scheduled' && (
                                        <button onClick={() => handleStatusUpdate(selectedJob, 'En Route')} className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-lg transition-all text-xs">
                                           🚀 Start Drive
                                        </button>
                                    )}
                                    {selectedJob?.status === 'En Route' && (
                                        <button onClick={() => handleStatusUpdate(selectedJob, 'In Progress')} className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-lg transition-all text-xs animate-pulse">
                                           📍 Arrived (Start)
                                        </button>
                                    )}
                                    {selectedJob?.status === 'In Progress' && (
                                        <button onClick={() => handleStatusUpdate(selectedJob, 'Completed')} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg transition-all text-xs">
                                           ✅ Complete Work Order
                                        </button>
                                    )}
                                 </>
                              )}
                           </div>

                        </>
                     )}
                  </motion.div>
               )}


               {activeTab === 'proposal' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full">
                     {!selectedJob?.proposalData ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded border border-slate-200 text-center shadow-sm h-full">
                           <ShieldCheck size={48} className="text-slate-300 mb-4" />
                           <h4 className="font-bold text-slate-600 mb-2 text-lg">No Digital Proposal Generated</h4>
                           <p className="text-sm text-slate-500 max-w-sm leading-relaxed">This deal was manually created or pushed back without completing the Proposal Wizard. Generate a new estimate to automatically inject the 3-Tier retail pricing view here.</p>
                        </div>
                     ) : (
                        <div className="space-y-6">
                           <div className="text-center mb-6">
                              <h2 className="text-xl font-black text-slate-800 tracking-tight">Investment Options</h2>
                              <p className="text-sm text-slate-500 mt-1">Generated {new Date(selectedJob.proposalData.generatedAt).toLocaleDateString()} for {selectedJob?.customerName}</p>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* BEST TIER */}
                              {selectedJob.proposalData.tiers.best && (
                                 <motion.div whileHover={{ y: -5 }} className="relative bg-white rounded-xl border-2 border-primary-500 shadow-xl overflow-hidden flex flex-col">
                                    <div className="absolute top-0 left-0 right-0 bg-primary-500 text-white text-center text-xs font-bold py-1 tracking-widest uppercase">
                                       Best Option
                                    </div>
                                    <div className="p-6 pt-10 text-center border-b border-slate-100 flex-1">
                                       <h3 className="text-2xl font-black text-slate-800">${selectedJob.proposalData.tiers.best.salesPrice.toLocaleString()}</h3>
                                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Turnkey Total</p>
                                       
                                       <div className="mt-4 inline-block bg-primary-50 px-3 py-1 rounded-full text-primary-700 text-xs font-bold border border-primary-100">
                                          {selectedJob.proposalData.tiers.best.brand} {selectedJob.proposalData.tiers.best.tons}T
                                       </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 flex-1">
                                       <ul className="space-y-3">
                                          {selectedJob.proposalData.tiers.best.features.map((feat, i) => (
                                             <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium leading-relaxed">
                                                <Zap size={14} className="text-primary-500 shrink-0 mt-0.5" />
                                                {feat}
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 </motion.div>
                              )}

                              {/* BETTER TIER */}
                              {selectedJob.proposalData.tiers.better && (
                                 <motion.div whileHover={{ y: -5 }} className="relative bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
                                    <div className="absolute top-0 left-0 right-0 bg-slate-700 text-white text-center text-xs font-bold py-1 tracking-widest uppercase">
                                       Better Option
                                    </div>
                                    <div className="p-6 pt-10 text-center border-b border-slate-100 flex-1">
                                       <h3 className="text-2xl font-black text-slate-800">${selectedJob.proposalData.tiers.better.salesPrice.toLocaleString()}</h3>
                                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Turnkey Total</p>
                                       
                                       <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded-full text-slate-600 text-xs font-bold border border-slate-200">
                                          {selectedJob.proposalData.tiers.better.brand} {selectedJob.proposalData.tiers.better.tons}T
                                       </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 flex-1">
                                       <ul className="space-y-3">
                                          {selectedJob.proposalData.tiers.better.features.map((feat, i) => (
                                             <li key={i} className="flex items-start gap-2 text-xs text-slate-600 font-medium leading-relaxed">
                                                <CheckSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                                {feat}
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 </motion.div>
                              )}

                              {/* GOOD TIER */}
                              {selectedJob.proposalData.tiers.good && (
                                 <motion.div whileHover={{ y: -5 }} className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col opacity-90 hover:opacity-100">
                                    <div className="absolute top-0 left-0 right-0 bg-slate-300 text-slate-600 text-center text-xs font-bold py-1 tracking-widest uppercase">
                                       Good Option
                                    </div>
                                    <div className="p-6 pt-10 text-center border-b border-slate-100 flex-1">
                                       <h3 className="text-2xl font-black text-slate-800">${selectedJob.proposalData.tiers.good.salesPrice.toLocaleString()}</h3>
                                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Turnkey Total</p>
                                       
                                       <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded-full text-slate-500 text-xs font-bold border border-slate-200">
                                          {selectedJob.proposalData.tiers.good.brand} {selectedJob.proposalData.tiers.good.tons}T
                                       </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 flex-1">
                                       <ul className="space-y-3">
                                          {selectedJob.proposalData.tiers.good.features.map((feat, i) => (
                                             <li key={i} className="flex items-start gap-2 text-xs text-slate-500 font-medium leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                                                {feat}
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 </motion.div>
                              )}
                           </div>
                           
                           <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mt-6 flex items-start gap-3">
                              <ShieldCheck size={20} className="text-amber-500 shrink-0 mt-0.5" />
                              <div className="text-sm text-amber-800">
                                 <strong>Dealer Cost & Margins Protected:</strong> Material line items, sub-labor, flush costs, crane rentals, and gross margin algorithms are explicitly hidden from this client-facing presentation layout.
                              </div>
                           </div>
                        </div>
                     )}
                  </motion.div>
               )}

               {activeTab === 'photos' && (
                  <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
                     {!selectedJob?.surveyPhotos || !Object.values(selectedJob.surveyPhotos).some(Boolean) ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded border border-slate-200 text-center">
                           <ImageIcon size={48} className="text-slate-300 mb-3" />
                           <h4 className="font-bold text-slate-600 mb-1">No Photos Attached</h4>
                           <p className="text-xs text-slate-500 max-w-xs">The salesperson did not upload any site survey images for this deal during the proposal creation.</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-2 gap-4">
                           {Object.entries(selectedJob.surveyPhotos).map(([key, url]) => {
                              if (!url) return null;
                              const labels = {
                                 condenser_wide: 'Condenser Wide View',
                                 condenser_data_plate: 'Condenser Data Plate',
                                 indoor_unit_wide: 'Indoor Unit Wide View',
                                 indoor_data_plate: 'Indoor Data Plate',
                                 electrical_panel_open: 'Electrical Panel'
                              };
                              return (
                                 <div key={key} className="border border-slate-200 rounded p-2 bg-slate-50">
                                    <span className="block text-[10px] font-bold uppercase text-slate-500 mb-2 truncate">{labels[key] || key}</span>
                                    <a href={url} target="_blank" rel="noreferrer" className="block relative group overflow-hidden rounded">
                                       <img src={url} alt={key} className="w-full h-32 object-cover transition-transform group-hover:scale-105" />
                                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                          <Search size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                       </div>
                                    </a>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </motion.div>
               )}
            </div>

            <div className="p-4 border-t border-slate-200 mt-auto shrink-0 bg-white">
               <button className="btn-secondary w-full" onClick={() => { setSelectedJob(null); setActiveTab('details'); }}>Close Deal Window</button>
            </div>
         </div>
      </Modal>


      {/* Delete Confirmation Modal */}
      <Modal isOpen={deletingJob} onClose={() => setDeletingJob(false)} title="Delete Job Card" size="sm">
         <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center mb-6">
            <h4 className="text-red-800 font-bold mb-2">Delete {selectedJob?.displayId}?</h4>
            <p className="text-sm text-red-600 font-medium">This will permanently remove the record and cannot be undone.</p>
         </div>
         <div className="flex gap-3 justify-end items-center">
            <button className="btn-secondary" onClick={() => setDeletingJob(false)}>Cancel</button>
            <button className="btn-primary !bg-red-500 hover:!bg-red-600 border-none px-6" onClick={handleDeleteJob}>Confirm Deletion</button>
         </div>
      </Modal>

            </div>

         </div>
      </div>
   );
}
