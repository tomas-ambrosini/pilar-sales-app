import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { X, User, Phone, MapPin, Wrench, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { useNavigate } from 'react-router-dom';
import { formatCustomerName } from '../utils/formatters';

export default function NewServiceCallModal({ isOpen, onClose }) {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    
    const [formData, setFormData] = useState({
        household_id: '',
        call_type: 'MAINTENANCE',
        urgency: 'NORMAL',
        issue_description: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            setFormData({
                household_id: '',
                call_type: 'MAINTENANCE',
                urgency: 'NORMAL',
                issue_description: ''
            });
        }
    }, [isOpen]);

    const fetchCustomers = async () => {
        const { data } = await supabase.from('households').select('id, household_name, phone_number, primary_email').order('household_name');
        if (data) setCustomers(data);
    };

    const handleSave = async () => {
        if (!formData.household_id) {
            toast.error("Please select a customer.");
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase.from('service_calls').insert([{
                household_id: formData.household_id,
                call_type: formData.call_type,
                urgency: formData.urgency,
                issue_description: formData.issue_description,
                status: 'Pending'
            }]).select().single();

            if (error) throw error;
            
            toast.success("Service Call logged successfully!");
            onClose();
        } catch (error) {
            toast.error("Failed to save service call.");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Log New Service Call" 
            icon={<Wrench size={20} className="text-orange-500" />}
            size="md"
        >
            <div className="p-6 space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Customer</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-slate-400" size={16} />
                        <select 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                            value={formData.household_id}
                            onChange={e => setFormData({...formData, household_id: e.target.value})}
                        >
                            <option value="">Select a customer...</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{formatCustomerName(c.household_name)} {c.phone_number ? `(${c.phone_number})` : ''}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Call Type</label>
                        <select 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                            value={formData.call_type}
                            onChange={e => setFormData({...formData, call_type: e.target.value})}
                        >
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="REPAIR">Repair</option>
                            <option value="WARRANTY">Warranty</option>
                            <option value="DIAGNOSTIC">Diagnostic</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Urgency</label>
                        <select 
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all appearance-none"
                            value={formData.urgency}
                            onChange={e => setFormData({...formData, urgency: e.target.value})}
                        >
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High Priority</option>
                            <option value="EMERGENCY">Emergency</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Issue Description</label>
                    <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none min-h-[120px]"
                        placeholder="Describe the issue, symptoms, or customer requests..."
                        value={formData.issue_description}
                        onChange={e => setFormData({...formData, issue_description: e.target.value})}
                    />
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancel</button>
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="px-6 py-2.5 text-sm font-black text-white bg-orange-600 hover:bg-orange-700 shadow-sm rounded-xl transition-all flex items-center gap-2"
                >
                    <Save size={16} /> {saving ? 'Saving...' : 'Log Service Call'}
                </button>
            </div>
        </Modal>
    );
}
