import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, Circle, MoreHorizontal, Plus, Loader2, SignalHigh, SignalMedium, SignalLow, CircleDashed } from 'lucide-react';

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;
    
    setIsSubmitting(true);
    const newTask = {
      title: newTaskTitle.trim(),
      status: 'todo',
      priority: 'none',
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
    }
    setIsSubmitting(false);
  };

  const toggleTaskStatus = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    
    // Optimistic UI update
    setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id);

    if (error) {
      // Revert on error
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: task.status } : t));
    }
  };

  const deleteTask = async (taskId) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    await supabase.from('tasks').delete().eq('id', taskId);
  };

  const updatePriority = async (taskId, priority) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, priority } : t));
    await supabase.from('tasks').update({ priority }).eq('id', taskId);
    setActiveMenuId(null);
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return <SignalHigh size={14} className="text-rose-500" />;
      case 'medium': return <SignalMedium size={14} className="text-amber-500" />;
      case 'low': return <SignalLow size={14} className="text-emerald-500" />;
      default: return null;
    }
  };

  const todoTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">My Issues</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your internal tasks and action items.</p>
      </div>

      {/* Input */}
      <form onSubmit={addTask} className="mb-10 relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          {isSubmitting ? <Loader2 size={18} className="text-primary-500 animate-spin" /> : <Plus size={18} className="text-slate-400" />}
        </div>
        <input 
          type="text" 
          placeholder="New issue... (Press Enter)"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          disabled={isSubmitting}
          className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 block pl-12 p-3.5 shadow-sm transition-all outline-none"
        />
      </form>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-300" size={32} />
        </div>
      ) : (
        <div className="space-y-8">
          {/* To Do */}
          <div>
            <div className="flex items-center gap-2 mb-3 px-2">
              <CircleDashed size={14} className="text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700">To Do</h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </div>
            
            {todoTasks.length === 0 ? (
               <div className="text-sm text-slate-400 px-8 py-4 border border-dashed border-slate-200 rounded-xl">No pending tasks.</div>
            ) : (
               <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100">
                 {todoTasks.map(task => (
                    <div key={task.id} className="group flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors first:rounded-t-xl last:rounded-b-xl">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleTaskStatus(task)} className="text-slate-300 hover:text-primary-500 transition-colors focus:outline-none">
                          <Circle size={18} />
                        </button>
                        <span className="text-sm font-medium text-slate-800">{task.title}</span>
                      </div>
                      <div className={`flex items-center gap-3 transition-opacity relative ${activeMenuId === task.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {getPriorityIcon(task.priority)}
                        <button 
                          className={`text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200 transition-colors ${activeMenuId === task.id ? 'bg-slate-200 text-slate-700' : ''}`}
                          onClick={() => setActiveMenuId(activeMenuId === task.id ? null : task.id)}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        
                        {activeMenuId === task.id && (
                          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 overflow-hidden">
                            <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Priority</div>
                            <button onClick={() => updatePriority(task.id, 'high')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <SignalHigh size={14} className="text-rose-500" /> High
                            </button>
                            <button onClick={() => updatePriority(task.id, 'medium')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <SignalMedium size={14} className="text-amber-500" /> Medium
                            </button>
                            <button onClick={() => updatePriority(task.id, 'low')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <SignalLow size={14} className="text-emerald-500" /> Low
                            </button>
                            <button onClick={() => updatePriority(task.id, 'none')} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                              <CircleDashed size={14} className="text-slate-400" /> None
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button onClick={() => deleteTask(task.id)} className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 font-medium">
                              Delete Issue
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                 ))}
               </div>
            )}
          </div>

          {/* Done */}
          {doneTasks.length > 0 && (
             <div>
                <div className="flex items-center gap-2 mb-3 px-2">
                  <CheckCircle2 size={14} className="text-primary-500" />
                  <h3 className="text-sm font-bold text-slate-700">Done</h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{doneTasks.length}</span>
                </div>
                
                <div className="bg-slate-50/50 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden opacity-75">
                  {doneTasks.map(task => (
                     <div key={task.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                       <div className="flex items-center gap-3">
                         <button onClick={() => toggleTaskStatus(task)} className="text-primary-500 hover:text-primary-600 transition-colors focus:outline-none">
                           <CheckCircle2 size={18} />
                         </button>
                         <span className="text-sm font-medium text-slate-500 line-through">{task.title}</span>
                       </div>
                     </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
