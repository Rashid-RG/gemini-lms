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

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(CODE_TEMPLATES[lang]);
        setOutput('');
    };

    const handleRun = async () => {
        try {
            setRunning(true);
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
                    {/* Language Selector - now data driven */}
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

                {/* Output Console Pane */}
                <div className="bg-[#1e1e1e] text-white shadow-xl rounded-3xl overflow-hidden flex flex-col min-h-[40vh] lg:min-h-auto">
                    <div className="bg-[#2d2d2d] px-6 py-3 border-b border-[#3d3d3d] flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Terminal className="w-4 h-4 text-indigo-400" /> Console Output
                        </span>
                        <button
                            onClick={() => setOutput('')}
                            className="text-xs text-gray-500 hover:text-gray-300 font-bold transition"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="flex-1 p-6 font-mono text-xs overflow-y-auto whitespace-pre-wrap leading-5 select-text selection:bg-indigo-500 selection:text-white">
                        {output || (
                            <span className="text-[#6d6d6d] italic">Console output will appear here after execution...</span>
                        )}
                    </div>

                    {/* Run Control Button */}
                    <div className="p-4 bg-[#2d2d2d] border-t border-[#3d3d3d] flex justify-end">
                        <button
                            onClick={handleRun}
                            disabled={running}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-2xl font-bold text-xs shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-60 flex items-center gap-2"
                        >
                            {running ? (
                                <>
                                    <RefreshCw className="animate-spin w-4 h-4" /> Executing...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 fill-white" /> Run Code
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
