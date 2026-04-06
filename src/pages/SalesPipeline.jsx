import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, PlusCircle, Calendar, MapPin, Pen, Activity, CheckSquare, Search, ChevronRight, FileText, Clock, File, Edit3, Trash2, ShieldCheck, Zap, Image as ImageIcon } from 'lucide-react';
import Modal from '../components/Modal';
import { supabase } from '../supabaseClient';
import { useCustomers } from '../context/CustomerContext';
import DispatchCalendar from '../components/DispatchCalendar';

const PIPELINE_STAGES = [
  { id: 'New Lead', title: 'Incoming Leads', color: '#94a3b8' },
  { id: 'Site Survey Scheduled', title: 'Survey Scheduled', color: '#c084fc' },
  { id: 'Proposal Building', title: 'Building Quote', color: '#60a5fa' },
  { id: 'Proposal Sent', title: 'Proposal Sent', color: '#38bdf8' },
  { id: 'Deal Won', title: 'Deal Won / Setup', color: '#34d399' },
  { id: 'Lost', title: 'Lost Deal', color: '#ef4444' }
];

const initialPipeline = PIPELINE_STAGES.reduce((acc, stage) => {
  acc[stage.id] = [];
  return acc;
}, {});

export default function SalesPipeline() {
  const { customers } = useCustomers();
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban');

  // Modals & Forms
  const [activeJob, setActiveJob] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState('');

  const [newLeadForm, setNewLeadForm] = useState({ household_id: '', issue_description: '', urgency: 'Medium' });
  const [editJobForm, setEditJobForm] = useState({ issue_description: '', urgency: 'Medium', status: '' });

  // Temporary ID holders
  const [pendingLostDeal, setPendingLostDeal] = useState(null);
  const [deletingJob, setDeletingJob] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
     if (activeJob) {
        setEditJobForm({
           issue_description: activeJob.issue || '',
           urgency: activeJob.urgency || 'Medium',
           status: activeJob.status || ''
        });
        setIsEditingJob(false);
     }
  }, [activeJob]);

  useEffect(() => {
    fetchOpportunities();
    
    // Live Supabase Subscriptions
    const channel = supabase.channel('realtime_opportunities')
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
          id,
          status,
          urgency_level,
          issue_description,
          site_survey_data,
          proposal_data,
          scheduled_date,
          scheduled_time_block,
          dispatch_notes,
          assigned_crew_id,
          created_at,
          households (
             id,
             household_name,
             addresses!households_service_address_id_fkey ( street_address, city )
          )
        `);
      if (error) throw error;

      if (data) {
        const sortedMap = { ...initialPipeline };
        // Reset arrays
        Object.keys(sortedMap).forEach(k => sortedMap[k] = []);
        
        data.forEach(opp => {
          const addr = opp.households?.addresses;
          const addressString = addr ? `${addr.street_address}` : 'No address';
          
          const jobCard = {
            id: opp.id,
            displayId: opp.id.substring(0,8).toUpperCase(),
            status: opp.status,
            customerName: opp.households?.household_name || 'Unknown',
            address: addressString,
            date: new Date(opp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            urgency: opp.urgency_level,
            issue: opp.issue_description,
            surveyPhotos: opp.site_survey_data?.photos || null,
            proposalData: opp.proposal_data || null,
            scheduled_date: opp.scheduled_date,
            scheduled_time_block: opp.scheduled_time_block,
            dispatch_notes: opp.dispatch_notes,
            assigned_crew_id: opp.assigned_crew_id
          };
          
          if (opp.status === 'Contact Attempted') {
             sortedMap['New Lead'].push(jobCard);
          } else if (sortedMap[opp.status]) {
             sortedMap[opp.status].push(jobCard);
          } else if (opp.status === 'Job Completed') {
             // Do nothing for Kanban view
          } else {
             // Fallback if status doesn't match enum
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

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;

    // Optimistically update UI
    setPipeline(prev => {
      const newPipeline = { ...prev };
      const sArr = [...newPipeline[sourceCol]];
      const dArr = sourceCol === destCol ? sArr : [...newPipeline[destCol]];
      
      const [movedJob] = sArr.splice(source.index, 1);
      movedJob.status = destCol; // Update internal status
      
      dArr.splice(destination.index, 0, movedJob);
      
      newPipeline[sourceCol] = sArr;
      if (sourceCol !== destCol) {
        newPipeline[destCol] = dArr;
      }
      return newPipeline;
    });

    // Lost Deal Post-Mortem Intercept
    if (destCol === 'Lost') {
       setPendingLostDeal(draggableId);
       setIsLostModalOpen(true);
       return; // Paused until modal is saved.
    }

    // Persist to Supabase natively
    const { error } = await supabase.from('opportunities').update({ status: destCol }).eq('id', draggableId);
    if (error) {
       console.error("Drag update failed:", error);
       fetchOpportunities(); // Revert on failure
    }
  };

  const handleSaveEdit = async () => {
      if (!activeJob) return;
      const { error } = await supabase.from('opportunities').update({
         issue_description: editJobForm.issue_description,
         urgency_level: editJobForm.urgency,
         status: editJobForm.status
      }).eq('id', activeJob.id);
      
      if (!error) {
         fetchOpportunities();
         const updatedJob = { ...activeJob, issue: editJobForm.issue_description, urgency: editJobForm.urgency, status: editJobForm.status };
         setActiveJob(updatedJob);
         setIsEditingJob(false);
      }
  };

  const handleDeleteJob = async () => {
      const jobToDelete = deletingJob;
      if (!jobToDelete) return;

      // Unblock deletion by removing child work orders that reference this deal
      await supabase.from('work_orders').delete().eq('opportunity_id', jobToDelete.id);

      const { error } = await supabase.from('opportunities').delete().eq('id', jobToDelete.id);
      if (!error) {
         fetchOpportunities();
         if (activeJob?.id === jobToDelete.id) {
             setActiveJob(null);
         }
         setDeletingJob(null);
         setDeleteError(null);
      } else {
         console.error('Error deleting job:', error);
         setDeleteError("Failed to delete deal. Database rejected it: " + error.message);
      }
  };

  const handleMarkContacted = async (e, jobId) => {
    e.stopPropagation();
    const { error } = await supabase.from('opportunities').update({ status: 'Contact Attempted' }).eq('id', jobId);
    if (!error) fetchOpportunities();
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!newLeadForm.household_id) return alert('Select a customer first.');

    const { error } = await supabase.from('opportunities').insert({
       household_id: newLeadForm.household_id,
       urgency_level: newLeadForm.urgency,
       issue_description: newLeadForm.issue_description,
       status: 'New Lead'
    });
    
    if (error) {
      console.error("Failed to create deal", error);
    } else {
      setIsNewLeadOpen(false);
      setNewLeadForm({ household_id: '', issue_description: '', urgency: 'Medium' });
      fetchOpportunities();
    }
  };

  const handleSaveLostReason = async () => {
    if (!pendingLostDeal || !lostReason) return;
    // Log Activity (Graveyard recording)
    await supabase.from('activity_logs').insert({
       household_id: pipeline['Lost'].find(j => j.id === pendingLostDeal)?.household_id, // we don't have household id in draggableId easily without fetch, skipped for MVP
       activity_type: 'Deal Lost',
       description: `Deal marked as lost. Reason: ${lostReason}`
    });
    // Persist status
    await supabase.from('opportunities').update({ status: 'Lost' }).eq('id', pendingLostDeal);
    
    setIsLostModalOpen(false);
    setPendingLostDeal(null);
    setLostReason('');
  };

  const Column = ({ title, columnId, color, jobs }) => (
    <div className="pipeline-col bg-slate-50/80 shadow-sm border border-slate-200/60 rounded-lg" style={{ padding: '0.4rem', flex: '1 1 0', minWidth: '160px', borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column' }}>
      <div className="flex justify-between items-center mb-2 px-1">
        <h3 className="font-bold text-slate-700 text-[10px] uppercase tracking-tighter truncate leading-tight mr-1" title={title}>{title}</h3>
        <span className="badge shrink-0 font-bold" style={{ background: 'var(--color-slate-200)', color: 'var(--color-slate-600)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.65rem' }}>
          {jobs.length}
        </span>
      </div>
      
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div 
            className={`pipeline-cards flex flex-col gap-2 flex-1 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100/50 rounded' : ''}`} 
            style={{ minHeight: '100px' }}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {jobs.map((job, index) => (
              <Draggable key={job.id} draggableId={job.id} index={index}>
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    style={provided.draggableProps.style}
                    className={`job-card bg-white p-2 rounded shadow-sm border border-slate-200 cursor-grab hover:border-primary-400 transition-shadow transition-colors ${snapshot.isDragging ? 'shadow-2xl shadow-primary-500/20 z-[9999] ring-2 ring-primary-500 opacity-95 relative' : ''}`}
                    onClick={() => { setActiveJob(job); setActiveTab('details'); }}
                  >
                    <div className="flex justify-between items-start mb-1 gap-1">
                       <span className="font-bold text-slate-800 text-xs leading-tight break-words">{job.customerName}</span>
                       <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${job.urgency === 'High' ? 'bg-red-100 text-red-700' : job.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                           {job.urgency === 'High' ? 'HOT' : job.urgency}
                       </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-2 truncate">
                      <MapPin size={10} className="shrink-0 text-slate-400" /> <span className="truncate">{job.address}</span>
                    </div>
                    {job.issue && (
                       <div className="text-[10px] text-slate-500 truncate border-t border-slate-100 pt-1 mt-1 font-medium">"{job.issue}"</div>
                    )}
                    
                    {/* New Lead Column Specific Actions */}
                    {columnId === 'New Lead' && (
                       <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                          {job.status === 'Contact Attempted' ? (
                             <span className="text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">Contacted</span>
                          ) : (
                             <button onClick={(e) => handleMarkContacted(e, job.id)} className="text-[9px] font-bold text-primary-600 hover:text-primary-800 hover:bg-primary-50 px-1.5 py-0.5 rounded transition-colors uppercase tracking-wide flex items-center gap-1">
                                Mark Contacted
                             </button>
                          )}
                       </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );

  return (
    <div className="page-container fade-in flex flex-col h-full">
      <header className="page-header shrink-0 pb-4">
        <div>
          <h1 className="page-title">Sales Operations</h1>
          <p className="page-subtitle">Track opportunities strictly from Lead Intake to Job Execution.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex bg-slate-200/50 p-1 rounded-md shadow-inner border border-slate-200">
            <button className={`px-4 py-1.5 text-sm font-bold rounded transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('kanban')}>Kanban Board</button>
            <button className={`px-4 py-1.5 text-sm font-bold rounded transition-all flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setViewMode('calendar')}><Calendar size={14}/> Calendar View</button>
          </div>
          <button className="primary-action-btn" onClick={() => setIsNewLeadOpen(true)}>
            <PlusCircle size={18} className="mr-2" /> New Internal Deal
          </button>
        </div>
      </header>
      
      {loading ? (
        <div className="flex-center h-64 flex-col text-slate-500 animate-pulse"><div className="loader mb-4"></div>Syncing Boards...</div>
      ) : viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="pipeline-board flex gap-2 overflow-x-auto pb-6 pt-2 flex-1 items-stretch w-full">
            {PIPELINE_STAGES.map(stage => (
              <Column key={stage.id} columnId={stage.id} title={stage.title} color={stage.color} jobs={pipeline[stage.id]} />
            ))}
          </div>
        </DragDropContext>
      ) : (
         <DispatchCalendar 
            pipeline={pipeline} 
            readOnly={true}
            onCardClick={(job) => { setActiveJob(job); setActiveTab('details'); }} 
         />
      )}

      {/* Lost Deal Post-Mortem */}
      <Modal isOpen={isLostModalOpen} onClose={() => { setIsLostModalOpen(false); fetchOpportunities(); /* Revert on cancel */ }} title="Mark Deal as Lost">
         <div className="modal-form">
            <p className="text-sm text-slate-600 mb-4">To ensure accurate reporting, please state why this deal was lost.</p>
            <div className="form-group">
               <label>Reason for Loss</label>
               <select value={lostReason} onChange={(e) => setLostReason(e.target.value)} required className="w-full border border-slate-300 p-2 rounded-md">
                  <option value="">Select a reason...</option>
                  <option value="Price Too High">Price Too High</option>
                  <option value="Went with Competitor">Went with Competitor (Add note below)</option>
                  <option value="Repair Instead">Customer Chose Repair Instead</option>
                  <option value="Financing Denied">Financing Denied</option>
                  <option value="Unresponsive">Ghosted / Unresponsive</option>
               </select>
            </div>
            <div className="modal-actions">
               <button className="btn-secondary" onClick={() => { setIsLostModalOpen(false); fetchOpportunities(); }}>Cancel</button>
               <button className="btn-primary" style={{ background: 'var(--color-danger)' }} onClick={handleSaveLostReason}>Save & Move to Graveyard</button>
            </div>
         </div>
      </Modal>

      {/* New Deal Modal */}
      <Modal isOpen={isNewLeadOpen} onClose={() => setIsNewLeadOpen(false)} title="Inject Lead to Pipeline">
         <form className="modal-form" onSubmit={handleCreateLead}>
            <div className="form-group">
               <label>Select Household Profile</label>
               <select value={newLeadForm.household_id} onChange={(e) => setNewLeadForm({...newLeadForm, household_id: e.target.value})} required className="w-full border border-slate-300 p-2 rounded-md">
                  <option value="">Search existing customers...</option>
                  {customers.map(c => (
                     <option key={c.id} value={c.id}>{c.name} ({c.address})</option>
                  ))}
               </select>
               <p className="text-xs text-slate-400 mt-1">Don't see them? Go to Customers tab first.</p>
            </div>
            <div className="form-group mt-4">
               <label>Urgency</label>
               <select value={newLeadForm.urgency} onChange={(e) => setNewLeadForm({...newLeadForm, urgency: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md">
                  <option value="Low">Low - System Working</option>
                  <option value="Medium">Medium - Failing / Noisy</option>
                  <option value="High">Emergency - System Down!</option>
               </select>
            </div>
            <div className="form-group mt-4">
               <label>Issue Notes</label>
               <textarea value={newLeadForm.issue_description} onChange={(e) => setNewLeadForm({...newLeadForm, issue_description: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md h-24" placeholder="What is the customer's problem or request?"></textarea>
            </div>
            <div className="modal-actions mt-6">
               <button type="button" className="btn-secondary" onClick={() => setIsNewLeadOpen(false)}>Cancel</button>
               <button type="submit" className="btn-primary">Generate Deal</button>
            </div>
         </form>
      </Modal>

      {/* Job Details Viewer */}
      <Modal isOpen={activeJob !== null} onClose={() => { setActiveJob(null); setActiveTab('details'); }} title={`Deal #${activeJob?.displayId}`}>
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
                  Survey Photos {activeJob?.surveyPhotos && Object.values(activeJob.surveyPhotos).some(Boolean) ? '📸' : ''}
               </button>
               <button 
                  className={`pb-2 transition-colors ${activeTab === 'proposal' ? 'border-b-2 border-primary-500 text-primary-600' : 'hover:text-slate-700'}`}
                  onClick={() => setActiveTab('proposal')}
               >
                  Generated Proposal {activeJob?.proposalData ? '📝' : ''}
               </button>
             </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-4">
               {activeTab === 'details' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex flex-col h-full min-h-[300px]">
                     {isEditingJob ? (
                        <div className="space-y-4">
                           <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">Edit Deal #{activeJob?.displayId}</h3>
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
                                    {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
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
                           <h3 className="font-bold text-lg mb-1">{activeJob?.customerName}</h3>
                           <p className="text-sm text-slate-500 mb-4">{activeJob?.address}</p>
                           
                           <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-4 flex items-center justify-between">
                              <div>
                                 <p className="text-xs font-bold text-slate-400 mb-1">URGENCY</p>
                                 <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeJob?.urgency === 'High' ? 'bg-red-100 text-red-700' : activeJob?.urgency === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {activeJob?.urgency}
                                 </span>
                              </div>
                              <div className="text-right">
                                 <p className="text-xs font-bold text-slate-400 mb-1">CURRENT STATUS</p>
                                 <p className="text-sm font-semibold text-slate-700">{activeJob?.status}</p>
                              </div>
                           </div>

                           <div className="bg-blue-50/50 p-4 rounded-md border border-blue-100">
                              <p className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1"><FileText size={14}/> INTERNAL NOTES</p>
                              <p className="text-slate-800 text-sm italic">{activeJob?.issue || 'No notes provided by staff.'}</p>
                           </div>

                           {viewMode !== 'calendar' && (
                              <div className="pt-6 border-t border-slate-100 flex justify-between items-center mt-auto">
                                 <button onClick={() => setDeletingJob(activeJob)} className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs font-bold py-2 px-3 rounded flex items-center gap-1 transition-colors">
                                    <Trash2 size={14} /> Delete Deal
                                 </button>
                                 <button onClick={() => setIsEditingJob(true)} className="btn-secondary text-xs flex items-center gap-1">
                                    <Edit3 size={14} /> Quick Edit
                                 </button>
                              </div>
                           )}
                        </>
                     )}
                  </motion.div>
               )}


               {activeTab === 'proposal' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="h-full">
                     {!activeJob?.proposalData ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded border border-slate-200 text-center shadow-sm h-full">
                           <ShieldCheck size={48} className="text-slate-300 mb-4" />
                           <h4 className="font-bold text-slate-600 mb-2 text-lg">No Digital Proposal Generated</h4>
                           <p className="text-sm text-slate-500 max-w-sm leading-relaxed">This deal was manually created or pushed back without completing the Proposal Wizard. Generate a new estimate to automatically inject the 3-Tier retail pricing view here.</p>
                        </div>
                     ) : (
                        <div className="space-y-6">
                           <div className="text-center mb-6">
                              <h2 className="text-xl font-black text-slate-800 tracking-tight">Investment Options</h2>
                              <p className="text-sm text-slate-500 mt-1">Generated {new Date(activeJob.proposalData.generatedAt).toLocaleDateString()} for {activeJob?.customerName}</p>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* BEST TIER */}
                              {activeJob.proposalData.tiers.best && (
                                 <motion.div whileHover={{ y: -5 }} className="relative bg-white rounded-xl border-2 border-primary-500 shadow-xl overflow-hidden flex flex-col">
                                    <div className="absolute top-0 left-0 right-0 bg-primary-500 text-white text-center text-xs font-bold py-1 tracking-widest uppercase">
                                       Best Option
                                    </div>
                                    <div className="p-6 pt-10 text-center border-b border-slate-100 flex-1">
                                       <h3 className="text-2xl font-black text-slate-800">${activeJob.proposalData.tiers.best.salesPrice.toLocaleString()}</h3>
                                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Turnkey Total</p>
                                       
                                       <div className="mt-4 inline-block bg-primary-50 px-3 py-1 rounded-full text-primary-700 text-xs font-bold border border-primary-100">
                                          {activeJob.proposalData.tiers.best.brand} {activeJob.proposalData.tiers.best.tons}T
                                       </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 flex-1">
                                       <ul className="space-y-3">
                                          {activeJob.proposalData.tiers.best.features.map((feat, i) => (
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
                              {activeJob.proposalData.tiers.better && (
                                 <motion.div whileHover={{ y: -5 }} className="relative bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden flex flex-col">
                                    <div className="absolute top-0 left-0 right-0 bg-slate-700 text-white text-center text-xs font-bold py-1 tracking-widest uppercase">
                                       Better Option
                                    </div>
                                    <div className="p-6 pt-10 text-center border-b border-slate-100 flex-1">
                                       <h3 className="text-2xl font-black text-slate-800">${activeJob.proposalData.tiers.better.salesPrice.toLocaleString()}</h3>
                                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Turnkey Total</p>
                                       
                                       <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded-full text-slate-600 text-xs font-bold border border-slate-200">
                                          {activeJob.proposalData.tiers.better.brand} {activeJob.proposalData.tiers.better.tons}T
                                       </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 flex-1">
                                       <ul className="space-y-3">
                                          {activeJob.proposalData.tiers.better.features.map((feat, i) => (
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
                              {activeJob.proposalData.tiers.good && (
                                 <motion.div whileHover={{ y: -5 }} className="relative bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col opacity-90 hover:opacity-100">
                                    <div className="absolute top-0 left-0 right-0 bg-slate-300 text-slate-600 text-center text-xs font-bold py-1 tracking-widest uppercase">
                                       Good Option
                                    </div>
                                    <div className="p-6 pt-10 text-center border-b border-slate-100 flex-1">
                                       <h3 className="text-2xl font-black text-slate-800">${activeJob.proposalData.tiers.good.salesPrice.toLocaleString()}</h3>
                                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Turnkey Total</p>
                                       
                                       <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded-full text-slate-500 text-xs font-bold border border-slate-200">
                                          {activeJob.proposalData.tiers.good.brand} {activeJob.proposalData.tiers.good.tons}T
                                       </div>
                                    </div>
                                    <div className="p-5 bg-slate-50 flex-1">
                                       <ul className="space-y-3">
                                          {activeJob.proposalData.tiers.good.features.map((feat, i) => (
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
                     {!activeJob?.surveyPhotos || !Object.values(activeJob.surveyPhotos).some(Boolean) ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded border border-slate-200 text-center">
                           <ImageIcon size={48} className="text-slate-300 mb-3" />
                           <h4 className="font-bold text-slate-600 mb-1">No Photos Attached</h4>
                           <p className="text-xs text-slate-500 max-w-xs">The salesperson did not upload any site survey images for this deal during the proposal creation.</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-2 gap-4">
                           {Object.entries(activeJob.surveyPhotos).map(([key, url]) => {
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
               <button className="btn-secondary w-full" onClick={() => { setActiveJob(null); setActiveTab('details'); }}>Close Deal Window</button>
            </div>
         </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deletingJob} onClose={() => { setDeletingJob(null); setDeleteError(null); }} title="Delete Pipeline Deal">
         <div className="modal-form" style={{ textAlign: 'center', padding: '1rem 0' }}>
            <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.5rem' }}>
               Are you sure you want to completely delete Deal <strong>#{deletingJob?.displayId}</strong> for <strong>{deletingJob?.customerName}</strong>? This action permanently erases the lead and cannot be undone.
            </p>
            {deleteError && (
               <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded mb-4 text-xs font-bold font-mono">
                  {deleteError}
               </div>
            )}
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem' }}>
               <button className="btn-secondary" onClick={() => { setDeletingJob(null); setDeleteError(null); }}>Cancel</button>
               <button className="btn-primary" style={{ background: 'var(--color-danger)' }} onClick={handleDeleteJob}>Delete Deal</button>
            </div>
         </div>
      </Modal>
    </div>
  );
}
