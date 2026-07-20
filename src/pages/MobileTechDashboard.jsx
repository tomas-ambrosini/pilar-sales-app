import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, MessageSquare, PhoneCall, Truck, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../context/RoleContext';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export default function MobileTechDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSubcontractor } = useRole();
  const [jobCount, setJobCount] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(true);
  
  // Real database-backed clock state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [updatingClock, setUpdatingClock] = useState(false);

  useEffect(() => {
    fetchJobCount();
    fetchClockStatus();
  }, [user]);

  const fetchJobCount = async () => {
    if (!user) return;
    try {
        const userName = (user.user_metadata?.full_name || '').toLowerCase().trim();
        const companyName = (user.user_metadata?.company_name || '').toLowerCase().trim();
        const email = (user.email || '').toLowerCase().trim();
        
        const { data: crews } = await supabase.from('crews').select('*').eq('is_active', true);
        if (!crews || crews.length === 0) {
            setJobCount(0); setLoadingJobs(false); return;
        }

        let myCrews = crews.filter(c => {
            const cName = c.crew_name.toLowerCase().trim();
            const cEmail = (c.tech_email || '').toLowerCase().trim();
            if (cEmail && email && cEmail === email) return true;
            if (!userName && !companyName) return false;
            return (userName && cName.includes(userName)) || 
                   (companyName && cName.includes(companyName)) ||
                   (userName && userName.includes(cName));
        });

        if (myCrews.length === 0) {
            setJobCount(0); setLoadingJobs(false); return;
        }

        const crewId = myCrews[0].id;
        
        const d = new Date();
        d.setDate(d.getDate() - 2);
        const past = d.toISOString().split('T')[0];
        d.setDate(d.getDate() + 4);
        const future = d.toISOString().split('T')[0];

        const { data: svcData } = await supabase.from('service_calls').select('id, scheduled_start, assigned_techs').gte('scheduled_start', `${past}T00:00:00`).lte('scheduled_start', `${future}T23:59:59`);
        const { data: oppData } = await supabase.from('opportunities').select('id, scheduled_date, assigned_crew_id').gte('scheduled_date', past).lte('scheduled_date', future);
        
        const combined = [
            ...(svcData || []).map(s => ({ ...s, __type: 'SERVICE' })),
            ...(oppData || []).map(o => ({ ...o, __type: 'SALES' }))
        ];

        const todayStr = new Date().toDateString();

        const filteredJobs = combined.filter(job => {
            let belongsToCrew = false;
            if (job.__type === 'SERVICE') {
                let techsStr = typeof job.assigned_techs === 'string' ? job.assigned_techs : JSON.stringify(job.assigned_techs || []);
                belongsToCrew = techsStr.includes(crewId);
            } else {
                belongsToCrew = job.assigned_crew_id === crewId;
            }
            if (!belongsToCrew) return false;

            let jobDateStr = null;
            if (job.__type === 'SERVICE' && job.scheduled_start) {
                let dateStr = job.scheduled_start.replace(' ', 'T').slice(0, 19) + 'Z';
                jobDateStr = new Date(dateStr).toDateString();
            } else if (job.__type === 'SALES' && job.scheduled_date) {
                const [year, month, day] = job.scheduled_date.split('-');
                jobDateStr = new Date(year, month - 1, day).toDateString();
            }
            return jobDateStr === todayStr;
        });

        setJobCount(filteredJobs.length);
    } catch (e) {
        console.error("Failed to fetch jobs", e);
        setJobCount(0);
    } finally {
        setLoadingJobs(false);
    }
  };

  const fetchClockStatus = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase.from('user_profiles').select('metadata').eq('id', user.id).single();
      if (!error && data?.metadata?.clock_status) {
        setIsClockedIn(data.metadata.clock_status.is_clocked_in);
        setClockInTime(data.metadata.clock_status.last_clock_in ? new Date(data.metadata.clock_status.last_clock_in) : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClockToggle = async () => {
    if (updatingClock || !user?.id) return;
    setUpdatingClock(true);
    
    const newStatus = !isClockedIn;
    const time = new Date();
    const oldClockInTime = clockInTime;
    
    // Optimistic UI update
    setIsClockedIn(newStatus);
    setClockInTime(newStatus ? time : null);
    
    try {
      const { data: existing } = await supabase.from('user_profiles').select('metadata').eq('id', user.id).single();
      
      const existingLogs = existing?.metadata?.time_logs || [];
      const newLog = {
        action: newStatus ? 'Clocked In' : 'Clocked Out',
        timestamp: time.toISOString()
      };

      const newMeta = {
        ...(existing?.metadata || {}),
        clock_status: {
          is_clocked_in: newStatus,
          last_clock_in: newStatus ? time.toISOString() : null
        },
        time_logs: [...existingLogs, newLog]
      };
      
      await supabase.from('user_profiles').update({ metadata: newMeta }).eq('id', user.id);
    } catch (err) {
      console.error("Failed to update clock status", err);
      // Revert on error
      setIsClockedIn(!newStatus);
      setClockInTime(oldClockInTime);
    } finally {
      setUpdatingClock(false);
    }
  };

  // Helper to format time
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Welcome Banner */}
      <div className="mb-2 mt-4 px-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Welcome back,
        </h2>
        <h3 className="text-xl font-bold text-slate-500">
          {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Technician'}
        </h3>
      </div>

      {/* Primary Action: Assigned Work */}
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/my-day')}
        className="w-full bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-900/20 relative overflow-hidden group text-left"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/10 backdrop-blur-sm">
              <Briefcase size={24} className="text-white" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">Assigned Work</h3>
            <p className="text-slate-300 font-medium mt-1 flex items-center gap-2">
              {loadingJobs ? (
                <span className="w-20 h-4 bg-white/20 animate-pulse rounded"></span>
              ) : (
                jobCount > 0 ? `${jobCount} Jobs Today` : 'No Jobs Assigned'
              )}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <ChevronRight size={20} className="text-white" />
          </div>
        </div>
      </motion.button>

      {/* Secondary Action: Clock In / Out */}
      <motion.button 
        whileTap={{ scale: 0.98 }}
        onClick={handleClockToggle}
        disabled={updatingClock}
        className={`w-full rounded-3xl p-6 shadow-md shadow-slate-200/50 border flex items-center justify-between transition-all ${
            isClockedIn 
                ? 'bg-amber-50 border-amber-100' 
                : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              isClockedIn 
                  ? 'bg-amber-100 text-amber-600' 
                  : 'bg-emerald-50 text-emerald-600'
          }`}>
            <Clock size={24} />
          </div>
          <div className="text-left">
            <h3 className={`text-xl font-bold tracking-tight ${isClockedIn ? 'text-amber-900' : 'text-slate-800'}`}>
                {isClockedIn ? 'Clock Out' : 'Clock In'}
            </h3>
            <p className={`text-sm font-medium mt-0.5 ${isClockedIn ? 'text-amber-700' : 'text-slate-500'}`}>
                {isClockedIn && clockInTime 
                    ? `Clocked in at ${formatTime(clockInTime)}`
                    : 'Start your shift'}
            </p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isClockedIn ? 'bg-amber-200/50' : 'bg-slate-50'
        }`}>
            <ChevronRight size={16} className={isClockedIn ? 'text-amber-600' : 'text-slate-400'} />
        </div>
      </motion.button>

      <div className="grid grid-cols-2 gap-4 mt-2">
        {/* Contact Dispatch (Phone) */}
        <motion.a 
          whileTap={{ scale: 0.95 }}
          href="tel:5551234567" // Placeholder company number
          className="col-span-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-3xl p-5 shadow-lg shadow-rose-500/20 text-white flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <PhoneCall size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Call Dispatch</h3>
            <p className="text-rose-100 text-sm font-medium">Urgent assistance</p>
          </div>
        </motion.a>

        {/* Conditional Buttons for In-House Techs */}
        {!isSubcontractor() && (
          <>
            {/* Fleet Management */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => alert("Fleet Management Coming Soon")}
              className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center gap-3"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                <Truck size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm leading-tight">Fleet Mgmt</h3>
                <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Inspections</p>
              </div>
            </motion.button>

            {/* Clock In / Out */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleClockToggle}
              className={`${
                isClockedIn 
                  ? 'bg-emerald-50 border-emerald-200 shadow-emerald-500/10' 
                  : 'bg-white border-slate-100 shadow-sm'
              } rounded-3xl p-5 border flex flex-col items-center justify-center text-center gap-3 transition-colors`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                isClockedIn ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <Clock size={24} />
              </div>
              <div>
                <h3 className={`font-bold text-sm leading-tight ${isClockedIn ? 'text-emerald-800' : 'text-slate-800'}`}>
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </h3>
                <p className={`text-[10px] font-medium uppercase mt-0.5 ${isClockedIn ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {isClockedIn ? formatTime(clockInTime) : 'Time Tracking'}
                </p>
              </div>
            </motion.button>
          </>
        )}
      </div>

    </div>
  );
}
