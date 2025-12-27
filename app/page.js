import { Button } from "@/components/ui/button";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import DashboardHeader from "./dashboard/_components/DashboardHeader";

export default function Home() {
  return (
   <div>
      <DashboardHeader/>
      <section className=" z-50 pt-10">
  <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12">
      <a href="#" className="inline-flex justify-between items-center py-1 px-1 pr-4 mb-7 text-sm text-gray-700 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700" role="alert">
          <span className="text-xs bg-primary rounded-full text-white px-4 py-1.5 mr-3">New</span> <span className="text-sm font-medium">Geminilms.com All new courese</span> 
          <svg className="ml-2 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path></svg>
      </a>
      <Image src={'/knowledge.png'} alt="image" 
      width={80} height={80} className="hidden lg:block absolute -rotate-12 left-10 top-32"/>
      <Image src={'/code.png'} alt="image" 
      width={80} height={80} className="hidden lg:block absolute rotate-12 right-10 top-32"/>
      <h1 className="mb-4 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white">
      AI-Powered <span className='text-primary'>Exam Prep </span><br></br> Material Generator  </h1>
      <p className="mb-8 text-lg font-normal text-gray-500 lg:text-xl sm:px-16 xl:px-48 dark:text-gray-400">Your AI Exam Prep Companion: Effortless Study Material at Your Fingertips</p>
     
      <div className="flex flex-col mb-8 lg:mb-16 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
          <a href="/dashboard" className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-primary hover:bg-primary focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-900">
              Get Started
              <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </a>
          <a href="https://youtube.com" className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700 dark:focus:ring-gray-800">
              <svg className="mr-2 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path></svg>
              Watch video
          </a>  
      </div>
     
      {/* Features Section */}
      <div className="px-4 mx-auto max-w-screen-xl mt-8">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Why Choose Gemini LMS?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow dark:bg-gray-800">
                  <div className="p-3 bg-primary/10 rounded-full mb-4">
                      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">AI-Generated Content</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Powered by Google Gemini AI to create personalized study materials instantly</p>
              </div>
              
              {/* Feature 2 */}
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow dark:bg-gray-800">
                  <div className="p-3 bg-green-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Smart Notes</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Auto-generated chapter notes with key concepts explained clearly</p>
              </div>
              
              {/* Feature 3 */}
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow dark:bg-gray-800">
                  <div className="p-3 bg-purple-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Flashcards</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Interactive flashcards for quick revision and memory retention</p>
              </div>
              
              {/* Feature 4 */}
              <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow dark:bg-gray-800">
                  <div className="p-3 bg-orange-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Quizzes & Tests</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">AI-generated quizzes to test your knowledge and track progress</p>
              </div>
          </div>
      </div> 
  </div>
</section>

      {/* How It Works Section */}
      <div className="px-4 mx-auto max-w-screen-xl mt-16 mb-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
                  <h3 className="text-lg font-semibold mb-2">Choose Your Topic</h3>
                  <p className="text-gray-500">Select any subject or topic you want to study</p>
              </div>
              <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
                  <h3 className="text-lg font-semibold mb-2">AI Generates Content</h3>
                  <p className="text-gray-500">Our AI creates personalized study materials instantly</p>
              </div>
              <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
                  <h3 className="text-lg font-semibold mb-2">Start Learning</h3>
                  <p className="text-gray-500">Access notes, flashcards, and quizzes anytime</p>
              </div>
          </div>
      </div>

   </div>
  );
}
