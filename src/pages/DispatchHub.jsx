import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import { Phone, User, MapPin, AlertCircle, CalendarClock, ShieldAlert, CheckCircle2, Navigation, Search, MessageSquare } from 'lucide-react';
import DispatchCalendar from '../components/DispatchCalendar';
import { motion } from 'framer-motion';

const PIPELINE_STAGES = [
  'New Lead', 'Contact Attempted', 'Site Survey Scheduled', 
  'Proposal Building', 'Proposal Sent', 'Deal Won', 
  'Job Completed', 'Lost'
];

export default function DispatchHub() {
   const { customers, addCustomer } = useCustomers();
   const [searchPhone, setSearchPhone] = useState('');
   const [matchedCustomer, setMatchedCustomer] = useState(null);
   const [loading, setLoading] = useState(true);
   
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
         const { data, error } = await supabase
           .from('opportunities')
           .select(`
             id, status, urgency_level, issue_description,
             scheduled_date, scheduled_time_block, dispatch_notes, assigned_crew_id, created_at,
             households ( id, household_name, addresses!households_service_address_id_fkey ( street_address, city ) )
           `);
         if (error) throw error;
   
         if (data) {
           const sortedMap = PIPELINE_STAGES.reduce((acc, stg) => { acc[stg] = []; return acc; }, {});
           
           data.forEach(opp => {
             const addr = opp.households?.addresses;
             const addressString = addr ? `${addr.street_address}` : 'No address';
             
             const jobCard = {
               id: opp.id,
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
             
             if (sortedMap[opp.status]) {
                sortedMap[opp.status].push(jobCard);
             } else {
                sortedMap['New Lead'].push(jobCard);
             }
           });
           setPipeline(sortedMap);
         }
       } catch (err) {
         console.error("Error fetching pipeline:", err);
       } finally {
         setLoading(false);
       }
   };

   const handleScheduleJob = async (jobId, crewId, dateStr) => {
      setPipeline(prev => {
         const newPipe = { ...prev };
         // Find which column the job is in
         for (const col of Object.keys(newPipe)) {
             const jobIndex = newPipe[col].findIndex(j => j.id === jobId);
             if (jobIndex !== -1) {
                const arr = [...newPipe[col]];
                arr[jobIndex] = { ...arr[jobIndex], scheduled_date: dateStr, assigned_crew_id: crewId };
                newPipe[col] = arr;
                break;
             }
         }
         return newPipe;
      });
 
      await supabase.from('opportunities')
         .update({ scheduled_date: dateStr, assigned_crew_id: crewId })
         .eq('id', jobId);
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
             status: 'Deal Won' // Forces it into the DispatchCalendar's Unassigned tray
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
               <h1 className="page-title text-2xl flex items-center gap-2"><Navigation className="text-primary-500" /> Executive Dispatch Hub</h1>
               <p className="page-subtitle">OSC Intake Form & Live Service Routing</p>
            </div>
         </header>
         
         <div className="flex flex-1 overflow-hidden gap-6 h-full pb-4 items-stretch">
            
            {/* LEFT PANEL: SMART INTAKE FORM (30%) */}
            <div className="w-[380px] shrink-0 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col h-full overflow-hidden z-10">
               <div className="bg-slate-800 text-white p-4 shrink-0 flex items-center justify-between">
                  <h2 className="font-bold flex items-center gap-2"><Phone size={18} /> Live Call Intake</h2>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-700 px-2 py-1 rounded">9-Step OSC</span>
               </div>

               <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">1. Reverse Phone Lookup</label>
                  <div className="relative">
                     <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                     <input 
                        type="tel" 
                        placeholder="Enter caller's phone number..." 
                        className="w-full border-2 border-primary-200 pl-10 pr-4 py-2 rounded-lg outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-mono text-lg"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                     />
                  </div>
                  <AnimatePresence>
                     {matchedCustomer && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 bg-emerald-50 border border-emerald-200 rounded p-2 flex items-start gap-2">
                           <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                           <div className="text-xs text-emerald-800 flex-1">
                              <strong>Match Found:</strong> {matchedCustomer.name}<br/>
                              <span className="text-emerald-600 truncate block mt-0.5">{matchedCustomer.address}</span>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               <form onSubmit={handleDispatchSubmit} className="flex-1 overflow-y-auto p-4 space-y-6 form-wrapper hide-scroll">
                  
                  {/* Step 1 & 2: Contact Info */}
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><User size={12}/> Client Details</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                           <input required type="text" placeholder="First Name" value={formData.firstName} onChange={e=>setFormData({...formData, firstName: e.target.value})} className="input-field" />
                           <input required type="text" placeholder="Last Name" value={formData.lastName} onChange={e=>setFormData({...formData, lastName: e.target.value})} className="input-field" />
                        </div>
                        <input required type="tel" placeholder="Phone Number" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="input-field mt-2" />
                     </div>

                     <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={12}/> Service Address</label>
                        <input required type="text" placeholder="Full Home Address" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="input-field mt-2" />
                     </div>
                  </div>

                  {/* Step 3: Issue */}
                  <div className="border-t border-slate-100 pt-4">
                     <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><ShieldAlert size={12}/> Primary Issue</label>
                     <select className="input-field mt-2" value={formData.issueType} onChange={e=>setFormData({...formData, issueType: e.target.value})}>
                        <option>No AC / System Down</option>
                        <option>No Heat</option>
                        <option>Water Leak / Freezing</option>
                        <option>Strange Noise or Smell</option>
                        <option>Routine Maintenance / Tune-up</option>
                        <option>Thermostat Issue</option>
                        <option>Free Estimate for Replacement</option>
                     </select>
                  </div>

                  {/* Step 4-8: OSC Details grid */}
                  <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">System Age</label>
                        <select className="input-field mt-1 text-xs" value={formData.systemAge} onChange={e=>setFormData({...formData, systemAge: e.target.value})}>
                           <option>Unknown</option>
                           <option>Under 5 Years</option>
                           <option>5-10 Years</option>
                           <option>10-15 Years</option>
                           <option>15+ Years (Old)</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Location</label>
                        <select className="input-field mt-1 text-xs" value={formData.equipmentLocation} onChange={e=>setFormData({...formData, equipmentLocation: e.target.value})}>
                           <option>Attic / Exterior</option>
                           <option>Garage / Closet</option>
                           <option>Roof (Package Unit)</option>
                           <option>Basement</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Homeowner?</label>
                        <select className="input-field mt-1 text-xs" value={formData.isHomeowner} onChange={e=>setFormData({...formData, isHomeowner: e.target.value})}>
                           <option>Yes (Decision Maker)</option>
                           <option>Yes (Spouse absent)</option>
                           <option>Renter / Tenant</option>
                           <option>Property Manager</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Plan</label>
                        <select className="input-field mt-1 text-xs" value={formData.paymentMethod} onChange={e=>setFormData({...formData, paymentMethod: e.target.value})}>
                           <option>Financing Included</option>
                           <option>Cash / Check</option>
                           <option>Credit Card</option>
                        </select>
                     </div>
                  </div>

                  {/* Step 9: Notes */}
                  <div className="border-t border-slate-100 pt-4 pb-4">
                     <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Access & Gate Codes (Dogs?)</label>
                     <input type="text" placeholder="e.g. Gate code #1234, beware of dog" value={formData.gateCodeOrPets} onChange={e=>setFormData({...formData, gateCodeOrPets: e.target.value})} className="input-field text-sm" />
                     
                     <label className="text-[10px] font-bold text-slate-500 uppercase block mt-4 mb-2 flex items-center gap-1">
                        <MessageSquare size={10} /> Caller Notes / Demeanor
                     </label>
                     <textarea placeholder="Summarize the issue..." required value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm h-24 outline-none focus:border-primary-500"></textarea>
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                     <CalendarClock size={20} />
                     {loading ? 'Processing...' : 'Send to Dispatch Board'}
                  </button>
               </form>
            </div>

            {/* RIGHT PANEL: SERVICE BOARD (70%) */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
               <DispatchCalendar 
                  pipeline={pipeline} 
                  onScheduleJob={handleScheduleJob}
               />
            </div>

         </div>
      </div>
   );
}
