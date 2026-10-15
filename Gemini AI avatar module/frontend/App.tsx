import React, { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { UserWebCamDisplay } from './components/UserWebCamDisplay';
import { TopBar } from './components/TopBar';
import { DebugPanel } from './components/DebugPanel';
import { AvatarDisplay } from './components/AvatarDisplay';
import { ControlBar } from './components/ControlBar';
import { StudyBoard } from './components/StudyBoard';
import { ChapterSelectorModal } from './components/ChapterSelectorModal';
import { useTheme } from './hooks/useTheme';
import { useMediaDevices } from './hooks/useMediaDevices';
import { useLiveSession } from './hooks/useLiveSession';
import { EMPTY_CHAPTER } from './data/curriculum';
import { TUTOR_PERSONAS } from './data/avatars';
import { StudentLoginView } from './components/StudentLoginView';
import { VideoMode, Chapter, TeachingMode, QuizSessionState, AvatarPersona, AvatarMood, ChapterStatus, ChapterScore } from './types';

const App: React.FC = () => {
  const { theme, setTheme } = useTheme();

  // Student Authentication / Profile state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [studentName, setStudentName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('helpme_child_name') : '') || 'Vihana';
  });
  const [studentClass, setStudentClass] = useState(() => {
    return (typeof window !== 'undefined' ? (localStorage.getItem('helpme_grade') || localStorage.getItem('helpme_class_name')) : '') || 'Grade 3';
  });
  const {
    audioDevices, selectedDeviceId, setSelectedDeviceId,
    audioOutputDevices, selectedAudioOutputId, setSelectedAudioOutputId,
    videoDevices, selectedVideoDeviceId, setSelectedVideoDeviceId,
    deviceError
  } = useMediaDevices();

  const [isMuted, setIsMuted] = useState(false);
  const [videoMode, setVideoMode] = useState<VideoMode>('none');
  const [isTranscriptionPanelOpen, setIsTranscriptionPanelOpen] = useState(true);
  const [isStudyBoardOpen, setIsStudyBoardOpen] = useState(true);
  const [isAvatarVisible, setIsAvatarVisible] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  // Chapters list strictly loaded from PDF cache & backend
  const [allChapters, setAllChapters] = useState<Chapter[]>(() => {
    try {
      const cached = localStorage.getItem('live_avatar_pdf_chapters');
      if (cached) {
        const parsed: Chapter[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached PDF chapters', e);
    }
    return [];
  });

  // Active Subject & Chapter selection: cached selected chapter or first PDF chapter or EMPTY_CHAPTER
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(() => {
    try {
      const cached = localStorage.getItem('live_avatar_pdf_chapters');
      const savedSelectedId = localStorage.getItem('live_avatar_selected_chapter_id');
      if (cached) {
        const parsed: Chapter[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (savedSelectedId) {
            const found = parsed.find(c => c.id === savedSelectedId);
            if (found) return found;
          }
          return parsed[0];
        }
      }
    } catch (e) {}
    return EMPTY_CHAPTER;
  });
  const [activePersona, setActivePersona] = useState<AvatarPersona>(TUTOR_PERSONAS[0]);
  const [avatarMood, setAvatarMood] = useState<AvatarMood>('idle');
  const [teachingMode, setTeachingMode] = useState<TeachingMode>('socratic');
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);

  // Chapter Learning Statuses Tracking (In Progress vs Completed)
  const [chapterStatuses, setChapterStatuses] = useState<Record<string, ChapterStatus>>(() => {
    try {
      const saved = localStorage.getItem('live_avatar_chapter_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Track lesson completion: enabled when tutor completes lesson in transcription, or status marked completed
  const [isLessonCompleted, setIsLessonCompleted] = useState<boolean>(false);

  // Active StudyBoard Tab ('concepts' | 'quiz' | 'scoreboard')
  const [activeStudyTab, setActiveStudyTab] = useState<'concepts' | 'quiz' | 'scoreboard'>('concepts');

  // Chapter-wise Quiz Scores Persistence
  const [chapterScores, setChapterScores] = useState<Record<string, ChapterScore>>(() => {
    try {
      const saved = localStorage.getItem('live_avatar_chapter_scores') || localStorage.getItem('ai_avatar_chapter_scores');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Fetch backend PDF chapters to merge with cached chapters
  useEffect(() => {
    const fetchBackendChapters = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/live-avatar/chapters');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const deletedIds = new Set<string>(
              JSON.parse(localStorage.getItem('live_avatar_deleted_chapters') || '[]')
            );
            const validBackendChapters = data.filter((c: Chapter) => !deletedIds.has(c.id));

            setAllChapters(prev => {
              const map = new Map<string, Chapter>();
              prev.forEach(c => map.set(c.id, c));
              validBackendChapters.forEach((c: Chapter) => {
                if (!map.has(c.id)) map.set(c.id, c);
              });
              const merged = Array.from(map.values());
              try {
                localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(merged));
              } catch (err) {}
              return merged;
            });

            setSelectedChapter(prev => {
              if (prev.id === EMPTY_CHAPTER.id && validBackendChapters.length > 0) {
                return validBackendChapters[0];
              }
              return prev;
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch backend chapters', err);
      }
    };
    fetchBackendChapters();
  }, []);

  const handleUpdateChapterStatus = (chapterId: string, status: ChapterStatus) => {
    setChapterStatuses(prev => {
      const updated = { ...prev, [chapterId]: status };
      try {
        localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      return updated;
    });

    if (status === 'completed' && chapterId === selectedChapter.id) {
      setIsLessonCompleted(true);
    }
  };

  // Interactive Quiz Arena State
  const [quizState, setQuizState] = useState<QuizSessionState>({
    isActive: false,
    currentIndex: 0,
    selectedAnswers: {},
    isAnswerSubmitted: {},
    score: 0,
    isCompleted: false,
    streak: 0
  });

  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  const {
    isConnected, isConnecting, isWaitingForVideo, hasVideo, error: sessionError,
    chatHistory, liveInput, liveOutput, debugStats, videoRef, agentTalking,
    connect, disconnect, switchMicrophone, sendTextMessage
  } = useLiveSession(
    selectedAudioOutputId,
    isMuted,
    videoMode !== 'none',
    webcamVideoRef,
    selectedChapter,
    activePersona
  );

  // Monitor transcription to auto-unlock quiz when tutor indicates lesson is completed
  useEffect(() => {
    if (isLessonCompleted) return;

    const completionRegex = /(lesson\s+(is\s+)?(completed|finished|done|complete)|completed\s+(our|the|this)\s+lesson|concludes?\s+(our|the|this)\s+(lesson|chapter)|finished\s+(our|the|this)\s+(lesson|chapter)|completed\s+this\s+chapter|chapter\s+completed|wrap(s|ped)?\s+up\s+(our|the)\s+lesson|ready\s+for\s+(the\s+)?quiz|let'?s\s+(start|take)\s+(the\s+)?quiz)/i;

    const lastModelMsg = [...chatHistory].reverse().find(m => m.role === 'model');
    const textToCheck = `${lastModelMsg?.text || ''} ${liveOutput || ''}`;

    if (completionRegex.test(textToCheck)) {
      console.log("[LiveAvatar] Lesson completion detected from transcription:", textToCheck);
      setIsLessonCompleted(true);
      handleUpdateChapterStatus(selectedChapter.id, 'completed');
    }
  }, [chatHistory, liveOutput, isLessonCompleted, selectedChapter.id]);

  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    await switchMicrophone(newDeviceId);
  };

  const handleAudioOutputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAudioOutputId(e.target.value);
  };

  // Check if at least one valid chapter is selected to teach
  const hasChapterSelected = Boolean(
    selectedChapter &&
    selectedChapter.id &&
    selectedChapter.id !== EMPTY_CHAPTER.id &&
    selectedChapter.id !== 'empty-placeholder' &&
    allChapters.some(c => c.id === selectedChapter.id)
  );

  const handleConnect = () => {
    if (!hasChapterSelected) {
      setIsChapterModalOpen(true);
      return;
    }
    connect(selectedDeviceId);
  };

  const handleVideoStop = useCallback(() => {
    setVideoMode('none');
  }, []);

  // When chapter is changed by student (RAG Context Injection + Proactive Teaching Kickoff)
  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    try {
      localStorage.setItem('live_avatar_selected_chapter_id', chapter.id);
    } catch (e) {}

    const existingStatus = chapterStatuses[chapter.id];
    if (existingStatus === 'completed') {
      setIsLessonCompleted(true);
    } else {
      handleUpdateChapterStatus(chapter.id, 'in_progress');
      setIsLessonCompleted(false);
    }

    setActiveStudyTab('concepts');

    // Reset quiz for the new chapter
    setQuizState({
      isActive: false,
      currentIndex: 0,
      selectedAnswers: {},
      isAnswerSubmitted: {},
      score: 0,
      isCompleted: false,
      streak: 0
    });
    setAvatarMood('idle');

    if (isConnected) {
      const firstConcept = chapter.keyConcepts?.[0]?.title || chapter.title;
      const ragExcerpt = chapter.rawContent ? chapter.rawContent.slice(0, 4000) : chapter.summary;

      const ragPrompt = `[CHAPTER SWITCH & RAG KNOWLEDGE BASE]: We are now focusing on Chapter: "${chapter.title}".
CHAPTER RAG SUMMARY: ${chapter.summary}
OBJECTIVES: ${(chapter.objectives || []).join('; ')}
KEY CONCEPTS FROM CHAPTER: ${(chapter.keyConcepts || []).map(c => `${c.title}: ${c.summary}`).join(' | ')}
CHAPTER EXCERPT: ${ragExcerpt}

CRITICAL: Ground all explanations, examples, and answers strictly in this chapter!
Please warmly greet me to "${chapter.title}" in 2 punchy sentences, and proactively begin teaching our first core concept: "${firstConcept}" right now!`;

      sendTextMessage(ragPrompt);
    }
  };

  // Handle deleting chapter from chapters list, cache, and scoreboard
  const handleDeleteChapter = (chapterId: string) => {
    // 1. Remove from allChapters
    setAllChapters(prev => {
      const updated = prev.filter(c => c.id !== chapterId);
      try {
        localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Remove from chapterScores (Scoreboard)
    setChapterScores(prev => {
      const updated = { ...prev };
      delete updated[chapterId];
      try {
        localStorage.setItem('live_avatar_chapter_scores', JSON.stringify(updated));
        localStorage.setItem('ai_avatar_chapter_scores', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 3. Remove from chapterStatuses
    setChapterStatuses(prev => {
      const updated = { ...prev };
      delete updated[chapterId];
      try {
        localStorage.setItem('live_avatar_chapter_statuses', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 4. Fallback if current chapter was deleted
    setSelectedChapter(prev => {
      if (prev.id === chapterId) {
        const remaining = allChapters.filter(c => c.id !== chapterId);
        const next = remaining.length > 0 ? remaining[0] : EMPTY_CHAPTER;
        try {
          localStorage.setItem('live_avatar_selected_chapter_id', next.id);
        } catch (e) {}
        return next;
      }
      return prev;
    });
  };

  // Handle adding new uploaded chapter
  const handleAddChapter = (newChapter: Chapter) => {
    setAllChapters(prev => {
      const updated = [newChapter, ...prev.filter(c => c.id !== newChapter.id)];
      try {
        localStorage.setItem('live_avatar_pdf_chapters', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    handleSelectChapter(newChapter);
  };

  // Change active tutor persona
  const handleSelectPersona = (persona: AvatarPersona) => {
    setActivePersona(persona);
    setAvatarMood('talking');
    setTimeout(() => setAvatarMood('idle'), 3000);
  };

  // When teaching mode is changed
  const handleSetTeachingMode = (mode: TeachingMode) => {
    setTeachingMode(mode);
    if (mode === 'quiz' && !quizState.isActive) {
      handleStartQuiz();
    }
    if (isConnected) {
      const descriptions: Record<TeachingMode, string> = {
        socratic: 'Socratic Method: ask guiding, thought-provoking questions',
        eli5: 'Intuitive & Real-World: simplify with relatable everyday analogies',
        quiz: 'Quiz & Practice: quiz me on chapter key points and test my recall',
        deepdive: 'Deep Dive: provide rigorous technical explanations and proofs'
      };
      sendTextMessage(`[TEACHING MODE SWITCH]: Please switch your pedagogy to "${mode}". ${descriptions[mode]}. Acknowledge warmly in 1 punchy sentence.`);
    }
  };

  // Start Live Interactive Quiz Arena
  const handleStartQuiz = () => {
    // Ensure Study Board is open and Live Quiz tab is active
    setIsStudyBoardOpen(true);
    setActiveStudyTab('quiz');

    setQuizState({
      isActive: true,
      currentIndex: 0,
      selectedAnswers: {},
      isAnswerSubmitted: {},
      score: 0,
      isCompleted: false,
      streak: 0
    });
    setAvatarMood('talking');

    const firstQ = selectedChapter.quiz[0];
    if (isConnected && firstQ) {
      sendTextMessage(
        `[QUIZ STARTED]: Let's begin the chapter quiz for "${selectedChapter.title}"! Question 1: "${firstQ.question}". Choices are: ${firstQ.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(', ')}. Please read Question 1 to me with enthusiastic energy and invite my answer!`
      );
    }
  };

  // Student selects an option in the quiz HUD
  const handleSelectQuizOption = (qIndex: number, optionIndex: number) => {
    if (quizState.isAnswerSubmitted[qIndex]) return;

    const currentQ = selectedChapter.quiz[qIndex];
    const isCorrect = optionIndex === currentQ.correctIndex;

    const newScore = isCorrect ? quizState.score + 1 : quizState.score;
    const newStreak = isCorrect ? quizState.streak + 1 : 0;

    setQuizState(prev => ({
      ...prev,
      selectedAnswers: { ...prev.selectedAnswers, [qIndex]: optionIndex },
      isAnswerSubmitted: { ...prev.isAnswerSubmitted, [qIndex]: true },
      score: newScore,
      streak: newStreak
    }));

    setAvatarMood(isCorrect ? 'celebrating' : 'empathetic');

    if (isConnected) {
      const selectedLetter = String.fromCharCode(65 + optionIndex);
      const selectedText = currentQ.options[optionIndex];
      const correctLetter = String.fromCharCode(65 + currentQ.correctIndex);
      const correctText = currentQ.options[currentQ.correctIndex];

      if (isCorrect) {
        sendTextMessage(
          `[QUIZ ANSWER]: For Question ${qIndex + 1} ("${currentQ.question}"), I chose ${selectedLetter}: "${selectedText}". That is CORRECT! Please give me instant enthusiastic spoken praise, reinforce why this answer is correct according to "${selectedChapter.title}" in 2 sentences, and ask if I am ready for the next question!`
        );
      } else {
        sendTextMessage(
          `[QUIZ ANSWER]: For Question ${qIndex + 1} ("${currentQ.question}"), I chose ${selectedLetter}: "${selectedText}". The correct answer is ${correctLetter}: "${correctText}". Please give me gentle, encouraging feedback, verbally explain the chapter concept and why my choice was a common pitfall: "${currentQ.explanation}", and cheer me on!`
        );
      }
    }
  };

  const handleNextQuizQuestion = () => {
    setAvatarMood('idle');
    if (quizState.currentIndex < selectedChapter.quiz.length - 1) {
      const nextIndex = quizState.currentIndex + 1;
      setQuizState(prev => ({
        ...prev,
        currentIndex: nextIndex
      }));

      const nextQ = selectedChapter.quiz[nextIndex];
      if (isConnected) {
        sendTextMessage(
          `[QUIZ QUESTION]: Moving to Question ${nextIndex + 1} of ${selectedChapter.quiz.length}: "${nextQ.question}". Choices are: ${nextQ.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(', ')}. Please read it aloud and ask for my answer!`
        );
      }
    } else {
      // Quiz complete: Mark chapter as completed and save score!
      const totalQ = selectedChapter.quiz.length;
      const finalScore = quizState.score;
      const percentage = totalQ > 0 ? Math.round((finalScore / totalQ) * 100) : 0;

      const newScore: ChapterScore = {
        chapterId: selectedChapter.id,
        chapterTitle: selectedChapter.title,
        score: finalScore,
        total: totalQ,
        percentage,
        completedAt: new Date().toLocaleDateString(),
        details: selectedChapter.quiz.map((q, idx) => ({
          question: q.question,
          selectedOption: q.options[quizState.selectedAnswers[idx]] || 'Not answered',
          correctOption: q.options[q.correctIndex],
          isCorrect: quizState.selectedAnswers[idx] === q.correctIndex,
        }))
      };

      setChapterScores(prev => {
        const updated = { ...prev, [selectedChapter.id]: newScore };
        try {
          localStorage.setItem('ai_avatar_chapter_scores', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage save error:', e);
        }
        return updated;
      });

      setQuizState(prev => ({ ...prev, isCompleted: true, isActive: false }));
      setAvatarMood('celebrating');
      handleUpdateChapterStatus(selectedChapter.id, 'completed');
      setActiveStudyTab('scoreboard');
      setIsStudyBoardOpen(true);

      if (isConnected) {
        sendTextMessage(
          `[QUIZ COMPLETE]: I finished the quiz for "${selectedChapter.title}" with a score of ${finalScore} out of ${totalQ}! Please warmly congratulate me on completing this chapter quiz and review my achievement!`
        );
      }
    }
  };

  const handlePrevQuizQuestion = () => {
    if (quizState.currentIndex > 0) {
      setQuizState(prev => ({
        ...prev,
        currentIndex: prev.currentIndex - 1
      }));
    }
  };

  const handleAskTutorToSpeakQuestion = () => {
    const currentQ = selectedChapter.quiz[quizState.currentIndex];
    setAvatarMood('talking');
    if (isConnected && currentQ) {
      sendTextMessage(
        `${activePersona.name}, could you please read Question ${quizState.currentIndex + 1} to me aloud: "${currentQ.question}", and list out the options?`
      );
    }
  };

  const handleAskTutorForDeepExplanation = () => {
    const currentQ = selectedChapter.quiz[quizState.currentIndex];
    setAvatarMood('empathetic');
    if (isConnected && currentQ) {
      sendTextMessage(
        `${activePersona.name}, can you break down question #${quizState.currentIndex + 1} step-by-step from our chapter: "${currentQ.question}"? Why is "${currentQ.options[currentQ.correctIndex]}" the right answer?`
      );
    }
  };

  // Send prompt from study board chips
  const handleSendPrompt = (promptText: string) => {
    if (isConnected) {
      setAvatarMood('talking');
      sendTextMessage(promptText);
    }
  };

  const error = deviceError || sessionError;
  const isLoading = isConnecting;
  const currentChapterStatus = chapterStatuses[selectedChapter.id] || 'in_progress';

  if (!isLoggedIn) {
    return (
      <StudentLoginView
        initialStudentName={studentName}
        initialClassName={studentClass}
        onEnterClassroom={(name, grade) => {
          setStudentName(name);
          setStudentClass(grade);
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950 text-white' : 'bg-slate-100 text-slate-800'}`}>
      {/* Left: Live Transcription & Dialogue */}
      <TranscriptionPanel
        isOpen={isTranscriptionPanelOpen}
        onClose={() => setIsTranscriptionPanelOpen(false)}
        history={chatHistory}
        chatHistory={chatHistory}
        liveInput={liveInput}
        liveOutput={liveOutput}
        onSendMessage={sendTextMessage}
        isConnected={isConnected}
        isAvatarVisible={isAvatarVisible}
        activePersona={activePersona}
        studentName={studentName}
        className={studentClass}
        onLogout={() => {
          disconnect();
          setIsLoggedIn(false);
        }}
      />

      {/* Center: Live Avatar Stage */}
      <div className="relative flex-1 flex flex-col items-center justify-between pb-4 transition-all duration-300 min-w-0">
        <TopBar
          isTranscriptionPanelOpen={isTranscriptionPanelOpen}
          setIsTranscriptionPanelOpen={setIsTranscriptionPanelOpen}
          isStudyBoardOpen={isStudyBoardOpen}
          setIsStudyBoardOpen={setIsStudyBoardOpen}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
          theme={theme}
          setTheme={setTheme}
          isAvatarVisible={isAvatarVisible}
          setIsAvatarVisible={setIsAvatarVisible}
        />

        <DebugPanel showDebug={showDebug} debugStats={debugStats} />

        {/* Stage Content: Real AI Avatar Stage + Control Bar (Centered & completely unobstructed) */}
        <div className="w-full flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 overflow-y-auto">
          <div className="flex flex-col items-center justify-center w-full max-w-2xl shrink-0 gap-3">
            <AvatarDisplay
              videoRef={videoRef}
              hasVideo={hasVideo}
              isConnected={isConnected}
              isLoading={isLoading}
              error={error}
              isAvatarVisible={isAvatarVisible}
              agentTalking={agentTalking}
              selectedChapter={selectedChapter}
              activePersona={activePersona}
              onSelectPersona={handleSelectPersona}
              avatarMood={avatarMood}
              onSendPrompt={handleSendPrompt}
              hasChapterSelected={hasChapterSelected}
            />

            <ControlBar
              isConnected={isConnected}
              isConnecting={isConnecting}
              isLoading={isLoading}
              connect={handleConnect}
              disconnect={disconnect}
              isMuted={isMuted}
              toggleMute={() => setIsMuted(!isMuted)}
              audioDevices={audioDevices}
              selectedDeviceId={selectedDeviceId}
              handleDeviceChange={handleDeviceChange}
              audioOutputDevices={audioOutputDevices}
              selectedAudioOutputId={selectedAudioOutputId}
              handleAudioOutputChange={handleAudioOutputChange}
              videoMode={videoMode}
              setVideoMode={setVideoMode}
              videoDevices={videoDevices}
              selectedVideoDeviceId={selectedVideoDeviceId}
              setSelectedVideoDeviceId={setSelectedVideoDeviceId}
              hasChapterSelected={hasChapterSelected}
              onOpenChapterModal={() => setIsChapterModalOpen(true)}
              tutorName={activePersona.name}
            />
          </div>
        </div>
      </div>

      {/* Right: Study Board (Concepts, Live Quiz Launcher & Chapter-Wise Scoreboard) */}
      {isStudyBoardOpen && (
        <StudyBoard
          chapter={selectedChapter}
          teachingMode={teachingMode}
          onSetTeachingMode={handleSetTeachingMode}
          onSendPrompt={handleSendPrompt}
          isConnected={isConnected}
          onOpenChapterModal={() => setIsChapterModalOpen(true)}
          quizState={quizState}
          onStartQuiz={handleStartQuiz}
          onSelectQuizOption={handleSelectQuizOption}
          onResetQuiz={() => {
            setQuizState({
              isActive: false,
              currentIndex: 0,
              selectedAnswers: {},
              isAnswerSubmitted: {},
              score: 0,
              isCompleted: false,
              streak: 0
            });
            setAvatarMood('idle');
            setChapterScores(prev => {
              const updated = { ...prev };
              delete updated[selectedChapter.id];
              try {
                localStorage.setItem('ai_avatar_chapter_scores', JSON.stringify(updated));
              } catch (e) {
                console.warn('LocalStorage save error:', e);
              }
              return updated;
            });
          }}
          chapterStatus={currentChapterStatus}
          onUpdateChapterStatus={handleUpdateChapterStatus}
          isLessonCompleted={isLessonCompleted}
          onUnlockQuiz={() => {
            setIsLessonCompleted(true);
            handleUpdateChapterStatus(selectedChapter.id, 'completed');
          }}
          chapterScores={chapterScores}
          allChapters={allChapters}
          onSelectChapter={handleSelectChapter}
          activeTab={activeStudyTab}
          onSetActiveTab={setActiveStudyTab}
          onNextQuizQuestion={handleNextQuizQuestion}
          onPrevQuizQuestion={handlePrevQuizQuestion}
          onCloseQuiz={() => {
            setQuizState(prev => ({ ...prev, isActive: false }));
            setAvatarMood('idle');
          }}
          onAskTutorToSpeakQuestion={handleAskTutorToSpeakQuestion}
          onAskTutorForDeepExplanation={handleAskTutorForDeepExplanation}
        />
      )}

      {/* Student WebCam PIP (Share Notebook / Screen with Tutor) */}
      <UserWebCamDisplay
        videoMode={videoMode}
        deviceId={selectedVideoDeviceId}
        videoRef={webcamVideoRef}
        onVideoStop={handleVideoStop}
      />

      {/* Chapter Selection Modal */}
      <ChapterSelectorModal
        isOpen={isChapterModalOpen}
        onClose={() => setIsChapterModalOpen(false)}
        selectedChapter={selectedChapter}
        onSelectChapter={handleSelectChapter}
        chapterStatuses={chapterStatuses}
        onUpdateChapterStatus={handleUpdateChapterStatus}
        onDeleteChapter={handleDeleteChapter}
        onAddChapter={handleAddChapter}
        chapters={allChapters}
      />
    </div>
  );
};

export default App;
