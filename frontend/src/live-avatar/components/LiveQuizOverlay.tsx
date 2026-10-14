import React from 'react';
import { QuizQuestion, QuizSessionState, Chapter } from '../types';

interface Props {
  chapter: Chapter;
  quizState: QuizSessionState;
  onSelectOption: (optionIndex: number) => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  onRestartQuiz: () => void;
  onCloseQuiz: () => void;
  onAskTutorToSpeakQuestion: () => void;
  onAskTutorForDeepExplanation: () => void;
  isConnected: boolean;
  onViewScoreboard?: () => void;
}

export const LiveQuizOverlay: React.FC<Props> = ({
  chapter,
  quizState,
  onSelectOption,
  onNextQuestion,
  onPrevQuestion,
  onRestartQuiz,
  onCloseQuiz,
  onAskTutorToSpeakQuestion,
  onAskTutorForDeepExplanation,
  isConnected,
  onViewScoreboard,
}) => {
  if (!quizState.isActive) return null;

  const currentQ: QuizQuestion | undefined = chapter.quiz[quizState.currentIndex];
  const isAnswered = quizState.isAnswerSubmitted[quizState.currentIndex];
  const selectedOpt = quizState.selectedAnswers[quizState.currentIndex];
  const isCorrect = isAnswered && selectedOpt === currentQ?.correctIndex;
  const isLastQuestion = quizState.currentIndex === chapter.quiz.length - 1;

  return (
    <div className="w-full animate-fadeIn pointer-events-auto">
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-indigo-500/50 shadow-xl rounded-2xl p-4 text-white transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-xs">
              🎯
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wide uppercase text-indigo-400">
                Live Quiz Arena
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                {quizState.currentIndex + 1} of {chapter.quiz.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Score & Streak counter */}
            <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-800/90 px-2.5 py-0.5 rounded-full border border-slate-700">
              <span className="text-emerald-400 flex items-center gap-0.5 text-[11px]">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                {quizState.score}/{chapter.quiz.length}
              </span>
              {quizState.streak > 1 && (
                <span className="text-amber-400 flex items-center gap-0.5 text-[11px]">
                  🔥 {quizState.streak}
                </span>
              )}
            </div>

            <button
              onClick={onCloseQuiz}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close Quiz Mode"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Completion View */}
        {quizState.isCompleted ? (
          <div className="text-center py-4 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-500 flex items-center justify-center text-2xl shadow-lg animate-bounce">
              🏆
            </div>
            <h4 className="text-base font-extrabold text-white">Quiz Completed!</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              You scored <span className="font-bold text-emerald-400 text-sm">{quizState.score}</span> out of {chapter.quiz.length} ({Math.round((quizState.score / chapter.quiz.length) * 100)}% accuracy)!
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
              {onViewScoreboard && (
                <button
                  onClick={onViewScoreboard}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-md"
                >
                  <span>📊 View Scoreboard</span>
                </button>
              )}
              <button
                onClick={onRestartQuiz}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                <span>🔄 Retake</span>
              </button>
              <button
                onClick={onCloseQuiz}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Question Text */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <h4 className="text-xs sm:text-sm font-semibold text-white leading-snug">
                {currentQ?.question}
              </h4>
              <button
                onClick={onAskTutorToSpeakQuestion}
                disabled={!isConnected}
                className="shrink-0 p-1 px-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/50 text-indigo-300 hover:text-white transition flex items-center gap-1 text-[10px] font-semibold"
                title="Have Tutor Jay read this question aloud"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                <span className="hidden sm:inline">Read Aloud</span>
              </button>
            </div>

            {/* Multiple Choice Options */}
            <div className="grid grid-cols-1 gap-2 mb-3">
              {currentQ?.options.map((option, optIdx) => {
                let btnStyle = 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-200';
                if (isAnswered) {
                  if (optIdx === currentQ.correctIndex) {
                    btnStyle = 'bg-emerald-900/60 border-emerald-500 text-emerald-200 font-bold ring-1 ring-emerald-500/50';
                  } else if (selectedOpt === optIdx) {
                    btnStyle = 'bg-rose-900/60 border-rose-500 text-rose-200 font-bold';
                  } else {
                    btnStyle = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswered}
                    onClick={() => onSelectOption(optIdx)}
                    className={`w-full text-left p-2.5 rounded-xl border text-[11px] sm:text-xs transition flex items-start gap-2.5 ${btnStyle}`}
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-900/80 flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-300 mt-0.5">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="flex-1 leading-snug">{option}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback & Explanation Section */}
            {isAnswered && (
              <div className={`p-2.5 rounded-xl mb-3 text-xs border ${
                isCorrect
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
              }`}>
                <div className="flex items-center justify-between font-bold mb-1">
                  <span className="flex items-center gap-1 text-[11px]">
                    {isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
                  </span>
                  <button
                    onClick={onAskTutorForDeepExplanation}
                    className="text-[10px] underline font-semibold flex items-center gap-1 hover:text-white"
                  >
                    <span>🎙️ Tutor Explain</span>
                  </button>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {currentQ?.explanation}
                </p>
              </div>
            )}

            {/* Navigation and Voice hint */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Speak or click choice</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevQuestion}
                  disabled={quizState.currentIndex === 0}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
                >
                  Prev
                </button>
                <button
                  onClick={onNextQuestion}
                  disabled={!isAnswered}
                  className="px-3 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white transition flex items-center gap-1 shadow-xs"
                >
                  <span>{isLastQuestion ? 'Finish & Score' : 'Next'}</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
