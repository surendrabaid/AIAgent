import './vertex-ai-proxy-interceptor.js';
import React, { useState, useRef, useCallback } from 'react';
import { TranscriptionPanel } from './components/TranscriptionPanel';
import { UserWebCamDisplay } from './components/UserWebCamDisplay';
import { TopBar } from './components/TopBar';
import { DebugPanel } from './components/DebugPanel';
import { AvatarDisplay } from './components/AvatarDisplay';
import { ControlBar } from './components/ControlBar';
import { StudyBoard } from './components/StudyBoard';
import { ChapterSelectorModal } from './components/ChapterSelectorModal';
import { LiveQuizOverlay } from './components/LiveQuizOverlay';
import { useTheme } from './hooks/useTheme';
import { useMediaDevices } from './hooks/useMediaDevices';
import { useLiveSession } from './hooks/useLiveSession';
import { CURRICULUM_DATA } from './data/curriculum';
import { TUTOR_PERSONAS } from './data/avatars';
import { VideoMode, Chapter, TeachingMode, QuizSessionState, AvatarPersona, AvatarMood } from './types';

interface LiveAvatarAppProps {
  onBackToSelection?: () => void;
}

const LiveAvatarApp: React.FC<LiveAvatarAppProps> = ({ onBackToSelection }) => {
  const { theme, setTheme } = useTheme();
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

  // Curriculum, Avatar Persona & Mood States
  const [selectedChapter, setSelectedChapter] = useState<Chapter>(CURRICULUM_DATA[0].chapters[0]);
  const [activePersona, setActivePersona] = useState<AvatarPersona>(TUTOR_PERSONAS[0]);
  const [avatarMood, setAvatarMood] = useState<AvatarMood>('idle');
  const [teachingMode, setTeachingMode] = useState<TeachingMode>('socratic');
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);

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
  } = useLiveSession(selectedAudioOutputId, isMuted, videoMode !== 'none', webcamVideoRef);

  const handleDeviceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    await switchMicrophone(newDeviceId);
  };

  const handleAudioOutputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAudioOutputId(e.target.value);
  };

  const handleConnect = () => {
    connect(selectedDeviceId);
  };

  const handleVideoStop = useCallback(() => {
    setVideoMode('none');
  }, []);

  // When chapter is changed by student
  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
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
      const modeInstruction =
        teachingMode === 'socratic'
          ? 'Use Socratic questioning to see what I already know and guide me.'
          : teachingMode === 'eli5'
          ? 'Use simple everyday metaphors and intuitive analogies.'
          : teachingMode === 'quiz'
          ? 'Give me a quick practice problem to solve step-by-step.'
          : 'Give me a rigorous deep-dive explanation.';

      sendTextMessage(
        `Let's switch our focus to Chapter: "${chapter.title}". ${modeInstruction} Please give me a warm greeting to this chapter and ask where we should begin!`
      );
    }
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
        socratic: "Please switch to Socratic mode: ask me guiding questions rather than lecturing.",
        eli5: "Please switch to Intuitive / ELI5 mode: explain concepts with clear real-world analogies.",
        quiz: "Please switch to Quiz mode: test my understanding with practice questions.",
        deepdive: "Please switch to Deep Dive mode: explain with academic rigor and formulas."
      };
      sendTextMessage(`[Teaching Mode Changed]: ${descriptions[mode]}`);
    }
  };

  // Launch Live Interactive Quiz
  const handleStartQuiz = () => {
    setQuizState({
      isActive: true,
      currentIndex: 0,
      selectedAnswers: {},
      isAnswerSubmitted: {},
      score: 0,
      isCompleted: false,
      streak: 0
    });
    setAvatarMood('thinking');

    const firstQ = selectedChapter.quiz[0];
    const promptText = `[QUIZ START]: I am starting the interactive quiz on "${selectedChapter.title}". Please enthusiastically announce the quiz! Then read Question 1: "${firstQ.question}", read out the choices: ${firstQ.options.map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`).join(', ')}, and invite me to answer!`;

    if (isConnected) {
      sendTextMessage(promptText);
    } else {
      connect(selectedDeviceId);
      setTimeout(() => {
        sendTextMessage(promptText);
      }, 1500);
    }
  };

  // Handle student answering an interactive quiz option
  const handleSelectQuizOption = (qIndex: number, optIndex: number) => {
    const currentQ = selectedChapter.quiz[qIndex];
    if (!currentQ || quizState.isAnswerSubmitted[qIndex]) return;

    const isCorrect = optIndex === currentQ.correctIndex;
    const newScore = isCorrect ? quizState.score + 1 : quizState.score;
    const newStreak = isCorrect ? quizState.streak + 1 : 0;

    setQuizState(prev => ({
      ...prev,
      selectedAnswers: { ...prev.selectedAnswers, [qIndex]: optIndex },
      isAnswerSubmitted: { ...prev.isAnswerSubmitted, [qIndex]: true },
      score: newScore,
      streak: newStreak
    }));

    // Trigger instant visual avatar reaction
    if (isCorrect) {
      setAvatarMood('celebrating');
      setTimeout(() => setAvatarMood('talking'), 3500);
    } else {
      setAvatarMood('empathetic');
      setTimeout(() => setAvatarMood('talking'), 3500);
    }

    // Trigger instant verbal reaction from Tutor
    if (isConnected) {
      const selectedLetter = String.fromCharCode(65 + optIndex);
      const correctLetter = String.fromCharCode(65 + currentQ.correctIndex);
      const selectedText = currentQ.options[optIndex];
      const correctText = currentQ.options[currentQ.correctIndex];

      if (isCorrect) {
        sendTextMessage(
          `[QUIZ ANSWER]: For Question ${qIndex + 1} ("${currentQ.question}"), I chose ${selectedLetter}: "${selectedText}". That is CORRECT! Please give me instant enthusiastic spoken praise, reinforce why this answer is correct in 2 sentences, and ask if I am ready for the next question!`
        );
      } else {
        sendTextMessage(
          `[QUIZ ANSWER]: For Question ${qIndex + 1} ("${currentQ.question}"), I chose ${selectedLetter}: "${selectedText}". The correct answer is ${correctLetter}: "${correctText}". Please give me gentle, encouraging feedback, verbally explain the core concept and why my choice was a common misconception: "${currentQ.explanation}", and cheer me on!`
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
      // Quiz complete
      setQuizState(prev => ({ ...prev, isCompleted: true }));
      setAvatarMood('celebrating');
      if (isConnected) {
        sendTextMessage(
          `[QUIZ COMPLETE]: I finished the quiz for "${selectedChapter.title}" with a score of ${quizState.score} out of ${selectedChapter.quiz.length}! Please give me a celebratory summary of my performance, praise my dedication, and give a quick study tip!`
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
        `${activePersona.name}, can you break down question #${quizState.currentIndex + 1} step-by-step: "${currentQ.question}"? Why is "${currentQ.options[currentQ.correctIndex]}" the right answer?`
      );
    }
  };

  // Send prompt from study board chips
  const handleSendPrompt = (promptText: string) => {
    setAvatarMood('listening');
    if (isConnected) {
      sendTextMessage(promptText);
    } else {
      // Connect first, then send
      connect(selectedDeviceId);
      setTimeout(() => {
        sendTextMessage(promptText);
      }, 1500);
    }
  };

  const error = deviceError || sessionError;
  const isLoading = isConnecting || isWaitingForVideo;

  return (
    <div className="flex w-full h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Left: Live Transcription & Dialogue */}
      <TranscriptionPanel
        isOpen={isTranscriptionPanelOpen}
        onClose={() => setIsTranscriptionPanelOpen(false)}
        history={chatHistory}
        liveInput={liveInput}
        liveOutput={liveOutput}
        onSendMessage={sendTextMessage}
        isConnected={isConnected}
        isAvatarVisible={isAvatarVisible}
      />

      {/* Center: Live Avatar Stage */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-3 pb-4 pt-14 transition-all duration-300 min-w-0">
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
          selectedChapter={selectedChapter}
          onOpenChapterModal={() => setIsChapterModalOpen(true)}
          activePersona={activePersona}
          onSelectPersona={handleSelectPersona}
          onBackToSelection={() => {
            disconnect();
            if (onBackToSelection) {
              onBackToSelection();
            }
          }}
        />

        <DebugPanel showDebug={showDebug} debugStats={debugStats} />

        {/* Real AI Avatar Display Stage */}
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
        />

        {/* Live Interactive Quiz HUD on Avatar Stage */}
        <LiveQuizOverlay
          chapter={selectedChapter}
          quizState={quizState}
          onSelectOption={(optIdx) => handleSelectQuizOption(quizState.currentIndex, optIdx)}
          onNextQuestion={handleNextQuizQuestion}
          onPrevQuestion={handlePrevQuizQuestion}
          onRestartQuiz={handleStartQuiz}
          onCloseQuiz={() => {
            setQuizState(prev => ({ ...prev, isActive: false }));
            setAvatarMood('idle');
          }}
          onAskTutorToSpeakQuestion={handleAskTutorToSpeakQuestion}
          onAskTutorForDeepExplanation={handleAskTutorForDeepExplanation}
          isConnected={isConnected}
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
        />
      </div>

      {/* Right: Study Board (Concepts, Practice Quiz & Tutor Prompts) */}
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
          }}
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
      />
    </div>
  );
};

export default LiveAvatarApp;
