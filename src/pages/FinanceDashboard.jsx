import React, { useState } from 'react';
import PromoCodes from './PromoCodes';
import FinancialSettings from './FinancialSettings';
import { Landmark, Megaphone, Calculator } from 'lucide-react';

export default function FinanceDashboard() {
  const [activeTab, setActiveTab] = useState('promos');

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50">
      {/* Sleek Top Navigation / Tab Bar */}
      <div className="border-b border-slate-200 bg-white px-8 pt-4 flex gap-8 shadow-sm z-10 relative">
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
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'promos' && <div className="absolute inset-0 overflow-y-auto"><PromoCodes isSubView={true} /></div>}
        {activeTab === 'margins' && <div className="absolute inset-0 overflow-y-auto"><FinancialSettings isSubView={true} /></div>}
      </div>
    </div>
  );
}
