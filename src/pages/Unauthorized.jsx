import React from 'react';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';

const Unauthorized = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeRole, activeDepartment } = useRole();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-orange-500"></div>
                
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-red-100">
                    <AlertTriangle className="text-red-500" size={36} strokeWidth={2.5} />
                </div>
                
                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-3">Access Restricted</h1>
                
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    You don't have the necessary clearance to view this page. If you believe this is a mistake, please contact your system administrator.
                </p>
                
                <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left border border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Your Current Clearance</div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">User:</span>
                            <span className="text-sm font-bold text-slate-800">{user?.full_name || user?.email}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Department:</span>
                            <span className="text-xs font-bold px-2 py-1 bg-slate-200 text-slate-700 rounded-md">{activeDepartment}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Role:</span>
                            <span className="text-xs font-bold px-2 py-1 bg-primary-100 text-primary-700 rounded-md">{activeRole}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={16} /> Go Back
                    </button>
                    <button 
                        onClick={() => navigate('/')}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                    >
                        <Home size={16} /> Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
