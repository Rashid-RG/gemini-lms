"use client"
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, AlertCircle, Loader, Send, FileText, Code, FileUp, ArrowLeft, Award, TrendingUp, Clock, RefreshCw, Save, History, Timer, AlertTriangle, Sparkles, Eye, ChevronDown, ChevronUp, Bold, Italic, Strikethrough, List, ListOrdered, Quote, Heading1, Heading2, Link2, Image, Table, Minus, Undo2, Redo2, Maximize2, Minimize2, Copy, Type, BookOpen, Wand2, Hash, AtSign } from 'lucide-react'
import { toast } from 'sonner'
import CodeEditor from './CodeEditor'
import { useRouter, useParams } from 'next/navigation'

const SUBMISSION_TYPES = {
    'text': { label: 'Text Answer', icon: FileText, description: 'Write your answer as text' },
    'code': { label: 'Code Submission', icon: Code, description: 'Submit your code with syntax highlighting' },
    'document': { label: 'Document/File', icon: FileUp, description: 'Upload a document or file' },
}

const CODE_LANGUAGES = {
    'javascript': 'JavaScript',
    'python': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'csharp': 'C#',
    'php': 'PHP',
    'sql': 'SQL',
    'html': 'HTML',
    'css': 'CSS',
    'xml': 'XML',
    'json': 'JSON',
    'bash': 'Bash',
}

// Countdown Timer Component
const CountdownTimer = ({ dueDate, compact = false }) => {
    const [timeLeft, setTimeLeft] = useState(null)
    const [urgency, setUrgency] = useState('normal') // normal, warning, urgent, overdue

    useEffect(() => {
        if (!dueDate) return

        const calculateTimeLeft = () => {
            const now = new Date().getTime()
            const due = new Date(dueDate).getTime()
            const difference = due - now

            if (difference <= 0) {
                setUrgency('overdue')
                return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
            }

            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((difference % (1000 * 60)) / 1000)

            // Set urgency level
            const hoursLeft = difference / (1000 * 60 * 60)
            if (hoursLeft <= 2) setUrgency('urgent')
            else if (hoursLeft <= 24) setUrgency('warning')
            else setUrgency('normal')

            return { days, hours, minutes, seconds, total: difference }
        }

        setTimeLeft(calculateTimeLeft())
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft())
        }, 1000)

        return () => clearInterval(timer)
    }, [dueDate])

    if (!dueDate || !timeLeft) return null

    const urgencyStyles = {
        normal: 'from-emerald-500 to-green-600 text-white',
        warning: 'from-amber-500 to-orange-600 text-white animate-pulse',
        urgent: 'from-red-500 to-rose-600 text-white animate-pulse',
        overdue: 'from-gray-600 to-gray-800 text-white'
    }

    const compactUrgencyStyles = {
        normal: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
        urgent: 'bg-red-100 text-red-700',
        overdue: 'bg-gray-100 text-gray-600'
    }

    // Compact inline version
    if (compact) {
        if (urgency === 'overdue') {
            return (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${compactUrgencyStyles[urgency]}`}>
                    <AlertCircle className="w-4 h-4" />
                    Overdue
                </span>
            )
        }
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${compactUrgencyStyles[urgency]}`}>
                <Timer className="w-4 h-4" />
                {timeLeft.days > 0 && `${timeLeft.days}d `}
                {timeLeft.hours}h {timeLeft.minutes}m
            </span>
        )
    }

    const urgencyIcons = {
        normal: <Timer className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        urgent: <AlertTriangle className="w-5 h-5 animate-bounce" />,
        overdue: <AlertCircle className="w-5 h-5" />
    }

    return (
        <div className={`bg-gradient-to-br ${urgencyStyles[urgency]} rounded-xl p-4 shadow-lg transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase font-bold tracking-wider opacity-90">Time Remaining</p>
                {urgencyIcons[urgency]}
            </div>
            
            {urgency === 'overdue' ? (
                <div className="text-center py-2">
                    <p className="text-2xl font-black">OVERDUE</p>
                    <p className="text-xs opacity-75 mt-1">Submission may be penalized</p>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/20 rounded-lg py-2 px-1">
                        <p className="text-2xl font-black">{timeLeft.days}</p>
                        <p className="text-[10px] uppercase opacity-75">Days</p>
                    </div>
                    <div className="bg-white/20 rounded-lg py-2 px-1">
                        <p className="text-2xl font-black">{timeLeft.hours}</p>
                        <p className="text-[10px] uppercase opacity-75">Hours</p>
                    </div>
                    <div className="bg-white/20 rounded-lg py-2 px-1">
                        <p className="text-2xl font-black">{timeLeft.minutes}</p>
                        <p className="text-[10px] uppercase opacity-75">Mins</p>
                    </div>
                    <div className="bg-white/20 rounded-lg py-2 px-1">
                        <p className="text-2xl font-black">{timeLeft.seconds}</p>
                        <p className="text-[10px] uppercase opacity-75">Secs</p>
                    </div>
                </div>
            )}
            
            {urgency === 'urgent' && (
                <p className="text-xs mt-3 text-center font-semibold bg-white/20 rounded py-1">
                    ⚠️ Less than 2 hours remaining!
                </p>
            )}
        </div>
    )
}

// Auto-Save Indicator Component
const AutoSaveIndicator = ({ status, lastSaved }) => {
    const statusConfig = {
        saving: { icon: <Loader className="w-3 h-3 animate-spin" />, text: 'Saving...', color: 'text-blue-600 bg-blue-50' },
        saved: { icon: <CheckCircle className="w-3 h-3" />, text: `Saved ${lastSaved ? new Date(lastSaved).toLocaleTimeString() : ''}`, color: 'text-green-600 bg-green-50' },
        unsaved: { icon: <AlertCircle className="w-3 h-3" />, text: 'Unsaved changes', color: 'text-amber-600 bg-amber-50' },
        idle: { icon: null, text: '', color: '' }
    }

    const config = statusConfig[status] || statusConfig.idle
    if (!config.text) return null

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${config.color}`}>
            {config.icon}
            <span>{config.text}</span>
        </div>
    )
}

// Submission History Component
const SubmissionHistory = ({ submissions, onViewSubmission }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    
    if (!submissions || submissions.length <= 1) return null

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <History className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-slate-900">Submission History</h4>
                        <p className="text-xs text-slate-500">{submissions.length} previous submissions</p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>
            
            {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {submissions.map((sub, idx) => (
                        <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    sub.score >= 80 ? 'bg-green-100 text-green-700' :
                                    sub.score >= 50 ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                    {sub.score || '—'}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        Attempt #{submissions.length - idx}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(sub.submittedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => onViewSubmission(sub)}
                                className="text-indigo-600 hover:text-indigo-700"
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// Advanced Rich Text Editor Component
const AdvancedTextEditor = ({ content, setContent, disabled = false }) => {
    const textareaRef = useRef(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [history, setHistory] = useState([content])
    const [historyIndex, setHistoryIndex] = useState(0)
    const [showTemplates, setShowTemplates] = useState(false)

    // Track content changes for undo/redo
    useEffect(() => {
        const timer = setTimeout(() => {
            if (content !== history[historyIndex]) {
                const newHistory = history.slice(0, historyIndex + 1)
                newHistory.push(content)
                if (newHistory.length > 50) newHistory.shift() // Keep last 50 states
                setHistory(newHistory)
                setHistoryIndex(newHistory.length - 1)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [content])

    // Calculate stats
    const stats = useMemo(() => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0
        const chars = content.length
        const charsNoSpaces = content.replace(/\s/g, '').length
        const sentences = content.split(/[.!?]+/).filter(s => s.trim()).length
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim()).length
        const readingTime = Math.max(1, Math.ceil(words / 200)) // 200 WPM average
        return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime }
    }, [content])

    const insertFormatting = (before, after = before, placeholder = '') => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = content.substring(start, end) || placeholder
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
        
        setContent(newText)
        
        setTimeout(() => {
            textarea.focus()
            const newCursorPos = start + before.length + selectedText.length
            textarea.setSelectionRange(start + before.length, newCursorPos)
        }, 0)
    }

    const insertAtCursor = (text) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const newText = content.substring(0, start) + text + content.substring(start)
        setContent(newText)
        
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + text.length, start + text.length)
        }, 0)
    }

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1)
            setContent(history[historyIndex - 1])
        }
    }

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1)
            setContent(history[historyIndex + 1])
        }
    }

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(content)
        toast.success('Copied to clipboard!')
    }

    const templates = [
        { 
            name: 'Essay Structure', 
            icon: '📝',
            content: `## Introduction\n\n[Your introduction here - state your thesis]\n\n## Main Arguments\n\n### Point 1\n[Explain your first argument]\n\n### Point 2\n[Explain your second argument]\n\n### Point 3\n[Explain your third argument]\n\n## Conclusion\n\n[Summarize your arguments and restate thesis]\n\n## References\n\n- [Source 1]\n- [Source 2]` 
        },
        { 
            name: 'Problem Solution', 
            icon: '🔧',
            content: `## Problem Statement\n\n[Describe the problem clearly]\n\n## Analysis\n\n### Root Causes\n- [Cause 1]\n- [Cause 2]\n\n### Impact\n[Describe the impact of this problem]\n\n## Proposed Solution\n\n### Approach\n[Explain your solution]\n\n### Implementation Steps\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\n### Expected Outcomes\n[What results do you expect?]` 
        },
        { 
            name: 'Code Explanation', 
            icon: '💻',
            content: `## Overview\n\n[Brief description of what this code does]\n\n## Key Components\n\n### Component 1\n\`\`\`\n[Your code here]\n\`\`\`\n**Explanation:** [Explain what this code does]\n\n### Component 2\n\`\`\`\n[Your code here]\n\`\`\`\n**Explanation:** [Explain what this code does]\n\n## How It Works\n\n1. [Step 1]\n2. [Step 2]\n3. [Step 3]\n\n## Complexity Analysis\n\n- **Time Complexity:** O(?)\n- **Space Complexity:** O(?)` 
        },
        { 
            name: 'Research Summary', 
            icon: '🔬',
            content: `## Research Topic\n\n[State your research topic]\n\n## Background\n\n[Provide context and background information]\n\n## Methodology\n\n[Describe how you conducted your research]\n\n## Key Findings\n\n1. **Finding 1:** [Description]\n2. **Finding 2:** [Description]\n3. **Finding 3:** [Description]\n\n## Discussion\n\n[Analyze and interpret your findings]\n\n## Conclusion\n\n[Summarize your research conclusions]` 
        },
    ]

    // Simple markdown to HTML preview
    const renderPreview = (text) => {
        return text
            .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
            .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-3">$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~~(.*?)~~/g, '<del>$1</del>')
            .replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
            .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
            .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
            .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-blue-400 pl-4 italic text-slate-600 my-2">$1</blockquote>')
            .replace(/\n\n/g, '</p><p class="mb-3">')
            .replace(/\n/g, '<br/>')
    }

    const toolbarGroups = [
        {
            name: 'History',
            tools: [
                { icon: Undo2, title: 'Undo (Ctrl+Z)', action: undo, disabled: historyIndex === 0 },
                { icon: Redo2, title: 'Redo (Ctrl+Y)', action: redo, disabled: historyIndex === history.length - 1 },
            ]
        },
        {
            name: 'Text',
            tools: [
                { icon: Bold, title: 'Bold', action: () => insertFormatting('**', '**', 'bold text') },
                { icon: Italic, title: 'Italic', action: () => insertFormatting('*', '*', 'italic text') },
                { icon: Strikethrough, title: 'Strikethrough', action: () => insertFormatting('~~', '~~', 'strikethrough') },
                { icon: Code, title: 'Inline Code', action: () => insertFormatting('`', '`', 'code') },
            ]
        },
        {
            name: 'Headings',
            tools: [
                { icon: Heading1, title: 'Heading 1', action: () => insertFormatting('\n# ', '\n', 'Heading') },
                { icon: Heading2, title: 'Heading 2', action: () => insertFormatting('\n## ', '\n', 'Subheading') },
            ]
        },
        {
            name: 'Lists',
            tools: [
                { icon: List, title: 'Bullet List', action: () => insertFormatting('\n- ', '', 'List item') },
                { icon: ListOrdered, title: 'Numbered List', action: () => insertFormatting('\n1. ', '', 'List item') },
                { icon: Quote, title: 'Quote', action: () => insertFormatting('\n> ', '', 'Quote') },
            ]
        },
        {
            name: 'Insert',
            tools: [
                { icon: Minus, title: 'Horizontal Line', action: () => insertAtCursor('\n\n---\n\n') },
                { icon: Link2, title: 'Link', action: () => insertFormatting('[', '](url)', 'link text') },
                { icon: Table, title: 'Table', action: () => insertAtCursor('\n\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n\n') },
                { icon: FileText, title: 'Code Block', action: () => insertFormatting('\n```\n', '\n```\n', '// Your code here') },
            ]
        },
    ]

    const containerClass = isFullscreen 
        ? 'fixed inset-0 z-50 bg-white flex flex-col' 
        : 'rounded-xl border-2 border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 transition-all overflow-hidden'

    return (
        <div className={containerClass}>
            {/* Toolbar */}
            <div className="bg-slate-50 border-b border-slate-200 p-2">
                <div className="flex flex-wrap items-center gap-1">
                    {toolbarGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex items-center">
                            {groupIdx > 0 && <div className="w-px h-6 bg-slate-300 mx-1" />}
                            {group.tools.map((tool, toolIdx) => {
                                const Icon = tool.icon
                                return (
                                    <button
                                        key={toolIdx}
                                        onClick={tool.action}
                                        disabled={disabled || tool.disabled}
                                        title={tool.title}
                                        className={`p-1.5 rounded hover:bg-slate-200 transition-colors ${
                                            tool.disabled ? 'opacity-40 cursor-not-allowed' : 'text-slate-700'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                    
                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-300 mx-1" />
                    
                    {/* Templates */}
                    <div className="relative">
                        <button
                            onClick={() => setShowTemplates(!showTemplates)}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded transition-colors"
                        >
                            <Wand2 className="w-4 h-4" />
                            Templates
                        </button>
                        {showTemplates && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-10">
                                {templates.map((template, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setContent(template.content)
                                            setShowTemplates(false)
                                            toast.success(`${template.name} template loaded!`)
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                    >
                                        <span>{template.icon}</span>
                                        <span>{template.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Copy */}
                    <button
                        onClick={copyToClipboard}
                        title="Copy to clipboard"
                        className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-700"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    
                    {/* Spacer */}
                    <div className="flex-1" />
                    
                    {/* Preview Toggle */}
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                            showPreview ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </button>
                    
                    {/* Fullscreen Toggle */}
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-700"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className={`flex ${isFullscreen ? 'flex-1 overflow-hidden' : ''}`}>
                {/* Text Editor */}
                <div className={`${showPreview ? 'w-1/2 border-r border-slate-200' : 'w-full'} ${isFullscreen ? 'h-full' : ''}`}>
                    <Textarea
                        ref={textareaRef}
                        placeholder="Start writing your answer here...

Use the toolbar above to format your text with:
• **Bold** and *italic* text
• Headings and subheadings  
• Bullet and numbered lists
• Code blocks and inline code
• Links and tables

Or use a template to get started quickly!"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className={`w-full resize-none text-base leading-relaxed border-0 focus:ring-0 focus-visible:ring-0 font-mono ${
                            isFullscreen ? 'h-full' : 'min-h-72'
                        }`}
                        disabled={disabled}
                    />
                </div>
                
                {/* Preview Pane */}
                {showPreview && (
                    <div className={`w-1/2 bg-white overflow-y-auto ${isFullscreen ? 'h-full' : 'min-h-72 max-h-96'}`}>
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                                <Eye className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-medium text-slate-600">Preview</span>
                            </div>
                            <div 
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ 
                                    __html: content ? `<p class="mb-3">${renderPreview(content)}</p>` : '<p class="text-slate-400 italic">Nothing to preview yet...</p>' 
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    <span><strong>{stats.words}</strong> words</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    <span><strong>{stats.chars}</strong> characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span><strong>{stats.sentences}</strong> sentences</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span><strong>{stats.paragraphs}</strong> paragraphs</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>~<strong>{stats.readingTime}</strong> min read</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                    stats.words >= 300 ? 'bg-green-100 text-green-700' :
                    stats.words >= 100 ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-200 text-slate-600'
                }`}>
                    {stats.words >= 300 ? '✓ Good length' : stats.words >= 100 ? 'Keep writing...' : 'Just started'}
                </div>
            </div>
        </div>
    )
}

// Rich Text Toolbar Component (Legacy - kept for compatibility)
const RichTextToolbar = ({ textareaRef, content, setContent }) => {
    const insertFormatting = (before, after = before) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = content.substring(start, end)
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end)
        
        setContent(newText)
        
        // Restore cursor position
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + before.length, end + before.length)
        }, 0)
    }

    const toolbarButtons = [
        { label: 'B', title: 'Bold', action: () => insertFormatting('**'), className: 'font-bold' },
        { label: 'I', title: 'Italic', action: () => insertFormatting('*'), className: 'italic' },
        { label: '~', title: 'Strikethrough', action: () => insertFormatting('~~') },
        { label: '</>', title: 'Inline Code', action: () => insertFormatting('`') },
        { label: '```', title: 'Code Block', action: () => insertFormatting('\n```\n', '\n```\n') },
        { label: '•', title: 'Bullet List', action: () => insertFormatting('\n- ', '') },
        { label: '1.', title: 'Numbered List', action: () => insertFormatting('\n1. ', '') },
        { label: '> ', title: 'Quote', action: () => insertFormatting('\n> ', '') },
        { label: '#', title: 'Heading', action: () => insertFormatting('\n## ', '') },
    ]

    return (
        <div className="flex items-center gap-1 p-2 bg-slate-100 rounded-t-xl border-b border-slate-200">
            <span className="text-xs text-slate-500 mr-2">Format:</span>
            {toolbarButtons.map((btn, idx) => (
                <button
                    key={idx}
                    onClick={btn.action}
                    title={btn.title}
                    className={`px-2 py-1 text-xs rounded hover:bg-slate-200 text-slate-700 transition-colors ${btn.className || ''}`}
                >
                    {btn.label}
                </button>
            ))}
            <span className="text-xs text-slate-400 ml-auto">Supports Markdown</span>
        </div>
    )
}

function AssignmentSubmission({ assignmentId, courseId, studentEmail }) {
    const router = useRouter()
    const params = useParams()
    const [submission, setSubmission] = useState(null)
    const [submissionHistory, setSubmissionHistory] = useState([])
    const [content, setContent] = useState('')
    const [submissionType, setSubmissionType] = useState('text')
    const [language, setLanguage] = useState('javascript')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [assignment, setAssignment] = useState(null)
    const [isRevising, setIsRevising] = useState(false)
    const [uploadedFile, setUploadedFile] = useState(null)
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [reviewReason, setReviewReason] = useState('')
    const [requestingReview, setRequestingReview] = useState(false)
    const [showHistorySubmission, setShowHistorySubmission] = useState(null)
    
    // Auto-save states
    const [autoSaveStatus, setAutoSaveStatus] = useState('idle') // idle, saving, saved, unsaved
    const [lastSaved, setLastSaved] = useState(null)
    const [initialContent, setInitialContent] = useState('')
    
    const fileInputRef = useRef(null)
    const textareaRef = useRef(null)
    const autoSaveTimerRef = useRef(null)

    // Generate draft key for localStorage
    const getDraftKey = useCallback(() => {
        return `assignment_draft_${assignmentId}_${studentEmail}`
    }, [assignmentId, studentEmail])

    // Load draft from localStorage
    const loadDraft = useCallback(() => {
        try {
            const draftKey = getDraftKey()
            const savedDraft = localStorage.getItem(draftKey)
            if (savedDraft) {
                const draft = JSON.parse(savedDraft)
                // Only load if draft is less than 7 days old
                if (Date.now() - draft.timestamp < 7 * 24 * 60 * 60 * 1000) {
                    return draft
                } else {
                    localStorage.removeItem(draftKey)
                }
            }
        } catch (err) {
            console.error('Error loading draft:', err)
        }
        return null
    }, [getDraftKey])

    // Save draft to localStorage
    const saveDraft = useCallback(() => {
        if (!content.trim() || content === initialContent) return
        
        try {
            setAutoSaveStatus('saving')
            const draftKey = getDraftKey()
            const draft = {
                content,
                submissionType,
                language,
                timestamp: Date.now()
            }
            localStorage.setItem(draftKey, JSON.stringify(draft))
            setLastSaved(Date.now())
            setAutoSaveStatus('saved')
            
            // Reset to idle after 3 seconds
            setTimeout(() => {
                setAutoSaveStatus(prev => prev === 'saved' ? 'idle' : prev)
            }, 3000)
        } catch (err) {
            console.error('Error saving draft:', err)
        }
    }, [content, submissionType, language, getDraftKey, initialContent])

    // Clear draft after successful submission
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(getDraftKey())
        } catch (err) {
            console.error('Error clearing draft:', err)
        }
    }, [getDraftKey])

    // Auto-save effect
    useEffect(() => {
        if (!content.trim() || content === initialContent) {
            setAutoSaveStatus('idle')
            return
        }

        setAutoSaveStatus('unsaved')
        
        // Clear existing timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current)
        }

        // Set new timer for 30 seconds
        autoSaveTimerRef.current = setTimeout(() => {
            saveDraft()
        }, 30000)

        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current)
            }
        }
    }, [content, initialContent, saveDraft])

    useEffect(() => {
        if (assignmentId && studentEmail) {
            fetchSubmission()
            fetchAssignment()
            
            // Check for saved draft
            const draft = loadDraft()
            if (draft && !submission?.submission) {
                setContent(draft.content)
                setSubmissionType(draft.submissionType || 'text')
                setLanguage(draft.language || 'javascript')
                setLastSaved(draft.timestamp)
                toast.info('Draft restored from auto-save', {
                    description: `Last saved ${new Date(draft.timestamp).toLocaleString()}`,
                    action: {
                        label: 'Discard',
                        onClick: () => {
                            clearDraft()
                            setContent('')
                            setLastSaved(null)
                        }
                    }
                })
            }
        }
    }, [assignmentId, studentEmail])

    const fetchAssignment = async () => {
        try {
            const response = await axios.get(`/api/course-assignments?courseId=${courseId}`)
            const assignments = response.data.result || []
            const currentAssignment = assignments.find(a => a.assignmentId === assignmentId)
            if (currentAssignment) {
                setAssignment(currentAssignment)
            }
        } catch (err) {
            console.error('Error fetching assignment:', err)
        }
    }

    const fetchSubmission = async () => {
        try {
            const response = await axios.get(
                `/api/submit-assignment?assignmentId=${assignmentId}&studentEmail=${studentEmail}&_t=${Date.now()}`
            )
            console.log('Fetched submission:', response.data.result)
            const result = response.data.result
            setSubmission(result)
            
            // Store submission history if available
            if (response.data.history) {
                setSubmissionHistory(response.data.history)
            }
            
            // Clear content for new assignment, or load existing submission
            if (result?.submission) {
                setContent(result.submission)
                setInitialContent(result.submission)
                setSubmissionType(result?.submissionType || 'text')
                setLanguage(result?.language || 'javascript')
            } else {
                setContent('')
                setInitialContent('')
            }
            setError(null)
        } catch (err) {
            console.error('Error fetching submission:', err)
            setError('Failed to load submission')
            setContent('')
            setInitialContent('')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (!content.trim()) {
            toast.error('Please write your assignment before submitting')
            return
        }

        setSubmitting(true)
        try {
            const response = await axios.post('/api/submit-assignment', {
                assignmentId,
                courseId,
                studentEmail,
                submission: content,
                submissionType: submissionType,
                language: submissionType === 'code' ? language : null
            })
            
            setSubmission(response.data.result)
            setIsRevising(false)
            clearDraft() // Clear auto-saved draft
            toast.success('Assignment submitted successfully! AI grading in progress...')
            setError(null)
            
            // Refresh submission status every 3 seconds while grading
            const checkGradeInterval = setInterval(async () => {
                try {
                    const updated = await axios.get(
                        `/api/submit-assignment?assignmentId=${assignmentId}&studentEmail=${studentEmail}`
                    )
                    if (updated.data.result?.status === 'Graded') {
                        setSubmission(updated.data.result)
                        clearInterval(checkGradeInterval)
                        setIsRevising(false) // Make sure revising is off when grading completes
                        toast.success('Your assignment has been graded!')
                    }
                } catch (err) {
                    console.error('Error checking grade status:', err)
                }
            }, 3000)

            setTimeout(() => clearInterval(checkGradeInterval), 60000) // Stop checking after 1 minute
        } catch (err) {
            console.error('Error submitting assignment:', err)
            toast.error('Failed to submit assignment')
            setError(err.response?.data?.error || 'Failed to submit assignment')
        } finally {
            setSubmitting(false)
        }
    }

    const handleRequestReview = async () => {
        if (!reviewReason.trim()) {
            toast.error('Please provide a reason for requesting manual review')
            return
        }

        // Use the prop assignmentId, not submission.assignmentId
        if (!assignmentId || !studentEmail) {
            toast.error('Missing assignment information. Please refresh the page.')
            return
        }

        setRequestingReview(true)
        try {
            await axios.post('/api/request-review', {
                assignmentId: assignmentId,
                reason: reviewReason,
                studentEmail: studentEmail
            })
            
            toast.success('Manual review requested! An instructor will review your assignment.')
            setShowReviewModal(false)
            setReviewReason('')
            
            // Refresh submission to show updated status
            await fetchSubmission()
        } catch (err) {
            console.error('Error requesting review:', err)
            toast.error(err.response?.data?.error || 'Failed to request review')
        } finally {
            setRequestingReview(false)
        }
    }

    if (loading) {
        return (
            <div className="w-full space-y-4 animate-pulse">
                <div className="h-10 bg-slate-200 rounded-lg"></div>
                <div className="h-40 bg-slate-200 rounded-lg"></div>
            </div>
        )
    }

    const isGraded = submission?.status === 'Graded' || submission?.status === 'ManuallyGraded' || submission?.status === 'PendingReview' || submission?.status === 'ReviewRequested'
    const isManuallyGraded = submission?.status === 'ManuallyGraded'
    const isPendingReview = submission?.status === 'PendingReview' || submission?.status === 'ReviewRequested'
    const hasRequestedReview = submission?.reviewRequested === true || submission?.status === 'ReviewRequested'
    const isSubmitted = submission?.status === 'Submitted'
    const shouldShowForm = (!isGraded && !isPendingReview) || isRevising

    return (
        <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Header Section */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button 
                            onClick={() => router.back()}
                            variant="outline"
                            size="sm"
                            className="h-9"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Assignment Submission</h1>
                            <p className="text-sm text-slate-500">Submit your work and receive AI-powered feedback</p>
                        </div>
                    </div>
                    {(isGraded || isPendingReview) && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            isPendingReview ? 'bg-orange-50 border border-orange-300' :
                            isManuallyGraded ? 'bg-purple-50 border border-purple-300' : 
                            'bg-green-50 border border-green-300'
                        }`}>
                            {isPendingReview ? (
                                <Clock className="w-5 h-5 text-orange-600" />
                            ) : (
                                <CheckCircle className={`w-5 h-5 ${isManuallyGraded ? 'text-purple-600' : 'text-green-600'}`} />
                            )}
                            <span className={`font-semibold text-sm ${
                                isPendingReview ? 'text-orange-700' :
                                isManuallyGraded ? 'text-purple-700' : 
                                'text-green-700'
                            }`}>
                                {isPendingReview ? 'Pending Review' : isManuallyGraded ? 'Manually Graded' : 'Graded'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {error && !isGraded && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-900 text-sm">Error</p>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Desktop: Flex layout | Mobile: Stack - Only show sidebar for form */}
                    {shouldShowForm || isPendingReview ? (
                    <div className="w-full space-y-5">
                        
                        {/* Top Info Cards - Horizontal on desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Countdown Timer */}
                            {assignment?.dueDate && (
                                <CountdownTimer dueDate={assignment.dueDate} />
                            )}
                            
                            {/* Total Points Card */}
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase font-bold tracking-wider mb-1 opacity-90">Total Points</p>
                                        <p className="text-4xl font-black">{assignment?.totalPoints || 100}</p>
                                    </div>
                                    <Award className="w-12 h-12 opacity-30" />
                                </div>
                            </div>

                            {/* Quick Stats Card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <p className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3">Assignment Info</p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span>{assignment?.title || 'Assignment'}</span>
                                    </div>
                                    {assignment?.dueDate && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Rubric Card - Full Width */}
                        {assignment?.rubric && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                        Grading Rubric
                                    </h3>
                                    <span className="text-sm text-slate-500">Total: {assignment?.totalPoints || 100} pts</span>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {Object.entries(typeof assignment.rubric === 'string' ? JSON.parse(assignment.rubric) : assignment.rubric).map(([key, value]) => (
                                            <div key={key} className="bg-slate-50 rounded-xl p-4 text-center hover:bg-blue-50 transition-colors">
                                                <div className="text-2xl font-bold text-blue-600 mb-1">{value}</div>
                                                <div className="text-xs text-slate-600 capitalize leading-tight">{key.replace(/_/g, ' ')}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Submission Form */}
                        {shouldShowForm && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                                {/* Form Header with gradient */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 sm:px-8 py-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-1">Submit Your Work</h2>
                                            <p className="text-blue-100 text-sm">Choose your submission format and complete your assignment</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={saveDraft}
                                                className="text-white hover:bg-white/20"
                                                disabled={!content.trim() || content === initialContent}
                                            >
                                                <Save className="w-4 h-4 mr-1" />
                                                Save Draft
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="p-6 sm:p-8">

                                {/* Submission Type Selector */}
                                <div className="mb-6">
                                    <label className="block text-sm font-semibold text-slate-900 mb-3">Submission Type</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {Object.entries(SUBMISSION_TYPES).map(([type, config]) => {
                                            const Icon = config.icon
                                            const isSelected = submissionType === type
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => setSubmissionType(type)}
                                                    className={`p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
                                                        isSelected
                                                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg ring-2 ring-blue-200'
                                                            : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                                                    }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
                                                        isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <p className={`text-sm font-semibold text-center ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{config.label}</p>
                                                    <p className={`text-xs mt-1 text-center line-clamp-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>{config.description}</p>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="mb-6 bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-xl border border-slate-200">
                                    {submissionType === 'text' && (
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    Your Answer
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    {autoSaveStatus !== 'idle' && (
                                                        <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                                                    )}
                                                </div>
                                            </div>
                                            <AdvancedTextEditor 
                                                content={content}
                                                setContent={setContent}
                                                disabled={submitting}
                                            />
                                        </div>
                                    )}

                                    {submissionType === 'code' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                    <Code className="w-4 h-4 text-purple-600" />
                                                    Code Submission
                                                </label>
                                                <div className="flex items-center gap-3">
                                                    {autoSaveStatus !== 'idle' && (
                                                        <AutoSaveIndicator status={autoSaveStatus} lastSaved={lastSaved} />
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 -mt-1">
                                                Use the editor below to write your code. Supports syntax highlighting, templates, and more.
                                            </p>
                                            <CodeEditor
                                                code={content}
                                                onCodeChange={setContent}
                                                language={language}
                                                onLanguageChange={setLanguage}
                                                disabled={submitting}
                                            />
                                        </div>
                                    )}

                                    {submissionType === 'document' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-900 mb-2">
                                                Upload Document or File
                                            </label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.txt,.xlsx,.ppt,.pptx,.jpg,.png,.zip"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        setUploadedFile(file)
                                                        setContent(file.name) // Store filename as content
                                                        toast.success(`File uploaded: ${file.name}`, {
                                                            position: 'top-center'
                                                        })
                                                    }
                                                }}
                                                disabled={submitting}
                                            />
                                            <div
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full p-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all"
                                            >
                                                <div className="text-center">
                                                    <FileUp className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                                                    <p className="text-sm font-semibold text-slate-900 mb-1">Click to upload file</p>
                                                    <p className="text-xs text-slate-500">PDF, DOC, DOCX, TXT, XLSX, PPT, JPG, PNG, ZIP</p>
                                                </div>
                                            </div>
                                            {uploadedFile && (
                                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-green-900">{uploadedFile.name}</p>
                                                        <p className="text-xs text-green-700">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                                    <Button
                                        onClick={() => router.back()}
                                        variant="outline"
                                        className="px-6 h-11"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={submitting || !content.trim()}
                                        className="px-8 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Submit for AI Grading
                                            </>
                                        )}
                                    </Button>
                                </div>
                                </div>
                            </div>
                        )}

                        {/* Pending Review Notice */}
                        {isPendingReview && submission && !isRevising && (
                            <div className="space-y-6">
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3 text-orange-800 font-semibold text-lg">
                                            <Clock className="w-6 h-6" />
                                            Awaiting Instructor Review
                                        </div>
                                        <Button
                                            onClick={() => {
                                                toast.loading('Refreshing...')
                                                fetchSubmission().then(() => {
                                                    toast.dismiss()
                                                    toast.success('Status refreshed!')
                                                })
                                            }}
                                            variant="outline"
                                            size="sm"
                                            className="text-orange-700 border-orange-300 hover:bg-orange-100"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-1" />
                                            Refresh Status
                                        </Button>
                                    </div>
                                    <p className="text-orange-700 mb-4">
                                        AI grading was temporarily unavailable when your assignment was submitted. 
                                        Your submission has been automatically flagged for manual review by an instructor.
                                    </p>
                                    
                                    {/* Retry AI Grading Section */}
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-semibold text-blue-900 mb-1">🔄 Try AI Grading Again</p>
                                                <p className="text-xs text-blue-700">The AI service may be available now. Click to retry automatic grading.</p>
                                            </div>
                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        toast.loading('Retrying AI grading...')
                                                        const response = await axios.post('/api/retry-grading', {
                                                            assignmentId: assignmentId,
                                                            studentEmail: studentEmail
                                                        })
                                                        toast.dismiss()
                                                        toast.success('AI grading retry initiated! Please wait a moment and refresh.')
                                                        // Wait a bit then refresh
                                                        setTimeout(() => {
                                                            fetchSubmission()
                                                        }, 5000)
                                                    } catch (err) {
                                                        toast.dismiss()
                                                        toast.error(err.response?.data?.error || 'Failed to retry grading')
                                                    }
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                                size="sm"
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Retry AI Grading
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white rounded-lg p-4 border border-orange-200">
                                        <p className="text-sm text-gray-600 mb-2"><strong>What happens next:</strong></p>
                                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                                            <li>Try the "Retry AI Grading" button above first</li>
                                            <li>If AI is still unavailable, an instructor will review your answers</li>
                                            <li>You'll receive an accurate grade based on content correctness</li>
                                            <li>Feedback will be provided after review</li>
                                        </ul>
                                    </div>
                                    {submission.feedback && (
                                        <div className="mt-4 p-3 bg-orange-100 rounded-lg">
                                            <p className="text-orange-800 text-sm">{submission.feedback}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    ) : null}

                    {/* Grading Results - Vertical Stacked Design */}
                    {isGraded && !isPendingReview && submission && !isRevising && (
                        <div className="w-full space-y-5">
                            {/* Submission History */}
                            {submissionHistory.length > 1 && (
                                <SubmissionHistory 
                                    submissions={submissionHistory} 
                                    onViewSubmission={(sub) => setShowHistorySubmission(sub)}
                                />
                            )}

                            {/* Score Card - Centered with Circular Progress */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
                                <div className="flex flex-col items-center text-center">
                                    {/* Circular Score Display */}
                                    <div className="relative w-40 h-40 mb-6">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                stroke="#e2e8f0"
                                                strokeWidth="12"
                                                fill="none"
                                            />
                                            <circle
                                                cx="80"
                                                cy="80"
                                                r="70"
                                                stroke={isManuallyGraded ? "#8b5cf6" : "#10b981"}
                                                strokeWidth="12"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeDasharray={`${(submission.score / 100) * 440} 440`}
                                                className="transition-all duration-1000"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black text-slate-900">{submission.score}</span>
                                            <span className="text-sm text-slate-500">out of 100</span>
                                        </div>
                                    </div>
                                    
                                    {/* Grade Label */}
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-4 ${
                                        isManuallyGraded 
                                            ? 'bg-purple-100 text-purple-700' 
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        <Award className="w-4 h-4" />
                                        {isManuallyGraded ? 'Graded by Instructor' : 'AI Graded'}
                                    </div>

                                    {/* Quick Info Row */}
                                    <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="capitalize">{submission.submissionType} submission</span>
                                        </div>
                                        {submission.originalAiScore !== undefined && submission.originalAiScore !== null && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">○</span>
                                                <span>Original AI: {submission.originalAiScore}/100</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => router.push(`/course/${params.courseId}`)}
                                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-11 font-medium rounded-xl"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Course
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsRevising(true)
                                        setContent(submission.submission)
                                    }}
                                    variant="outline"
                                    className="flex-1 h-11 font-medium rounded-xl border-slate-300 hover:bg-slate-50"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Revise Submission
                                </Button>
                            </div>

                            {/* Rubric Card */}
                            {assignment?.rubric && (
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-blue-600" />
                                            Grading Rubric
                                        </h3>
                                        <span className="text-sm text-slate-500">Total: {assignment?.totalPoints || 100} pts</span>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {Object.entries(typeof assignment.rubric === 'string' ? JSON.parse(assignment.rubric) : assignment.rubric).map(([key, value]) => (
                                                <div key={key} className="bg-slate-50 rounded-xl p-4 text-center">
                                                    <div className="text-2xl font-bold text-blue-600 mb-1">{value}</div>
                                                    <div className="text-xs text-slate-600 capitalize leading-tight">{key.replace(/_/g, ' ')}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Feedback Section */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-semibold text-slate-900">Feedback & Comments</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    {/* Strengths */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                            Strengths
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                <span className="text-green-800">Submission completed successfully</span>
                                            </div>
                                            {submission.strengths && submission.strengths.map((s, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                    <span className="text-green-800">{s}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Areas to Improve */}
                                    {submission.improvements && submission.improvements.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                Areas to Improve
                                            </h4>
                                            <div className="space-y-2">
                                                {submission.improvements.map((improvement, idx) => (
                                                    <div key={idx} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                                                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                        <span className="text-amber-800">{improvement}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Instructor Notes */}
                                    {submission.instructorNotes && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-purple-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                                Instructor Notes
                                            </h4>
                                            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
                                                <p className="text-purple-800 leading-relaxed">{submission.instructorNotes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Due Date Info (if exists) */}
                            {assignment?.dueDate && (
                                <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Due Date</p>
                                            <p className="text-sm text-slate-500">
                                                {new Date(assignment.dueDate).toLocaleDateString('en-US', { 
                                                    weekday: 'long', 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <CountdownTimer dueDate={assignment.dueDate} compact={true} />
                                </div>
                            )}

                            {/* Request Review */}
                            {!isManuallyGraded && !hasRequestedReview && (
                                <button
                                    onClick={() => setShowReviewModal(true)}
                                    className="w-full py-4 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <AlertCircle className="w-5 h-5" />
                                    Not satisfied with the AI grade? Request a manual review
                                </button>
                            )}

                            {hasRequestedReview && !isManuallyGraded && (
                                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-blue-900">Manual review requested</p>
                                        <p className="text-sm text-blue-600">An instructor will review your submission soon</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                        {loading && (
                            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center shadow-sm">
                                <div className="inline-flex items-center gap-3">
                                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                                    <p className="text-slate-600 font-medium">Loading assignment...</p>
                                </div>
                            </div>
                        )}
                </div>
            </div>

            {/* Manual Review Request Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Request Manual Review</h3>
                        <p className="text-slate-600 text-sm mb-4">
                            Please explain why you believe your assignment deserves a manual review. 
                            An instructor will review your submission and may adjust the grade.
                        </p>
                        <Textarea
                            value={reviewReason}
                            onChange={(e) => setReviewReason(e.target.value)}
                            placeholder="Example: I believe the AI misunderstood my approach to solving the problem. My solution uses a different but valid method..."
                            className="min-h-[120px] mb-4"
                        />
                        <div className="flex gap-3">
                            <Button
                                onClick={() => {
                                    setShowReviewModal(false)
                                    setReviewReason('')
                                }}
                                variant="outline"
                                className="flex-1"
                                disabled={requestingReview}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleRequestReview}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={requestingReview || !reviewReason.trim()}
                            >
                                {requestingReview ? (
                                    <>
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Request'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Submission View Modal */}
            {showHistorySubmission && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div className="text-white">
                                    <h3 className="text-lg font-bold">Previous Submission</h3>
                                    <p className="text-indigo-200 text-sm">
                                        Submitted {new Date(showHistorySubmission.submittedAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 rounded-lg px-4 py-2 text-white">
                                        <span className="text-2xl font-black">{showHistorySubmission.score || '—'}</span>
                                        <span className="text-sm opacity-75">/100</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                            <div className="mb-4">
                                <h4 className="text-sm font-semibold text-slate-900 mb-2">Submission Content</h4>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                                        {showHistorySubmission.submission}
                                    </pre>
                                </div>
                            </div>
                            {showHistorySubmission.feedback && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-2">Feedback</h4>
                                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                        <p className="text-sm text-slate-700">{showHistorySubmission.feedback}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowHistorySubmission(null)}
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    setContent(showHistorySubmission.submission)
                                    setIsRevising(true)
                                    setShowHistorySubmission(null)
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Use as Template
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AssignmentSubmission
