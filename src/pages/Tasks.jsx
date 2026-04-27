import React, { useState, useEffect, useRef } from 'react';
import heic2any from 'heic2any';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  CheckSquare, Square, Plus, Loader2, 
  SignalHigh, SignalMedium, SignalLow, CircleDashed, 
  Calendar, Users, ChevronDown, Flame, AlertCircle, Clock, Check, CheckCircle2, ChevronRight,
  Paperclip, Send, FileText, Download, X, MessageSquare, Image as ImageIcon
} from 'lucide-react';

const AttachmentViewer = ({ update, onImageClick }) => {
  const [imgError, setImgError] = useState(false);

  if (!update.attachment_url) return null;

  const isImage = update.attachment_type?.startsWith('image/') && !imgError;

  if (isImage) {
    return (
      <div className="mt-3">
        <button 
          onClick={() => onImageClick({ url: update.attachment_url, name: update.attachment_name })} 
          className="block w-full max-w-[280px] rounded-xl overflow-hidden border border-slate-200/60 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all bg-slate-50 relative min-h-[60px] cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          <img 
            src={update.attachment_url} 
            alt={update.attachment_name || "Attachment"} 
            className="w-full h-auto object-cover" 
            onError={() => setImgError(true)}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <a href={update.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-4 py-2.5 rounded-xl hover:bg-slate-100 hover:shadow-sm hover:-translate-y-0.5 transition-all max-w-full">
        <div className="w-10 h-10 bg-white border border-slate-200/60 shadow-sm rounded-lg flex items-center justify-center text-primary-500 shrink-0">
          <FileText size={18} />
        </div>
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-[13px] font-bold text-slate-700 truncate block w-full">{update.attachment_name || "Download Attachment"}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1"><Download size={10}/> Download</span>
        </div>
      </a>
    </div>
  );
};

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
  const [activeImage, setActiveImage] = useState(null);
  
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
      // Scroll to bottom without jumping the page
      setTimeout(() => {
        const container = document.getElementById(`updates-container-${taskId}`);
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
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
      let fileToUpload = attachmentFile;
      const isHeic = attachmentFile.name.toLowerCase().endsWith('.heic') || attachmentFile.type === 'image/heic';

      if (isHeic) {
        try {
          const blob = await heic2any({
            blob: attachmentFile,
            toType: "image/jpeg",
            quality: 0.8
          });
          const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
          const newName = attachmentFile.name.replace(/\.heic$/i, '.jpeg');
          fileToUpload = new File([jpegBlob], newName, { type: "image/jpeg" });
        } catch (err) {
          console.error("HEIC conversion failed:", err);
        }
      }

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${taskId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('task-attachments')
        .upload(fileName, fileToUpload);

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
      uploadedName = fileToUpload.name;
      uploadedType = fileToUpload.type;
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
      case 'critical': return { icon: <Flame size={14} className="text-rose-500" />, text: 'Critical', bg: 'bg-rose-50 text-rose-700 border-rose-200/60' };
      case 'high': return { icon: <SignalHigh size={14} className="text-orange-500" />, text: 'High', bg: 'bg-orange-50 text-orange-700 border-orange-200/60' };
      case 'medium': return { icon: <SignalMedium size={14} className="text-blue-500" />, text: 'Medium', bg: 'bg-blue-50 text-blue-700 border-blue-200/60' };
      case 'low': return { icon: <SignalLow size={14} className="text-slate-400" />, text: 'Low', bg: 'bg-slate-50 text-slate-600 border-slate-200/60' };
      default: return { icon: <CircleDashed size={14} className="text-slate-400" />, text: 'None', bg: 'bg-slate-50 text-slate-500 border-slate-200/60' };
    }
  };

  const getStatusConfig = (status) => {
    switch(status?.toLowerCase()) {
      case 'done': return { icon: <CheckCircle2 size={14} className="text-emerald-500" />, text: 'Done', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' };
      case 'in progress': return { icon: <Clock size={14} className="text-amber-500" />, text: 'In Progress', bg: 'bg-amber-50 text-amber-700 border-amber-200/60' };
      case 'review': return { icon: <AlertCircle size={14} className="text-purple-500" />, text: 'Review', bg: 'bg-purple-50 text-purple-700 border-purple-200/60' };
      default: return { icon: <CircleDashed size={14} className="text-slate-400" />, text: 'To Do', bg: 'bg-slate-50 text-slate-600 border-slate-200/60' };
    }
  };

  const getProgressConfig = (progress) => {
    const val = parseInt(progress) || 0;
    if (val >= 100) return { text: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' };
    if (val >= 75) return { text: 'Almost Done', bg: 'bg-blue-50 text-blue-700 border border-blue-200/60' };
    if (val >= 50) return { text: 'Halfway', bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' };
    if (val >= 25) return { text: 'Just Started', bg: 'bg-amber-50 text-amber-700 border border-amber-200/60' };
    return { text: 'Not Started', bg: 'bg-slate-50 text-slate-600 border border-slate-200/60' };
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
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-extrabold tracking-wide transition-all w-full justify-between hover:shadow-sm hover:scale-[1.02] active:scale-95 ${statusConfig.bg}`}
                      >
                         <div className="flex items-center gap-1.5">{statusConfig.icon} {statusConfig.text}</div>
                         <ChevronDown size={12} className="opacity-40" />
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'status' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-2 w-44 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-in zoom-in-95 duration-100">
                           {['To Do', 'In Progress', 'Review', 'Done'].map(s => (
                             <button key={s} onClick={() => updateTask(task.id, 'status', s)} className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors">
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
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide transition-all w-full justify-between hover:shadow-sm hover:scale-[1.02] active:scale-95 ${progConfig.bg}`}
                      >
                         <span>{progConfig.text}</span>
                         <ChevronDown size={12} className="opacity-40" />
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'progress' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-2 w-44 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-in zoom-in-95 duration-100">
                           {[
                             { val: 0, text: 'Not Started' },
                             { val: 25, text: 'Just Started' },
                             { val: 50, text: 'Halfway' },
                             { val: 75, text: 'Almost Done' },
                             { val: 100, text: 'Completed' }
                           ].map(p => (
                             <button key={p.val} onClick={() => updateTask(task.id, 'progress', p.val)} className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors">
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
                         className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-extrabold tracking-wide transition-all w-full justify-between hover:shadow-sm hover:scale-[1.02] active:scale-95 ${prioConfig.bg}`}
                      >
                         <div className="flex items-center gap-1.5">{prioConfig.icon} {prioConfig.text}</div>
                         <ChevronDown size={12} className="opacity-40" />
                      </button>
                      
                      {activeMenuId === task.id && activeMenuType === 'priority' && (
                        <div ref={menuRef} className="absolute left-0 top-full mt-2 w-44 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 animate-in zoom-in-95 duration-100">
                           {['None', 'Low', 'Medium', 'High', 'Critical'].map(p => (
                             <button key={p} onClick={() => updateTask(task.id, 'priority', p)} className="w-full text-left px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 rounded-xl font-bold transition-colors">
                               {p}
                             </button>
                           ))}
                        </div>
                      )}
                   </div>

                   {/* Due Date */}
                   <div>
                      <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 rounded-full border border-transparent hover:border-slate-200 hover:shadow-sm transition-all cursor-text group/date">
                         <Calendar size={14} className="text-slate-400 group-hover/date:text-primary-500 transition-colors shrink-0" />
                         <input 
                           type="date" 
                           value={task.due_date ? task.due_date.split('T')[0] : ''}
                           onChange={(e) => updateTask(task.id, 'due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                           className="bg-transparent border-none text-[11px] font-extrabold tracking-wide text-slate-600 focus:ring-0 p-0 outline-none w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
                         />
                      </div>
                   </div>

                 </div>

                 {/* Expandable Area - Legendary Workspace */}
                 {expandedTaskId === task.id && (
                   <div className="px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-2 ml-[52px] animate-in fade-in slide-in-from-top-4 duration-300">
                     <div className="flex flex-col lg:flex-row gap-6 bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/60 rounded-[24px] p-6 shadow-2xl shadow-slate-200/50 ring-1 ring-white/50 relative overflow-hidden">
                        
                        {/* Subtle background glow */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary-100/30 rounded-full blur-3xl pointer-events-none"></div>

                        {/* Description Section (Left 60%) */}
                        <div className="flex flex-col w-full lg:w-3/5 h-[500px]">
                          <div className="flex justify-between items-center mb-4 pl-1">
                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><FileText size={14} className="text-primary-500" /> Description & Notes</label>
                            <button onClick={() => saveDescription(task.id)} className="text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 px-4 py-2 rounded-full shadow-md shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-95">Save Details</button>
                          </div>
                          <div className="flex-1 bg-white border border-slate-200/60 rounded-2xl p-1 shadow-inner relative group focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-300 transition-all">
                            <textarea
                              value={activeDescription}
                              onChange={(e) => setActiveDescription(e.target.value)}
                              onBlur={() => saveDescription(task.id)}
                              placeholder="Add extensive details, links, or a paragraph form of the task..."
                              className="w-full h-full bg-transparent border-none p-4 text-[15px] text-slate-700 outline-none resize-none leading-relaxed placeholder-slate-300"
                            />
                          </div>
                        </div>

                        {/* Updates Feed Section (Right 40%) */}
                        <div className="flex flex-col w-full lg:w-2/5 h-[500px] relative">
                          <div className="flex justify-between items-center mb-4 pl-1">
                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquare size={14} className="text-primary-500" /> Activity Stream</label>
                          </div>
                          
                          {/* Timeline Feed */}
                          <div id={`updates-container-${task.id}`} className="flex-1 overflow-y-auto px-1 pb-4 space-y-6 relative">
                            {/* Vertical Line */}
                            {taskUpdates[task.id]?.length > 0 && (
                              <div className="absolute left-[23px] top-4 bottom-4 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent z-0" />
                            )}
                            
                            {(!taskUpdates[task.id] || taskUpdates[task.id].length === 0) ? (
                              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100 shadow-inner">
                                  <MessageSquare size={24} className="opacity-40" />
                                </div>
                                <p className="text-sm font-medium">No activity yet.</p>
                                <p className="text-xs text-slate-400 text-center max-w-[200px] mt-1">Be the first to post an update or attach a file.</p>
                              </div>
                            ) : (
                              taskUpdates[task.id].map(update => (
                                <div key={update.id} className="relative z-10 flex gap-4 group">
                                  {update.user_profiles?.avatar_url ? (
                                    <img src={update.user_profiles.avatar_url} className="w-10 h-10 rounded-full border-[3px] border-white shadow-sm shrink-0 object-cover ring-1 ring-slate-100" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0 border-[3px] border-white shadow-sm ring-1 ring-slate-100">
                                      {getUserInitials(update.user_profiles?.full_name)}
                                    </div>
                                  )}
                                  <div className="flex-1 pt-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                      <span className="text-sm font-bold text-slate-800 truncate pr-2">{update.user_profiles?.full_name || 'Unknown User'}</span>
                                      <span className="text-[10px] font-bold tracking-wide text-slate-400 shrink-0">{new Date(update.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className="bg-white border border-slate-100 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] rounded-[16px] rounded-tl-sm p-3.5 group-hover:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)] transition-all">
                                      <p className="text-[13px] text-slate-600 whitespace-pre-wrap leading-relaxed">{update.content}</p>
                                      
                                      <AttachmentViewer update={update} onImageClick={setActiveImage} />
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={updatesEndRef} />
                          </div>

                          {/* Integrated Command Console */}
                          <div className="mt-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-200/50 p-1 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-300 transition-all flex flex-col relative">
                            {attachmentFile && (
                              <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100 m-2 mb-1">
                                {attachmentFile.type.startsWith('image/') ? <ImageIcon size={14} className="text-primary-500"/> : <FileText size={14} className="text-primary-500"/>}
                                <span className="text-xs text-slate-700 font-bold truncate flex-1">{attachmentFile.name}</span>
                                <button onClick={() => setAttachmentFile(null)} className="text-slate-400 hover:text-rose-500 bg-white border border-slate-200 rounded-full p-1 transition-colors hover:shadow-sm"><X size={12}/></button>
                              </div>
                            )}
                            
                            <textarea
                              value={newUpdateContent}
                              onChange={(e) => setNewUpdateContent(e.target.value)}
                              placeholder="Write a status update..."
                              className="w-full bg-transparent border-none text-[14px] p-3 outline-none resize-none min-h-[44px] max-h-[120px] placeholder-slate-300"
                              rows={1}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  submitUpdate(task.id);
                                }
                              }}
                            />
                            
                            <div className="flex justify-between items-center px-2 pb-2 pt-1">
                              <div className="flex items-center">
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
                                <button 
                                  onClick={() => fileInputRef.current?.click()} 
                                  className="text-slate-400 hover:text-primary-500 hover:bg-primary-50 p-2 rounded-full transition-all group"
                                  title="Attach File"
                                >
                                  <Paperclip size={18} className="group-hover:-rotate-12 transition-transform" />
                                </button>
                              </div>
                              <button 
                                onClick={() => submitUpdate(task.id)}
                                disabled={isUploading || (!newUpdateContent.trim() && !attachmentFile)}
                                className="bg-slate-800 hover:bg-slate-900 disabled:opacity-30 text-white px-5 py-2 rounded-full shadow-md transition-all flex items-center justify-center font-bold text-xs gap-2 hover:scale-[1.02] active:scale-95"
                              >
                                {isUploading ? (
                                  <><Loader2 size={16} className="animate-spin" /> Sending...</>
                                ) : (
                                  <>Post <Send size={14} className="-mt-0.5" /></>
                                )}
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

      {/* Image Lightbox */}
      {activeImage && (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md" 
            onClick={() => setActiveImage(null)}
        >
            <div className="absolute top-6 right-6 flex items-center gap-3 z-[10000]">
                <a 
                    href={activeImage.url} 
                    download={activeImage.name || "attachment"} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                    title="Download Image"
                >
                    <Download size={20} />
                </a>
                <button 
                    className="text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-colors flex items-center justify-center" 
                    onClick={() => setActiveImage(null)}
                    title="Close"
                >
                    <X size={20} />
                </button>
            </div>
            <img 
                src={activeImage.url} 
                alt="Enlarged view" 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl ring-1 ring-white/10 object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
      )}
    </div>
  );
}
