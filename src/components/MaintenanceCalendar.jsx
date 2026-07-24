import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, MapPin, Calendar as CalendarIcon } from 'lucide-react';
import { formatCustomerName } from '../utils/formatters';

export default function MaintenanceCalendar({ agreements, setSelectedJob }) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    // Map agreements to dates. Assuming 'created_at' or we can simulate a schedule.
    // In reality, each agreement should have a 'next_service_date'.
    // For demo/premium effect, we will hash the agreement ID to distribute them across the month
    // if they don't have a specific date.
    const agreementsByDate = {};
    
    agreements.forEach(job => {
        // Mocking a scheduled date based on created_at or ID for visual demonstration
        let targetDate;
        if (job.next_service_date) {
            targetDate = new Date(job.next_service_date);
        } else {
            // Pseudo-random but deterministic date in the current month based on ID length/characters
            const charSum = job.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const randomDay = (charSum % daysInMonth) + 1;
            targetDate = new Date(year, month, randomDay);
        }

        if (targetDate.getFullYear() === year && targetDate.getMonth() === month) {
            const day = targetDate.getDate();
            if (!agreementsByDate[day]) agreementsByDate[day] = [];
            agreementsByDate[day].push(job);
        }
    });

    const days = [];
    for (let i = 0; i < firstDay; i++) {
        days.push(<div key={`empty-${i}`} className="h-32 bg-slate-50/50 border-b border-r border-slate-100/50" />);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let i = 1; i <= daysInMonth; i++) {
        const dayAgreements = agreementsByDate[i] || [];
        const isToday = isCurrentMonth && today.getDate() === i;

        days.push(
            <div key={i} className={`h-32 border-b border-r border-slate-100 p-2 flex flex-col transition-colors hover:bg-slate-50 ${isToday ? 'bg-blue-50/30' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' : 'text-slate-500'}`}>
                        {i}
                    </span>
                    {dayAgreements.length > 0 && (
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 rounded-md">
                            {dayAgreements.length}
                        </span>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                    {dayAgreements.map((job, idx) => {
                        const isUrgent = job.isDueForService;
                        return (
                            <div 
                                key={job.id} 
                                onClick={() => setSelectedJob(job)}
                                className={`text-[10px] font-bold p-1.5 rounded border cursor-pointer truncate transition-all hover:scale-[1.02] ${isUrgent ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}
                                title={formatCustomerName(job.households?.household_name)}
                            >
                                {formatCustomerName(job.households?.household_name || 'Unknown')}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">
                            {monthNames[month]} {year}
                        </h2>
                        <p className="text-xs font-bold text-slate-500 tracking-wide uppercase">Service Schedule</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition-colors">
                        Today
                    </button>
                    <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-[10px] font-black tracking-widest uppercase text-slate-400 border-r border-slate-100 last:border-r-0">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 bg-slate-50/30">
                {days}
            </div>
        </div>
    );
}
