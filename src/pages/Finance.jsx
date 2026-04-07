import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DollarSign, FileText, CreditCard, TrendingUp, Download, CheckCircle, AlertCircle, RefreshCw, ChevronRight, Settings, Save, CheckSquare, X, Search, Filter } from 'lucide-react';
import './Proposals.css';

export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [margins, setMargins] = useState({ good_margin: 0.35, better_margin: 0.40, best_margin: 0.45, service_reserve: 0.05, sales_tax: 0.07 });
  const [workOrders, setWorkOrders] = useState([]);
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Accounts');

  // Modals for payment
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_type: 'DEPOSIT', payment_method: 'Credit Card', transaction_ref: '' });

  useEffect(() => {
    fetchMargins();
    fetchWorkOrderLedgers();
  }, []);

  const fetchMargins = async () => {
    const { data } = await supabase.from('margin_settings').select('*').eq('id', 1).single();
    if (data) setMargins(data);
  };

  const saveMargins = async () => {
    await supabase.from('margin_settings').update(margins).eq('id', 1);
    alert('Global margins updated! All future estimates will use these rates.');
  };

  const fetchWorkOrderLedgers = async () => {
    try {
       const { data, error } = await supabase
          .from('work_orders')
          .select(`
            *,
            payments (*),
            households (
              household_name,
              contacts (first_name, last_name)
            )
          `)
          .neq('status', 'Cancelled')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
       if (error) {
           console.error("Failed to fetch work orders:", error);
           return;
       }
       setWorkOrders(data || []);
    } catch (err) {
       console.error("Error in fetching ledgers:", err);
    }
  };

  const handleOpenPaymentModal = (wo) => {
     setSelectedWorkOrder(wo);
     setPaymentForm({ amount: '', payment_type: 'DEPOSIT', payment_method: 'Credit Card', transaction_ref: '' });
     setIsPaymentModalOpen(true);
  };

  const submitPayment = async () => {
     if (!selectedWorkOrder || !paymentForm.amount) return;
     
     try {
         const { error } = await supabase.from('payments').insert({
             work_order_id: selectedWorkOrder.id,
             amount: Number(paymentForm.amount),
             payment_type: paymentForm.payment_type,
             payment_method: paymentForm.payment_method,
             transaction_ref: paymentForm.transaction_ref,
             status: 'CLEARED'
         });
         if (error) throw error;
         
         setIsPaymentModalOpen(false);
         // Refresh Data
         fetchWorkOrderLedgers();
     } catch (err) {
         alert("Failed to record payment: " + err.message);
     }
  };

  // Safe Math helper
  const getLedgerMath = (wo) => {
     const total = Number(wo.execution_payload?.salesPrice || 0);
     const clearedPaid = wo.payments?.filter(p => p.status === 'CLEARED').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
     const balance = total - clearedPaid;
     
     let badge = 'Unpaid';
     const displayBalance = Number(balance.toFixed(2));
     
     if (total <= 0 && clearedPaid === 0) badge = 'Unpaid';
     else if (clearedPaid > 0 && displayBalance > 0) badge = 'Partial';
     else if (clearedPaid > 0 && displayBalance <= 0) badge = 'Settled';
     
     const customerName = wo.households?.contacts?.[0]?.first_name 
         ? `${wo.households.contacts[0].first_name} ${wo.households.contacts[0].last_name}`.trim()
         : wo.households?.household_name || 'Unknown Account';
         
     return { total, clearedPaid, balance: displayBalance, badge, customerName };
  };

  // Aggregations
  let totalGross = 0;
  let totalOutstanding = 0;
  let openBalancesCount = 0;
  
  workOrders.forEach(wo => {
      const { total, balance, badge } = getLedgerMath(wo);
      totalGross += total;
      totalOutstanding += balance > 0 ? balance : 0;
      if (badge === 'Unpaid' || badge === 'Partial') openBalancesCount++;
  });

  const PaymentModal = () => {
      if (!isPaymentModalOpen || !selectedWorkOrder) return null;
      const { balance, customerName } = getLedgerMath(selectedWorkOrder);
      
      return (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Record Payment</h3>
                  <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition"><X size={20}/></button>
               </div>
               <div className="p-6 flex flex-col gap-4">
                  <div>
                      <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Account</p>
                      <p className="font-bold text-slate-800">{customerName}</p>
                      <p className="text-sm font-bold text-amber-600 mt-1">Balance Remaining: ${Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  
                  <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1">Amount ($)</label>
                      <input type="number" step="0.01" className="w-full border border-slate-200 rounded p-2 focus:border-primary-500 focus:outline-none placeholder-slate-300" 
                             placeholder="0.00"
                             value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-sm font-semibold text-slate-700 block mb-1">Type</label>
                          <select className="w-full border border-slate-200 rounded p-2 cursor-pointer focus:border-primary-500 focus:outline-none" value={paymentForm.payment_type} onChange={e => setPaymentForm({...paymentForm, payment_type: e.target.value})}>
                             <option value="DEPOSIT">Deposit</option>
                             <option value="PROGRESS">Progress</option>
                             <option value="FINAL">Final</option>
                          </select>
                      </div>
                      <div>
                          <label className="text-sm font-semibold text-slate-700 block mb-1">Method</label>
                          <select className="w-full border border-slate-200 rounded p-2 cursor-pointer focus:border-primary-500 focus:outline-none" value={paymentForm.payment_method} onChange={e => setPaymentForm({...paymentForm, payment_method: e.target.value})}>
                             <option value="Credit Card">Credit Card</option>
                             <option value="Check">Check</option>
                             <option value="Cash">Cash</option>
                             <option value="Wire">Wire / Transfer</option>
                          </select>
                      </div>
                  </div>
                  <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1">Reference / Note</label>
                      <input type="text" placeholder="e.g. Check #2045 or x-4921" className="w-full border border-slate-200 rounded p-2 focus:border-primary-500 focus:outline-none" 
                             value={paymentForm.transaction_ref} onChange={(e) => setPaymentForm({...paymentForm, transaction_ref: e.target.value})} />
                  </div>
               </div>
               <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                   <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 transition">Cancel</button>
                   <button onClick={submitPayment} className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded shadow-sm transition">Post Payment</button>
               </div>
            </div>
         </div>
      );
  };

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      const filteredWorkOrders = workOrders.map(wo => ({...wo, ...getLedgerMath(wo)})).filter(wo => {
          const q = searchQuery.toLowerCase().trim();
          const matchSearch = q === '' || wo.customerName.toLowerCase().includes(q) || (wo.id || '').toLowerCase().includes(q);
          
          if (statusFilter === 'Open Balances') return matchSearch && (wo.badge === 'Unpaid' || wo.badge === 'Partial');
          if (statusFilter !== 'All Accounts') return matchSearch && wo.badge === statusFilter;
          
          return matchSearch;
      });

      return (
        <div className="fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <div className="glass-panel p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Gross Contracted (YTD)</span>
              <span className="text-3xl font-bold text-slate-800">${totalGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-sm text-success flex items-center"><TrendingUp size={14} className="mr-1" /> Bound & Sold</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2 relative overflow-hidden">
               {totalOutstanding > 0 && <div className="absolute top-0 right-0 w-2 h-full bg-amber-500"></div>}
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Outstanding Accounts</span>
               <span className="text-3xl font-bold text-slate-800">${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               <span className={`text-sm flex items-center ${openBalancesCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}><AlertCircle size={14} className="mr-1" /> {openBalancesCount} Open Balances</span>
            </div>
            <div className="glass-panel p-6 flex flex-col justify-between">
               <div>
                 <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-2">Integration Status</span>
                 <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-success"></div>
                   <span className="text-sm font-semibold">Postgres RLS Unified</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-success"></div>
                   <span className="text-sm font-semibold">Ledgers Syncing Natively</span>
                 </div>
               </div>
            </div>
            <div className="glass-panel p-6 flex flex-col justify-between items-center text-center">
               <button className="text-sm text-primary-600 hover:text-primary-800 font-bold flex flex-col items-center gap-2 mt-2 transition" onClick={fetchWorkOrderLedgers}>
                 <div className="p-3 bg-primary-50 rounded-full"><RefreshCw size={24} /></div>
                 Force Sync Work Orders
               </button>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border-b border-slate-200 bg-slate-50 gap-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap"><DollarSign className="text-primary-500" size={18}/> Work Order Sub-Ledgers</h3>
              
              <div className="flex flex-1 items-center justify-end gap-3">
                 <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Search customer or job ID..." 
                           className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                           value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                 </div>
                 <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <select className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none bg-white cursor-pointer"
                            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                       <option value="All Accounts">All Accounts</option>
                       <option value="Open Balances">Open Balances</option>
                       <option value="Unpaid">Unpaid</option>
                       <option value="Partial">Partial</option>
                       <option value="Settled">Settled</option>
                    </select>
                 </div>
                 <button className="text-sm font-semibold text-primary-600 hover:text-primary-800 transition whitespace-nowrap hidden sm:block w-16 text-right" onClick={fetchWorkOrderLedgers}>Refresh</button>
              </div>
            </div>
            {filteredWorkOrders.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic font-medium flex flex-col items-center justify-center gap-2">
                   <AlertCircle size={32} className="text-slate-300 mb-2" />
                   {workOrders.length === 0 ? "No ongoing work orders to track." : "No ledgers strictly match your current search or status filter."}
                </div>
            ) : (
                <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead>
                    <tr className="bg-white border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                    <th className="p-4 font-semibold text-[10px]">Job Auth ID</th>
                    <th className="p-4 font-semibold text-[10px]">Customer / Account</th>
                    <th className="p-4 font-semibold text-[10px]">Contract Total</th>
                    <th className="p-4 font-semibold text-[10px]">Cleared Paid</th>
                    <th className="p-4 font-semibold text-[10px]">Balance Left</th>
                    <th className="p-4 font-semibold text-[10px]">Status</th>
                    <th className="p-4 font-semibold text-[10px]"></th>
                    </tr>
                </thead>
                <tbody>
                    {filteredWorkOrders.map(wo => {
                        const { total, clearedPaid, balance, badge, customerName } = wo;
                        return (
                        <tr key={wo.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-bold text-slate-800 text-xs font-mono">{(wo.id || '').substring(0,8).toUpperCase()}</td>
                            <td className="p-4 font-bold text-primary-800">{customerName}</td>
                            <td className="p-4 text-slate-800 text-sm font-black">${Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-4 text-slate-600 text-sm font-bold">${Number(clearedPaid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className={`p-4 font-black ${balance > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>${Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-4">
                                {badge === 'Settled' && <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">{badge}</span>}
                                {badge === 'Unpaid' && <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">{badge}</span>}
                                {badge === 'Partial' && <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">{badge}</span>}
                            </td>
                            <td className="p-4 flex gap-2 justify-end min-w-[120px]">
                                {badge !== 'Settled' && (
                                    <button className="text-[10px] font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 hover:scale-105 active:scale-95 px-3 py-1.5 rounded uppercase tracking-wider border border-primary-200 flex items-center gap-1 transition-all" onClick={() => handleOpenPaymentModal(wo)}>
                                        <CheckSquare size={12} /> Log Pay
                                    </button>
                                )}
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
                </table>
                </div>
            )}
          </div>
        </div>
      );
    }
    
    if (activeTab === 'pricing') {
      return (
        <div className="fade-in max-w-xl">
           <div className="glass-panel p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2 text-xl"><Settings className="text-primary-500"/> Global Pricing Engine</h3>
              <p className="text-slate-500 text-sm mb-8">Update the baseline logic math used across all sales proposals and catalog generation. These variables natively control retail prices.</p>
              
              <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-semibold text-slate-700">Good Tier Target Margin</span>
                 <div className="flex items-center gap-2">
                   <input type="number" step="0.1" className="border-b-2 border-primary-500 focus:outline-none p-1 w-20 text-right font-bold text-primary-700 bg-transparent text-lg" value={Number(((margins.good_margin || 0.35) * 100).toFixed(2))} onChange={e => setMargins({...margins, good_margin: parseFloat(e.target.value) / 100})} />
                   <span className="font-bold text-slate-400">%</span>
                 </div>
              </div>

              <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-semibold text-slate-700">Better Tier Target Margin</span>
                 <div className="flex items-center gap-2">
                   <input type="number" step="0.1" className="border-b-2 border-primary-500 focus:outline-none p-1 w-20 text-right font-bold text-primary-700 bg-transparent text-lg" value={Number(((margins.better_margin || 0.40) * 100).toFixed(2))} onChange={e => setMargins({...margins, better_margin: parseFloat(e.target.value) / 100})} />
                   <span className="font-bold text-slate-400">%</span>
                 </div>
              </div>

              <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-semibold text-slate-700">Best Tier Target Margin</span>
                 <div className="flex items-center gap-2">
                   <input type="number" step="0.1" className="border-b-2 border-primary-500 focus:outline-none p-1 w-20 text-right font-bold text-primary-700 bg-transparent text-lg" value={Number(((margins.best_margin || 0.45) * 100).toFixed(2))} onChange={e => setMargins({...margins, best_margin: parseFloat(e.target.value) / 100})} />
                   <span className="font-bold text-slate-400">%</span>
                 </div>
              </div>
              
              <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-semibold text-slate-700">Service Reserve Injection</span>
                 <div className="flex items-center gap-2">
                   <input type="number" step="0.1" className="border-b-2 border-primary-500 focus:outline-none p-1 w-20 text-right font-bold text-primary-700 bg-transparent text-lg" value={Number(((margins.service_reserve || 0.05) * 100).toFixed(2))} onChange={e => setMargins({...margins, service_reserve: parseFloat(e.target.value) / 100})} />
                   <span className="font-bold text-slate-400">%</span>
                 </div>
              </div>

              <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                 <span className="font-semibold text-slate-700">State Sales Tax</span>
                 <div className="flex items-center gap-2">
                   <input type="number" step="0.1" className="border-b-2 border-primary-500 focus:outline-none p-1 w-20 text-right font-bold text-primary-700 bg-transparent text-lg" value={Number(((margins.sales_tax || 0.07) * 100).toFixed(2))} onChange={e => setMargins({...margins, sales_tax: parseFloat(e.target.value) / 100})} />
                   <span className="font-bold text-slate-400">%</span>
                 </div>
              </div>
              
              <button 
                className="text-white font-semibold text-sm flex items-center gap-2 w-full justify-center bg-slate-800 py-4 rounded-lg hover:bg-slate-900 shadow-md transition-all active:scale-95" 
                onClick={saveMargins}
              >
                <Save size={18}/> Apply Logic Universally
              </button>
           </div>
        </div>
      );
    }
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Finance & Sub-Ledgers</h1>
          <p className="page-subtitle">Track YTD contracted revenue and reconcile active job receipts natively.</p>
        </div>
      </header>

      {/* Custom Tab Navigation */}
      <div className="flex gap-1 bg-slate-100/50 p-1.5 rounded-xl w-max mb-8 border border-slate-200/50 shadow-sm backdrop-blur-sm">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-300 ${activeTab === 'overview' ? 'bg-white shadow-md text-primary-700 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
        >
          Internal Sub-Ledger
        </button>
        <button 
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-lg transition-all duration-300 ${activeTab === 'pricing' ? 'bg-white shadow-md text-primary-700 border-b-2 border-primary-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
        >
          Margin Config
        </button>
      </div>

      <div className="mt-4">
        {renderTabContent()}
      </div>

      <PaymentModal />
    </div>
  );
}
