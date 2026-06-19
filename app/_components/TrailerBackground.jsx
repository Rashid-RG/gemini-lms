"use client";

import React from "react";
import { motion } from "framer-motion";

export default function TrailerBackground() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    // Fixed inset-0 ensures the beautiful background stays perfectly in the viewport while the user scrolls
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
      
      {/* Purple Glow */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 100, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-300/40 mix-blend-multiply filter blur-[120px]"
      />
      
      {/* Indigo Glow */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          x: [0, -150, 0],
          y: [0, 100, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-300/40 mix-blend-multiply filter blur-[120px]"
      />
      
      {/* Pink Glow */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 100, 0],
          y: [0, 150, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-pink-300/40 mix-blend-multiply filter blur-[120px]"
      />
      
      {/* Sky Blue Glow */}
      <motion.div
        animate={{
          scale: [1, 1.4, 1],
          x: [0, -50, 0],
          y: [0, -100, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute top-[10%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-sky-300/40 mix-blend-multiply filter blur-[120px]"
      />

      {/* Subtle Noise Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} 
      />

      {/* Floating Dot Animation - Rendered only on client to prevent SSR hydration mismatch */}
      {mounted && (
        <div className="absolute inset-0 z-10">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-indigo-300/40 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, -200],
                x: [0, Math.random() * 50 - 25, Math.random() * 50 - 25],
                opacity: [0, 0.8, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 5 + Math.random() * 10,
                repeat: Infinity,
                delay: Math.random() * 10,
                ease: "linear",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
