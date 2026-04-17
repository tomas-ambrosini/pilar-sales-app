import sys

with open('src/components/ProposalWizard.jsx', 'r') as f:
    text = f.read()

state_injection = "  const [activeStep5Track, setActiveStep5Track] = useState({});"
if "activeStep5Track" not in text:
    text = text.replace("  const [activeSystemId, setActiveSystemId] = useState(1);", f"  const [activeSystemId, setActiveSystemId] = useState(1);\n{state_injection}")

# Replace the Step 5 UI
target_old = """                           {[
                              { title: 'Primary Brand Options', tiers: sys.selectedTiers, active: sys.selectedTiers.best || sys.selectedTiers.better || sys.selectedTiers.good },
                              ...(sys.alternateTracks || []).map((t, idx) => ({ title: `Comparison Track ${idx + 1}`, tiers: t.tiers, active: t.tiers?.best || t.tiers?.better || t.tiers?.good }))
                           ].map((track, trackIdx) => {
                              if (!track.active) return null;
                              return (
                                 <div key={trackIdx} className={`mb-8 last:mb-0 ${trackIdx === 1 ? 'bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100' : ''}`}>
                                     {trackIdx === 1 && <h5 className="font-bold text-sm uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2"><Layers size={16}/> {track.title}</h5>}
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[ {k: 'good', l: 'Baseline (Good)', m: margins.good_margin}, {k: 'better', l: 'Core (Better)', m: margins.better_margin}, {k: 'best', l: 'Premium (Best)', m: margins.best_margin} ].map(tier => {"""

target_new = """                           {(() => {
                              const allTracks = [
                                 { id: 'primary', title: 'Option 1', tiers: sys.selectedTiers, active: sys.selectedTiers.best || sys.selectedTiers.better || sys.selectedTiers.good },
                                 ...(sys.alternateTracks || []).map((t, idx) => ({ id: t.id, title: `Option ${idx + 2}`, tiers: t.tiers, active: t.tiers?.best || t.tiers?.better || t.tiers?.good }))
                              ].filter(t => t.active);
                              
                              if (allTracks.length === 0) return null;
                              
                              const activeIdx = activeStep5Track[sys.id] || 0;
                              const track = allTracks[activeIdx] || allTracks[0];
                              const showBrandToggle = allTracks.length > 1;

                              return (
                                 <div className="mb-8 last:mb-0">
                                     {showBrandToggle && (
                                         <div className="flex bg-slate-200 rounded-lg p-1 w-max overflow-x-auto mb-6">
                                            {allTracks.map((trk, idx) => (
                                               <button key={trk.id} onClick={() => setActiveStep5Track(prev => ({...prev, [sys.id]: idx}))} className={`px-4 py-1.5 text-[11px] whitespace-nowrap font-black uppercase tracking-wider rounded-md transition-colors shadow-sm ${activeIdx === idx ? 'bg-white text-slate-800' : 'text-slate-500 hover:text-slate-700 bg-transparent shadow-none'}`}>
                                                  {trk.title}
                                               </button>
                                            ))}
                                         </div>
                                     )}
                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {[ {k: 'good', l: 'Baseline (Good)', m: margins.good_margin}, {k: 'better', l: 'Core (Better)', m: margins.better_margin}, {k: 'best', l: 'Premium (Best)', m: margins.best_margin} ].map(tier => {"""

text = text.replace(target_old, target_new)


# Fix the nested loop closure
closing_old = """                                                 </div>
                                              </div>
                                           </div>
                                           );
                                        })}
                                     </div>
                                 </div>
                              );
                           })}"""

closing_new = """                                                 </div>
                                              </div>
                                           </div>
                                           );
                                        })}
                                     </div>
                                 </div>
                              );
                           })()}"""
text = text.replace(closing_old, closing_new)


# Fix removing suggested
suggested_old = """                                           <div key={tier.k} className={`relative bg-white border rounded-2xl shadow-lg flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 ${trackIdx > 0 ? 'border-indigo-200' : 'border-slate-200'} text-slate-800 ${tier.k === 'best' ? 'border-primary-500' : ''}`}>
                                              {tier.k === 'best' && (
                                                 <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${trackIdx > 0 ? 'bg-indigo-500' : 'bg-primary-500'} text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm`}>
                                                     Suggested
                                                 </div>
                                              )}
                                              <div className={`${trackIdx > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'} rounded-t-[14px] py-4 px-4 border-b text-center pt-6`}>
                                                 <h4 className={`font-black text-lg tracking-widest uppercase ${trackIdx > 0 ? 'text-indigo-900' : 'text-slate-800'}`}>{tier.l.split('(')[0].trim()}</h4>
                                                 <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 block ${trackIdx > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>Selected Tier</span>
                                              </div>"""

suggested_new = """                                           <div key={tier.k} className={`relative bg-white border border-slate-200 rounded-2xl shadow-lg flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 text-slate-800`}>
                                              <div className="bg-slate-50 border-slate-200 rounded-t-[14px] py-4 px-4 border-b text-center pt-6">
                                                 <h4 className="font-black text-lg tracking-widest uppercase text-slate-800">{tier.l.split('(')[0].trim()}</h4>
                                                 <span className="text-[10px] font-bold uppercase tracking-widest mt-1 block text-slate-400">Selected Tier</span>
                                              </div>"""
text = text.replace(suggested_old, suggested_new)

# Fix removing suggested when there is no `tier.k === 'best'` block natively existing because of previous script modifications? Wait. I'll let python replace the generic trackIdx variables below too!
text = text.replace("trackIdx > 0 ? 'border-indigo-200' : 'border-slate-200'", "'border-slate-200'")
text = text.replace("trackIdx === 1 ? 'text-indigo-900' : 'text-slate-800'", "'text-slate-800'")
text = text.replace("trackIdx > 0 ? 'text-indigo-900' : 'text-slate-800'", "'text-slate-800'")
text = text.replace("trackIdx === 1 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'", "'bg-slate-50 border-slate-200'")
text = text.replace("trackIdx > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'", "'bg-slate-50 border-slate-200'")
text = text.replace("trackIdx > 0 ? 'text-indigo-400' : 'text-slate-400'", "'text-slate-400'")


with open('src/components/ProposalWizard.jsx', 'w') as f:
    f.write(text)
