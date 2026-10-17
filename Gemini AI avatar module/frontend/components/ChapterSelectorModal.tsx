import React, { useState, useEffect, useRef } from 'react';
import { Chapter, ChapterStatus } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedChapter: Chapter;
  onSelectChapter: (chapter: Chapter) => void;
  chapterStatuses?: Record<string, ChapterStatus>;
  onUpdateChapterStatus?: (chapterId: string, status: ChapterStatus) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onAddChapter?: (chapter: Chapter) => void;
  chapters?: Chapter[];
}

export const ChapterSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedChapter,
  onSelectChapter,
  chapterStatuses: propChapterStatuses,
  onUpdateChapterStatus,
  onDeleteChapter,
  onAddChapter,
  chapters: propChapters,
}) => {
  const [pdfChapters, setPdfChapters] = useState<Chapter[]>(() => {
    if (propChapters && propChapters.length > 0) return propChapters;
    try {
      const saved = localStorage.getItem('live_avatar_pdf_chapters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [isLoadingPdfChapters, setIsLoadingPdfChapters] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync propChapters into pdfChapters
  useEffect(() => {
    if (propChapters && propChapters.length >= 0) {
      setPdfChapters(propChapters);
    }
  }, [propChapters]);

  // Fetch PDF chapters from backend when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchPdfChapters = async () => {
      setIsLoadingPdfChapters(true);
      try {
        const res = await fetch('http://localhost:8000/api/live-avatar/chapters');
        if (res.ok) {
          const data: Chapter[] = await res.json();
          if (Array.isArray(data)) {
            const deletedIds = new Set<string>(
              JSON.parse(localStorage.getItem('live_avatar_deleted_chapters') || '[]')
            );
            const valid = data.filter(c => !deletedIds.has(c.id));

            setPdfChapters(prev => {
              const map = new Map<string, Chapter>();
              prev.forEach(c => map.set(c.id, c));
              valid.forEach(c => {
                if (!map.has(c.id)) map.set(c.id, c);
              });
              const merged = Array.from(map.values());
              try {
                localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Backend live-avatar chapters fallback:', err);
      } finally {
        setIsLoadingPdfChapters(false);
      }
    };

    fetchPdfChapters();
  }, [isOpen]);

  // Local statuses backup
  const [localStatuses, setLocalStatuses] = useState<Record<string, ChapterStatus>>(() => {
    try {
      const saved = localStorage.getItem('live_avatar_chapter_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const getStatus = (chapterId: string): ChapterStatus => {
    if (propChapterStatuses && propChapterStatuses[chapterId]) {
      return propChapterStatuses[chapterId];
    }
    if (localStatuses[chapterId]) {
      return localStatuses[chapterId];
    }
    if (chapterId === selectedChapter.id) {
      return 'in_progress';
    }
    return 'not_started';
  };

  const setStatus = (chapterId: string, newStatus: ChapterStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = { ...localStatuses, [chapterId]: newStatus };
    setLocalStatuses(updated);
    try {
      localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save chapter statuses to localStorage', err);
    }
    if (onUpdateChapterStatus) {
      onUpdateChapterStatus(chapterId, newStatus);
    }
  };

  // Handle PDF file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('child_name', 'Student');
    formData.append('grade', 'Grade 4');

    try {
      const res = await fetch('http://localhost:8000/api/upload-curriculum', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const uploadResult = await res.json();
      const plan = uploadResult.lesson_plan;

      const keyConcepts = (plan.topics || []).map((t: any) => ({
        title: t.title,
        summary: t.concept_summary || (t.explanation_script ? t.explanation_script.slice(0, 220) : t.title),
        example: t.real_world_analogy || (t.visual_slide?.bullet_points?.length ? t.visual_slide.bullet_points.join(' • ') : undefined)
      }));

      const quizQuestions: any[] = [];
      (plan.topics || []).forEach((t: any, idx: number) => {
        const chks = t.checkpoints || (t.checkpoint ? [t.checkpoint] : []);
        chks.forEach((chk: any, qIdx: number) => {
          quizQuestions.push({
            id: chk.question_id || `${plan.curriculum_id}_q_${idx}_${qIdx}`,
            question: chk.question_text,
            options: chk.options,
            correctIndex: chk.correct_option_index,
            explanation: `Directly from chapter '${t.title}': ${chk.correct_answer_text}`,
            hint: chk.rubric_hint || 'Review the section from your uploaded textbook.'
          });
        });
      });

      const newChapter: Chapter = {
        id: plan.curriculum_id,
        subjectId: 'pdf-curriculum',
        title: plan.chapter_title,
        gradeLevel: plan.grade_level || 'Grade 4',
        summary: `Textbook chapter parsed from "${file.name}" containing ${plan.topics?.length || 0} topics and ${quizQuestions.length} concept checkpoints.`,
        objectives: (plan.topics || []).map((t: any) => t.title),
        keyConcepts: keyConcepts,
        quiz: quizQuestions,
        status: 'in_progress',
        rawContent: plan.full_pdf_text || (plan.topics || []).map((t: any) => t.concept_summary).join('\n\n'),
        sourcePdf: file.name
      };

      const updated = [newChapter, ...pdfChapters.filter(c => c.id !== newChapter.id)];
      setPdfChapters(updated);
      try {
        localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(updated));
      } catch (err) {}

      setStatus(newChapter.id, 'in_progress');
      if (onAddChapter) onAddChapter(newChapter);
      onSelectChapter(newChapter);
      onClose();
    } catch (err: any) {
      console.error('Error uploading PDF textbook:', err);
      const msg = err?.message === 'Load failed' || err?.message?.includes('fetch')
        ? 'Could not connect to backend server (http://localhost:8000). Please ensure backend is running.'
        : (err?.message || 'Failed to upload and parse PDF');
      setUploadError(msg);
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle deleting a chapter from list & scoreboard
  const handleDeleteChapter = (chapterId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // 1. Remove from local state & cache
    const updated = pdfChapters.filter(c => c.id !== chapterId);
    setPdfChapters(updated);

    try {
      localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(updated));

      // Track deleted id so backend does not re-add it
      const deleted: string[] = JSON.parse(localStorage.getItem('live_avatar_deleted_chapters') || '[]');
      if (!deleted.includes(chapterId)) {
        deleted.push(chapterId);
        localStorage.setItem('live_avatar_deleted_chapters', JSON.stringify(deleted));
      }

      // Remove from chapterScores
      const scores = JSON.parse(localStorage.getItem('live_avatar_chapter_scores') || '{}');
      delete scores[chapterId];
      localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(scores));

      const legacyScores = JSON.parse(localStorage.getItem('ai_avatar_chapter_scores') || '{}');
      delete legacyScores[chapterId];
      localStorage.setItem('ai_avatar_chapter_scores', JSON.stringify(legacyScores));

      // Remove from chapterStatuses
      const statuses = JSON.parse(localStorage.getItem('live_avatar_chapter_statuses') || '{}');
      delete statuses[chapterId];
      localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(statuses));
    } catch (err) {
      console.warn('LocalStorage error while deleting chapter', err);
    }

    // 2. Best-effort backend deletion
    try {
      fetch(`http://localhost:8000/api/live-avatar/chapters/${chapterId}`, { method: 'DELETE' });
    } catch (err) {}

    // 3. Notify parent
    if (onDeleteChapter) {
      onDeleteChapter(chapterId);
    }
  };

  if (!isOpen) return null;

  // Filter chapters by search & status
  const filteredChapters = pdfChapters.filter(ch => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ch.title.toLowerCase().includes(query) ||
      ch.summary.toLowerCase().includes(query) ||
      ch.gradeLevel.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    const st = getStatus(ch.id);
    return st === statusFilter;
  });

  const inProgressCount = pdfChapters.filter(c => getStatus(c.id) === 'in_progress').length;
  const completedCount = pdfChapters.filter(c => getStatus(c.id) === 'completed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[88vh] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-white to-slate-50 dark:from-slate-900 dark:to-slate-900">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 mb-2">
              <span>📄 Uploaded PDF Chapters</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Choose Your Chapter to Study</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Chapters come directly from your uploaded textbooks. Concepts, dialogues, and quizzes are prepared from your text.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload & Search Bar Row */}
        <div className="px-6 pt-4 pb-3 space-y-3 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <svg className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search uploaded chapters or concepts..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Direct PDF Upload Button */}
            <div className="shrink-0 w-full sm:w-auto">
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".pdf,.txt" 
                className="hidden" 
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPdf}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isUploadingPdf ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Parsing PDF Chapter...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>+ Upload PDF Chapter</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <button
              onClick={() => setStatusFilter('all')}
              className={`text-xs px-3 py-1 rounded-lg border font-semibold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              All Chapters ({pdfChapters.length})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`text-xs px-3 py-1 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'in_progress'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>In Progress ({inProgressCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`text-xs px-3 py-1 rounded-lg border font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Completed ({completedCount})</span>
            </button>
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {isLoadingPdfChapters && pdfChapters.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading your saved PDF chapters...</span>
            </div>
          )}

          {pdfChapters.length === 0 && !isLoadingPdfChapters && (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-800/20 max-w-lg mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                No PDF Chapters Added Yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                Upload a textbook chapter (.pdf or .txt) to automatically extract core concepts, practice quiz questions, and study 1-on-1 with Tutor Jay.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/20 transition cursor-pointer"
              >
                + Upload Your First PDF Chapter
              </button>
            </div>
          )}

          {pdfChapters.length > 0 && filteredChapters.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-semibold">No chapters matched your filter "{searchQuery || statusFilter}"</p>
              <p className="text-xs mt-1">Try clearing your search or switching the filter above.</p>
            </div>
          )}

          {filteredChapters.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredChapters.map(chap => renderChapterCard(chap))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>In Progress</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  function renderChapterCard(chapter: Chapter) {
    const isSelected = chapter.id === selectedChapter.id;
    const status = getStatus(chapter.id);

    return (
      <div
        key={chapter.id}
        onClick={() => {
          setStatus(chapter.id, 'in_progress');
          onSelectChapter(chapter);
          onClose();
        }}
        className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
          isSelected
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/30 shadow-md'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header Badges: Grade, Status, PDF tag */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {chapter.gradeLevel}
              </span>

              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                📄 PDF Chapter
              </span>

              {/* Learning Status Pill */}
              {status === 'completed' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/90 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Completed</span>
                </span>
              ) : status === 'in_progress' || isSelected ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/90 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>In Progress</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  Not Started
                </span>
              )}

              {isSelected && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                  Active
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
              {chapter.title}
            </h4>

            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
              {chapter.summary}
            </p>

            {/* Metrics extracted directly from chapter text */}
            <div className="flex items-center gap-3 md:gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {chapter.objectives?.length || 0} Objectives
              </span>
              <span className="flex items-center gap-1" title="Key concepts extracted strictly from chapter text">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {chapter.keyConcepts?.length || 0} Key Concepts
              </span>
              <span className="flex items-center gap-1" title="Quiz questions prepared directly from chapter content">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {chapter.quiz?.length || 0} Practice Questions
              </span>
            </div>
          </div>

          {/* Action Button, Status Toggle & Remove Chapter */}
          <div className="shrink-0 flex flex-col items-end gap-2">
            <button
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'
              }`}
            >
              {isSelected ? 'Studying' : status === 'completed' ? 'Review Lesson' : 'Study This'}
            </button>

            {/* Quick Status Toggle Button */}
            <button
              onClick={(e) => setStatus(chapter.id, status === 'completed' ? 'in_progress' : 'completed', e)}
              className="text-[11px] font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition underline cursor-pointer"
              title="Toggle chapter completed/in-progress status"
            >
              {status === 'completed' ? 'Mark In Progress' : 'Mark Completed'}
            </button>

            {/* Remove / Delete Chapter Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to remove "${chapter.title}"? Its scores will also be removed from your scoreboard.`)) {
                  handleDeleteChapter(chapter.id, e);
                }
              }}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition flex items-center gap-1 hover:underline p-1 cursor-pointer"
              title="Remove chapter and delete its scores from scoreboard"
            >
              <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
};
