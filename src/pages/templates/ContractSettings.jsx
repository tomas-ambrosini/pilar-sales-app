import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getActiveContractTemplate } from '../../utils/contracts/getActiveContractTemplate';
import { normalizeContractTemplate } from '../../utils/contracts/normalizeContractTemplate';
import { Loader2, Save, FileText, Plus, Trash2, ShieldCheck, Pen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContractSettings() {
    const [templateId, setTemplateId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // UI Form State
    const [titleLegalSection, setTitleLegalSection] = useState('');
    const [titleUnitSection, setTitleUnitSection] = useState('');
    const [terms, setTerms] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [signatureName, setSignatureName] = useState('');

    useEffect(() => {
        let isMounted = true;
        getActiveContractTemplate().then(rawTemplate => {
            if (!isMounted) return;
            if (rawTemplate) setTemplateId(rawTemplate.id);
            const normalized = normalizeContractTemplate(rawTemplate);
            
            setTitleLegalSection(normalized.sectionTitles.legal);
            setTitleUnitSection(normalized.sectionTitles.unitInfo);
            setTerms(normalized.terms);
            setMaterials(normalized.materials);
            setSignatureName(normalized.companySignatureName);
            
            setIsLoading(false);
        });
        return () => { isMounted = false; };
    }, []);

    const handleSave = async () => {
        if (!templateId) return toast.error("No active template found to update.");
        
        setIsSaving(true);
        try {
            const payload = {
                title_legal_section: titleLegalSection,
                title_unit_section: titleUnitSection,
                terms: terms.filter(t => t.trim() !== ''),
                materials: materials.filter(m => m.trim() !== ''),
                company_signature_name: signatureName
            };
            
            const { error } = await supabase.from('contract_templates').update(payload).eq('id', templateId);
            if (error) throw error;
            toast.success("Contract settings saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update contract settings.");
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
                        <FileText className="text-primary-600" size={32} />
                        Contract Boilerplate
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Manage the legal boilerplate, section headers, and default terms for all sales proposals.
                    </p>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-lg font-bold shadow transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Boilerplate
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <Pen className="text-indigo-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">1. Layout Headers</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Equipment Section Title</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-bold tracking-tight focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={titleUnitSection} onChange={e => setTitleUnitSection(e.target.value)} placeholder="e.g. Unit Info" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Terms Section Title</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-bold tracking-tight focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={titleLegalSection} onChange={e => setTitleLegalSection(e.target.value)} placeholder="e.g. Exclusions / Legal:" />
                        </div>
                    </div>
                </div>

                <div className="p-8 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">2. Default Materials / Exclusions</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">These items will always appear under the "Materials & Labor" section for all standard proposals.</p>
                    
                    <div className="space-y-3">
                        {materials.map((mat, i) => (
                            <div key={i} className="flex gap-3">
                                <input className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={mat} onChange={e => { const mats = [...materials]; mats[i] = e.target.value; setMaterials(mats); }} />
                                <button onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"><Trash2 size={20} /></button>
                            </div>
                        ))}
                        <button onClick={() => setMaterials([...materials, ''])} className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors w-fit"><Plus size={16} /> Add Material Line</button>
                    </div>
                </div>

                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="text-slate-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">3. Legal Boilerplate & Terms</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">Each text block represents a distinct paragraph bullet in the final contract rendering.</p>
                    
                    <div className="space-y-4">
                        {terms.map((trm, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <textarea className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none leading-relaxed min-h-[100px] resize-y" value={trm} onChange={e => { const ts = [...terms]; ts[i] = e.target.value; setTerms(ts); }} placeholder="Enter a new legal clause or term..." />
                                <button onClick={() => setTerms(terms.filter((_, idx) => idx !== i))} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"><Trash2 size={20} /></button>
                            </div>
                        ))}
                        <button onClick={() => setTerms([...terms, ''])} className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors w-fit !mt-6"><Plus size={16} /> Add Legal Paragraph</button>
                    </div>
                </div>

                <div className="p-8 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-6">
                        <Pen className="text-primary-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">4. Signature Watermark</h2>
                    </div>
                    
                    <div className="max-w-md">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Countersign Stamp</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-[cursive] text-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all" value={signatureName} onChange={e => setSignatureName(e.target.value)} />
                        <p className="text-xs text-slate-400 mt-2">This text appears diagonally across the company signature block on the contract representing internal authorization.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
