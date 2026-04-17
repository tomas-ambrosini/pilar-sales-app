import React from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Shield, Wind, Droplets, ArrowRight, FileText, AlertTriangle, ArrowLeft } from 'lucide-react';
import Modal from './Modal';
import { formatQuoteId } from '../utils/formatters';

export default function ProposalViewerModal({ isOpen, onClose, onBack, proposal, onAccept, onViewContract }) {
  const [localSelections, setLocalSelections] = React.useState({});

  React.useEffect(() => {
     if (!isOpen) {
         setLocalSelections({});
     }
  }, [isOpen, proposal?.id]);

  if (!proposal) return null;

  const { proposal_data } = proposal;

const TierCard = ({ tierName, tierKey, tracks, isBest, systemId, proposal, localSelections, setLocalSelections, onAccept, onViewContract }) => {
    const validTracks = tracks ? tracks.filter(t => t.data) : [];
    if (validTracks.length === 0) return null;
    
    // Multi-System Logic Check
    const isMultiSys = systemId !== null;
    const currentSelection = localSelections[systemId]; // e.g., 'Primary_Best', 'Track0_Best', 'None'
    
    // Active Toggle State
    const [focusedTrackId, setFocusedTrackId] = React.useState(validTracks[0].id);
    const activeData = validTracks.find(t => t.id === focusedTrackId)?.data || validTracks[0].data;
    
    // If the system is approved/old-school, we don't have toggles
    const showBrandToggle = validTracks.length > 1;

    const isSelected = isMultiSys && currentSelection === `${focusedTrackId}_${tierKey}`;
    
    const borderClass = isMultiSys 
         ? (isSelected ? 'border-primary-400 ring-4 ring-primary-500/10 bg-gradient-to-b from-white to-primary-50/20 scale-[102%] shadow-2xl z-20' : 'border-slate-200/60 bg-white hover:border-slate-300 hover:shadow-lg')
         : (isBest ? 'border-primary-400 shadow-2xl bg-gradient-to-b from-white to-primary-50/20 scale-105 z-10' : 'border-slate-200/60 bg-white shadow-md');

    return (
       <div className={`relative flex flex-col p-7 rounded-2xl border-2 transition-all duration-300 ease-out ${borderClass}`}>
          {((isBest && !isMultiSys) || (isMultiSys && tierKey === 'Best')) && (
             <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md border border-emerald-400/50">
                 Suggested
             </div>
          )}
          
          <div className="flex flex-col gap-3 mb-6">
              <h3 className="text-[22px] font-black text-slate-800 uppercase tracking-tight">{tierName}</h3>
              
              {showBrandToggle && (
                  <div className="flex bg-slate-100/80 rounded-xl p-1 w-full flex-wrap gap-1 border border-slate-200/60 shadow-inner">
                     {validTracks.map((trk) => (
                        <button 
                           key={trk.id} 
                           onClick={(e) => { e.stopPropagation(); setFocusedTrackId(trk.id); }} 
                           className={`flex-1 px-2 py-2 text-[10px] whitespace-nowrap font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${focusedTrackId === trk.id ? 'bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] text-primary-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                        >
                           {trk.title}
                        </button>
                     ))}
                  </div>
              )}
          </div>
          
          <div className="my-2 pb-6 border-b border-slate-100">
             <div className="flex items-start text-slate-900">
                <span className="text-xl font-bold mt-1.5 mr-0.5 text-slate-400">$</span>
                <span className="text-5xl font-black tracking-tighter">{(activeData?.salesPrice || 0).toLocaleString()}</span>
             </div>
             <p className="text-[11px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Fully Installed Price</p>
          </div>
          
          <div className="flex-grow space-y-6 mb-6 mt-4">
             <div>
                <p className="text-[10px] font-black text-primary-400/80 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary-400"></div>Equipment Package</p>
                {activeData?.equipmentList && activeData.equipmentList.length > 0 ? (
                   <div className="space-y-1">
                      {activeData.equipmentList.map((eq, i) => (
                          <p key={i} className="text-[15px] font-bold text-slate-800 leading-tight">{eq}</p>
                      ))}
                      <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/60 rounded text-[10px] font-black tracking-widest uppercase mt-2">Total: {activeData.tons} Tons</div>
                   </div>
                ) : (
                   <>
                      <p className="font-bold text-[15px] text-slate-800 leading-tight">{activeData?.brand} {activeData?.series}</p>
                      <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200/60 rounded text-[10px] font-black tracking-widest uppercase mt-2">{activeData?.tons} Ton System</div>
                   </>
                )}
             </div>
             
             <div>
                <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mb-3 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Included Features</p>
                <ul className="space-y-2.5">
                   {(activeData?.features || []).map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-600 font-medium">
                         <div className="mt-[2px] bg-emerald-100 rounded-full p-0.5 shrink-0">
                            <CheckCircle size={12} className="text-emerald-600" />
                         </div>
                         <span className="leading-snug">{feat}</span>
                      </li>
                   ))}
                </ul>
             </div>
          </div>
          
          {!proposal?.isReadOnly && (
              <div className="mt-auto pt-4">
                 {isMultiSys ? (
                      <button 
                         onClick={(e) => { e.stopPropagation(); setLocalSelections(p => ({...p, [systemId]: `${focusedTrackId}_${tierKey}`})); }}
                         className={`w-full py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 tracking-widest text-[11px] uppercase shadow-sm ${isSelected ? 'bg-primary-600 text-white hover:bg-primary-700 ring-4 ring-primary-500/20' : 'bg-slate-100/80 border border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300 hover:text-slate-800'}`}
                      >
                         {isSelected ? <><CheckCircle size={14}/> Option Selected</> : `Select ${tierName.split('(')[0].trim()}`}
                      </button>
                 ) : proposal.status !== 'Approved' ? (
                     <button 
                        disabled={proposal.isReadOnly}
                        onClick={(e) => { e.stopPropagation(); !proposal.isReadOnly && onAccept && onAccept(tierKey, activeData, proposal); }}
                        className={`w-full py-3.5 rounded-xl font-black transition-all flex items-center justify-center gap-2 tracking-widest text-[11px] uppercase shadow-sm ${proposal.isReadOnly ? 'bg-slate-100/50 text-slate-300 border border-slate-200/50 cursor-not-allowed' : isBest ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-500/20 ring-1 ring-primary-600' : 'bg-slate-100/80 border border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300 hover:text-slate-800 hover:shadow-md'}`}
                     >
                        {proposal.isReadOnly ? 'Preview Only' : `Select ${tierName.split('(')[0].trim()}`}
                     </button>
                 ) : (
                     <button 
                        onClick={(e) => { e.stopPropagation(); onViewContract && onViewContract(proposal); }} 
                        className={`w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 tracking-widest text-[11px] uppercase transition-all ${isBest ? 'bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/50 shadow-xl shadow-emerald-500/20 text-white text-sm scale-[102%]' : 'bg-emerald-50 border border-emerald-200/60 text-emerald-600 hover:bg-emerald-100'}`}
                     >
                        <FileText size={16}/> View Contract
                     </button>
                 )}
              </div>
          )}
       </div>
    );
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center modal-layout-wrapper transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
       {/* Backdrop */}
       <div className="absolute -inset-10 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
       
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
             <div className="flex items-center gap-2">
                {onBack && (
                   <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full border border-slate-200 transition-colors" title="Back to Details">
                      <ArrowLeft size={20} />
                   </button>
                )}
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 bg-white rounded-full border border-slate-200 transition-colors" title="Close Viewer">
                   <X size={20} />
                </button>
             </div>
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
                            {(() => {
                                const buildTracks = (key) => {
                                    const tracks = [];
                                    if (sys.tiers?.[key] || sys.tiers?.[key.charAt(0).toUpperCase() + key.slice(1)]) {
                                        tracks.push({ id: 'Primary', title: 'Option 1', data: sys.tiers[key] || sys.tiers[key.charAt(0).toUpperCase() + key.slice(1)] });
                                    }
                                    if (sys.altTracks && sys.altTracks.length > 0) {
                                        sys.altTracks.forEach((t, i) => {
                                            if (t.tiers?.[key]) {
                                                 tracks.push({ id: `Track${i}`, title: `Option ${i + 2}`, data: t.tiers[key] });
                                            } else {
                                                 tracks.push({ id: `Track${i}Err`, title: `Option ${i + 2} (ERR)`, data: { salesPrice: 0, brand: 'Missing', series: 'No Equipment Selected', tons: 0, features: ['Please go back to WIZARD', 'and map equipment'] } });
                                            }
                                        });
                                    } else if (sys.altTiers?.[key]) {
                                        tracks.push({ id: 'Alt', title: 'Option 2', data: sys.altTiers[key] });
                                    }
                                    return tracks;
                                 };
                                return (
                                   <>
                                      <TierCard tierName="Baseline (Good)" tierKey="Good" tracks={buildTracks('good')} isBest={false} systemId={sys.systemId} proposal={proposal} localSelections={localSelections} setLocalSelections={setLocalSelections} onAccept={onAccept} onViewContract={onViewContract} />
                                      <TierCard tierName="Premium (Best)" tierKey="Best" tracks={buildTracks('best')} isBest={true} systemId={sys.systemId} proposal={proposal} localSelections={localSelections} setLocalSelections={setLocalSelections} onAccept={onAccept} onViewContract={onViewContract} />
                                      <TierCard tierName="Core (Better)" tierKey="Better" tracks={buildTracks('better')} isBest={false} systemId={sys.systemId} proposal={proposal} localSelections={localSelections} setLocalSelections={setLocalSelections} onAccept={onAccept} onViewContract={onViewContract} />
                                   </>
                                );
                            })()}
                         </div>
                         {!proposal?.isReadOnly && (
                            <div className="mt-8 flex justify-center">
                               <button 
                                  onClick={() => setLocalSelections(p => ({...p, [sys.systemId]: 'None'}))} 
                                  className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all border shadow-sm ${localSelections[sys.systemId] === 'None' ? 'bg-rose-500 text-white border-rose-500 ring-4 ring-rose-500/20' : 'bg-white text-rose-500 border-rose-200 hover:bg-rose-50 hover:border-rose-300'}`}
                               >
                                 {localSelections[sys.systemId] === 'None' ? <span className="flex items-center gap-2"><CheckCircle size={16}/> System Excluded</span> : `Decline ${sys.systemName} (Extract)`}
                               </button>
                            </div>
                         )}
                      </div>
                   ))}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-end max-w-5xl mx-auto pt-4 pb-8">
                   <TierCard tierName="Baseline (Good)" tierKey="Good" tracks={[{ id: 'Primary', title: 'Option 1', data: proposal_data.tiers?.good || proposal_data.tiers?.Good }]} isBest={false} systemId={null} proposal={proposal} localSelections={localSelections} setLocalSelections={setLocalSelections} onAccept={onAccept} onViewContract={onViewContract} />
                   <TierCard tierName="Premium (Best)" tierKey="Best" tracks={[{ id: 'Primary', title: 'Option 1', data: proposal_data.tiers?.best || proposal_data.tiers?.Best }]} isBest={true} systemId={null} proposal={proposal} localSelections={localSelections} setLocalSelections={setLocalSelections} onAccept={onAccept} onViewContract={onViewContract} />
                   <TierCard tierName="Core (Better)" tierKey="Better" tracks={[{ id: 'Primary', title: 'Option 1', data: proposal_data.tiers?.better || proposal_data.tiers?.Better }]} isBest={false} systemId={null} proposal={proposal} localSelections={localSelections} setLocalSelections={setLocalSelections} onAccept={onAccept} onViewContract={onViewContract} />
                </div>
             )}
          </div>
          
          {/* Footer Actions */}
          {proposal_data?.systemTiers && proposal_data.systemTiers.length > 0 && proposal.status !== 'Approved' ? (() => {
             const isCartComplete = Object.keys(localSelections).length === proposal_data.systemTiers.length &&
                                    Object.values(localSelections).some(v => v !== 'None');
             
             const handleFinalize = () => {
                 let totalSalesPrice = 0;
                 let totalTons = 0;
                 const combinedFeatures = [];
                 const systemsList = [];
                 
                 proposal_data.systemTiers.forEach(sys => {
                     const selection = localSelections[sys.systemId];
                     if (!selection || selection === 'None') return;
                     
                     const [brandOpt, tierStr] = selection.split('_');
                     let td = null;
                     if (brandOpt === 'Primary' && sys.tiers) td = sys.tiers[tierStr.toLowerCase()];
                     else if (brandOpt === 'Alt' && sys.altTiers) td = sys.altTiers[tierStr.toLowerCase()];
                     else if (brandOpt.startsWith('Track') && sys.altTracks) {
                         const trackIdx = parseInt(brandOpt.replace('Track', ''), 10);
                         if (sys.altTracks[trackIdx] && sys.altTracks[trackIdx].tiers) {
                             td = sys.altTracks[trackIdx].tiers[tierStr.toLowerCase()];
                         }
                     }
                     else if (brandOpt.startsWith('Track') && sys.altTracks) {
                         const trackIdx = parseInt(brandOpt.replace('Track', ''), 10);
                         if (sys.altTracks[trackIdx] && sys.altTracks[trackIdx].tiers) {
                             td = sys.altTracks[trackIdx].tiers[tierStr.toLowerCase()];
                         }
                     }
                     
                     if (td) {
                         totalSalesPrice += td.salesPrice || 0;
                         totalTons += td.tons || 0;
                         const cleanTierStr = tierStr.charAt(0).toUpperCase() + tierStr.slice(1);
                         combinedFeatures.push(`[${sys.systemName}]: ${td.brand} ${td.series} (${cleanTierStr} Tier)`);
                         if (td.features) {
                             td.features.forEach(f => { if (!combinedFeatures.includes(f)) combinedFeatures.push(f); });
                         }
                         systemsList.push({
                             systemName: sys.systemName,
                             tierName: cleanTierStr,
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

             if (proposal?.isReadOnly) {
                 return (
                     <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 items-center">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded mr-auto">
                            <AlertTriangle size={14}/> Preview Only Mode
                        </div>
                        <div className="flex gap-2">
                           {onBack && <button className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2" onClick={onBack}><ArrowLeft size={16}/> Back to Details</button>}
                           <button className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors" onClick={onClose}>Close Viewer</button>
                        </div>
                     </div>
                 );
             }

             return (
                 <div className="border border-slate-200/60 bg-white/80 shadow-lg backdrop-blur sticky bottom-0 z-50 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shrink-0 mt-8 rounded-xl">
                     <div className="flex items-center gap-3">
                         <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 font-black text-slate-600">
                                 {Object.keys(localSelections).length}
                             </div>
                             <span>/ {proposal_data.systemTiers.length} Systems Configured</span>
                         </div>
                     </div>
                     <div className="flex items-center gap-3 w-full sm:w-auto">
                         <button onClick={onClose} className="px-6 py-3 rounded-lg font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors bg-white border border-slate-200 w-full sm:w-auto text-sm shrink-0">Close</button>
                         <button 
                            disabled={!isCartComplete} 
                            onClick={handleFinalize}
                            className={`px-6 py-3 rounded-lg font-black tracking-widest uppercase text-xs transition-all shadow-md ${isCartComplete ? 'bg-primary-600 text-white hover:bg-primary-700 ring-1 ring-primary-500 hover:shadow-primary-500/20 hover:shadow-xl' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'}`}
                         >
                            {isCartComplete ? 'Accept Configuration Package' : 'Select a Tier for Each System'}
                         </button>
                     </div>
                 </div>
             );
          })() : (
             <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 items-center">
                {proposal?.isReadOnly && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded mr-auto">
                        <AlertTriangle size={14}/> Preview Only Mode
                    </div>
                )}
                <div className="flex gap-2">
                   {onBack && <button className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2" onClick={onBack}><ArrowLeft size={16}/> Back to Details</button>}
                   <button className="px-4 py-2 font-bold text-slate-500 hover:text-slate-800 transition-colors" onClick={onClose}>Close Viewer</button>
                </div>
             </div>
          )}
       </div>
    </div>
  , document.body) : null;
}
