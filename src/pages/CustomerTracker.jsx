import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, CalendarClock, MessageCircle, MapPin, Navigation, Car, AlertCircle, Clock, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';

// Doral base coordinates (Office)
const MIAMI_LAT = 25.7981;
const MIAMI_LNG = -80.3605;
// Destination (e.g. Hialeah)
const DEST_LAT = 25.8670;
const DEST_LNG = -80.3149;

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 300);
    }, [map]);
    return null;
}

function MapUpdater({ lat, lng }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], map.getZoom());
        }
    }, [lat, lng, map]);
    return null;
}

export default function CustomerTracker() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [progress, setProgress] = useState(0); // 0 to 1
    const [currentLat, setCurrentLat] = useState(MIAMI_LAT);
    const [currentLng, setCurrentLng] = useState(MIAMI_LNG);
    const [isLive, setIsLive] = useState(false);

    const isDemo = id === 'demo' || searchParams.get('demo') === 'true';

    useEffect(() => {
        if (isDemo) {
            // Simulate truck driving towards destination for Demo Purposes
            const duration = 20000; // 20 seconds for the demo
            const startTime = Date.now();

            const animate = () => {
                const now = Date.now();
                let elapsed = (now - startTime) / duration;
                if (elapsed > 1) elapsed = 1;

                // Simple linear interpolation
                setCurrentLat(MIAMI_LAT + (DEST_LAT - MIAMI_LAT) * elapsed);
                setCurrentLng(MIAMI_LNG + (DEST_LNG - MIAMI_LNG) * elapsed);
                setProgress(elapsed);

                if (elapsed < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
            return;
        }

        // Fetch the very last ping on load
        const fetchInitialLocation = async () => {
            const { data } = await supabase.from('technician_locations')
                .select('lat, lng')
                .order('updated_at', { ascending: false })
                .limit(1);
            
            if (data && data.length > 0) {
                setCurrentLat(data[0].lat);
                setCurrentLng(data[0].lng);
                setIsLive(true);
            }
        };
        fetchInitialLocation();

        // PRODUCTION: Subscribe to real-time GPS pings from Supabase
        const channel = supabase.channel('tech-locations-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'technician_locations',
                    // filter: `service_call_id=eq.${id}` // In production, filter by the tracking token/id
                },
                (payload) => {
                    const { lat, lng } = payload.new;
                    setCurrentLat(lat);
                    setCurrentLng(lng);
                    setIsLive(true);
                    
                    // Basic progress estimation based on distance (simplified)
                    const distTotal = Math.hypot(DEST_LAT - MIAMI_LAT, DEST_LNG - MIAMI_LNG);
                    const distCurrent = Math.hypot(DEST_LAT - lat, DEST_LNG - lng);
                    setProgress(Math.max(0, Math.min(1, 1 - (distCurrent / distTotal))));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, isDemo]);

    const truckIcon = L.divIcon({
        className: 'custom-pin',
        html: `
            <div style="
                width: 40px; height: 40px; background-color: #3b82f6; border-radius: 50%;
                border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center; color: white;
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
            </div>
            <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 12px solid #3b82f6; position: absolute; bottom: -10px; left: 12px;"></div>
        `,
        iconSize: [40, 52],
        iconAnchor: [20, 52]
    });

    const homeIcon = L.divIcon({
        className: 'custom-pin',
        html: `
            <div style="
                width: 32px; height: 32px; background-color: #10b981; border-radius: 50%;
                border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                display: flex; align-items: center; justify-content: center; color: white;
            ">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const minutesLeft = Math.max(1, Math.ceil(15 * (1 - progress)));

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white px-6 py-4 shadow-sm flex items-center justify-between z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-black text-sm">P</div>
                    <span className="font-bold text-slate-800 tracking-tight">Pilar Home</span>
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">Live Tracker</div>
            </div>

            {/* ETA Card */}
            <div className="p-4 z-10 -mb-6">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100 flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-bold text-primary-600 mb-1 uppercase tracking-wider flex items-center gap-1"><Navigation size={14} /> En Route</p>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{minutesLeft} <span className="text-lg text-slate-500 font-bold">min</span></h1>
                            <p className="text-sm font-medium text-slate-500 mt-1">Arrival around {new Date(Date.now() + minutesLeft * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden relative">
                            {/* Mock Avatar */}
                            <img src="https://ui-avatars.com/api/?name=Alex+Tech&background=0284c7&color=fff&size=128" alt="Technician" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${Math.max(5, progress * 100)}%` }}></div>
                    </div>

                    <p className="text-sm font-bold text-slate-700 text-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                        Your technician <span className="text-primary-700">Alex</span> is on the way!
                    </p>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 w-full bg-slate-200 relative z-0">
                <div className="absolute inset-0">
                    <MapContainer 
                        center={[MIAMI_LAT - 0.005, MIAMI_LNG]} 
                        zoom={13} 
                        style={{ height: '100%', width: '100%', zIndex: 0 }}
                        zoomControl={false}
                    >
                    <TileLayer 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapResizer />
                    <MapUpdater lat={currentLat} lng={currentLng} />
                    
                    {/* Destination Pin */}
                    <Marker position={[DEST_LAT, DEST_LNG]} icon={homeIcon} />

                    {/* Truck Pin */}
                    <Marker position={[currentLat, currentLng]} icon={truckIcon} zIndexOffset={1000} />
                </MapContainer>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-10 flex gap-3">
                <button className="flex-1 bg-white border border-slate-200 text-slate-700 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 active:bg-slate-50 transition-colors">
                    <CalendarClock size={18} /> Reschedule
                </button>
                <button className="flex-1 bg-slate-900 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 active:bg-slate-800 transition-colors">
                    <Phone size={18} /> Contact Tech
                </button>
            </div>
        </div>
    );
}
