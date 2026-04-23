import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { getActiveContractTemplate } from '../../utils/contracts/getActiveContractTemplate';
import { normalizeContractTemplate } from '../../utils/contracts/normalizeContractTemplate';
import { Loader2, Save, FileText, UploadCloud, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GlobalBranding() {
    const [templateId, setTemplateId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    
    // UI Form State
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [brandName, setBrandName] = useState('');

    useEffect(() => {
        let isMounted = true;
        getActiveContractTemplate().then(rawTemplate => {
            if (!isMounted) return;
            if (rawTemplate) setTemplateId(rawTemplate.id);
            const normalized = normalizeContractTemplate(rawTemplate);
            
            setName(normalized.companyInfo.name);
            setAddress(normalized.companyInfo.address);
            setPhone(normalized.companyInfo.phone);
            setEmail(normalized.companyInfo.email);
            setLogoUrl(normalized.branding.logoUrl || '');
            setBrandName(normalized.branding.brandName);
            
            setIsLoading(false);
        });
        return () => { isMounted = false; };
    }, []);

    const handleSave = async () => {
        if (!templateId) return toast.error("No active template found to update.");
        if (!name.trim()) return toast.error("Company Name cannot be empty.");
        
        setIsSaving(true);
        try {
            const payload = {
                company_name: name,
                company_address: address,
                company_phone: phone,
                company_email: email,
                logo_url: logoUrl || null,
                brand_name: brandName
            };
            
            const { error } = await supabase.from('contract_templates').update(payload).eq('id', templateId);
            if (error) throw error;
            toast.success("Global branding saved!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to update branding.");
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
                        <ImageIcon className="text-primary-600" size={32} />
                        Global Branding
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">
                        Manage your company identity. These details will be used across all templates (Contracts, Invoices, etc).
                    </p>
                </div>
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-lg font-bold shadow transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Identity
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="text-primary-500" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">1. Company Contact Info</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name (Header)</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">License / Email</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. Lic #12345 or support@company.com" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Physical Address</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={address} onChange={e => setAddress(e.target.value)} />
                        </div>
                        <div>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none" value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50">
                    <div className="flex items-center gap-2 mb-6">
                        <ImageIcon className="text-primary-600" size={20} />
                        <h2 className="text-xl font-bold text-slate-800">2. Visual Branding</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-8 items-start">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Brand Text (Fallback)</label>
                            <input type="text" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none mb-2" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g. PILAR HOME" />
                            <p className="text-xs text-slate-400">Used strictly as a reliable text fallback if the logo image fails to load.</p>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Upload App Logo</label>
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
            </div>
        </div>
    );
}
