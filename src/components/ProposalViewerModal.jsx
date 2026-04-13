import React from 'react';
import { X, CheckCircle, Shield, Wind, Droplets, ArrowRight, FileText, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { formatQuoteId } from '../utils/formatters';

export default function ProposalViewerModal({ isOpen, onClose, proposal, onAccept, onViewContract }) {
  const [localSelections, setLocalSelections] = React.useState({});

  if (!proposal) return null;

  const { proposal_data } = proposal;

  const renderTier = (tierName, tierData, isBest, systemId = null) => {
    if (!tierData) return null;
    
    // Multi-System Logic Check
    const isMultiSys = systemId !== null;
    const isSelected = isMultiSys && localSelections[systemId] === tierName;
    
    const borderClass = isMultiSys 
         ? (isSelected ? 'border-primary-500 ring-4 ring-primary-500/20 bg-white scale-[1.02] shadow-xl z-20' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-primary-300')
         : (isBest ? 'border-primary-500 shadow-xl bg-white scale-105 z-10' : 'border-slate-200 bg-slate-50');

    return (
       <div 
          className={`relative flex flex-col p-6 rounded-xl border-2 transition-all duration-200 ${isMultiSys ? 'cursor-pointer' : ''} ${borderClass}`}
          onClick={() => isMultiSys && setLocalSelections(p => ({...p, [systemId]: tierName}))}
       >
          {((isBest && !isMultiSys) || (isMultiSys && tierName === 'Best')) && (
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                 Recommended
             </div>
          )}
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{tierName}</h3>
          
          <div className="my-4 pb-4 border-b border-slate-200">
             <div className="text-3xl font-black text-slate-900">
                ${(tierData.salesPrice || 0).toLocaleString()}
             </div>
             <p className="text-xs text-slate-500 mt-1 font-medium">Fully Installed Price</p>
          </div>
          
          <div className="flex-grow space-y-4 mb-6">
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Equipment</p>
                {tierData.equipmentList && tierData.equipmentList.length > 0 ? (
                   <div className="space-y-1">
                      {tierData.equipmentList.map((eq, i) => (
                          <p key={i} className="text-sm font-bold text-slate-800">{eq}</p>
                      ))}
                      <p className="text-xs text-slate-600 border-t border-slate-200 mt-1 pt-1">Total: {tierData.tons} Tons</p>
                   </div>
                ) : (
                   <>
                      <p className="font-bold text-slate-800">{tierData.brand} {tierData.series}</p>
                      <p className="text-sm text-slate-600">{tierData.tons} Ton System</p>
                   </>
                )}
             </div>
             
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Included Features</p>
                <ul className="space-y-2">
                   {(tierData.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                         <CheckCircle size={14} className="text-success mt-0.5 flex-shrink-0" />
                         <span>{feat}</span>
                      </li>
                   ))}
                </ul>
             </div>
          </div>
          
          <div className="mt-auto pt-4">
             {isMultiSys ? (
                 <button 
                    disabled
                    className={`w-full py-3 rounded font-bold transition-all flex items-center justify-center gap-2 ${isSelected ? 'bg-primary-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-transparent'}`}
                 >
                    {isSelected ? <><CheckCircle size={16}/> Option Selected</> : 'Select Option'}
                 </button>
             ) : proposal.status !== 'Approved' ? (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onAccept && onAccept(tierName, tierData, proposal); }}
                    className={`w-full py-3 rounded font-bold transition-all flex items-center justify-center gap-2 ${isBest ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300'}`}
                 >
                    Accept {tierName} Quote
                 </button>
             ) : (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onViewContract && onViewContract(proposal); }} 
                    className={`w-full py-3 rounded font-bold flex items-center justify-center gap-2 transition-all ${isBest ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl scale-105' : 'bg-emerald-50 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}
                 >
                    <FileText size={16}/> View Signed Contract
                 </button>
             )}
          </div>
       </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
       {/* Backdrop */}
       <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
       
       {/* Massive Modal Container */}
       <div className="relative bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col overflow-hidden transform transition-transform duration-300 scale-100">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
             <div>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-1" title={proposal.proposal_number ? `Legacy ID: ${proposal.id}` : ''}>Interactive Digital Proposal • {formatQuoteId(proposal)}</p>
                <h2 className="text-2xl font-black text-slate-800">{proposal.customer}</h2>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 mt-2">
                   <span>Generated: {proposal.date}</span>
                   {proposal.status && (
                      <span className="px-2 py-0.5 rounded-sm bg-slate-200 text-slate-700">{proposal.status}</span>
                   )}
                </div>
             </div>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full border border-slate-200 transition-colors">
                <X size={20} />
             </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
             {!proposal_data ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                      <Shield size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">Legacy Quote Detected</h3>
                   <p className="text-slate-500 max-w-md">This proposal was generated before the digital matrix engine was implemented. The system only cataloged the total gross amount: <strong>${(proposal.amount || 0).toLocaleString()}</strong>. To view digital tiers, please generate a new quote for this customer.</p>
                </div>
             ) : proposal_data.systemTiers && proposal_data.systemTiers.length > 0 ? (
                <div className="space-y-16 max-w-5xl mx-auto pt-4 pb-12">
                   {proposal_data.systemTiers.map(sys => (
                      <div key={sys.systemId} className="border-t-2 border-slate-100 pt-8 first:border-0 first:pt-0">
                         <div className="mb-6 text-center">
                            <h3 className="text-3xl font-black text-slate-800">{sys.systemName}</h3>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Select Tier Option</p>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end">
                            {renderTier('Good', sys.tiers?.good, false, sys.systemId)}
                            {renderTier('Best', sys.tiers?.best, true, sys.systemId)}
                            {renderTier('Better', sys.tiers?.better, false, sys.systemId)}
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end max-w-5xl mx-auto pt-4 pb-8">
                   {renderTier('Good', proposal_data.tiers?.good, false)}
                   {renderTier('Best', proposal_data.tiers?.best, true)}
                   {renderTier('Better', proposal_data.tiers?.better, false)}
                </div>
             )}
          </div>
          
          {/* Footer Actions */}
          {proposal_data?.systemTiers && proposal_data.systemTiers.length > 0 && proposal.status !== 'Approved' ? (() => {
             const isCartComplete = Object.keys(localSelections).length === proposal_data.systemTiers.length;
             
             const handleFinalize = () => {
                 let totalSalesPrice = 0;
                 let totalTons = 0;
                 const combinedFeatures = [];
                 const systemsList = [];
                 
                 proposal_data.systemTiers.forEach(sys => {
                     const tierName = localSelections[sys.systemId];
                     const td = sys.tiers[tierName.toLowerCase()];
                     if (td) {
                         totalSalesPrice += td.salesPrice || 0;
                         totalTons += td.tons || 0;
                         combinedFeatures.push(`[${sys.systemName}]: ${td.brand} ${td.series} (${tierName} Tier)`);
                         if (td.features) {
                             td.features.forEach(f => { if (!combinedFeatures.includes(f)) combinedFeatures.push(f); });
                         }
                         systemsList.push({
                             systemName: sys.systemName,
                             tierName: tierName,
                             tierData: td
                         });
                     }
                 });
                 
                 const combinedData = {
                     salesPrice: totalSalesPrice,
                     tons: totalTons,
                     brand: 'Multi-System',
                     series: 'Configuration',
                     features: combinedFeatures,
                     systemsList: systemsList
                 };
                 
                 onAccept && onAccept('Custom Network', combinedData, proposal);
             };

             return (
                 <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-xs font-bold text-slate-500 bg-slate-200/50 px-4 py-2 rounded-lg flex items-center">
                        <AlertTriangle size={14} className="text-amber-500 mr-2 flex-shrink-0" />
                        Please select an equipment tier for all units above.
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors rounded" onClick={onClose}>Close Planner</button>
                        <button 
                           disabled={!isCartComplete} 
                           onClick={handleFinalize}
                           className={`px-6 py-2.5 font-bold rounded shadow-sm transition-all focus:ring-2 focus:ring-offset-1 outline-none ${isCartComplete ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-600' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
                        >
                           {isCartComplete ? 'Accept Configuration Package' : 'Select All Options'}
                        </button>
                    </div>
                 </div>
             );
          })() : (
             <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors" onClick={onClose}>Close Viewer</button>
             </div>
          )}
       </div>
    </div>
  );
}
