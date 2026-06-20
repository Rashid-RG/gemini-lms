"use client";
import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { Play, ArrowLeft, RefreshCw, Terminal, Code, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const CODE_TEMPLATES = {
    python: `# Python Study Playground
# Write your code here and click "Run Code"

def greet(name):
    return f"Hello, {name}! Welcome to Gemini LMS."

print(greet("Learner"))
`,
    javascript: `// JavaScript Study Playground
// Write your code here and click "Run Code"

function greet(name) {
    return \`Hello, \${name}! Welcome to Gemini LMS.\`;
}

console.log(greet("Learner"));
`,
    java: `// Java Study Playground
// Write your code here and click "Run Code"

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Learner! Welcome to Gemini LMS.");
    }
}
`,
    cpp: `// C++ Study Playground
// Write your code here and click "Run Code"

#include <iostream>
using namespace std;

int main() {
    cout << "Hello, Learner! Welcome to Gemini LMS." << endl;
    return 0;
}
`,
    typescript: `// TypeScript Study Playground
// Write your code here and click "Run Code"

const greet = (name: string): string => {
    return \`Hello, \${name}! Welcome to Gemini LMS.\`;
};

console.log(greet("Learner"));
`,
    rust: `// Rust Study Playground
// Write your code here and click "Run Code"

fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Gemini LMS.", name)
}

fn main() {
    println!("{}", greet("Learner"));
}
`,
    go: `// Go Study Playground
// Write your code here and click "Run Code"

package main

import "fmt"

func greet(name string) string {
    return fmt.Sprintf("Hello, %s! Welcome to Gemini LMS.", name)
}

func main() {
    fmt.Println(greet("Learner"))
}
`,
    php: `<?php
// PHP Study Playground
// Write your code here and click "Run Code"

function greet($name) {
    return "Hello, $name! Welcome to Gemini LMS.";
}

echo greet("Learner") . "\n";
`,
    ruby: `# Ruby Study Playground
# Write your code here and click "Run Code"

def greet(name)
  "Hello, #{name}! Welcome to Gemini LMS."
end

puts greet("Learner")
`,
};

const LANGUAGES = [
    { id: 'python',     label: 'Python',     emoji: '🐍' },
    { id: 'javascript', label: 'JavaScript', emoji: '⚡' },
    { id: 'typescript', label: 'TypeScript', emoji: '🔷' },
    { id: 'java',       label: 'Java',       emoji: '☕' },
    { id: 'cpp',        label: 'C++',        emoji: '⚙️' },
    { id: 'rust',       label: 'Rust',       emoji: '🦀' },
    { id: 'go',         label: 'Go',         emoji: '🐹' },
    { id: 'php',        label: 'PHP',        emoji: '🐘' },
    { id: 'ruby',       label: 'Ruby',       emoji: '💎' },
];

export default function CodePlayground() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();

    const courseId = params?.courseId || searchParams?.get('courseId');

    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(CODE_TEMPLATES.python);
    const [output, setOutput] = useState('');
    const [running, setRunning] = useState(false);
    const [editorTheme, setEditorTheme] = useState('vs-dark');

    // AI Code Coach states
    const [activeTab, setActiveTab] = useState('console');
    const [review, setReview] = useState(null);
    const [reviewing, setReviewing] = useState(false);

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(CODE_TEMPLATES[lang]);
        setOutput('');
        setReview(null);
    };

    const handleRun = async () => {
        try {
            setRunning(true);
            setActiveTab('console');
            setOutput('Running your code in sandbox...');
            
            const res = await axios.post('/api/playground', {
                language,
                code
            });

            const { run } = res.data;

            if (run.stderr) {
                setOutput(`❌ Error output:\n${run.stderr}`);
            } else {
                setOutput(run.stdout || run.output || 'Code ran successfully with no output.');
            }
            toast.success("Execution complete!");
        } catch (error) {
            console.error("Code run error:", error);
            setOutput(`❌ Connection Error:\n${error.response?.data?.error || "Failed to execute code"}`);
            toast.error("Code run failed");
        } finally {
            setRunning(false);
        }
    };

    const handleAiReview = async () => {
        try {
            setReviewing(true);
            setActiveTab('coach');
            setReview(null);
            
            const res = await axios.post('/api/playground/review', {
                language,
                code
            });

            if (res.data.success) {
                setReview(res.data.review);
                toast.success("AI Code Review completed!");
            } else {
                toast.error("Failed to fetch code review");
            }
        } catch (error) {
            console.error("AI review error:", error);
            toast.error(error.response?.data?.error || "Failed to contact AI Coach");
        } finally {
            setReviewing(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto mt-4 space-y-6 pb-16 animate-in fade-in duration-300">
            {/* Header Control Panel */}
            <div className="bg-white border border-gray-100 shadow-md rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => courseId ? router.push(`/course/${courseId}`) : router.push('/dashboard')} 
                        className="p-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
                            <Code className="w-5 h-5 text-indigo-500" /> Code Playground
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">Test snippets and practice exercises directly in your browser.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Language Selector */}
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200/50 flex-wrap gap-1">
                        {LANGUAGES.map(({ id, label, emoji }) => (
                            <button
                                key={id}
                                onClick={() => handleLanguageChange(id)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                    language === id ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title={label}
                            >
                                <span>{emoji}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Theme Selector */}
                    <select
                        value={editorTheme}
                        onChange={(e) => setEditorTheme(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 bg-white"
                    >
                        <option value="vs-dark">Dark Theme</option>
                        <option value="light">Light Theme</option>
                    </select>
                </div>
            </div>

            {/* Split Screen Editor & Output */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Editor Container */}
                <div className="lg:col-span-2 bg-white border border-gray-100 shadow-xl rounded-3xl overflow-hidden flex flex-col">
                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Editor Pane</span>
                        <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full font-bold">
                            <Sparkles className="w-3.5 h-3.5" /> Monaco Editor
                        </div>
                    </div>
                    
                    <div className="flex-1 min-h-[45vh] relative">
                        <Editor
                            height="50vh"
                            language={language}
                            theme={editorTheme}
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                fontSize: 13,
                                minimap: { enabled: false },
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                padding: { top: 12, bottom: 12 }
                            }}
                        />
                    </div>
                </div>

                {/* Output Console Pane & AI Coach */}
                <div className="bg-[#1e1e1e] text-white shadow-xl rounded-3xl overflow-hidden flex flex-col min-h-[40vh] lg:min-h-auto">
                    <div className="bg-[#2d2d2d] px-4 py-2 border-b border-[#3d3d3d] flex items-center justify-between">
                        {/* Tab Swappers */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('console')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    activeTab === 'console' ? 'bg-[#3d3d3d] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                <Terminal className="w-3.5 h-3.5" /> Console
                            </button>
                            <button
                                onClick={() => setActiveTab('coach')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                    activeTab === 'coach' ? 'bg-[#3d3d3d] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                                }`}
                            >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Coach
                            </button>
                        </div>
                        {activeTab === 'console' && (
                            <button
                                onClick={() => setOutput('')}
                                className="text-xs text-gray-500 hover:text-gray-300 font-bold transition px-2 py-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto select-text">
                        {activeTab === 'console' ? (
                            <div className="font-mono text-xs whitespace-pre-wrap leading-5 select-text selection:bg-indigo-500 selection:text-white">
                                {output || (
                                    <span className="text-[#6d6d6d] italic">Console output will appear here after execution...</span>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-5 text-sm">
                                {reviewing && (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                                        <RefreshCw className="animate-spin w-8 h-8 text-indigo-400" />
                                        <p className="text-xs font-semibold animate-pulse">AI Coach is reviewing your code...</p>
                                    </div>
                                )}

                                {!reviewing && !review && (
                                    <div className="text-center py-12 text-gray-500">
                                        <Sparkles className="w-10 h-10 mx-auto mb-2 text-indigo-400/50" />
                                        <p className="text-xs leading-5">Click the <strong>AI Coach</strong> button below to review your code quality, Big-O complexity, and optimization suggestions.</p>
                                    </div>
                                )}

                                {!reviewing && review && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        {/* Score and Complexity */}
                                        <div className="flex items-center justify-between gap-4 border-b border-[#3d3d3d] pb-4">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Coach Rating</h4>
                                                <div className="flex items-baseline gap-1.5 mt-1">
                                                    <span className={`text-2xl font-black ${
                                                        review.score >= 80 ? 'text-emerald-400' :
                                                        review.score >= 60 ? 'text-amber-400' : 'text-rose-400'
                                                    }`}>{review.score}</span>
                                                    <span className="text-[10px] text-gray-500 font-bold">/ 100</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl px-2.5 py-1.5 text-center min-w-[70px]">
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Time</div>
                                                    <div className="text-xs font-black text-indigo-300 mt-0.5">{review.complexity?.time || 'N/A'}</div>
                                                </div>
                                                <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-xl px-2.5 py-1.5 text-center min-w-[70px]">
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Space</div>
                                                    <div className="text-xs font-black text-indigo-300 mt-0.5">{review.complexity?.space || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div className="space-y-1">
                                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Summary</h4>
                                            <p className="text-xs text-gray-200 leading-relaxed font-medium">{review.summary}</p>
                                        </div>

                                        {/* Errors */}
                                        {review.errors && review.errors.length > 0 && (
                                            <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-3.5 space-y-1.5">
                                                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                                    ⚠️ Key Warnings
                                                </h4>
                                                <ul className="list-disc pl-4 text-xs text-rose-200 space-y-1 font-medium">
                                                    {review.errors.map((err, i) => (
                                                        <li key={i}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Suggestions */}
                                        {review.suggestions && review.suggestions.length > 0 && (
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-semibold">Optimization Advice</h4>
                                                <div className="space-y-3 divide-y divide-[#3d3d3d]/50">
                                                    {review.suggestions.map((sug, i) => (
                                                        <div key={i} className={`pt-3 ${i === 0 ? 'pt-0' : ''} space-y-1.5`}>
                                                            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                                                💡 {sug.title}
                                                            </div>
                                                            <p className="text-[11px] text-gray-300 leading-relaxed font-medium">{sug.desc}</p>
                                                            {sug.code && (
                                                                <div className="bg-[#111] rounded-xl p-2.5 font-mono text-[10px] border border-[#2d2d2d] overflow-x-auto text-gray-300 leading-normal">
                                                                    <pre>{sug.code}</pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Run Control Buttons */}
                    <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d] flex justify-end gap-2">
                        <button
                            onClick={handleAiReview}
                            disabled={reviewing || running}
                            className="px-4 py-2.5 border border-indigo-500/40 text-indigo-400 hover:bg-[#3d3d3d] rounded-xl font-bold text-xs transition active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
                        >
                            {reviewing ? (
                                <>
                                    <RefreshCw className="animate-spin w-3.5 h-3.5" /> Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" /> AI Coach
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={handleRun}
                            disabled={running || reviewing}
                            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-bold text-xs shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
                        >
                            {running ? (
                                <>
                                    <RefreshCw className="animate-spin w-3.5 h-3.5" /> Executing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-white" /> Run Code
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
