import re

content = """import React from 'react';
import Modal from './Modal';
import ProposalComments from './ProposalComments';
import { formatQuoteId, generateMList } from '../utils/formatters';
import { User, FileText, Calendar, Activity, Mail, Phone, MapPin, Grid, Camera, Zap, ThermometerSun, Wind } from 'lucide-react';

const MEASUREMENT_LABELS = {
  m1: "Ret W", m2: "Ret D", m3: "Sup W", m4: "Sup D", m5: "Ret Box W",
  m6: "Ret Box D", m7: "Floor H", m8: "Return P", m9: "Supply P", m10: "P/D",
  m11: "Ceil H", m12: "Clearance", m13: "Plenum D", m14: "AHU D", m15: "Clearance",
  m16: "Ret Box D", m17: "Clearance", m18: "Access W", m19: "Access D", m20: "AHU L",
  m21: "AHU H", m22: "Plenum Top", m23: "Plenum End", m24: "Plenum B", m25: "Plenum C",
  m26: "Plenum D", m27: "Attic Pitch"
};

const PHOTO_LABELS = {
    condenser_wide: "Condenser (Wide)",
    condenser_data_plate: "Condenser Data Plate",
    indoor_unit_wide: "Indoor Unit (Wide)",
    indoor_data_plate: "Indoor Data Plate",
    electrical_panel_open: "Electrical Panel",
};

export default function ProposalDetailsModal({ proposal, onClose }) {
    if (!proposal) return null;

    const data = proposal.proposal_data || {};
    const customer = proposal.customer_profiles || {};
    const name = proposal.customer || customer.name || 'Unknown Client';
    
    // Safely extract system info
    const systems = data.systemTiers || data.systems || [];

    return (
        <Modal 
            isOpen={!!proposal} 
            onClose={onClose} 
            title={`Proposal Details: ${formatQuoteId(proposal)}`}
            width="w-[95vw] max-w-6xl"
        >
            <div className="flex flex-col max-h-[85vh] overflow-hidden bg-slate-50">
                {/* Scrollable Data Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    
                    {/* Header Strip */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Client Info */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                <User size={18} className="text-primary-600" />
                                <h3 className="font-bold text-slate-800 tracking-wide uppercase">Client File</h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Contact</span>
                                    <span className="text-base font-bold text-slate-800">{name}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {(customer.email || proposal.email) && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                            <Mail size={14} className="text-slate-400 shrink-0"/>
                                            <span className="truncate">{customer.email || proposal.email}</span>
                                        </div>
                                    )}
                                    {(customer.phone || proposal.phone) && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                                            <Phone size={14} className="text-slate-400 shrink-0"/>
                                            <span>{customer.phone || proposal.phone}</span>
                                        </div>
                                    )}
                                </div>
                                {(customer.address || customer.city) && (
                                    <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                                        <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/>
                                        <span className="break-words">
                                            {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Proposal Info */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                             <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                                <FileText size={18} className="text-emerald-600" />
                                <h3 className="font-bold text-slate-800 tracking-wide uppercase">Proposal Metadata</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-sm font-bold text-slate-500">Pipeline Status</span>
                                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                                        proposal.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                        proposal.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                        proposal.status === 'Draft' ? 'bg-slate-200 text-slate-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {proposal.status || 'Draft'}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center text-sm p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                                    <span className="text-emerald-700 font-bold uppercase tracking-wide">Gross Value</span>
                                    <span className="font-black text-emerald-800 text-lg">${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-slate-500 px-2 pt-1 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={12} />
                                        <span>Created: {new Date(proposal.date || proposal.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {proposal.updated_at && (
                                        <div className="flex items-center gap-1.5">
                                            <Activity size={12} />
                                            <span>Updated: {new Date(proposal.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Systems Loop */}
                    {systems.length > 0 && (
                        <div className="space-y-6">
                            {systems.map((sys, idx) => {
                                const survey = sys.survey || {};
                                const photos = sys.photos || {};
                                const populatedPhotos = Object.entries(photos).filter(([k,v]) => v);

                                return (
                                    <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden line-clamp-none">
                                        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between pointer-events-none">
                                            <h3 className="text-white font-black text-lg flex items-center gap-2">
                                                <ThermometerSun className="text-primary-400" />
                                                {sys.systemName || `System ${idx+1}`}
                                            </h3>
                                            {survey.systemType && (
                                                <span className="text-xs font-bold uppercase tracking-widest bg-slate-700 text-slate-300 px-3 py-1 rounded">
                                                    {survey.systemType} - {survey.currentTonnage ? `${survey.currentTonnage} TON` : 'UNKNOWN SIZE'}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="p-6 space-y-8">
                                            {/* Core Metrics */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center text-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</span>
                                                    <span className="text-sm font-bold text-slate-800">{survey.systemLocation || '--'}</span>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center text-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thermostats</span>
                                                    <span className="text-sm font-bold text-slate-800">{survey.thermostatCount || '--'}</span>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center text-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ductwork</span>
                                                    <span className="text-sm font-bold text-slate-800 truncate px-2">{survey.ductwork || '--'}</span>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded border border-slate-100 flex flex-col items-center text-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Supply Lineset</span>
                                                    <span className="text-sm font-bold text-slate-800">{survey.lineSetSupply || '--'} / {survey.lineSetLiquid || '--'}</span>
                                                </div>
                                            </div>

                                            {/* 27 Measurements */}
                                            {Object.keys(MEASUREMENT_LABELS).some(k => survey[k]) && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                                        <Grid size={16} className="text-slate-400" />
                                                        <h4 className="font-bold text-slate-700 text-sm tracking-wide uppercase">Hardware Measurements</h4>
                                                    </div>
                                                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                                                        {Object.entries(MEASUREMENT_LABELS).map(([key, label], i) => {
                                                            const val = survey[key];
                                                            if (!val) return null;
                                                            return (
                                                                <div key={key} className="flex flex-col items-center border border-slate-200 bg-slate-50 rounded p-1.5 text-center">
                                                                    <span className="text-[9px] font-black uppercase text-slate-400 mb-0.5">{label}</span>
                                                                    <span className="text-xs font-bold text-primary-700">{val}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Photos */}
                                            {populatedPhotos.length > 0 && (
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                                        <Camera size={16} className="text-slate-400" />
                                                        <h4 className="font-bold text-slate-700 text-sm tracking-wide uppercase">Site Imagery</h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                                        {populatedPhotos.map(([tag, url]) => (
                                                            <div key={tag} className="flex flex-col pointer-events-none">
                                                                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-2">
                                                                    <img src={url} alt={tag} className="w-full h-full object-cover" />
                                                                </div>
                                                                <span className="text-[10px] font-bold text-center text-slate-500">{PHOTO_LABELS[tag] || tag}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>

                {/* Fixed Bottom Chat Area */}
                <div className="h-[350px] shrink-0 border-t border-slate-200 bg-white">
                    <ProposalComments proposalId={proposal.id} />
                </div>
            </div>
        </Modal>
    );
}
"""

with open("src/components/ProposalDetailsModal.jsx", "w") as f:
    f.write(content)
print("Updated modal")
