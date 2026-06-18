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
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

function TopicInput({ setTopic, setDifficultyLevel, topicValue, difficultyValue }) {
    const [inputValue, setInputValue] = useState(topicValue || '');
    const [parsing, setParsing] = useState(false);
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState('');
    const [extractedCharCount, setExtractedCharCount] = useState(0);
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef(null);

    // Sync input value with topicValue from parent if it changes
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
            if (window.pdfjsLib) {
                resolve(window.pdfjsLib);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
            script.async = true;
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = () => {
                reject(new Error('Failed to load PDF parsing helper. Please check your network connection.'));
            };
            document.body.appendChild(script);
        });
    };

    const extractTextFromPdf = async (file) => {
        const pdfjs = await loadPdfjs();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return fullText.trim();
    };

    const handleFileChange = async (file) => {
        if (!file) return;
        
        const extension = file.name.split('.').pop().toLowerCase();
        if (!['txt', 'md', 'pdf'].includes(extension)) {
            toast.error('Unsupported file format. Please upload a .txt, .md, or .pdf file.');
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
                    reader.onerror = () => reject(new Error('Error reading text file'));
                    reader.readAsText(file);
                });
            }

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error('This document contains no extractable text. Scanned images/PDFs are not supported.');
            }

            const maxLength = 80000;
            let finalSelection = extractedText;
            if (extractedText.length > maxLength) {
                finalSelection = extractedText.substring(0, maxLength);
                toast.warning(`File is very large. Truncated to first ${maxLength} characters.`);
            }

            setExtractedCharCount(finalSelection.length);
            setInputValue(finalSelection);
            setTopic(finalSelection);
            toast.success('Document uploaded and parsed successfully!');
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

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = () => {
        setIsDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileChange(file);
        }
    };

    const handleClearFile = () => {
        setFileName('');
        setFileSize('');
        setExtractedCharCount(0);
        setInputValue('');
        setTopic('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast.info('File attachment cleared.');
    };

    return (
        <div className='mt-10 w-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-300'>
            <div className="flex flex-col gap-2">
                <h2 className="font-bold text-xl text-slate-800">1. Tell us what you want to study</h2>
                <p className="text-sm text-slate-500">Enter a topic, paste a raw syllabus, or upload your textbook/lecture documents (.pdf, .txt, .md).</p>
            </div>

            {/* Drag & Drop File Ingest Component */}
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !parsing && fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-2xl p-8 transition-all duration-300 cursor-pointer
                    flex flex-col items-center justify-center text-center gap-3 relative overflow-hidden group
                    ${isDragActive 
                        ? 'border-indigo-500 bg-indigo-50/30' 
                        : fileName 
                            ? 'border-emerald-300 bg-emerald-50/10 hover:border-emerald-400' 
                            : 'border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/10'
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
                    <div className="flex flex-col items-center gap-2 py-4">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                        <p className="font-semibold text-slate-800 text-sm">Parsing document contents...</p>
                        <p className="text-xs text-slate-400">This happens completely in your browser for security.</p>
                    </div>
                ) : fileName ? (
                    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <FileText className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <p className="font-bold text-slate-800 text-sm truncate max-w-[250px]">{fileName}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{fileSize} • {extractedCharCount.toLocaleString()} characters</p>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClearFile();
                            }}
                            className="absolute top-3 right-3 h-8 w-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center shadow-sm hover:shadow transition-all duration-200"
                            title="Remove file"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5 mt-1 bg-emerald-100/40 text-emerald-700 font-bold text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Ready to study</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors duration-200">
                            <Upload className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col leading-snug">
                            <p className="font-bold text-slate-700 text-sm">Click to upload or drag & drop</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, TXT, or MD up to 10MB</p>
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Content / Topic Outline</span>
                    {inputValue.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">{inputValue.length.toLocaleString()} chars</span>
                    )}
                </div>
                <Textarea 
                    placeholder="Describe your course topic in detail here, or edit the parsed text from the document above..." 
                    className="min-h-[140px] rounded-xl border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-slate-800 leading-relaxed p-4" 
                    value={inputValue}
                    onChange={(event) => {
                        setInputValue(event.target.value);
                        setTopic(event.target.value);
                    }} 
                />
            </div>

            <div className="flex flex-col gap-2">
                <h2 className="font-bold text-lg text-slate-800">2. Select the Difficulty Level</h2>
                <Select 
                    defaultValue={difficultyValue || undefined}
                    onValueChange={(value) => setDifficultyLevel(value)}
                >
                    <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm text-slate-700">
                        <SelectValue placeholder="Select Difficulty Level" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="Easy" className="rounded-lg">Easy (Introduction & basics)</SelectItem>
                        <SelectItem value="Moderate" className="rounded-lg">Moderate (In-depth overview)</SelectItem>
                        <SelectItem value="Hard" className="rounded-lg">Hard (Expert & advanced details)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}

export default TopicInput