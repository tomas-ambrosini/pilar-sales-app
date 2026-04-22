import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Download, Mail, Send } from 'lucide-react';
import { formatQuoteId } from '../utils/formatters';

export default function InvoiceDocument({ isOpen, onClose, invoice }) {
    if (!isOpen || !invoice) return null;

    const isPaid = invoice.status === 'Paid in Full';
    const isPartial = invoice.status === 'Partial Payment';

    const handlePrint = () => {
        window.print();
    };

    return createPortal(
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm print:bg-white print:p-0 print:block"
            >
                <div className="w-full max-w-5xl h-full max-h-[90vh] flex flex-col print:h-auto print:max-h-none print:w-full">
                    
                    {/* Floating Toolbar (Hidden on Print) */}
                    <div className="bg-slate-800 text-white p-3 rounded-t-xl flex justify-between items-center print:hidden shadow-lg border-b border-slate-700">
                        <div className="flex items-center gap-4 px-2">
                            <span className="font-bold text-sm tracking-widest uppercase">Invoice #{invoice.id.substring(0,6).toUpperCase()}</span>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors">
                                <Mail size={14} /> Email
                            </button>
                            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors">
                                <Printer size={14} /> Print
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold transition-colors">
                                <Download size={14} /> PDF
                            </button>
                            <button onClick={onClose} className="p-1.5 ml-2 text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Document Body */}
                    <div className="bg-white flex-1 overflow-y-auto rounded-b-xl shadow-2xl print:shadow-none print:overflow-visible">
                        <div className="max-w-4xl mx-auto p-12 print:p-8 bg-white min-h-full font-sans">
                            
                            {/* Header Section */}
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
                                <div>
                                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h1>
                                    <div className="text-slate-500 text-sm leading-relaxed">
                                        <strong>Pilar Services, Inc.</strong><br/>
                                        123 Service Blvd, Suite 100<br/>
                                        Miami, FL 33101<br/>
                                        (800) 555-0199
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <div className={`mb-4 px-4 py-1.5 text-xs font-black uppercase tracking-widest border-2 ${
                                        isPaid ? 'border-emerald-500 text-emerald-600' : 
                                        isPartial ? 'border-amber-500 text-amber-600' : 'border-rose-500 text-rose-600'
                                    }`}>
                                        {invoice.status.toUpperCase()}
                                    </div>
                                    <table className="text-sm text-slate-600 text-right border-collapse">
                                        <tbody>
                                            <tr><td className="pr-4 py-1 font-bold">Invoice Date:</td><td>{new Date(invoice.created_at).toLocaleDateString()}</td></tr>
                                            <tr><td className="pr-4 py-1 font-bold">Invoice #:</td><td className="font-mono">{invoice.id.substring(0,8).toUpperCase()}</td></tr>
                                            <tr><td className="pr-4 py-1 font-bold">Terms:</td><td>Net 30</td></tr>
                                            <tr><td className="pr-4 py-1 font-bold">Due Date:</td><td>{new Date(invoice.due_date || invoice.created_at).toLocaleDateString()}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Bill To & Location */}
                            <div className="grid grid-cols-2 gap-12 mb-10">
                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Bill To</h3>
                                    <div className="text-slate-800 font-medium text-sm leading-relaxed">
                                        <div className="font-bold text-base text-primary-700">{invoice.proposals?.customer || 'Unknown Customer'}</div>
                                        <div>{invoice.proposals?.proposal_data?.contactEmail || 'No Email Provided'}</div>
                                        <div>{invoice.proposals?.proposal_data?.contactPhone || 'No Phone Provided'}</div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">Primary Service Location</h3>
                                    <div className="text-slate-800 font-medium text-sm leading-relaxed">
                                        {invoice.proposals?.proposal_data?.address || 'Address Not Specified'}
                                    </div>
                                </div>
                            </div>

                            {/* Line Items Table */}
                            <table className="w-full text-left mb-10 border-collapse">
                                <thead>
                                    <tr className="border-y-2 border-slate-800 text-xs font-black uppercase tracking-widest text-slate-700">
                                        <th className="py-3 px-2">Job Date</th>
                                        <th className="py-3 px-2">Quote / PO#</th>
                                        <th className="py-3 px-2">Description</th>
                                        <th className="py-3 px-2 text-right">Job Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm font-medium text-slate-700">
                                    <tr className="border-b border-slate-100">
                                        <td className="py-4 px-2">{new Date(invoice.created_at).toLocaleDateString()}</td>
                                        <td className="py-4 px-2 text-primary-600 font-bold">{formatQuoteId({id: invoice.proposal_id})}</td>
                                        <td className="py-4 px-2">
                                            HVAC Equipment Installation / Service
                                            <div className="text-xs text-slate-400 mt-1 font-normal">{invoice.notes || 'Contract execution per signed proposal.'}</div>
                                        </td>
                                        <td className="py-4 px-2 text-right font-bold text-slate-900">
                                            ${(parseFloat(invoice.total_contract_amount || invoice.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Totals Section */}
                            <div className="flex justify-between items-end mb-16">
                                <div className="w-1/2">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer Message</h3>
                                    <p className="text-sm text-slate-600 italic">Thank you for your business. Please contact us if you have any questions regarding this invoice.</p>
                                </div>
                                <div className="w-[300px]">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            <tr className="border-b border-slate-100">
                                                <td className="py-2 font-bold text-slate-500 uppercase text-xs tracking-wider">Invoice Total:</td>
                                                <td className="py-2 text-right font-black text-slate-800">
                                                    ${(parseFloat(invoice.total_contract_amount || invoice.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </td>
                                            </tr>
                                            <tr className="border-b border-slate-100 text-emerald-600">
                                                <td className="py-2 font-bold uppercase text-xs tracking-wider">Deposits/Payments (-):</td>
                                                <td className="py-2 text-right font-black">
                                                    ${(parseFloat(invoice.deposit_collected || invoice.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </td>
                                            </tr>
                                            <tr className="border-y-2 border-slate-800 bg-slate-50">
                                                <td className="py-3 px-2 font-black text-slate-900 uppercase tracking-wider">Total Due:</td>
                                                <td className="py-3 px-2 text-right font-black text-lg text-slate-900">
                                                    ${(parseFloat(invoice.balance_due ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="text-center text-xs text-slate-400 font-medium border-t border-slate-100 pt-8 mt-auto">
                                Invoice generated by Pilar Sales Platform &copy; {new Date().getFullYear()}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
