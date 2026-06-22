import React from 'react'
import ReactCardFlip from 'react-card-flip'

function FlashcardItem({isFlipped,handleClick,flashcard,schedule}) {
  let badgeLabel = "New Card";
  let badgeColor = "bg-indigo-500/10 text-indigo-600 border border-indigo-200/30";
  
  if (schedule) {
    if (schedule.lastRatedScore === 1) {
      badgeLabel = "Again (Learning)";
      badgeColor = "bg-rose-500/10 text-rose-600 border border-rose-200/30 animate-pulse";
    } else if (schedule.interval >= 7) {
      badgeLabel = `Mastered (${schedule.interval}d)`;
      badgeColor = "bg-emerald-500/10 text-emerald-600 border border-emerald-200/30 font-bold";
    } else {
      badgeLabel = `Review (${schedule.interval}d)`;
      badgeColor = "bg-amber-500/10 text-amber-600 border border-amber-200/30";
    }
  }

  return (
    <div className='flex items-center justify-center relative select-none'>
        <ReactCardFlip isFlipped={isFlipped} flipDirection="vertical">
          {/* Front Card */}
          <div className='p-6 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white flex flex-col items-center justify-center rounded-2xl cursor-pointer shadow-xl relative transition-all duration-300 hover:scale-[1.02] border border-indigo-800/40 h-[250px] w-[200px] md:h-[350px] md:w-[300px]' onClick={handleClick}>
              <span className={`absolute top-4 left-4 text-[10px] px-2.5 py-0.5 rounded-full ${badgeColor}`}>
                  {badgeLabel}
              </span>
              <span className='absolute bottom-4 right-4 text-[10px] text-slate-500 font-semibold tracking-wider uppercase'>Question</span>
              <h2 className='text-base md:text-xl font-bold text-center px-4 leading-relaxed'>{flashcard?.front || flashcard?.question}</h2>
          </div>

          {/* Back Card */}
          <div className='p-6 bg-white shadow-xl text-slate-800 flex flex-col items-center justify-center rounded-2xl cursor-pointer border border-slate-100 relative transition-all duration-300 hover:scale-[1.02] h-[250px] w-[200px] md:h-[350px] md:w-[300px] text-center' onClick={handleClick}>
              <span className={`absolute top-4 left-4 text-[10px] px-2.5 py-0.5 rounded-full ${badgeColor}`}>
                  {badgeLabel}
              </span>
              <span className='absolute bottom-4 right-4 text-[10px] text-slate-400 font-semibold tracking-wider uppercase'>Answer</span>
              <h2 className='text-sm md:text-lg font-medium px-4 leading-relaxed'>{flashcard?.back || flashcard?.answer}</h2>
          </div>
      </ReactCardFlip>
    </div>
  )
}

export default FlashcardItem