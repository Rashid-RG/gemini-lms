"use client"
import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import axios from 'axios'
import { useUser } from '@clerk/nextjs'

function VoiceTutorWidget({ courseId }) {
    const { user, isLoaded } = useUser();
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
    const [transcript, setTranscript] = useState('');
    const [messages, setMessages] = useState([]);
    const [conversationId, setConversationId] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    
    const recognitionRef = useRef(null);
    const synthRef = useRef(null);
    const utteranceRef = useRef(null);
    const chatEndRef = useRef(null);

    // Initialize Speech Synthesis and Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const rec = new SpeechRecognition();
                rec.continuous = false;
                rec.interimResults = false;
                rec.lang = 'en-US';

                rec.onstart = () => {
                    setStatus('listening');
                    setTranscript('');
                };

                rec.onresult = (event) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    handleUserSpeech(text);
                };

                rec.onerror = (e) => {
                    console.error('Speech recognition error:', e.error);
                    setStatus('idle');
                    if (e.error === 'not-allowed') {
                        toast.error('Microphone access denied. Please enable microphone permissions in your browser.');
                    }
                };

                rec.onend = () => {
                    setStatus(prev => prev === 'listening' ? 'idle' : prev);
                };

                recognitionRef.current = rec;
            }
        }
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const speak = (text) => {
        if (!synthRef.current || !soundEnabled) return;
        
        synthRef.current.cancel(); // cancel any active speech
        
        const cleanText = text.replace(/<[^>]*>/g, '').replace(/[\*\#\`\_]/g, ''); // strip markdown and HTML tags
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onstart = () => setStatus('speaking');
        utterance.onend = () => setStatus('idle');
        utterance.onerror = () => setStatus('idle');
        
        // Find a nice natural voice if available
        const voices = synthRef.current.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang === 'en-US');
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utteranceRef.current = utterance;
        synthRef.current.speak(utterance);
    };

    const toggleListening = () => {
        if (!recognitionRef.current) {
            toast.error('Voice recognition is not supported in this browser. Please use the keyboard text box.');
            return;
        }

        if (status === 'listening') {
            recognitionRef.current.stop();
        } else {
            if (synthRef.current) synthRef.current.cancel();
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.warn('Speech recognition start ignored (already active)');
            }
        }
    };

    const handleUserSpeech = async (text) => {
        if (!text.trim() || !userEmail) return;

        // Add user message to log
        const userMsg = { sender: 'user', content: text, createdAt: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setStatus('thinking');

        try {
            // Get active chapter context if saved in local storage (RAG)
            const activeChapterId = typeof window !== 'undefined' ? window.localStorage.getItem('active-chapter-id') : null;
            
            const res = await axios.put('/api/chat', {
                message: `[VOICE TUTOR QUESTION]: ${text}`,
                userEmail,
                conversationId,
                courseId,
                chapterId: activeChapterId ? Number(activeChapterId) : 0
            });

            const data = res.data.result || {};
            setConversationId(data.conversationId);
            
            // The bot reply is the last message in the returned list
            const botMessages = (data.messages || []).filter(m => m.sender === 'bot');
            const botReply = botMessages[botMessages.length - 1]?.content || 'I encountered an issue generating a tutor explanation.';
            
            const botMsg = { sender: 'bot', content: botReply, createdAt: new Date() };
            setMessages(prev => [...prev, botMsg]);
            
            // Speak response aloud
            speak(botReply);
        } catch (err) {
            console.error('Error fetching tutor response:', err);
            setStatus('idle');
            toast.error('Failed to get a response from your AI tutor.');
        }
    };

    const handleKeyboardSubmit = (e) => {
        e.preventDefault();
        const inputField = e.target.elements.messageInput;
        const input = inputField.value;
        if (input.trim()) {
            handleUserSpeech(input);
            inputField.value = '';
        }
    };

    if (!isLoaded || !user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-[340px] md:w-[400px] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col h-[480px] animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 rounded-t-2xl text-white">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 animate-pulse" />
                            <div>
                                <h3 className="font-bold text-sm">AI Voice Tutor</h3>
                                <p className="text-[10px] text-indigo-100 font-medium">Ask questions vocally about course material</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => {
                                    const nextState = !soundEnabled;
                                    setSoundEnabled(nextState);
                                    if (!nextState && synthRef.current) {
                                        synthRef.current.cancel();
                                    }
                                }}
                                className="h-8 w-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition"
                                title={soundEnabled ? "Mute voice replies" : "Unmute voice replies"}
                            >
                                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-200" />}
                            </button>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    if (synthRef.current) synthRef.current.cancel();
                                }}
                                className="h-8 w-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-6">
                                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Sparkles className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm">Your Personal RAG Study Tutor</h4>
                                <p className="text-xs text-slate-500 max-w-[240px]">
                                    Click the microphone button and ask questions verbally, or type below. I will explain concepts using your course notes context!
                                </p>
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div 
                                    key={index} 
                                    className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}
                                >
                                    <div 
                                        className={`
                                            px-4 py-2.5 rounded-2xl max-w-[85%] text-sm leading-relaxed
                                            ${msg.sender === 'user' 
                                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                                : 'bg-slate-100 text-slate-800 rounded-tl-none shadow-sm'
                                            }
                                        `}
                                    >
                                        {msg.content.replace('[VOICE TUTOR QUESTION]: ', '')}
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-medium mt-1 px-1">
                                        {msg.sender === 'user' ? 'You' : 'AI Voice Tutor'}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Status Info */}
                    {status !== 'idle' && (
                        <div className="px-4 py-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 flex items-center gap-1.5 border-t border-slate-100">
                            {status === 'listening' && (
                                <>
                                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                    <span className="text-red-600 uppercase tracking-wider">Listening to you...</span>
                                </>
                            )}
                            {status === 'thinking' && (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                    <span className="text-indigo-600 uppercase tracking-wider">Tutor is thinking...</span>
                                </>
                            )}
                            {status === 'speaking' && (
                                <>
                                    <Volume2 className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                                    <span className="text-emerald-600 uppercase tracking-wider font-bold">Speaking answer...</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Bottom Controls */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex gap-2 rounded-b-2xl">
                        {/* Audio Wave / Microphone toggle */}
                        <button
                            onClick={toggleListening}
                            className={`
                                h-10 w-10 rounded-xl flex items-center justify-center shadow-md transition-all duration-300
                                ${status === 'listening' 
                                    ? 'bg-red-500 text-white animate-pulse shadow-red-200' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-150'
                                }
                            `}
                            title="Click to talk"
                        >
                            {status === 'listening' ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>

                        <form onSubmit={handleKeyboardSubmit} className="flex-1 flex gap-2">
                            <input
                                name="messageInput"
                                type="text"
                                placeholder="Type your question..."
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-indigo-500"
                                disabled={status === 'thinking'}
                            />
                            <button
                                type="submit"
                                className="h-10 w-10 bg-slate-800 hover:bg-slate-900 text-white rounded-xl flex items-center justify-center transition shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Glowing Trigger Button */}
            <button
                onClick={() => {
                    const willOpen = !isOpen;
                    setIsOpen(willOpen);
                    if (!willOpen && synthRef.current) {
                        synthRef.current.cancel();
                    }
                }}
                className={`
                    h-14 w-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all duration-300
                    bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-indigo-200/50
                    ${isOpen ? 'rotate-90' : 'animate-bounce'}
                `}
                style={{ animationDuration: '4s' }}
            >
                {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
            </button>
        </div>
    )
}

export default VoiceTutorWidget
