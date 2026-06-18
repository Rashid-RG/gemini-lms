"use client"
import { Textarea } from '@/components/ui/textarea'
import React, { useState, useEffect, useRef } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, X, Loader2, CheckCircle2, Sparkles, PenLine } from 'lucide-react'
import { toast } from 'sonner'

function TopicInput({ setTopic, setDifficultyLevel, topicValue, difficultyValue }) {
    const [inputValue, setInputValue] = useState(topicValue || '');
    const [parsing, setParsing] = useState(false);
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState('');
    const [extractedCharCount, setExtractedCharCount] = useState(0);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (topicValue !== undefined && topicValue !== inputValue) {
            setInputValue(topicValue);
            if (topicValue === '') {
                setFileName('');
                setFileSize('');
                setExtractedCharCount(0);
            }
        }
    }, [topicValue]);

    const loadPdfjs = () => {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.async = true;
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = () => reject(new Error('Failed to load PDF helper. Check your connection.'));
            document.body.appendChild(script);
        });
    };

    const extractTextFromPdf = async (file) => {
        const pdfjs = await loadPdfjs();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(' ') + '\n';
        }
        return fullText.trim();
    };

    const handleFileChange = async (file) => {
        if (!file) return;
        const extension = file.name.split('.').pop().toLowerCase();
        if (!['txt', 'md', 'pdf'].includes(extension)) {
            toast.error('Unsupported format. Please upload a .pdf, .txt, or .md file.');
            return;
        }
        setParsing(true);
        setFileName(file.name);
        setFileSize((file.size / 1024).toFixed(1) + ' KB');
        try {
            let extractedText = '';
            if (extension === 'pdf') {
                extractedText = await extractTextFromPdf(file);
            } else {
                extractedText = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = () => reject(new Error('Error reading file'));
                    reader.readAsText(file);
                });
            }
            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('No extractable text found. Scanned/image PDFs are not supported.');
            }
            const maxLength = 80000;
            let finalText = extractedText;
            if (extractedText.length > maxLength) {
                finalText = extractedText.substring(0, maxLength);
                toast.warning(`File is large — truncated to first ${maxLength} characters.`);
            }
            setExtractedCharCount(finalText.length);
            setInputValue(finalText);
            setTopic(finalText);
            toast.success('✅ Document parsed! Review the content below.');
        } catch (err) {
            console.error('File parsing error:', err);
            toast.error(err.message || 'Failed to extract text from document.');
            setFileName('');
            setFileSize('');
            setExtractedCharCount(0);
        } finally {
            setParsing(false);
        }
    };

    const handleClearFile = () => {
        setFileName('');
        setFileSize('');
        setExtractedCharCount(0);
        setInputValue('');
        setTopic('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.info('File removed.');
    };

    return (
        <div className='mt-8 w-full flex flex-col gap-7 animate-in fade-in slide-in-from-bottom-3 duration-300'>

            {/* Section Header */}
            <div className="flex flex-col gap-1">
                <h2 className="font-bold text-xl text-slate-800">📚 What do you want to study?</h2>
                <p className="text-sm text-slate-500">
                    Type your topic directly — or upload a document to auto-fill it for you.
                </p>
            </div>

            {/* ── Topic Text Input (FIRST - Required) ── */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <PenLine className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">Your Topic / Course Content</span>
                    {!fileName && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Required</span>
                    )}
                </div>
                <Textarea
                    placeholder="e.g. Python programming basics, Data Structures and Algorithms, Business Marketing strategies..."
                    className="min-h-[130px] rounded-xl border-slate-200 bg-white shadow-sm focus:border-indigo-400 focus:ring-indigo-400 text-slate-800 leading-relaxed p-4 text-sm resize-none transition-all"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setTopic(e.target.value);
                        // Clear file association if user types manually
                        if (fileName && e.target.value !== inputValue) {
                            setFileName('');
                            setFileSize('');
                            setExtractedCharCount(0);
                        }
                    }}
                />
                {inputValue.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>{inputValue.length.toLocaleString()} characters · AI will use this to build your course</span>
                    </div>
                )}
            </div>

            {/* ── OR Divider ── */}
            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">or upload a document</span>
                <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* ── OPTIONAL Upload Zone (BELOW) ── */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">Upload Document</span>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-wide">Optional</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">Upload a PDF, TXT, or MD file and we'll auto-fill the topic box above.</p>

                {/* Drop Zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragActive(false); handleFileChange(e.dataTransfer.files?.[0]); }}
                    onClick={() => !parsing && fileInputRef.current?.click()}
                    className={`
                        border-2 border-dashed rounded-2xl p-5 transition-all duration-200 cursor-pointer
                        flex flex-col items-center justify-center text-center gap-3 relative group
                        ${isDragActive
                            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                            : fileName
                                ? 'border-emerald-400 bg-emerald-50/40 hover:border-emerald-500'
                                : 'border-slate-200 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/20'
                        }
                    `}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={(e) => handleFileChange(e.target.files?.[0])}
                        accept=".pdf,.txt,.md"
                        className="hidden"
                        disabled={parsing}
                    />

                    {parsing ? (
                        <div className="flex flex-col items-center gap-2 py-1">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="font-semibold text-slate-700 text-sm">Parsing document...</p>
                            <p className="text-xs text-slate-400">Happening securely in your browser</p>
                        </div>
                    ) : fileName ? (
                        <div className="flex flex-col items-center gap-2 w-full">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm truncate max-w-[260px]">{fileName}</p>
                                <p className="text-[11px] text-slate-500">{fileSize} · {extractedCharCount.toLocaleString()} characters extracted</p>
                            </div>
                            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold px-3 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Content auto-filled above ↑</span>
                            </div>
                            {/* Clear button */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleClearFile(); }}
                                className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-300 flex items-center justify-center shadow-sm transition-all"
                                title="Remove file"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 w-full px-2">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all shadow-sm">
                                <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-slate-600 text-sm">Click to upload or drag & drop</p>
                                <p className="text-xs text-slate-400 mt-0.5">PDF · TXT · MD &nbsp;(up to 10MB) — content fills above automatically</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Difficulty Level ── */}
            <div className="flex flex-col gap-2">
                <h2 className="font-bold text-base text-slate-800">🎯 Select Difficulty Level</h2>
                <Select
                    defaultValue={difficultyValue || undefined}
                    onValueChange={(value) => setDifficultyLevel(value)}
                >
                    <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm text-slate-700 hover:border-indigo-300 transition-colors">
                        <SelectValue placeholder="Choose a difficulty level..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                        <SelectItem value="Easy" className="rounded-lg">🟢 Easy — Introduction & basics</SelectItem>
                        <SelectItem value="Moderate" className="rounded-lg">🟡 Moderate — In-depth overview</SelectItem>
                        <SelectItem value="Hard" className="rounded-lg">🔴 Hard — Expert & advanced details</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}

export default TopicInput