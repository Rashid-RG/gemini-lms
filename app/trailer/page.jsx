"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Pause, Volume2, VolumeX, SkipForward, ArrowRight,
  BookOpen, BrainCircuit, Sparkles, GraduationCap, CheckCircle, Clock, AlertTriangle, Layers,
  Terminal, Users, ShieldAlert, Cpu, Database, Eye, Laptop, MessageSquare, HelpCircle, ArrowUpRight,
  FileText, Globe, Activity, Award, UserCheck, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Custom typewriter component for premium typing animation
function TypewriterText({ text, speed = 40, delay = 0, className = "" }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    setDisplayedText("");
    const startTimeout = setTimeout(() => {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        if (index >= text.length) {
          clearInterval(interval);
        }
      }, speed);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay]);

  return <span className={className}>{displayedText}</span>;
}

// Cinematic browser-chrome frame for premium stylized product mockups
function BrowserFrame({ children, label = "gemini-lms.vercel.app", glow = "indigo", className = "" }) {
  const glowColor = {
    indigo: "rgba(99,102,241,0.35)",
    purple: "rgba(168,85,247,0.35)",
    emerald: "rgba(16,185,129,0.3)",
    pink: "rgba(236,72,153,0.3)",
    cyan: "rgba(34,211,238,0.3)",
  }[glow] || "rgba(99,102,241,0.35)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl ${className}`}
      style={{ boxShadow: `0 25px 60px -15px ${glowColor}` }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-850/80 border-b border-white/5 backdrop-blur-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        <span className="ml-2 text-[9px] font-mono text-slate-500 truncate">{label}</span>
      </div>
      <div className="relative p-5 min-h-[230px] flex flex-col">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] pointer-events-none" style={{ background: glowColor }} />
        {children}
      </div>
    </motion.div>
  );
}

export default function TrailerPage() {
  const router = useRouter();
  const [hasStarted, setHasStarted] = useState(false); // To prompt user interaction for audio bypass
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [mounted, setMounted] = useState(false);
  const totalDuration = 95; // 95 seconds total duration (Fast & Cinematic)

  // Voiceover Narrator states
  const [voices, setVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  // Original synthesized cinematic score (no external audio file, no licensing risk)
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const filterRef = useRef(null);
  const padNodesRef = useRef([]);
  const lfoRef = useRef(null);

  // Gain levels for the score (Web Audio gain, 0-1 range)
  const NORMAL_VOL = 0.5;
  const DUCKED_VOL = 0.16;

  // Determine active scene based on optimized timings
  const getSceneInfo = () => {
    if (currentTime < 10) {
      return {
        id: 1,
        title: "Scene 1: The Education Crisis",
        voiceover: "Education has never had more information. Yet students have never felt more overwhelmed.",
        tagline: "Millions of students struggle every day."
      };
    }
    if (currentTime < 18) {
      return {
        id: 2,
        title: "Scene 2: Information Overload",
        voiceover: "Learning shouldn't feel like survival.",
        tagline: "Too many resources. Too little time."
      };
    }
    if (currentTime < 28) {
      return {
        id: 3,
        title: "Scene 3: Arrival of Gemini LMS",
        voiceover: "Introducing Gemini LMS. The next generation AI-powered learning platform.",
        tagline: "Enter Gemini LMS 3.0"
      };
    }
    if (currentTime < 42) {
      return {
        id: 4,
        title: "Scene 4: AI Course Generation",
        voiceover: "Simply upload a topic. Gemini LMS transforms it into a complete learning experience.",
        tagline: "PDF to complete structured course instantly."
      };
    }
    if (currentTime < 50) {
      return {
        id: 5,
        title: "Scene 5: Smart Notes",
        voiceover: "AI-generated notes that simplify complex topics instantly.",
        tagline: "Dynamic, highlighted concept maps and formulas."
      };
    }
    if (currentTime < 58) {
      return {
        id: 6,
        title: "Scene 6: Flashcards & Spaced Repetition",
        voiceover: "Scientifically-backed spaced repetition helps students remember more and forget less.",
        tagline: "Interactive 3D memory pathways."
      };
    }
    if (currentTime < 66) {
      return {
        id: 7,
        title: "Scene 7: AI Voice Tutor & Chatbot",
        voiceover: "Your personal AI tutor. Available anytime.",
        tagline: "Natural conversational guidance and interactive diagrams."
      };
    }
    if (currentTime < 73) {
      return {
        id: 8,
        title: "Scene 8: Quizzes & Assignments",
        voiceover: "Instant assessment. Intelligent feedback.",
        tagline: "Track mastery with smart graded diagnostics."
      };
    }
    if (currentTime < 80) {
      return {
        id: 9,
        title: "Scene 9: Coding Playground",
        voiceover: "Learn by building. Learn by doing.",
        tagline: "Execute Python, Java, and JavaScript in real-time."
      };
    }
    if (currentTime < 87) {
      return {
        id: 10,
        title: "Scene 10: Discussion Boards & Community",
        voiceover: "Learning becomes a shared experience.",
        tagline: "Collaborate, ask questions, and grow globally."
      };
    }
    if (currentTime < 92) {
      return {
        id: 11,
        title: "Scene 11: Instructor & Admin Power",
        voiceover: "Powerful tools for instructors, administrators, and institutions.",
        tagline: "Real-time analytics, metrics, and automated workflows."
      };
    }
    return {
      id: 12,
      title: "Final Product Reveal",
      voiceover: "The future of learning is intelligent. The future of learning is personalized. The future of learning is here.",
      tagline: "GEMINI LMS 3.0 — Launching Today"
    };
  };

  const scene = getSceneInfo();

  // Load English voices on mount
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const englishVoices = allVoices.filter(v => v.lang.startsWith("en"));
      setVoices(englishVoices);

      // Select the most cinematic-sounding voice available on the user's machine,
      // preferring deep/natural narrator-style voices over robotic defaults
      const bestDefault = englishVoices.find(v => v.name.toLowerCase().includes("guy") && v.name.toLowerCase().includes("online")) ||
                          englishVoices.find(v => v.name.toLowerCase().includes("ryan") && v.name.toLowerCase().includes("online")) ||
                          englishVoices.find(v => v.name.toLowerCase().includes("natural")) ||
                          englishVoices.find(v => v.name.toLowerCase().includes("google us english")) ||
                          englishVoices.find(v => v.name.toLowerCase().includes("david")) ||
                          englishVoices.find(v => v.name.toLowerCase().includes("zira")) ||
                          englishVoices[0];
      
      if (bestDefault) {
        setSelectedVoiceName(bestDefault.name);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Builds an original ambient cinematic pad (layered detuned oscillators through
  // a swept low-pass filter) entirely in the browser — no external audio file,
  // so there is zero licensing risk and nothing that can 404.
  const initAudioEngine = () => {
    if (audioCtxRef.current || typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    filter.connect(master);
    master.connect(ctx.destination);

    // Open, spacious chord (C2-G2-C3-E3) for a hopeful-but-epic keynote tone
    const freqs = [65.41, 98.0, 130.81, 164.81];
    const pads = freqs.map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 5;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
      gain.gain.linearRampToValueAtTime(0.85 / freqs.length, ctx.currentTime + 5);
      return { osc, gain };
    });

    // Slow LFO sweeping the filter cutoff so the pad breathes instead of droning
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 350;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    audioCtxRef.current = ctx;
    masterGainRef.current = master;
    filterRef.current = filter;
    padNodesRef.current = pads;
    lfoRef.current = lfo;
  };

  // Smooth ramp of the score's master volume (used for ducking under narration)
  const setAudioVolume = (vol) => {
    if (!audioCtxRef.current || !masterGainRef.current || isMuted) return;
    const ctx = audioCtxRef.current;
    masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
    masterGainRef.current.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.4);
  };

  // Start the trailer and handle sound
  const startTrailer = () => {
    setHasStarted(true);
    setIsPlaying(true);
    setIsMuted(false);
    initAudioEngine();
    const ctx = audioCtxRef.current;
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      masterGainRef.current.gain.linearRampToValueAtTime(NORMAL_VOL, ctx.currentTime + 2);
    }
  };

  // Control time increments
  useEffect(() => {
    let interval = null;
    if (isPlaying && hasStarted && mounted) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            clearInterval(interval);
            setIsPlaying(false);
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, hasStarted, mounted]);

  // Score Play/Pause Sync
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !hasStarted) return;
    if (isPlaying) {
      if (ctx.state === "suspended") ctx.resume();
      if (!isMuted) setAudioVolume(NORMAL_VOL);
    } else {
      masterGainRef.current?.gain.cancelScheduledValues(ctx.currentTime);
      masterGainRef.current?.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    }
  }, [isPlaying, hasStarted]);

  // Sync mute state
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx || !masterGainRef.current) return;
    masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
    masterGainRef.current.gain.linearRampToValueAtTime(isMuted ? 0 : NORMAL_VOL, ctx.currentTime + 0.3);
  }, [isMuted]);

  // Tear down the audio engine when leaving the page
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  // Web Speech API Voiceover Narrator Sync (with Audio Ducking)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis || !mounted) return;

    if (isPlaying && !isMuted && hasStarted) {
      // Cancel previous speakings
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(scene.voiceover);
      utterance.rate = 0.92;   // Slightly slower for deliberate, cinematic gravitas
      utterance.pitch = 0.94;  // Slightly lower pitch for a deeper narrator tone
      utterance.volume = 1.0;  // Max clarity volume

      // Set the custom voice if chosen
      if (voices.length > 0 && selectedVoiceName) {
        const selectVoice = voices.find(v => v.name === selectedVoiceName);
        if (selectVoice) {
          utterance.voice = selectVoice;
        }
      }

      utterance.onstart = () => {
        // Duck background music volume to 2% when narrator speaks
        setAudioVolume(DUCKED_VOL);
      };

      utterance.onend = () => {
        // Restore music volume to 12% when speaking ends
        setAudioVolume(NORMAL_VOL);
      };

      utterance.onerror = () => {
        setAudioVolume(NORMAL_VOL);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
      setAudioVolume(NORMAL_VOL);
    }

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [scene?.id, isPlaying, isMuted, hasStarted, mounted, selectedVoiceName, voices]);

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleMute = () => setIsMuted(!isMuted);
  const handleSkip = () => {
    router.push("/dashboard");
  };

  if (!mounted) {
    return <div className="min-h-screen bg-black" />;
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden flex flex-col justify-between font-sans select-none">
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      {/* Cinematic Letterbox Bars (Apple/Google Keynote style focus frames) */}
      {hasStarted && (
        <>
          <motion.div 
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute top-0 left-0 right-0 h-[3vh] bg-black/95 border-b border-white/5 z-20 pointer-events-none hidden md:block"
          />
          <motion.div 
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 h-[3vh] bg-black/95 border-t border-white/5 z-20 pointer-events-none hidden md:block"
          />
        </>
      )}

      {/* Technical Spec HUD Overlay (Apple / Google Presentation Style) */}
      {hasStarted && (
        <div className="absolute inset-0 pointer-events-none z-15 select-none overflow-hidden">
          {/* Top Right Specs */}
          <div className="absolute top-16 right-6 font-mono text-[8px] text-slate-500 uppercase tracking-widest text-right space-y-1 hidden md:block">
            <p>RESOLUTION: 4K HDR</p>
            <p>CODEC: WEBGL_CINEMATIC</p>
            <p>AUDIO: DYNAMIC_DUCKING_V3</p>
            <p>REFRESH: 120HZ</p>
          </div>
          
          {/* Top Left Specs */}
          <div className="absolute top-16 left-6 font-mono text-[8px] text-slate-500 uppercase tracking-widest space-y-1 hidden md:block">
            <p>STREAM: STABLE</p>
            <p>FPS: 60.0</p>
            <p>LATENCY: 4.8ms</p>
            <p>ENGINE: NEXT.JS 15</p>
          </div>
          
          {/* Side Alignment Crosshairs */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 w-1.5 h-8 border-l border-white/10 hidden md:block" />
          <div className="absolute top-1/2 right-4 -translate-y-1/2 w-1.5 h-8 border-r border-white/10 hidden md:block" />
        </div>
      )}

      {/* Header bar */}
      <header className="relative z-35 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-black/40 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <BrainCircuit className="w-6 h-6 text-indigo-500 group-hover:rotate-12 transition-transform duration-300" />
          <span className="font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">GEMINI LMS 3.0</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMute}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            title={isMuted ? "Unmute sound" : "Mute sound"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-slate-400 animate-pulse" /> : <Volume2 className="w-5 h-5 text-indigo-400" />}
          </button>
          <button 
            onClick={handleSkip}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold tracking-wide transition-all hover:scale-105"
          >
            Launch System <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Start Modal Overlay (Audio Bypass) */}
      {!hasStarted && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center space-y-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4"
          >
            <BrainCircuit className="w-20 h-20 text-indigo-500 mx-auto animate-pulse" />
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent animate-pulse">GEMINI LMS LAUNCH TRAILER</h1>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">Experience the futuristic product launch trailer with high-fidelity sound.</p>
          </motion.div>
          <button
            onClick={startTrailer}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-bold rounded-2xl flex items-center gap-3 text-white shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-all text-sm uppercase tracking-wider"
          >
            <Play className="w-5 h-5 fill-white text-white" /> Start Trailer with Sound
          </button>
        </div>
      )}

      {/* Main Cinematic Full-Screen Canvas */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full overflow-hidden px-4">
        <AnimatePresence mode="wait">

          {/* SCENE 1: The Education Crisis */}
          {scene.id === 1 && (
            <motion.div
              key="scene-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="text-center relative max-w-4xl w-full flex flex-col items-center justify-center min-h-[420px]"
            >
              <div className="absolute inset-0 pointer-events-none opacity-30 hidden sm:block">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-[10%] left-[5%] bg-slate-900 border border-red-500/20 px-3 py-1.5 rounded-lg font-mono text-[10px] text-red-400">
                  ⚠️ 15 ASSIGNMENTS DUE
                </motion.div>
                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.5 }} className="absolute bottom-[20%] right-[10%] bg-slate-900 border border-red-500/20 px-3 py-1.5 rounded-lg font-mono text-[10px] text-red-400">
                  🚨 EXAM IN 48 HOURS
                </motion.div>
              </div>

              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="w-14 h-14 border-4 border-dashed border-red-500/30 rounded-full flex items-center justify-center text-red-400 mb-6"
              >
                <Clock className="w-6 h-6 animate-pulse" />
              </motion.div>

              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-xl bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
                <TypewriterText key={scene.id} text="Millions of students struggle every day." speed={30} />
              </h1>
              
              <div className="flex gap-4 pt-6 text-xs font-bold tracking-wider uppercase text-slate-500">
                <span className="animate-pulse">Too many resources</span>
                <span>•</span>
                <span className="animate-pulse" style={{ animationDelay: "0.5s" }}>Too little time</span>
              </div>
            </motion.div>
          )}

          {/* SCENE 2: Information Overload */}
          {scene.id === 2 && (
            <motion.div
              key="scene-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center relative max-w-4xl w-full flex flex-col items-center justify-center min-h-[420px]"
            >
              <div className="absolute inset-0 pointer-events-none opacity-40 hidden sm:block">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    style={{
                      top: `${15 + Math.random() * 50}%`,
                      left: `${10 + Math.random() * 60}%`,
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      x: [0, Math.random() * 20 - 10, 0],
                    }}
                    transition={{
                      duration: 1.5 + Math.random(),
                      repeat: Infinity,
                    }}
                    className="absolute bg-slate-900 border border-slate-750 px-3 py-1.5 rounded shadow-2xl font-mono text-[9px] text-slate-400 flex items-center gap-2"
                  >
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                    <span>tab_loading_00{i}.pdf</span>
                  </motion.div>
                ))}
              </div>

              <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-4">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
              </div>

              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-slate-100 max-w-md">
                <TypewriterText key={scene.id} text="Learning shouldn't feel like survival." speed={30} />
              </h1>
            </motion.div>
          )}

          {/* SCENE 3: Arrival of Gemini LMS */}
          {scene.id === 3 && (
            <motion.div
              key="scene-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="text-center relative max-w-4xl w-full flex flex-col items-center justify-center min-h-[420px]"
            >
              <div className="absolute w-[280px] h-[280px] bg-indigo-500/15 rounded-full blur-[70px] pointer-events-none animate-pulse" />

              {/* Cinematic ambient glow backdrop */}
              <motion.div
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5 }}
                className="absolute inset-0 -z-10 rounded-3xl overflow-hidden hidden sm:block"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950 to-purple-950/30" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.18),transparent_60%)]" />
              </motion.div>

              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="relative z-10 mb-6"
              >
                <BrainCircuit className="w-24 h-24 text-indigo-400 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
              </motion.div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-none bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                <TypewriterText key={scene.id} text="GEMINI LMS 3.0" speed={40} />
              </h1>
              <p className="text-slate-400 text-xs md:text-sm max-w-xs mx-auto mt-4 font-semibold tracking-wide">
                <TypewriterText key={scene.id} text="The next-generation AI-powered learning platform." speed={30} delay={600} />
              </p>
            </motion.div>
          )}

          {/* SCENE 4: AI Course Generation */}
          {scene.id === 4 && (
            <motion.div
              key="scene-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  AI SCANNER
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Simply upload a topic or syllabus." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Smart PDF Parsing</span>: Scans textbooks & transcripts.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Chapter Outliner</span>: Builds custom lesson pathways.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Study suite auto-generation</span>: Spawns notes & tests instantly.</p>
                </div>
              </div>

              {/* Premium stylized mockup: AI topic scanner */}
              <BrowserFrame label="gemini-lms.vercel.app/create" glow="indigo">
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_10px_#6366f1] z-20 pointer-events-none"
                />
                <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
                  <FileText className="w-5 h-5 text-indigo-400 animate-bounce" />
                  <span className="text-xs font-semibold text-slate-300">ethical_hacking.pdf</span>
                </div>
                <div className="space-y-2 font-mono text-[10px] text-slate-400 text-left">
                  <div className="flex justify-between items-center bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                    <span>⚡ Parsing Document</span>
                    <span className="text-green-400">Done</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                    <span>📚 Mapping Chapters</span>
                    <span className="text-green-400">Done</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/[0.03] p-2.5 rounded-lg border border-white/5">
                    <span>📝 Study Suite Creation</span>
                    <span className="text-indigo-400 animate-pulse">Processing...</span>
                  </div>
                </div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 5: Smart Notes */}
          {scene.id === 5 && (
            <motion.div
              key="scene-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  SMART MATERIAL
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Notes that simplify complex topics." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Highlight Core Concepts</span>: Auto-bolds key terms.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Dynamic LaTeX Formulas</span>: Renders clean mathematical structures.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Syntax Highlighted Code</span>: Clear code snippet blocks.</p>
                </div>
              </div>

              {/* Premium stylized mockup: AI-generated notes */}
              <BrowserFrame label="gemini-lms.vercel.app/notes" glow="purple">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <span className="text-[10px] font-bold text-slate-300">Notes: Network Encryption</span>
                  <span className="text-[8px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-mono">Autoscroll</span>
                </div>
                <motion.div
                  animate={{ y: [0, -60, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="space-y-3 pr-2 overflow-hidden flex-1"
                >
                  <h4 className="text-xs font-bold text-slate-200">Asymmetric Cryptography</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Uses pairs of keys: public keys which may be disseminated widely, and private keys which are known only to the owner...
                  </p>
                  <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/5 text-[10px] text-indigo-400 font-mono">
                    Public Key (Encrypt) → Private Key (Decrypt)
                  </div>
                </motion.div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 6: Flashcards & Spaced Repetition */}
          {scene.id === 6 && (
            <motion.div
              key="scene-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  SPACED REPETITION
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Remember more. Forget less." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Active Recall Decks</span>: Target core terms.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Smart Spaced Intervals</span>: Boosts long-term retention.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Interactive 3D Cards</span>: Responsive flip-animations.</p>
                </div>
              </div>

              {/* Premium stylized mockup: 3D-flip flashcard deck */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotateY: [0, 180, 180, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="w-full max-w-[280px] h-[180px] bg-gradient-to-tr from-indigo-950/70 via-slate-900 to-sky-950/40 border border-sky-500/20 rounded-2xl p-5 flex flex-col justify-between shadow-2xl"
                  style={{ transformStyle: "preserve-3d", boxShadow: "0 25px 60px -15px rgba(56,189,248,0.3)" }}
                >
                  <div className="text-left">
                    <span className="text-[8px] font-bold text-slate-500 tracking-widest uppercase">Card 03</span>
                    <h3 className="text-xs font-bold text-white mt-1.5 leading-relaxed">What does the acronym HTTP stand for?</h3>
                  </div>
                  <div className="text-[10px] text-sky-400 text-center font-bold">
                    Hypertext Transfer Protocol
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* SCENE 7: AI Voice Tutor & Chatbot */}
          {scene.id === 7 && (
            <motion.div
              key="scene-7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  VOICE TUTOR
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Your personal AI tutor. Available anytime." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Speaks Aloud</span>: Listens to questions & speaks answers.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Conversational Guidance</span>: Interactive query support.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Waveform Visualization</span>: Dynamic waveform visualizer.</p>
                </div>
              </div>

              {/* Premium stylized mockup: AI voice tutor chat */}
              <BrowserFrame label="gemini-lms.vercel.app/tutor" glow="emerald">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <span className="text-xs text-slate-300">Voice Session</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[9px] text-emerald-400">Listening</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/5 text-xs text-slate-300 font-medium">
                    <TypewriterText text="Explain SQL Injection." speed={60} delay={500} />
                  </div>
                  <div className="bg-emerald-950/20 border border-emerald-500/10 p-2.5 rounded-lg text-[11px] text-slate-400 leading-relaxed min-h-[50px]">
                    <TypewriterText text="SQL Injection is a code injection technique where malicious SQL statements are inserted into inputs to execute unintended query commands." speed={30} delay={2000} />
                  </div>
                </div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 8: Quizzes & Assignments */}
          {scene.id === 8 && (
            <motion.div
              key="scene-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                  ASSESSMENT
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Instant assessment. Intelligent feedback." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Mock Exam Simulations</span>: Test under actual conditions.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">AI Grading</span>: Complete evaluations generated instantly.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Gap Identifiers</span>: Recommends areas of improvement.</p>
                </div>
              </div>

              {/* Premium stylized mockup: graded assessment */}
              <BrowserFrame label="gemini-lms.vercel.app/quiz" glow="emerald">
                <motion.div
                  animate={{ left: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 bottom-0 w-2 bg-gradient-to-r from-transparent via-green-400/30 to-transparent skew-x-12 z-20 pointer-events-none"
                />
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full border-4 border-green-500 bg-green-500/10 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-green-400">92%</span>
                    <span className="text-[6px] text-slate-500 font-bold uppercase">GRADE A</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-200">Exam Graded Successfully</h4>
                    <p className="text-[9px] text-slate-450">Gemini checked: 18 correct / 2 incorrect.</p>
                  </div>
                </div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 9: Coding Playground */}
          {scene.id === 9 && (
            <motion.div
              key="scene-9"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  CODE LAB
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Learn by building. Learn by doing." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Multi-Language Sandbox</span>: Run Python, JS, Java.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Browser Execution</span>: Instant compile checks.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Code Exercises</span>: Custom challenges mapped to courses.</p>
                </div>
              </div>

              {/* Premium stylized mockup: multi-language code playground */}
              <BrowserFrame label="gemini-lms.vercel.app/playground" glow="pink">
                <div className="flex items-center gap-1 border-b border-white/5 pb-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[9px] text-slate-500 ml-2 font-mono">script.py</span>
                </div>
                <div className="text-indigo-400 space-y-1 min-h-[40px] font-mono text-xs">
                  <p className="text-indigo-300">
                    <TypewriterText text="def sum(a, b): return a + b" speed={50} delay={500} />
                  </p>
                  <p className="text-indigo-300">
                    <TypewriterText text="print(sum(10, 20))" speed={50} delay={2000} />
                  </p>
                </div>
                <div className="bg-white/[0.03] border border-white/5 p-2 rounded-lg text-[9px] text-slate-450 font-mono mt-2">
                  <TypewriterText text="Output: 30" speed={20} delay={3250} />
                </div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 10: Community & Discussion */}
          {scene.id === 10 && (
            <motion.div
              key="scene-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  COMMUNITY
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Learning becomes a shared experience." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Topic Forum Threads</span>: Discuss chapters & tasks.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Notes Exchange</span>: Share materials with study groups.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Global Workspace</span>: Collaborate with users globally.</p>
                </div>
              </div>

              {/* Premium stylized mockup: course discussion board */}
              <BrowserFrame label="gemini-lms.vercel.app/discussions" glow="pink">
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                  <span className="text-xs text-slate-300">Study Hub</span>
                  <span className="text-[8px] bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded uppercase">Connected</span>
                </div>
                <div className="space-y-3">
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="border-l-2 border-pink-500 pl-3">
                    <span className="text-[9px] text-slate-500">alex_coder</span>
                    <p className="text-[11px] text-slate-300">"Anyone solved chapter 2 coding challenge? I'm stuck on recursion."</p>
                  </motion.div>
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 2 }} className="border-l-2 border-indigo-500 pl-3">
                    <span className="text-[9px] text-slate-500">sophia_admin</span>
                    <p className="text-[11px] text-slate-300">"Check custom notes inside chapter 2 files! I uploaded a guide."</p>
                  </motion.div>
                </div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 11: Instructor & Admin */}
          {scene.id === 11 && (
            <motion.div
              key="scene-11"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center w-full max-w-4xl min-h-[420px]"
            >
              <div className="space-y-4 text-left">
                <span className="text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  ADMIN CONSOLE
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                  <TypewriterText key={scene.id} text="Powerful tools for administrators." speed={30} />
                </h2>
                <div className="space-y-2 text-slate-400 text-xs font-semibold">
                  <p className="flex items-center gap-2">✓ <span className="text-white">Active Learner Audits</span>: Track completion logs.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Transaction Logs</span>: Audit credit logs and tokens.</p>
                  <p className="flex items-center gap-2">✓ <span className="text-white">Course Management</span>: Fully edit custom syllabus indexes.</p>
                </div>
              </div>

              {/* Premium stylized mockup: instructor/admin analytics */}
              <BrowserFrame label="gemini-lms.vercel.app/admin" glow="cyan">
                <span className="text-[9px] text-slate-450 uppercase font-mono tracking-wider mb-3">System Activity</span>
                <div className="grid grid-cols-2 gap-3 font-mono mt-3">
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <div className="text-[8px] text-slate-500">Active Learners</div>
                    <div className="text-base font-bold text-cyan-400">
                      <span>1,240</span>
                    </div>
                  </div>
                  <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <div className="text-[8px] text-slate-500">Completion Rate</div>
                    <div className="text-base font-bold text-indigo-400">89.4%</div>
                  </div>
                </div>
              </BrowserFrame>
            </motion.div>
          )}

          {/* SCENE 12 & OUTRO: Future & Reveal (Apple/Google Reveal Style) */}
          {scene.id === 12 && (
            <motion.div
              key="scene-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="text-center max-w-2xl w-full flex flex-col items-center justify-center min-h-[420px] relative animate-fade-in"
            >
              {/* Volumetric background glow flare */}
              <div className="absolute w-[450px] h-[450px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-pink-500/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />

              {/* Massive scale-up logo keyframe (Real Apple / Google Product Reveal Style) */}
              <motion.div 
                initial={{ scale: 0.3, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 50, 
                  damping: 14,
                  delay: 0.2
                }}
                className="relative p-8 bg-gradient-to-b from-slate-900/80 to-slate-955/95 border border-white/10 rounded-[36px] shadow-[0_0_80px_rgba(99,102,241,0.3)] mb-8 cursor-pointer group hover:border-indigo-500/30 transition-all duration-500"
              >
                {/* Glow ring behind logo */}
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-[36px] blur-xl opacity-80 animate-pulse" />
                
                {/* Logo Image */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <Image 
                    src="/logo.svg" 
                    alt="Gemini LMS Logo" 
                    width={112} 
                    height={112} 
                    className="object-contain filter drop-shadow-[0_0_20px_rgba(99,102,241,0.6)]"
                    priority
                  />
                </div>
              </motion.div>

              <motion.h1 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 60,
                  damping: 16,
                  delay: 0.6 
                }}
                className="text-5xl md:text-7xl font-black tracking-tight leading-none bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent uppercase"
              >
                <TypewriterText key={scene.id} text="GEMINI LMS 3.0" speed={40} />
              </motion.h1>
              
              <motion.p 
                initial={{ y: 25, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 60,
                  damping: 16,
                  delay: 0.9 
                }}
                className="text-slate-450 text-sm md:text-base max-w-md mx-auto mt-4 font-semibold italic tracking-wide"
              >
                <TypewriterText key={scene.id} text='"Learn Smarter. Build Faster. Achieve More."' speed={30} delay={600} />
              </motion.p>

              {/* Tech Stack badges */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ delay: 1.4 }}
                className="flex flex-wrap justify-center gap-1.5 mt-6 max-w-sm"
              >
                <span className="text-[8px] font-mono tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">NEXT.JS 15</span>
                <span className="text-[8px] font-mono tracking-widest px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">GEMINI AI</span>
                <span className="text-[8px] font-mono tracking-widest px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400">DRIZZLE ORM</span>
                <span className="text-[8px] font-mono tracking-widest px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">NEON DATABASE</span>
              </motion.div>

              {/* Call-to-action */}
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="pt-8 w-full flex justify-center"
              >
                <a href="/dashboard" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-bold rounded-2xl py-4 px-10 text-xs flex items-center justify-center gap-2 shadow-2xl shadow-indigo-500/30 hover:scale-[1.03] transition-all uppercase tracking-widest">
                    Start Learning Today <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Subtitles & Narrator script box */}
      <div className="w-full max-w-3xl mx-auto bg-slate-900/40 border border-white/5 rounded-3xl p-5 mb-4 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 mb-1.5">
          <Cpu className="w-3.5 h-3.5 animate-pulse" />
          <span>Voiceover Narrator</span>
        </div>
        <p className="text-xs md:text-sm text-slate-200 font-semibold italic min-h-[40px] leading-relaxed">
          "
          <TypewriterText 
            key={scene.id}
            text={scene.voiceover}
            speed={35}
          />
          "
        </p>
        <div className="flex items-center justify-between mt-2.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider border-t border-white/5 pt-2.5">
          <div className="flex items-center gap-1.5">
            <span>Scene:</span>
            <span className="text-slate-400">{scene.tagline}</span>
          </div>
          {!hasStarted && <span className="text-indigo-400 animate-pulse">Awaiting Interaction for Sound</span>}
        </div>
      </div>

      {/* Control bar / Timeline at bottom */}
      <footer className="relative z-20 px-6 py-6 backdrop-blur-md bg-black/40 border-t border-white/5 space-y-4">
        
        {/* Progress bar timeline */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-500 w-10 text-right">
            {Math.floor(currentTime / 60)}:{(currentTime % 60).toString().padStart(2, "0")}
          </span>
          <input 
            type="range"
            min="0"
            max={totalDuration}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-slate-855 hover:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-colors"
          />
          <span className="text-xs font-semibold text-slate-500 w-10">
            {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, "0")}
          </span>
        </div>

        {/* Video Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={togglePlay}
              disabled={!hasStarted}
              className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-950/50 hover:scale-105 transition-all disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>
            <div>
              <p className="text-xs font-bold text-slate-300">
                {scene.title}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                {isPlaying ? "Autoplaying Product Launch Trailer" : "Paused"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stateful Narrator Voice Selection Dropdown */}
            {voices.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[9px]">Narrator:</span>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="bg-transparent border-none text-slate-300 font-semibold focus:ring-0 cursor-pointer text-xs max-w-[150px] outline-none"
                >
                  {voices.map((v) => (
                    <option key={v.name} value={v.name} className="bg-slate-900 text-white font-sans text-xs">
                      {v.name.replace("Microsoft", "MS").replace("English", "EN")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Link href="/">
              <button className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
            </Link>
          </div>
        </div>

      </footer>
    </div>
  );
}

// Small UI components in case next/shadcn Buttons aren't globally accessible on page.jsx
function Button({ children, className, ...props }) {
  return (
    <button 
      className={`inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
}
