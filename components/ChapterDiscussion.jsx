"use client";
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useUser } from '@clerk/nextjs';
import { MessageSquare, Send, CornerDownRight, RefreshCw, User, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ChapterDiscussion({ courseId, chapterId }) {
    const { user } = useUser();
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newThreadContent, setNewThreadContent] = useState('');
    const [submittingThread, setSubmittingThread] = useState(false);
    const [replyContent, setReplyContent] = useState({});
    const [submittingReply, setSubmittingReply] = useState({});
    const [activeReplyId, setActiveReplyId] = useState(null);

    useEffect(() => {
        if (courseId && chapterId !== undefined) {
            fetchDiscussions();
        }
    }, [courseId, chapterId]);

    const fetchDiscussions = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/discussions?courseId=${courseId}&chapterId=${chapterId}`);
            setThreads(res.data.result || []);
        } catch (error) {
            console.error("Failed to load discussions:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateThread = async () => {
        if (!newThreadContent.trim() || submittingThread) return;
        try {
            setSubmittingThread(true);
            const res = await axios.post('/api/discussions', {
                action: 'create_thread',
                courseId,
                chapterId: Number(chapterId),
                content: newThreadContent,
                studentName: user?.fullName || 'Anonymous'
            });

            if (res.data.success) {
                setThreads(prev => [res.data.result, ...prev]);
                setNewThreadContent('');
                toast.success("Discussion started!");
            }
        } catch (error) {
            console.error("Failed to post thread:", error);
            toast.error("Could not post message");
        } finally {
            setSubmittingThread(false);
        }
    };

    const handleCreateReply = async (discussionId) => {
        const content = replyContent[discussionId];
        if (!content || !content.trim() || submittingReply[discussionId]) return;
        try {
            setSubmittingReply(prev => ({ ...prev, [discussionId]: true }));
            const res = await axios.post('/api/discussions', {
                action: 'reply',
                discussionId: Number(discussionId),
                content: content,
                studentName: user?.fullName || 'Anonymous',
                role: 'student' // If admin handles it, they'd pass tutor/admin
            });

            if (res.data.success) {
                setThreads(prev => prev.map(t => {
                    if (t.id === discussionId) {
                        return {
                            ...t,
                            replies: [...(t.replies || []), res.data.result]
                        };
                    }
                    return t;
                }));
                setReplyContent(prev => ({ ...prev, [discussionId]: '' }));
                setActiveReplyId(null);
                toast.success("Reply posted!");
            }
        } catch (error) {
            console.error("Failed to post reply:", error);
            toast.error("Could not send reply");
        } finally {
            setSubmittingReply(prev => ({ ...prev, [discussionId]: false }));
        }
    };

    const toggleReplyBox = (discussionId) => {
        setActiveReplyId(prev => prev === discussionId ? null : discussionId);
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="bg-white border border-gray-100 shadow-md rounded-2xl p-6 mt-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-500" /> Discussion Board
                </h3>
                <button onClick={fetchDiscussions} className="text-gray-400 hover:text-indigo-600 transition p-1.5 rounded-lg hover:bg-gray-50">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Thread Creator */}
            <div className="flex gap-3 items-start">
                <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                    <User className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-2">
                    <textarea
                        value={newThreadContent}
                        onChange={(e) => setNewThreadContent(e.target.value)}
                        placeholder="Ask a question or share study notes about this topic..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-20 resize-none shadow-sm"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleCreateThread}
                            disabled={submittingThread || !newThreadContent.trim()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Send className="w-3.5 h-3.5" /> Post Question
                        </button>
                    </div>
                </div>
            </div>

            {/* Thread Feed */}
            {loading && threads.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 italic">
                    Loading discussion threads...
                </div>
            ) : threads.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                    No discussions yet. Be the first to start the thread!
                </div>
            ) : (
                <div className="space-y-6">
                    {threads.map(thread => (
                        <div key={thread.id} className="border border-gray-100/80 rounded-2xl p-4 space-y-4 shadow-sm hover:shadow transition bg-white">
                            {/* Thread header */}
                            <div className="flex items-start gap-2.5 justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                                        {thread.studentName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{thread.studentName}</p>
                                        <p className="text-[10px] text-gray-400">{formatDate(thread.createdAt)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Thread content */}
                            <p className="text-xs text-gray-700 leading-relaxed pl-1 whitespace-pre-wrap">{thread.content}</p>

                            {/* Actions panel */}
                            <div className="flex items-center gap-3 pl-1 text-[11px] font-bold text-gray-500">
                                <button
                                    onClick={() => toggleReplyBox(thread.id)}
                                    className="hover:text-indigo-600 transition flex items-center gap-1"
                                >
                                    Reply ({thread.replies?.length || 0})
                                </button>
                            </div>

                            {/* Indented Replies block */}
                            {thread.replies && thread.replies.length > 0 && (
                                <div className="space-y-4 pl-6 border-l-2 border-gray-100 mt-2">
                                    {thread.replies.map(reply => {
                                        const isAdmin = reply.role === 'admin' || reply.role === 'tutor';
                                        return (
                                            <div key={reply.id} className="space-y-1 animate-in fade-in duration-200">
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-6 w-6 rounded-full text-[10px] flex items-center justify-center font-bold ${isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-gray-100 text-gray-600'}`}>
                                                        {reply.authorName?.charAt(0)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-bold text-gray-800">{reply.authorName}</span>
                                                        {isAdmin && (
                                                            <span className="flex items-center gap-0.5 text-[8px] px-1 bg-indigo-50 border border-indigo-100 rounded text-indigo-700 font-extrabold uppercase tracking-wide">
                                                                <ShieldCheck className="w-2.5 h-2.5" /> Tutor
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] text-gray-400 font-medium">• {formatDate(reply.createdAt)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 items-start pl-8">
                                                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Reply Input Box */}
                            {activeReplyId === thread.id && (
                                <div className="flex gap-2.5 items-start pl-6 mt-3 animate-in slide-in-from-top-2 duration-200">
                                    <CornerDownRight className="w-4 h-4 text-gray-300 shrink-0 mt-2" />
                                    <div className="flex-1 space-y-2">
                                        <textarea
                                            value={replyContent[thread.id] || ''}
                                            onChange={(e) => setReplyContent(prev => ({ ...prev, [thread.id]: e.target.value }))}
                                            placeholder="Write your response..."
                                            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 h-16 resize-none shadow-sm"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setActiveReplyId(null)}
                                                className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-50 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleCreateReply(thread.id)}
                                                disabled={submittingReply[thread.id] || !(replyContent[thread.id] || '').trim()}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold shadow transition disabled:opacity-50"
                                            >
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
