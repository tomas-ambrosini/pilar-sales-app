import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import { Phone, User, MapPin, AlertCircle, CalendarClock, ShieldAlert, CheckCircle2, Navigation, Search, MessageSquare } from 'lucide-react';
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
   const [searchPhone, setSearchPhone] = useState('');
   const [matchedCustomer, setMatchedCustomer] = useState(null);
   const [loading, setLoading] = useState(true);
   const [selectedJob, setSelectedJob] = useState(null);
   
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
      
      const channel = supabase.channel('realtime_dispatch')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => {
           fetchOpportunities();
        })
        .subscribe();
  
      return () => supabase.removeChannel(channel);
   }, []);

   const fetchOpportunities = async () => {
      try {
         // 1. Fetch Sales Opportunities (Surveys/Leads)
         const { data: oppData, error: oppErr } = await supabase
           .from('opportunities')
           .select(`
             id, status, urgency_level, issue_description,
             scheduled_date, scheduled_time_block, dispatch_notes, assigned_crew_id, created_at,
             households ( id, household_name, addresses!households_service_address_id_fkey ( street_address, city ) )
           `)
           .in('status', ['New Lead', 'Site Survey Scheduled', 'Deal Won']); // Deal Won included for legacy fallback
           
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
               address: addressString,
               date: new Date(opp.created_at).toLocaleDateString(),
               urgency: opp.urgency_level,
               issue: opp.issue_description,
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
               address: addressString,
               date: new Date(wo.created_at).toLocaleDateString(),
               urgency: wo.urgency_level,
               issue: wo.execution_payload?.tierName ? `Install: ${wo.execution_payload.tierName}` : 'Execution Job',
               scheduled_date: wo.scheduled_date,
               scheduled_time_block: wo.scheduled_time_block,
               dispatch_notes: wo.dispatch_notes,
               assigned_crew_id: wo.assigned_crew_id
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
             } else {
                 throw new Error(res.error || res.message);
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
                  onCardClick={j => setSelectedJob(j)}
               />
               
               {/* Flyout Modal */}
               <Modal isOpen={!!selectedJob} onClose={() => setSelectedJob(null)} title="Job Dispatch Details" size="md">
                  {selectedJob && (
                     <div className="space-y-6 pt-2">
                        {/* Premium Header */}
                        <div>
                           <div className="flex items-start justify-between mb-1">
                              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                 {selectedJob.customerName}
                              </h3>
                              {selectedJob.urgency === 'High' && (
                                 <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold flex items-center gap-1 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div> High Priority
                                 </span>
                              )}
                           </div>
                           <p className="text-slate-400 font-mono text-xs flex items-center gap-2">
                              System Reference <span className="text-slate-500 font-bold">#{selectedJob.displayId}</span>
                           </p>
                        </div>
                        
                        {/* Elegant Data Grid */}
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-sm hover:border-primary-200 transition-colors">
                              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mb-1 tracking-wider uppercase">
                                 <MapPin size={12} className="text-primary-500"/> Service Address
                              </label>
                              <span className="text-sm font-semibold text-slate-700 leading-tight block pr-2">
                                 {selectedJob.address}
                              </span>
                           </div>
                           <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-sm hover:border-amber-200 transition-colors">
                              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 mb-1 tracking-wider uppercase">
                                 <CalendarClock size={12} className="text-amber-500"/> Dispatch Window
                              </label>
                              <span className="text-sm font-semibold text-slate-700 leading-tight block">
                                 {selectedJob.scheduled_date ? `${selectedJob.scheduled_date.toLocaleDateString ? selectedJob.scheduled_date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : selectedJob.scheduled_date} (${selectedJob.scheduled_time_block.replace('Exact: ', '')})` : 'Queue / Unassigned'}
                              </span>
                           </div>
                        </div>

                        {/* Soft Notes Container */}
                        <div className="relative">
                           <div className="absolute top-0 left-4 -mt-2 bg-white px-2">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                 <MessageSquare size={12} className="text-slate-400"/> {activeRole === ROLES.SUBCONTRACTOR ? 'Work Order Instructions' : 'Diagnostic Log'}
                              </h4>
                           </div>
                           <div className="bg-white border-2 border-slate-100 rounded-xl p-5 pt-6 text-sm text-slate-600 leading-relaxed max-h-[220px] overflow-auto shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] whitespace-pre-wrap">
                              {selectedJob.dispatch_notes || <span className="italic text-slate-400">No dispatch notes recorded for this ticket.</span>}
                           </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                           <button onClick={() => setSelectedJob(null)} className="px-5 py-2.5 rounded-lg font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all text-sm">Close</button>
                           {activeRole !== ROLES.SUBCONTRACTOR && (
                              <button className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-slate-900/20 transition-all text-sm">
                                 <Phone size={16}/> Dispatch Crew
                              </button>
                           )}
                        </div>
                     </div>
                  )}
               </Modal>
            </div>

         </div>
      </div>
   );
}
