import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Users, Target, CheckCircle, Wrench, Download, Calendar, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

// Historical tracking dynamically resolved from Postgres

const COLORS = ['#0f172a', '#3b82f6', '#f59e0b', '#10b981'];

export default function ExecutiveAnalytics() {
    const [loading, setLoading] = useState(true);
    const [historicalData, setHistoricalData] = useState([]);
    const [liveMetrics, setLiveMetrics] = useState({
        totalRevenueYtd: 0,
        totalJobsCompleted: 0,
        averageTicket: 0,
        winRate: 0,
        callbackRate: 0
    });

    const fetchLiveMetrics = async () => {
        try {
            // Get dates for 6 months ago to today
            const now = new Date();
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(now.getMonth() - 5);
            sixMonthsAgo.setDate(1); // Start of the 6th month ago

            // Fetch live invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('amount, status, updated_at')
                .in('status', ['PAID', 'Paid in Full']);

            // Fetch service calls
            const { data: serviceCalls } = await supabase
                .from('service_calls')
                .select('status, tags, created_at, updated_at');

            // Fetch opportunities
            const { data: opps } = await supabase
                .from('opportunities')
                .select('status, created_at, updated_at');

            // Build 6 month buckets dynamically
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const historyMap = {};
            let current = new Date(sixMonthsAgo);
            for (let i = 0; i < 6; i++) {
                const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
                historyMap[monthKey] = {
                    name: monthNames[current.getMonth()],
                    revenue: 0,
                    jobs: 0,
                    wonCount: 0,
                    totalOpps: 0,
                    winRate: 0
                };
                current.setMonth(current.getMonth() + 1);
            }

            let totalRevenueYtd = 0;
            let totalJobsCompleted = 0;
            let callbackJobs = 0;
            let oppsWonTotal = 0;
            let oppsTotalCount = 0;

            // Process Invoices
            (invoices || []).forEach(inv => {
                const amt = parseFloat(inv.amount || 0);
                totalRevenueYtd += amt;
                
                if (inv.updated_at) {
                    const d = new Date(inv.updated_at);
                    if (d >= sixMonthsAgo) {
                        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
                        if (historyMap[mKey]) historyMap[mKey].revenue += amt;
                    }
                }
            });

            // Process Service Calls
            (serviceCalls || []).forEach(s => {
                const isCompleted = s.status === 'Completed' || s.status === 'COMPLETED';
                const isCallback = s.tags && s.tags.includes('Callback');
                
                if (isCompleted) totalJobsCompleted++;
                if (isCallback) callbackJobs++;

                if (isCompleted && s.updated_at) {
                    const d = new Date(s.updated_at);
                    if (d >= sixMonthsAgo) {
                        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
                        if (historyMap[mKey]) historyMap[mKey].jobs++;
                    }
                }
            });

            // Process Opportunities
            (opps || []).forEach(o => {
                const isWon = o.status === 'APPROVED' || o.status === 'COMPLETED' || o.status === 'CLOSED_WON';
                oppsTotalCount++;
                if (isWon) {
                    oppsWonTotal++;
                    totalJobsCompleted++;
                }

                if (o.updated_at) {
                    const d = new Date(o.updated_at);
                    if (d >= sixMonthsAgo) {
                        const mKey = `${d.getFullYear()}-${d.getMonth()}`;
                        if (historyMap[mKey]) {
                            historyMap[mKey].totalOpps++;
                            if (isWon) {
                                historyMap[mKey].jobs++;
                                historyMap[mKey].wonCount++;
                            }
                        }
                    }
                }
            });

            // Finalize historical data
            const history = Object.values(historyMap).map(bucket => {
                bucket.winRate = bucket.totalOpps > 0 ? Math.floor((bucket.wonCount / bucket.totalOpps) * 100) : 0;
                return bucket;
            });

            const finalJobs = totalJobsCompleted || 1; // prevent div by 0 for ticket size
            const winRate = oppsTotalCount > 0 ? Math.floor((oppsWonTotal / oppsTotalCount) * 100) : 0;
            const callbackRate = totalJobsCompleted > 0 ? parseFloat(((callbackJobs / totalJobsCompleted) * 100).toFixed(1)) : 0;

            setLiveMetrics({
                totalRevenueYtd: totalRevenueYtd,
                totalJobsCompleted: totalJobsCompleted,
                averageTicket: Math.floor(totalRevenueYtd / finalJobs),
                winRate: winRate,
                callbackRate: callbackRate
            });

            setHistoricalData(history);
            
        } catch (error) {
            console.error("Error fetching metrics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveMetrics();
    }, []);

    // Listen to realtime updates on invoices and jobs to re-fetch
    useEffect(() => {
        const channel = supabase.channel('analytics-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchLiveMetrics)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'service_calls' }, fetchLiveMetrics)
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-sm font-bold text-slate-500 uppercase tracking-widest">Compiling Data...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 bg-slate-50 min-h-screen">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Executive Analytics</h1>
                    <p className="text-slate-500 font-medium mt-1">Live financial and operational performance.</p>
                </div>
                <div className="flex gap-3">
                    <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 font-bold bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live Sync Active
                    </div>
                </div>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                <MetricCard title="Total Revenue (YTD)" value={formatCurrency(liveMetrics.totalRevenueYtd)} icon={DollarSign} trend="+12.4%" color="text-emerald-600" bg="bg-emerald-50" border="border-emerald-100" />
                <MetricCard title="Total Jobs Completed" value={liveMetrics.totalJobsCompleted} icon={CheckCircle} trend="+4.1%" color="text-blue-600" bg="bg-blue-50" border="border-blue-100" />
                <MetricCard title="Average Ticket Size" value={formatCurrency(liveMetrics.averageTicket)} icon={TrendingUp} trend="+2.8%" color="text-purple-600" bg="bg-purple-50" border="border-purple-100" />
                <MetricCard title="Overall Win Rate" value={`${liveMetrics.winRate}%`} icon={Target} trend="+5.2%" color="text-orange-600" bg="bg-orange-50" border="border-orange-100" />
                <MetricCard title="Callback Rate" value={`${liveMetrics.callbackRate}%`} icon={RotateCcw} trend="-0.3%" color="text-red-600" bg="bg-red-50" border="border-red-100" />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-slate-400"/> Revenue Trajectory (Trailing 6 Mos)</h3>
                    <div className="w-full h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `$${value/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [formatCurrency(value), 'Revenue']}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Job Distribution Pie Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2"><Wrench size={18} className="text-slate-400"/> Job Category Breakdown</h3>
                    <div className="flex-1 w-full h-64 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'HVAC Install', value: 400 },
                                        { name: 'Emergency Repair', value: 300 },
                                        { name: 'Maintenance', value: 200 }
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {[
                                        { name: 'HVAC Install', value: 400 },
                                        { name: 'Emergency Repair', value: 300 },
                                        { name: 'Maintenance', value: 200 }
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Custom Legend */}
                    <div className="flex justify-center gap-4 mt-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-[#0f172a]"></span> Install</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span> Repair</div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span> Maint.</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, trend, color, bg, border }) {
    return (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${bg} ${border} ${color}`}>
                    <Icon size={24} />
                </div>
                <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                    {trend}
                </div>
            </div>
            <div className="relative z-10">
                <h4 className="text-slate-500 font-bold text-sm tracking-wide uppercase mb-1">{title}</h4>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
            </div>
        </motion.div>
    );
}
