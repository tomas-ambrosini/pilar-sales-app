import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Banknote, FileText, Search, Clock, CheckCircle2, AlertCircle, Eye } from 'lucide-react';
import { formatQuoteId } from '../utils/formatters';
import InvoiceDocument from '../components/InvoiceDocument';

export default function Invoices({ isSubView = false }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewTab, setViewTab] = useState('all'); // 'all', 'unpaid', 'paid'
    const [selectedInvoice, setSelectedInvoice] = useState(null);

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
                    proposals ( id, customer, amount, status, proposal_data )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            if (data) setInvoices(data);
        } catch (err) {
            console.error("Error fetching invoices:", err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const searchStr = `${inv.proposals?.customer || ''} ${formatQuoteId({id: inv.proposal_id})} ${inv.notes || ''}`.toLowerCase();
        const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
        
        if (viewTab === 'unpaid') return matchesSearch && inv.status !== 'Paid in Full';
        if (viewTab === 'paid') return matchesSearch && inv.status === 'Paid in Full';
        return matchesSearch;
    });

    const grandTotalUnpaid = invoices.filter(i => i.status !== 'Paid in Full').reduce((sum, inv) => sum + (parseFloat(inv.balance_due) || 0), 0);
    const grandTotalCollected = invoices.reduce((sum, inv) => sum + (parseFloat(inv.deposit_collected || inv.amount) || 0), 0);

    return (
        <div className={`${isSubView ? 'p-6' : 'page-container p-8'} h-full flex flex-col bg-slate-50 overflow-y-auto`}>
            
            <div className="flex gap-6 h-full min-h-[600px]">
                {/* Main Ledger Area */}
                <div className="flex-1 flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    
                    {/* Header & Tabs */}
                    <div className="border-b border-slate-200 bg-white">
                        <div className="flex items-center justify-between p-4 bg-slate-50/50">
                            <div className="flex gap-6 px-2">
                                <button onClick={() => setViewTab('unpaid')} className={`pb-2 font-bold text-sm transition-all border-b-2 ${viewTab === 'unpaid' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Unpaid Invoices</button>
                                <button onClick={() => setViewTab('paid')} className={`pb-2 font-bold text-sm transition-all border-b-2 ${viewTab === 'paid' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Paid Invoices</button>
                                <button onClick={() => setViewTab('all')} className={`pb-2 font-bold text-sm transition-all border-b-2 ${viewTab === 'all' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>All Invoices</button>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    className="w-full bg-white border border-slate-200 pl-9 pr-3 py-1.5 rounded outline-none focus:border-primary-500 text-xs font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold sticky top-0 z-10 shadow-sm">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Customer</th>
                                    <th className="p-3">Invoice #</th>
                                    <th className="p-3">Quote #</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Job Total</th>
                                    <th className="p-3 text-right">Deposits</th>
                                    <th className="p-3 text-right">Total Due</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-8 text-center text-slate-400 font-medium">Loading ledger...</td></tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr><td colSpan="9" className="p-12 text-center text-slate-500">No invoices found.</td></tr>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-slate-600 font-medium">{new Date(inv.created_at).toLocaleDateString()}</td>
                                            <td className="p-3 font-bold text-primary-600">{inv.proposals?.customer || 'Unknown Customer'}</td>
                                            <td className="p-3 font-mono text-slate-600">{inv.id.substring(0,6).toUpperCase()}</td>
                                            <td className="p-3 font-mono text-slate-500">{formatQuoteId({id: inv.proposal_id})}</td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                                    inv.status === 'Paid in Full' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {inv.status === 'Paid in Full' ? <CheckCircle2 size={10}/> : <AlertCircle size={10}/>} {inv.status || 'Paid'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right font-medium text-slate-700">
                                                ${(parseFloat(inv.total_contract_amount || inv.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="p-3 text-right font-medium text-slate-500">
                                                ${(parseFloat(inv.deposit_collected || inv.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="p-3 text-right font-black text-slate-900">
                                                ${(parseFloat(inv.balance_due ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => setSelectedInvoice(inv)} className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded text-slate-600 font-bold text-[10px] uppercase transition-colors shadow-sm">
                                                    <Eye size={12} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side Summary Panel */}
                <div className="w-[300px] shrink-0 flex flex-col gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                        <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileText size={24} />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total Due of All Unpaid</h3>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">${grandTotalUnpaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Banknote size={24} />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deposits / Paid</h3>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">${grandTotalCollected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 shadow-md text-center text-white mt-auto">
                        <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-2 flex justify-center items-center gap-2"><CheckCircle2 size={14}/> Accounting Sync</h3>
                        <p className="text-sm font-medium text-slate-400 mb-4 leading-relaxed">Pilar automatically syncs paid invoices to your primary ledger. QuickBooks integration is active.</p>
                        <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors">Force Ledger Sync</button>
                    </div>
                </div>
            </div>

            {/* Document Modal */}
            <InvoiceDocument isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoice={selectedInvoice} />
        </div>
    );
}
