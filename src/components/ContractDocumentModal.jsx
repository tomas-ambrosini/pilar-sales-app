import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, ShieldCheck, Pen, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomers } from '../context/CustomerContext';
import { formatQuoteId } from '../utils/formatters';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getActiveContractTemplate } from '../utils/contracts/getActiveContractTemplate';
import { normalizeContractTemplate, DEFAULT_TEMPLATE_CONFIG } from '../utils/contracts/normalizeContractTemplate';
import './ContractDocumentModal.css';

export default function ContractDocumentModal({ isOpen, onClose, contractData }) {
   const { customers } = useCustomers();
   const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
   const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
   const [templateConfig, setTemplateConfig] = useState(DEFAULT_TEMPLATE_CONFIG);
   const pdfRef = useRef(null);

   React.useEffect(() => {
       if (!isOpen) return;

       let isMounted = true;
       setIsLoadingTemplate(true);

       // Safe fallback timeout
       const timeoutId = setTimeout(() => {
           if (isMounted && isLoadingTemplate) {
               console.warn("Template fetch timed out. Falling back to default configuration.");
               setTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
               setIsLoadingTemplate(false);
           }
       }, 5000);

       getActiveContractTemplate().then(rawTemplate => {
           if (isMounted) {
               setTemplateConfig(normalizeContractTemplate(rawTemplate));
               setIsLoadingTemplate(false);
               clearTimeout(timeoutId);
           }
       }).catch(err => {
           if (isMounted) {
               console.error("Error fetching template, relying on defaults:", err);
               setTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
               setIsLoadingTemplate(false);
               clearTimeout(timeoutId);
           }
       });

       return () => { 
           isMounted = false; 
           clearTimeout(timeoutId);
       };
   }, [isOpen]);

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

   // Resolve multi-system contracts dynamically for standard accepted packages
   let resolvedSystemsList = tierData?.systemsList;
   if ((!resolvedSystemsList || resolvedSystemsList.length === 0) && proposal?.proposal_data?.systemTiers && proposal.proposal_data.systemTiers.length > 1) {
       resolvedSystemsList = proposal.proposal_data.systemTiers.map(sys => {
           const matchedTierName = (tierName || 'good').toLowerCase();
           const td = sys.tiers?.[matchedTierName];
           if (!td) return null;
           return {
               systemId: sys.systemId,
               systemName: sys.systemName || sys.name || 'System',
               tierName: tierName,
               tierData: td
           };
       }).filter(Boolean);
   }

   const handlePrint = () => {
      window.print();
   };

   const handleDownloadPDF = async () => {
      if (!pdfRef.current || isGeneratingPDF) return;
      setIsGeneratingPDF(true);

      try {
          const element = pdfRef.current;
          
          // Use high scale for retina-like quality in the exported PDF
          const canvas = await html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff",
          });

          // Match the canvas aspect ratio directly inside the PDF definition for infinite scrolling height
          const imgWidth = 850; 
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          const pdf = new jsPDF('p', 'pt', [imgWidth, imgHeight]);
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
          pdf.save(`Pilar_Contract_${formatQuoteId(proposal).replace('Quote ', '').replace('#', '')}.pdf`);
      } catch (err) {
          console.error("Failed to generate PDF", err);
      } finally {
          setIsGeneratingPDF(false);
      }
   };

   return createPortal(
      <AnimatePresence>
         {isOpen && contractData && (
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="fixed inset-0 z-[100] flex flex-col items-center justify-center modal-layout-wrapper transition-all duration-300 print:static print:block print:inset-auto opacity-100 pointer-events-auto">
         {/* Print Backdrop */}
         <div className="absolute -inset-10 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>
         
         {/* Top Action Bar (Hidden on print) */}
         <div className="action-bar absolute top-0 left-0 right-0 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 z-10 print:hidden bg-slate-900/80 backdrop-blur border-b border-slate-700 shadow-xl">
             <div className="text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" />
                <span className="font-bold tracking-widest text-xs sm:text-sm uppercase text-center">Official Contract Generated</span>
             </div>
             <div className="flex gap-2 sm:gap-4 w-full sm:w-auto justify-center">
                 <button onClick={handlePrint} className="hidden sm:flex items-center gap-2 text-white bg-slate-700/50 hover:bg-slate-700 px-4 py-2 rounded font-bold text-sm transition-colors border border-slate-600/50">
                     <Printer size={16} /> Print
                 </button>
                 <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded font-bold text-sm shadow transition-colors">
                     {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                     <span className="hidden sm:inline">{isGeneratingPDF ? 'Rendering PDF...' : 'Download PDF'}</span>
                     <span className="sm:hidden">{isGeneratingPDF ? 'Rendering...' : 'Download'}</span>
                 </button>
                 <button onClick={onClose} className="p-2 text-white/70 hover:text-white bg-white/10 rounded-full transition-colors shrink-0">
                     <X size={20} />
                 </button>
             </div>
         </div>

         {/* The 8.5x11 Paper Container */}
         <div className="w-full h-full overflow-auto flex justify-center mt-[100px] sm:mt-24 mb-12 print:m-0 pb-20 px-4 sm:px-8">
             <motion.div 
                initial={{ scale: 0.95, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="printable-contract relative bg-white shadow-2xl flex flex-col print:block shrink-0 w-[850px] min-h-[1100px] h-max print:max-h-none print:m-0 text-slate-800 text-[11px] leading-relaxed"
             >
                {isLoadingTemplate ? (
                    <div className="flex flex-col items-center justify-center h-96 w-full text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-4 text-primary-500" />
                    <p className="font-bold tracking-widest text-sm uppercase">Loading Contract Template...</p>
                </div>
            ) : (
                <div className="p-8 pb-12" ref={pdfRef}>
                
                    {/* Header Section */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h1 className="text-3xl font-black mb-1 text-slate-800 tracking-tight">Quote # <span className="font-normal text-slate-500">{formatQuoteId(proposal).replace('Quote ', '').replace('#', '')}</span></h1>
                            <div className="flex gap-6 mt-1 mb-4 font-bold text-slate-700">
                                <span>Contract Date: <span className="font-normal px-2 text-slate-600">{date}</span></span>
                            </div>
                        </div>
                        <div className="text-right flex items-center justify-end">
                             {templateConfig.branding?.logoUrl ? (
                                  <img src={templateConfig.branding.logoUrl} alt="Company Logo" className="max-h-16 max-w-[250px] object-contain" />
                             ) : (
                                  <div className="text-primary-600 font-black text-2xl flex items-center gap-1 tracking-tighter">
                                       <span className="text-3xl relative -top-1">^</span> {templateConfig.branding?.brandName || 'PILAR HOME'}
                                  </div>
                             )}
                        </div>
                    </div>

                {/* Customer / Company Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4 print-safe-block">
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
                                <span className="font-bold text-slate-800">{templateConfig.companyInfo.name}</span>
                            </div>
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Address:</span> <span className="text-slate-600">{templateConfig.companyInfo.address}</span>
                            </div>
                            <div className="flex border-b border-slate-200 pb-1">
                                <span className="w-16 text-slate-500">Phone:</span> <span className="text-slate-600">{templateConfig.companyInfo.phone}</span>
                            </div>
                            <div className="flex pb-1">
                                <span className="w-16 text-slate-500">Email:</span> <span className="text-slate-600">{templateConfig.companyInfo.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unit Info Box */}
                {(resolvedSystemsList && resolvedSystemsList.length > 0) ? (
                    resolvedSystemsList.map((sys, idx) => (
                        <div key={idx} className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                            <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                <div className="flex-1 px-3 py-1.5 border-r border-slate-300">{sys.systemName} - {templateConfig.sectionTitles?.unitInfo || 'Unit Info'}</div>
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
                                            <span className="w-20 text-slate-500">Efficiency:</span> <span className="text-slate-600">{sys.tierData?.seer ? `${sys.tierData.seer} SEER` : 'Standard Ratings'}</span>
                                        </div>
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Brand:</span> <span className="text-slate-600">{sys.tierData?.brand || 'Premium'} {sys.tierData?.series || ''}</span>
                                        </div>
                                        <div className="flex border-b border-slate-200 pb-1">
                                            <span className="w-20 text-slate-500">Dimensions:</span> <span className="text-slate-600">{sys.tierData?.tons ? `${sys.tierData.tons} Ton System` : 'Per Layout'}</span>
                                        </div>
                                        <div className="flex pb-1">
                                            <span className="w-20 text-slate-500">Type of Unit:</span> <span className="text-slate-600">{sys.tierData?.category || sys.tierData?.type || 'System Replacement'}</span>
                                        </div>
                                    </div>
                                    <div className="w-40 border border-slate-300 bg-[#e2e8f0]/40 flex items-center justify-center text-slate-400 font-bold tracking-widest rounded mx-2 my-1 overflow-hidden p-1">
                                        {sys.tierData?.image_url || sys.tierData?.image ? (
                                            <img src={sys.tierData.image_url || sys.tierData.image} alt={sys.systemName} className="object-contain w-full h-full" />
                                        ) : (
                                            "PHOTO"
                                        )}
                                    </div>
                                </div>
                                <div className="w-32 border-l border-slate-300 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                    <div className="px-3 flex items-center justify-end text-slate-800 gap-1 font-black text-lg">
                                        $ <span>{(sys.tierData?.salesPrice || 0).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                        <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                            <div className="flex-1 px-3 py-1.5 border-r border-slate-300">{templateConfig.sectionTitles?.unitInfo || 'Unit Info'}</div>
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
                                        <span className="w-20 text-slate-500">Efficiency:</span> <span className="text-slate-600">{tierData?.seer ? `${tierData.seer} SEER` : 'Standard Ratings'}</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Brand:</span> <span className="text-slate-600">{tierData?.brand || 'Premium'} {tierData?.series || ''}</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-20 text-slate-500">Dimensions:</span> <span className="text-slate-600">{tierData?.tons ? `${tierData.tons} Ton System` : 'Per Layout'}</span>
                                    </div>
                                    <div className="flex pb-1">
                                        <span className="w-20 text-slate-500">Type of Unit:</span> <span className="text-slate-600">{tierData?.category || tierData?.type || 'System Replacement'}</span>
                                    </div>
                                </div>
                                {/* Photo Placeholder */}
                                <div className="w-40 border border-slate-300 bg-[#e2e8f0]/40 flex items-center justify-center text-slate-400 font-bold tracking-widest rounded mx-2 my-1 overflow-hidden p-1">
                                    {tierData?.image_url || tierData?.image ? (
                                        <img src={tierData.image_url || tierData.image} alt="Unit photo" className="object-contain w-full h-full" />
                                    ) : (
                                        "PHOTO"
                                    )}
                                </div>
                            </div>
                            <div className="w-32 border-l border-slate-300 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                <div className="px-3 flex items-center justify-end text-slate-800 gap-1 font-black text-lg">
                                    $ <span>{(tierData?.salesPrice || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Materials & Labor */}
                <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                     <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                        <div className="flex-1 px-3 py-1.5 border-r border-slate-300">Materials & Labor / Subs needed</div>
                        <div className="w-32 px-3 py-1.5 text-center">Price</div>
                    </div>
                    <div className="flex flex-col bg-[#f8fafc]">
                         {(() => {
                             // Extract only custom addons and default materials, removing bulky system features.
                             const extractedAddons = resolvedSystemsList && resolvedSystemsList.length > 0
                                 ? resolvedSystemsList.flatMap(sys => (sys.tierData?.features || []).filter(f => f.includes('Includes:')).map(f => `[${sys.systemName}] ${f.replace('Includes:', '').trim()}`))
                                 : (tierData?.features || []).filter(f => f.includes('Includes:')).map(f => f.replace('Includes:', '').trim());
                                 
                             const allMaterials = [...(templateConfig.materials || []), ...extractedAddons].filter(Boolean);
                             
                             const totalPrice = resolvedSystemsList && resolvedSystemsList.length > 0 
                                 ? resolvedSystemsList.reduce((sum, sys) => sum + (sys.tierData?.salesPrice || 0), 0)
                                 : (tierData?.salesPrice || 0);

                             return (
                                 <>
                                     {allMaterials.length > 0 ? (
                                         allMaterials.map((f, i) => {
                                             return (
                                             <div key={i} className="flex border-b border-slate-200 group transition-colors hover:bg-slate-50/50">
                                                  <div className="flex-1 px-3 py-2 flex items-center gap-2 text-slate-700 font-medium">
                                                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0"></div>
                                                      <span contentEditable suppressContentEditableWarning className="outline-none focus:bg-white focus:ring-1 focus:ring-primary-300 rounded px-1 w-full">{f}</span>
                                                  </div>
                                             </div>
                                         )})
                                     ) : (
                                         <div className="p-4 text-center text-slate-500 italic text-sm">
                                             Standard Installation Package (No Additional Materials Specified)
                                         </div>
                                     )}
                                     
                                     {/* Total Row */}
                                     <div className="flex font-bold text-slate-800 bg-[#e2e8f0]/40">
                                          <div className="flex-1 px-3 py-3 border-r border-slate-300 text-right uppercase text-xs tracking-wider text-slate-800">Total Contract Price:</div>
                                          <div className="w-32 px-3 py-3 flex items-center justify-end gap-1 text-primary-700 font-black text-lg border-t-2 border-slate-300">
                                              $ <span>{totalPrice.toLocaleString()}</span>
                                          </div>
                                     </div>
                                 </>
                             );
                         })()}
                    </div>
                </div>

                {/* Exclusions / Legal */}
                <div className="print-safe-block mt-4 mb-2">
                    <div className="font-bold text-slate-800 mb-2 px-1">{templateConfig.sectionTitles?.legal || 'Exclusions / Legal:'}</div>
                    {templateConfig.terms.map((term, i) => (
                        <div key={i} className="flex border-b border-slate-200 pb-1 mb-1 text-[9px] text-slate-500">
                            {i === templateConfig.terms.length - 1 ? (
                                <>
                                   <div className="flex flex-1">
                                      <span className="w-2 text-center mr-1">•</span> <span className="flex-1">{term}</span>
                                   </div>
                                   <div className="w-48 text-right font-bold text-[12px] text-slate-800 shrink-0 ml-4 pb-1 flex flex-col justify-end">
                                       {proposal?.applied_promo_code && (
                                           <div className="text-[10px] text-emerald-600 mb-0.5">
                                               Promo: {proposal.applied_promo_code} (-{proposal.applied_discount_percent}%)
                                           </div>
                                       )}
                                       <div>Total Price: ${(tierData.salesPrice || 0).toLocaleString()}</div>
                                   </div>
                                </>
                            ) : (
                                <>
                                    <span className="w-2 text-center mr-1">•</span> <span className="flex-1">{term}</span>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                {/* Signatures */}
                <div className="border border-slate-300 rounded overflow-hidden mt-6 bg-white print-safe-block">
                    {/* Header Row */}
                    <div className="grid grid-cols-2 bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                        <div className="px-3 py-1.5 border-r border-slate-300">Company Signature</div>
                        <div className="px-3 py-1.5">Client Signature</div>
                    </div>

                    {/* Signature Area Row */}
                    <div className="grid grid-cols-2 border-b border-slate-300 bg-[#f8fafc]">
                        {/* Company Signature Cell */}
                        <div className="h-32 border-r border-slate-300 relative flex items-center justify-center p-4 overflow-hidden">
                           <span className="font-[cursive] text-4xl text-slate-800 opacity-20 transform -rotate-[5deg] select-none">{templateConfig.companySignatureName}</span>
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
            )}
         </motion.div>
         </div>
            </motion.div>
         )}
      </AnimatePresence>,
      document.body
   );
}
