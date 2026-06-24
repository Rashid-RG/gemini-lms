import { Button } from "@/components/ui/button";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import DashboardHeader from "./dashboard/_components/DashboardHeader";
import { Sparkles, BookOpen, BrainCircuit, Compass, Target, GraduationCap, ArrowRight, Play, ShieldCheck, Mail, Github } from "lucide-react";
import TrailerBackground from "./_components/TrailerBackground";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
      <TrailerBackground />

      <DashboardHeader />

      <section className="relative z-10 pt-16 pb-20 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge Alert */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 shadow-sm animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-indigo-700 tracking-wide uppercase">All-New LMS Version 3.0</span>
          </div>

          {/* Absolute Background Floating Icons (Desktop only) */}
          <div className="hidden lg:block absolute left-12 top-48 rotate-12 transition-transform hover:scale-110 duration-300">
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100">
              <Image src="/knowledge.png" alt="knowledge" width={56} height={56} />
            </div>
          </div>
          <div className="hidden lg:block absolute right-12 top-48 -rotate-12 transition-transform hover:scale-110 duration-300">
            <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100">
              <Image src="/code.png" alt="code" width={56} height={56} />
            </div>
          </div>

          {/* Main Title Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
            AI-Powered <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">Exam Prep</span><br />
            Material Generator
          </h1>

          {/* Subtitle Description */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
            Your premium AI exam companion. Generate structured notes, quiz questions, interactive flashcards, and grading assessments instantly.
          </p>

          {/* Call-to-actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a href="/dashboard" className="w-full sm:w-auto relative z-20">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all hover:scale-[1.02] py-6 px-8 flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
            <a href="/trailer" className="w-full sm:w-auto relative z-20">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl py-6 px-8 flex items-center justify-center gap-2 backdrop-blur-md bg-white/50">
                <Play className="w-4 h-4 fill-slate-700 text-slate-700" /> Watch Trailer
              </Button>
            </a>
          </div>
        </div>

        {/* Features Card Section */}
        <div className="max-w-6xl mx-auto mt-28">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight mb-12">
            Why Choose Gemini LMS?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">AI-Generated Content</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Powered by Google Gemini AI to assemble, summarize, and customize study guides tailored to your exact topics.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <BookOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Smart Notes</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Read organized, comprehensive chapter notes with clean typographic outlines, code styling, and key takeaways.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <Compass className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Flashcards</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Flip card decks dynamically to lock in terminologies, revision details, and fundamental concepts.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center">
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Quizzes & Tests</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Validate your knowledge retention using interactive AI graded quizzes and time-bound Mock Exams.
              </p>
            </div>
          </div>
        </div>

        {/* Process Flow timeline */}
        <div className="max-w-5xl mx-auto mt-32 mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 text-center tracking-tight mb-16">
            How It Works
          </h2>

          <div className="relative">
            {/* Dashed Connector Line */}
            <div className="hidden md:block absolute top-7 left-[10%] right-[10%] h-0.5 border-t-2 border-dashed border-indigo-100 z-0" />

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-extrabold text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 scale-100 hover:scale-105 transition-transform duration-200">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-800">Choose Your Topic</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                  Type any study subject or category. Customize parameters including difficulty and study categories.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-extrabold text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 scale-100 hover:scale-105 transition-transform duration-200">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-800">AI Generates Content</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                  Google Gemini builds organized syllabus indexes, chapter layouts, questions, and revision summaries.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-extrabold text-lg rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 scale-100 hover:scale-105 transition-transform duration-200">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-800">Start Learning</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                  Read, take timed tests, write code in the playground, and review details securely across desktop or mobile.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200/70 bg-gradient-to-b from-white/40 to-slate-100/80 backdrop-blur-md pt-16 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Column 1: Brand Info */}
            <div className="space-y-4 col-span-1 md:col-span-1">
              <div className="flex gap-2 items-center">
                <Image src="/logo.svg" alt="logo" width={32} height={32} />
                <h2 className="font-black text-xl tracking-tight text-slate-800">GEMINI LMS</h2>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Elevate your learning with Google Gemini AI. Instantly generate professional exam preparation guides, custom notes, interactive flashcards, and automated grading assessments.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a href="mailto:mohammedrashid0012@hotmail.com" className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl transition-all hover:scale-105 duration-200" title="Email Support">
                  <Mail className="w-4 h-4" />
                </a>
                <a href="https://github.com/Rashid-RG/gemini-lms" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl transition-all hover:scale-105 duration-200" title="GitHub Repository">
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Platform</h4>
              <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
                <li>
                  <a href="/dashboard" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Student Dashboard</span>
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/dashboard/explore" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Explore Courses</span>
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/dashboard/playground" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Code Playground</span>
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
                <li>
                  <a href="/trailer" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Product Trailer</span>
                    <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal & Safety */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Legal & Policies</h4>
              <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
                <li>
                  <a href="/terms" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Terms & Conditions</span>
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Privacy Policy</span>
                  </a>
                </li>
                <li>
                  <a href="/refund" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Refund Policy</span>
                  </a>
                </li>
                <li>
                  <a href="/dashboard/legal" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>System Policies</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Help & Support */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Support & Info</h4>
              <ul className="space-y-2.5 text-sm font-semibold text-slate-600">
                <li>
                  <a href="/dashboard/support" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>Help & Support</span>
                  </a>
                </li>
                <li>
                  <a href="/dashboard/guide" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 group">
                    <span>How to Use Guide</span>
                  </a>
                </li>
                <li>
                  <span className="text-xs bg-indigo-50 border border-indigo-100/70 text-indigo-700 px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Built Securely
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 font-medium text-center md:text-left">
              &copy; {new Date().getFullYear()} Gemini LMS. Owned and operated by M.S.F. Sajeefa. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
              <span>Made with</span>
              <span className="text-rose-500 animate-pulse">❤️</span>
              <span>for modern students</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
