import { Button } from "@/components/ui/button";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import DashboardHeader from "./dashboard/_components/DashboardHeader";
import { Sparkles, BookOpen, BrainCircuit, Compass, Target, GraduationCap, ArrowRight, Play } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
      {/* Decorative ambient glowing backdrop blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none animate-float-1" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40vw] h-[40vw] bg-purple-200/20 rounded-full blur-3xl pointer-events-none animate-float-2" />
      <div className="absolute top-[40%] right-[20%] w-[30vw] h-[30vw] bg-pink-100/20 rounded-full blur-3xl pointer-events-none animate-float-3" />

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
            <a href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all hover:scale-[1.02] py-6 px-8 flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-2xl py-6 px-8 flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-slate-700 text-slate-700" /> Watch Demo Video
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
    </div>
  );
}
