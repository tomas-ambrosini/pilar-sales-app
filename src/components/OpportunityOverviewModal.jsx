import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { supabase } from '../supabaseClient';
import { History, MessageSquare, Send, MapPin, AlertTriangle, User, Calendar, Clock, Activity, ArrowRight, FileText, ShieldCheck, Banknote, Check, Mail, Phone, Package, DollarSign, Wallet, Navigation, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatQuoteId } from '../utils/formatters';
import { useProposals } from '../context/ProposalContext';
import { useAuth } from '../context/AuthContext';
import ProposalViewerModal from './ProposalViewerModal';
import ContractDocumentModal from './ContractDocumentModal';
import InvoiceDocument from './InvoiceDocument';

export default function OpportunityOverviewModal({ isOpen, onClose, job, onAction }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newNote, setNewNote] = useState('');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotesText, setEditNotesText] = useState('');
    const [viewingProposal, setViewingProposal] = useState(null);
    const [viewingContract, setViewingContract] = useState(null);
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const navigate = useNavigate();
    const { proposals } = useProposals();
    const { user } = useAuth();

    useEffect(() => {
        if (isOpen && job?.household_id) {
            fetchActivities();
            setEditNotesText(job.proposal_data?.dispatch_notes || '');
            setIsEditingNotes(false);
        }
    }, [isOpen, job]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('opportunity_id', job.id)
                .order('created_at', { ascending: false });
            
            if (!error && data) {
                // Synthesize initial Deal Created event for older deals that don't have one
                const hasCreationEvent = data.some(act => ['Lead Intaken', 'Deal Created', 'Converted from Service', 'Deal Cloned'].includes(act.activity_type));
                
                if (!hasCreationEvent && job) {
                    const intakenBy = job.proposal_data?.intaken_by || job.proposal_data?.creator || 'System';
                    let description = `Lead intaken by ${intakenBy}.`;
                    if (job.issue_description?.startsWith('Auto-generated Digital Proposal') || job.issue_description?.startsWith('Split/Extracted')) {
                         description = `Deal initiated by ${intakenBy}.`;
                    }
                    data.push({
                        id: `synth-creation-${job.id}`,
                        activity_type: 'Lead Intaken',
                        description: description,
                        created_at: job.created_at || new Date().toISOString()
                    });
                }
                setActivities(data);
            }
        } catch (e) {
            console.error('Failed to fetch activity logs', e);
        }
        setLoading(false);
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
            const { error } = await supabase.from('activity_logs').insert({
                household_id: job.household_id,
                opportunity_id: job.id,
                activity_type: `Sales Note by ${userName}`,
                description: newNote
            });
            if (error) throw error;
            setNewNote('');
            fetchActivities();
            toast.success('Note added successfully');
        } catch (e) {
            toast.error('Failed to save note');
        }
    };

    const handleSaveDispatchNotes = async () => {
        try {
            // Mitigate JSONB overwrite race condition by fetching latest first
            const { data: latest } = await supabase.from('opportunities').select('proposal_data').eq('id', job.id).single();
            if (!latest) throw new Error("Could not find active job record.");

            const updatedProposalData = {
                ...(latest.proposal_data || {}),
                dispatch_notes: editNotesText
            };
            const { error } = await supabase.from('opportunities').update({
                proposal_data: updatedProposalData
            }).eq('id', job.id);
            if (error) throw error;
            toast.success('Dispatch notes updated');
            setIsEditingNotes(false);
            job.proposal_data = updatedProposalData; 
        } catch (e) {
            toast.error('Failed to save notes');
        }
    };

    if (!job) return null;

    const customerName = (job.households?.household_name || 'Unknown Customer').replace(/ Account$/i, '').trim();
    const addressObj = Array.isArray(job.households?.addresses) ? job.households.addresses[0] : job.households?.addresses;
    const address = addressObj?.street_address || 'No address provided';
    const city = addressObj?.city;
    
    // Calculate display ID
    const associatedProposal = proposals?.find(p => p.proposal_data?.associated_opportunity_id === job.id || p.associated_opportunity_id === job.id);
    let displayId = formatQuoteId(job);
    if (associatedProposal) {
        const propId = formatQuoteId(associatedProposal);
        if (job.status === 'NEEDS_SCHEDULING' || job.status === 'SCHEDULED' || job.status === 'APPROVED') {
            displayId = propId.startsWith('P') ? `WO-${propId.substring(1)}` : `WO-${propId}`;
        } else {
            displayId = propId;
        }
    } else if ((job.status === 'NEEDS_SCHEDULING' || job.status === 'SCHEDULED' || job.status === 'APPROVED') && displayId.startsWith('LEAD-')) {
        displayId = displayId.replace('LEAD-', 'WO-');
    }

    const matchedTierName = associatedProposal?.proposal_data?.accepted_tier_name || ['good', 'better', 'best'].find(t => associatedProposal?.proposal_data?.tiers?.[t]?.salesPrice === associatedProposal?.amount) || 'good';

    const getProposalAmount = () => {
        const sourceData = job.proposal_data || associatedProposal?.proposal_data || {};
        
        // 1. Explicit final amounts
        if (sourceData.total_contract_amount > 0) return sourceData.total_contract_amount;
        if (sourceData.approval_snapshot?.price > 0) return sourceData.approval_snapshot.price;
        if (associatedProposal?.amount > 0) return associatedProposal.amount;
        if (job.amount > 0) return job.amount;
        
        // 2. Accepted tier data
        if (sourceData?.accepted_tier_data) {
            const accData = sourceData.accepted_tier_data;
            if (accData.salesPrice) return accData.salesPrice;
            if (accData.price) return accData.price;
            
            // Multi-system
            if (accData.systemsList && Array.isArray(accData.systemsList)) {
                let sum = accData.systemsList.reduce((s, sys) => {
                    return s + (sys.selectedTierData?.salesPrice || sys.selectedTierData?.price || 0);
                }, 0);
                if (sum > 0) return sum;
            }
        }
        
        // 3. Unaccepted proposal tier data fallback
        if (associatedProposal?.proposal_data?.tiers?.[matchedTierName.toLowerCase()]?.salesPrice) {
            return associatedProposal.proposal_data.tiers[matchedTierName.toLowerCase()].salesPrice;
        }
        
        return 0;
    };
    const displayAmount = getProposalAmount();

    const getDepositAmount = () => {
        const pData = job.proposal_data || associatedProposal?.proposal_data || {};
        if (pData.deposit_amount > 0) return pData.deposit_amount;
        
        // Try to extract from timeline events
        const depositEvent = activities.find(a => a.activity_type?.includes('Deposit'));
        if (depositEvent && depositEvent.description) {
            const match = depositEvent.description.match(/\$([0-9,]+(\.[0-9]{2})?)/);
            if (match) {
                return parseFloat(match[1].replace(/,/g, ''));
            }
        }
        
        return displayAmount * ((pData.deposit_percentage || 0) / 100);
    };
    const displayDeposit = getDepositAmount();
    const displayBalance = Math.max(0, displayAmount - displayDeposit);

    // Determine the action button text based on status
    let actionText = 'Resume';
    let actionColor = 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20';
    if (job.status === 'NEW_LEAD') {
        actionText = 'Start Quote';
    } else if (job.status === 'QUOTING') {
        actionText = 'Resume Quote';
        actionColor = 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20';
    } else if (job.status === 'PROPOSAL_SENT') {
        actionText = 'View Proposal';
        actionColor = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';
    } else if (job.status === 'APPROVED' || job.status === 'NEEDS_SCHEDULING') {
        actionText = 'Route Job';
        actionColor = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20';
    } else if (job.status === 'SCHEDULED') {
        actionText = 'Mark Complete';
        actionColor = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20';
    } else if (job.status === 'COMPLETED') {
        actionText = 'View Invoice';
        actionColor = 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm';
    }


    const extractNameFromAction = (desc) => {
        if (!desc) return null;
        const match = desc.match(/\(Action taken by:\s*(.*?)\)/);
        return match ? match[1] : null;
    };
    
    const proposedEvent = activities.find(a => a.activity_type === 'Deal Proposed');
    const scheduledEvent = activities.find(a => a.activity_type === 'Job Scheduled');
    
    const proposalDoneBy = proposedEvent ? extractNameFromAction(proposedEvent.description) : null;
    const dispatchedBy = (scheduledEvent ? extractNameFromAction(scheduledEvent.description) : null) || job.proposal_data?.dispatcher;

    return (
        <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 border border-primary-100">
                        <Activity size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black text-slate-800 tracking-tight">Deal Hub</span>
                        <span className="text-[10px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="whitespace-nowrap">{new Date(job.created_at).toLocaleDateString()}</span> 
                            <span className="text-slate-300 whitespace-nowrap">&bull;</span> 
                            <span className="font-mono uppercase tracking-widest text-slate-400 whitespace-nowrap">{displayId}</span>
                        </span>
                    </div>
                </div>
            } 
            width="max-w-6xl" 
            bodyClassName="p-0 max-h-[90vh] h-full min-h-0 flex flex-col bg-slate-50"
        >
            {/* Progress Stepper */}
            <div className="w-full bg-white border-b border-slate-200 p-4 shrink-0 shadow-sm z-10">
                <div className="flex items-center justify-between max-w-4xl mx-auto">
                    {[
                        { label: 'Lead', match: ['NEW_LEAD', 'QUOTING', 'PROPOSAL_SENT', 'APPROVED', 'NEEDS_SCHEDULING', 'SCHEDULED', 'Working', 'En Route', 'COMPLETED', 'CLOSED_WON'] },
                        { label: 'Quoted', match: ['PROPOSAL_SENT', 'APPROVED', 'NEEDS_SCHEDULING', 'SCHEDULED', 'Working', 'En Route', 'COMPLETED', 'CLOSED_WON'] },
                        { label: 'Approved', match: ['APPROVED', 'NEEDS_SCHEDULING', 'SCHEDULED', 'Working', 'En Route', 'COMPLETED', 'CLOSED_WON'] },
                        { label: 'Scheduled', match: ['SCHEDULED', 'Working', 'En Route', 'COMPLETED', 'CLOSED_WON'] },
                        { label: 'Complete', match: ['COMPLETED', 'CLOSED_WON'] }
                    ].map((step, idx, arr) => {
                        const isCompleted = step.match.includes(job.status);
                        const isCurrent = step.match.includes(job.status) && (idx === arr.length - 1 || !arr[idx+1].match.includes(job.status));
                        return (
                            <div key={step.label} className="flex items-center w-full relative">
                                <div className="flex flex-col items-center relative z-10 gap-1.5 w-full">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[11px] transition-all duration-300 ${isCurrent ? 'bg-primary-600 text-white ring-4 ring-primary-100 shadow-md scale-110' : isCompleted ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                        {isCompleted && !isCurrent ? <Check size={14} strokeWidth={3} /> : idx + 1}
                                    </div>
                                    <span className={`text-[10px] hidden sm:block font-black uppercase tracking-widest ${isCurrent ? 'text-primary-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'}`}>{step.label}</span>
                                </div>
                                {idx < arr.length - 1 && (
                                    <div className={`absolute left-[50%] right-[-50%] top-4 h-0.5 -mt-px transition-colors duration-300 ${arr[idx+1].match.includes(job.status) ? 'bg-primary-400' : 'bg-slate-200'}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden min-h-0">
                
                {/* Left Panel: Dispatch & Opportunity Context */}
                <div className="w-full lg:w-[50%] xl:w-[45%] bg-slate-50/50 lg:border-r border-slate-200 p-6 lg:overflow-y-auto custom-scrollbar flex flex-col gap-6 min-w-0 lg:min-h-0 shrink-0 lg:shrink">
                    
                    {/* Customer Profile */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center font-black text-slate-500 text-lg shrink-0 shadow-inner">
                                {(job.households?.household_name || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-slate-800 text-xl truncate">{customerName}</div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Customer Profile</div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" /> 
                                <span>
                                    {address}
                                    {city && !address.toLowerCase().includes(city.toLowerCase()) && (
                                        <><br/>{city}</>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                <Phone size={16} className="text-slate-400 shrink-0" /> 
                                <span>{job.households?.contacts?.[0]?.primary_phone || 'No phone provided'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium min-w-0">
                                <Mail size={16} className="text-slate-400 shrink-0" /> 
                                <span className="truncate">{job.households?.contacts?.[0]?.email || 'No email provided'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Financial Snapshot */}
                    {(associatedProposal || displayAmount > 0) && (
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <DollarSign size={14} /> Financial Snapshot
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</div>
                                    <div className="text-lg font-black text-slate-800">${displayAmount.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})}</div>
                                </div>
                                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                                    <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1 flex items-center gap-1"><Wallet size={10}/> Deposit</div>
                                    <div className="text-lg font-black text-emerald-700">${displayDeposit.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})}</div>
                                </div>
                            </div>
                            <div className="mt-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex justify-between items-center">
                                <div className="text-[10px] font-bold text-blue-600/70 uppercase tracking-widest">Balance Due</div>
                                <div className="text-lg font-black text-blue-700">${displayBalance.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})}</div>
                            </div>
                        </div>
                    )}

                    {/* Equipment Details */}
                    {associatedProposal && (() => {
                        const displaySystemsList = associatedProposal.proposal_data?.accepted_tier_data?.systemsList || associatedProposal.proposal_data?.systemTiers;
                        return (
                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Package size={14} /> Equipment Details
                            </h3>
                            {displaySystemsList && displaySystemsList.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {displaySystemsList.map((sys, idx) => {
                                        const td = sys.selectedTierData || sys.tiers?.[matchedTierName.toLowerCase()] || {};
                                        return (
                                            <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col gap-3">
                                                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                                                    <Package size={14} className="text-slate-400" />
                                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{sys.name || `System ${idx+1}`}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Brand</span>
                                                        <span className="text-xs font-black text-slate-700 uppercase">{td.brand || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tonnage</span>
                                                        <span className="text-xs font-black text-slate-700 uppercase">{td.tons ? `${td.tons} Ton` : 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SEER</span>
                                                        <span className="text-xs font-black text-slate-700 uppercase">{td.seer || 'N/A'}</span>
                                                    </div>
                                                    <div className="bg-white p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center overflow-hidden">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Model</span>
                                                        <span className="text-xs font-black text-slate-700 uppercase truncate w-full px-1">{td.series || 'Standard'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : associatedProposal.proposal_data?.accepted_tier_data ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Brand</span>
                                        <span className="text-xs font-black text-slate-700 uppercase">{associatedProposal.proposal_data.accepted_tier_data.brand || 'N/A'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Tonnage</span>
                                        <span className="text-xs font-black text-slate-700 uppercase">{associatedProposal.proposal_data.accepted_tier_data.tons ? `${associatedProposal.proposal_data.accepted_tier_data.tons} Ton` : 'N/A'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SEER</span>
                                        <span className="text-xs font-black text-slate-700 uppercase">{associatedProposal.proposal_data.accepted_tier_data.seer || 'N/A'}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center overflow-hidden">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Model</span>
                                        <span className="text-xs font-black text-slate-700 uppercase truncate w-full px-1">{associatedProposal.proposal_data.accepted_tier_data.series || 'Standard'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm font-medium text-slate-400 italic bg-slate-50 p-4 rounded-lg text-center border border-slate-100">
                                    No equipment details available.
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {/* Dispatch Context */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <AlertTriangle size={14} /> Dispatch Context
                        </h3>
                        
                        <div className="mb-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Issue Reported</div>
                            <div className="text-sm font-medium text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {job.issue_description || 'No issue description provided.'}
                            </div>
                        </div>

                        <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {job.issue_description?.startsWith('Auto-generated Digital Proposal') || job.issue_description?.startsWith('Split/Extracted') ? 'Created By' : 'Lead Intaken By'}
                            </div>
                            <div className="text-sm font-black text-slate-800">
                                {job.issue_description?.startsWith('Auto-generated Digital Proposal') || job.issue_description?.startsWith('Split/Extracted')
                                    ? `No lead, proposal generated by ${job.proposal_data?.intaken_by && job.proposal_data?.intaken_by !== 'System' ? job.proposal_data.intaken_by : (job.proposal_data?.creator || 'System')}`
                                    : (job.proposal_data?.intaken_by && job.proposal_data?.intaken_by !== 'System' ? job.proposal_data.intaken_by : (job.proposal_data?.creator || 'System'))
                                }
                            </div>
                        </div>

                        {proposalDoneBy && (
                            <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposal Done By</div>
                                <div className="text-sm font-black text-slate-800">{proposalDoneBy}</div>
                            </div>
                        )}

                        {dispatchedBy && job.status !== 'NEW_LEAD' && (
                            <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatched By</div>
                                <div className="text-sm font-black text-slate-800">{dispatchedBy}</div>
                            </div>
                        )}

                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dispatch Notes</div>
                                {(!isEditingNotes && (job.status === 'NEEDS_SCHEDULING' || job.status === 'SCHEDULED' || job.status === 'APPROVED')) && (
                                    <button onClick={() => setIsEditingNotes(true)} className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider">Edit</button>
                                )}
                            </div>
                            {isEditingNotes ? (
                                <div className="flex flex-col gap-2">
                                    <textarea 
                                        value={editNotesText}
                                        onChange={(e) => setEditNotesText(e.target.value)}
                                        className="w-full text-sm font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                                        placeholder="Gate codes, access info, team instructions..."
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setIsEditingNotes(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                        <button onClick={handleSaveDispatchNotes} className="px-3 py-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm font-medium text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 whitespace-pre-wrap min-h-[40px]">
                                    {job.proposal_data?.dispatch_notes || <span className="text-slate-400 italic">No notes provided.</span>}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Document Vault */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileText size={14} /> Document Vault
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {!associatedProposal && (
                                <p className="text-xs text-slate-400 italic w-full text-center py-2">No documents available yet.</p>
                            )}
                            {!!associatedProposal && job.status !== 'NEW_LEAD' && job.status !== 'QUOTING' && (
                                <button onClick={() => { 
                                    if (associatedProposal) {
                                        setViewingProposal(['Approved', 'Lost', 'Voided'].includes(associatedProposal.status) ? { ...associatedProposal, isReadOnly: true } : associatedProposal);
                                    } else {
                                        toast.error("No associated proposal found.");
                                    }
                                }} className="flex-1 min-w-[100px] px-3 py-2.5 text-xs font-black bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex justify-center items-center gap-1.5 shadow-sm">
                                    <FileText size={14} className="text-slate-400" /> Proposal
                                </button>
                            )}
                            {!!associatedProposal && ['NEEDS_SCHEDULING', 'SCHEDULED', 'APPROVED', 'COMPLETED', 'CLOSED_WON', 'Working', 'En Route'].includes(job.status) && (
                                <button onClick={() => { 
                                    if (associatedProposal) {
                                        const matchedTierData = associatedProposal.proposal_data?.accepted_tier_data || associatedProposal.proposal_data?.tiers?.[matchedTierName];
                                        setViewingContract({
                                            proposal: associatedProposal,
                                            tierName: matchedTierName?.toUpperCase() || 'SYSTEM',
                                            tierData: matchedTierData || {},
                                            date: new Date(associatedProposal.updated_at || associatedProposal.created_at).toLocaleDateString()
                                        });
                                    } else {
                                        toast.error("No associated contract data found.");
                                    }
                                }} className="flex-1 min-w-[100px] px-3 py-2.5 text-xs font-black bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex justify-center items-center gap-1.5 shadow-sm">
                                    <ShieldCheck size={14} className="text-slate-400" /> Contract
                                </button>
                            )}
                            {!!associatedProposal && ['NEEDS_SCHEDULING', 'SCHEDULED', 'APPROVED', 'COMPLETED', 'CLOSED_WON', 'Working', 'En Route'].includes(job.status) && (
                                <button disabled={loadingInvoice} onClick={async () => {
                                    if (!associatedProposal) return toast.error("No associated proposal found.");
                                    setLoadingInvoice(true);
                                    try {
                                        const { data, error } = await supabase.from('invoices').select('*, proposals(*)').eq('proposal_id', associatedProposal.id).single();
                                        if (data) {
                                            setViewingInvoice(data);
                                        } else {
                                            toast.error('Invoice not generated yet.');
                                        }
                                    } catch (err) {
                                        toast.error('Error loading invoice.');
                                    } finally {
                                        setLoadingInvoice(false);
                                    }
                                }} className={`flex-1 min-w-[100px] px-3 py-2.5 text-xs font-black bg-white border border-slate-200 rounded-xl text-slate-600 transition-all flex justify-center items-center gap-1.5 shadow-sm ${loadingInvoice ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 hover:border-slate-300'}`}>
                                    <Banknote size={14} className="text-slate-400" /> {loadingInvoice ? 'Loading...' : 'Invoice'}
                                </button>
                            )}
                        </div>
                    </div>

                    {(job.scheduled_date || job.scheduled_time_block) && (
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Calendar size={14} /> Schedule Window
                            </h3>
                            <div className="flex items-center gap-4">
                                {job.scheduled_date && (
                                    <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                                        <Calendar size={16} className="text-blue-500" />
                                        {new Date(job.scheduled_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </div>
                                )}
                                {job.scheduled_time_block && (
                                    <div className="flex items-center gap-2 text-sm font-black text-slate-700">
                                        <Clock size={16} className="text-amber-500" />
                                        {job.scheduled_time_block}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel: Unified Timeline */}
                <div className="w-full lg:w-[50%] xl:w-[55%] flex flex-col bg-white relative min-w-0 lg:min-h-0 shrink-0 lg:shrink">
                    <div className="p-4 border-b border-slate-100 bg-white z-10 shadow-sm flex items-center justify-between shrink-0">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-tight">
                            <History size={18} className="text-primary-600" /> Unified Timeline
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{activities.length} Events</span>
                    </div>
                    
                    <div className="p-6 lg:overflow-y-auto flex-1 lg:min-h-0 custom-scrollbar bg-slate-50/30">
                        {loading ? (
                            <div className="flex justify-center items-center h-32">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                        ) : activities.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {activities.map((act, index) => (
                                    <div key={act.id} className="relative flex items-start gap-4 group">
                                        
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow-sm shrink-0 relative z-10">
                                            {act.activity_type.includes('Note') ? (
                                                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><MessageSquare size={14} /></div>
                                            ) : act.activity_type.includes('Sent') ? (
                                                <div className="w-full h-full bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><Send size={14} /></div>
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-600"><Activity size={14} /></div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-black text-slate-800 text-sm">{act.activity_type}</span>
                                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                    {new Date(act.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                                                {act.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <History size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No activity recorded yet.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 border-t border-slate-200 bg-white z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] shrink-0">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                placeholder="Drop a note into the timeline..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                            />
                            <button 
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">Ready to progress?</span>
                <div className="flex gap-3 items-center">
                    {['Dispatched', 'En Route', 'Working'].includes(job.status) && (
                        <button 
                            onClick={() => window.open(`/tracker/${job.id}`, '_blank')}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-xl transition-all flex items-center gap-2 mr-2"
                        >
                            <Navigation size={16} /> Track Tech
                        </button>
                    )}
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 rounded-xl font-black text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm text-sm"
                    >
                        Close
                    </button>
                    {/* Legacy discard button removed */}
                    <button 
                        onClick={() => {
                            onClose();
                            onAction(job);
                        }} 
                        className={`px-6 py-2.5 rounded-xl font-black transition-all shadow-sm flex items-center gap-2 text-sm uppercase tracking-wide ${actionColor}`}
                    >
                        {actionText} <ArrowRight size={16} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </Modal>

        {/* Inline Sub-Modals for Deal Hub */}
        <ProposalViewerModal 
            isOpen={!!viewingProposal} 
            onClose={() => setViewingProposal(null)} 
            proposal={viewingProposal ? { ...viewingProposal, isReadOnly: true } : null} 
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
        </>
    );
}
