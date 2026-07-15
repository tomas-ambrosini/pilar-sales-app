import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomers } from '../context/CustomerContext';
import { useRole } from '../context/RoleContext';
import { supabase } from '../supabaseClient';
import SlideDrawer from '../components/SlideDrawer';
import { 
  Edit2, Trash2, MapPin, Tag, Shield, Phone, Mail, 
  Box, Settings, Clock, Activity, Zap, FileText, 
  ChevronRight, Calendar, User as UserIcon, CalendarClock
} from 'lucide-react';

function ActivityTimeline({ householdId }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('household_id', householdId)
                .order('created_at', { ascending: false });
            if (!error && data) {
                setLogs(data);
            }
            setLoading(false);
        };
        fetchLogs();
    }, [householdId]);

    if (loading) return <div className="p-4 text-center text-slate-500 text-sm">Loading audit history...</div>;
    if (logs.length === 0) return <div className="p-4 text-center text-slate-500 text-sm">No activity recorded yet.</div>;

    return (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start relative pb-4 border-l-2 border-slate-100 ml-4 pl-4 last:border-transparent">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-primary-500 shadow-sm"></div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{log.activity_type}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 leading-relaxed">{log.description}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function UnitDetailView({ unit, address }) {
   const { canViewFinancials } = useRole();
   const brandMatch = unit.brand || unit.description?.split(' ')[0];
   const tonsMatch = unit.tonnage ? [unit.tonnage] : unit.description?.match(/(\d+(\.\d+)?)\s*Ton/i);
   const seerMatch = unit.seer ? [unit.seer] : unit.description?.match(/(\d+(\.\d+)?)\s*SEER/i);

   return (
       <div className="p-6 space-y-8">
           <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
               <div className="absolute right-0 top-0 w-32 h-full bg-primary-500/10 rounded-l-full"></div>
               <div className="relative z-10 flex items-center gap-4">
                   <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                       <Box size={28} className="text-white" />
                   </div>
                   <div>
                       <div className="flex items-center gap-3 mb-1">
                           <h2 className="text-2xl font-black tracking-tight">{unit.unit_number}</h2>
                           <span className="bg-slate-800 border border-slate-600 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest">{unit.system_type || 'System'}</span>
                       </div>
                       <p className="text-white/80 font-medium flex items-center gap-2 text-sm"><MapPin size={14}/> {address?.street_address}</p>
                   </div>
               </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Technical Description</h3>
                   <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm min-h-[100px]">{unit.description || 'No description provided.'}</p>
                </div>
                
                <div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">System Specs</h3>
                   <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                           <span className="text-sm font-bold text-slate-600">Brand</span>
                           <span className="text-sm font-bold text-slate-800">{brandMatch || 'N/A'}</span>
                       </div>
                       <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                           <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Activity size={14} className="text-indigo-500"/> Tonnage</span>
                           <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{tonsMatch ? tonsMatch[0] : 'N/A'}</span>
                       </div>
                       <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                           <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5"><Zap size={14} className="text-emerald-500"/> Efficiency</span>
                           <span className="text-sm font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{seerMatch ? seerMatch[0] : 'N/A'}</span>
                       </div>
                   </div>
                </div>
           </div>

           <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Equipment Data</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model</span>
                       <span className="text-sm font-mono font-black text-slate-800 truncate" title={unit.model_number}>{unit.model_number || 'N/A'}</span>
                   </div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial</span>
                       <span className="text-sm font-mono font-black text-slate-800 truncate" title={unit.serial_number}>{unit.serial_number || 'N/A'}</span>
                   </div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Install Date</span>
                       <span className="text-sm font-black text-slate-800">{unit.install_date ? new Date(unit.install_date).toLocaleDateString() : 'Unknown'}</span>
                   </div>
                   <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center gap-1">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filter</span>
                       <span className="text-sm font-black text-slate-800">{unit.filter_size || 'N/A'}</span>
                   </div>
                </div>
           </div>

           <div>
              <div className="flex justify-between items-center mb-4">
                 <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2"><FileText size={18} className="text-primary-500"/> Clinical History</h2>
                 <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{unit.history?.length || 0} Events</span>
              </div>
              
              {unit.history && unit.history.length > 0 ? (
                 <div className="relative border-l-2 border-slate-100 ml-4 my-4 space-y-6 py-2">
                    {[...unit.history].reverse().map(event => (
                       <div key={event.id} className="relative pl-6">
                           <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${event.type === 'Maintenance' ? 'bg-amber-400' : event.type === 'Installation' ? 'bg-success-500' : 'bg-primary-500'}`}></div>
                           <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                     <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${event.type === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' : event.type === 'Installation' ? 'bg-success-50 text-success-700 border-success-200' : 'bg-primary-50 text-primary-700 border-primary-200'}`}>
                                        {event.type}
                                     </span>
                                     <span className="text-xs font-bold text-slate-400">{new Date(event.date).toLocaleDateString()}</span>
                                  </div>
                                  {event.cost && <span className="font-black text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">{canViewFinancials() ? \`$\${parseFloat(event.cost).toLocaleString('en-US', {minimumFractionDigits: 2})}\` : '***'}</span>}
                               </div>
                               <p className="text-slate-600 text-sm mt-2 font-medium line-clamp-3">{event.description}</p>
                               {event.technician && <div className="text-[10px] font-bold text-slate-400 mt-3 flex items-center gap-1 uppercase tracking-wider"><UserIcon size={10}/> Tech: {event.technician}</div>}
                           </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="p-8 flex flex-col items-center justify-center text-center bg-slate-50 rounded-xl border border-slate-200">
                     <Clock size={24} className="text-slate-300 mb-2"/>
                     <p className="text-slate-500 font-bold">No Service History</p>
                 </div>
              )}
           </div>
       </div>
   );
}


export default function CustomerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { customers, updateCustomer, deleteCustomer } = useCustomers();
  
  const customer = customers.find(c => c.id === id);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedProperty, setExpandedProperty] = useState(null);
  
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isUnitDrawerOpen, setIsUnitDrawerOpen] = useState(false);

  useEffect(() => {
     if (customer && customer.locations?.length > 0 && !expandedProperty) {
         setExpandedProperty(customer.locations[0].id);
     }
  }, [customer, expandedProperty]);

  if (!customer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <h3 className="text-slate-600 font-bold">Loading Customer Data...</h3>
      </div>
    );
  }

  const handleDelete = () => {
     if (window.confirm(\`Are you sure you want to delete \${customer.name}?\`)) {
         deleteCustomer(customer.id);
         navigate('/customers');
     }
  };

  const parseSpecs = (desc) => {
      if (!desc) return [];
      const specs = [];
      const tonsMatch = desc.match(/(\d+(\.\d+)?)\s*Ton/i);
      const seerMatch = desc.match(/(\d+(\.\d+)?)\s*SEER/i);
      if (tonsMatch) specs.push({ label: tonsMatch[0], icon: <Activity size={12}/>, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' });
      if (seerMatch) specs.push({ label: seerMatch[0], icon: <Zap size={12}/>, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
      return specs;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* LEFT SIDEBAR (w-1/4, fixed context) */}
      <div className="w-1/4 h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60 p-6 flex flex-col fixed z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
         <button onClick={() => navigate('/customers')} className="flex items-center gap-1 text-slate-500 hover:text-primary-600 text-sm font-bold transition-colors mb-8">
            <ChevronRight size={16} className="rotate-180" /> Back to Directory
         </button>

         <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-primary-500/20">
               {customer.name.charAt(0)}
            </div>
            <div>
               <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{customer.name}</h1>
               {customer.active_maintenance_agreement && (
                   <span className="mt-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-widest flex items-center gap-1 w-max">
                       <Shield size={10} /> VIP Member
                   </span>
               )}
            </div>
         </div>

         {customer.tags && customer.tags.length > 0 && (
             <div className="flex flex-wrap gap-1.5 mb-6">
               {customer.tags.map(tag => (
                 <span key={tag} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest flex items-center gap-1"><Tag size={10}/> {tag}</span>
               ))}
             </div>
         )}

         <div className="space-y-4 mb-8">
             <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                     <Phone size={14} className="text-slate-400" />
                 </div>
                 <div className="pt-1.5 text-sm font-medium text-slate-700">{customer.phone || 'No phone'}</div>
             </div>
             <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                     <Mail size={14} className="text-slate-400" />
                 </div>
                 <div className="pt-1.5 text-sm font-medium text-slate-700 break-all">{customer.email || 'No email'}</div>
             </div>
             <div className="flex items-start gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                     <MapPin size={14} className="text-slate-400" />
                 </div>
                 <div className="pt-1.5 text-sm font-medium text-slate-700">{customer.address || 'No primary address'}</div>
             </div>
         </div>

         <div className="mt-auto space-y-3 pt-6 border-t border-slate-100">
             <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm">
                 <Edit2 size={16} /> Edit Profile
             </button>
             <button onClick={handleDelete} className="w-full py-2.5 bg-white border border-red-100 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                 <Trash2 size={16} /> Delete Customer
             </button>
         </div>
      </div>

      {/* MAIN CANVAS (w-3/4) */}
      <div className="w-3/4 h-full ml-[25%] p-10 overflow-y-auto">
          {/* TABS */}
          <div className="flex gap-2 p-1.5 bg-slate-200/50 rounded-xl w-max mb-8 backdrop-blur-sm">
              {['overview', 'properties', 'financials'].map(tab => (
                 <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={\`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all \${activeTab === tab ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                 >
                    {tab === 'properties' ? 'Properties & Assets' : tab === 'financials' ? 'Financials & Deals' : tab}
                 </button>
              ))}
          </div>

          <div className="max-w-5xl">
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Clock size={20} className="text-primary-500" /> Activity Overview</h2>
                      <ActivityTimeline householdId={customer.id} />
                  </div>
              )}

              {/* TAB 2: PROPERTIES & ASSETS */}
              {activeTab === 'properties' && (
                  <div className="space-y-6">
                      {(customer.locations || []).map((loc, idx) => {
                          const isExpanded = expandedProperty === loc.id;
                          return (
                              <div key={loc.id} className={\`bg-white rounded-2xl border transition-all duration-300 overflow-hidden \${isExpanded ? 'border-primary-300 shadow-md ring-4 ring-primary-50' : 'border-slate-200 shadow-sm hover:border-primary-200'}\`}>
                                  {/* Property Header */}
                                  <div 
                                     onClick={() => setExpandedProperty(isExpanded ? null : loc.id)}
                                     className="p-6 flex items-center justify-between cursor-pointer group bg-gradient-to-r from-white to-slate-50/50"
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className={\`w-12 h-12 rounded-full flex items-center justify-center transition-colors \${isExpanded ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500'}\`}>
                                              <MapPin size={20} />
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2 mb-1">
                                                  <h3 className="text-lg font-black text-slate-800">{loc.street_address}</h3>
                                                  {loc.is_primary_residence && <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Primary</span>}
                                              </div>
                                              <p className="text-sm font-medium text-slate-500">{loc.city}, {loc.state} {loc.zip}</p>
                                          </div>
                                      </div>
                                      <ChevronRight size={20} className={\`text-slate-400 transition-transform duration-300 \${isExpanded ? 'rotate-90 text-primary-500' : ''}\`} />
                                  </div>

                                  {/* Expanded Content: Property Details & Units */}
                                  {isExpanded && (
                                      <div className="px-6 pb-6 border-t border-slate-100 bg-slate-50/30">
                                          
                                          {/* Property Details Ribbon */}
                                          <div className="flex flex-wrap gap-6 py-4 mb-2">
                                              <div className="flex flex-col">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year Built</span>
                                                  <span className="text-sm font-bold text-slate-700">{loc.property_details?.year_built || 'Unknown'}</span>
                                              </div>
                                              <div className="flex flex-col">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sq Footage</span>
                                                  <span className="text-sm font-bold text-slate-700">{loc.property_details?.sq_footage || 'Unknown'}</span>
                                              </div>
                                              <div className="flex flex-col">
                                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Type</span>
                                                  <span className="text-sm font-bold text-slate-700">{loc.property_details?.system_type || 'Unknown'}</span>
                                              </div>
                                              {!loc.is_primary_residence && loc.property_details?.tenant_name && (
                                                  <div className="flex flex-col border-l border-slate-200 pl-6 ml-auto">
                                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tenant</span>
                                                      <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><UserIcon size={14} className="text-slate-400"/> {loc.property_details.tenant_name}</span>
                                                  </div>
                                              )}
                                          </div>

                                          <div className="h-px w-full bg-slate-100 mb-6"></div>

                                          {/* Units Grid */}
                                          <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2"><Box size={16} className="text-primary-500"/> Installed Equipment</h4>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              {loc.property_details?.units && loc.property_details.units.length > 0 ? (
                                                  loc.property_details.units.map(unit => {
                                                      const badges = parseSpecs(unit.description);
                                                      return (
                                                          <div 
                                                              key={unit.id} 
                                                              onClick={() => { setSelectedUnit({ unit, address: loc }); setIsUnitDrawerOpen(true); }}
                                                              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                                          >
                                                              <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-primary-400 transition-colors"></div>
                                                              <div className="flex justify-between items-start mb-3">
                                                                  <div>
                                                                      <h5 className="font-extrabold text-slate-800">Unit {unit.unit_number}</h5>
                                                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{unit.system_type || 'Unknown System'}</p>
                                                                  </div>
                                                                  <div className="bg-slate-50 text-slate-400 group-hover:text-primary-500 group-hover:bg-primary-50 p-1.5 rounded-full transition-colors">
                                                                      <ChevronRight size={16} />
                                                                  </div>
                                                              </div>
                                                              {badges.length > 0 && (
                                                                  <div className="flex flex-wrap gap-2 mb-3">
                                                                      {badges.map((b, i) => (
                                                                          <span key={i} className={\`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border \${b.color}\`}>
                                                                              {b.icon} {b.label}
                                                                          </span>
                                                                      ))}
                                                                  </div>
                                                              )}
                                                              <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-50">
                                                                  <Clock size={12} className="text-slate-300"/> 
                                                                  {unit.history?.length || 0} Events Logged
                                                              </div>
                                                          </div>
                                                      );
                                                  })
                                              ) : (
                                                  <div className="col-span-full py-8 text-center bg-white border border-slate-200 border-dashed rounded-xl">
                                                      <p className="text-sm font-medium text-slate-500">No equipment units recorded for this property.</p>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          );
                      })}
                      {(!customer.locations || customer.locations.length === 0) && (
                          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                              <p className="text-slate-500 font-medium">No properties associated with this customer.</p>
                          </div>
                      )}
                  </div>
              )}

              {/* TAB 3: FINANCIALS & DEALS */}
              {activeTab === 'financials' && (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[400px]">
                      <FileText size={48} className="text-slate-200 mb-4" />
                      <h3 className="text-xl font-bold text-slate-700 mb-2">Financials & Deals View</h3>
                      <p className="text-slate-500 text-center max-w-md">The financial dashboard has been requested but is pending the final integration with the proposals module.</p>
                  </div>
              )}
          </div>
      </div>

      {/* UNIT DETAILS DRAWER */}
      <SlideDrawer
          isOpen={isUnitDrawerOpen}
          onClose={() => { setIsUnitDrawerOpen(false); setTimeout(() => setSelectedUnit(null), 300); }}
          title={selectedUnit ? \`Unit \${selectedUnit.unit.unit_number} Details\` : 'Unit Details'}
          width="max-w-2xl"
      >
          {selectedUnit && <UnitDetailView unit={selectedUnit.unit} address={selectedUnit.address} />}
      </SlideDrawer>
    </div>
  );
}
