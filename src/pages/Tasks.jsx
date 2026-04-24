import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, Square, Plus, Loader2, 
  SignalHigh, SignalMedium, SignalLow, CircleDashed, 
  Calendar, Users, ChevronDown, Flame, AlertCircle, Clock, Check
} from 'lucide-react';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeMenuType, setActiveMenuType] = useState(null); // 'status', 'priority', 'assignee'
  
  const menuRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
    
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
        setActiveMenuType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    
    if (field !== 'title' && field !== 'progress') {
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
        <div className="flex items-center gap-2">
          {/* Mock Tabs */}
          <button className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg shadow-sm">All Tasks</button>
          <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 text-sm font-bold rounded-lg shadow-sm transition-colors">My Tasks</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col">
        {/* Table Header */}
        <div className="grid grid-cols-[auto_minmax(300px,1fr)_120px_140px_140px_140px_120px] gap-4 items-center px-6 py-4 bg-slate-50/80 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-widest rounded-t-2xl">
          <div className="w-8 flex justify-center"><CheckSquare size={16} /></div>
          <div>Task Name</div>
          <div>Assigned To</div>
          <div>Status</div>
          <div>Progress</div>
          <div>Priority</div>
          <div>Due Date</div>
        </div>

        {/* Input Row */}
        <form onSubmit={addTask} className="border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
          <div className="grid grid-cols-[auto_minmax(300px,1fr)_120px_140px_140px_140px_120px] gap-4 items-center px-6 py-3">
            <div className="w-8 flex justify-center text-slate-300"><Plus size={18} /></div>
            <input 
              type="text" 
              placeholder="Add a new task... (Press Enter)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-transparent border-none text-slate-800 text-sm font-medium focus:ring-0 p-0 outline-none placeholder-slate-400"
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
               const assignees = teamMembers.filter(m => (task.assigned_to || []).includes(m.id));

               return (
                 <div key={task.id} className={`grid grid-cols-[auto_minmax(300px,1fr)_120px_140px_140px_140px_120px] gap-4 items-center px-6 py-3 hover:bg-slate-50 transition-colors group ${isDone ? 'opacity-60' : ''}`}>
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
                   <div>
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
                   <div className="flex items-center gap-2 pr-4">
                      <input 
                         type="number" 
                         min="0" max="100"
                         value={task.progress || 0}
                         onChange={(e) => updateTask(task.id, 'progress', parseInt(e.target.value) || 0)}
                         className="w-12 text-right bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 p-0 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-400">%</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}></div>
                      </div>
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
               );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
