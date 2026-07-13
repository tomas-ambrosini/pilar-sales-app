import sys

file_path = "src/components/ServiceCallModal.jsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Imports
content = content.replace("from 'lucide-react';", "from 'lucide-react';\nimport { MessageSquare, Activity, Send, History } from 'lucide-react';")

# 2. State Hooks
state_hooks = """    const [assignedCrew, setAssignedCrew] = useState(null);
    const [activities, setActivities] = useState([]);
    const [newNote, setNewNote] = useState('');"""
content = content.replace("    const [assignedCrew, setAssignedCrew] = useState(null);", state_hooks)

# 3. fetchActivities inside fetchCallDetails
fetch_logic = """
            if (techs && techs.length > 0) {
                let crewId = techs[0];
                if (typeof crewId === 'object' && crewId !== null && crewId.id) crewId = crewId.id;
                
                const { data: crewData } = await supabase.from('crews').select('crew_name, color_code').eq('id', crewId).single();
                if (crewData) setAssignedCrew(crewData);
            }
            
            // Fetch Activities
            const { data: actData } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('service_call_id', callId)
                .order('created_at', { ascending: false });
            
            if (actData) {
                const hasCreation = actData.some(a => a.activity_type.includes('Created') || a.activity_type.includes('Intaken'));
                if (!hasCreation) {
                    const intakenByTag = data.tags?.find(t => typeof t === 'string' && t.startsWith('INTAKEN_BY:'));
                    const intakeName = intakenByTag ? intakenByTag.replace('INTAKEN_BY:', '') : 'System';
                    actData.push({
                        id: 'synth-1',
                        activity_type: 'Service Call Created',
                        description: `Call intaken by ${intakeName}.`,
                        created_at: data.created_at || new Date().toISOString()
                    });
                }
                setActivities(actData);
            }
"""
content = content.replace("""
            // Fetch the assigned crew if any
            if (techs && techs.length > 0) {
                let crewId = techs[0];
                if (typeof crewId === 'object' && crewId !== null && crewId.id) crewId = crewId.id;
                
                const { data: crewData } = await supabase.from('crews').select('crew_name, color_code').eq('id', crewId).single();
                if (crewData) setAssignedCrew(crewData);
            }""", fetch_logic)


# 4. Handle Add Note & Handle Save logging
note_functions = """    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        try {
            const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
            const { error } = await supabase.from('activity_logs').insert({
                household_id: callData.customer_id,
                service_call_id: callId,
                activity_type: `Dispatch Note by ${userName}`,
                description: newNote
            });
            if (error) throw error;
            setNewNote('');
            
            // Fetch activities again
            const { data: actData } = await supabase.from('activity_logs').select('*').eq('service_call_id', callId).order('created_at', { ascending: false });
            if (actData) setActivities(actData);
            
            toast.success('Note added successfully');
        } catch (e) {
            toast.error('Failed to save note');
        }
    };

    const handleSave = async (overrideStatus = null) => {"""
content = content.replace("    const handleSave = async (overrideStatus = null) => {", note_functions)

# Insert activity log in handleSave
save_log = """
        if (finalStatus !== callData.status) {
            const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
            await supabase.from('activity_logs').insert({
                household_id: callData.customer_id,
                service_call_id: callId,
                activity_type: 'Status Updated',
                description: `Status changed to ${finalStatus}. (Action taken by: ${userName})`
            });
        }

        const { error } = await supabase"""
content = content.replace("        const { error } = await supabase", save_log)

# 5. Right panel replacement
# Find the exact right panel block
right_panel_original = """                {/* Right Panel: Notes & Actions */}
                <div className="w-full lg:w-[55%] bg-slate-50 flex flex-col h-auto lg:h-full relative border-t lg:border-t-0 border-slate-200 min-w-0 lg:min-h-0 shrink-0 lg:shrink">
                    <div className="flex-1 lg:overflow-y-auto lg:min-h-0 custom-scrollbar p-6 flex flex-col relative z-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <AlertCircle size={16} className="text-purple-600" /> Issue & Dispatch Notes
                            </h3>
                            {callData.tags?.includes('CONVERTED_TO_SALES') && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                    <UserCheck size={12} /> Converted to Sales
                                </span>
                            )}
                        </div>
                        
                        <textarea 
                            className="w-full flex-1 min-h-[250px] bg-white border border-slate-200 rounded-2xl p-5 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm font-medium text-slate-700 resize-none leading-relaxed placeholder-slate-400"
                            placeholder="Enter detailed dispatch instructions, parts needed, and customer complaints..."
                            value={callData.issue_description}
                            onChange={e => setCallData({...callData, issue_description: e.target.value})}
                        />
                    </div>"""

right_panel_new = """                {/* Right Panel: Unified Timeline */}
                <div className="w-full lg:w-[55%] flex flex-col bg-white relative border-t lg:border-t-0 border-slate-200 min-w-0 lg:min-h-0 shrink-0 lg:shrink">
                    
                    <div className="p-4 border-b border-slate-100 bg-white z-10 shadow-sm flex items-center justify-between shrink-0">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-tight">
                            <History size={18} className="text-primary-600" /> Unified Timeline
                        </h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{activities.length} Events</span>
                    </div>

                    <div className="p-6 lg:overflow-y-auto flex-1 lg:min-h-0 custom-scrollbar bg-slate-50/30">
                        {activities.length > 0 ? (
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                {activities.map((act) => (
                                    <div key={act.id} className="relative flex items-start gap-4 group">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-white shadow-sm shrink-0 relative z-10">
                                            {act.activity_type.includes('Note') ? (
                                                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><MessageSquare size={14} /></div>
                                            ) : act.activity_type.includes('Status') ? (
                                                <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600"><Check size={14} /></div>
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-slate-600"><Activity size={14} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-black text-slate-800 text-sm">{act.activity_type}</span>
                                                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                                                    {new Date(act.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">
                                                {act.description}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <History size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">No activity recorded yet.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white z-10 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] shrink-0">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                placeholder="Drop a note into the timeline..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                            />
                            <button 
                                onClick={handleAddNote}
                                disabled={!newNote.trim()}
                                className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>"""
content = content.replace(right_panel_original, right_panel_new)

# Move the Dispatch Notes to the left panel
left_panel_dispatch = """
                    {/* Dispatch Notes (Moved to left panel) */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Dispatch Instructions
                            </h3>
                            {callData.tags?.includes('CONVERTED_TO_SALES') && (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                    <UserCheck size={10} /> Converted
                                </span>
                            )}
                        </div>
                        <textarea 
                            className="w-full min-h-[120px] bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none text-sm font-medium text-slate-700 resize-none leading-relaxed placeholder-slate-400"
                            placeholder="Enter dispatch instructions..."
                            value={callData.issue_description}
                            onChange={e => setCallData({...callData, issue_description: e.target.value})}
                        />
                    </div>
                </div>"""
content = content.replace("                </div>\n\n                {/* Right Panel: Unified Timeline */}", left_panel_dispatch + "\n\n                {/* Right Panel: Unified Timeline */}")

with open(file_path, "w") as f:
    f.write(content)

print("Updated ServiceCallModal.jsx successfully!")
