import React from 'react';
import Modal from './Modal';
import ProposalComments from './ProposalComments';
import { formatQuoteId } from '../utils/formatters';
import { useCustomers } from '../context/CustomerContext';
import { User, FileText, Calendar, Activity, Mail, Phone, MapPin, Grid, Camera, ThermometerSun, AlertCircle } from 'lucide-react';

const MEASUREMENTS = {
  m1: "Ret W", m2: "Ret D", m3: "Sup W", m4: "Sup D", m5: "Ret Box W",
  m6: "Ret Box D", m7: "Floor H", m8: "Return P", m9: "Supply P", m10: "P/D",
  m11: "Ceil H", m12: "Clearance", m13: "Plenum D", m14: "AHU D", m15: "Clearance",
  m16: "Ret Box D", m17: "Clearance", m18: "Access W", m19: "Access D", m20: "AHU L",
  m21: "AHU H", m22: "Plenum Top", m23: "Plenum End", m24: "Plenum B", m25: "Plenum C",
  m26: "Plenum D", m27: "Attic Pitch"
};

const MEASUREMENT_GROUPS = [
    { title: "Airflow / Duct Dimensions", keys: ["m1", "m2", "m3", "m4", "m5", "m6", "m13", "m16", "m22", "m23", "m24", "m25", "m26"] },
    { title: "Clearances & Access", keys: ["m12", "m15", "m17", "m18", "m19"] },
    { title: "Equipment Geometry", keys: ["m14", "m20", "m21"] },
    { title: "Static Pressures", keys: ["m8", "m9", "m10"] },
    { title: "Misc Conditions", keys: ["m7", "m11", "m27"] },
];

const PHOTO_LABELS = {
    condenser_wide: "Condenser (Wide)",
    condenser_data_plate: "Condenser Data Plate",
    indoor_unit_wide: "Indoor Unit (Wide)",
    indoor_data_plate: "Indoor Data Plate",
    electrical_panel_open: "Electrical Panel",
};

export default function ProposalDetailsModal({ proposal, onClose, onLaunchViewer }) {
    const { customers } = useCustomers();
    if (!proposal) return null;

    const data = proposal?.proposal_data || {};
    
    // Attempt local resolution of the DB entity using the generator's state
    const customerId = data?.wizard_state?.selectedCustomerId;
    const dbCustomer = customerId ? customers?.find(c => c.id === customerId) : null;
    
    const name = proposal?.customer || dbCustomer?.name || 'Unknown Client';
    const email = dbCustomer?.email || 'N/A';
    const phone = dbCustomer?.phone || 'N/A';
    const addressString = dbCustomer?.address || 'N/A';
    
    // Safely extract system info (accounting for drafts and finalized quote formats)
    const systems = data?.systemTiers || data?.systems || data?.wizard_state?.systems || [];

    return (
        <Modal 
            isOpen={!!proposal} 
            onClose={onClose} 
            title={`Proposal Details: ${formatQuoteId(proposal)}`}
            width="w-[95%] md:w-[calc(100vw-320px)] max-w-[1400px] md:ml-[260px]"
            bodyClassName="flex-1 overflow-hidden flex flex-col p-0"
        >
            <div className="flex flex-col h-full overflow-hidden bg-slate-100">
                
                {/* Top Section (Scrollable Data Area) */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 min-h-0 bg-slate-100">
                    
                    {/* Header Strip - Proposal Metadata */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-black text-slate-800 text-lg md:text-xl truncate">{name}</h3>
                                <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                    proposal.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                    proposal.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                    proposal.status === 'Draft' ? 'bg-slate-200 text-slate-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {proposal.status || 'Draft'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                                <span>ID: <span className="text-slate-700 uppercase tracking-wider">{formatQuoteId(proposal)}</span></span>
                                <span>•</span>
                                <span>Updated: {proposal.updated_at ? new Date(proposal.updated_at).toLocaleDateString() : new Date(proposal.created_at || proposal.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="text-left md:text-right flex flex-col md:items-end gap-2">
                            <div>
                                <span className="text-xs font-bold text-slate-400 block uppercase tracking-widest mb-0.5">Gross Value</span>
                                <span className="font-black text-emerald-600 text-2xl tracking-tight">${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            {(proposal.status === 'Approved' || proposal.status === 'Sent') && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onLaunchViewer && onLaunchViewer(proposal); }}
                                    className="px-4 py-1.5 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg shadow-sm hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                                >
                                    <FileText size={14} />
                                    {proposal.status === 'Approved' ? 'View Contract' : 'Preview Quote'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Client Info Block */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                            <User size={18} className="text-primary-600" />
                            <h3 className="font-bold text-slate-800 tracking-wide uppercase">Client File</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Mail size={12}/> Email Address</span>
                                <span className="text-sm font-bold text-slate-700 break-words">{email}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Phone size={12}/> Phone Number</span>
                                <span className="text-sm font-bold text-slate-700">{phone}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><MapPin size={12}/> Service Address</span>
                                <span className="text-sm font-bold text-slate-700 break-words">{addressString}</span>
                            </div>
                        </div>
                    </div>

                    {/* Systems Breakdowns */}
                    {systems.length > 0 ? (
                        <div className="space-y-8">
                            {systems.map((sys, idx) => {
                                const survey = sys?.survey || {};
                                const photosObj = sys?.photos || {};
                                const populatedPhotos = Object.entries(photosObj).filter(([k,v]) => v);
                                const hasMeasurements = Object.keys(MEASUREMENTS).some(k => survey[k]);

                                return (
                                    <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="bg-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <h3 className="text-white font-black text-xl flex items-center gap-2">
                                                <ThermometerSun className="text-primary-400" />
                                                {sys.systemName || `System ${idx+1}`}
                                            </h3>
                                            <span className="text-xs font-bold uppercase tracking-widest bg-slate-700 text-slate-300 px-4 py-1.5 rounded-full w-max">
                                                {survey.systemType ? `${survey.systemType} - ${survey.currentTonnage ? `${survey.currentTonnage} TON` : 'SIZE N/A'}` : 'System Specs Default'}
                                            </span>
                                        </div>
                                        
                                        <div className="p-6 md:p-8 space-y-10">
                                            {/* Survey Specs */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                                    <h4 className="font-black text-slate-800 text-sm tracking-wide uppercase">Existing System Specs</h4>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-y-8 gap-x-6">
                                                    
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Type</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.systemType || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Tonnage</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.currentTonnage ? `${survey.currentTonnage} TON` : 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Refrigerant</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.gasRefrigerant || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Existing Brand</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.existingBrand || 'N/A'}</span>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Condenser Location</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.condenserLocation || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AHU Location</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.ahuLocation || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Disconnect Box</span>
                                                        <span className="text-sm font-bold text-slate-800">{survey.disconnectCondition || 'N/A'}</span>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Approved Equipment Matrix */}
                                            {proposal.status === 'Approved' && (() => {
                                                const matchedTierName = data?.accepted_tier_name || ['good', 'better', 'best'].find(t => data?.tiers?.[t]?.salesPrice === proposal.amount) || 'good';
                                                const matchedTierData = data?.accepted_tier_data || data?.tiers?.[matchedTierName];
                                                if (!matchedTierData) return null;
                                                
                                                const matchedTierNameUpperCase = (matchedTierName || '').toUpperCase();
                                                // Resolve System Data
                                                let targetSystems = [];
                                                if (matchedTierData.systemsList && matchedTierData.systemsList.length > 0) {
                                                    const sysData = matchedTierData.systemsList.find(s => s.systemId === sys.id || s.systemName === (sys.systemName || `System ${idx+1}`));
                                                    if (sysData) targetSystems.push({ name: sysData.systemName, ...sysData.tierData });
                                                } else {
                                                    targetSystems.push({ name: `${matchedTierNameUpperCase} Package`, ...matchedTierData });
                                                }
                                                
                                                return targetSystems.map((sData, sIdx) => (
                                                    <div key={sIdx}>
                                                        <div className="flex items-center gap-2 mb-4 border-b border-primary-100 pb-2">
                                                            <h4 className="font-black text-primary-700 text-sm tracking-wide uppercase">Approved New Equipment</h4>
                                                            <span className="text-[10px] font-bold bg-primary-100 text-primary-800 px-2 py-0.5 rounded ml-2">{matchedTierNameUpperCase}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contracted Brand</span>
                                                                <span className="text-sm font-bold text-slate-800">{sData.brand || 'N/A'} {sData.series || ''}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dimensions</span>
                                                                <span className="text-sm font-bold text-slate-800">{sData.tons ? `${sData.tons} TON` : 'N/A'}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Architecture</span>
                                                                <span className="text-sm font-bold text-slate-800">{sData.type || 'Standard Efficiency'}</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">System Price</span>
                                                                <span className="text-sm font-bold text-emerald-600">${((sData.salesPrice || 0)).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}

                                            {/* Grouped Measurements */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                                    <Grid size={16} className="text-slate-400" />
                                                    <h4 className="font-black text-slate-800 text-sm tracking-wide uppercase">Diagnostics & Measurements</h4>
                                                </div>
                                                {!hasMeasurements ? (
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 bg-slate-50 p-4 border border-slate-200 border-dashed rounded-lg">
                                                        <AlertCircle size={16}/> No structural measurements recorded.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {MEASUREMENT_GROUPS.map((group, gIdx) => {
                                                            const groupFields = group.keys.filter(k => survey[k]);
                                                            if (groupFields.length === 0) return null;
                                                            return (
                                                                <div key={gIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                                                    <h5 className="text-[11px] font-black text-primary-600 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">{group.title}</h5>
                                                                    <div className="space-y-2">
                                                                        {groupFields.map(k => (
                                                                            <div key={k} className="flex justify-between items-center text-sm">
                                                                                <span className="text-slate-500 font-semibold">{MEASUREMENTS[k]}</span>
                                                                                <span className="font-black text-slate-800 bg-white px-2 py-0.5 rounded shadow-sm border border-slate-100">{survey[k]}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Site Photos */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                                                    <Camera size={16} className="text-slate-400" />
                                                    <h4 className="font-black text-slate-800 text-sm tracking-wide uppercase">Inspection Imagery</h4>
                                                </div>
                                                {populatedPhotos.length === 0 ? (
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-400 bg-slate-50 p-4 border border-slate-200 border-dashed rounded-lg">
                                                        <AlertCircle size={16}/> No site photos uploaded.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                        {populatedPhotos.map(([tag, url]) => (
                                                            <div key={tag} className="flex flex-col pointer-events-none group rounded-xl overflow-hidden border border-slate-200 bg-white hover:shadow-lg transition-shadow">
                                                                <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
                                                                    <img src={url} alt={tag} className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                                </div>
                                                                <div className="p-3 bg-white border-t border-slate-100">
                                                                    <span className="block text-[10px] font-black text-center text-slate-600 uppercase tracking-wider truncate">
                                                                        {PHOTO_LABELS[tag] || tag.replace(/_/g, ' ')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
                            <Activity size={32} className="text-slate-300 mb-4"/>
                            <h3 className="text-lg font-black text-slate-600 mb-1">Legacy Proposal Data</h3>
                            <p className="text-sm font-semibold text-slate-400">Complex system routing and site surveys were not cataloged for this quote payload.</p>
                        </div>
                    )}

                </div>

                {/* Fixed Bottom Chat Area */}
                <div className="h-[280px] shrink-0 border-t-2 border-slate-200 bg-white p-2">
                    <ProposalComments proposalId={proposal.id} />
                </div>
            </div>
        </Modal>
    );
}
