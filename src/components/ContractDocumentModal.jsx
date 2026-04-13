import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ShieldCheck, Pen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomers } from '../context/CustomerContext';
import { formatQuoteId } from '../utils/formatters';
import './ContractDocumentModal.css';

export default function ContractDocumentModal({ isOpen, onClose, contractData }) {
   const { customers } = useCustomers();

   let { proposal, tierName, tierData, date } = contractData || {};
   
   if (!date) {
       date = proposal?.updated_at || proposal?.created_at 
          ? new Date(proposal.updated_at || proposal.created_at).toLocaleDateString() 
          : new Date().toLocaleDateString();
   }
   // Hydrate full customer profile (supporting both modern ID links and legacy string-based mapping)
   const fullCustomer = customers.find(c => 
       (proposal?.customer_id && c.id === proposal.customer_id) || 
       c.name === proposal?.customer
   ) || {};

   const handlePrint = () => {
      window.print();
   };

   return createPortal(
      <AnimatePresence>
         {isOpen && contractData && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all duration-300 print:static print:block print:inset-auto opacity-100 pointer-events-auto">
         {/* Print Backdrop */}
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>
         
         {/* Top Action Bar (Hidden on print) */}
         <div className="action-bar absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 print:hidden bg-slate-900/80 backdrop-blur border-b border-slate-700 shadow-xl">
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
         <motion.div 
            initial={{ scale: 0.95, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="printable-contract relative bg-white shadow-2xl overflow-y-auto w-full max-w-[850px] mx-auto flex flex-col print:block mt-24 mb-12 shrink max-h-[calc(100vh-140px)] print:max-h-none print:m-0 text-slate-800 text-[11px] leading-relaxed"
         >
            {/* Page padding */}
            <div className="p-8">
            
                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 text-slate-800" title={proposal?.proposal_number ? `Legacy ID: ${proposal?.id}` : ''}>Quote # <span className="font-normal text-slate-600 underline decoration-slate-300 underline-offset-4">{formatQuoteId(proposal).replace('Quote ', '').replace('#', '')}</span></h1>
                        <div className="flex gap-4 mt-4 font-bold text-slate-700">
                            <span>Quote #: <span className="border-b border-slate-300 font-normal px-4 text-slate-600 truncate max-w-[250px] inline-block align-bottom">{formatQuoteId(proposal).replace('Quote ', '').replace('#', '')}</span></span>
                            <span>Date: <span className="border-b border-slate-300 font-normal px-4 text-slate-600">{date}</span></span>
                        </div>
                    </div>
                    <div className="text-right flex items-center justify-end">
                         <div className="text-primary-600 font-black text-2xl flex items-center gap-1 tracking-tighter">
                              <span className="text-3xl relative -top-1">^</span> PILAR HOME
                         </div>
                    </div>
                </div>

                {/* Customer / Company Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Customer Box */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <div className="bg-[#e2e8f0] text-slate-700 font-bold px-3 py-1.5 border-b border-slate-300">Customer Info</div>
                        <div className="p-3 bg-[#f8fafc] flex flex-col gap-2">
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Name:</span> <span className="font-semibold text-slate-800">{proposal.customer}</span>
                            </div>
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Address:</span> <span className="text-slate-600">{fullCustomer.address || '(Digital Record)'}</span>
                            </div>
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Phone:</span> <span className="text-slate-600">{fullCustomer.phone || ''}</span>
                            </div>
                            <div className="flex pb-1">
                                <span className="w-16 text-slate-500">Email:</span> <span className="text-slate-600">{fullCustomer.email || ''}</span>
                            </div>
                        </div>
                    </div>

                    {/* Company Box */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                        <div className="bg-[#e2e8f0] text-slate-700 font-bold px-3 py-1.5 border-b border-slate-300">Company Info</div>
                        <div className="p-3 bg-[#f8fafc] flex flex-col gap-2">
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="font-bold text-slate-800">Pilar Home Services Inc.</span>
                            </div>
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Address:</span> <span className="text-slate-600">123 Corporate Blvd, Ste 100</span>
                            </div>
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Phone:</span> <span className="text-slate-600">Miami, FL 33132</span>
                            </div>
                            <div className="flex pb-1">
                                <span className="w-16 text-slate-500">Email:</span> <span className="text-slate-600">Lic #CAC18192348</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unit Info Box */}
                {(tierData?.systemsList && tierData.systemsList.length > 0) ? (
                    tierData.systemsList.map((sys, idx) => (
                        <div key={idx} className="border border-slate-300 rounded overflow-hidden mb-4">
                            <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                <div className="flex-1 px-3 py-1.5 border-r border-slate-300">{sys.systemName} - Unit Info</div>
                                <div className="w-32 px-3 py-1.5 text-center">Price</div>
                            </div>
                            <div className="flex bg-[#f8fafc]">
                                <div className="flex-1 p-3 flex">
                                    <div className="flex-1 flex flex-col justify-between pr-4">
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Model:</span> <span className="font-bold text-slate-800">{sys.tierName} Package</span>
                                        </div>
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Serial:</span> <span></span>
                                        </div>
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Efficiency:</span> <span className="text-slate-600">Standard Ratings</span>
                                        </div>
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Brand:</span> <span className="text-slate-600">{sys.tierData?.brand} {sys.tierData?.series}</span>
                                        </div>
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Dimensions:</span> <span className="text-slate-600">{sys.tierData?.tons} Ton System</span>
                                        </div>
                                        <div className="flex pb-1">
                                            <span className="w-20 text-slate-500">Type of Unit:</span> <span className="text-slate-600">System Replacement</span>
                                        </div>
                                    </div>
                                    <div className="w-40 border border-slate-300 bg-[#e2e8f0]/40 flex items-center justify-center text-slate-400 font-bold tracking-widest rounded mx-2 my-1">
                                        PHOTO
                                    </div>
                                </div>
                                <div className="w-32 border-l border-slate-300 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                    <div className="px-3 flex items-center text-slate-500 gap-1 font-bold">
                                        $ <span className="flex-1 border-b border-slate-400 text-slate-800 text-right pr-2">{(sys.tierData?.salesPrice || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="border border-slate-300 rounded overflow-hidden mb-4">
                        <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                            <div className="flex-1 px-3 py-1.5 border-r border-slate-300">Unit Info</div>
                            <div className="w-32 px-3 py-1.5 text-center">Price</div>
                        </div>
                        <div className="flex bg-[#f8fafc]">
                            <div className="flex-1 p-3 flex">
                                <div className="flex-1 flex flex-col justify-between pr-4">
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Model:</span> <span className="font-bold text-slate-800">{tierName} Package</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Serial:</span> <span></span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Efficiency:</span> <span className="text-slate-600">Standard Ratings</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Brand:</span> <span className="text-slate-600">{tierData?.brand} {tierData?.series}</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Dimensions:</span> <span className="text-slate-600">{tierData?.tons} Ton System</span>
                                    </div>
                                    <div className="flex pb-1">
                                        <span className="w-20 text-slate-500">Type of Unit:</span> <span className="text-slate-600">System Replacement</span>
                                    </div>
                                </div>
                                {/* Photo Placeholder */}
                                <div className="w-40 border border-slate-300 bg-[#e2e8f0]/40 flex items-center justify-center text-slate-400 font-bold tracking-widest rounded mx-2 my-1">
                                    PHOTO
                                </div>
                            </div>
                            <div className="w-32 border-l border-slate-300 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                <div className="px-3 flex items-center text-slate-500 gap-1 font-bold">
                                    $ <span className="flex-1 border-b border-slate-400 text-slate-800 text-right pr-2">{(tierData?.salesPrice || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Materials & Labor */}
                <div className="border border-slate-300 rounded overflow-hidden mb-4">
                     <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                        <div className="flex-1 px-3 py-1.5 border-r border-slate-300">Materials & Labor / Subs needed</div>
                        <div className="w-32 px-3 py-1.5 text-center">Price</div>
                    </div>
                    <div className="flex flex-col bg-[#f8fafc]">
                         {[...(tierData.features || []), 'Removal / Disposal', 'Refrigerant', 'Permitting']
                          .slice(0, 4)
                          .map((f, i) => (
                            <div key={i} className="flex border-b border-slate-200">
                                 <div className="flex-1 px-3 py-2 border-r border-slate-300 flex items-center gap-2 text-slate-600">
                                     <div className="w-1 h-1 bg-slate-500 rounded-full shrink-0"></div>
                                     {f}
                                 </div>
                                 <div className="w-32 px-3 py-2 flex items-center justify-start gap-1 font-bold text-slate-500">
                                     $ <span className="flex-1 border-b border-slate-300"></span>
                                 </div>
                            </div>
                         ))}
                         
                         {/* Total Row */}
                         <div className="flex font-bold text-slate-800">
                              <div className="flex-1 px-3 py-2 border-r border-slate-300 text-right uppercase text-[10px] tracking-wider text-slate-600">Total:</div>
                              <div className="w-32 px-3 py-2 flex items-center justify-start gap-1 bg-[#e2e8f0]/30 border-t border-slate-300">
                                  $ <span className="flex-1 border-b border-transparent">{(tierData.salesPrice || 0).toLocaleString()}</span>
                              </div>
                         </div>
                    </div>
                </div>

                {/* Exclusions / Legal */}
                <div className="font-bold text-slate-800 mb-2 mt-4 px-1">Exclusions / Legal:</div>
                <div className="flex border-b border-slate-200 pb-1 mb-1 text-[9px] text-slate-500">
                    <span className="w-2 text-center mr-1">•</span> <span className="flex-1">STANDARD WARRANTY: Pilar Services Inc. provides a 1-year comprehensive labor warranty on all new installations. Liability for circumstantial property damage due to pre-existing conditions is expressly waived.</span>
                </div>
                <div className="flex border-b border-slate-200 pb-1 mb-1 text-[9px] text-slate-500">
                    <span className="w-2 text-center mr-1">•</span> <span className="flex-1">EPA COMPLIANCE: All refrigerant handling strictly follows Section 608 of the Clean Air Act. Equipment sizing is based on Manual J calculations standard to Florida Building Code.</span>
                </div>
                <div className="flex border-b border-slate-200 pb-1 mb-1 text-[9px] text-slate-500 items-end">
                   <div className="flex flex-1">
                      <span className="w-2 text-center mr-1">•</span> <span className="flex-1">AUTHORIZATION: By digital acceptance, the authorizing party represents authority to contract improvements on the specified property. A mechanic's lien may be executed for failure to remit final payment.</span>
                   </div>
                   <div className="w-48 text-right font-bold text-[12px] text-slate-800 shrink-0 ml-4 pb-1 flex flex-col justify-end">
                       {proposal?.applied_promo_code && (
                           <div className="text-[10px] text-emerald-600 mb-0.5">
                              Promo: {proposal.applied_promo_code} (-{proposal.applied_discount_percent}%)
                           </div>
                       )}
                       <div>Total Price: ${(tierData.salesPrice || 0).toLocaleString()}</div>
                   </div>
                </div>

                {/* Signatures */}
                <div className="border border-slate-300 rounded overflow-hidden mt-6 bg-white">
                    {/* Header Row */}
                    <div className="grid grid-cols-2 bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                        <div className="px-3 py-1.5 border-r border-slate-300">Company Signature</div>
                        <div className="px-3 py-1.5">Client Signature</div>
                    </div>

                    {/* Signature Area Row */}
                    <div className="grid grid-cols-2 border-b border-slate-300 bg-[#f8fafc]">
                        {/* Company Signature Cell */}
                        <div className="h-32 border-r border-slate-300 relative flex items-center justify-center p-4 overflow-hidden">
                           <span className="font-[cursive] text-4xl text-slate-800 opacity-20 transform -rotate-[5deg] select-none">Pilar Home Services</span>
                        </div>
                        
                        {/* Client Signature Cell */}
                        <div className="h-32 relative flex items-center justify-center p-4">
                           {(proposal.proposal_data?.signature_data || proposal.signature_data) ? (
                               <img src={proposal.proposal_data?.signature_data || proposal.signature_data} alt="Customer Signature" className="h-24 w-full object-contain mix-blend-multiply"/>
                           ) : (
                               <div className="text-emerald-600 font-bold bg-emerald-50 px-3 rounded border border-emerald-200 text-xs py-1.5 flex items-center gap-1"><Pen size={12}/> Legally Binding E-Signature</div>
                           )}
                        </div>
                    </div>

                    {/* Date Block Row */}
                    <div className="grid grid-cols-2 bg-white">
                        {/* Company Date Cell */}
                        <div className="px-4 py-3 border-r border-slate-300 flex items-end gap-2">
                             <span className="font-bold text-slate-700 text-sm">Date:</span>
                             <span className="flex-1 border-b border-slate-400 text-center font-bold text-slate-800 text-sm px-2 pb-0.5">
                                  {proposal.status === 'Approved' ? new Date(proposal.updated_at || proposal.created_at).toLocaleDateString() : ''}
                             </span>
                        </div>
                        {/* Client Date Cell */}
                        <div className="px-4 py-3 flex items-end gap-2">
                             <span className="font-bold text-slate-700 text-sm">Date:</span>
                             <span className="flex-1 border-b border-slate-400 text-center font-bold text-slate-800 text-sm px-2 pb-0.5">
                                  {(proposal.proposal_data?.signature_data || proposal.signature_data) ? new Date(proposal.updated_at || proposal.created_at).toLocaleDateString() : ''}
                             </span>
                        </div>
                    </div>
                </div>

            </div>
         </motion.div>
            </motion.div>
         )}
      </AnimatePresence>,
      document.body
   );
}
