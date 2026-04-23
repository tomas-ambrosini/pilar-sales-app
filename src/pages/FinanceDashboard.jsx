import React, { useState } from 'react';
import PromoCodes from './PromoCodes';
import FinancialSettings from './FinancialSettings';
import Invoices from './Invoices';
import { Landmark, Megaphone, Calculator, Banknote } from 'lucide-react';

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState('promos');

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50">
      {/* Sleek Top Navigation / Tab Bar */}
      <div className="border-b border-slate-200 bg-white px-4 sm:px-8 pt-4 flex gap-4 sm:gap-8 shadow-sm z-10 relative overflow-x-auto whitespace-nowrap custom-scrollbar">
          <button
            onClick={() => setActiveTab('promos')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-[3px] ${
                activeTab === 'promos' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Megaphone size={16} />
            Promo Campaigns
          </button>
          <button
            onClick={() => setActiveTab('margins')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-[3px] ${
                activeTab === 'margins' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Calculator size={16} />
            Global Margins & Taxes
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-[3px] ${
                activeTab === 'invoices' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Banknote size={16} />
            Deposits & Invoices
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'promos' && <PromoCodes isSubView={true} />}
        {activeTab === 'margins' && <FinancialSettings isSubView={true} />}
        {activeTab === 'invoices' && <Invoices isSubView={true} />}
      </div>
    </div>
  );
}
