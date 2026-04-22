import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Banknote, FileText, Search, Clock, CheckCircle2 } from 'lucide-react';
import { formatQuoteId } from '../utils/formatters';

export default function Invoices({ isSubView = false }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    proposals ( id, customer, amount, status )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            if (data) {
                setInvoices(data);
            }
        } catch (err) {
            console.error("Error fetching invoices:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const searchStr = `${inv.proposals?.customer || ''} ${formatQuoteId({id: inv.proposal_id})} ${inv.notes || ''}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    const totalCollected = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);

    return (
        <div className={`${isSubView ? 'p-6' : 'page-container p-8'} space-y-6 h-full flex flex-col`}>
            {!isSubView && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                    <div>
                        <h1 className="text-[28px] font-bold text-slate-900 tracking-tight flex items-center gap-3 mb-1">
                            <Banknote className="text-primary-600" size={28} />
                            Invoices & Deposits
                        </h1>
                        <p className="text-slate-500 font-medium">Track collected deposits and contract payments.</p>
                    </div>
                </div>
            )}

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Banknote size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Collected</p>
                        <h3 className="text-2xl font-black text-slate-800">${totalCollected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
                        <h3 className="text-2xl font-black text-slate-800">{filteredInvoices.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none"></div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Search size={12}/> Search Ledger</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search by customer, ID..." 
                            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-lg outline-none focus:border-primary-500 focus:bg-white transition-colors text-sm font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex-1 overflow-hidden flex flex-col min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4 rounded-tl-xl">Invoice ID</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Customer / Quote</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Method</th>
                                <th className="p-4">Notes</th>
                                <th className="p-4 rounded-tr-xl text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">Loading ledger records...</td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText size={48} className="text-slate-200 mb-4" />
                                            <p className="font-bold text-slate-600 text-lg">No Financial Records Found</p>
                                            <p className="text-sm mt-1">When deposits are collected, they will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-mono text-xs text-slate-500">
                                            {inv.id.substring(0,8).toUpperCase()}
                                        </td>
                                        <td className="p-4 text-slate-600 font-medium flex items-center gap-2">
                                            <Clock size={14} className="text-slate-400"/>
                                            {new Date(inv.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{inv.proposals?.customer || 'Unknown Customer'}</div>
                                            <div className="text-xs font-mono text-slate-500 mt-0.5">{formatQuoteId({id: inv.proposal_id})}</div>
                                        </td>
                                        <td className="p-4 font-black text-emerald-600">
                                            ${parseFloat(inv.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-bold border border-slate-200">
                                                {inv.payment_method || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs max-w-[200px] truncate" title={inv.notes}>
                                            {inv.notes || '-'}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                <CheckCircle2 size={12}/> Paid
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
