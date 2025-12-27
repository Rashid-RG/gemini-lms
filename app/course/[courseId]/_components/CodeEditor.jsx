"use client"
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { 
    Code, Copy, Check, Maximize2, Minimize2, RotateCcw, 
    FileCode, Play, Terminal, Braces, Hash, ChevronDown,
    Sun, Moon, Trash2, Download, Upload, Indent, AlignLeft,
    Undo, Redo, Search, Replace, Zap, BookOpen, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const CODE_LANGUAGES = {
    'javascript': { label: 'JavaScript', ext: '.js', color: 'text-yellow-400', icon: '🟨' },
    'python': { label: 'Python', ext: '.py', color: 'text-blue-400', icon: '🐍' },
    'java': { label: 'Java', ext: '.java', color: 'text-orange-400', icon: '☕' },
    'cpp': { label: 'C++', ext: '.cpp', color: 'text-purple-400', icon: '⚡' },
    'csharp': { label: 'C#', ext: '.cs', color: 'text-green-400', icon: '🎯' },
    'php': { label: 'PHP', ext: '.php', color: 'text-indigo-400', icon: '🐘' },
    'sql': { label: 'SQL', ext: '.sql', color: 'text-cyan-400', icon: '🗃️' },
    'html': { label: 'HTML', ext: '.html', color: 'text-red-400', icon: '🌐' },
    'css': { label: 'CSS', ext: '.css', color: 'text-pink-400', icon: '🎨' },
    'typescript': { label: 'TypeScript', ext: '.ts', color: 'text-blue-500', icon: '📘' },
    'go': { label: 'Go', ext: '.go', color: 'text-cyan-500', icon: '🐹' },
    'rust': { label: 'Rust', ext: '.rs', color: 'text-orange-500', icon: '🦀' },
    'ruby': { label: 'Ruby', ext: '.rb', color: 'text-red-500', icon: '💎' },
    'swift': { label: 'Swift', ext: '.swift', color: 'text-orange-400', icon: '🍎' },
    'kotlin': { label: 'Kotlin', ext: '.kt', color: 'text-purple-500', icon: '🎯' },
    'bash': { label: 'Bash', ext: '.sh', color: 'text-green-500', icon: '🖥️' },
}

const CODE_TEMPLATES = {
    javascript: {
        'Hello World': `console.log('Hello, World!');`,
        'Function': `function myFunction(param) {\n  // Your code here\n  return result;\n}`,
        'Array Methods': `const arr = [1, 2, 3, 4, 5];\n\n// Map example\nconst doubled = arr.map(x => x * 2);\n\n// Filter example\nconst evens = arr.filter(x => x % 2 === 0);\n\n// Reduce example\nconst sum = arr.reduce((acc, x) => acc + x, 0);`,
        'Async/Await': `async function fetchData() {\n  try {\n    const response = await fetch('https://api.example.com/data');\n    const data = await response.json();\n    return data;\n  } catch (error) {\n    console.error('Error:', error);\n  }\n}`,
        'Class': `class MyClass {\n  constructor(name) {\n    this.name = name;\n  }\n\n  greet() {\n    return \`Hello, \${this.name}!\`;\n  }\n}`,
    },
    python: {
        'Hello World': `print("Hello, World!")`,
        'Function': `def my_function(param):\n    # Your code here\n    return result`,
        'List Comprehension': `numbers = [1, 2, 3, 4, 5]\n\n# Square each number\nsquares = [x**2 for x in numbers]\n\n# Filter even numbers\nevens = [x for x in numbers if x % 2 == 0]`,
        'Class': `class MyClass:\n    def __init__(self, name):\n        self.name = name\n    \n    def greet(self):\n        return f"Hello, {self.name}!"`,
        'File I/O': `# Read file\nwith open('file.txt', 'r') as f:\n    content = f.read()\n\n# Write file\nwith open('output.txt', 'w') as f:\n    f.write('Hello, World!')`,
    },
    java: {
        'Hello World': `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
        'Method': `public static int myMethod(int param) {\n    // Your code here\n    return result;\n}`,
        'Class': `public class MyClass {\n    private String name;\n    \n    public MyClass(String name) {\n        this.name = name;\n    }\n    \n    public String greet() {\n        return "Hello, " + this.name + "!";\n    }\n}`,
    },
    cpp: {
        'Hello World': `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
        'Function': `int myFunction(int param) {\n    // Your code here\n    return result;\n}`,
        'Class': `class MyClass {\nprivate:\n    std::string name;\n\npublic:\n    MyClass(std::string n) : name(n) {}\n    \n    std::string greet() {\n        return "Hello, " + name + "!";\n    }\n};`,
    },
    sql: {
        'SELECT': `SELECT column1, column2\nFROM table_name\nWHERE condition\nORDER BY column1;`,
        'INSERT': `INSERT INTO table_name (column1, column2)\nVALUES (value1, value2);`,
        'UPDATE': `UPDATE table_name\nSET column1 = value1\nWHERE condition;`,
        'JOIN': `SELECT a.column1, b.column2\nFROM table1 a\nINNER JOIN table2 b ON a.id = b.foreign_id\nWHERE condition;`,
        'CREATE TABLE': `CREATE TABLE table_name (\n    id INT PRIMARY KEY AUTO_INCREMENT,\n    name VARCHAR(100) NOT NULL,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);`,
    },
}

function CodeEditor({ code, onCodeChange, language, onLanguageChange, disabled = false }) {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [darkMode, setDarkMode] = useState(true)
    const [showLineNumbers, setShowLineNumbers] = useState(true)
    const [showTemplates, setShowTemplates] = useState(false)
    const [showFind, setShowFind] = useState(false)
    const [findText, setFindText] = useState('')
    const [replaceText, setReplaceText] = useState('')
    const [history, setHistory] = useState([code])
    const [historyIndex, setHistoryIndex] = useState(0)
    const [activeTab, setActiveTab] = useState('editor') // 'editor' | 'preview' | 'output'
    const textareaRef = useRef(null)
    const containerRef = useRef(null)

    // Update history when code changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (code !== history[historyIndex]) {
                const newHistory = history.slice(0, historyIndex + 1)
                newHistory.push(code)
                setHistory(newHistory.slice(-50)) // Keep last 50 states
                setHistoryIndex(newHistory.length - 1)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [code])

    const handleUndo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1)
            onCodeChange(history[historyIndex - 1])
        }
    }

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1)
            onCodeChange(history[historyIndex + 1])
        }
    }

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true)
        toast.success('Code copied to clipboard!')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClear = () => {
        if (code.trim()) {
            onCodeChange('')
            toast.success('Code cleared')
        }
    }

    const handleDownload = () => {
        const ext = CODE_LANGUAGES[language]?.ext || '.txt'
        const blob = new Blob([code], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `code${ext}`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Code downloaded!')
    }

    const handleUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                onCodeChange(e.target.result)
                toast.success(`Loaded: ${file.name}`)
            }
            reader.readAsText(file)
        }
    }

    const insertTemplate = (templateCode) => {
        onCodeChange(code ? `${code}\n\n${templateCode}` : templateCode)
        setShowTemplates(false)
        toast.success('Template inserted!')
    }

    const formatCode = () => {
        // Basic formatting - indent lines properly
        const lines = code.split('\n')
        let indentLevel = 0
        const formatted = lines.map(line => {
            const trimmed = line.trim()
            if (trimmed.match(/^[}\])]/) && indentLevel > 0) indentLevel--
            const result = '  '.repeat(indentLevel) + trimmed
            if (trimmed.match(/[{[\(]$/) || trimmed.match(/:\s*$/)) indentLevel++
            return result
        }).join('\n')
        onCodeChange(formatted)
        toast.success('Code formatted!')
    }

    const handleFind = () => {
        if (!findText) return
        const textarea = textareaRef.current
        const start = code.toLowerCase().indexOf(findText.toLowerCase())
        if (start !== -1) {
            textarea.focus()
            textarea.setSelectionRange(start, start + findText.length)
            toast.success('Found!')
        } else {
            toast.error('Not found')
        }
    }

    // Escape special regex characters to prevent ReDoS
    const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }

    const handleReplace = () => {
        if (!findText) return
        // Use string replace with escaped pattern for safety
        const escapedFind = escapeRegex(findText)
        const newCode = code.replace(new RegExp(escapedFind, 'gi'), replaceText)
        if (newCode !== code) {
            onCodeChange(newCode)
            toast.success('Replaced!')
        }
    }

    const handleReplaceAll = () => {
        if (!findText) return
        const escapedFind = escapeRegex(findText)
        const regex = new RegExp(escapedFind, 'gi')
        const matches = code.match(regex)
        const newCode = code.replace(regex, replaceText)
        if (newCode !== code) {
            onCodeChange(newCode)
            toast.success(`Replaced ${matches?.length || 0} occurrences!`)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault()
            const start = e.target.selectionStart
            const end = e.target.selectionEnd
            const newCode = code.substring(0, start) + '  ' + code.substring(end)
            onCodeChange(newCode)
            setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 2
            }, 0)
        }
        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault()
            handleUndo()
        }
        // Ctrl+Y for redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault()
            handleRedo()
        }
        // Ctrl+F for find
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault()
            setShowFind(!showFind)
        }
    }

    const lines = code.split('\n')
    const lineCount = lines.length
    const charCount = code.length
    const wordCount = code.trim() ? code.trim().split(/\s+/).length : 0

    const langInfo = CODE_LANGUAGES[language] || { label: 'Plain Text', color: 'text-gray-400', icon: '📄' }

    const editorContent = (
        <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'relative'} flex flex-col ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-xl border ${darkMode ? 'border-slate-700' : 'border-slate-200'} overflow-hidden shadow-xl`}>
            {/* Top Toolbar */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                    {/* Language Selector */}
                    <div className="relative">
                        <select 
                            value={language} 
                            onChange={(e) => onLanguageChange(e.target.value)}
                            disabled={disabled}
                            className={`px-3 py-1.5 pr-8 rounded-lg text-sm font-medium cursor-pointer appearance-none ${darkMode ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-slate-700 border-slate-300'} border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                            <option value="">Select Language</option>
                            {Object.entries(CODE_LANGUAGES).map(([key, val]) => (
                                <option key={key} value={key}>{val.icon} {val.label}</option>
                            ))}
                        </select>
                        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    </div>

                    {/* Templates Dropdown */}
                    {language && CODE_TEMPLATES[language] && (
                        <div className="relative">
                            <Button
                                onClick={() => setShowTemplates(!showTemplates)}
                                variant="ghost"
                                size="sm"
                                className={`gap-1 ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                <Zap className="w-4 h-4 text-yellow-500" />
                                Templates
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                            {showTemplates && (
                                <div className={`absolute top-full left-0 mt-1 w-56 rounded-lg shadow-xl z-50 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border overflow-hidden`}>
                                    {Object.entries(CODE_TEMPLATES[language]).map(([name, template]) => (
                                        <button
                                            key={name}
                                            onClick={() => insertTemplate(template)}
                                            className={`w-full px-4 py-2 text-left text-sm ${darkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} transition-colors`}
                                        >
                                            <span className="font-medium">{name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Undo/Redo */}
                    <Button onClick={handleUndo} disabled={historyIndex === 0 || disabled} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Undo (Ctrl+Z)">
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleRedo} disabled={historyIndex === history.length - 1 || disabled} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Redo (Ctrl+Y)">
                        <Redo className="w-4 h-4" />
                    </Button>

                    <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Find/Replace */}
                    <Button onClick={() => setShowFind(!showFind)} variant="ghost" size="icon" className={`w-8 h-8 ${showFind ? 'bg-blue-500/20 text-blue-400' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Find & Replace (Ctrl+F)">
                        <Search className="w-4 h-4" />
                    </Button>

                    {/* Format */}
                    <Button onClick={formatCode} disabled={!code.trim() || disabled} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Format Code">
                        <AlignLeft className="w-4 h-4" />
                    </Button>

                    <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Line Numbers Toggle */}
                    <Button onClick={() => setShowLineNumbers(!showLineNumbers)} variant="ghost" size="icon" className={`w-8 h-8 ${showLineNumbers ? 'bg-blue-500/20 text-blue-400' : darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Toggle Line Numbers">
                        <Hash className="w-4 h-4" />
                    </Button>

                    {/* Theme Toggle */}
                    <Button onClick={() => setDarkMode(!darkMode)} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-yellow-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`} title="Toggle Theme">
                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>

                    <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Copy */}
                    <Button onClick={handleCopy} disabled={!code.trim()} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Copy Code">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>

                    {/* Download */}
                    <Button onClick={handleDownload} disabled={!code.trim()} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Download Code">
                        <Download className="w-4 h-4" />
                    </Button>

                    {/* Upload */}
                    <label className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Upload Code File">
                        <Upload className="w-4 h-4" />
                        <input type="file" className="hidden" accept=".js,.py,.java,.cpp,.cs,.php,.sql,.html,.css,.ts,.go,.rs,.rb,.swift,.kt,.sh,.txt" onChange={handleUpload} disabled={disabled} />
                    </label>

                    {/* Clear */}
                    <Button onClick={handleClear} disabled={!code.trim() || disabled} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-red-400' : 'text-slate-500 hover:bg-slate-100 hover:text-red-500'}`} title="Clear Code">
                        <Trash2 className="w-4 h-4" />
                    </Button>

                    <div className={`w-px h-5 mx-1 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

                    {/* Fullscreen */}
                    <Button onClick={() => setIsFullscreen(!isFullscreen)} variant="ghost" size="icon" className={`w-8 h-8 ${darkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Find/Replace Bar */}
            {showFind && (
                <div className={`flex items-center gap-2 px-3 py-2 border-b ${darkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                    <Search className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <input
                        type="text"
                        value={findText}
                        onChange={(e) => setFindText(e.target.value)}
                        placeholder="Find..."
                        className={`flex-1 px-2 py-1 text-sm rounded ${darkMode ? 'bg-slate-700 text-slate-200 placeholder-slate-400' : 'bg-white text-slate-700 placeholder-slate-400'} border ${darkMode ? 'border-slate-600' : 'border-slate-300'} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    <Replace className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    <input
                        type="text"
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        placeholder="Replace..."
                        className={`flex-1 px-2 py-1 text-sm rounded ${darkMode ? 'bg-slate-700 text-slate-200 placeholder-slate-400' : 'bg-white text-slate-700 placeholder-slate-400'} border ${darkMode ? 'border-slate-600' : 'border-slate-300'} focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    <Button onClick={handleFind} size="sm" variant="ghost" className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Find</Button>
                    <Button onClick={handleReplace} size="sm" variant="ghost" className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Replace</Button>
                    <Button onClick={handleReplaceAll} size="sm" variant="ghost" className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>All</Button>
                </div>
            )}

            {/* Tab Bar */}
            <div className={`flex items-center gap-1 px-3 py-1 border-b ${darkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'}`}>
                <button
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'editor' ? (darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700') : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                >
                    <FileCode className="w-3 h-3 inline mr-1" />
                    Editor
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'preview' ? (darkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700') : (darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}
                >
                    <Code className="w-3 h-3 inline mr-1" />
                    Preview
                </button>
            </div>

            {/* Main Content */}
            <div className={`flex-1 ${isFullscreen ? 'overflow-auto' : ''}`} style={{ minHeight: isFullscreen ? 'calc(100vh - 140px)' : '320px' }}>
                {activeTab === 'editor' && (
                    <div className="flex h-full">
                        {/* Line Numbers */}
                        {showLineNumbers && (
                            <div className={`select-none text-right pr-3 pt-3 pb-3 font-mono text-xs ${darkMode ? 'bg-slate-800/50 text-slate-500 border-r border-slate-700' : 'bg-slate-100 text-slate-400 border-r border-slate-200'}`} style={{ minWidth: '3rem' }}>
                                {lines.map((_, i) => (
                                    <div key={i} className="leading-6">{i + 1}</div>
                                ))}
                            </div>
                        )}
                        {/* Code Editor */}
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={(e) => onCodeChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="// Start writing your code here..."
                            disabled={disabled}
                            className={`flex-1 p-3 font-mono text-sm leading-6 resize-none focus:outline-none ${darkMode ? 'bg-slate-900 text-slate-100 placeholder-slate-500' : 'bg-white text-slate-800 placeholder-slate-400'}`}
                            spellCheck="false"
                            autoCapitalize="off"
                            autoCorrect="off"
                        />
                    </div>
                )}

                {activeTab === 'preview' && (
                    <div className={`h-full p-4 overflow-auto font-mono text-sm ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
                        {code.trim() ? (
                            <pre className="whitespace-pre-wrap">
                                {lines.map((line, i) => (
                                    <div key={i} className="flex">
                                        <span className={`select-none mr-4 text-right ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} style={{ minWidth: '2rem' }}>{i + 1}</span>
                                        <code className={langInfo.color}>{line || ' '}</code>
                                    </div>
                                ))}
                            </pre>
                        ) : (
                            <div className={`text-center py-12 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Write some code to see the preview</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className={`flex items-center justify-between px-3 py-1.5 text-xs border-t ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <div className="flex items-center gap-4">
                    <span className={`flex items-center gap-1 font-medium ${langInfo.color}`}>
                        <FileCode className="w-3 h-3" />
                        {langInfo.icon} {langInfo.label}
                    </span>
                    <span>{lineCount} lines</span>
                    <span>{charCount} characters</span>
                    <span>{wordCount} words</span>
                </div>
                <div className="flex items-center gap-3">
                    <span>UTF-8</span>
                    <span>{showLineNumbers ? 'LN: ON' : 'LN: OFF'}</span>
                    {darkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                </div>
            </div>
        </div>
    )

    return editorContent
}

export default CodeEditor
