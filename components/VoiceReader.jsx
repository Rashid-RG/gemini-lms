"use client";
import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Settings, ChevronDown } from 'lucide-react';

export default function VoiceReader({ htmlContent }) {
    const [speaking, setSpeaking] = useState(false);
    const [paused, setPaused] = useState(false);
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [speed, setSpeed] = useState(1); // Default 1x speed
    const [showSettings, setShowSettings] = useState(false);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

    const sentencesRef = useRef([]);
    const synthRef = useRef(null);
    const utteranceRef = useRef(null);

    // Initialize SpeechSynthesis and load voices
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            synthRef.current = window.speechSynthesis;
            
            const loadVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                setVoices(availableVoices);
                
                // Find a good default voice (English preferred)
                const englishVoice = availableVoices.find(voice => 
                    voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Natural'))
                ) || availableVoices.find(voice => voice.lang.startsWith('en')) || availableVoices[0];
                
                setSelectedVoice(englishVoice);
            };

            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }

        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    // Stop speaking when content changes (e.g. user slides to next note)
    useEffect(() => {
        stopSpeech();
    }, [htmlContent]);

    // Clean HTML to sentence list
    const getSentencesFromHtml = (html) => {
        if (!html) return [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const rawText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Split by sentence ending punctuation followed by space or line break
        const rawSentences = rawText
            .replace(/```[a-z]*/gi, '') // Remove code fence headers
            .split(/(?<=[.?!])\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 2); // Filter out short strings
        
        return rawSentences;
    };

    const speakSentence = (index) => {
        if (!synthRef.current || index >= sentencesRef.current.length) {
            setSpeaking(false);
            setCurrentSentenceIndex(0);
            return;
        }

        setCurrentSentenceIndex(index);
        const text = sentencesRef.current[index];
        
        // Cancel any active utterance just in case
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        utterance.rate = speed;

        utterance.onend = () => {
            // Only proceed if we're still supposed to be speaking (not manually stopped/paused)
            if (speaking && !paused) {
                speakSentence(index + 1);
            }
        };

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance error:', event);
            if (event.error !== 'interrupted') {
                setSpeaking(false);
            }
        };

        synthRef.current.speak(utterance);
    };

    const startSpeech = () => {
        if (!synthRef.current) return;

        // If paused, resume
        if (paused) {
            synthRef.current.resume();
            setPaused(false);
            setSpeaking(true);
            return;
        }

        // Initialize sentences
        const parsedSentences = getSentencesFromHtml(htmlContent);
        if (parsedSentences.length === 0) return;

        sentencesRef.current = parsedSentences;
        setSpeaking(true);
        setPaused(false);
        speakSentence(0);
    };

    const pauseSpeech = () => {
        if (!synthRef.current) return;
        synthRef.current.pause();
        setPaused(true);
    };

    const stopSpeech = () => {
        if (!synthRef.current) return;
        synthRef.current.cancel();
        setSpeaking(false);
        setPaused(false);
        setCurrentSentenceIndex(0);
    };

    const handleVoiceChange = (e) => {
        const voiceName = e.target.value;
        const voice = voices.find(v => v.name === voiceName);
        if (voice) {
            setSelectedVoice(voice);
            if (speaking) {
                // If already speaking, restart from the current sentence with the new voice
                const currentIndex = currentSentenceIndex;
                synthRef.current.cancel();
                setTimeout(() => {
                    speakSentence(currentIndex);
                }, 100);
            }
        }
    };

    const handleSpeedChange = (newSpeed) => {
        setSpeed(newSpeed);
        if (speaking) {
            // Restart current sentence with new speed
            const currentIndex = currentSentenceIndex;
            synthRef.current.cancel();
            setTimeout(() => {
                speakSentence(currentIndex);
            }, 100);
        }
    };

    if (!voices || voices.length === 0) {
        return null; // Don't render if browser doesn't support speech synthesis
    }

    return (
        <div className="flex flex-col bg-slate-50 border border-slate-200/80 shadow-sm rounded-xl p-3 shrink-0 select-none">
            <div className="flex items-center gap-3">
                {/* Audio Status Icon */}
                <div className={`p-2 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0`}>
                    {speaking && !paused ? (
                        <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" />
                    ) : (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                    )}
                </div>

                {/* Audio Controls */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/60 rounded-lg p-0.5 shadow-sm">
                    {speaking && !paused ? (
                        <button
                            onClick={pauseSpeech}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 transition"
                            title="Pause"
                        >
                            <Pause className="w-4 h-4 fill-slate-700" />
                        </button>
                    ) : (
                        <button
                            onClick={startSpeech}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-indigo-600 transition"
                            title="Listen"
                        >
                            <Play className="w-4 h-4 fill-indigo-600 text-indigo-600" />
                        </button>
                    )}

                    {(speaking || paused) && (
                        <button
                            onClick={stopSpeech}
                            className="p-1.5 hover:bg-slate-100 rounded-md text-red-500 transition"
                            title="Stop"
                        >
                            <Square className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                    )}
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-lg px-2 py-1 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Speed:</span>
                    <select
                        value={speed}
                        onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                        className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                        <option value="0.75">0.75x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                    </select>
                </div>

                {/* Settings Toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-1.5 border rounded-lg transition shadow-sm bg-white ${showSettings ? 'border-indigo-200 text-indigo-600 bg-indigo-50/20' : 'border-slate-200/60 text-slate-500 hover:text-slate-700'}`}
                    title="Audio Settings"
                >
                    <Settings className={`w-4 h-4 ${speaking && !paused ? 'animate-spin-slow' : ''}`} />
                </button>

                {/* Soundwave animation (visual equalizer) */}
                {speaking && !paused && (
                    <div className="flex items-end gap-0.5 h-3 px-1">
                        <span className="w-0.5 bg-indigo-500 rounded animate-bounce [animation-duration:0.6s]"></span>
                        <span className="w-0.5 bg-indigo-600 rounded animate-bounce [animation-duration:0.4s]"></span>
                        <span className="w-0.5 bg-indigo-400 rounded animate-bounce [animation-duration:0.8s]"></span>
                        <span className="w-0.5 bg-indigo-500 rounded animate-bounce [animation-duration:0.5s]"></span>
                    </div>
                )}
            </div>

            {/* Expanded Settings Menu */}
            {showSettings && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Voice Narration Accent</label>
                    <select
                        value={selectedVoice?.name || ''}
                        onChange={handleVoiceChange}
                        className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        {voices.map(voice => (
                            <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                            </option>
                        ))}
                    </select>
                    {sentencesRef.current.length > 0 && speaking && (
                        <div className="text-[9px] text-slate-400 font-medium italic mt-1 truncate">
                            Reading sentence {currentSentenceIndex + 1} of {sentencesRef.current.length}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
