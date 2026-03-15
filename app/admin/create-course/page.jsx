"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash2, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useAdminAuth } from '@/app/_context/AdminAuthContext';

const CATEGORIES = ['General', 'Programming', 'Business', 'Design', 'Science', 'Language', 'Mathematics', 'Other'];
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];
const COURSE_TYPES = ['Beginner Guide', 'Complete Course', 'Advanced Course', 'Workshop', 'Tutorial', 'Case Study'];

export default function InstructorCreateCoursePage() {
  const { admin, loading: authLoading } = useAdminAuth();
  const router = useRouter();
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mediaUploadSection, setMediaUploadSection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    advanced: true,
    chapters: true,
    notes: true,
    flashcards: true,
    quizzes: true,
    media: false,
    scheduling: false,
    pricing: false
  });
  const [tagInput, setTagInput] = useState('');

  if (authLoading) {
    return <div className="text-center pt-20"><Loader className="w-8 h-8 animate-spin" /></div>;
  }

  if (!admin) {
    return <div className="text-center pt-20 text-red-600">Unauthorized: Please log in</div>;
  }

  // Only tutors can create complete courses
  if (admin.role !== 'tutor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only tutors can create complete courses.</p>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    // Course Info
    courseType: '',
    topic: '',
    description: '', // NEW: Course description
    difficultyLevel: 'Easy',
    category: 'General',
    tags: [],
    courseSummary: '',
    isPublic: true,
    includeVideos: false,
    videoSuggestions: [], // NEW: Suggested video URLs for students
    
    // Advanced - Scheduling
    publishDate: '', // NEW: When course becomes available
    startDate: '', // NEW: Course start date
    endDate: '', // NEW: Course end date
    
    // Advanced - Pricing & Enrollment
    price: '0', // NEW: Course price (0 = free)
    currency: 'usd', // NEW: Currency
    enrollmentLimit: '', // NEW: Max students (empty = unlimited)
    prerequisites: [], // NEW: Prerequisite courses
    
    // Advanced - Media
    courseImage: '', // NEW: Course cover image
    
    // Advanced - Quiz Types
    quizTypes: ['multiple-choice'], // NEW: Supported quiz types
    
    // Chapters
    chapters: [
      {
        name: 'Chapter 1',
        summary: '',
        emoji: '📚',
        topics: []
      }
    ],
    
    // Notes per chapter
    notes: [''], // One note per chapter
    
    // Flashcards
    flashcards: [
      {
        question: '',
        answer: '',
        difficulty: 'Easy'
      }
    ],
    
    // Quizzes
    quizzes: [
      {
        question: '',
        options: ['', '', '', ''],
        correctOption: 0,
        difficulty: 'Easy',
        type: 'multiple-choice', // NEW: Quiz type
        explanation: '' // NEW: Explanation shown after answer
      }
    ],
    
    // Media files
    mediaFiles: [], // NEW: Uploaded media files
    
    // Video suggestions input
    videoInput: '' // NEW: Temporary input for video URL
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleChapterChange = (index, field, value) => {
    const newChapters = [...formData.chapters];
    newChapters[index][field] = value;
    setFormData(prev => ({
      ...prev,
      chapters: newChapters
    }));
  };

  const handleNoteChange = (index, value) => {
    const newNotes = [...formData.notes];
    newNotes[index] = value;
    setFormData(prev => ({
      ...prev,
      notes: newNotes
    }));
  };

  const handleFlashcardChange = (index, field, value) => {
    const newFlashcards = [...formData.flashcards];
    newFlashcards[index][field] = value;
    setFormData(prev => ({
      ...prev,
      flashcards: newFlashcards
    }));
  };

  const handleQuizChange = (index, field, value) => {
    const newQuizzes = [...formData.quizzes];
    newQuizzes[index][field] = value;
    setFormData(prev => ({
      ...prev,
      quizzes: newQuizzes
    }));
  };

  const toggleQuizType = (type) => {
    setFormData(prev => ({
      ...prev,
      quizTypes: prev.quizTypes.includes(type)
        ? prev.quizTypes.filter(t => t !== type)
        : [...prev.quizTypes, type]
    }));
  };

  const handleMediaFileChange = (e) => {
    const files = Array.from(e.target.files);
    // For demo, just store file names. In production, upload to cloud storage
    const newFiles = files.map(f => ({
      name: f.name,
      type: f.type.startsWith('video/') ? 'video' : 'pdf' ? 'document' : 'document',
      size: f.size,
      file: f
    }));
    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...newFiles]
    }));
  };

  const handleQuizOptionChange = (quizIndex, optionIndex, value) => {
    const newQuizzes = [...formData.quizzes];
    newQuizzes[quizIndex].options[optionIndex] = value;
    setFormData(prev => ({
      ...prev,
      quizzes: newQuizzes
    }));
  };

  const addChapter = () => {
    const newChapter = {
      name: `Chapter ${formData.chapters.length + 1}`,
      summary: '',
      emoji: '📚',
      topics: []
    };
    setFormData(prev => ({
      ...prev,
      chapters: [...prev.chapters, newChapter],
      notes: [...prev.notes, ''] // Add empty note for new chapter
    }));
  };

  const removeChapter = (index) => {
    if (formData.chapters.length === 1) {
      toast.error("You must have at least one chapter");
      return;
    }
    const newChapters = formData.chapters.filter((_, i) => i !== index);
    const newNotes = formData.notes.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      chapters: newChapters,
      notes: newNotes
    }));
  };

  const addFlashcard = () => {
    setFormData(prev => ({
      ...prev,
      flashcards: [...prev.flashcards, {
        question: '',
        answer: '',
        difficulty: 'Easy'
      }]
    }));
  };

  const removeFlashcard = (index) => {
    setFormData(prev => ({
      ...prev,
      flashcards: prev.flashcards.filter((_, i) => i !== index)
    }));
  };

  const addQuiz = () => {
    setFormData(prev => ({
      ...prev,
      quizzes: [...prev.quizzes, {
        question: '',
        options: ['', '', '', ''],
        correctOption: 0,
        difficulty: 'Easy',
        explanation: ''
      }]
    }));
  };

  const removeQuiz = (index) => {
    setFormData(prev => ({
      ...prev,
      quizzes: prev.quizzes.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const addVideoSuggestion = () => {
    const url = formData.videoInput.trim();
    if (url && !formData.videoSuggestions.includes(url)) {
      setFormData(prev => ({
        ...prev,
        videoSuggestions: [...prev.videoSuggestions, url],
        videoInput: ''
      }));
    }
  };

  const removeVideoSuggestion = (index) => {
    setFormData(prev => ({
      ...prev,
      videoSuggestions: prev.videoSuggestions.filter((_, i) => i !== index)
    }));
  };

  // Media file handling
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const getFileType = (file) => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'application/pdf') return 'pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'document';
  };

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 100MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      for (const file of validFiles) {
        const formDataToUpload = new FormData();
        formDataToUpload.append('file', file);
        formDataToUpload.append('courseId', 'temp-course'); // Will be updated on creation
        formDataToUpload.append('fileType', getFileType(file));

        // For demo: store file locally instead of uploading
        // In production, upload to cloud: await axios.post('/api/admin/media/upload', formDataToUpload)
        const fileObj = {
          id: uuidv4(),
          name: file.name,
          type: getFileType(file),
          size: file.size,
          file: file,
          uploadedAt: new Date().toLocaleString()
        };

        setFormData(prev => ({
          ...prev,
          mediaFiles: [...prev.mediaFiles, fileObj]
        }));

        toast.success(`"${file.name}" added to course`);
      }
    } catch (error) {
      console.error('Error handling files:', error);
      toast.error('Failed to add files');
    } finally {
      setUploadingFiles(false);
      setDragActive(false);
    }
  };

  const handleDropZone = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const removeMediaFile = (fileId) => {
    setFormData(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter(f => f.id !== fileId)
    }));
    toast.success('File removed');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes, k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.courseType || !formData.topic || !formData.courseSummary) {
      toast.error("Please fill in Course Type, Topic, and Summary");
      return;
    }

    if (formData.chapters.some(ch => !ch.name || !ch.summary)) {
      toast.error("All chapters must have a name and summary");
      return;
    }

    setLoading(true);
    try {
      const courseId = uuidv4();
      
      const courseLayout = {
        summary: formData.courseSummary,
        chapters: formData.chapters.map((ch, index) => ({
          chapterNumber: index + 1,
          chapterName: ch.name,
          chapterSummary: ch.summary,
          chapterEmoji: ch.emoji,
          topics: ch.topics.filter(t => t.trim()).map(topic => ({
            name: topic,
            emoji: '📖'
          }))
        }))
      };

      const payload = {
        courseId,
        courseType: formData.courseType,
        topic: formData.topic,
        description: formData.description, // NEW
        difficultyLevel: formData.difficultyLevel,
        createdBy: admin.email,
        courseLayout,
        category: formData.category,
        tags: formData.tags,
        isPublic: formData.isPublic,
        includeVideos: formData.includeVideos,
        // Advanced features
        publishDate: formData.publishDate || null, // NEW
        startDate: formData.startDate || null, // NEW
        endDate: formData.endDate || null, // NEW
        price: parseFloat(formData.price) || 0, // NEW
        currency: formData.currency, // NEW
        enrollmentLimit: formData.enrollmentLimit ? parseInt(formData.enrollmentLimit) : null, // NEW
        prerequisites: formData.prerequisites, // NEW
        courseImage: formData.courseImage, // NEW (URL)
        quizTypes: formData.quizTypes, // NEW
        videoSuggestions: formData.videoSuggestions // NEW: Video suggestions for students
      };

      // Add optional content
      if (formData.notes.some(n => n.trim())) {
        payload.notes = formData.notes;
      }
      if (formData.flashcards.some(fc => fc.question.trim())) {
        payload.flashcards = formData.flashcards.filter(fc => fc.question.trim());
      }
      if (formData.quizzes.some(q => q.question.trim())) {
        payload.quizzes = formData.quizzes.filter(q => q.question.trim());
      }

      const response = await axios.post('/api/admin/create-complete-course', payload);

      if (response.data.result) {
        const newCourseId = response.data.result.courseId;

        // Upload media files if any
        if (formData.mediaFiles && formData.mediaFiles.length > 0) {
          toast.loading('Uploading media files...');
          for (const mediaFile of formData.mediaFiles) {
            try {
              const uploadFormData = new FormData();
              uploadFormData.append('file', mediaFile.file);
              uploadFormData.append('courseId', newCourseId);
              uploadFormData.append('fileType', mediaFile.type);

              await axios.post('/api/admin/media/upload', uploadFormData);
            } catch (error) {
              console.error(`Error uploading ${mediaFile.name}:`, error);
              // Don't fail the entire course creation if one file fails
            }
          }
        }

        toast.success("Complete course created successfully!");
        setTimeout(() => router.push('/admin/courses'), 1500);
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(error.response?.data?.error || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  const SectionHeader = ({ title, section }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-colors rounded-lg mb-3"
    >
      <h2 className="text-lg font-bold text-primary">{title}</h2>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-primary" />
      ) : (
        <ChevronDown className="w-5 h-5 text-primary" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Create Complete Course</h1>
          <p className="text-gray-600">Add a comprehensive course with all chapters, notes, flashcards, and quizzes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* BASIC INFORMATION SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SectionHeader title="📚 Basic Information" section="basic" />
            
            {expandedSections.basic && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Type *</label>
                    <select
                      required
                      value={formData.courseType}
                      onChange={(e) => handleInputChange('courseType', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select Course Type</option>
                      {COURSE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Topic *</label>
                    <input
                      required
                      type="text"
                      value={formData.topic}
                      onChange={(e) => handleInputChange('topic', e.target.value)}
                      placeholder="e.g., Advanced React.js"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Difficulty Level</label>
                    <select
                      value={formData.difficultyLevel}
                      onChange={(e) => handleInputChange('difficultyLevel', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {DIFFICULTY_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Course Summary *</label>
                  <textarea
                    required
                    value={formData.courseSummary}
                    onChange={(e) => handleInputChange('courseSummary', e.target.value)}
                    placeholder="Describe the overall course content and learning outcomes"
                    rows="3"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tags..."
                      className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Button type="button" onClick={addTag} className="px-4">Add Tag</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <div key={index} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(index)}
                          className="hover:text-primary/70"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 pt-4 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => handleInputChange('isPublic', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Make this course public</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeVideos}
                      onChange={(e) => handleInputChange('includeVideos', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium">Include video suggestions</span>
                  </label>

                  {/* Video Suggestions Input - Shows when includeVideos is checked */}
                  {formData.includeVideos && (
                    <div className="mt-3 ml-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-2">📺 Video Suggestions</p>
                      <p className="text-xs text-blue-700 mb-3">Add helpful video URLs (YouTube, etc) for students to reference</p>
                      
                      <div className="flex gap-2 mb-3">
                        <input
                          type="url"
                          value={formData.videoInput}
                          onChange={(e) => handleInputChange('videoInput', e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addVideoSuggestion()}
                          placeholder="Paste video URL here (https://youtube.com/...)"
                          className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={addVideoSuggestion}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition font-medium text-sm"
                        >
                          Add
                        </button>
                      </div>

                      {/* Display added videos */}
                      {formData.videoSuggestions.length > 0 && (
                        <div className="space-y-2">
                          {formData.videoSuggestions.map((video, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white border border-blue-200 rounded">
                              <span className="text-sm text-blue-900 break-all">{video}</span>
                              <button
                                type="button"
                                onClick={() => removeVideoSuggestion(index)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {formData.videoSuggestions.length === 0 && (
                        <p className="text-xs text-blue-600 italic">No videos added yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ADVANCED SETTINGS SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SectionHeader title="⚙️ Advanced Settings" section="advanced" />
            
            {expandedSections.advanced && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Course Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed course description..."
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-24"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Course Cover Image URL</label>
                  <input
                    type="url"
                    value={formData.courseImage}
                    onChange={(e) => handleInputChange('courseImage', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {formData.courseImage && (
                    <img src={formData.courseImage} alt="Course cover" className="mt-3 max-h-40 rounded-lg" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SCHEDULING SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SectionHeader title="📅 Course Scheduling" section="scheduling" />
            
            {expandedSections.scheduling && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Publish Date</label>
                    <input
                      type="datetime-local"
                      value={formData.publishDate}
                      onChange={(e) => handleInputChange('publishDate', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Course Start Date</label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Course End Date</label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PRICING & ENROLLMENT SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SectionHeader title="💰 Pricing & Enrollment" section="pricing" />
            
            {expandedSections.pricing && (
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Course Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00 for free"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="usd">USD ($)</option>
                      <option value="eur">EUR (€)</option>
                      <option value="gbp">GBP (£)</option>
                      <option value="lkr">LKR (Rs.)</option>
                      <option value="inr">INR (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Enrollment Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.enrollmentLimit}
                      onChange={(e) => handleInputChange('enrollmentLimit', e.target.value)}
                      placeholder="Leave empty for unlimited"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MEDIA UPLOAD SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              type="button"
              onClick={() => setMediaUploadSection(!mediaUploadSection)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-colors rounded-lg"
            >
              <h2 className="text-lg font-bold text-primary">🎬 Rich Media (Videos, PDFs, Images)</h2>
              {mediaUploadSection ? (
                <ChevronUp className="w-5 h-5 text-primary" />
              ) : (
                <ChevronDown className="w-5 h-5 text-primary" />
              )}
            </button>

            {mediaUploadSection && (
              <div className="space-y-4 mt-4">
                {/* Drag & Drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDropZone}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-primary'
                  }`}
                >
                  <input
                    type="file"
                    id="media-upload"
                    multiple
                    onChange={handleFileInput}
                    accept="video/*,.pdf,image/*,.doc,.docx,.ppt,.pptx"
                    className="hidden"
                    disabled={uploadingFiles}
                  />
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <div className="text-4xl mb-3">📁</div>
                    <p className="text-lg font-semibold text-gray-900">Drag & drop files here</p>
                    <p className="text-sm text-gray-600 mt-1">or click to select files</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported: Videos (MP4, WebM), PDFs, Images (JPG, PNG), Documents (DOC, PPTX) • Max 100MB per file
                    </p>
                  </label>
                </div>

                {/* File List */}
                {formData.mediaFiles && formData.mediaFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700">
                      📎 Uploaded Files ({formData.mediaFiles.length})
                    </p>
                    <div className="space-y-2">
                      {formData.mediaFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-2xl">
                              {file.type === 'video' && '🎥'}
                              {file.type === 'pdf' && '📄'}
                              {file.type === 'image' && '🖼️'}
                              {file.type === 'document' && '📋'}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)} • {file.type.charAt(0).toUpperCase() + file.type.slice(1)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeMediaFile(file.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>💡 Pro Tip:</strong> Upload all media for your course chapters here. In production, files are uploaded to cloud storage (S3/Google Cloud). Demo stores files locally.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* QUIZ TYPES SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SectionHeader title="❓ Quiz Types" section="media" />
            
            {expandedSections.media && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-3">Select which quiz question types this course will include:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { value: 'multiple-choice', label: 'Multiple Choice (MCQ)' },
                    { value: 'true-false', label: 'True/False' },
                    { value: 'short-answer', label: 'Short Answer' },
                    { value: 'matching', label: 'Matching Questions' },
                    { value: 'fill-blank', label: 'Fill the Blank' },
                    { value: 'essay', label: 'Essay Questions' }
                  ].map(type => (
                    <label key={type.value} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-primary/5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.quizTypes.includes(type.value)}
                        onChange={() => toggleQuizType(type.value)}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => toggleSection('chapters')}
                className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-colors rounded-lg"
              >
                <h2 className="text-lg font-bold text-primary">📖 Chapters</h2>
                {expandedSections.chapters ? (
                  <ChevronUp className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary" />
                )}
              </button>
              {expandedSections.chapters && (
                <Button
                  type="button"
                  onClick={addChapter}
                  variant="outline"
                  className="ml-3 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Chapter
                </Button>
              )}
            </div>

            {expandedSections.chapters && (
              <div className="space-y-6">
                {formData.chapters.map((chapter, chIdx) => (
                  <div key={chIdx} className="border rounded-lg p-4 space-y-3 relative">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">Chapter {chIdx + 1}</h3>
                      {formData.chapters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeChapter(chIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Chapter Name *</label>
                        <input
                          required
                          type="text"
                          value={chapter.name}
                          onChange={(e) => handleChapterChange(chIdx, 'name', e.target.value)}
                          placeholder="e.g., Introduction to React"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Chapter Emoji</label>
                        <input
                          type="text"
                          value={chapter.emoji}
                          onChange={(e) => handleChapterChange(chIdx, 'emoji', e.target.value)}
                          maxLength="2"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Chapter Summary *</label>
                      <textarea
                        required
                        value={chapter.summary}
                        onChange={(e) => handleChapterChange(chIdx, 'summary', e.target.value)}
                        placeholder="Describe the chapter content"
                        rows="2"
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CHAPTER NOTES SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <SectionHeader title="📝 Chapter Notes" section="notes" />
            
            {expandedSections.notes && (
              <div className="space-y-4">
                {formData.notes.map((note, idx) => (
                  <div key={idx}>
                    <label className="block text-sm font-medium mb-2">
                      {formData.chapters[idx]?.name || `Chapter ${idx + 1}`} Notes
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => handleNoteChange(idx, e.target.value)}
                      placeholder="Add chapter notes (HTML or plain text)"
                      rows="4"
                      className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FLASHCARDS SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => toggleSection('flashcards')}
                className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-colors rounded-lg"
              >
                <h2 className="text-lg font-bold text-primary">💳 Flashcards</h2>
                {expandedSections.flashcards ? (
                  <ChevronUp className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary" />
                )}
              </button>
              {expandedSections.flashcards && (
                <Button
                  type="button"
                  onClick={addFlashcard}
                  variant="outline"
                  className="ml-3 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Flashcard
                </Button>
              )}
            </div>

            {expandedSections.flashcards && (
              <div className="space-y-4">
                {formData.flashcards.map((card, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">Flashcard {idx + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeFlashcard(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Question</label>
                      <input
                        type="text"
                        value={card.question}
                        onChange={(e) => handleFlashcardChange(idx, 'question', e.target.value)}
                        placeholder="Question or term"
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Answer</label>
                      <textarea
                        value={card.answer}
                        onChange={(e) => handleFlashcardChange(idx, 'answer', e.target.value)}
                        placeholder="Answer or definition"
                        rows="2"
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Difficulty</label>
                      <select
                        value={card.difficulty}
                        onChange={(e) => handleFlashcardChange(idx, 'difficulty', e.target.value)}
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUIZZES SECTION */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-3">
              <button
                type="button"
                onClick={() => toggleSection('quizzes')}
                className="flex-1 flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-colors rounded-lg"
              >
                <h2 className="text-lg font-bold text-primary">❓ Quizzes</h2>
                {expandedSections.quizzes ? (
                  <ChevronUp className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-primary" />
                )}
              </button>
              {expandedSections.quizzes && (
                <Button
                  type="button"
                  onClick={addQuiz}
                  variant="outline"
                  className="ml-3 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Quiz
                </Button>
              )}
            </div>

            {expandedSections.quizzes && (
              <div className="space-y-4">
                {formData.quizzes.map((quiz, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">Question {idx + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeQuiz(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Question Type</label>
                        <select
                          value={quiz.type || 'multiple-choice'}
                          onChange={(e) => handleQuizChange(idx, 'type', e.target.value)}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="multiple-choice">Multiple Choice</option>
                          <option value="true-false">True/False</option>
                          <option value="short-answer">Short Answer</option>
                          <option value="matching">Matching</option>
                          <option value="fill-blank">Fill the Blank</option>
                          <option value="essay">Essay</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <select
                          value={quiz.difficulty}
                          onChange={(e) => handleQuizChange(idx, 'difficulty', e.target.value)}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Question</label>
                      <textarea
                        value={quiz.question}
                        onChange={(e) => handleQuizChange(idx, 'question', e.target.value)}
                        placeholder="Enter the quiz question"
                        rows="2"
                        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {['multiple-choice', 'true-false', 'matching'].includes(quiz.type || 'multiple-choice') && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">
                          {quiz.type === 'true-false' ? 'Answer' : 'Options'}
                        </label>
                        {quiz.type === 'true-false' ? (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`correct-${idx}`}
                                checked={quiz.correctOption === 0}
                                onChange={() => handleQuizChange(idx, 'correctOption', 0)}
                                className="w-4 h-4"
                              />
                              <span>True</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name={`correct-${idx}`}
                                checked={quiz.correctOption === 1}
                                onChange={() => handleQuizChange(idx, 'correctOption', 1)}
                                className="w-4 h-4"
                              />
                              <span>False</span>
                            </label>
                          </div>
                        ) : (
                          quiz.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex gap-2">
                              <input
                                type="radio"
                                name={`correct-${idx}`}
                                checked={quiz.correctOption === optIdx}
                                onChange={() => handleQuizChange(idx, 'correctOption', optIdx)}
                                className="w-4 h-4 mt-2"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleQuizOptionChange(idx, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {['short-answer', 'fill-blank'].includes(quiz.type) && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Correct Answer(s)</label>
                        <textarea
                          value={quiz.options[0] || ''}
                          onChange={(e) => handleQuizOptionChange(idx, 0, e.target.value)}
                          placeholder="Enter the correct answer (for multiple answers, separate by |)"
                          rows="2"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}

                    {/* EXPLANATION FIELD - Shows after student answers */}
                    <div className="border-t pt-3 mt-3 bg-blue-50 p-3 rounded-lg">
                      <label className="block text-sm font-medium mb-2 text-blue-900">
                        💡 Explanation (Shown when student submits answer)
                      </label>
                      <textarea
                        value={quiz.explanation || ''}
                        onChange={(e) => handleQuizChange(idx, 'explanation', e.target.value)}
                        placeholder="Explain why this answer is correct, or provide learning context for students..."
                        rows="3"
                        className="w-full p-3 border border-blue-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-blue-700 mt-2">
                        ✓ This explanation helps students learn from their mistakes
                      </p>
                    </div>

                    {quiz.type === 'essay' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Model Answer</label>
                        <textarea
                          value={quiz.options[0] || ''}
                          onChange={(e) => handleQuizOptionChange(idx, 0, e.target.value)}
                          placeholder="Provide a model answer for marking guide"
                          rows="3"
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 py-3"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating Course...
                </>
              ) : (
                'Create Complete Course'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="px-6 py-3"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
