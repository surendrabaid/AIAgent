import React, { useState } from 'react';
import { CURRICULUM_DATA } from '../data/curriculum';
import { Chapter } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedChapter: Chapter;
  onSelectChapter: (chapter: Chapter) => void;
}

export const ChapterSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedChapter,
  onSelectChapter
}) => {
  const [activeSubjectId, setActiveSubjectId] = useState<string>(selectedChapter.subjectId);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentSubject = CURRICULUM_DATA.find(s => s.id === activeSubjectId) || CURRICULUM_DATA[0];

  const filteredChapters = CURRICULUM_DATA.flatMap(s => s.chapters).filter(ch => {
    const query = searchQuery.toLowerCase();
    return ch.title.toLowerCase().includes(query) ||
           ch.summary.toLowerCase().includes(query) ||
           ch.gradeLevel.toLowerCase().includes(query);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:to-slate-900">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 mb-2">
              <span>📚 Study Curriculum</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Choose Your Chapter to Study</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Select a topic for Tutor Jay to teach, review, and quiz you on.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 pt-4 pb-2">
          <div className="relative">
            <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chapters, formulas, or concepts (e.g. Newton, Quadratic, Big-O)..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          {/* Subject Tabs (shown when not searching) */}
          {!searchQuery && (
            <div className="w-full md:w-64 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 space-y-1.5 shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 py-1">Subjects</div>
              {CURRICULUM_DATA.map(subj => {
                const isActive = subj.id === activeSubjectId;
                return (
                  <button
                    key={subj.id}
                    onClick={() => setActiveSubjectId(subj.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{subj.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {subj.chapters.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Chapters Grid */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {searchQuery ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400 mb-3">Search Results ({filteredChapters.length})</p>
                {filteredChapters.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-base font-medium">No chapters matched "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try another keyword or select from subjects.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredChapters.map(chap => renderChapterCard(chap))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{currentSubject.name}</span>
                    <span className="text-xs text-slate-400 font-normal">({currentSubject.chapters.length} chapters)</span>
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{currentSubject.description}</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {currentSubject.chapters.map(chap => renderChapterCard(chap))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  function renderChapterCard(chapter: Chapter) {
    const isSelected = chapter.id === selectedChapter.id;
    return (
      <div
        key={chapter.id}
        onClick={() => {
          onSelectChapter(chapter);
          onClose();
        }}
        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-md'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {chapter.gradeLevel}
              </span>
              {isSelected && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  Active Chapter
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {chapter.title}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
              {chapter.summary}
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {chapter.objectives.length} Objectives
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {chapter.keyConcepts.length} Key Concepts
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {chapter.quiz.length} Practice Questions
              </span>
            </div>
          </div>

          <button
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              isSelected
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'
            }`}
          >
            {isSelected ? 'Studying' : 'Study This'}
          </button>
        </div>
      </div>
    );
  }
};
