import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Banknote, Loader2 } from 'lucide-react';
import { formatQuoteId } from '../utils/formatters';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import '../components/ContractDocumentModal.css';

export default function InvoiceDocument({ isOpen, onClose, invoice }) {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const pdfRef = useRef(null);

    if (!isOpen || !invoice) return null;

    const isPaid = invoice.status === 'Paid in Full';
    const isPartial = invoice.status === 'Partial Payment';

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
                <div className="w-full h-full overflow-auto flex justify-center mt-[100px] sm:mt-24 mb-12 print:m-0 pb-20 px-4 sm:px-8">
                <motion.div 
                    initial={{ scale: 0.95, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 10, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="printable-contract relative bg-white shadow-2xl flex flex-col print:block shrink-0 w-[850px] min-h-[1100px] h-max print:max-h-none print:m-0 text-slate-800 text-[11px] leading-relaxed"
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
                                <div className="text-primary-600 font-black text-2xl flex items-center gap-1 tracking-tighter mr-4">
                                    <span className="text-3xl relative -top-1">^</span> PILAR HOME
                                </div>
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
                                        <span className="w-16 text-slate-500">Name:</span> <span className="font-semibold text-slate-800">{invoice.proposals?.customer || 'Unknown Customer'}</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-16 text-slate-500">Address:</span> <span className="text-slate-600">{invoice.proposals?.proposal_data?.address || '(Digital Record)'}</span>
                                    </div>
                                    <div className="flex border-b border-slate-200 pb-1">
                                        <span className="w-16 text-slate-500">Phone:</span> <span className="text-slate-600">{invoice.proposals?.proposal_data?.contactPhone || ''}</span>
                                    </div>
                                    <div className="flex pb-1">
                                        <span className="w-16 text-slate-500">Email:</span> <span className="text-slate-600">{invoice.proposals?.proposal_data?.contactEmail || ''}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Service Location Box */}
                            <div className="border border-slate-300 rounded overflow-hidden">
                                <div className="bg-[#e2e8f0] text-slate-700 font-bold px-3 py-1.5 border-b border-slate-300">Primary Service Location</div>
                                <div className="p-3 bg-[#f8fafc] flex flex-col gap-2 h-full">
                                    <div className="flex pb-1">
                                        <span className="text-slate-600">{invoice.proposals?.proposal_data?.address || 'Address Not Specified'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="border border-slate-300 rounded overflow-hidden mb-4 print-safe-block">
                            <div className="flex bg-[#e2e8f0] text-slate-700 font-bold border-b border-slate-300">
                                <div className="w-32 px-3 py-1.5 border-r border-slate-300">Quote / PO#</div>
                                <div className="flex-1 px-3 py-1.5 border-r border-slate-300">Description</div>
                                <div className="w-32 px-3 py-1.5 text-center">Job Total</div>
                            </div>
                            <div className="flex flex-col bg-[#f8fafc]">
                                <div className="flex border-b border-slate-200 group transition-colors hover:bg-slate-50/50">
                                    <div className="w-32 px-3 py-3 border-r border-slate-300 text-slate-700 font-bold font-mono">
                                        {formatQuoteId({id: invoice.proposal_id})}
                                    </div>
                                    <div className="flex-1 px-3 py-3 border-r border-slate-300 text-slate-700 font-medium">
                                        HVAC Equipment Installation / Service
                                        <div className="text-[10px] text-slate-500 mt-1 italic">{invoice.notes || 'Contract execution per signed proposal.'}</div>
                                    </div>
                                    <div className="w-32 px-3 py-3 flex items-center justify-end gap-1 text-slate-800 font-bold text-sm">
                                        $ <span>{(parseFloat(invoice.total_contract_amount || invoice.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="flex justify-between items-start mb-6 print-safe-block">
                            <div className="w-1/2 pr-8 mt-2">
                                <div className="font-bold text-slate-800 mb-1 px-1">Customer Message:</div>
                                <p className="text-[11px] text-slate-500 italic px-1">Thank you for your business. Please contact us if you have any questions regarding this invoice or your service.</p>
                            </div>
                            
                            <div className="w-[300px] border border-slate-300 rounded overflow-hidden bg-[#f8fafc]">
                                <div className="flex border-b border-slate-200">
                                    <div className="flex-1 px-3 py-2 text-right uppercase text-[10px] tracking-wider text-slate-600 font-bold">Invoice Total:</div>
                                    <div className="w-32 px-3 py-2 text-right font-bold text-slate-800">
                                        ${(parseFloat(invoice.total_contract_amount || invoice.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </div>
                                </div>
                                <div className="flex border-b border-slate-300 text-emerald-600">
                                    <div className="flex-1 px-3 py-2 text-right uppercase text-[10px] tracking-wider font-bold">Deposits/Payments (-):</div>
                                    <div className="w-32 px-3 py-2 text-right font-bold">
                                        ${(parseFloat(invoice.deposit_collected || invoice.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </div>
                                </div>
                                <div className="flex font-bold bg-[#e2e8f0]/40">
                                    <div className="flex-1 px-3 py-3 text-right uppercase text-xs tracking-wider text-slate-800 flex items-center justify-end">Total Due:</div>
                                    <div className="w-32 px-3 py-3 text-right font-black text-lg text-primary-700">
                                        ${(parseFloat(invoice.balance_due ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="text-center text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-8 mt-8">
                            Invoice generated by Pilar Sales Platform &copy; {new Date().getFullYear()}
                        </div>

                    </div>
                </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
