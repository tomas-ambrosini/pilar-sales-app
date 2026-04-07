import React from 'react';
import { X, Printer, ShieldCheck, Pen } from 'lucide-react';
import './ContractDocumentModal.css';

export default function ContractDocumentModal({ isOpen, onClose, contractData }) {
   if (!isOpen || !contractData) return null;

   const { proposal, tierName, tierData, date } = contractData;

   const handlePrint = () => {
      window.print();
   };

   return (
      <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
         {/* Print Backdrop */}
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>
         
         {/* Top Action Bar (Hidden on print) */}
         <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 print:hidden bg-slate-900/80 backdrop-blur border-b border-slate-700 shadow-xl">
             <div className="text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" />
                <span className="font-bold tracking-widest text-sm uppercase">Official Contract Generated</span>
             </div>
             <div className="flex gap-4">
                 <button onClick={handlePrint} className="flex items-center gap-2 bg-white text-slate-900 hover:bg-primary-50 px-4 py-2 rounded font-bold text-sm shadow transition-colors">
                     <Printer size={16} /> Print / Save PDF
                 </button>
                 <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors">
                     <X size={20} />
                 </button>
             </div>
         </div>

         {/* The 8.5x11 Paper Container */}
         <div className="printable-contract relative bg-white shadow-2xl overflow-y-auto max-h-[85vh] mt-16 print:mt-0 print:max-h-max print:shadow-none print:w-full w-full max-w-[850px] mx-auto flex flex-col">
            
            {/* Header / Letterhead */}
            <div className="flex justify-between items-start border-b-4 border-slate-800 p-10 pb-6 mb-8">
                <div>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter margin-0 leading-none">Pilar Home</h1>
                   <h2 className="text-lg font-bold text-primary-600 uppercase tracking-widest mt-1">Services Inc.</h2>
                   <p className="text-xs text-slate-500 mt-2">123 Corporate Blvd, Ste 100<br/>Miami, FL 33132<br/>Lic #CAC18192348</p>
                </div>
                <div className="text-right">
                   <div className="text-3xl font-black text-slate-200 uppercase tracking-widest mb-2">Contract</div>
                   <p className="text-sm font-bold text-slate-800">Date: <span className="font-normal text-slate-600">{date}</span></p>
                   <p className="text-sm font-bold text-slate-800">Job Reference: <span className="font-normal text-slate-600">{proposal?.id || 'N/A'}</span></p>
                </div>
            </div>

            <div className="px-10 flex-1">
               {/* Client Info Grid */}
               <div className="flex gap-12 mb-10">
                   <div className="flex-1">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 border-b border-slate-200 pb-1">Billed To</h4>
                      <p className="font-bold text-slate-800 text-lg mb-1">{proposal.customer}</p>
                      <p className="text-sm text-slate-600 block w-48">Service Address strictly binds to customer profile. (Digital Record)</p>
                   </div>
                   <div className="flex-1">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 border-b border-slate-200 pb-1">Payment Mechanics</h4>
                      <p className="font-bold text-slate-800 text-sm">Due On Receipt</p>
                      <p className="text-sm text-slate-600">Balance required at Completion</p>
                   </div>
               </div>

               {/* Itemized Scope of Work */}
               <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 border-b border-slate-200 pb-1">Scope of Work: System Replacement</h4>
               
               <table className="w-full text-left mb-8">
                   <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                         <th className="py-2 px-3 font-bold">Description</th>
                         <th className="py-2 px-3 font-bold w-32">Qty</th>
                         <th className="py-2 px-3 font-bold text-right">Amount</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr className="border-b border-slate-100">
                         <td className="py-4 px-3">
                             <p className="font-bold text-slate-800 text-lg">{tierName} Package Installation</p>
                             <p className="text-sm text-slate-600 mt-1 font-semibold">{tierData.brand} {tierData.series} • {tierData.tons} Ton System</p>
                             <ul className="mt-2 pl-4 list-disc text-xs text-slate-500 space-y-1">
                                {(tierData.features || []).map((feat, i) => (
                                   <li key={i}>{feat}</li>
                                ))}
                                <li>Removal and eco-friendly disposal of existing split system</li>
                                <li>Refrigerant charging up to 15ft lineset factory specification</li>
                                <li>Permitting administrative fees (Municipal)</li>
                             </ul>
                         </td>
                         <td className="py-2 px-3 align-top font-bold text-slate-700 pt-4">1</td>
                         <td className="py-2 px-3 align-top text-right font-bold text-slate-800 pt-4">${(tierData.salesPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                   </tbody>
               </table>

               <div className="flex justify-end mb-12">
                   <div className="w-64">
                       <div className="flex justify-between py-2 border-b border-slate-200 text-sm font-bold text-slate-600">
                          <span>Subtotal</span>
                          <span>${(tierData.salesPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between py-2 border-b border-slate-200 text-sm font-bold text-slate-600">
                          <span>Tax (Exempt/Included)</span>
                          <span>$0.00</span>
                       </div>
                       <div className="flex justify-between py-3 text-2xl font-black text-slate-900">
                          <span>Total</span>
                          <span>${(tierData.salesPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                   </div>
               </div>

               {/* Legal & Warranty */}
               <div className="bg-slate-50 p-6 rounded text-[10px] text-slate-500 space-y-3 mb-12 leading-relaxed border border-slate-200">
                  <p><strong>STANDARD WARRANTY:</strong> Pilar Services Inc. provides a 1-year comprehensive labor warranty on all new installations. Manufacturer warranties apply (typically 10-year parts on registered equipment). Liability for circumstantial property damage due to pre-existing conditions (e.g., electrical faults, structural rot) is expressly waived.</p>
                  <p><strong>EPA COMPLIANCE:</strong> All refrigerant handling strictly follows Section 608 of the Clean Air Act. Equipment sizing is based on Manual J calculations standard to Florida Building Code.</p>
                  <p><strong>AUTHORIZATION:</strong> By digital acceptance, the authorizing party represents authority to contract improvements on the specified property. A mechanic's lien may be executed for failure to remit final payment.</p>
               </div>
               
               {/* Digital Signature Block */}
               <div className="flex justify-between items-end border-t border-slate-300 pt-10 pb-10">
                   <div className="flex-1 max-w-sm">
                      <div className="relative mb-2 h-20 flex items-end">
                         {proposal.signature_data ? (
                             <img src={proposal.signature_data} alt="Customer Signature" className="absolute bottom-0 left-0 h-24 w-auto object-contain mix-blend-multiply" />
                         ) : (
                             <>
                                <div className="absolute inset-0 flex items-center justify-center opacity-10 font-[cursive] text-4xl whitespace-nowrap overflow-hidden pointer-events-none text-slate-900 w-[200%] -ml-[50%]">
                                    {proposal.customer} {proposal.customer}
                                </div>
                                <div className="relative z-10 flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 w-fit px-3 py-1 rounded border border-emerald-200 mb-2">
                                   <Pen size={14} /> Legally Binding E-Signature
                                </div>
                             </>
                         )}
                      </div>
                      <div className="h-0.5 bg-slate-800 w-full mb-2"></div>
                      <p className="text-xs font-bold text-slate-800">Customer Authorization</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">IP: 104.28.192.1 • {new Date().toLocaleString()}</p>
                   </div>
                   
                   <div className="flex-1 max-w-sm text-right pl-12">
                      <div className="font-[cursive] text-3xl text-slate-800 opacity-60 mb-2">Pilar Home</div>
                      <div className="h-0.5 bg-slate-800 w-full mb-2"></div>
                      <p className="text-xs font-bold text-slate-800">Contractor Execution</p>
                   </div>
               </div>
            </div>
         </div>
      </div>
   );
}
