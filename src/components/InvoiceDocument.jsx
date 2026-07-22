import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Banknote, Loader2 } from 'lucide-react';
import { formatQuoteId } from '../utils/formatters';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getActiveContractTemplate } from '../utils/contracts/getActiveContractTemplate';
import { normalizeContractTemplate } from '../utils/contracts/normalizeContractTemplate';
import { useCustomers } from '../context/CustomerContext';
import '../components/ContractDocumentModal.css';

export default function InvoiceDocument({ isOpen, onClose, invoice }) {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [templateConfig, setTemplateConfig] = useState(null);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
    const { customers } = useCustomers();
    const pdfRef = useRef(null);

    // Find the customer from the global context using the invoice's customer_id, or by tracing the proposal's opportunity back to the household
    const oppId = invoice?.proposals?.associated_opportunity_id || invoice?.proposals?.proposal_data?.associated_opportunity_id;
    const effectiveCustomerId = invoice?.customer_id || invoice?.proposals?.proposal_data?.customer_id;
    
    const customer = customers?.find(c => 
        c.id === effectiveCustomerId || 
        (oppId && c.opportunities?.some(opp => opp.id === oppId))
    ) || null;
    const primaryContact = customer?.raw?.contacts?.[0] || {};
    const primaryAddress = customer?.raw?.addresses?.find(a => a.is_primary_residence) || customer?.raw?.addresses?.[0] || {};

    React.useEffect(() => {
        let isMounted = true;
        if (isOpen) {
            setIsLoadingTemplate(true);
            getActiveContractTemplate().then(rawTemplate => {
                if (!isMounted) return;
                setTemplateConfig(normalizeContractTemplate(rawTemplate));
                setIsLoadingTemplate(false);
            });
        }
        return () => { isMounted = false; };
    }, [isOpen]);

    if (!isOpen || !invoice) return null;

    const isPaid = invoice.status === 'Paid in Full';
    const isPartial = invoice.status === 'Partial Payment';

    const proposal = invoice.proposals || {};
    const pData = proposal.proposal_data || {};
    const tierName = pData.tierName || pData.selectedTier || 'good';
    const tierData = pData.tierData || pData.tiers?.[tierName.toLowerCase()] || {};
    
    const finalPrice = parseFloat(invoice.total_contract_amount || invoice.amount) || 0;
    const discountPercent = invoice.proposals?.applied_discount_percent || pData.applied_discount_percent || pData.applied_promo?.discount_percent || 0;
    const originalPrice = discountPercent > 0 ? finalPrice / (1 - (discountPercent / 100)) : finalPrice;

    let resolvedSystemsList = tierData?.systemsList;
    if ((!resolvedSystemsList || resolvedSystemsList.length === 0) && pData.systemTiers && pData.systemTiers.length > 1) {
        resolvedSystemsList = pData.systemTiers.map(sys => {
            const matchedTierName = tierName.toLowerCase();
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
            
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });
  
            const imgWidth = 850; 
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            const pdf = new jsPDF('p', 'pt', [imgWidth, imgHeight]);
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Pilar_Invoice_${invoice.id.substring(0,8).toUpperCase()}.pdf`);
        } catch (err) {
            console.error("Failed to generate PDF", err);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex flex-col items-center justify-center modal-layout-wrapper transition-all duration-300 print:static print:block print:inset-auto opacity-100 pointer-events-auto"
            >
                {/* Print Backdrop */}
                <div className="absolute -inset-10 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={onClose}></div>
                
                {/* Top Action Bar (Hidden on print) */}
                <div className="action-bar absolute top-0 left-0 right-0 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 z-10 print:hidden bg-slate-900/80 backdrop-blur border-b border-slate-700 shadow-xl">
                    <div className="text-white flex items-center gap-2">
                        <Banknote className="text-emerald-400" />
                        <span className="font-bold tracking-widest text-xs sm:text-sm uppercase text-center">Official Invoice Generated</span>
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
                <div className="w-full h-full overflow-auto mt-[100px] sm:mt-24 mb-12 print:m-0 pb-20 px-4 sm:px-8">
                <motion.div 
                    initial={{ scale: 0.95, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 10, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="printable-contract mx-auto relative bg-white shadow-2xl flex flex-col print:block shrink-0 w-[850px] min-h-[1100px] h-max print:max-h-none print:m-0 text-slate-800 text-[11px] leading-relaxed"
                >
                    <div className="p-8 pb-12" ref={pdfRef}>
                        
                        {/* Header Section */}
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-3xl font-black mb-1 text-slate-800 tracking-tight">Invoice # <span className="font-normal text-slate-500">{invoice.id.substring(0,8).toUpperCase()}</span></h1>
                                <div className="flex gap-6 mt-1 mb-4 font-bold text-slate-700">
                                    <span>Invoice Date: <span className="font-normal px-2 text-slate-600">{new Date(invoice.created_at).toLocaleDateString()}</span></span>
                                    <span>Due Date: <span className="font-normal px-2 text-slate-600">{new Date(invoice.due_date || invoice.created_at).toLocaleDateString()}</span></span>
                                </div>
                            </div>
                            <div className="text-right flex items-center justify-end">
                                {isLoadingTemplate ? (
                                    <Loader2 size={24} className="animate-spin text-slate-300 mr-4" />
                                ) : (
                                    <div className="mr-6 flex flex-col items-end">
                                        {templateConfig?.branding?.logoUrl ? (
                                            <img src={templateConfig.branding.logoUrl} alt="Company Logo" className="h-10 w-auto object-contain mb-1" />
                                        ) : (
                                            <div className="text-primary-600 font-black text-2xl flex items-center gap-1 tracking-tighter mb-1">
                                                {templateConfig?.branding?.brandName || 'PILAR HOME'}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-slate-500 font-medium text-right">
                                            <div>{templateConfig?.companyInfo?.name}</div>
                                            <div>{templateConfig?.companyInfo?.address}</div>
                                            <div>{templateConfig?.companyInfo?.phone}</div>
                                        </div>
                                    </div>
                                )}
                                <div className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-2 ${
                                    isPaid ? 'border-emerald-500 text-emerald-600' : 
                                    isPartial ? 'border-amber-500 text-amber-600' : 'border-rose-500 text-rose-600'
                                }`}>
                                    {invoice.status.toUpperCase()}
                                </div>
                            </div>
                        </div>

                        {/* Customer / Company Info Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-4 print-safe-block">
                            {/* Bill To Box */}
                            <div className="border border-slate-300 rounded overflow-hidden">
                                <div className="bg-[#e2e8f0] text-slate-700 font-bold px-3 py-1.5 border-b border-slate-300">Bill To</div>
                                <div className="p-3 bg-[#f8fafc] flex flex-col gap-2">
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-16 text-slate-500">Name:</span> <span className="font-semibold text-slate-800">{
                                            customer ? 
                                                `${primaryContact.first_name || ''} ${primaryContact.last_name || ''}`.trim() || customer.household_name 
                                            : invoice.proposals?.customer || 'Unknown Customer'
                                        }</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-16 text-slate-500">Address:</span> <span className="text-slate-600">{
                                            customer ? 
                                                `${primaryAddress.street_address || ''} ${primaryAddress.city ? ', ' + primaryAddress.city : ''}`.trim() 
                                            : invoice.proposals?.proposal_data?.address || '(Digital Record)'
                                        }</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-16 text-slate-500">Phone:</span> <span className="text-slate-600">{
                                            primaryContact.primary_phone || customer?.phone || invoice.proposals?.proposal_data?.contactPhone || ''
                                        }</span>
                                    </div>
                                    <div className="flex pb-1">
                                        <span className="w-16 text-slate-500">Email:</span> <span className="text-slate-600">{
                                            primaryContact.email || customer?.email || invoice.proposals?.proposal_data?.contactEmail || ''
                                        }</span>
                                    </div>
                                </div>
                            </div>

                            {/* Service Location Box */}
                            <div className="border border-slate-300 rounded overflow-hidden">
                                <div className="bg-[#e2e8f0] text-slate-700 font-bold px-3 py-1.5 border-b border-slate-300">Primary Service Location</div>
                                <div className="p-3 bg-[#f8fafc] flex flex-col gap-2 h-full">
                                    <div className="flex pb-1">
                                        <span className="text-slate-600">{
                                            primaryAddress.street_address 
                                            || invoice.proposals?.proposal_data?.address || 'Address Not Specified'
                                        }</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Unit Info / Custom Items Box */}
                        {invoice?.metadata?.service_call_items && invoice.metadata.service_call_items.length > 0 ? (
                            <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                                <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                    <div className="flex-1 px-3 py-1.5 border-r border-slate-300">Service Items</div>
                                    <div className="w-20 px-3 py-1.5 border-r border-slate-300 text-center">Qty</div>
                                    <div className="w-32 px-3 py-1.5 border-r border-slate-300 text-right">Unit Price</div>
                                    <div className="w-32 px-3 py-1.5 text-right">Ext Price</div>
                                </div>
                                <div className="flex flex-col bg-[#f8fafc]">
                                    {invoice.metadata.service_call_items.map((item, idx) => {
                                        const isDiscount = item.is_waive_discount || parseFloat(item.unit_price || 0) < 0;
                                        return (
                                        <div key={idx} className={`flex border-b border-slate-200 ${isDiscount ? 'bg-emerald-50' : ''}`}>
                                            <div className="flex-1 px-3 py-2 border-r border-slate-200 flex flex-col justify-center">
                                                <span className={isDiscount ? 'text-emerald-700 font-black' : 'text-slate-800 font-bold'}>{item.title || 'Custom Item'}</span>
                                                {item.description && <span className={`${isDiscount ? 'text-emerald-600 font-medium' : 'text-slate-500'} text-xs mt-0.5`}>{item.description}</span>}
                                            </div>
                                            <div className={`w-20 px-3 py-2 border-r border-slate-200 text-center ${isDiscount ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                                {item.quantity}
                                            </div>
                                            <div className={`w-32 px-3 py-2 border-r border-slate-200 text-right ${isDiscount ? 'text-emerald-600 font-bold' : 'text-slate-600'}`}>
                                                ${parseFloat(item.unit_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </div>
                                            <div className={`w-32 px-3 py-2 text-right font-black ${isDiscount ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                ${(parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ) : (resolvedSystemsList && resolvedSystemsList.length > 0) ? (
                            resolvedSystemsList.map((sys, idx) => (
                                <div key={idx} className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                                    <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                        <div className="w-32 px-3 py-1.5 border-r border-slate-300">Quote / PO#</div>
                                        <div className="flex-1 px-3 py-1.5 border-r border-slate-300">{sys.systemName} - {templateConfig?.sectionTitles?.unitInfo || 'Unit Info'}</div>
                                        <div className="w-32 px-3 py-1.5 text-center">Price</div>
                                    </div>
                                    <div className="flex bg-[#f8fafc]">
                                        <div className="w-32 px-3 py-3 border-r border-slate-300 text-slate-700 font-bold font-mono">
                                        {formatQuoteId(proposal)}
                                        </div>
                                        <div className="flex-1 p-3 flex border-r border-slate-300">
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
                                        <div className="w-32 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                            <div className="px-3 flex items-center justify-end text-slate-800 gap-1 font-black text-lg">
                                                $ <span>{(sys.tierData?.salesPrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : pData.type === 'MAINTENANCE' ? (
                            <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                                <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                    <div className="w-32 px-3 py-1.5 border-r border-slate-300">Quote / PO#</div>
                                    <div className="flex-1 px-3 py-1.5 border-r border-slate-300">Maintenance Program Details</div>
                                    <div className="w-32 px-3 py-1.5 text-center">Price</div>
                                </div>
                                <div className="flex bg-[#f8fafc]">
                                    <div className="w-32 px-3 py-3 border-r border-slate-300 text-slate-700 font-bold font-mono">
                                        {formatQuoteId(proposal)}
                                    </div>
                                    <div className="flex-1 p-3 flex border-r border-slate-300">
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex border-b border-slate-200 pb-2 mb-2">
                                                <span className="w-24 text-slate-500">Program:</span> <span className="font-bold text-slate-800 uppercase">{pData.frequency || 'Annual'} Maintenance</span>
                                            </div>
                                            <div className="flex border-b border-slate-200 pb-2 mb-2">
                                                <span className="w-24 text-slate-500">Coverage:</span> <span className="text-slate-600">{pData.units_covered || 1} System(s) Included</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-24 text-slate-500">Billing:</span> <span className="text-slate-600">Recurring Subscription</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-32 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                        <div className="px-3 flex items-center justify-end text-slate-800 gap-1 font-black text-lg">
                                            $ <span>{originalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                                <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                    <div className="w-32 px-3 py-1.5 border-r border-slate-300">Quote / PO#</div>
                                    <div className="flex-1 px-3 py-1.5 border-r border-slate-300">{templateConfig?.sectionTitles?.unitInfo || 'Unit Info'}</div>
                                    <div className="w-32 px-3 py-1.5 text-center">Price</div>
                                </div>
                                <div className="flex bg-[#f8fafc]">
                                    <div className="w-32 px-3 py-3 border-r border-slate-300 text-slate-700 font-bold font-mono">
                                        {formatQuoteId(proposal)}
                                    </div>
                                    <div className="flex-1 p-3 flex border-r border-slate-300">
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
                                        <div className="w-40 border border-slate-300 bg-[#e2e8f0]/40 flex items-center justify-center text-slate-400 font-bold tracking-widest rounded mx-2 my-1 overflow-hidden p-1">
                                            {tierData?.image_url || tierData?.image ? (
                                                <img src={tierData.image_url || tierData.image} alt="Unit photo" className="object-contain w-full h-full" />
                                            ) : (
                                                "PHOTO"
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-32 flex flex-col justify-end pb-3 text-center bg-[#f8fafc]">
                                        <div className="px-3 flex items-center justify-end text-slate-800 gap-1 font-black text-lg">
                                            $ <span>{originalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Materials & Labor (Hide for Service Calls) */}
                        {!invoice?.metadata?.service_call_items && (
                        <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                             <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                <div className="flex-1 px-3 py-1.5">Materials & Labor / Subs needed</div>
                            </div>
                            <div className="flex flex-col bg-[#f8fafc]">
                                 {(() => {
                                     const extractedAddons = resolvedSystemsList && resolvedSystemsList.length > 0
                                         ? resolvedSystemsList.flatMap(sys => (sys.tierData?.features || []).filter(f => f.includes('Includes:')).map(f => `[${sys.systemName}] ${f.replace('Includes:', '').trim()}`))
                                         : (tierData?.features || []).filter(f => f.includes('Includes:')).map(f => f.replace('Includes:', '').trim());
                                         
                                     const allMaterials = [...(templateConfig?.materials || []), ...extractedAddons].filter(Boolean);
                                     
                                     return (
                                         <>
                                             {allMaterials.length > 0 ? (
                                                 allMaterials.map((f, i) => {
                                                     return (
                                                     <div key={i} className="flex border-b border-slate-200 group transition-colors hover:bg-slate-50/50">
                                                          <div className="flex-1 px-3 py-2 flex items-center gap-2 text-slate-700 font-medium">
                                                              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0"></div>
                                                              <span className="w-full">{f}</span>
                                                          </div>
                                                     </div>
                                                 )})
                                             ) : (
                                                 <div className="p-4 text-center text-slate-500 italic text-sm">
                                                     Standard Installation Package (No Additional Materials Specified)
                                                 </div>
                                             )}
                                         </>
                                     );
                                 })()}
                            </div>
                        </div>
                        )}

                        {/* Totals Section */}
                        <div className="flex justify-between items-start mb-6 print-safe-block">
                                {(() => {
                                    const promoCode = invoice.proposals?.applied_promo_code || pData.applied_promo_code || pData.applied_promo?.code || '';
                                    const discountAmount = originalPrice - finalPrice;
                                    
                                    const serviceItems = invoice.metadata?.service_call_items || [];
                                    const hasServiceDiscounts = serviceItems.some(item => parseFloat(item.unit_price || 0) < 0);
                                    const serviceSubtotal = serviceItems.reduce((sum, item) => {
                                        const price = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0);
                                        return price > 0 ? sum + price : sum;
                                    }, 0);
                                    const serviceDiscountAmount = serviceItems.reduce((sum, item) => {
                                        const price = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0);
                                        return price < 0 ? sum + Math.abs(price) : sum;
                                    }, 0);

                                return (
                                    <>
                                        <div className="w-1/2 pr-8 mt-2">
                                            <div className="font-bold text-slate-800 mb-1 px-1">Customer Message:</div>
                                            <p className="text-[11px] text-slate-500 italic px-1 whitespace-pre-wrap mb-4">
                                                {isLoadingTemplate ? 'Loading message...' : templateConfig?.invoiceMessage}
                                            </p>
                                            
                                            {templateConfig?.invoicePaymentTerms && (
                                                <>
                                                    <div className="font-bold text-slate-800 mb-1 px-1">Payment Terms:</div>
                                                    <p className="text-[11px] text-slate-600 font-medium px-1">
                                                        {templateConfig.invoicePaymentTerms}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        
                                        <div className="w-[300px] border border-slate-300 rounded overflow-hidden bg-[#f8fafc]">
                                            {/* Subtotal Row (if discount exists) */}
                                            {(discountPercent > 0 || hasServiceDiscounts) && (
                                                <div className="flex border-b border-slate-200">
                                                    <div className="flex-1 px-3 py-2 text-right uppercase text-[10px] tracking-wider text-slate-500 font-bold">Subtotal:</div>
                                                    <div className="w-32 px-3 py-2 text-right font-bold text-slate-600">
                                                        ${(hasServiceDiscounts ? serviceSubtotal : originalPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Discount Row (if discount exists) */}
                                            {(discountPercent > 0 || hasServiceDiscounts) && (
                                                <div className="flex border-b border-slate-200 bg-emerald-50/50">
                                                    <div className="flex-1 px-3 py-2 text-right uppercase text-[10px] tracking-wider text-emerald-700 font-bold">
                                                        {hasServiceDiscounts ? 'Discounts (-):' : `Discount ${promoCode ? `(${promoCode} - ${discountPercent}%)` : `(${discountPercent}%)`}:`}
                                                    </div>
                                                    <div className="w-32 px-3 py-2 text-right font-bold text-emerald-700">
                                                        -${(hasServiceDiscounts ? serviceDiscountAmount : discountAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex border-b border-slate-200">
                                                <div className="flex-1 px-3 py-2 text-right uppercase text-[10px] tracking-wider text-slate-600 font-bold">Invoice Total:</div>
                                                <div className="w-32 px-3 py-2 text-right font-bold text-slate-800">
                                                    ${finalPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </div>
                                            </div>
                                            {(parseFloat(invoice.deposit_collected ?? 0) > 0) && (
                                                <div className="flex border-b border-slate-300 text-emerald-600">
                                                    <div className="flex-1 px-3 py-2 text-right uppercase text-[10px] tracking-wider font-bold">Deposits/Payments (-):</div>
                                                    <div className="w-32 px-3 py-2 text-right font-bold">
                                                        ${(parseFloat(invoice.deposit_collected ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="flex font-bold bg-[#e2e8f0]/40">
                                                <div className="flex-1 px-3 py-3 text-right uppercase text-xs tracking-wider text-slate-800 flex items-center justify-end">Total Due:</div>
                                                <div className="w-32 px-3 py-3 text-right font-black text-lg text-primary-700">
                                                    ${(parseFloat(invoice.balance_due ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        
                        {/* Payment History */}
                        {invoice.metadata?.payment_history && invoice.metadata.payment_history.length > 0 && (
                            <div className="mt-8 border-t border-slate-200 pt-6 print-safe-block">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Payment History</h4>
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-y border-slate-200">
                                        <tr>
                                            <th className="p-2.5 pl-4">Date</th>
                                            <th className="p-2.5">Method</th>
                                            <th className="p-2.5">Reference</th>
                                            <th className="p-2.5 pr-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs">
                                        {invoice.metadata.payment_history.map((payment, index) => (
                                            <tr key={index}>
                                                <td className="p-2.5 pl-4 text-slate-600 font-bold">{new Date(payment.date).toLocaleDateString()}</td>
                                                <td className="p-2.5 text-slate-700 font-bold">{payment.method}</td>
                                                <td className="p-2.5 text-slate-500">{payment.reference || '-'}</td>
                                                <td className="p-2.5 pr-4 text-right text-emerald-700 font-bold">
                                                    ${parseFloat(payment.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {/* Signature Block */}
                        {invoice.customer_signature && (
                            <div className="mt-8 border-t border-slate-200 pt-6 print-safe-block">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4">Customer Authorization</h4>
                                <div className="flex items-end gap-8">
                                    <div className="w-64">
                                        <div className="h-20 border-b border-slate-300 mb-2 relative">
                                            <img src={invoice.customer_signature} alt="Customer Signature" className="absolute bottom-0 left-0 max-h-full max-w-full object-contain mix-blend-multiply" />
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">Customer Signature</div>
                                    </div>
                                    <div className="w-64">
                                        <div className="h-20 border-b border-slate-300 mb-2 flex items-end pb-2">
                                            <span className="font-medium text-slate-800 text-sm">{invoice.signed_by || 'Customer'}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">Printed Name</div>
                                    </div>
                                    <div className="w-48">
                                        <div className="h-20 border-b border-slate-300 mb-2 flex items-end pb-2">
                                            <span className="font-medium text-slate-800 text-sm">
                                                {invoice.signed_at ? `${new Date(invoice.signed_at).toLocaleDateString()} ${new Date(invoice.signed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Time of signing'}
                                            </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">Date / Time</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Footer */}
                        <div className="text-center text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-8 mt-8">
                            {isLoadingTemplate ? '...' : (templateConfig?.invoiceFooter || 'Invoice generated securely.')} &copy; {new Date().getFullYear()}
                        </div>

                    </div>
                </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
