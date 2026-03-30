import React, { useState } from 'react';
import { Megaphone, Search, Calendar as CalendarIcon, FileText, BarChart2, Plus, Users, Target, CheckCircle, TrendingUp } from 'lucide-react';
import './Proposals.css'; // Reuse utility classes

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('campaigns');

  const campaigns = [
    { id: 1, name: 'Spring AC Tune-Up', platform: 'Facebook Ads', status: 'Active', budget: '$1,200', spent: '$450', leads: 24, cpl: '$18.75' },
    { id: 2, name: 'Local SEO Landing Page', platform: 'Google Search', status: 'Active', budget: '$800', spent: '$620', leads: 41, cpl: '$15.12' },
    { id: 3, name: 'Angi.com Lead Gen', platform: 'Angi', status: 'Paused', budget: '$500', spent: '$500', leads: 12, cpl: '$41.66' },
  ];

  const renderTabContent = () => {
    if (activeTab === 'campaigns') {
      return (
        <div className="fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
              <BarChart2 className="text-primary-500" /> Active Campaigns
            </h2>
            <button className="primary-action-btn py-1 px-3 text-sm">
              <Plus size={16} /> New Campaign
            </button>
          </div>
          <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse" style={{ width: '100%' }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-500">
                  <th className="p-4 font-semibold">Campaign Name</th>
                  <th className="p-4 font-semibold">Platform</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold mt-1">Budget / Spent</th>
                  <th className="p-4 font-semibold">Leads</th>
                  <th className="p-4 font-semibold">Cost Per Lead</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-800">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.platform}</td>
                    <td className="p-4">
                      <span className={`badge ${c.status === 'Active' ? 'bg-success text-white px-2 py-1 rounded' : 'bg-slate-200 text-slate-700 px-2 py-1 rounded'} text-xs font-bold`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{c.spent} <span className="text-slate-400 text-sm">/ {c.budget}</span></td>
                    <td className="p-4 font-medium text-primary-600">{c.leads}</td>
                    <td className="p-4 text-slate-600 font-mono">{c.cpl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-6">
            <div className="glass-panel p-6 flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Ad Spend (MTD)</span>
              <span className="text-3xl font-bold text-slate-800">$1,570</span>
              <span className="text-sm text-success flex items-center"><TrendingUp size={14} className="mr-1" /> +12% from last month</span>
            </div>
            <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Leads Acquired</span>
               <span className="text-3xl font-bold text-slate-800">77</span>
               <span className="text-sm text-success flex items-center"><TrendingUp size={14} className="mr-1" /> +5% from last month</span>
            </div>
             <div className="glass-panel p-6 flex flex-col gap-2">
               <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Avg Cost Per Lead</span>
               <span className="text-3xl font-bold text-slate-800">$20.38</span>
               <span className="text-sm text-success flex items-center">-8% from last month</span>
            </div>
          </div>
        </div>
      );
    }
    
    if (activeTab === 'calendar') {
      return (
        <div className="fade-in bg-white rounded-md shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
              <CalendarIcon className="text-primary-500" /> Content Calendar (Oct 2023)
            </h2>
             <button className="primary-action-btn py-1 px-3 text-sm">
              <Plus size={16} /> Schedule Post
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-slate-500 mb-2">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Mock Calendar Grid */}
            {Array.from({length: 31}).map((_, i) => (
              <div key={i} className={`h-24 border rounded-md p-1 relative ${i === 24 ? 'border-primary-400 bg-primary-50' : 'border-slate-100 bg-slate-50'}`}>
                <span className={`block text-right text-xs font-semibold ${i === 24 ? 'text-primary-700' : 'text-slate-400'}`}>{i + 1}</span>
                {i === 2 && <div className="mt-1 bg-blue-100 text-blue-700 text-xs p-1 rounded leading-tight">FB: Heating Prep</div>}
                {i === 14 && <div className="mt-1 bg-purple-100 text-purple-700 text-xs p-1 rounded leading-tight">IG: Install Reel</div>}
                {i === 24 && <div className="mt-1 bg-green-100 text-green-700 text-xs p-1 rounded leading-tight font-bold">Blog: Energy Tips</div>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'templates') {
      return (
        <div className="fade-in grid grid-cols-2 gap-6">
          <div className="glass-panel p-6 border border-slate-200 hover:border-primary-300 transition-fast cursor-pointer">
            <Target size={32} className="text-primary-500 mb-4" />
            <h3 className="font-bold text-lg text-slate-800 mb-2">Market Research Framework</h3>
            <p className="text-slate-500 text-sm mb-4">Templates for analyzing local competitors, commercial properties, and residential demographics in the target service areas.</p>
            <button className="text-primary-600 font-semibold text-sm flex items-center">Open Template <ChevronRight size={16} /></button>
          </div>
          
          <div className="glass-panel p-6 border border-slate-200 hover:border-primary-300 transition-fast cursor-pointer">
            <Users size={32} className="text-primary-500 mb-4" />
            <h3 className="font-bold text-lg text-slate-800 mb-2">Brand Vision Board</h3>
            <p className="text-slate-500 text-sm mb-4">Pilar Home branding guidelines, logo assets, typography, and visual identity for all external communications.</p>
            <button className="text-primary-600 font-semibold text-sm flex items-center">Open Assets <ChevronRight size={16} /></button>
          </div>

          <div className="glass-panel p-6 border border-slate-200 hover:border-primary-300 transition-fast cursor-pointer">
            <Megaphone size={32} className="text-primary-500 mb-4" />
            <h3 className="font-bold text-lg text-slate-800 mb-2">Lead Acquisition Strategies</h3>
            <p className="text-slate-500 text-sm mb-4">Tactics for partnerships, sponsorships, and networking events (e.g., Malls, Property Managers, Angi).</p>
            <button className="text-primary-600 font-semibold text-sm flex items-center">Open Doc <ChevronRight size={16} /></button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="page-container fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Marketing</h1>
          <p className="page-subtitle">Manage campaigns, content strategy, and brand acquisition</p>
        </div>
      </header>
      
      {/* Custom Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-max mb-8">
        <button 
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'campaigns' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Campaign Tracker
        </button>
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'calendar' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Content Calendar
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 font-semibold text-sm rounded-md transition-fast ${activeTab === 'templates' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Research & Templates
        </button>
      </div>

      <div className="mt-4">
        {renderTabContent()}
      </div>
    </div>
  );
}
