import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getActiveContractTemplate } from '../../utils/contracts/getActiveContractTemplate';
import { normalizeContractTemplate } from '../../utils/contracts/normalizeContractTemplate';
import { Loader2, Save, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InvoiceSettings() {
    const [templateId, setTemplateId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // UI Form State
    const [invoiceMessage, setInvoiceMessage] = useState('');
    const [invoiceFooter, setInvoiceFooter] = useState('');
    const [invoicePaymentTerms, setInvoicePaymentTerms] = useState('');

    useEffect(() => {
        let isMounted = true;
        getActiveContractTemplate().then(rawTemplate => {
            if (!isMounted) return;
            if (rawTemplate) setTemplateId(rawTemplate.id);
            const normalized = normalizeContractTemplate(rawTemplate);
            
            setInvoiceMessage(normalized.invoiceMessage);
            setInvoiceFooter(normalized.invoiceFooter);
            setInvoicePaymentTerms(normalized.invoicePaymentTerms);
            
            setIsLoading(false);
        });
        return () => { isMounted = false; };
    }, []);

    const handleSave = async () => {
        if (!templateId) return toast.error("No active template found to update.");
        
        setIsSaving(true);
        try {
            const payload = {
                invoice_customer_message: invoiceMessage,
                invoice_footer_text: invoiceFooter,
                invoice_payment_terms: invoicePaymentTerms
            };
            
            const { error } = await supabase.from('contract_templates').update(payload).eq('id', templateId);
            if (error) throw error;
            toast.success("Invoice settings saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update invoice settings.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]">
                <Loader2 size={32} className="animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 pb-32">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Banknote className="text-primary-600" size={32} />
                        Invoice Boilerplate
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Manage the default messaging, payment terms, and footer formatting for all generated invoices.
                    </p>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-lg font-bold shadow transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Invoice Settings
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-8">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer Message</label>
                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none leading-relaxed min-h-[80px] resize-y" value={invoiceMessage} onChange={e => setInvoiceMessage(e.target.value)} placeholder="Thank you for your business..." />
                            <p className="text-xs text-slate-400 mt-2">Displayed below the line items on all generated invoices.</p>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Payment Terms (Optional)</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={invoicePaymentTerms} onChange={e => setInvoicePaymentTerms(e.target.value)} placeholder="e.g. Due upon receipt or Net 30" />
                            <p className="text-xs text-slate-400 mt-2">Clearly define when payment is expected. Shown directly below the customer message.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice Footer</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={invoiceFooter} onChange={e => setInvoiceFooter(e.target.value)} placeholder="e.g. Invoice generated by Pilar Sales Platform" />
                            <p className="text-xs text-slate-400 mt-2">Centered text block at the very bottom of the invoice document.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
