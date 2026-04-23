import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, FileText, Banknote, Image as ImageIcon } from 'lucide-react';
import GlobalBranding from './templates/GlobalBranding';
import ContractSettings from './templates/ContractSettings';
import InvoiceSettings from './templates/InvoiceSettings';

export default function TemplateDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'branding');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['branding', 'contracts', 'invoices'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50/50">
      {/* Sleek Top Navigation / Tab Bar */}
      <div className="border-b border-slate-200 bg-white px-4 sm:px-8 pt-4 flex gap-4 sm:gap-8 shadow-sm z-10 relative overflow-x-auto whitespace-nowrap custom-scrollbar">
          <button
            onClick={() => handleTabChange('branding')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-[3px] ${
                activeTab === 'branding' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <ImageIcon size={16} />
            Global Branding & Identity
          </button>
          <button
            onClick={() => handleTabChange('contracts')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-[3px] ${
                activeTab === 'contracts' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileText size={16} />
            Contract Boilerplate
          </button>
          <button
            onClick={() => handleTabChange('invoices')}
            className={`pb-3 font-bold text-sm flex items-center gap-2 transition-all border-b-[3px] ${
                activeTab === 'invoices' 
                ? 'border-primary-600 text-primary-700' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Banknote size={16} />
            Invoice Boilerplate
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'branding' && <GlobalBranding />}
        {activeTab === 'contracts' && <ContractSettings />}
        {activeTab === 'invoices' && <InvoiceSettings />}
      </div>
    </div>
  );
}
