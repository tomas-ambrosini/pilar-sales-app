import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DollarSign, FileText, CreditCard, TrendingUp, Download, CheckCircle, AlertCircle, RefreshCw, ChevronRight, Settings, Save } from 'lucide-react';
import './Proposals.css';

export default function Finance() {
  const [activeTab, setActiveTab] = useState('overview');
  const [margins, setMargins] = useState({ good_margin: 0.35, better_margin: 0.40, best_margin: 0.45, service_reserve: 0.05, sales_tax: 0.07 });
  
  useEffect(() => {
    fetchMargins();
  }, []);

  const fetchMargins = async () => {
    const { data } = await supabase.from('margin_settings').select('*').eq('id', 1).single();
    if (data) setMargins(data);
  };

  const saveMargins = async () => {
    await supabase.from('margin_settings').update(margins).eq('id', 1);
    alert('Global margins updated! All future estimates will use these rates.');
  };

  const invoices = [
    { id: 'INV-1025', customer: 'Alex Rivera', date: 'Oct 28', amount: '$12,450', status: 'Paid', method: 'Stripe' },
    { id: 'INV-1024', customer: 'John & Sarah Miller', date: 'Oct 26', amount: '$15,400', status: 'Pending', method: 'Check' },
    { id: 'INV-1023', customer: 'David Chen', date: 'Oct 24', amount: '$12,500', status: 'Overdue', method: 'Stripe' },
  ];

  const renderTabContent = () => {
    if (activeTab === 'overview') {
      return (
        <div className="fade-in">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="glass-panel p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Gross Revenue (MTD)</span>
              <span className="text-3xl font-bold text-slate-800">$142,500</span>
              <span className="text-sm text-success flex items-center"><TrendingUp size={14} className="mr-1" /> +15% from last month</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Outstanding Invoices</span>
               <span className="text-3xl font-bold text-slate-800">$27,900</span>
               <span className="text-sm text-danger flex items-center"><AlertCircle size={14} className="mr-1" /> 2 Overdue</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Check Deposits Processing</span>
               <span className="text-3xl font-bold text-slate-800">$15,400</span>
               <span className="text-sm text-slate-500 flex items-center">Pending Bank Verify</span>
            </div>
            <div className="glass-panel p-6 flex flex-col justify-between">
               <div>
                 <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-2">Integration Status</span>
                 <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-success"></div>
                   <span className="text-sm font-semibold">QuickBooks Sync Active</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-success"></div>
                   <span className="text-sm font-semibold">Stripe Checkout Active</span>
                 </div>
               </div>
               <button className="text-sm text-primary-600 font-semibold flex items-center gap-1 mt-2">
                 <RefreshCw size={14} /> Force Sync Now
               </button>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">Recent Invoices</h3>
              <button className="text-sm font-semibold text-primary-600">View All</button>
            </div>
            <table className="w-full text-left border-collapse" style={{ width: '100%' }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                  <th className="p-4 font-semibold">Invoice ID</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Amount</th>
                  <th className="p-4 font-semibold">Method</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">{inv.id}</td>
                    <td className="p-4 font-medium text-slate-800">{inv.customer}</td>
                    <td className="p-4 text-slate-600">{inv.date}</td>
                    <td className="p-4 font-medium text-slate-800">{inv.amount}</td>
                    <td className="p-4 text-slate-600">{inv.method}</td>
                    <td className="p-4">
                      {inv.status === 'Paid' && <span className="badge bg-success text-white px-2 py-1 rounded text-xs font-bold">{inv.status}</span>}
                      {inv.status === 'Pending' && <span className="badge bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{inv.status}</span>}
                      {inv.status === 'Overdue' && <span className="badge bg-danger text-white px-2 py-1 rounded text-xs font-bold">{inv.status}</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-slate-400 hover:text-primary-600 transition-fast"><Download size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    
    if (activeTab === 'checks') {
      return (
        <div className="fade-in">
          <div className="empty-state glass-panel" style={{ padding: '4rem 2rem' }}>
            <FileText size={48} style={{ color: 'var(--color-primary-500)', margin: '0 auto 1.5rem', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Check Deposit Log</h2>
            <p style={{ color: 'var(--color-slate-500)', maxWidth: '500px', margin: '0 auto 2rem' }}>
              Track physical checks collected by technicians in the field and log deposits to the company bank accounts.
            </p>
            <button className="primary-action-btn max-w-xs mx-auto">Log New Check</button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Finance & Accounting</h1>
          <p className="page-subtitle">Track revenue, client payments, and system integrations</p>
        </div>
        <button className="primary-action-btn">
          Create Invoice
        </button>
      </header>

      {/* Custom Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max mb-8">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'overview' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Financial Overview
        </button>
        <button 
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'pricing' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Pricing Logic
        </button>
        <button 
          onClick={() => setActiveTab('checks')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'checks' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Check Deposits
        </button>
      </div>

      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
