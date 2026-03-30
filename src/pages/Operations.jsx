import React, { useState } from 'react';
import { Settings, Server, Laptop, HardDrive, Shield, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import './Proposals.css';

export default function Operations() {
  const [activeTab, setActiveTab] = useState('kpi');

  const devices = [
    { id: 'TAB-012', user: 'Alex Rivera', type: 'iPad Pro', status: 'Online', battery: '85%' },
    { id: 'TAB-013', user: 'David Chen', type: 'iPad Air', status: 'Offline', battery: '12%' },
    { id: 'LAP-005', user: 'Sarah Miller', type: 'MacBook Air', status: 'Online', battery: '100%' },
  ];

  const tasks = [
    { id: 'TSK-92', title: 'Update SharePoint Permissions', assignee: 'IT Admin', status: 'In Progress', priority: 'High' },
    { id: 'TSK-93', title: 'Configure New Tech Tablet', assignee: 'Ops Manager', status: 'Pending', priority: 'Medium' },
    { id: 'TSK-94', title: 'Audit Password Manager Access', assignee: 'IT Admin', status: 'Completed', priority: 'Low' },
  ];

  const renderTabContent = () => {
    if (activeTab === 'kpi') {
      return (
        <div className="fade-in">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="glass-panel p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">System Uptime</span>
              <span className="text-3xl font-bold text-success flex items-center gap-2"><CheckCircle size={28} /> 99.9%</span>
              <span className="text-sm text-slate-500 mt-1">All Pilar Services operational.</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Active Devices</span>
               <span className="text-3xl font-bold text-slate-800 flex items-center gap-2"><Laptop size={28} className="text-primary-500" /> 14 / 15</span>
               <span className="text-sm text-danger flex items-center mt-1"><AlertTriangle size={14} className="mr-1" /> 1 Device Offline</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">SharePoint Storage</span>
               <span className="text-3xl font-bold text-slate-800 flex items-center gap-2"><HardDrive size={28} className="text-primary-500" /> 68%</span>
               <span className="text-sm text-slate-500 flex items-center mt-1">340 GB / 500 GB Used</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Security Alerts</span>
               <span className="text-3xl font-bold text-slate-800 flex items-center gap-2"><Shield size={28} className="text-primary-500" /> 0</span>
               <span className="text-sm text-success flex items-center mt-1">Network is secure.</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Internal Task Management</h3>
                <button className="text-sm font-semibold text-primary-600">Add Task</button>
              </div>
              <ul className="flex flex-col">
                {tasks.map(t => (
                  <li key={t.id} className="p-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-800">{t.title}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><User size={12}/> {t.assignee}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {t.priority === 'High' && <span className="text-xs font-bold text-danger bg-red-100 px-2 py-1 rounded">High</span>}
                      {t.priority === 'Medium' && <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Med</span>}
                      {t.status === 'Completed' ? 
                        <CheckCircle size={20} className="text-success" /> : 
                        <Clock size={20} className="text-slate-400" />
                      }
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-800">Fleet & Device Management</h3>
                <button className="text-sm font-semibold text-primary-600">View Map</button>
              </div>
              <ul className="flex flex-col">
                {devices.map(d => (
                  <li key={d.id} className="p-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold text-slate-800">{d.id} - {d.type}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><User size={12}/> {d.user}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {d.status === 'Online' ? 
                        <span className="text-xs font-bold text-success bg-green-100 px-2 py-1 rounded flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success"></div>Online</span> : 
                        <span className="text-xs font-bold text-danger bg-red-100 px-2 py-1 rounded flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-danger"></div>Offline</span>
                      }
                      <span className="text-sm text-slate-500 w-12 text-right">{d.battery}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'docs') {
      return (
        <div className="fade-in">
          <div className="empty-state glass-panel" style={{ padding: '4rem 2rem' }}>
            <Server size={48} style={{ color: 'var(--color-primary-500)', margin: '0 auto 1.5rem', opacity: 0.5 }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Cloud File Management</h2>
            <p style={{ color: 'var(--color-slate-500)', maxWidth: '500px', margin: '0 auto 2rem' }}>
              Access the centralized SharePoint document library for all company policies, HR forms, and technical manuals.
            </p>
            <button className="primary-action-btn max-w-xs mx-auto">Open SharePoint</button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Operations & IT</h1>
          <p className="page-subtitle">Internal systems, device management, and KPI tracking</p>
        </div>
        <button className="primary-action-btn">
          Manage Devices
        </button>
      </header>

      {/* Custom Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max mb-8">
        <button 
          onClick={() => setActiveTab('kpi')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'kpi' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Operations Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'docs' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Cloud File Library
        </button>
      </div>

      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
