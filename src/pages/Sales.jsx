import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PIPELINE_STATES, PipelineController } from '../utils/pipelineControls';
import { AlertTriangle, Clock, ArrowRight, DollarSign, Calendar, Zap, AlertCircle, MapPin, UserCircle2, X, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OpportunityOverviewModal from '../components/OpportunityOverviewModal';
import { formatQuoteId, formatCustomerName } from '../utils/formatters';
import { useProposals } from '../context/ProposalContext';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import Proposals from './Proposals';

const PIPELINE_COLUMNS = [
  { id: PIPELINE_STATES.NEW_LEAD, title: 'Incoming Leads', color: 'border-purple-300', bg: 'bg-purple-100', text: 'text-purple-700' },
  { id: PIPELINE_STATES.QUOTING, title: 'Quoting', color: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-700' },
  { id: PIPELINE_STATES.SENT, title: 'Proposal Sent', color: 'border-blue-300', bg: 'bg-blue-100', text: 'text-blue-700' },
  { id: PIPELINE_STATES.NEEDS_SCHEDULING, title: 'Needs Scheduling', color: 'border-amber-300', bg: 'bg-amber-100', text: 'text-amber-700' },
  { id: PIPELINE_STATES.SCHEDULED, title: 'Scheduled', color: 'border-emerald-300', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { id: PIPELINE_STATES.COMPLETED, title: 'Completed', color: 'border-cyan-300', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { id: PIPELINE_STATES.LOST, title: 'Lost Deal', color: 'border-red-300', bg: 'bg-red-100', text: 'text-red-700' }
];

export default function Sales({ isEmbedded = false, isViewOnly = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRole, ROLES, canViewFinancials } = useRole();
  const { proposals, createDraft } = useProposals();
  const [pipeline, setPipeline] = useState({});
  const [pipelineFilter, setPipelineFilter] = useState('All Deals');
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeAssignMenu, setActiveAssignMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspectingJob, setInspectingJob] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
     return searchParams.get('tab') || (searchParams.get('action') === 'view_sale' ? 'pipeline' : searchParams.get('action') ? 'proposals' : 'pipeline');
  });

  const proposalsMap = React.useMemo(() => {
      const map = {};
      if (Array.isArray(proposals)) {
          proposals.forEach(p => {
              const oppId = p.associated_opportunity_id || p.proposal_data?.associated_opportunity_id;
              if (oppId) map[oppId] = p;
          });
      }
      return map;
  }, [proposals]);

  useEffect(() => {
     const tab = searchParams.get('tab');
     const action = searchParams.get('action');
     if (tab === 'proposals' || (action && action !== 'view_sale')) {
         setActiveTab('proposals');
     } else if (tab === 'pipeline' || action === 'view_sale') {
         setActiveTab('pipeline');
     }
     const dealId = searchParams.get('id');
     
     if (action === 'view_sale' && dealId && Object.keys(pipeline).length > 0) {
        for (const col of Object.values(pipeline)) {
           const job = col.find(j => j.id === dealId);
           if (job) {
              setInspectingJob(job);
              break;
           }
        }
     }
  }, [searchParams, pipeline]);

  // Reference to hold active filters to prevent stale closures in realtime events
  const activeFiltersRef = React.useRef({ activeRole, user, pipelineFilter, ROLES });
  useEffect(() => {
      activeFiltersRef.current = { activeRole, user, pipelineFilter, ROLES };
  }, [activeRole, user, pipelineFilter, ROLES]);

  useEffect(() => {
     // Decouple user profiles to only fetch once
     const loadUsers = async () => {
         const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, avatar_url');
         if (usersData) setTeamMembers(usersData);
     };
     loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'pipeline') {
        fetchOpportunities();
    }
    const channel = supabase.channel('realtime_pipeline')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              fetchSingleOpportunity(payload.new.id);
          } else if (payload.eventType === 'DELETE') {
              setPipeline(prev => {
                  const next = { ...prev };
                  Object.keys(next).forEach(col => {
                      next[col] = next[col].filter(j => j.id !== payload.old.id);
                  });
                  return next;
              });
          }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'pipeline') {
        fetchOpportunities();
    }
  }, [pipelineFilter]);

  const fetchSingleOpportunity = async (id) => {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id, status, urgency_level, issue_description, created_at, updated_at, scheduled_date, scheduled_time_block,
          proposal_data, household_id, assigned_salesperson_id, is_active,
          households ( household_name, contacts ( primary_phone, email ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
        `)
        .eq('id', id).single();
        
      if (error || !data || data.is_active === false) {
          // If deleted or deactivated, remove it from the pipeline
          setPipeline(prev => {
              const next = { ...prev };
              Object.keys(next).forEach(col => { next[col] = next[col].filter(j => j.id !== id); });
              return next;
          });
          return;
      }
      
      setPipeline(prev => {
          const filters = activeFiltersRef.current;
          const isManager = [filters.ROLES.ADMIN, filters.ROLES.MANAGER, filters.ROLES.DISPATCHER].includes(filters.activeRole);
          const currentFilter = isManager ? filters.pipelineFilter : 'My Deals';

          if (currentFilter === 'My Deals' && data.assigned_salesperson_id !== filters.user?.id) {
              const next = { ...prev };
              Object.keys(next).forEach(col => { next[col] = next[col].filter(j => j.id !== id); });
              return next;
          }
          if (data.proposal_data?.type === 'SERVICE') return prev;
          
          let targetAddress = null;
          if (Array.isArray(data.households?.addresses) && data.households.addresses.length > 0) {
              if (data.service_address_id) targetAddress = data.households.addresses.find(a => a.id === data.service_address_id);
              if (!targetAddress) targetAddress = data.households.addresses.find(a => a.is_primary_residence) || data.households.addresses[0];
              data.households.addresses = [targetAddress];
          }

          let normalizedStatus = data.status;
          if (typeof normalizedStatus === 'string') {
              normalizedStatus = normalizedStatus.toUpperCase();
              if (normalizedStatus === 'LEAD' || normalizedStatus === 'NEW LEAD') normalizedStatus = PIPELINE_STATES.NEW_LEAD;
          }
          if (normalizedStatus === 'WORKING' || normalizedStatus === 'EN ROUTE') normalizedStatus = PIPELINE_STATES.SCHEDULED;
          else if (normalizedStatus === 'COMPLETED') normalizedStatus = PIPELINE_STATES.COMPLETED;
          
          if (!PIPELINE_COLUMNS.find(c => c.id === normalizedStatus)) {
              if (normalizedStatus !== PIPELINE_STATES.VOIDED && normalizedStatus !== PIPELINE_STATES.PENDING_VOID) {
                  normalizedStatus = PIPELINE_STATES.NEW_LEAD;
              } else {
                  // Voided, just remove from view
                  const next = { ...prev };
                  Object.keys(next).forEach(col => { next[col] = next[col].filter(j => j.id !== id); });
                  return next;
              }
          }

          const next = { ...prev };
          Object.keys(next).forEach(col => {
              next[col] = (next[col] || []).filter(j => j.id !== id);
          });
          
          next[normalizedStatus] = next[normalizedStatus] || [];
          next[normalizedStatus].push(data);
          next[normalizedStatus].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          
          return next;
      });
  };

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id, status, urgency_level, issue_description, created_at, updated_at, scheduled_date, scheduled_time_block,
          proposal_data, household_id, assigned_salesperson_id,
          households ( household_name, contacts ( primary_phone, email ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
        `)
        .eq('is_active', true);
        
      if (error) throw error;

      const grouped = PIPELINE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: [] }), {});
      
      data?.forEach(opp => {
        // Exclude service calls from the sales pipeline
        if (opp.proposal_data?.type === 'SERVICE') return;
        
        let targetAddress = null;
        if (Array.isArray(opp.households?.addresses) && opp.households.addresses.length > 0) {
            if (opp.service_address_id) targetAddress = opp.households.addresses.find(a => a.id === opp.service_address_id);
            if (!targetAddress) targetAddress = opp.households.addresses.find(a => a.is_primary_residence) || opp.households.addresses[0];
            opp.households.addresses = [targetAddress];
        }

        // Apply Filters
        const filters = activeFiltersRef.current;
        const isManager = [filters.ROLES.ADMIN, filters.ROLES.MANAGER, filters.ROLES.DISPATCHER].includes(filters.activeRole);
        const currentFilter = isManager ? filters.pipelineFilter : 'My Deals';

        if (currentFilter === 'My Deals' && opp.assigned_salesperson_id !== filters.user?.id) return;

        // Normalize Technician Field Statuses back to Sales Pipeline Columns
        let normalizedStatus = opp.status;
        if (typeof normalizedStatus === 'string') {
            normalizedStatus = normalizedStatus.toUpperCase();
            if (normalizedStatus === 'LEAD' || normalizedStatus === 'NEW LEAD') normalizedStatus = PIPELINE_STATES.NEW_LEAD;
        }
        if (normalizedStatus === 'WORKING' || normalizedStatus === 'EN ROUTE') {
            normalizedStatus = PIPELINE_STATES.SCHEDULED;
        } else if (normalizedStatus === 'COMPLETED') {
            normalizedStatus = PIPELINE_STATES.COMPLETED;
        }

        if (grouped[normalizedStatus]) {
          grouped[normalizedStatus].push(opp);
        } else if (normalizedStatus !== PIPELINE_STATES.VOIDED && normalizedStatus !== PIPELINE_STATES.PENDING_VOID) {
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
      // If deal is accepted, use exact signed value
      if (proposalData?.accepted_tier_data) {
          const accData = proposalData.accepted_tier_data;
          if (accData.salesPrice) return { exact: accData.salesPrice };
          if (accData.price) return { exact: accData.price };
          if (accData.systemsList && Array.isArray(accData.systemsList)) {
              let amt = accData.systemsList.reduce((sum, sys) => sum + (sys.selectedTierData?.salesPrice || sys.selectedTierData?.price || sys.tierData?.salesPrice || sys.tierData?.price || 0), 0);
              if (amt > 0) return { exact: amt };
          }
      }

      // Fallback: Calculate Max Potential Value from available tiers
      if (!proposalData?.systemTiers || proposalData.systemTiers.length === 0) return null;
      let maxVal = 0;
      let minVal = 0;
      proposalData.systemTiers.forEach(sys => {
          const t = sys.tiers || sys.altTiers;
          if (t) {
             const prices = [t.good?.salesPrice, t.better?.salesPrice, t.best?.salesPrice].filter(Boolean);
             if (prices.length) {
                 maxVal += Math.max(...prices);
                 minVal += Math.min(...prices);
             }
          }
      });
      if (maxVal === 0 && minVal === 0) return null;
      return { min: minVal, max: maxVal };
  };



  return (
    <div className="p-4 md:p-8 flex flex-col gap-8 h-[calc(100dvh-64px)] md:h-[calc(100vh-64px)] overflow-hidden bg-slate-50/50 relative">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary-100/40 blur-3xl"></div>
            <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-3xl"></div>
        </div>
        
        {/* Header Block */}
        {!isEmbedded && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 z-10">
            <div className="w-full md:w-auto">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 mb-3 md:mb-1">
                    <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl shadow-inner border border-emerald-200">
                        <Zap size={24} strokeWidth={2.5}/>
                    </div>
                    Sales Hub
                </h1>
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <div className="flex bg-slate-200/50 p-1 rounded-xl w-full sm:w-fit border border-slate-200/80">
                        <button 
                            onClick={() => setActiveTab('pipeline')} 
                            className={`flex-1 sm:flex-none px-5 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'pipeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Pipeline
                        </button>
                        <button 
                            onClick={() => setActiveTab('proposals')} 
                            className={`flex-1 sm:flex-none px-5 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'proposals' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            Proposals
                        </button>
                    </div>
                    
                    {[ROLES.ADMIN, ROLES.MANAGER, ROLES.DISPATCHER].includes(activeRole) && (
                        <div className="flex bg-white/80 p-1 rounded-xl border border-slate-200/60 shadow-sm w-full sm:w-fit">
                           <button onClick={() => setPipelineFilter('All Deals')} className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pipelineFilter === 'All Deals' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>All Deals</button>
                           <button onClick={() => setPipelineFilter('My Deals')} className={`flex-1 sm:flex-none px-4 py-2 sm:py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${pipelineFilter === 'My Deals' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:text-primary-600 hover:bg-primary-50'}`}>My Deals</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
        )}

        {activeTab === 'proposals' ? (
            <div className="flex-1 overflow-hidden relative z-10 pb-4">
                <div className="h-full overflow-y-auto custom-scrollbar">
                    <Proposals embedded={true} pipelineFilter={pipelineFilter} />
                </div>
            </div>
        ) : (
        <React.Fragment>
        {/* Kanban Board Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden rounded-3xl pb-4 -mx-4 md:mx-0 px-4 md:px-0 custom-scrollbar relative z-10">
            <div className="flex gap-6 h-full min-w-max pb-2">
                {loading ? (
                    /* Premium Kanban Skeleton */
                    <div className="flex gap-6 h-full min-w-max">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex flex-col flex-1 min-w-[300px] max-w-[340px] shrink-0 bg-white/40 rounded-[24px] border border-white shadow-sm overflow-hidden opacity-70">
                                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center animate-pulse">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                                    </div>
                                    <div className="w-6 h-6 rounded-full bg-white border border-slate-100"></div>
                                </div>
                                <div className="flex-1 p-4 flex flex-col gap-4">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-pulse">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col gap-2 w-full pr-4">
                                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                                    <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                                                </div>
                                                <div className="h-6 w-12 bg-slate-100 rounded-lg shrink-0"></div>
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-3 h-16 w-full mb-3"></div>
                                            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                                <div className="h-3 w-16 bg-slate-100 rounded"></div>
                                                <div className="w-6 h-6 rounded-full bg-slate-200"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : PIPELINE_COLUMNS.map(col => {
                    const columnJobs = pipeline[col.id] || [];
                    
                    let headerTheme = { bg: 'bg-slate-50/80', border: 'border-slate-200', text: 'text-slate-700', icon: 'text-slate-400' };
                    if (col.id === PIPELINE_STATES.NEW_LEAD) headerTheme = { bg: 'bg-purple-50/80', border: 'border-purple-200', text: 'text-purple-800', icon: 'text-purple-500' };
                    if (col.id === PIPELINE_STATES.QUOTING) headerTheme = { bg: 'bg-slate-100/80', border: 'border-slate-300', text: 'text-slate-800', icon: 'text-slate-500' };
                    if (col.id === PIPELINE_STATES.SENT) headerTheme = { bg: 'bg-blue-50/80', border: 'border-blue-200', text: 'text-blue-800', icon: 'text-blue-500' };
                    if (col.id === PIPELINE_STATES.NEEDS_SCHEDULING) headerTheme = { bg: 'bg-amber-50/80', border: 'border-amber-200', text: 'text-amber-800', icon: 'text-amber-500' };
                    if (col.id === PIPELINE_STATES.SCHEDULED) headerTheme = { bg: 'bg-emerald-50/80', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-500' };
                    if (col.id === PIPELINE_STATES.COMPLETED) headerTheme = { bg: 'bg-cyan-50/80', border: 'border-cyan-200', text: 'text-cyan-800', icon: 'text-cyan-500' };
                    if (col.id === PIPELINE_STATES.LOST) headerTheme = { bg: 'bg-red-50/80', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-500' };

                    return (
                        <div key={col.id} className="flex flex-col flex-1 min-w-[300px] max-w-[340px] shrink-0 bg-white/60  rounded-[24px] border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                            <div className={`p-4 border-b ${headerTheme.border} ${headerTheme.bg} flex justify-between items-center `}>
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
                                    
                                    const associatedProposal = proposalsMap[job.id];
                                    const displayId = associatedProposal ? formatQuoteId(associatedProposal) : formatQuoteId(job);
                                    // Fallback to current user if their profile isn't in teamMembers yet (e.g. legacy dev environment)
                                    let assignedRep = job.assigned_salesperson_id ? teamMembers.find(m => m.id === job.assigned_salesperson_id) : null;
                                    if (!assignedRep && job.assigned_salesperson_id === user?.id) {
                                        assignedRep = user;
                                    }

                                    const isAssignedToOther = job.assigned_salesperson_id && job.assigned_salesperson_id !== user?.id;
                                    const isDispatcherViewingOther = activeRole === ROLES.DISPATCHER && isAssignedToOther;
                                    const canActOnDeal = !isDispatcherViewingOther;

                                    let urgencyBorder = 'border-l-slate-300';
                                    if (job.urgency_level === 'EMERGENCY') urgencyBorder = 'border-l-red-500';
                                    else if (job.urgency_level === 'HIGH') urgencyBorder = 'border-l-orange-500';
                                    else if (job.urgency_level === 'NORMAL') urgencyBorder = 'border-l-blue-500';

                                    return (
                                        <div key={job.id} onClick={() => setInspectingJob(job)} 
                                            className={`group relative cursor-pointer bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-l-[5px] ${urgencyBorder} p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${isSLA_Violated ? 'border-red-300/60 shadow-[0_4px_20px_rgba(239,68,68,0.15)]' : 'border-slate-200/80 hover:border-slate-300'}`}
                                        >
                                            
                                            {isSLA_Violated && (
                                                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider animate-in zoom-in z-20">
                                                    <AlertTriangle size={12} strokeWidth={3} /> {Math.floor(hoursInStage)}h Overdue
                                                </div>
                                            )}
                                            {job.proposal_data?.type === 'MAINTENANCE' && (
                                                <div className="absolute -top-3 left-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 uppercase tracking-wider z-10">
                                                    <Wrench size={10} strokeWidth={3} /> Maintenance
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col pr-4">
                                                    <h4 className="font-black text-slate-900 text-base tracking-tight leading-tight truncate group-hover:text-primary-600 transition-colors">{formatCustomerName(job.households?.household_name, 'Unknown Client')}</h4>
                                                    <span className="text-[10px] font-semibold text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                                       <span className="whitespace-nowrap">{new Date(job.created_at).toLocaleDateString()}</span> 
                                                       <span className="text-slate-300 whitespace-nowrap">&bull;</span> 
                                                       <span className="font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">{displayId}</span>
                                                    </span>
                                                </div>
                                                {estValue && (
                                                    <div className="font-black text-emerald-600 text-sm bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100/50">
                                                        {canViewFinancials() ? (
                                                            estValue.exact 
                                                              ? `$${estValue.exact.toLocaleString()}` 
                                                              : (estValue.min !== estValue.max ? `$${estValue.min.toLocaleString()} - $${estValue.max.toLocaleString()}` : `$${estValue.max.toLocaleString()}`)
                                                        ) : '***'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-2.5 border border-slate-100/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-1.5 mb-2.5">
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600">
                                                    <MapPin size={12} className="text-slate-400"/> 
                                                    <span className="truncate">
                                                        {job.households?.addresses?.city || 
                                                         (Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.city : null) || 
                                                         job.households?.addresses?.street_address || 
                                                         (Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.street_address : null) || 
                                                         'Unknown Location'}
                                                    </span>
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

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-2">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-0 truncate">
                                                    <Clock size={12} className="shrink-0" /> <span className="truncate">{Math.floor(hoursInStage)}h in stage</span>
                                                </div>

                                                <div className="relative">
                                                    <div 
                                                        onClick={(e) => { e.stopPropagation(); setActiveAssignMenu(activeAssignMenu === job.id ? null : job.id); }}
                                                        className={`flex items-center gap-1 ${assignedRep ? 'bg-slate-50 border-slate-200' : 'bg-white border-dashed border-slate-300 hover:bg-slate-50'} border px-1.5 py-1 rounded-full text-[10px] font-bold text-slate-700 shadow-sm shrink-0 cursor-pointer transition-colors`}
                                                    >
                                                        {assignedRep ? (
                                                            <>
                                                                {assignedRep.avatar_url ? (
                                                                    <img src={assignedRep.avatar_url} className="w-5 h-5 rounded-full object-cover" />
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[8px]">{assignedRep.full_name?.substring(0, 2).toUpperCase()}</div>
                                                                )}
                                                                <span className="max-w-[70px] truncate">{assignedRep.full_name?.split(' ')[0]}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCircle2 size={16} className="text-slate-400" />
                                                                <span className="text-slate-500">Unassigned</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {activeAssignMenu === job.id && (
                                                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                                                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assign Rep</span>
                                                                <button onClick={(e) => { e.stopPropagation(); setActiveAssignMenu(null); }} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                                {teamMembers.map(member => (
                                                                    <div 
                                                                        key={member.id}
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            try {
                                                                                await supabase.from('opportunities').update({ assigned_salesperson_id: member.id }).eq('id', job.id);
                                                                                setActiveAssignMenu(null);
                                                                                toast.success(`Assigned to ${member.full_name}`);
                                                                            } catch (err) {
                                                                                toast.error('Failed to assign rep');
                                                                            }
                                                                        }}
                                                                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-primary-50 transition-colors ${assignedRep?.id === member.id ? 'bg-primary-50/50' : ''}`}
                                                                    >
                                                                        {member.avatar_url ? (
                                                                            <img src={member.avatar_url} className="w-6 h-6 rounded-full object-cover shrink-0" />
                                                                        ) : (
                                                                            <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{member.full_name?.substring(0, 2).toUpperCase()}</div>
                                                                        )}
                                                                        <span className="text-xs font-semibold text-slate-700 truncate">{member.full_name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
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
        </React.Fragment>
        )}
      <OpportunityOverviewModal 
          isOpen={!!inspectingJob} 
          onClose={() => setInspectingJob(null)} 
          job={inspectingJob} 
          onAction={async (job) => {
              if (job.status === 'NEW_LEAD') {
                  try {
                      const newDraft = await createDraft({
                          customer: job.households?.household_name || 'Unknown Client',
                          amount: 0,
                          associated_opportunity_id: job.id,
                          proposal_data: {
                              associated_opportunity_id: job.id,
                              wizard_state: {
                                  step: 2,
                                  selectedCustomerId: job.household_id,
                                  selectedLocationId: job.service_address_id || job.households?.addresses?.id || (Array.isArray(job.households?.addresses) ? job.households.addresses[0]?.id : null) || ''
                              }
                          }
                      });

                      if (newDraft && newDraft.id) {
                          await PipelineController.startProposal(job.id, job.status);
                          navigate(`/proposals?action=resume&id=${newDraft.id}`);
                      } else {
                          toast.error('Failed to create draft.');
                      }
                  } catch (e) { toast.error('Failed to transition lead.'); }
              } else if (job.status === 'QUOTING') {
                  navigate(`/proposals?action=resume_opp&opp_id=${job.id}`);
              } else if (job.status === 'PROPOSAL_SENT') {
                  navigate(`/proposals?action=view_proposal&opp_id=${job.id}`);
              } else if (job.status === 'APPROVED' || job.status === 'NEEDS_SCHEDULING') {
                  toast.success('Navigating to Dispatch Hub to route job...');
                  navigate('/dispatch');
              } else if (job.status === 'SCHEDULED') {
                  try {
                      await PipelineController.updateOpportunityStatus(job.id, 'COMPLETED');
                      toast.success('Job marked as completed!');
                      fetchOpportunities();
                  } catch (e) { toast.error('Failed to mark job complete.'); }
              }
          }}
      />
    </div>
  );
}
