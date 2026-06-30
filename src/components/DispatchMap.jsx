import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabaseClient';
import { PIPELINE_STATES } from '../utils/pipelineControls';
import L from 'leaflet';
import { MapPin, Navigation, Clock, User, Phone, Zap } from 'lucide-react';

// Custom icons based on status
const createStatusIcon = (status, type, urgency) => {
    let bgColor = '#94a3b8'; // gray default
    let ringColor = 'transparent';

    if (status === 'En Route') {
        bgColor = '#eab308'; // yellow
    } else if (status === 'Working') {
        bgColor = '#3b82f6'; // blue
    } else if (status === 'Complete' || status === 'Completed') {
        bgColor = '#10b981'; // emerald
    } else if (status === PIPELINE_STATES.SCHEDULED || status === 'Scheduled') {
        bgColor = '#64748b'; // slate
    }

    if (urgency === 'EMERGENCY' || urgency === 'High') {
        ringColor = '#ef4444'; // red ring
    }

    const html = `
        <div style="
            width: 24px;
            height: 24px;
            background-color: ${bgColor};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            ${ringColor !== 'transparent' ? `box-shadow: 0 0 0 4px ${ringColor}, 0 4px 6px -1px rgba(0,0,0,0.3);` : ''}
        ">
            ${type === 'SALES' ? '<div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>' : ''}
        </div>
        <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 10px solid ${bgColor};
            position: absolute;
            bottom: -8px;
            left: 6px;
        "></div>
    `;

    return L.divIcon({
        className: 'custom-pin',
        html,
        iconSize: [24, 34],
        iconAnchor: [12, 34],
        popupAnchor: [0, -34]
    });
};

// Base Doral coordinates
const BASE_LAT = 25.7981;
const BASE_LNG = -80.3605;

// Utility to generate deterministic but random-looking mock coordinates around Doral
const generateMockCoordinates = (idStr) => {
    // simple hash function
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
        hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Spread them within a ~15 mile radius (roughly 0.2 degrees)
    const latOffset = (Math.sin(hash) * 0.2);
    const lngOffset = (Math.cos(hash) * 0.2);
    
    return [BASE_LAT + latOffset, BASE_LNG + lngOffset];
};

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        // Fix Leaflet container resize issue
        const timer = setTimeout(() => {
            try {
                if (map && map._container) {
                    map.invalidateSize();
                }
            } catch (e) {
                console.warn("Leaflet map resize skipped:", e);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

export default function DispatchMap() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [liveTechLocations, setLiveTechLocations] = useState({});

    useEffect(() => {
        fetchTodayJobs();
        
        // Setup realtime listeners
        const oppChannel = supabase.channel('realtime_map_opps')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'opportunities' }, () => fetchTodayJobs())
            .subscribe();
            
        const svcChannel = supabase.channel('realtime_map_svc')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, () => fetchTodayJobs())
            .subscribe();

        const techLocationChannel = supabase.channel('dispatch-tech-locations')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'technician_locations' }, (payload) => {
                const { service_call_id, lat, lng } = payload.new;
                if (service_call_id) {
                    setLiveTechLocations(prev => ({ ...prev, [service_call_id]: [lat, lng] }));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(oppChannel);
            supabase.removeChannel(svcChannel);
            supabase.removeChannel(techLocationChannel);
        };
    }, []);

    const fetchTodayJobs = async () => {
        try {
            // Get today's date string YYYY-MM-DD
            // For the demo, we'll just fetch ALL scheduled jobs so the map looks populated, 
            // since we might not have jobs exactly scheduled for "today" in the DB.
            
            // Fetch Opportunities (Sales)
            const { data: opps } = await supabase.from('opportunities').select(`
                id, created_at, status, urgency_level, scheduled_date, scheduled_time_block, assigned_crew_id, issue_description, household_id, proposal_data,
                households ( household_name, contacts ( primary_phone, email ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
            `).in('status', [PIPELINE_STATES.SCHEDULED, 'En Route', 'Working', 'Completed', 'Complete']).eq('is_active', true);

            // Fetch Service Calls (Service)
            const { data: svc } = await supabase.from('service_calls').select(`
                id, created_at, status, urgency, call_type, tags, issue_description, customer_id, assigned_techs, scheduled_start, scheduled_end,
                households ( household_name, contacts ( primary_phone, email ), addresses!addresses_household_id_fkey ( id, street_address, city, is_primary_residence ) )
            `).in('status', ['Scheduled', 'En Route', 'Working', 'Completed', 'Complete']);

            const normalizedOpps = (opps || []).map(o => {
            let targetAddress = null;
            if (Array.isArray(o.households?.addresses) && o.households.addresses.length > 0) {
                if (o.service_address_id) targetAddress = o.households.addresses.find(a => a.id === o.service_address_id);
                if (!targetAddress) targetAddress = o.households.addresses.find(a => a.is_primary_residence) || o.households.addresses[0];
            }
            return {
                ...o,
                __type: 'SALES',
                address: targetAddress || {},
                customerName: o.households?.household_name || 'Unknown'
            };
        });
            
            const normalizedSvc = (svc || []).map(s => {
                const propertyTag = s.tags?.find(t => t.startsWith('PROPERTY:'));
                const propertyId = propertyTag ? propertyTag.replace('PROPERTY:', '') : null;
                let targetAddress = null;
                if (Array.isArray(s.households?.addresses) && s.households.addresses.length > 0) {
                    if (propertyId) targetAddress = s.households.addresses.find(a => a.id === propertyId);
                    if (!targetAddress) targetAddress = s.households.addresses.find(a => a.is_primary_residence) || s.households.addresses[0];
                }
                
                return {
                    ...s,
                    __type: 'SERVICE',
                    urgency_level: s.urgency,
                    address: targetAddress || {},
                    customerName: s.households?.household_name || 'Unknown'
                };
            });

            const allJobs = [...normalizedOpps, ...normalizedSvc];
            
            // Fetch initial live tech locations from DB
            const { data: locs } = await supabase.from('technician_locations')
                .select('service_call_id, lat, lng, updated_at')
                .order('updated_at', { ascending: false });

            const latestLocs = {};
            (locs || []).forEach(loc => {
                if (loc.service_call_id && !latestLocs[loc.service_call_id]) {
                    latestLocs[loc.service_call_id] = [loc.lat, loc.lng];
                }
            });
            setLiveTechLocations(prev => ({ ...prev, ...latestLocs }));

            // Map coordinates: Use live location if available, else mock
            const jobsWithCoords = allJobs.map(job => {
                let coords = generateMockCoordinates(job.id);
                // We use the functional state update above, but for immediate mapping we use latestLocs
                // or if it was already in state (from websocket)
                if (latestLocs[job.id]) {
                    coords = latestLocs[job.id];
                }
                return {
                    ...job,
                    coords
                };
            });

            setJobs(jobsWithCoords);
        } catch (error) {
            console.error("Error fetching map jobs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Whenever liveTechLocations updates (via WS), re-map the coords
    const liveJobs = jobs.map(job => {
        if (liveTechLocations[job.id]) {
            return { ...job, coords: liveTechLocations[job.id] };
        }
        return job;
    });

    if (loading) {
        return (
            <div className="w-full h-[600px] flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200">
                <div className="animate-pulse flex flex-col items-center">
                    <MapPin className="text-slate-300 w-12 h-12 mb-4" />
                    <span className="text-slate-500 font-bold">Loading Live Map...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[700px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            
            <MapContainer 
                center={[BASE_LAT, BASE_LNG]} 
                zoom={11} 
                style={{ height: '100%', width: '100%', zIndex: 10 }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapResizer />
                
                {liveJobs.map(job => (
                    <Marker 
                        key={job.id} 
                        position={job.coords}
                        icon={createStatusIcon(job.status, job.__type, job.urgency_level)}
                    >
                        <Popup className="custom-popup" maxWidth={300}>
                            <div className="p-1 min-w-[240px]">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{job.__type}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        job.status === 'En Route' ? 'bg-yellow-100 text-yellow-700' :
                                        job.status === 'Working' ? 'bg-blue-100 text-blue-700' :
                                        (job.status === 'Complete' || job.status === 'Completed') ? 'bg-emerald-100 text-emerald-700' :
                                        'bg-slate-100 text-slate-700'
                                    }`}>
                                        {job.status}
                                    </span>
                                </div>
                                
                                <h3 className="text-base font-black text-slate-900 mb-1">{job.customerName}</h3>
                                <div className="flex items-start gap-1.5 text-slate-600 text-sm mb-3">
                                    <MapPin size={14} className="mt-0.5 shrink-0" />
                                    <span>
                                        {job.address?.street_address || 'No Address Provided'}<br/>
                                        {job.address?.city && <>{job.address.city}, FL</>}
                                    </span>
                                </div>

                                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 mb-3">
                                    <p className="text-sm text-slate-700 line-clamp-3">
                                        {job.issue_description || 'No description provided.'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between mt-4">
                                    {job.urgency_level === 'EMERGENCY' || job.urgency_level === 'High' ? (
                                        <div className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">
                                            <Zap size={12} /> Emergency
                                        </div>
                                    ) : <div></div>}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Legend overlay */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-lg">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Status Legend</h4>
                <div className="flex flex-col gap-2 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-500 ring-2 ring-white shadow-sm"></div> Scheduled
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-white shadow-sm"></div> En Route
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-white shadow-sm"></div> Working
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm"></div> Completed
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-transparent"></div> Emergency
                    </div>
                </div>
            </div>
            
            {/* Global Styles for Leaflet Popups to match Pilar theme */}
            <style dangerouslySetInnerHTML={{__html: `
                .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
                    border: 1px solid #e2e8f0;
                    padding: 0;
                }
                .leaflet-popup-content {
                    margin: 8px 12px;
                }
                .leaflet-popup-tip-container {
                    margin-top: -1px;
                }
            `}} />
        </div>
    );
}
