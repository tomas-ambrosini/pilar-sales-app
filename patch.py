with open("src/components/ProposalWizard.jsx", "r") as f:
    orig = f.read()

target = """                 <div className="flex flex-col gap-2 max-w-[350px]">
                    {!appliedPromo ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3 w-full max-w-sm">
                        <div className="flex-1 w-full relative">
                          <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 font-mono uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 shadow-sm transition-all text-sm" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="ENTER PROMO CODE" onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}/>
                          {promoError && <p className="absolute -bottom-5 left-1 text-[10px] text-red-500 font-bold">{promoError}</p>}
                        </div>
                        <button onClick={handleApplyPromo} disabled={validatingPromo} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-colors w-full sm:w-auto shrink-0 flex-none self-stretch flex items-center justify-center">
                          {validatingPromo ? 'Validating...' : 'Apply'}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center w-full">
                         <div>
                           <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-0.5">Applied Promo</p>
                           <p className="font-mono font-black text-emerald-600 text-lg flex items-center gap-2"><Tag size={16}/> {appliedPromo.code} <span className="text-emerald-500 text-sm ml-1">({appliedPromo.discount_percent}%)</span></p>
                         </div>
                         <button onClick={() => setAppliedPromo(null)} className="text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 p-2 rounded-lg transition-colors border border-transparent hover:border-emerald-300 shadow-sm ml-4">
                           <X size={16} />
                         </button>
                      </div>
                    )}
                 </div>"""

replacement = """                 <div className="flex flex-col gap-2 max-w-[450px]">
                    {!appliedPromo ? (
                      <div className="flex flex-col gap-3 mt-4 w-full bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="text-xs font-black tracking-widest uppercase text-slate-500">Secure Discount Code</label>
                        <div className="w-full flex">
                           <div className="flex-grow">
                             <input type="text" className="w-full bg-white border border-slate-300 rounded-l-lg px-4 font-mono uppercase text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-primary-500 shadow-sm" value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="PROMO CODE..." onKeyDown={e => e.key === 'Enter' && handleApplyPromo()} style={{ display: 'block', height: '48px' }}/>
                           </div>
                           <button onClick={handleApplyPromo} disabled={validatingPromo} className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold px-6 shadow-sm flex items-center justify-center transition-all whitespace-nowrap rounded-r-lg border border-primary-600" style={{ height: '48px', width: 'auto' }}>
                             {validatingPromo ? 'Wait...' : 'Verify'}
                           </button>
                        </div>
                        {promoError && <p className="text-xs text-red-500 font-bold">{promoError}</p>}
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex justify-between items-center w-full mt-2">
                         <div>
                           <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-0.5">Applied Promo</p>
                           <p className="font-mono font-black text-emerald-600 text-lg flex items-center gap-2"><Tag size={16}/> {appliedPromo.code} <span className="text-emerald-500 text-sm ml-1">({appliedPromo.discount_percent}%)</span></p>
                         </div>
                         <button onClick={() => setAppliedPromo(null)} className="text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 p-2 rounded-lg transition-colors border border-transparent hover:border-emerald-300 shadow-sm ml-4">
                           <X size={16} />
                         </button>
                      </div>
                    )}
                 </div>"""

new_content = orig.replace(target, replacement)

with open("src/components/ProposalWizard.jsx", "w") as f:
    f.write(new_content)
print("done")
