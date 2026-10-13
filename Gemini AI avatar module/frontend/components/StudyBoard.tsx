import React, { useState } from 'react';
import { Chapter, TeachingMode, QuizSessionState } from '../types';

interface Props {
  chapter: Chapter;
  teachingMode: TeachingMode;
  onSetTeachingMode: (mode: TeachingMode) => void;
  onSendPrompt: (promptText: string) => void;
  isConnected: boolean;
  onOpenChapterModal: () => void;
  quizState: QuizSessionState;
  onStartQuiz: () => void;
  onSelectQuizOption: (qIndex: number, optIndex: number) => void;
  onResetQuiz: () => void;
}

export const StudyBoard: React.FC<Props> = ({
  chapter,
  teachingMode,
  onSetTeachingMode,
  onSendPrompt,
  isConnected,
  onOpenChapterModal,
  quizState,
  onStartQuiz,
  onSelectQuizOption,
  onResetQuiz
}) => {
  const [activeTab, setActiveTab] = useState<'concepts' | 'prompts' | 'quiz'>('concepts');
  const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

  const toggleHint = (qIndex: number) => {
    setRevealedHints(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const answeredCount = Object.keys(quizState.isAnswerSubmitted).length;
  const scorePercent = chapter.quiz.length > 0 ? Math.round((quizState.score / chapter.quiz.length) * 100) : 0;

  return (
    <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out w-80 md:w-96 lg:w-[420px] overflow-hidden shadow-sm">
      {/* Chapter Title & Selector Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
            Active Lesson
          </span>
          <button
            onClick={onOpenChapterModal}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 transition"
          >
            <span>Change Chapter</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
          {chapter.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {chapter.summary}
        </p>

        {/* Teaching Mode Pills */}
        <div className="mt-3 flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => onSetTeachingMode('socratic')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition ${
              teachingMode === 'socratic'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Socratic Guide: Asks thought-provoking questions"
          >
            🤔 Socratic
          </button>
          <button
            onClick={() => onSetTeachingMode('eli5')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition ${
              teachingMode === 'eli5'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="ELI5: Clear real-world analogies"
          >
            💡 Intuitive
          </button>
          <button
            onClick={() => onSetTeachingMode('quiz')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition ${
              teachingMode === 'quiz'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Quiz Mode: Direct practice and verbal feedback"
          >
            🎯 Quiz
          </button>
          <button
            onClick={() => onSetTeachingMode('deepdive')}
            className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition ${
              teachingMode === 'deepdive'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
            title="Deep Dive: Advanced rigor and proofs"
          >
            🚀 Deep
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/50 dark:bg-slate-950/30">
        <button
          onClick={() => setActiveTab('concepts')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'concepts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Key Concepts ({chapter.keyConcepts.length})
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'prompts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Ask Tutor ({chapter.quickPrompts.length})
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'quiz'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <span>Live Quiz</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold">
            {chapter.quiz.length}Q
          </span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'concepts' && (
          <div className="space-y-3">
            {/* Learning Objectives */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Learning Objectives
              </h4>
              <ul className="space-y-1.5">
                {chapter.objectives.map((obj, i) => (
                  <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Concepts Cards */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Concept Cards</h4>
              {chapter.keyConcepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">{concept.title}</h5>
                    <button
                      onClick={() => onSendPrompt(`Tutor Jay, can you explain "${concept.title}" with a fun real-world example?`)}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                      title="Ask Tutor to explain this concept"
                    >
                      <span>Explain</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {concept.summary}
                  </p>
                  {concept.formula && (
                    <div className="mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-800">
                      {concept.formula}
                    </div>
                  )}
                  {concept.example && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border-l-2 border-indigo-500">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Example: </span>
                      {concept.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click any question below to immediately ask Tutor Jay via voice/chat:
            </p>
            {chapter.quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSendPrompt(prompt)}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-xs font-medium text-slate-800 dark:text-slate-200 shadow-xs transition flex items-start gap-2.5 group"
              >
                <span className="text-indigo-600 dark:text-indigo-400 font-bold shrink-0 mt-0.5">💬</span>
                <span className="flex-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{prompt}</span>
                <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            ))}

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 mt-4">
              <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <span>💡 Tutor Tip</span>
              </h5>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                You can also turn on your camera and show handwritten equations or diagrams on paper, and ask: "Tutor Jay, can you check my work?"
              </p>
            </div>
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {/* Live Interactive Quiz Hero Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-md relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">
                  Avatar Interactive Mode
                </span>
                <span className="text-xs font-bold text-indigo-100">
                  {chapter.quiz.length} Questions
                </span>
              </div>
              <h4 className="font-bold text-base text-white">Live Voice Quiz with Tutor Jay</h4>
              <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                Tutor Jay will read each question aloud, evaluate your voice or click answer, give instant feedback, and explain mistakes!
              </p>

              <div className="mt-3.5 flex items-center gap-2">
                <button
                  onClick={onStartQuiz}
                  className="flex-1 py-2 px-3 rounded-xl bg-white text-indigo-700 font-bold text-xs hover:bg-indigo-50 transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>🚀 Launch Live Quiz Arena</span>
                </button>
              </div>
            </div>

            {/* Score Summary Card */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Score Tracking</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {quizState.score} / {chapter.quiz.length}
                  </span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    ({scorePercent}% Correct)
                  </span>
                </div>
              </div>
              <button
                onClick={onResetQuiz}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
              >
                Reset Scores
              </button>
            </div>

            {/* Questions List for direct study */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">All Chapter Questions</span>
                <span className="text-xs text-slate-400">{answeredCount}/{chapter.quiz.length} Answered</span>
              </div>

              {chapter.quiz.map((q, qIndex) => {
                const isAnswered = quizState.isAnswerSubmitted[qIndex];
                const selectedOpt = quizState.selectedAnswers[qIndex];
                const isCorrect = isAnswered && selectedOpt === q.correctIndex;

                return (
                  <div
                    key={q.id || qIndex}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-semibold text-xs text-slate-900 dark:text-white leading-relaxed flex-1">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-1">Q{qIndex + 1}.</span>
                        {q.question}
                      </h5>
                      <button
                        onClick={() => onSendPrompt(`Tutor Jay, let's practice question #${qIndex + 1}: "${q.question}". Can you read this question and help me solve it?`)}
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title="Have Tutor Jay discuss this question"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      </button>
                    </div>

                    {/* Options */}
                    <div className="space-y-1.5">
                      {q.options.map((opt, optIndex) => {
                        let btnStyle = 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700';
                        if (isAnswered) {
                          if (optIndex === q.correctIndex) {
                            btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold';
                          } else if (selectedOpt === optIndex) {
                            btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200';
                          }
                        }

                        return (
                          <button
                            key={optIndex}
                            disabled={isAnswered}
                            onClick={() => onSelectQuizOption(qIndex, optIndex)}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs transition ${btnStyle}`}
                          >
                            <span className="font-bold mr-1.5">{String.fromCharCode(65 + optIndex)}.</span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>

                    {/* Hint Button */}
                    {!isAnswered && q.hint && (
                      <div className="pt-1">
                        <button
                          onClick={() => toggleHint(qIndex)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <span>💡 {revealedHints[qIndex] ? 'Hide Hint' : 'Show Hint'}</span>
                        </button>
                        {revealedHints[qIndex] && (
                          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/40">
                            {q.hint}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Detailed Explanation */}
                    {isAnswered && (
                      <div className={`p-2.5 rounded-xl text-xs mt-2 border ${
                        isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                          : 'bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900'
                      }`}>
                        <div className="font-bold mb-0.5 flex items-center justify-between">
                          <span>{isCorrect ? '✓ Correct!' : '✗ Not quite right'}</span>
                          <button
                            onClick={() => onSendPrompt(`Tutor Jay, on question "${q.question}", why is the answer "${q.options[q.correctIndex]}"? Can you break down the concept clearly?`)}
                            className="font-bold underline text-[11px]"
                          >
                            Tutor Explanation 🎙️
                          </button>
                        </div>
                        <p className="mt-1 leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Action */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
        <button
          onClick={() => onSendPrompt(`Hi Tutor Jay! Let's start studying "${chapter.title}". Can you give me an engaging introduction and tell me the most important concept I should know first?`)}
          disabled={!isConnected}
          className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white shadow-xs transition flex items-center justify-center gap-2"
        >
          <span>🎙️ Start Chapter Lesson with Tutor</span>
        </button>
      </div>
    </div>
  );
};
