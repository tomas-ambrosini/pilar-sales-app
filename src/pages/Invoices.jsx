import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Banknote, FileText, Search, Clock, CheckCircle2, AlertCircle, Eye, Trash2 } from 'lucide-react';
import { formatQuoteId } from '../utils/formatters';
import InvoiceDocument from '../components/InvoiceDocument';
import { useAuth } from '../context/AuthContext';

export default function Invoices({ isSubView = false }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewTab, setViewTab] = useState('all'); // 'all', 'unpaid', 'paid'
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const { user } = useAuth();

    const handleDeleteInvoice = async (invoiceId) => {
        if (!window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
        
        try {
            const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);
            if (error) throw error;
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
        } catch (err) {
            console.error("Failed to delete invoice:", err);
            alert("Failed to delete invoice.");
        }
    };

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
                    proposals ( id, customer, amount, status, proposal_data, proposal_number, created_at, updated_at ),
                    households:customer_id (
                        id, 
                        household_name,
                        contacts ( first_name, last_name, email, primary_phone ),
                        addresses ( street_address, city, state, zip, is_primary_residence )
                    )
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
            
            <div className="responsive-invoices-layout">
                {/* Main Ledger Area */}
                <div className="responsive-invoices-main bg-white border border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden flex flex-col">
                    
                    {/* Header & Tabs */}
                    <div className="border-b border-slate-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between p-5 gap-4">
                            <div className="flex gap-2 p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-xl overflow-x-auto whitespace-nowrap custom-scrollbar" style={{ flex: '0 1 auto' }}>
                                <button onClick={() => setViewTab('unpaid')} className={`px-4 py-2.5 font-black text-xs rounded-lg transition-all ${viewTab === 'unpaid' ? 'bg-white text-primary-700 shadow-sm ring-1 ring-primary-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>Unpaid Invoices</button>
                                <button onClick={() => setViewTab('paid')} className={`px-4 py-2.5 font-black text-xs rounded-lg transition-all ${viewTab === 'paid' ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>Paid Invoices</button>
                                <button onClick={() => setViewTab('all')} className={`px-4 py-2.5 font-black text-xs rounded-lg transition-all ${viewTab === 'all' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>All Invoices</button>
                            </div>
                            <div className="relative shrink-0 w-full sm:w-auto" style={{ maxWidth: '280px' }}>
                                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search invoices..." 
                                    className="w-full bg-slate-50 hover:bg-slate-100 border border-transparent focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm font-semibold transition-all text-slate-800 placeholder-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto bg-slate-50/30">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 text-[10px] uppercase tracking-widest text-slate-400 font-black sticky top-0 z-10 shadow-sm">
                                    <th className="p-4 pl-6">Date</th>
                                    <th className="p-4">Customer</th>
                                    <th className="p-4">Invoice #</th>
                                    <th className="p-4">Quote #</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Job Total</th>
                                    <th className="p-4 text-right">Deposits</th>
                                    <th className="p-4 pr-6 text-right">Total Due</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    <tr><td colSpan="9" className="p-12 text-center text-slate-400 font-bold tracking-wide">Loading ledger records...</td></tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr><td colSpan="9" className="p-16 text-center text-slate-400 font-medium">No invoices found for this criteria.</td></tr>
                                ) : (
                                    filteredInvoices.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-white hover:shadow-sm transition-all group bg-transparent">
                                            <td className="p-4 pl-6 text-slate-500 font-bold">{new Date(inv.created_at).toLocaleDateString()}</td>
                                            <td className="p-4 font-black text-slate-800 truncate max-w-[150px] group-hover:text-primary-600 transition-colors">{inv.proposals?.customer || 'Unknown Customer'}</td>
                                            <td className="p-4"><span className="font-mono font-bold text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md text-[10px] tracking-wide">{inv.id.substring(0,6).toUpperCase()}</span></td>
                                            <td className="p-4"><span className="font-mono font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md text-[10px] tracking-wide border border-slate-100">{formatQuoteId(inv.proposals || {id: inv.proposal_id})}</span></td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                                    inv.status === 'Paid in Full' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50 shadow-sm shadow-emerald-500/10' : 
                                                    'bg-amber-50 text-amber-600 border border-amber-200/50 shadow-sm shadow-amber-500/10'
                                                }`}>
                                                    {inv.status === 'Paid in Full' ? <CheckCircle2 size={12}/> : <AlertCircle size={12}/>} {inv.status || 'Paid'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-black text-slate-700">
                                                ${(parseFloat(inv.total_contract_amount || inv.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="p-4 text-right font-bold text-slate-400">
                                                ${(parseFloat(inv.deposit_collected || inv.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="p-4 pr-6 text-right font-black text-slate-900 text-sm">
                                                ${(parseFloat(inv.balance_due ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => setSelectedInvoice(inv)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 rounded-lg text-slate-500 font-bold text-[10px] uppercase tracking-wider transition-all shadow-sm">
                                                        <Eye size={14} /> View
                                                    </button>
                                                    {['super_admin', 'admin'].includes((user?.role || '').toLowerCase()) && (
                                                        <button onClick={() => handleDeleteInvoice(inv.id)} className="inline-flex items-center justify-center w-8 h-8 bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 rounded-lg text-slate-400 transition-all shadow-sm" title="Delete Invoice">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Side Summary Panel */}
                <div className="responsive-invoices-sidebar">
                    <div className="responsive-invoices-sidebar-cards">
                        <div className="flex-1 bg-gradient-to-b from-white to-slate-50/50 border border-slate-200/80 rounded-2xl p-6 shadow-xl shadow-slate-200/30 text-center relative overflow-hidden group hover:border-slate-300 transition-colors">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors pointer-events-none"></div>
                            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner ring-1 ring-amber-500/10">
                                <FileText size={26} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Grand Total Due</h3>
                            <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter relative z-10">${grandTotalUnpaid.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>

                        <div className="flex-1 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-emerald-400 rounded-2xl p-6 shadow-xl shadow-emerald-500/30 text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-white/20"></div>
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-700/30 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                            <div className="relative z-10 w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/20 shadow-inner">
                                <Banknote size={26} strokeWidth={2.5} />
                            </div>
                            <h3 className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mb-1 relative z-10">Total Paid / Deposits</h3>
                            <p className="text-3xl sm:text-4xl font-black text-white tracking-tighter relative z-10">${grandTotalCollected.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl shadow-slate-900/50 text-center text-white lg:mt-auto flex flex-col justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-blue-500/20"></div>
                        
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex justify-center items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)] animate-pulse"></div> 
                                LIVE SYNC ACTIVE
                            </h3>
                            <p className="text-sm font-medium text-slate-400 mb-6 leading-relaxed hidden md:block">Pilar automatically syncs paid invoices to your primary ledger via QuickBooks API.</p>
                            <button className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-lg backdrop-blur-md active:scale-[0.98]">
                                Force Sync Ledger
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Modal */}
            <InvoiceDocument isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} invoice={selectedInvoice} />
        </div>
    );
}
