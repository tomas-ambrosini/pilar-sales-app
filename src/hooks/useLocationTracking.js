import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

/**
 * Hook to handle real-time GPS polling and broadcasting to Supabase.
 * @param {string} technicianId - The ID of the technician broadcasting.
 * @param {string} activeJobId - Optional ID of the job being driven to.
 * @param {boolean} isEnRoute - Boolean flag to turn broadcasting on/off.
 */
export function useLocationTracking(technicianId, activeJobId, isEnRoute) {
    const [location, setLocation] = useState(null);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const watchIdRef = useRef(null);
    const lastBroadcastTime = useRef(0);

    useEffect(() => {
        // If not en route, or no technician ID, stop tracking
        if (!isEnRoute || !technicianId) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                setIsBroadcasting(false);
                console.log('Location tracking stopped.');
            }
            return;
        }

        if (!('geolocation' in navigator)) {
            toast.error('Geolocation is not supported by your browser.');
            return;
        }

        console.log('Starting live location tracking...');
        setIsBroadcasting(true);

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude, heading, speed } = position.coords;
                
                // Throttle broadcasts to every 5 seconds to prevent spamming the DB
                const now = Date.now();
                if (now - lastBroadcastTime.current < 5000) return;
                lastBroadcastTime.current = now;

                setLocation({ latitude, longitude, heading, speed });

                try {
                    // UPSERT the location so we don't create millions of rows per tech per day.
                    // Actually, our schema didn't define a unique constraint on technician_id, 
                    // so we will just INSERT and the Tracker will order by updated_at DESC.
                    // For a true MVP, INSERT is fine. A cleanup script deletes old rows.
                    await supabase.from('technician_locations').insert([
                        {
                            technician_id: technicianId,
                            service_call_id: activeJobId,
                            lat: latitude,
                            lng: longitude,
                            heading: heading,
                            speed: speed
                        }
                    ]);
                } catch (err) {
                    console.error('Failed to broadcast location:', err);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                if (error.code === 1) {
                    toast.error('Please allow location permissions to broadcast your ETA.');
                    setIsBroadcasting(false);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 10000
            }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
                setIsBroadcasting(false);
            }
        };
    }, [isEnRoute, technicianId, activeJobId]);

    return { location, isBroadcasting };
}
