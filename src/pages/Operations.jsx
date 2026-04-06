import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, CheckCircle, Activity, Laptop, HardDrive, AlertTriangle, User, DollarSign, ActivityIcon, Eye, Zap, CheckSquare, XCircle, FileText } from 'lucide-react';
import { evaluateDealHealth } from '../utils/pricing';
import Modal from '../components/Modal';

export default function Operations() {
  const [activeTab, setActiveTab] = useState('approval');
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // IT Dashboard mocks
  const devices = [
    { id: 'TAB-012', user: 'Alex Rivera', type: 'iPad Pro', status: 'Online', battery: '85%' },
    { id: 'TAB-013', user: 'David Chen', type: 'iPad Air', status: 'Offline', battery: '12%' }
  ];

  useEffect(() => {
    fetchWonDeals();
    
    // Setup Realtime Subscription
    const channel = supabase.channel('realtime_ops_deals')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities', filter: "status=eq.Deal Won" }, payload => {
            fetchWonDeals();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, []);

  const fetchWonDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          id,
          household_id,
          status,
          proposal_data,
          dispatch_notes,
          created_at,
          households (
            id,
            household_name
          )
        `)
        .eq('status', 'Deal Won')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Filter out deals that are already manager approved 
        // We use proposal_data->manager_approved as a soft flag
        const pendingDeals = data.filter(d => !d.proposal_data?.manager_approved);
        setDeals(pendingDeals);
      }
    } catch (err) {
      console.error("Error fetching deals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDeal = async () => {
    if (!selectedDeal) return;
    
    // 1. Get the payload elements from the Selected Deal
    const tierKey = selectedDeal.proposal_data?.selected_tier || 'best';
    const tierData = selectedDeal.proposal_data?.tiers?.[tierKey] || {};
    const signatureData = selectedDeal.proposal_data?.signature;
    const householdId = selectedDeal.household_id;

    const updatedProposalData = {
        ...selectedDeal.proposal_data,
        manager_approved: true
    };

    // 2. Generate the Work Order ONLY upon Manager Approval
    const { error: woError } = await supabase.from('work_orders').insert({
        opportunity_id: selectedDeal.id,
        household_id: householdId,
        status: 'Unscheduled',
        execution_payload: { tierName: tierKey, ...tierData, signature: signatureData },
        dispatch_notes: selectedDeal.dispatch_notes || "Operations approved deal. Awaiting dispatch."
    });

    if (woError) {
        console.error("Failed to generate Work Order:", woError);
        return;
    }

    // 3. Mark the Opportunity as Approved
    const { error } = await supabase
        .from('opportunities')
        .update({ proposal_data: updatedProposalData })
        .eq('id', selectedDeal.id);

    if (!error) {
        setDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
        setSelectedDeal(null);
    } else {
        console.error("Failed to approve opportunity:", error);
    }
  };

  const handleRejectDeal = async () => {
      // Moves it back to Proposal Sent for rework
      if (!selectedDeal) return;
      const { error } = await supabase
        .from('opportunities')
        .update({ status: 'Proposal Sent' })
        .eq('id', selectedDeal.id);
        
      if (!error) {
        setDeals(prev => prev.filter(d => d.id !== selectedDeal.id));
        setSelectedDeal(null);
      }
  };

  const renderApprovalQueue = () => {
    return (
      <div className="fade-in bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Shield size={18} className="text-primary-600" /> Manager Approval Queue
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review profitability and margins before ops dispatch.</p>
            </div>
            <div className="bg-white px-3 py-1 rounded text-sm font-bold border border-slate-200 text-slate-600 shadow-sm">
                {deals.length} Pending
            </div>
        </div>
        
        {loading ? (
            <div className="p-12 text-center text-slate-400">Loading deals...</div>
        ) : deals.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400 bg-white">
                <CheckCircle size={48} className="mb-4 text-emerald-200" />
                <h4 className="text-lg font-bold text-slate-600 mb-1">Queue is Empty</h4>
                <p className="text-sm">All won deals have been reviewed and approved.</p>
            </div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-200">
                            <th className="p-3 pl-4">Customer ID / Date</th>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Tier Sold</th>
                            <th className="p-3">Sold Price</th>
                            <th className="p-3 text-right pr-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {deals.map(deal => {
                            // Extract selected tier from proposal_data if possible
                            // Assume salesperson marked a tier as "selected_tier" or default to 'Best' visually if not marked
                            const tierKey = deal.proposal_data?.selected_tier || 'best';
                            const tierData = deal.proposal_data?.tiers?.[tierKey];
                            
                            const price = tierData?.salesPrice || 0;
                            const brand = tierData?.brand || 'Unknown';
                            
                            return (
                                <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 pl-4">
                                        <div className="font-mono text-xs text-slate-500">{deal.id.substring(0,8).toUpperCase()}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{new Date(deal.created_at).toLocaleDateString()}</div>
                                    </td>
                                    <td className="p-3 font-semibold text-slate-800 text-sm">
                                        {deal.households?.household_name || 'Unknown'}
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs font-bold text-slate-700 capitalize">{tierKey} - {brand}</div>
                                    </td>
                                    <td className="p-3 font-black text-slate-800">
                                        ${price.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-right pr-4">
                                        <button 
                                            onClick={() => setSelectedDeal(deal)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded text-xs font-bold hover:bg-primary-100 transition-colors"
                                        >
                                            <Eye size={14} /> X-Ray View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    );
  };

  const renderITTab = () => (
    <div className="fade-in grid grid-cols-2 gap-6">
        <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">Fleet & Device Management</h3>
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
  );

  // Modal X-Ray logic
  let xRayFlags = { netMarginPercent: 0, netMarginDollars: 0, isBelowPAR: false, isFlagged: false };
  let mockHardCost = 0;
  let mockCommission = 0;
  let retailPrice = 0;
  let soldPrice = 0;

  if (selectedDeal) {
      const tierKey = selectedDeal.proposal_data?.selected_tier || 'best';
      const tierData = selectedDeal.proposal_data?.tiers?.[tierKey];
      
      soldPrice = tierData?.salesPrice || 0;
      
      // If the data isn't securely in proposal_data, mock it for demonstration as instructed
      mockHardCost = selectedDeal.proposal_data?.hardCosts || (soldPrice * 0.45);
      mockCommission = selectedDeal.proposal_data?.commission || (soldPrice * 0.05);
      retailPrice = selectedDeal.proposal_data?.retailPrice || (soldPrice * 1.05); // Assume sold at slight discount

      xRayFlags = evaluateDealHealth(soldPrice, retailPrice, mockHardCost, mockCommission);
  }

  return (
    <div className="page-container fade-in bg-slate-50 min-h-screen relative pb-10">
      <header className="page-header py-6">
        <div>
          <h1 className="page-title text-3xl">Operations & IT</h1>
          <p className="page-subtitle mt-1 text-slate-500">Service Manager Dashboard & Margin Approvals</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-200/50 p-1.5 rounded-lg w-max mb-8 shadow-inner border border-slate-200">
        <button 
          onClick={() => setActiveTab('approval')}
          className={`px-5 py-2 font-bold text-sm rounded transition-all ${activeTab === 'approval' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-2">
              Manager Approval Queue
              {deals.length > 0 && <span className="bg-primary-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{deals.length}</span>}
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('it')}
          className={`px-5 py-2 font-bold text-sm rounded transition-all ${activeTab === 'it' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-2">
            <Laptop size={14}/> IT Fleet Management
          </div>
        </button>
      </div>

      <div>
        {activeTab === 'approval' ? renderApprovalQueue() : renderITTab()}
      </div>

      {/* Margin X-Ray Modal */}
      <Modal isOpen={selectedDeal !== null} onClose={() => setSelectedDeal(null)} title={`Margin X-Ray: Deal #${selectedDeal?.id?.substring(0,8).toUpperCase()}`}>
          {selectedDeal && (
              <div className="flex flex-col h-full bg-slate-50 -mx-6 -mt-4 pb-0">
                  <div className="p-6 bg-white border-b border-slate-200">
                      <div className="flex justify-between items-start">
                          <div>
                              <h2 className="text-xl font-black text-slate-800 mb-1">{selectedDeal.households?.household_name}</h2>
                              <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5 ">
                                  <FileText size={14}/> 
                                  Tier Sold: <span className="text-primary-600 uppercase tracking-wide">{selectedDeal.proposal_data?.selected_tier || 'best'}</span>
                              </p>
                          </div>
                          {xRayFlags.isFlagged ? (
                              <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold shadow-sm">
                                  <AlertTriangle size={16} /> RED FLAG TRIGGERED
                              </div>
                          ) : (
                              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold shadow-sm">
                                  <CheckSquare size={16} /> Margins Healthy
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-6 grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Revenue Breakdown</h4>
                          
                          <div className="flex justify-between items-center bg-white p-3 rounded border border-slate-200 shadow-sm">
                              <span className="text-sm font-bold text-slate-600">Total Retail Price (PAR)</span>
                              <span className="font-mono text-slate-500">${retailPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          
                          <div className="flex justify-between items-center bg-primary-50 p-3 rounded border border-primary-200 shadow-sm">
                              <span className="text-sm font-black text-primary-800 flex items-center gap-1">
                                  Final Sold Price 
                                  {xRayFlags.isBelowPAR && <span className="bg-red-500 text-white text-[9px] px-1 rounded ml-2">BELOW PAR</span>}
                              </span>
                              <span className="font-mono font-black text-xl text-primary-700">${soldPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="text-[10px] text-right text-slate-400 -mt-2">Customer Contract Amount</div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Cost Breakdown (Hidden)</h4>
                          
                          <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-slate-600">Equipment Hard Costs</span>
                              <span className="font-mono text-danger">-${mockHardCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-sm font-bold text-slate-600">Salesperson Commission</span>
                              <span className="font-mono text-danger">-${mockCommission.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          
                          <div className={`mt-4 flex justify-between items-center p-4 rounded-lg shadow-inner ${xRayFlags.isFlagged ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                              <div>
                                  <span className={`block text-xs font-black uppercase tracking-widest mb-1 ${xRayFlags.isFlagged ? 'text-red-800' : 'text-green-800'}`}>True Net Margin</span>
                                  <span className={`text-2xl font-black ${xRayFlags.isFlagged ? 'text-red-600' : 'text-green-600'}`}>
                                      {(xRayFlags.netMarginPercent * 100).toFixed(1)}%
                                  </span>
                              </div>
                              <span className={`font-mono text-xl font-bold ${xRayFlags.isFlagged ? 'text-red-700' : 'text-green-700'}`}>
                                  ${xRayFlags.netMarginDollars.toLocaleString(undefined, {minimumFractionDigits: 2})}
                              </span>
                          </div>
                      </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto p-4 bg-white border-t border-slate-200 flex gap-4 justify-end">
                      <button onClick={() => setSelectedDeal(null)} className="px-6 py-2 rounded font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                          Cancel
                      </button>
                      <button onClick={handleRejectDeal} className="px-6 py-2 rounded font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                          <XCircle size={16} /> Reject to Sales
                      </button>
                      <button onClick={handleApproveDeal} className="px-8 py-2 rounded font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all">
                          <CheckSquare size={16} /> Approve Deal
                      </button>
                  </div>
              </div>
          )}
      </Modal>

    </div>
  );
}
