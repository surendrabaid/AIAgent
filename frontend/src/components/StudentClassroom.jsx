import React, { useState, useEffect, useRef, useCallback } from 'react';
import LiveTutorStage from './LiveTutorStage';
import AvatarCanvas from './AvatarCanvas';
import SlideBoard from './SlideBoard';
import { Volume2, Mic, Tv, ArrowRight, ArrowLeft, Star, Award, CheckCircle, CheckCircle2, HelpCircle, MessageSquare, Sparkles, Send, Brain, Sliders, RefreshCw, AlertCircle, ThumbsUp, HelpCircle as HelpIcon, Smile, Pause, Play } from 'lucide-react';

export default function StudentClassroom({ sessionData, onLessonFinished, onBackToSetup }) {
  const [currentResponse, setCurrentResponse] = useState(sessionData?.current_response || null);
  const [lessonPlan, setLessonPlan] = useState(sessionData?.lesson_plan || null);
  const [avatarConfig, setAvatarConfig] = useState(sessionData?.avatar_config || { gender: 'female', name: 'Joya' });
  const [childName, setChildName] = useState(sessionData?.child_name || 'Tisha');

  // Gemini Live Avatar Stage Ref & Mood
  const liveTutorRef = useRef(null);
  const isExplainingLessonRef = useRef(false);
  const [avatarMood, setAvatarMood] = useState('idle');
  
  // Audio & Viseme state
  const [currentViseme, setCurrentViseme] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Available Voices & Indian Voice selection
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  
  // Interactive Doubt Clarification State
  const [studentDoubtText, setStudentDoubtText] = useState('');
  const [doubtsList, setDoubtsList] = useState([]);
  const [activeDoubt, setActiveDoubt] = useState(null); // { query, explanation, visemes }
  const [pendingLessonResponse, setPendingLessonResponse] = useState(null); // holds lesson state to resume
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  
  // D-Pad Remote Focus State for TV
  const [focusedOptionIdx, setFocusedOptionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  const [stars, setStars] = useState(5);

  // Topic Teaching completion & QnA readiness state
  const [isTopicTeachingOver, setIsTopicTeachingOver] = useState(false);
  const [isQuizReady, setIsQuizReady] = useState(false);
  const [isTeachingPaused, setIsTeachingPaused] = useState(false);

  const visemeIntervalRef = useRef(null);

  // Helper to pick the appropriate voice based on teacher gender
  const pickTargetVoice = (voices, gender) => {
    if (!voices || voices.length === 0) return null;
    const isMale = gender === 'male';

    if (isMale) {
      // 1. Look for Microsoft Ravi or any voice named Ravi
      const ravi = voices.find(v => v.name.toLowerCase().includes('ravi'));
      if (ravi) return ravi;
      // 2. Any Indian male voice
      const indianMale = voices.find(v => 
        (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('hi-in') || v.name.toLowerCase().includes('india')) &&
        (v.name.toLowerCase().includes('male') || (!v.name.toLowerCase().includes('heera') && !v.name.toLowerCase().includes('priya') && !v.name.toLowerCase().includes('neerja') && !v.name.toLowerCase().includes('zira')))
      );
      if (indianMale) return indianMale;
      // 3. Any male voice
      const anyMale = voices.find(v => v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('mark') || v.name.toLowerCase().includes('male'));
      if (anyMale) return anyMale;
    } else {
      // 1. Look for Microsoft Heera or any voice named Heera
      const heera = voices.find(v => v.name.toLowerCase().includes('heera'));
      if (heera) return heera;
      // 2. Priya / Neerja or explicitly female Indian voice (exclude Ravi, David, Mark)
      const indianFemale = voices.find(v => 
        (v.name.toLowerCase().includes('priya') || v.name.toLowerCase().includes('neerja') || (v.lang.toLowerCase().includes('en-in') && !v.name.toLowerCase().includes('ravi') && !v.name.toLowerCase().includes('david')))
      );
      if (indianFemale) return indianFemale;
      // 3. Fallback female voice (e.g. Zira, Jenny, Cortana, or female)
      const anyFemale = voices.find(v => 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('jenny')) &&
        !v.name.toLowerCase().includes('ravi') && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('mark')
      );
      if (anyFemale) return anyFemale;
      // 4. Any voice that does NOT contain male indicators
      const notMale = voices.find(v => !v.name.toLowerCase().includes('ravi') && !v.name.toLowerCase().includes('david') && !v.name.toLowerCase().includes('mark') && !v.name.toLowerCase().includes('male'));
      if (notMale) return notMale;
    }

    // Default fallback
    return voices[0];
  };

  // Automatically set voice based on Teacher Gender:
  // Female Teacher -> Microsoft Heera (or Indian Female)
  // Male Teacher   -> Microsoft Ravi  (or Indian Male)
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);
          const targetVoice = pickTargetVoice(voices, avatarConfig?.gender);
          if (targetVoice) {
            setSelectedVoiceURI(targetVoice.voiceURI);
          }
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [avatarConfig?.gender]);

  // Sync state whenever sessionData prop updates
  useEffect(() => {
    if (sessionData) {
      if (sessionData.current_response) setCurrentResponse(sessionData.current_response);
      if (sessionData.lesson_plan) setLessonPlan(sessionData.lesson_plan);
      if (sessionData.avatar_config) setAvatarConfig(sessionData.avatar_config);
      if (sessionData.child_name) setChildName(sessionData.child_name);
    }
  }, [sessionData]);

  // Fallback initial load if currentResponse is null
  useEffect(() => {
    if (!currentResponse) {
      fetch('http://localhost:8000/api/sample-lesson')
        .then((res) => res.json())
        .then((plan) => {
          setLessonPlan(plan);
          return fetch(`http://localhost:8000/api/start-lesson?curriculum_id=${plan.curriculum_id}&child_name=${encodeURIComponent(childName)}&avatar_name=Miss%20Priya`, { method: 'POST' });
        })
        .then((res) => res.json())
        .then((data) => {
          if (data.current_response) setCurrentResponse(data.current_response);
          if (data.lesson_plan) setLessonPlan(data.lesson_plan);
        })
        .catch((err) => console.warn('Local fallback:', err));
    }
  }, [currentResponse]);

  // Trigger speech synthesis & viseme animation on new teacher response
  useEffect(() => {
    if (currentResponse?.speech_text) {
      // Prevent repeating the exact same speech text twice
      if (lastSpokenSpeechRef.current === currentResponse.speech_text) {
        return;
      }
      lastSpokenSpeechRef.current = currentResponse.speech_text;

      // If this is a topic lesson explanation (no pending eval and no active doubt)
      const isLesson = !evalResult && !activeDoubt && !isQuizReady;
      if (isLesson) {
        setIsTopicTeachingOver(false);
        setIsQuizReady(false);
      }
      speakTeacherResponse(currentResponse.speech_text, currentResponse.visemes, isLesson);
    }
  }, [currentResponse?.speech_text, currentResponse?.topic_id]);

  // Stop all speech synthesis and viseme timers
  const stopAllSpeechAndSession = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current);
      visemeIntervalRef.current = null;
    }
    if (liveTutorRef.current?.disconnect) {
      liveTutorRef.current.disconnect();
    }
    setIsSpeaking(false);
    setCurrentViseme(null);
  };

  // Callback when live avatar starts or stops talking
  const handleAgentTalkingChange = useCallback((talking) => {
    setIsSpeaking(talking);
    if (!talking) {
      setAvatarMood('idle');
      // Only mark topic teaching as finished if this utterance was the actual lesson explanation!
      if (isExplainingLessonRef.current) {
        isExplainingLessonRef.current = false;
        setIsTopicTeachingOver(true);
      }
    }
  }, []);

  // Callback when student speaks a doubt directly into the live avatar microphone
  const handleSpokenDoubtAnswered = useCallback((userDoubt, teacherAnswer) => {
    if (!userDoubt || !teacherAnswer) return;
    setDoubtsList((prev) => [...prev, { query: userDoubt, explanation: teacherAnswer }]);
    setActiveDoubt({
      query: userDoubt,
      explanation: teacherAnswer,
      action_type: 'answer_doubt'
    });
  }, []);

  // Ensure speech synthesis and viseme timers are cleanly stopped on unmount
  useEffect(() => {
    return () => {
      stopAllSpeechAndSession();
    };
  }, []);

  // Handler for Exit to Setup
  const handleExitToSetup = () => {
    stopAllSpeechAndSession();
    if (onBackToSetup) {
      onBackToSetup();
    }
  };

  // Handler for Pause / Resume Teaching
  const handleTogglePauseTeaching = () => {
    setIsTeachingPaused((prev) => {
      const next = !prev;
      if (next) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        if (liveTutorRef.current?.pauseAudio) {
          liveTutorRef.current.pauseAudio();
        }
      } else {
        if (liveTutorRef.current?.resumeAudio) {
          liveTutorRef.current.resumeAudio();
        }
        if (!liveTutorRef.current?.isConnected && currentResponse?.speech_text) {
          speakTeacherResponse(currentResponse.speech_text, currentResponse.visemes || [], false);
        }
      }
      return next;
    });
  };

  // Keyboard Event Listener for Android TV Remote D-Pad Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const optionsCount = currentResponse?.question?.options?.length || 0;
      if (optionsCount === 0) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        setFocusedOptionIdx((prev) => (prev + 1) % optionsCount);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        setFocusedOptionIdx((prev) => (prev - 1 + optionsCount) % optionsCount);
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!isEvaluating && !(evalResult && evalResult.is_correct)) {
          handleOptionSubmit(focusedOptionIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedOptionIdx, currentResponse, isEvaluating, evalResult]);

  const spokenCharIndexRef = useRef(0);
  const currentSpokenTextRef = useRef('');
  const lastSpokenSpeechRef = useRef('');

  // Speech synthesis is handled directly and exclusively by the Gemini Live Avatar stream
  const speakTeacherResponse = (text, visemes, isTopicLesson = false) => {
    // When starting a new lesson explanation, ensure topic teaching is not marked over until this finishes
    if (isTopicLesson) {
      setIsTopicTeachingOver(false);
      setIsQuizReady(false);
      isExplainingLessonRef.current = true;
    }
    currentSpokenTextRef.current = text || '';

    // Always dispatch directive to Gemini Live Avatar (LiveTutorStage queues if connecting)
    if (liveTutorRef.current) {
      setAvatarMood('talking');
      const promptText = isTopicLesson
        ? `[LESSON EXPLANATION]: Please explain this topic concept warmly to ${childName}: "${text}". Keep it conversational, lively, and encouraging.`
        : `[TEACHER SAYS]: Speak this warmly to ${childName}: "${text}"`;
      liveTutorRef.current.sendPrompt(promptText);
      return;
    }

    // Fallback: If ref was attaching, retry in 200ms
    setTimeout(() => {
      if (liveTutorRef.current) {
        setAvatarMood('talking');
        const promptText = isTopicLesson
          ? `[LESSON EXPLANATION]: Please explain this topic concept warmly to ${childName}: "${text}". Keep it conversational, lively, and encouraging.`
          : `[TEACHER SAYS]: Speak this warmly to ${childName}: "${text}"`;
        liveTutorRef.current.sendPrompt(promptText);
      }
    }, 200);
  };

  // Student Interactive Feedback Check Handler ("I Understood!" vs "Please Explain Again!")
  const handleFeedbackCheck = async (understood) => {
    setIsFeedbackSubmitting(true);
    setSelectedOption(null);
    setEvalResult(null);
    try {
      const res = await fetch('http://localhost:8000/api/feedback-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData?.session_id || 'sess_demo',
          understood: understood
        })
      });
      const responsePayload = await res.json();
      setIsFeedbackSubmitting(false);
      if (understood) {
        setIsQuizReady(true);
      }
      lastSpokenSpeechRef.current = responsePayload.speech_text;
      setCurrentResponse(responsePayload);
      speakTeacherResponse(responsePayload.speech_text, responsePayload.visemes, false);
    } catch (err) {
      console.warn('Feedback check error fallback:', err);
      setIsFeedbackSubmitting(false);
      if (understood) {
        setIsQuizReady(true);
      }
    }
  };

  // Handle Interactive Doubt Clarification with Full Conversational Memory & Lesson Pause
  const handleAskDoubt = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!studentDoubtText || !studentDoubtText.trim()) return;

    // 1. Immediately STOP ongoing teacher speech so teacher listens to query
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current);
    }
    setIsSpeaking(false);
    setCurrentViseme(null);

    // Save what the teacher was teaching before doubt so we can resume smoothly from exact statement
    if (!pendingLessonResponse && currentResponse) {
      setPendingLessonResponse({
        ...currentResponse,
        original_speech_text: currentSpokenTextRef.current || currentResponse.speech_text,
        interrupted_char_index: spokenCharIndexRef.current || 0
      });
    }

    const query = studentDoubtText.trim();
    setStudentDoubtText('');
    setIsThinking(true);

    try {
      const res = await fetch('http://localhost:8000/api/ask-doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData?.session_id || 'sess_demo',
          student_query: query
        })
      });

      const doubtData = await res.json();
      setIsThinking(false);

      const rawExplanation = doubtData?.teacher_explanation;
      const explanation = typeof rawExplanation === 'string'
        ? rawExplanation
        : (rawExplanation?.teacher_explanation || JSON.stringify(rawExplanation || ''));
      const visemes = doubtData?.visemes || [];

      // Record in doubt history
      setDoubtsList((prev) => [...prev, { query, explanation }]);

      // Set active doubt state to show clear doubt clarification banner
      setActiveDoubt({
        query,
        explanation,
        action_type: doubtData?.action_type || 'answer_doubt',
        switched_topic_id: doubtData?.switched_topic_id,
        switched_slide: doubtData?.slide,
        switched_question: doubtData?.question
      });

      // 2. Teacher immediately speaks and explains the student's doubt!
      speakTeacherResponse(explanation, visemes);
    } catch (err) {
      console.warn('Fallback doubt handling:', err);
      setIsThinking(false);
      const fallbackAns = `That is a wonderful question, ${childName}! In this chapter, '${query}' helps us understand the fundamental ideas. Is it clear now, ${childName}? Shall we continue with what we were learning?`;
      setDoubtsList((prev) => [...prev, { query, explanation: fallbackAns }]);
      setActiveDoubt({
        query,
        explanation: fallbackAns,
        action_type: 'answer_doubt'
      });
      speakTeacherResponse(fallbackAns, []);
    }
  };

  // Helper to extract remaining sentences from the exact interrupted position
  const getRemainingLessonText = (fullText, charIdx) => {
    if (!fullText) return '';
    if (!charIdx || charIdx <= 0) return fullText;

    // If interrupted near the very end, return full text or last sentence
    if (charIdx >= fullText.length - 15) {
      return fullText;
    }

    // Find the start of the current or next sentence near charIdx
    // Look backwards up to 60 chars for punctuation to get sentence boundary
    const lookback = Math.max(0, charIdx - 60);
    const sub = fullText.substring(lookback, charIdx);
    const lastPunctuationOffset = Math.max(
      sub.lastIndexOf('. '),
      sub.lastIndexOf('! '),
      sub.lastIndexOf('? ')
    );

    let startPos = charIdx;
    if (lastPunctuationOffset !== -1) {
      // Resume from the beginning of the sentence that was being spoken
      startPos = lookback + lastPunctuationOffset + 2;
    } else {
      // Find start of current word
      while (startPos > 0 && fullText[startPos - 1] !== ' ') {
        startPos--;
      }
    }

    const remaining = fullText.slice(startPos).trim();
    return remaining || fullText;
  };

  // Student confirms doubt is clear: "Yeah, I am clear! Let's continue"
  const handleResumeLessonAfterDoubt = (userConfirmed = true) => {
    if (!userConfirmed) {
      // Student wants further re-explanation of the doubt
      if (activeDoubt) {
        setStudentDoubtText(`Please explain '${activeDoubt.query}' once more in an even simpler way!`);
      }
      return;
    }

    // Stop current doubt speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentViseme(null);

    // Check if the doubt requested switching to a different topic
    if (activeDoubt?.action_type === 'switch_topic' && activeDoubt.switched_slide) {
      const switchedTopic = lessonPlan?.topics?.find(t => t.topic_id === activeDoubt.switched_topic_id);
      const speech = `Shabash ${childName}! Let's now explore ${switchedTopic ? switchedTopic.title : 'this unit'} together!`;
      setCurrentResponse({
        topic_id: activeDoubt.switched_topic_id || 'topic_1',
        speech_text: speech,
        slide: activeDoubt.switched_slide,
        question: activeDoubt.switched_question
      });
      setSelectedOption(null);
      setEvalResult(null);
      setPendingLessonResponse(null);
      setActiveDoubt(null);
      setTimeout(() => {
        speakTeacherResponse(speech, []);
      }, 150);
      return;
    }

    // Otherwise, RESUME the topic from the EXACT STATEMENT where student interrupted!
    const resumeResponse = pendingLessonResponse || currentResponse;
    setActiveDoubt(null);
    setPendingLessonResponse(null);

    if (resumeResponse) {
      const origText = resumeResponse.original_speech_text || resumeResponse.speech_text || '';
      const charIdx = resumeResponse.interrupted_char_index || 0;
      const remainingSentence = getRemainingLessonText(origText, charIdx);

      const resumeSpeech = `Bahut achha, ${childName}! Continuing where we paused: ${remainingSentence}`;
      setCurrentResponse({
        ...resumeResponse,
        speech_text: resumeSpeech
      });

      // Clear any previous interval and trigger speech reliably after short timeout
      if (visemeIntervalRef.current) clearInterval(visemeIntervalRef.current);
      setTimeout(() => {
        speakTeacherResponse(resumeSpeech, []);
      }, 150);
    }
  };

  const recognitionRef = useRef(null);

  const startVoiceInput = () => {
    // 1. Immediately STOP ongoing teacher speech as soon as student clicks "Speak"!
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (visemeIntervalRef.current) {
      clearInterval(visemeIntervalRef.current);
    }
    setIsSpeaking(false);
    setCurrentViseme(null);

    // Save current lesson state along with exact position so teacher can resume from exact sentence
    if (!pendingLessonResponse && currentResponse) {
      setPendingLessonResponse({
        ...currentResponse,
        original_speech_text: currentSpokenTextRef.current || currentResponse.speech_text,
        interrupted_char_index: spokenCharIndexRef.current || 0
      });
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback if browser doesn't support Web Speech API
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const teacherName = avatarConfig?.name || 'Teacher';
        const simQuery = `${teacherName}, can you explain this topic again simply?`;
        setStudentDoubtText(simQuery);
      }, 1500);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-IN'; // Indian English, fallback handles standard
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setStudentDoubtText(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone permission was denied. Please allow microphone access in your browser to speak your doubt!');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech recognition launch error:', err);
      setIsListening(false);
    }
  };

  const handleOptionSubmit = async (idx) => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setSelectedOption(idx);
    const chosenText = currentResponse?.question?.options?.[idx] || '';
    const qId = currentResponse?.question?.question_id || null;
    
    try {
      const res = await fetch('http://localhost:8000/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData?.session_id || 'sess_demo',
          topic_id: currentResponse?.topic_id || 'topic_1',
          submission_type: 'dpad_option',
          selected_option_index: idx,
          selected_option_text: chosenText,
          question_id: qId
        })
      });

      const evalData = await res.json();
      setEvalResult(evalData);
      
      if (evalData.is_correct) {
        setStars((prev) => prev + 1);
        setAvatarMood('celebrating');
      } else {
        setAvatarMood('empathetic');
      }

      if (liveTutorRef.current?.isConnected) {
        const isCorrect = evalData.is_correct;
        const evalPrompt = isCorrect
          ? `[QUIZ RESULT]: ${childName} answered "${chosenText}". That is CORRECT! Cheer and congratulate them warmly: "${evalData.teacher_verbal_response}"`
          : `[QUIZ RESULT]: ${childName} answered "${chosenText}". That is incorrect. Be gentle, encouraging, and explain: "${evalData.teacher_verbal_response}"`;
        liveTutorRef.current.sendPrompt(evalPrompt);
      } else {
        speakTeacherResponse(evalData.teacher_verbal_response, []);
      }

      // If correct and topic has more questions, smoothly transition to next question
      if (evalData.is_correct && !evalData.topic_completed && evalData.next_question) {
        setTimeout(() => {
          setSelectedOption(null);
          setEvalResult(null);
          setIsEvaluating(false);
          setCurrentResponse((prev) => ({
            ...prev,
            question: evalData.next_question,
            question_index: evalData.question_index,
            total_topic_questions: evalData.total_topic_questions
          }));
        }, 2200);
      } else if (!evalData.is_correct) {
        // Reset selectedOption, unlock evaluation and swap follow-up remedial question in sync
        setTimeout(() => {
          setSelectedOption(null);
          setIsEvaluating(false);
          if (evalData.next_question) {
            setCurrentResponse((prev) => ({
              ...prev,
              question: evalData.next_question
            }));
          }
        }, 1200);
      } else {
        setIsEvaluating(false);
      }

      if (evalData.lesson_completed) {
        setTimeout(() => {
          onLessonFinished(sessionData?.session_id || 'sess_demo');
        }, 4000);
      }
    } catch (err) {
      console.warn('Backend connection error fallback:', err);
      const q = currentResponse?.question;
      const isCorrect = q 
        ? (idx === q.correct_option_index || q.options?.[idx] === q.correct_answer_text) 
        : (idx === 0);
      setEvalResult({
        is_correct: isCorrect,
        teacher_verbal_response: isCorrect 
          ? `Shabash, ${childName}! You got it right!` 
          : `Bahut achha try, ${childName}! Let me re-explain this concept so you understand 100%.`,
        lesson_completed: false,
        topic_completed: true
      });
      if (isCorrect) setStars((prev) => prev + 1);
      setTimeout(() => {
        setIsEvaluating(false);
      }, 1200);
    }
  };

  const handleNextTopic = async () => {
    setSelectedOption(null);
    setEvalResult(null);
    setIsTopicTeachingOver(false);
    setIsQuizReady(false);
    lastSpokenSpeechRef.current = '';

    try {
      const res = await fetch(`http://localhost:8000/api/teacher-next-step/${sessionData?.session_id || 'sess_demo'}`);
      const nextPayload = await res.json();
      setCurrentResponse(nextPayload);
    } catch (err) {
      console.warn('Backend API fallback for next step:', err);
    }
  };

  const currentTopic = lessonPlan?.topics?.find(t => t.topic_id === currentResponse?.topic_id) || lessonPlan?.topics?.[0];

  return (
    <div className="page-wrapper">
      {/* CLASSROOM TOP BAR */}
      <div className="classroom-topbar">
        {onBackToSetup && (
          <button 
            type="button"
            className="back-btn" 
            onClick={handleExitToSetup}
          >
            ← Back
          </button>
        )}
        <span className="unit-title">
          {lessonPlan?.chapter_title ? `${lessonPlan.chapter_title}: ${currentTopic?.title || 'Overview'}` : 'Unit 1: Our Families and Communities'}
        </span>
        <span className="pill tv">📺 Android STB / TV Remote Ready</span>
        <span className="pill stars">⭐ {stars} Stars</span>
        <span style={{ marginLeft: '4px', fontSize: '11px', color: 'var(--muted)' }}>›</span>
      </div>

      {/* CLASSROOM GRID */}
      <div className="classroom-grid">
        {/* AVATAR PANEL */}
        <LiveTutorStage 
          ref={liveTutorRef}
          avatarConfig={avatarConfig}
          childName={childName}
          mood={avatarMood}
          onAgentTalkingChange={handleAgentTalkingChange}
          onDoubtAnswered={handleSpokenDoubtAnswered}
          isTeachingPaused={isTeachingPaused}
          onTogglePause={handleTogglePauseTeaching}
          speechText={currentResponse?.speech_text}
        />

        {/* RIGHT LESSON PANEL */}
        <div className="right-panel">
          <div className="lesson-area">
            <div className="unit-label">
              {lessonPlan?.chapter_title?.toUpperCase() || 'UNIT 1: OUR FAMILIES AND COMMUNITIES'}
            </div>
            <div className="lesson-title">
              {currentTopic?.title || currentResponse?.slide?.headline || "Living Together in Supportive Communities"}
            </div>

            <div className="lesson-content-grid" style={{ gridTemplateColumns: '1fr' }}>
              {/* Key Points */}
              <div className="keypoints-box">
                <div className="keypoints-title">Key Points</div>
                <ul className="keypoints-list">
                  {(currentResponse?.slide?.bullet_points && currentResponse.slide.bullet_points.length > 0
                    ? currentResponse.slide.bullet_points
                    : [
                        "Families live close together to form cooperative communities",
                        "Mutual aid means helping each other out in times of need",
                        "Working together builds vibrant and harmonious neighborhoods"
                      ]
                  ).map((pt, idx) => (
                    <li key={idx}>
                      <span className="kp-check">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Active Doubt Clarification (when teacher is clarifying a query) */}
            {activeDoubt && (
              <div style={{
                background: '#fff9ea',
                border: '1.5px solid var(--accent)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ❓ Clarifying {childName}'s Question: "{activeDoubt.query}"
                </div>
                <div style={{ fontSize: '16px', color: 'var(--ink)', lineHeight: 1.6 }}>
                  <strong>{avatarConfig.name || 'Joya'}:</strong> "{typeof activeDoubt.explanation === 'string' ? activeDoubt.explanation : activeDoubt.explanation?.teacher_explanation || ''}"
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    onClick={() => handleResumeLessonAfterDoubt(true)}
                    className="btn-start"
                    style={{ padding: '9px 18px', fontSize: '14.5px', borderRadius: '8px' }}
                  >
                    ✓ Yes, I am clear! Continue lesson
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleResumeLessonAfterDoubt(false)}
                    style={{
                      padding: '9px 16px',
                      fontSize: '14.5px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border)',
                      background: '#FFFFFF',
                      color: 'var(--ink)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Explain once more simply
                  </button>
                </div>
              </div>
            )}

            {/* Student Comprehension Check Bar */}
            {isTopicTeachingOver && !isQuizReady && !evalResult && (
              <div style={{
                background: 'var(--green-bg)',
                border: '1.5px solid #a7f3d0',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#065f46' }}>
                    {childName}, is everything clear to you in this topic?
                  </div>
                  <div style={{ fontSize: '14px', color: '#047857', marginTop: '2px' }}>
                    Ready to check your knowledge with a quiz question?
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => handleFeedbackCheck(true)}
                    disabled={isFeedbackSubmitting}
                    className="btn-start"
                    style={{ padding: '9px 18px', fontSize: '14.5px', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    ✓ Yes, it's clear! Start Quiz
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleFeedbackCheck(false)}
                    disabled={isFeedbackSubmitting}
                    style={{
                      padding: '9px 16px',
                      fontSize: '14.5px',
                      borderRadius: '8px',
                      border: '1.5px solid #a7f3d0',
                      background: '#FFFFFF',
                      color: '#065f46',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Re-explain this topic simply
                  </button>
                </div>
              </div>
            )}

            {/* Checkpoint Quiz Question & TV Remote D-Pad Navigation */}
            {currentResponse?.question && (isQuizReady || evalResult) && (
              <div style={{
                background: '#ffffff',
                border: '1.5px solid var(--border)',
                borderRadius: '14px',
                padding: '18px 20px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>
                    Quiz Question {currentResponse.question_index || 1} of {currentResponse.total_topic_questions || 1}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    TV Remote: [↑][↓] Arrows &amp; [ENTER]
                  </div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', lineHeight: 1.5 }}>
                  {currentResponse.question.question_text}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  {currentResponse.question.options.map((optionText, idx) => {
                    const isFocused = focusedOptionIdx === idx;
                    const isSelected = selectedOption === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isEvaluating || (evalResult && evalResult.is_correct)}
                        onClick={() => handleOptionSubmit(idx)}
                        className={`dpad-focusable ${isFocused ? 'dpad-focused' : ''}`}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '10px',
                          border: isFocused ? '2px solid var(--primary)' : isSelected ? '2px solid var(--green)' : '1.5px solid var(--border)',
                          background: isFocused ? 'var(--primary-light)' : '#ffffff',
                          textAlign: 'left',
                          cursor: (isEvaluating || (evalResult && evalResult.is_correct)) ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 800, color: isFocused ? 'var(--primary)' : 'var(--muted)', marginBottom: '6px' }}>
                          Option {idx + 1}
                        </div>
                        <div style={{ fontSize: '15.5px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>
                          {optionText}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Remedial / Correct Alert */}
                {evalResult && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    background: evalResult.is_correct ? 'var(--green-bg)' : '#fee2e2',
                    color: evalResult.is_correct ? '#065f46' : '#991b1b',
                    fontSize: '15px',
                    fontWeight: 700
                  }}>
                    <span>
                      {evalResult.is_correct 
                        ? (evalResult.topic_completed ? '🎉 Topic Mastered! Outstanding!' : '✨ Correct! Next question loading...') 
                        : '💡 Re-explaining concept... Try follow-up!'}
                    </span>
                    {evalResult.is_correct && evalResult.topic_completed && (
                      <button 
                        type="button" 
                        onClick={handleNextTopic} 
                        className="btn-start"
                        style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px' }}
                      >
                        Next Topic →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Transcript */}
            <div className="transcript-box">
              <strong>{avatarConfig?.name || 'Joya'}:</strong> "{currentResponse?.speech_text || 'Welcome to the classroom! Today we are learning together.'}"
            </div>
          </div>

          {/* ASK BAR */}
          <form onSubmit={handleAskDoubt} className="ask-bar">
            <input 
              className="ask-input" 
              value={studentDoubtText}
              onChange={(e) => setStudentDoubtText(e.target.value)}
              placeholder={`Ask a question (e.g., "${avatarConfig?.name || 'Joya'}, can you explain this concept again?")`} 
            />
            <button 
              type="button" 
              className="mic-btn"
              onClick={startVoiceInput}
              title="Click to speak your question"
            >
              {isListening ? '🔴' : '🎙'}
            </button>
            <button type="submit" className="ask-btn" disabled={isThinking}>
              {isThinking ? 'Thinking...' : '✋ Ask Teacher'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
