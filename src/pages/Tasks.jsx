import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, Square, Plus, Loader2, 
  SignalHigh, SignalMedium, SignalLow, CircleDashed, 
  Calendar, Users, ChevronDown, Flame, AlertCircle, Clock, Check, CheckCircle2, ChevronRight,
  Paperclip, Send, FileText, Download, X, MessageSquare, Image as ImageIcon
} from 'lucide-react';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeMenuType, setActiveMenuType] = useState(null); // 'status', 'priority', 'assignee', 'progress'
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [activeDescription, setActiveDescription] = useState("");
  const [taskUpdates, setTaskUpdates] = useState({});
  const [newUpdateContent, setNewUpdateContent] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const updatesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchData();
      
      // Live Real-time Subscription
      const channel = supabase.channel('realtime_tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks(prev => {
              // Prevent duplicates from optimistic updates
              if (prev.find(t => t.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'task_updates' }, (payload) => {
           if (payload.eventType === 'INSERT') {
              fetchUpdates(payload.new.task_id);
           }
        })
        .subscribe();

      const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          setActiveMenuId(null);
          setActiveMenuType(null);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch users for assignments
    const { data: usersData } = await supabase.from('user_profiles').select('id, full_name, avatar_url');
    if (usersData) setTeamMembers(usersData);

    // Fetch tasks
    const { data: tasksData, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
      // If error is about missing columns (before they run SQL), we degrade gracefully
    } else {
      setTasks(tasksData || []);
    }
    setIsLoading(false);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    
    setIsSubmitting(true);
    const newTask = {
      title: newTaskTitle.trim(),
      status: 'To Do',
      priority: 'Medium',
      progress: 0,
      assigned_to: [user.id],
      user_id: user.id
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select()
      .single();

    if (!error && data) {
      setTasks([data, ...tasks]);
      setNewTaskTitle('');
    } else {
      console.error(error);
      alert("Please make sure you ran the SQL script to add the new columns!");
    }
    setIsSubmitting(false);
  };

  const updateTask = async (taskId, field, value) => {
    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks(tasks.map(t => t.id === taskId ? { ...t, [field]: value } : t));
    
    if (field !== 'title' && field !== 'progress' && field !== 'description') {
        setActiveMenuId(null);
        setActiveMenuType(null);
    }

    const { error } = await supabase
      .from('tasks')
      .update({ [field]: value })
      .eq('id', taskId);

    if (error) {
      console.error(error);
      setTasks(previousTasks); // Revert
    }
  };

  const fetchUpdates = async (taskId) => {
    const { data, error } = await supabase
      .from('task_updates')
      .select('*, user_profiles(full_name, avatar_url)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setTaskUpdates(prev => ({ ...prev, [taskId]: data }));
      // Scroll to bottom
      setTimeout(() => {
        if (updatesEndRef.current) updatesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const submitUpdate = async (taskId) => {
    if (!newUpdateContent.trim() && !attachmentFile) return;
    setIsUploading(true);

    let uploadedUrl = null;
    let uploadedName = null;
    let uploadedType = null;

    if (attachmentFile) {
      const fileExt = attachmentFile.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, attachmentFile);

      if (uploadError) {
        console.error("Upload error", uploadError);
        alert("Failed to upload attachment: " + uploadError.message);
        setIsUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(fileName);

      uploadedUrl = publicData.publicUrl;
      uploadedName = attachmentFile.name;
      uploadedType = attachmentFile.type;
    }

    const { error } = await supabase.from('task_updates').insert([{
      task_id: taskId,
      user_id: user.id,
      content: newUpdateContent.trim(),
      attachment_url: uploadedUrl,
      attachment_name: uploadedName,
      attachment_type: uploadedType
    }]);

    if (!error) {
      setNewUpdateContent('');
      setAttachmentFile(null);
      fetchUpdates(taskId);
    } else {
      console.error(error);
      alert("Failed to post update. Ensure task_updates table exists.");
    }
    setIsUploading(false);
  };

  const toggleExpand = (task) => {
    if (expandedTaskId === task.id) {
      setExpandedTaskId(null);
    } else {
      setExpandedTaskId(task.id);
      setActiveDescription(task.description || "");
      fetchUpdates(task.id);
    }
  };

  const saveDescription = (taskId) => {
    updateTask(taskId, 'description', activeDescription);
  };

  const toggleAssignee = async (taskId, userId) => {
    const task = tasks.find(t => t.id === taskId);
    let newAssignees = [...(task.assigned_to || [])];
    
    if (newAssignees.includes(userId)) {
      newAssignees = newAssignees.filter(id => id !== userId);
    } else {
      newAssignees.push(userId);
    }
    
    updateTask(taskId, 'assigned_to', newAssignees);
  };

  const getPriorityConfig = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'critical': return { icon: <Flame size={14} className="text-rose-500" />, text: 'Critical', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'high': return { icon: <SignalHigh size={14} className="text-orange-500" />, text: 'High', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      case 'medium': return { icon: <SignalMedium size={14} className="text-blue-500" />, text: 'Medium', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'low': return { icon: <SignalLow size={14} className="text-slate-400" />, text: 'Low', bg: 'bg-slate-50 text-slate-600 border-slate-200' };
      default: return { icon: <CircleDashed size={14} className="text-slate-400" />, text: 'None', bg: 'bg-slate-50 text-slate-500 border-slate-200' };
    }
  };

  const getStatusConfig = (status) => {
    switch(status?.toLowerCase()) {
      case 'done': return { icon: <CheckCircle2 size={14} className="text-emerald-500" />, text: 'Done', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'in progress': return { icon: <Clock size={14} className="text-amber-500" />, text: 'In Progress', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'review': return { icon: <AlertCircle size={14} className="text-purple-500" />, text: 'Review', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default: return { icon: <CircleDashed size={14} className="text-slate-400" />, text: 'To Do', bg: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
  };

  const getProgressConfig = (progress) => {
    const val = parseInt(progress) || 0;
    if (val >= 100) return { text: 'Completed', bg: 'bg-emerald-100 text-emerald-800' };
    if (val >= 75) return { text: 'Almost Done', bg: 'bg-blue-100 text-blue-800' };
    if (val >= 50) return { text: 'Halfway', bg: 'bg-indigo-100 text-indigo-800' };
    if (val >= 25) return { text: 'Just Started', bg: 'bg-amber-100 text-amber-800' };
    return { text: 'Not Started', bg: 'bg-slate-100 text-slate-600' };
  };

  const getUserInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Project Board</h1>
          <p className="text-slate-500 text-sm mt-1">Manage cross-functional tasks and assignments.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_minmax(300px,1fr)_120px_140px_140px_140px_120px] gap-4 items-center px-6 py-4 bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-widest rounded-t-2xl">
          <div className="w-8 flex justify-center"><CheckSquare size={16} /></div>
          <div>Task Name</div>
          <div>Assigned To</div>
          <div>Status</div>
          <div>Progress</div>
          <div>Priority</div>
          <div>Due Date</div>
        </div>

        {/* Input Row */}
        <form onSubmit={addTask} className="border-b border-slate-100 bg-white hover:bg-slate-50/80 transition-colors">
          <div className="grid grid-cols-[auto_minmax(300px,1fr)_120px_140px_140px_140px_120px] gap-4 items-center px-6 py-3.5">
            <div className="w-8 flex justify-center text-slate-300"><Plus size={18} /></div>
            <input 
              type="text" 
              placeholder="Add a new task... (Press Enter)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-transparent border-none text-slate-800 text-sm font-bold focus:ring-0 p-0 outline-none placeholder-slate-300"
            />
            {/* Empty cells for visual balance */}
            <div className="col-span-5 text-xs text-slate-400 flex items-center justify-end pr-2">
               {isSubmitting && <Loader2 size={14} className="animate-spin text-primary-500" />}
            </div>
          </div>
        </form>

        {/* Task Rows */}
        {isLoading ? (
          <div className="flex justify-center py-12 bg-white">
            <Loader2 className="animate-spin text-slate-300" size={32} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white text-center">
             <CircleDashed size={48} className="text-slate-200 mb-4" />
             <h3 className="text-lg font-bold text-slate-700">No tasks found</h3>
             <p className="text-sm text-slate-500">Add a task above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white rounded-b-2xl pb-2">
            {tasks.map(task => {
               const isDone = task.status?.toLowerCase() === 'done';
               const prioConfig = getPriorityConfig(task.priority);
               const statusConfig = getStatusConfig(task.status);
               const progConfig = getProgressConfig(task.progress);
               const assignees = teamMembers.filter(m => (task.assigned_to || []).includes(m.id));

               return (
                 <div key={task.id} className="flex flex-col border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors group">
                   <div className={`grid grid-cols-[auto_minmax(300px,1fr)_120px_140px_140px_140px_120px] gap-4 items-center px-6 py-3.5 ${isDone ? 'opacity-50 grayscale' : ''}`}>
                     {/* Checkbox */}
                     <div className="w-8 flex justify-center">
                       <button 
                          onClick={() => updateTask(task.id, 'status', isDone ? 'To Do' : 'Done')} 
                          className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isDone ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 text-transparent hover:border-emerald-500'}`}
                       >
                         {isDone && <Check size={14} strokeWidth={3} />}
                       </button>
                     </div>
                     
                     {/* Title */}
                     <div className="flex items-center gap-2 w-full pr-4">
                       <button onClick={() => toggleExpand(task)} className={`transition-colors flex-shrink-0 ${expandedTaskId === task.id ? 'text-primary-500' : 'text-slate-300 hover:text-primary-500'}`}>
                          {expandedTaskId === task.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                       </button>
                       <input 
                         type="text" 
                         value={task.title}
                         onChange={(e) => {
                            const newTasks = [...tasks];
                            const t = newTasks.find(t => t.id === task.id);
                            t.title = e.target.value;
                            setTasks(newTasks);
                         }}
                         onBlur={(e) => updateTask(task.id, 'title', e.target.value)}
                         className={`w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0 outline-none ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}
                       />
                     </div>

                   {/* Assignees */}
                   <div className="relative">
                      <button 
                         onClick={() => { setActiveMenuId(task.id); setActiveMenuType('assignee'); }}
                         className="flex -space-x-2 overflow-hidden hover:opacity-80 transition-opacity p-1 rounded hover:bg-slate-100"
                      >
                         {assignees.length > 0 ? (
                           assignees.slice(0, 3).map((a, i) => (
                             a.avatar_url ? 
                             <img key={a.id} src={a.avatar_url} className="inline-block h-7 w-7 rounded-full ring-2 ring-white" /> :
                             <div key={a.id} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 ring-2 ring-white text-[10px] font-bold text-white uppercase">{getUserInitials(a.full_name)}</div>
                           ))
                         ) : (
                           <div className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400"><Users size={12} /></div>
                         )}
                         {assignees.length > 3 && (
                           <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-600">+{assignees.length - 3}</div>
                         )}
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'assignee' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50">
                           <div className="px-3 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-2">Assign To</div>
                           <div className="max-h-48 overflow-y-auto">
                              {teamMembers.map(member => {
                                 const isAssigned = (task.assigned_to || []).includes(member.id);
                                 return (
                                   <button 
                                     key={member.id} 
                                     onClick={() => toggleAssignee(task.id, member.id)} 
                                     className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-sm"
                                   >
                                      <div className="flex items-center gap-2">
                                        {member.avatar_url ? 
                                          <img src={member.avatar_url} className="h-6 w-6 rounded-full" /> :
                                          <div className="h-6 w-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-bold">{getUserInitials(member.full_name)}</div>
                                        }
                                        <span className="font-medium text-slate-700 truncate">{member.full_name}</span>
                                      </div>
                                      {isAssigned && <Check size={14} className="text-primary-500" />}
                                   </button>
                                 );
                              })}
                           </div>
                        </div>
                      )}
                   </div>

                   {/* Status */}
                   <div className="relative">
                      <button 
                         onClick={() => { setActiveMenuId(task.id); setActiveMenuType('status'); }}
                         className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-bold transition-colors w-full justify-between ${statusConfig.bg}`}
                      >
                         <div className="flex items-center gap-1.5">{statusConfig.icon} {statusConfig.text}</div>
                         <ChevronDown size={12} className="opacity-50" />
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'status' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50">
                           {['To Do', 'In Progress', 'Review', 'Done'].map(s => (
                             <button key={s} onClick={() => updateTask(task.id, 'status', s)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">
                               {s}
                             </button>
                           ))}
                        </div>
                      )}
                   </div>

                   {/* Progress */}
                   <div className="relative">
                      <button 
                         onClick={() => { setActiveMenuId(task.id); setActiveMenuType('progress'); }}
                         className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors w-full justify-between ${progConfig.bg}`}
                      >
                         <span>{progConfig.text}</span>
                         <ChevronDown size={12} className="opacity-50" />
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'progress' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50">
                           {[
                             { val: 0, text: 'Not Started' },
                             { val: 25, text: 'Just Started' },
                             { val: 50, text: 'Halfway' },
                             { val: 75, text: 'Almost Done' },
                             { val: 100, text: 'Completed' }
                           ].map(p => (
                             <button key={p.val} onClick={() => updateTask(task.id, 'progress', p.val)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">
                               {p.text}
                             </button>
                           ))}
                        </div>
                      )}
                   </div>

                   {/* Priority */}
                   <div className="relative">
                      <button 
                         onClick={() => { setActiveMenuId(task.id); setActiveMenuType('priority'); }}
                         className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-xs font-bold transition-colors w-full justify-between ${prioConfig.bg}`}
                      >
                         <div className="flex items-center gap-1.5">{prioConfig.icon} {prioConfig.text}</div>
                         <ChevronDown size={12} className="opacity-50" />
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'priority' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50">
                           {['None', 'Low', 'Medium', 'High', 'Critical'].map(p => (
                             <button key={p} onClick={() => updateTask(task.id, 'priority', p)} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 font-medium">
                               {p}
                             </button>
                           ))}
                        </div>
                      )}
                   </div>

                   {/* Due Date */}
                   <div>
                      <div className="flex items-center gap-2 px-2 py-1 hover:bg-slate-100 rounded-md transition-colors cursor-text group/date">
                         <Calendar size={14} className="text-slate-400 group-hover/date:text-primary-500 transition-colors" />
                         <input 
                           type="date" 
                           value={task.due_date ? task.due_date.split('T')[0] : ''}
                           onChange={(e) => updateTask(task.id, 'due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                           className="bg-transparent border-none text-xs font-bold text-slate-600 focus:ring-0 p-0 outline-none w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                         />
                      </div>
                   </div>

                 </div>

                 {/* Expandable Area */}
                 {expandedTaskId === task.id && (
                   <div className="px-6 pb-6 pt-2 ml-[52px]">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-inner">
                        
                        {/* Description Section */}
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><FileText size={12}/> Description & Notes</label>
                            <button onClick={() => saveDescription(task.id)} className="text-[10px] font-bold text-primary-600 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-md shadow-sm hover:bg-primary-100 transition-colors">Save Details</button>
                          </div>
                          <textarea
                            value={activeDescription}
                            onChange={(e) => setActiveDescription(e.target.value)}
                            onBlur={() => saveDescription(task.id)}
                            placeholder="Add extensive details, links, or a paragraph form of the task..."
                            className="w-full h-full min-h-[200px] bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none leading-relaxed"
                          />
                        </div>

                        {/* Updates Feed Section */}
                        <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden h-[400px]">
                          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare size={12}/> Updates</label>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                            {(!taskUpdates[task.id] || taskUpdates[task.id].length === 0) ? (
                              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <MessageSquare size={32} className="mb-2 opacity-20" />
                                <p className="text-sm">No updates yet.</p>
                              </div>
                            ) : (
                              taskUpdates[task.id].map(update => (
                                <div key={update.id} className="flex gap-3">
                                  {update.user_profiles?.avatar_url ? (
                                    <img src={update.user_profiles.avatar_url} className="w-8 h-8 rounded-full border border-slate-200 shrink-0 object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                      {getUserInitials(update.user_profiles?.full_name)}
                                    </div>
                                  )}
                                  <div className="flex-1 bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-none p-3 relative group">
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-xs font-bold text-slate-800">{update.user_profiles?.full_name || 'Unknown User'}</span>
                                      <span className="text-[10px] text-slate-400">{new Date(update.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{update.content}</p>
                                    
                                    {update.attachment_url && (
                                      <div className="mt-3">
                                        {update.attachment_type?.startsWith('image/') ? (
                                          <a href={update.attachment_url} target="_blank" rel="noreferrer" className="block w-48 rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
                                            <img src={update.attachment_url} alt="Attachment" className="w-full h-auto" />
                                          </a>
                                        ) : (
                                          <a href={update.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors max-w-full">
                                            <div className="w-8 h-8 bg-white border border-slate-200 rounded flex items-center justify-center text-primary-500 shrink-0">
                                              <FileText size={16} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                              <span className="text-xs font-bold text-slate-700 truncate block w-full">{update.attachment_name}</span>
                                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1"><Download size={10}/> Download</span>
                                            </div>
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={updatesEndRef} />
                          </div>

                          {/* Update Input */}
                          <div className="p-3 bg-white border-t border-slate-200">
                            {attachmentFile && (
                              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 mb-2">
                                {attachmentFile.type.startsWith('image/') ? <ImageIcon size={14} className="text-primary-500"/> : <FileText size={14} className="text-primary-500"/>}
                                <span className="text-xs text-slate-600 font-medium truncate flex-1">{attachmentFile.name}</span>
                                <button onClick={() => setAttachmentFile(null)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={14}/></button>
                              </div>
                            )}
                            <div className="flex items-end gap-2">
                              <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                                <textarea
                                  value={newUpdateContent}
                                  onChange={(e) => setNewUpdateContent(e.target.value)}
                                  placeholder="Write an update..."
                                  className="w-full bg-transparent border-none text-sm p-2 outline-none resize-none min-h-[40px] max-h-[120px]"
                                  rows={1}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      submitUpdate(task.id);
                                    }
                                  }}
                                />
                                <div className="flex justify-between items-center px-2 pb-1">
                                  <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        setAttachmentFile(e.target.files[0]);
                                      }
                                    }}
                                    className="hidden" 
                                  />
                                  <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-primary-500 transition-colors p-1 rounded-md hover:bg-slate-200/50">
                                    <Paperclip size={16} />
                                  </button>
                                </div>
                              </div>
                              <button 
                                onClick={() => submitUpdate(task.id)}
                                disabled={isUploading || (!newUpdateContent.trim() && !attachmentFile)}
                                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white p-3 rounded-xl shadow-md transition-colors h-[54px] w-[54px] flex items-center justify-center shrink-0"
                              >
                                {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-1" />}
                              </button>
                            </div>
                          </div>
                        </div>
                     </div>
                   </div>
                 )}
                 </div>
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
