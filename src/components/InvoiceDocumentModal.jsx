import React from 'react';
import { X, Printer, ShieldCheck, Pen, CheckCircle } from 'lucide-react';
import './ContractDocumentModal.css';

export default function InvoiceDocumentModal({ isOpen, onClose, invoiceData }) {
   if (!isOpen || !invoiceData) return null;

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
                <span className="font-bold tracking-widest text-sm uppercase">Official Invoice</span>
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
                   <div className="text-3xl font-black text-slate-200 uppercase tracking-widest mb-2">Invoice</div>
                   <p className="text-sm font-bold text-slate-800">Date: <span className="font-normal text-slate-600">{new Date(invoiceData.issued_at).toLocaleDateString()}</span></p>
                   <p className="text-sm font-bold text-slate-800">Invoice Ref: <span className="font-normal text-slate-600">{invoiceData.id}</span></p>
                </div>
            </div>

            <div className="px-10 flex-1">
               {/* Client Info Grid */}
               <div className="flex gap-12 mb-10">
                   <div className="flex-1">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 border-b border-slate-200 pb-1">Billed To</h4>
                      <p className="font-bold text-slate-800 text-lg mb-1">{invoiceData.customer}</p>
                      <p className="text-sm text-slate-600 block w-48">Service Account on file.</p>
                   </div>
                   <div className="flex-1">
                      <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 border-b border-slate-200 pb-1">Status / Mechanics</h4>
                      {invoiceData.status === 'Paid' ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-black tracking-wider text-xl mb-1 uppercase">
                              <CheckCircle size={20}/> PAID IN FULL
                          </div>
                      ) : (
                          <p className="font-bold text-rose-600 text-lg mb-1 uppercase tracking-wider">{invoiceData.status}</p>
                      )}
                      
                      {invoiceData.payment_method ? (
                         <p className="text-sm text-slate-600 font-bold">Method: {invoiceData.payment_method}</p>
                      ) : (
                         <p className="text-sm text-slate-600">Balance required at Completion</p>
                      )}
                   </div>
               </div>

               {/* Itemized Scope of Work */}
               <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 border-b border-slate-200 pb-1">Account Charges</h4>
               
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
                             <p className="font-bold text-slate-800 text-lg">System Installation - Final Balance</p>
                             <p className="text-sm text-slate-600 mt-1 font-semibold">{invoiceData.work_order_id ? `Generated from Work Order Approval` : 'Manual Invoice'}</p>
                         </td>
                         <td className="py-2 px-3 align-top font-bold text-slate-700 pt-4">1</td>
                         <td className="py-2 px-3 align-top text-right font-bold text-slate-800 pt-4">${Number(invoiceData.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                   </tbody>
               </table>

               <div className="flex justify-end mb-12">
                   <div className="w-64">
                       <div className="flex justify-between py-2 border-b border-slate-200 text-sm font-bold text-slate-600">
                          <span>Subtotal</span>
                          <span>${Number(invoiceData.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                       <div className="flex justify-between py-2 border-b border-slate-200 text-sm font-bold text-slate-600">
                          <span>Tax (Exempt/Included)</span>
                          <span>$0.00</span>
                       </div>
                       <div className="flex justify-between py-3 text-2xl font-black text-slate-900">
                          <span>Total</span>
                          <span>${Number(invoiceData.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                       </div>
                   </div>
               </div>

               {/* Legal & Warranty */}
               <div className="bg-slate-50 p-6 rounded text-[10px] text-slate-500 space-y-3 leading-relaxed border border-slate-200 absolute bottom-10 left-10 right-10">
                  <p><strong>PAYMENT TERMS:</strong> Thank you for your business. Please remit payment via Check or Credit Card. Credit card transactions may be subject to a 3% processing fee. A mechanic's lien may be executed for failure to remit final payment within 30 days of completion.</p>
                  <p><strong>REMIT TO:</strong> Pilar Home Services Inc., Accounting Dept, 123 Corporate Blvd, Ste 100, Miami, FL 33132</p>
               </div>
               
            </div>
         </div>
      </div>
   );
}
