import React from 'react';
import Modal from './Modal';
import ProposalComments from './ProposalComments';
import { formatQuoteId } from '../utils/formatters';
import { User, FileText, Calendar, Activity, Mail, Phone, MapPin } from 'lucide-react';

export default function ProposalDetailsModal({ proposal, onClose }) {
    if (!proposal) return null;

    const data = proposal.proposal_data || {};
    const customer = proposal.customer_profiles || {};
    const name = proposal.customer || customer.name || 'Unknown Client';
    
    // Safely extract system info
    const systems = data.systemTiers || data.systems || [];
    const systemNames = systems.map(s => s.systemName).filter(Boolean);

    return (
        <Modal 
            isOpen={!!proposal} 
            onClose={onClose} 
            title={`Proposal Details: ${formatQuoteId(proposal)}`}
            width="max-w-4xl"
        >
            <div className="flex flex-col gap-6 p-2">
                {/* Top Section - Split View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    
                    {/* Left: Client Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-2">
                            <User size={16} className="text-primary-600" />
                            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Client File</h3>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Name</span>
                                <span className="text-sm font-bold text-slate-800">{name}</span>
                            </div>
                            
                            {(customer.email || proposal.email) && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail size={14} className="text-slate-400 shrink-0"/>
                                    <span className="truncate">{customer.email || proposal.email}</span>
                                </div>
                            )}
                            
                            {(customer.phone || proposal.phone) && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Phone size={14} className="text-slate-400 shrink-0"/>
                                    <span>{customer.phone || proposal.phone}</span>
                                </div>
                            )}

                            {(customer.address || customer.city) && (
                                <div className="flex items-start gap-2 text-sm text-slate-600 mt-2">
                                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5"/>
                                    <span className="break-words">
                                        {[customer.address, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Proposal Info */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-2 mb-2 border-b border-slate-200 pb-2">
                            <FileText size={16} className="text-emerald-600" />
                            <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">System Record</h3>
                        </div>
                        
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                                <span className="text-xs font-bold text-slate-500">Status</span>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    proposal.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                    proposal.status === 'Sent' ? 'bg-blue-100 text-blue-800' :
                                    proposal.status === 'Draft' ? 'bg-slate-200 text-slate-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {proposal.status || 'Draft'}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 font-medium">Est. Value</span>
                                <span className="font-black text-slate-800">${(proposal.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                                <Calendar size={12} />
                                <span>Created: {new Date(proposal.date || proposal.created_at).toLocaleDateString()}</span>
                            </div>

                            {systemNames.length > 0 && (
                                <div className="pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Activity size={12} className="text-primary-600"/>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Survey Matrix</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {systemNames.map((sys, i) => (
                                            <span key={i} className="text-[10px] bg-primary-50 text-primary-700 border border-primary-100 px-2 py-1 rounded truncate max-w-full">
                                                {sys}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Internal Chat */}
                <div className="flex flex-col flex-1 min-h-[350px]">
                    <ProposalComments proposalId={proposal.id} />
                </div>
            </div>
        </Modal>
    );
}
