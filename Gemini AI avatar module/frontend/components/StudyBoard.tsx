import React, { useState, useEffect } from 'react';
import { Chapter, TeachingMode, QuizSessionState, ChapterStatus, ChapterScore } from '../types';
import { LiveQuizOverlay } from './LiveQuizOverlay';

interface Props {
  chapter: Chapter;
  teachingMode?: TeachingMode;
  onSetTeachingMode?: (mode: TeachingMode) => void;
  onSendPrompt: (promptText: string) => void;
  isConnected: boolean;
  onOpenChapterModal: () => void;
  quizState: QuizSessionState;
  onStartQuiz: () => void;
  onSelectQuizOption: (qIndex: number, optIndex: number) => void;
  onResetQuiz: () => void;
  chapterStatus?: ChapterStatus;
  onUpdateChapterStatus?: (chapterId: string, status: ChapterStatus) => void;
  isLessonCompleted?: boolean;
  onUnlockQuiz?: () => void;
  chapterScores?: Record<string, ChapterScore>;
  allChapters?: Chapter[];
  chapterStatuses?: Record<string, ChapterStatus>;
  onSelectChapter?: (chapter: Chapter) => void;
  activeTab?: 'concepts' | 'quiz' | 'scoreboard';
  onSetActiveTab?: (tab: 'concepts' | 'quiz' | 'scoreboard') => void;
  onNextQuizQuestion?: () => void;
  onPrevQuizQuestion?: () => void;
  onCloseQuiz?: () => void;
  onAskTutorToSpeakQuestion?: () => void;
  onAskTutorForDeepExplanation?: () => void;
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
  onResetQuiz,
  chapterStatus = 'in_progress',
  onUpdateChapterStatus,
  isLessonCompleted = false,
  onUnlockQuiz,
  chapterScores = {},
  allChapters = [],
  chapterStatuses = {},
  onSelectChapter,
  activeTab: controlledActiveTab,
  onSetActiveTab,
  onNextQuizQuestion,
  onPrevQuizQuestion,
  onCloseQuiz,
  onAskTutorToSpeakQuestion,
  onAskTutorForDeepExplanation,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'concepts' | 'quiz' | 'scoreboard'>('concepts');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const setActiveTab = (tab: 'concepts' | 'quiz' | 'scoreboard') => {
    if (onSetActiveTab) {
      onSetActiveTab(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const toggleStatus = () => {
    const nextStatus: ChapterStatus = chapterStatus === 'completed' ? 'in_progress' : 'completed';
    if (onUpdateChapterStatus) {
      onUpdateChapterStatus(chapter.id, nextStatus);
    }
  };

  const currentChapterScore = chapterScores[chapter.id];
  const isPdfChapter = chapter.subjectId === 'pdf-curriculum' || !!chapter.sourcePdf;

  // Active list of chapters
  const activeChapterList = allChapters.length > 0
    ? allChapters
    : (chapter && chapter.id !== 'empty-placeholder' ? [chapter] : []);

  // Determine if all chapters in the list are completed
  const areAllChaptersCompleted = activeChapterList.length > 0 && activeChapterList.every(ch => {
    const st = chapterStatuses[ch.id] || (ch.id === chapter.id ? chapterStatus : ch.status);
    return st === 'completed' || Boolean(chapterScores[ch.id]);
  });

  // Aggregate stats strictly across active chapters in the list (excluding removed chapters)
  const activeChapterIds = new Set(activeChapterList.map(c => c.id));
  const scoreEntries = Object.entries(chapterScores)
    .filter(([id]) => activeChapterIds.has(id))
    .map(([, score]) => score);
  const totalQuizzesTaken = scoreEntries.length;
  const avgAccuracy = totalQuizzesTaken > 0
    ? Math.round(scoreEntries.reduce((sum, s) => sum + s.percentage, 0) / totalQuizzesTaken)
    : 0;

  // Render Completed Chapter Scores List (without Switch button)
  const renderCompletedScores = () => {
    const scoredChapters = activeChapterList.filter(ch => Boolean(chapterScores[ch.id]));

    return (
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Completed Chapter Scores
          </h4>
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
            {scoredChapters.length} {scoredChapters.length === 1 ? 'chapter' : 'chapters'}
          </span>
        </div>

        {scoredChapters.length > 0 ? (
          <div className="space-y-2">
            {scoredChapters.map((ch) => {
              const chScore = chapterScores[ch.id];
              const isCurrent = ch.id === chapter.id && !areAllChaptersCompleted;

              return (
                <div
                  key={ch.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2 ${
                    isCurrent
                      ? 'border-indigo-400 dark:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate max-w-[200px]">
                        {ch.title}
                      </h5>
                      {isCurrent && (
                        <span className="text-[9px] font-extrabold uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-md">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      Completed on {chScore.completedAt}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {chScore.score}/{chScore.total}
                      </span>
                      <span className={`block text-[10px] font-bold ${
                        chScore.percentage >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : chScore.percentage >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {chScore.percentage}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No completed chapters yet
            </p>
            <p className="text-[11px] text-slate-400">
              Take and complete a quiz to see your scores recorded here.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out w-80 md:w-96 lg:w-[430px] overflow-hidden shadow-sm">
      {/* Top Banner: Choose Your Chapter to Study */}
      <div className="p-3 border-b border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white shrink-0">
        <button
          onClick={onOpenChapterModal}
          className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 transition border border-white/20 cursor-pointer group text-left"
          title="Click to Choose Your Chapter to Study"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-100 leading-tight">
                Curriculum & Textbooks
              </span>
              <span className="block text-xs sm:text-sm font-extrabold text-white truncate leading-tight mt-0.5">
                Choose Your Chapter to Study
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold bg-white/20 group-hover:bg-white/30 px-2 py-1 rounded-md shrink-0">
            <span>Browse</span>
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {areAllChaptersCompleted ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* All Chapters Completed Hero Banner */}
          <div className="p-5 m-3.5 rounded-3xl bg-gradient-to-br from-emerald-50 via-indigo-50/40 to-purple-50/50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-indigo-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-center shadow-xs space-y-3.5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/20">
              🎉
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                All Chapters Completed
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                You completed all chapters!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                Great job! You have completed all chapters in the list. Please add new chapters to continue learning.
              </p>
            </div>

            <button
              onClick={onOpenChapterModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Please Add New Chapters</span>
            </button>
          </div>

          {/* Curriculum Scoreboard Overview */}
          <div className="px-4 pb-4 space-y-4">
            <div className="flex items-center justify-between pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Curriculum Scoreboard
              </h4>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                {activeChapterList.length} completed
              </span>
            </div>

            {/* Top Stat Cards: Quizzes & Avg Score only (Mastered removed) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Quizzes</span>
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{totalQuizzesTaken}</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Avg Score</span>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{avgAccuracy}%</p>
              </div>
            </div>

            {/* Completed Chapter Scores List */}
            {renderCompletedScores()}
          </div>
        </div>
      ) : (
        <>
          {/* Chapter Title & Status Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          {/* Chapter Status Badge */}
          <div className="flex items-center gap-2">
            {chapterStatus === 'completed' ? (
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                <span>Completed</span>
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-800 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>In Progress</span>
              </span>
            )}

            {isPdfChapter && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md">
                PDF Chapter
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleStatus}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline transition"
              title="Toggle chapter completed/in-progress status"
            >
              {chapterStatus === 'completed' ? 'Mark In Progress' : 'Mark Completed'}
            </button>
          </div>
        </div>

        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
          {chapter.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
          {chapter.summary}
        </p>
      </div>

      {/* 3 Tabs: Key Concepts, Live Quiz (locked until lesson done), Scoreboard */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-3 bg-slate-50/50 dark:bg-slate-950/30">
        <button
          onClick={() => setActiveTab('concepts')}
          className={`flex-1 py-2.5 px-2 text-xs font-bold border-b-2 text-center transition ${
            activeTab === 'concepts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Key Concepts ({chapter.keyConcepts.length})
        </button>

        <button
          onClick={() => setActiveTab('quiz')}
          className={`flex-1 py-2.5 px-2 text-xs font-bold border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'quiz'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <span className="flex items-center gap-1">
            {!isLessonCompleted && <span className="text-[11px]">🔒</span>}
            <span>Live Quiz</span>
          </span>
          {!isLessonCompleted ? (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800">
              Locked
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold">
              {chapter.quiz.length}Q
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('scoreboard')}
          className={`flex-1 py-2.5 px-2 text-xs font-bold border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
            activeTab === 'scoreboard'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <span>Scoreboard</span>
          {currentChapterScore ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
              {currentChapterScore.score}/{currentChapterScore.total}
            </span>
          ) : totalQuizzesTaken > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-extrabold">
              {totalQuizzesTaken}
            </span>
          ) : null}
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: Key Concepts */}
        {activeTab === 'concepts' && (
          <div className="space-y-3">
            {/* Learning Objectives */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Learning Objectives
              </h4>
              <ul className="space-y-1.5">
                {chapter.objectives.map((obj, i) => {
                  const cleanObj = obj.replace(/^(Unit|Chapter|Section)\s+\d+:\s*/i, '');
                  return (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                      <span>{cleanObj}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Concepts Cards */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chapter Key Points
                </h4>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                  {chapter.keyConcepts.length} points
                </span>
              </div>

              {chapter.keyConcepts.map((concept, idx) => {
                const cleanTitle = concept.title.replace(/^(Unit|Chapter|Section)\s+\d+:\s*/i, '');
                const rawBullets = concept.keyPoints && concept.keyPoints.length > 0
                  ? concept.keyPoints
                  : concept.summary.includes('•')
                  ? concept.summary.split('•').map(s => s.trim()).filter(s => s.length > 0)
                  : [];

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-800 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span>{cleanTitle}</span>
                      </h5>
                      <button
                        onClick={() => onSendPrompt(`Hi Tutor Jay, could you explain the concept "${cleanTitle}" from this chapter with an intuitive real-world example?`)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        title="Ask Tutor Jay to explain this concept"
                      >
                        <span>Explain 🎙️</span>
                      </button>
                    </div>

                    {rawBullets.length > 0 ? (
                      <ul className="space-y-2 my-2">
                        {rawBullets.map((pt, pIdx) => (
                          <li key={pIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-500 font-bold shrink-0 mt-0.5">▸</span>
                            <span className="leading-relaxed">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {concept.summary}
                      </p>
                    )}

                    {concept.formula && (
                      <div className="mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-lg font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold border border-slate-200 dark:border-slate-800">
                        {concept.formula}
                      </div>
                    )}
                    {concept.example && !concept.example.includes('•') && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border-l-2 border-indigo-500">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Context: </span>
                        {concept.example}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Live Quiz (Starts the live quiz overlay - NO full question list on page) */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            {!isLessonCompleted ? (
              /* Locked State Card */
              <div className="p-5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-center space-y-3.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-2xl shadow-xs">
                  🔒
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Live Quiz is Locked
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto mt-1">
                    The quiz unlocks automatically when your AI Tutor finishes teaching the lesson, or when you mark this chapter completed.
                  </p>
                </div>

                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-left text-xs space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>How to unlock:</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Listen to Tutor Jay teach the chapter concepts. Once Tutor Jay says the lesson is complete, the quiz unlocks instantly.
                  </p>
                </div>

                <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      onSendPrompt(`Hi Tutor Jay! Please continue teaching our chapter "${chapter.title}" and let me know when our lesson is completed so I can take the quiz!`);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>🎙️ Continue Lesson</span>
                  </button>
                  {onUnlockQuiz && (
                    <button
                      onClick={onUnlockQuiz}
                      className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline transition"
                    >
                      Unlock Quiz Early
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Unlocked State: Live Quiz Overlay ABOVE Start Quiz button */
              <div className="space-y-4">
                {/* 1. Live Quiz Overlay (rendered when quizState.isActive directly ABOVE start quiz button) */}
                {quizState.isActive && (
                  <div className="animate-fadeIn">
                    <LiveQuizOverlay
                      chapter={chapter}
                      quizState={quizState}
                      onSelectOption={(optIdx) => onSelectQuizOption(quizState.currentIndex, optIdx)}
                      onNextQuestion={onNextQuizQuestion || (() => {})}
                      onPrevQuestion={onPrevQuizQuestion || (() => {})}
                      onRestartQuiz={onStartQuiz}
                      onCloseQuiz={onCloseQuiz || onResetQuiz}
                      onAskTutorToSpeakQuestion={onAskTutorToSpeakQuestion || (() => {})}
                      onAskTutorForDeepExplanation={onAskTutorForDeepExplanation || (() => {})}
                      isConnected={isConnected}
                      onViewScoreboard={() => setActiveTab('scoreboard')}
                    />
                  </div>
                )}

                {/* 2. Start Live Quiz Card & Button */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span>🎯 Chapter Grounded</span>
                    </span>
                    <span className="text-xs font-bold text-indigo-100 bg-indigo-900/60 px-2 py-0.5 rounded-md">
                      {chapter.quiz.length} Questions
                    </span>
                  </div>

                  <h4 className="font-extrabold text-base text-white leading-snug">
                    Interactive Live Voice Quiz
                  </h4>
                  <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                    Tutor Jay will speak each question on the avatar screen, listen to your verbal or clicked answers, and provide real-time verbal feedback!
                  </p>

                  {/* Highlights Grid */}
                  {!quizState.isActive && (
                    <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-indigo-100/90 font-medium">
                      <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                        <span>🎙️</span>
                        <span>Spoken Questions</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                        <span>🗣️</span>
                        <span>Speak or Click</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                        <span>📖</span>
                        <span>Chapter Grounded</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                        <span>📊</span>
                        <span>Auto Scoreboard</span>
                      </div>
                    </div>
                  )}

                  {/* Single Action Button */}
                  <div className="mt-4">
                    <button
                      onClick={onStartQuiz}
                      className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm text-indigo-950 bg-white hover:bg-indigo-50 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2 transform"
                    >
                      {quizState.isActive ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                          <span>🔄 Restart Live Quiz</span>
                        </>
                      ) : quizState.isCompleted ? (
                        <>
                          <span>🔄</span>
                          <span>Retake Live Voice Quiz</span>
                        </>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>Start Live Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Score Preview if already taken */}
                {currentChapterScore && !quizState.isActive && (
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Latest Quiz Score</span>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">
                          {currentChapterScore.score} / {currentChapterScore.total}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ({currentChapterScore.percentage}% Mastery)
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('scoreboard')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>View Scoreboard</span>
                      <span>➔</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Chapter-Wise Scoreboard */}
        {activeTab === 'scoreboard' && (
          <div className="space-y-4">
            {/* Overview Stats Row: Quizzes & Avg Score only (Mastered removed) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Quizzes</span>
                <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">{totalQuizzesTaken}</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
                <span className="text-[10px] font-semibold uppercase text-slate-400">Avg Score</span>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{avgAccuracy}%</p>
              </div>
            </div>

            {/* Active Chapter Quiz Details: ONLY show if status is in_progress */}
            {chapterStatus === 'in_progress' && (
              currentChapterScore ? (
                <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Active Chapter Score
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                        {chapter.title}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                        {currentChapterScore.score}/{currentChapterScore.total}
                      </span>
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {currentChapterScore.percentage}% Accuracy
                      </p>
                    </div>
                  </div>

                  {/* Question Details Review */}
                  {currentChapterScore.details && currentChapterScore.details.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Question Review
                      </span>
                      {currentChapterScore.details.map((item, dIdx) => (
                        <div
                          key={dIdx}
                          className={`p-2.5 rounded-xl border text-xs ${
                            item.isCorrect
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-slate-800 dark:text-slate-200'
                              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-1.5 font-semibold leading-snug">
                            <span className={item.isCorrect ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {item.isCorrect ? '✓' : '✗'}
                            </span>
                            <span className="flex-1">Q{dIdx + 1}: {item.question}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-4">
                            <span>Your answer: </span>
                            <span className={item.isCorrect ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'font-bold text-rose-700 dark:text-rose-300'}>
                              {item.selectedOption}
                            </span>
                            {!item.isCorrect && (
                              <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                                (Correct: {item.correctOption})
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      onClick={onStartQuiz}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>🔄 Retake This Quiz</span>
                    </button>
                    <button
                      onClick={onResetQuiz}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                    >
                      Reset Scores
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 text-center space-y-2">
                  <span className="text-2xl">📝</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    No quiz taken yet for "{chapter.title}".
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Complete the lesson and click "Start Live Quiz" to record your score!
                  </p>
                </div>
              )
            )}

            {/* Chapter-Wise Scoreboard Table */}
            {renderCompletedScores()}
          </div>
        )}
      </div>
    </>
  )}
</div>
);
};
