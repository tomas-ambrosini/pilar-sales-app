import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getActiveContractTemplate } from '../utils/contracts/getActiveContractTemplate';
import { normalizeContractTemplate } from '../utils/contracts/normalizeContractTemplate';
import { Loader2, Save, FileText, Plus, Trash2, ShieldCheck, Pen, UploadCloud, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TemplateSettings() {
    const [templateId, setTemplateId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    
    // UI Form State
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [signatureName, setSignatureName] = useState('');
    
    const [logoUrl, setLogoUrl] = useState('');
    const [brandName, setBrandName] = useState('');
    const [titleLegalSection, setTitleLegalSection] = useState('');
    const [titleUnitSection, setTitleUnitSection] = useState('');
    
    const [terms, setTerms] = useState([]);
    const [materials, setMaterials] = useState([]);

    useEffect(() => {
        let isMounted = true;
        
        getActiveContractTemplate().then(rawTemplate => {
            if (!isMounted) return;
            
            if (rawTemplate) {
                 setTemplateId(rawTemplate.id);
            }
            
            const normalized = normalizeContractTemplate(rawTemplate);
            
            setName(normalized.companyInfo.name);
            setAddress(normalized.companyInfo.address);
            setPhone(normalized.companyInfo.phone);
            setEmail(normalized.companyInfo.email);
            setSignatureName(normalized.companySignatureName);
            setTerms(normalized.terms);
            setMaterials(normalized.materials);
            
            setLogoUrl(normalized.branding.logoUrl || '');
            setBrandName(normalized.branding.brandName);
            setTitleLegalSection(normalized.sectionTitles.legal);
            setTitleUnitSection(normalized.sectionTitles.unitInfo);
            
            setIsLoading(false);
        });

        return () => { isMounted = false; };
    }, []);

    const handleSave = async () => {
        if (!templateId) {
             toast.error("No active template found to update.");
             return;
        }
        
        // Basic non-empty checks
        if (!name.trim()) return toast.error("Company Name cannot be empty.");
        
        setIsSaving(true);
        try {
            const payload = {
                company_name: name,
                company_address: address,
                company_phone: phone,
                company_email: email,
                company_signature_name: signatureName,
                terms: terms.filter(t => t.trim() !== ''),
                materials: materials.filter(m => m.trim() !== ''),
                logo_url: logoUrl || null,
                brand_name: brandName,
                title_legal_section: titleLegalSection,
                title_unit_section: titleUnitSection
            };
            
            const { error } = await supabase
                .from('contract_templates')
                .update(payload)
                .eq('id', templateId);
                
            if (error) throw error;
            toast.success("Template settings saved! All new contracts will use these terms.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update template: " + (err.message || "Unknown error"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingLogo(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('brand-assets').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(fileName);
            setLogoUrl(publicUrl);
            toast.success("Logo uploaded successfully!");
        } catch (error) {
            toast.error("Failed to upload logo: " + error.message);
        } finally {
            setIsUploadingLogo(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center bg-slate-50 min-h-screen">
                <div className="flex flex-col items-center text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-4 text-primary-500" />
                    <p className="font-bold tracking-widest text-sm uppercase">Loading Template Configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-8 min-h-screen">
            {/* Page Header */}
            <div className="max-w-4xl mx-auto flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-primary-600" size={32} />
                        Contract Settings
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Manage the legal boilerplate and company identity for all generated Pilar sales proposals.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-lg font-bold shadow transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Template'}
                </button>
            </div>

            {/* Main Form Card */}
            <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-16">
                
                {/* 1. Header & Company Section */}
                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="text-primary-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">1. Company Identity</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name (Header)</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">License / Email</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="e.g. Lic #12345 or support@company.com"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Physical Address</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                            />
                        </div>
                        <div>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* 1b. Branding & Visuals Section */}
                <div className="p-8 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 mb-6">
                        <ImageIcon className="text-primary-600" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">Visual Branding</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-8 items-start">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Brand Text (Fallback)</label>
                            <input 
                                type="text"
                                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all mb-2"
                                value={brandName}
                                onChange={e => setBrandName(e.target.value)}
                                placeholder="e.g. PILAR HOME"
                            />
                            <p className="text-xs text-slate-400">Used strictly as a reliable text fallback if the logo image fails to load or is not provided.</p>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload Contract Logo</label>
                            <label className="flex items-center justify-center w-full h-24 px-4 transition bg-white border-2 border-slate-300 border-dashed rounded-xl cursor-pointer hover:border-primary-400 focus:outline-none relative overflow-hidden group">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Uploaded logo" className="h-full w-auto object-contain p-2 max-w-[200px]" />
                                ) : (
                                    <span className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-primary-500">
                                        {isUploadingLogo ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                                        <span className="text-xs font-bold">{isUploadingLogo ? 'Uploading Data...' : 'Drop image or click here'}</span>
                                    </span>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* 1c. Section Header Customization */}
                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <Pen className="text-indigo-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">Layout Headers</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Equipment Section Title</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-bold tracking-tight focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                value={titleUnitSection}
                                onChange={e => setTitleUnitSection(e.target.value)}
                                placeholder="e.g. Unit Info"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Terms Section Title</label>
                            <input 
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-bold tracking-tight focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                value={titleLegalSection}
                                onChange={e => setTitleLegalSection(e.target.value)}
                                placeholder="e.g. Exclusions / Legal:"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Standard Materials Section */}
                <div className="p-8 border-b border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldCheck className="text-emerald-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">2. Default Materials / Exclusions</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                        These items will always appear under the "Materials & Labor" section for all standard proposals.
                    </p>
                    
                    <div className="space-y-3">
                        {materials.map((mat, i) => (
                            <div key={i} className="flex gap-3">
                                <input 
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    value={mat}
                                    onChange={e => {
                                        const mats = [...materials];
                                        mats[i] = e.target.value;
                                        setMaterials(mats);
                                    }}
                                />
                                <button 
                                    onClick={() => setMaterials(materials.filter((_, idx) => idx !== i))}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => setMaterials([...materials, ''])}
                            className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors w-fit"
                        >
                            <Plus size={16} /> Add Material Line
                        </button>
                    </div>
                </div>

                {/* 3. Legal / Terms Section */}
                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="text-slate-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">3. Legal Boilerplate & Terms</h2>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                        Each text block represents a distinct paragraph bullet in the final contract rendering. Formatted appropriately for digital scroll.
                    </p>
                    
                    <div className="space-y-4">
                        {terms.map((trm, i) => (
                            <div key={i} className="flex gap-3 items-start">
                                <textarea 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none leading-relaxed min-h-[100px] resize-y"
                                    value={trm}
                                    onChange={e => {
                                        const ts = [...terms];
                                        ts[i] = e.target.value;
                                        setTerms(ts);
                                    }}
                                    placeholder="Enter a new legal clause or term..."
                                />
                                <button 
                                    onClick={() => setTerms(terms.filter((_, idx) => idx !== i))}
                                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => setTerms([...terms, ''])}
                            className="flex items-center gap-2 text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors w-fit !mt-6"
                        >
                            <Plus size={16} /> Add Legal Paragraph
                        </button>
                    </div>
                </div>

                {/* 4. Signature Sign-off */}
                <div className="p-8 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-6">
                        <Pen className="text-primary-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">4. Signature Watermark</h2>
                    </div>
                    
                    <div className="max-w-md">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Countersign Stamp</label>
                        <input 
                            type="text"
                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-[cursive] text-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                            value={signatureName}
                            onChange={e => setSignatureName(e.target.value)}
                        />
                        <p className="text-xs text-slate-400 mt-2">
                            This text appears diagonally across the company signature block on the contract representing internal authorization.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
