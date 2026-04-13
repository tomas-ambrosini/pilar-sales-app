import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Send, MessageSquare, Loader2 } from 'lucide-react';

export default function ProposalComments({ proposalId }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        let subscription;
        const fetchComments = async () => {
            try {
                const { data, error } = await supabase
                    .from('proposal_comments')
                    .select(`
                        id, content, created_at, user_id,
                        user_profiles:user_id (id, full_name, avatar_url, username)
                    `)
                    .eq('proposal_id', proposalId)
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                setComments(data || []);
            } catch (error) {
                console.error("Error fetching comments:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchComments();

        // Subscribe to real-time additions
        subscription = supabase.channel(`comments-${proposalId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'proposal_comments',
                filter: `proposal_id=eq.${proposalId}`
            }, async (payload) => {
                // Fetch user data for the new comment since standard payload doesn't include joined relations
                const { data: userData } = await supabase
                    .from('user_profiles')
                    .select('id, full_name, avatar_url, username')
                    .eq('id', payload.new.user_id)
                    .single();
                
                const newComment = { ...payload.new, user_profiles: userData };
                setComments(prev => [...prev, newComment]);
            })
            .subscribe();

        return () => {
            if (subscription) supabase.removeChannel(subscription);
        };
    }, [proposalId]);

    // Fast scroll to bottom
    useEffect(() => {
        if (containerRef.current) {
            // Safe manual scroll that doesn't trigger parent window jumping
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        
        const messageText = newMessage.trim();
        setNewMessage('');
        setSubmitting(true);

        try {
            const { error } = await supabase.from('proposal_comments').insert({
                proposal_id: proposalId,
                user_id: user.id,
                content: messageText
            });
            if (error) throw error;
        } catch(error) {
            console.error("Error posting comment:", error);
            alert("Failed to send comment.");
            setNewMessage(messageText); // Restore on error
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8 bg-slate-50 border-t border-slate-100">
                <Loader2 size={16} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="h-full bg-slate-50 border border-slate-200/60 rounded-xl overflow-hidden shadow-inner flex flex-col relative">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 py-3 px-5 flex items-center gap-2 sticky top-0 z-10 shadow-sm">
                <MessageSquare size={14} className="text-primary-600" />
                <h4 className="font-bold text-slate-800 text-sm">Proposal Thread</h4>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
                    {comments.length}
                </span>
            </div>

            {/* Comments List */}
            <div ref={containerRef} className="flex-1 overflow-y-auto p-5 space-y-4">
                {comments.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare size={24} className="text-slate-300 mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-semibold text-slate-500">No comments yet</p>
                        <p className="text-xs text-slate-400 mt-1">Leave a note, tag a rep, or log an internal update.</p>
                    </div>
                ) : (
                    comments.map(comment => {
                        const isMe = user?.id === comment.user_id;
                        const profile = comment.user_profiles || {};
                        const name = profile.full_name || 'System User';
                        const initials = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
                        
                        return (
                            <div key={comment.id} className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                {/* Avatar */}
                                <div className="shrink-0 mt-0.5">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={name} className="w-7 h-7 rounded-full object-cover border border-slate-200 shadow-sm" />
                                    ) : (
                                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-black border border-slate-200/50 shadow-sm">
                                            {initials}
                                        </div>
                                    )}
                                </div>

                                {/* Bubble */}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[11px] font-bold text-slate-600">{isMe ? 'You' : name}</span>
                                        <span className="text-[10px] font-semibold text-slate-400">
                                            {new Date(comment.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <div className={`text-sm px-3.5 py-2 rounded-2xl ${isMe ? 'bg-primary-600 text-white rounded-tr-[4px] shadow-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-[4px] shadow-sm'}`}>
                                        <p className="whitespace-pre-wrap break-words">{comment.content}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Input Wrapper */}
            <div className="bg-white p-3 border-t border-slate-200">
                <form onSubmit={handleSend} className="relative flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Discuss this proposal..."
                        className="w-full bg-slate-50 border border-slate-200 text-sm font-medium rounded-full py-2.5 pl-4 pr-12 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow outline-none placeholder:text-slate-400 placeholder:font-medium"
                        disabled={submitting}
                    />
                    <button 
                        type="submit"
                        disabled={submitting || !newMessage.trim()}
                        className="absolute right-1 w-8 h-8 flex items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} className="-ml-0.5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
