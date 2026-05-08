import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PIPELINE_STATES, PipelineController } from '../utils/pipelineControls';
import { AlertTriangle, Clock, ArrowRight, DollarSign, Calendar, Zap, AlertCircle, MapPin, UserCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import OpportunityOverviewModal from '../components/OpportunityOverviewModal';
import { formatQuoteId } from '../utils/formatters';
import { useProposals } from '../context/ProposalContext';
import { useAuth } from '../context/AuthContext';

const PIPELINE_COLUMNS = [
  { id: PIPELINE_STATES.NEW_LEAD, title: 'Incoming Leads', color: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-700' },
  { id: PIPELINE_STATES.QUOTING, title: 'Quoting', color: 'border-purple-300', bg: 'bg-purple-100', text: 'text-purple-700' },
  { id: PIPELINE_STATES.SENT, title: 'Proposal Sent', color: 'border-blue-300', bg: 'bg-blue-100', text: 'text-blue-700' },
  { id: PIPELINE_STATES.NEEDS_SCHEDULING, title: 'Needs Scheduling', color: 'border-amber-300', bg: 'bg-amber-100', text: 'text-amber-700' },
  { id: PIPELINE_STATES.SCHEDULED, title: 'Scheduled', color: 'border-emerald-300', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { id: PIPELINE_STATES.LOST, title: 'Lost Deal', color: 'border-red-300', bg: 'bg-red-100', text: 'text-red-700' }
];

export default function SalesPipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { proposals, createDraft } = useProposals();
  const [pipeline, setPipeline] = useState({});
  const [pipelineFilter, setPipelineFilter] = useState('All Deals');
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeAssignMenu, setActiveAssignMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspectingJob, setInspectingJob] = useState(null);

  useEffect(() => {
    fetchOpportunities();
    const channel = supabase.channel('realtime_pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => fetchOpportunities())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [pipelineFilter]);

  const fetchOpportunities = async () => {
    try {
      const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, avatar_url');
      if (usersData) setTeamMembers(usersData);

      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id, status, urgency_level, issue_description, created_at, updated_at, scheduled_date, scheduled_time_block,
          proposal_data, household_id, assigned_salesperson_id,
          households ( household_name, contacts ( primary_phone, email ), addresses!households_service_address_id_fkey ( id, street_address, city ) )
        `)
        .eq('is_active', true);
        
      if (error) throw error;

      const grouped = PIPELINE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {});
      
      data?.forEach(opp => {
        // Exclude service calls from the sales pipeline
        if (opp.proposal_data?.type === 'SERVICE') return;

        // Apply Filters
        if (pipelineFilter === 'My Deals' && opp.assigned_salesperson_id !== user?.id) return;
        if (pipelineFilter === 'Unassigned' && opp.assigned_salesperson_id !== null) return;

        if (grouped[opp.status]) {
          grouped[opp.status].push(opp);
        } else if (opp.status !== PIPELINE_STATES.VOIDED && opp.status !== PIPELINE_STATES.PENDING_VOID && opp.status !== PIPELINE_STATES.COMPLETED) {
            // Failsafe for orphaned states
            grouped[PIPELINE_STATES.NEW_LEAD].push(opp);
        }
      });
      
      // Sort by creation date descending inside columns
      Object.keys(grouped).forEach(k => {
          grouped[k].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      });

      setPipeline(grouped);
    } catch (err) {
      console.error("Error fetching pipeline:", err);
      toast.error("Failed to load CRM data.");
    } finally {
      setLoading(false);
    }
  };

  const calculateHoursInStage = (dateString) => {
      const hours = (new Date() - new Date(dateString)) / (1000 * 60 * 60);
      return Math.max(0, hours);
  };

  const getEstValue = (proposalData) => {
      if (!proposalData?.systemTiers || proposalData.systemTiers.length === 0) return 0;
      let maxVal = 0;
      proposalData.systemTiers.forEach(sys => {
          const t = sys.tiers || sys.altTiers;
          if (t) {
             const prices = [t.good?.salesPrice, t.better?.salesPrice, t.best?.salesPrice].filter(Boolean);
             if (prices.length) maxVal += Math.max(...prices);
          }
      });
      return maxVal;
  };

  if (loading) {
     return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 h-[calc(100vh-64px)] overflow-hidden bg-slate-50/50 relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-100/40 blur-3xl"></div>
            <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-purple-100/40 blur-3xl"></div>
        </div>
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 z-10">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-1">
                    <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl shadow-inner border border-emerald-200">
                        <Zap size={24} strokeWidth={2.5}/>
                    </div>
                    Sales Pipeline
                </h1>
                <p className="text-slate-500 font-medium ml-1">High-density revenue tracking. Logical progression only.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
               <button onClick={() => setPipelineFilter('All Deals')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${pipelineFilter === 'All Deals' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>All Deals</button>
               <button onClick={() => setPipelineFilter('My Deals')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${pipelineFilter === 'My Deals' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:text-primary-600 hover:bg-primary-50'}`}>My Deals</button>
               <button onClick={() => setPipelineFilter('Unassigned')} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${pipelineFilter === 'Unassigned' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'}`}>Unassigned</button>
            </div>
        </div>

        {/* Main Kanban Container */}
        <div className="flex-1 flex flex-col min-h-0 z-10">
            <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar h-full px-1">
                {PIPELINE_COLUMNS.map(col => {
                    const columnJobs = pipeline[col.id] || [];
                    
                    let headerTheme = { bg: 'bg-slate-50/80', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-400' };
                    if (col.id === PIPELINE_STATES.NEW_LEAD) headerTheme = { bg: 'bg-slate-100/80', border: 'border-slate-300', text: 'text-slate-800', icon: 'text-slate-500' };
                    if (col.id === PIPELINE_STATES.QUOTING) headerTheme = { bg: 'bg-purple-50/80', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-500' };
                    if (col.id === PIPELINE_STATES.SENT) headerTheme = { bg: 'bg-blue-50/80', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' };
                    if (col.id === PIPELINE_STATES.NEEDS_SCHEDULING) headerTheme = { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' };
                    if (col.id === PIPELINE_STATES.SCHEDULED) headerTheme = { bg: 'bg-emerald-50/80', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-500' };
                    if (col.id === PIPELINE_STATES.LOST) headerTheme = { bg: 'bg-red-50/80', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' };

                    return (
                        <div key={col.id} className="flex flex-col flex-1 min-w-[300px] max-w-[340px] shrink-0 bg-white/60 backdrop-blur-xl rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                            <div className={`p-4 border-b ${headerTheme.border} ${headerTheme.bg} flex justify-between items-center backdrop-blur-md`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${headerTheme.text.replace('text', 'bg')}`}></div>
                                    <span className={`font-black uppercase tracking-widest text-[11px] ${headerTheme.text}`}>{col.title}</span>
                                </div>
                                <span className={`bg-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm border ${headerTheme.border} ${headerTheme.text}`}>{columnJobs.length}</span>
                            </div>

                            <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 hide-scrollbar">
                                {columnJobs.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 border-2 border-dashed border-slate-200/60 rounded-2xl bg-slate-50/30">
                                        <div className={`p-3 rounded-full ${headerTheme.bg} mb-3`}>
                                            <AlertCircle className={headerTheme.icon} size={20} />
                                        </div>
                                        <span className="text-slate-400 font-bold text-sm">No deals in this stage</span>
                                    </div>
                                )}

                                {columnJobs.map(job => {
                                    const hoursInStage = calculateHoursInStage(job.updated_at || job.created_at);
                                    const isLeadSLA = col.id === PIPELINE_STATES.NEW_LEAD && hoursInStage > 2;
                                    const isSentSLA = col.id === PIPELINE_STATES.SENT && hoursInStage > 48;
                                    const isSLA_Violated = isLeadSLA || isSentSLA;
                                    
                                    const estValue = getEstValue(job.proposal_data);
                                    
                                    const associatedProposal = proposals.find(p => p.associated_opportunity_id === job.id || p.proposal_data?.associated_opportunity_id === job.id);
                                    const displayId = associatedProposal ? formatQuoteId(associatedProposal) : formatQuoteId(job);
                                    const assignedRep = job.assigned_salesperson_id ? teamMembers.find(m => m.id === job.assigned_salesperson_id) : null;

                                    return (
                                        <div key={job.id} onClick={() => setInspectingJob(job)} className={`group relative cursor-pointer bg-white rounded-2xl shadow-sm border p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isSLA_Violated ? 'border-red-300/60 shadow-[0_4px_20px_rgba(239,68,68,0.15)]' : 'border-slate-200/80 hover:border-slate-300'}`}>
                                            
                                            {isSLA_Violated && (
                                                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider animate-in zoom-in">
                                                    <AlertTriangle size={12} strokeWidth={3} /> {Math.floor(hoursInStage)}h Overdue
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col pr-4">
                                                    <h4 className="font-black text-slate-800 text-base leading-tight truncate">{(job.households?.household_name || 'Unknown Client').replace(/ Account$/i, '').trim()}</h4>
                                                    <span className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                                       <span className="whitespace-nowrap">{new Date(job.created_at).toLocaleDateString()}</span> 
                                                       <span className="text-slate-300 whitespace-nowrap">&bull;</span> 
                                                       <span className="font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">{displayId}</span>
                                                    </span>
                                                </div>
                                                {estValue > 0 && <div className="font-black text-emerald-600 text-sm bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50">${estValue.toLocaleString()}</div>}
                                            </div>

                                            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/80 flex flex-col gap-2 mb-4">
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                                                    <MapPin size={12} className="text-slate-400"/> 
                                                    <span className="truncate">{job.households?.addresses?.[0]?.city || 'No city provided'}</span>
                                                </div>
                                                
                                                {col.id === PIPELINE_STATES.NEW_LEAD && (
                                                    <div className="mt-1 pl-3 border-l-2 border-primary-300">
                                                        <span className="text-[11px] font-bold text-slate-700 line-clamp-2">{job.issue_description}</span>
                                                    </div>
                                                )}
                                                
                                                {col.id === PIPELINE_STATES.SCHEDULED && job.scheduled_date && (
                                                    <div className="flex items-center gap-1.5 mt-1 bg-emerald-100/50 text-emerald-700 px-2 py-1.5 rounded-lg w-fit border border-emerald-200/50">
                                                        <Calendar size={12} strokeWidth={2.5}/> 
                                                        <span className="text-[10px] font-black uppercase tracking-wider">{new Date(job.scheduled_date).toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric'})}</span>
                                                        {job.scheduled_time_block && <span className="text-[10px] font-black bg-white/60 px-1.5 rounded ml-1">{job.scheduled_time_block}</span>}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-2">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-0 truncate">
                                                    <Clock size={12} className="shrink-0" /> <span className="truncate">{Math.floor(hoursInStage)}h in stage</span>
                                                </div>

                                                {assignedRep && (
                                                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm shrink-0">
                                                        {assignedRep.avatar_url ? (
                                                            <img src={assignedRep.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[8px]">{assignedRep.full_name?.substring(0, 2).toUpperCase()}</div>
                                                        )}
                                                        <span className="max-w-[70px] truncate">{assignedRep.full_name?.split(' ')[0]}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex justify-end mt-3">
                                                {col.id === PIPELINE_STATES.NEW_LEAD && (
                                                    <button onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await PipelineController.startProposal(job.id, job.status);
                                                            
                                                            await createDraft({
                                                                customer: job.households?.household_name || 'Unknown Client',
                                                                amount: 0,
                                                                associated_opportunity_id: job.id,
                                                                proposal_data: {
                                                                    associated_opportunity_id: job.id,
                                                                    wizard_state: {
                                                                        step: 2,
                                                                        selectedCustomerId: job.household_id,
                                                                        selectedLocationId: job.service_address_id || job.households?.addresses?.[0]?.id || ''
                                                                    }
                                                                }
                                                            });

                                                            localStorage.setItem('pilar_draft_customer', JSON.stringify({
                                                                id: job.id,
                                                                household_id: job.household_id,
                                                                site_survey_data: { property_id: job.service_address_id || job.households?.addresses?.[0]?.id || '' },
                                                                forceStep: 2
                                                            }));
                                                            navigate(`/proposals?action=resume_opp&opp_id=${job.id}`);
                                                        } catch (err) {
                                                            toast.error('Failed to transition lead.');
                                                        }
                                                    }} className="text-[10px] font-black text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-all shadow-sm shadow-primary-600/20 uppercase tracking-widest flex items-center gap-1.5 w-full justify-center">
                                                        Start Quote <ArrowRight size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                                {col.id === PIPELINE_STATES.NEEDS_SCHEDULING && (
                                                    <button onClick={(e) => { e.stopPropagation(); setInspectingJob(job); }} className="text-[10px] font-black text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all border border-amber-200/50 uppercase tracking-widest flex items-center gap-1.5 w-full justify-center">
                                                        View Deal <ArrowRight size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                                {col.id === PIPELINE_STATES.SCHEDULED && (
                                                    <button onClick={(e) => { e.stopPropagation(); setInspectingJob(job); }} className="text-[10px] font-black text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-all border border-emerald-200/50 uppercase tracking-widest flex items-center gap-1.5 w-full justify-center">
                                                        View Deal <ArrowRight size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                                {col.id === PIPELINE_STATES.QUOTING && (
                                                    <button onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        localStorage.setItem('pilar_draft_customer', JSON.stringify({
                                                            id: job.id,
                                                            household_id: job.household_id,
                                                            site_survey_data: { property_id: job.service_address_id || job.households?.addresses?.[0]?.id || '' },
                                                            forceStep: 2
                                                        }));
                                                        navigate(`/proposals?action=resume_opp&opp_id=${job.id}`); 
                                                    }} className="text-[10px] font-black text-purple-700 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-all border border-purple-200/50 uppercase tracking-widest flex items-center gap-1.5 w-full justify-center">
                                                        Resume <ArrowRight size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                                {col.id === PIPELINE_STATES.SENT && (
                                                    <button onClick={(e) => { e.stopPropagation(); setInspectingJob(job); }} className="text-[10px] font-black text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-all border border-blue-200/50 uppercase tracking-widest flex items-center gap-1.5 w-full justify-center">
                                                        View Proposal <ArrowRight size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      <OpportunityOverviewModal 
          isOpen={!!inspectingJob} 
          onClose={() => setInspectingJob(null)} 
          job={inspectingJob} 
          onAction={async (job) => {
              if (job.status === 'NEW_LEAD') {
                  try {
                      await PipelineController.startProposal(job.id, job.status);
                      
                      await createDraft({
                          customer: job.households?.household_name || 'Unknown Client',
                          amount: 0,
                          associated_opportunity_id: job.id,
                          proposal_data: {
                              associated_opportunity_id: job.id,
                              wizard_state: {
                                  step: 2,
                                  selectedCustomerId: job.household_id,
                                  selectedLocationId: job.service_address_id || job.households?.addresses?.[0]?.id || ''
                              }
                          }
                      });

                      localStorage.setItem('pilar_draft_customer', JSON.stringify({
                          id: job.id,
                          household_id: job.household_id,
                          site_survey_data: {
                              property_id: job.service_address_id || job.households?.addresses?.[0]?.id || ''
                          },
                          forceStep: 2
                      }));
                      navigate(`/proposals?action=resume_opp&opp_id=${job.id}`);
                  } catch (e) { toast.error('Failed to transition lead.'); }
              } else if (job.status === 'QUOTING' || job.status === 'PROPOSAL_SENT') {
                  localStorage.setItem('pilar_draft_customer', JSON.stringify({
                      id: job.id,
                      household_id: job.household_id,
                      site_survey_data: { property_id: job.service_address_id || job.households?.addresses?.[0]?.id || '' },
                      forceStep: 2
                  }));
                  navigate(`/proposals?action=resume_opp&opp_id=${job.id}`);
              } else if (job.status === 'APPROVED') {
                  toast.success('Ready to route! Navigate to Dispatch Hub.');
              }
          }}
      />
    </div>
  );
}
