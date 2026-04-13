with open("src/components/ProposalWizard.jsx", "r") as f:
    orig = f.read()

import re

target = re.compile(r'<div className="mb-6 flex flex-col gap-2 bg-white border border-primary-200 rounded-lg p-4 shadow-sm">.*?</div>\n             </div>', re.DOTALL)

replacement = """<div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
               <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                  <Tag size={120} />
               </div>

               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-md">
                     <h4 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-1">Global Organization Discount</h4>
                     <p className="text-sm text-slate-500 font-medium">Apply a pre-authorized CRM promo code to intelligently distribute a global margin discount across all tiers.</p>
                  </div>

                  <div className="flex-1 w-full max-w-[400px]">
                     {!appliedPromo ? (
                        <div className="flex flex-col gap-1 w-full relative">
                           <div className="flex shadow-sm rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/30 transition-all border border-slate-300 focus-within:border-primary-500 bg-white">
                             <div className="pl-4 flex items-center justify-center bg-white text-slate-400">
                               <Tag size={18} />
                             </div>
                             <input 
                               type="text" 
                               className="w-full bg-white px-3 py-3 font-mono uppercase text-slate-800 font-bold placeholder:text-slate-300 placeholder:font-medium focus:outline-none" 
                               value={promoInput} 
                               onChange={e => setPromoInput(e.target.value.toUpperCase())} 
                               placeholder="ENTER CODE..." 
                               onKeyDown={e => e.key === 'Enter' && handleApplyPromo()} 
                               style={{ minHeight: '48px' }}
                             />
                             <button 
                               onClick={handleApplyPromo} 
                               disabled={validatingPromo} 
                               className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white font-bold px-6 flex items-center justify-center transition-colors whitespace-nowrap"
                               style={{ minHeight: '48px' }}
                             >
                               {validatingPromo ? '...' : 'Apply Premium'}
                             </button>
                           </div>
                           {promoError && <p className="text-[10px] text-red-500 font-bold ml-1 flex items-center gap-1 mt-1 pb-1 absolute -bottom-5"><AlertTriangle size={10}/> {promoError}</p>}
                        </div>
                     ) : (
                        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-0.5 shadow-sm transform transition-all hover:scale-[1.01]">
                           <div className="bg-emerald-50 rounded-[10px] p-3 flex justify-between items-center w-full">
                              <div>
                                 <div className="flex items-center gap-1.5 mb-0.5">
                                    <Check className="text-emerald-500" size={16}/>
                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Active Application</p>
                                 </div>
                                 <p className="font-mono font-black text-emerald-600 text-xl flex items-center gap-2">
                                     {appliedPromo.code} 
                                     <span className="bg-emerald-200 text-emerald-900 font-bold tracking-tight text-xs px-2 py-0.5 rounded-full ml-1">-{appliedPromo.discount_percent}% global</span>
                                 </p>
                              </div>
                              <button onClick={() => setAppliedPromo(null)} className="text-emerald-700 hover:text-white bg-emerald-100 hover:bg-emerald-500 p-2.5 rounded-lg transition-colors shadow-sm ml-4 border border-transparent">
                                 <RefreshCcw size={18} />
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>"""

new_content = orig.replace(target.search(orig).group(0), replacement)

with open("src/components/ProposalWizard.jsx", "w") as f:
    f.write(new_content)
print("done")
