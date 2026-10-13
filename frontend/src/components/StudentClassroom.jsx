import React, { useState, useEffect, useRef } from 'react';
import AvatarCanvas from './AvatarCanvas';
import SlideBoard from './SlideBoard';
import { Volume2, Mic, Tv, ArrowRight, ArrowLeft, Star, Award, CheckCircle, CheckCircle2, HelpCircle, MessageSquare, Sparkles, Send, Brain, Sliders, RefreshCw, AlertCircle, ThumbsUp, HelpCircle as HelpIcon, Smile } from 'lucide-react';

export default function StudentClassroom({ sessionData, onLessonFinished, onBackToSetup }) {
  const [currentResponse, setCurrentResponse] = useState(sessionData?.current_response || null);
  const [lessonPlan, setLessonPlan] = useState(sessionData?.lesson_plan || null);
  const [avatarConfig, setAvatarConfig] = useState(sessionData?.avatar_config || { gender: 'female', name: 'Miss Priya' });
  const [childName, setChildName] = useState(sessionData?.child_name || 'Vihana');
  
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
    setIsSpeaking(false);
    setCurrentViseme(null);
  };

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

  // Speech Synthesis with Selected Voice
  const speakTeacherResponse = (text, visemes, isTopicLesson = false) => {
    setIsSpeaking(true);
    // When starting a new lesson explanation, ensure topic teaching is not marked over until this finishes
    if (isTopicLesson) {
      setIsTopicTeachingOver(false);
      setIsQuizReady(false);
    }
    currentSpokenTextRef.current = text || '';

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const doSpeak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.88;
        utterance.pitch = avatarConfig?.gender === 'male' ? 0.95 : 1.1;

        // Track exact spoken character index when teacher speaks so we can resume from exact sentence
        utterance.onboundary = (event) => {
          if (event.name === 'word' || event.name === 'sentence') {
            spokenCharIndexRef.current = event.charIndex || 0;
          }
        };

        const voices = window.speechSynthesis.getVoices();
        let chosenVoice = null;

        // Check if current selectedVoiceURI matches the active gender
        if (selectedVoiceURI) {
          const found = voices.find(v => v.voiceURI === selectedVoiceURI);
          if (found) {
            const isFoundMale = found.name.toLowerCase().includes('ravi') || found.name.toLowerCase().includes('david') || found.name.toLowerCase().includes('male') || found.name.toLowerCase().includes('mark');
            if ((avatarConfig?.gender === 'male' && isFoundMale) || (avatarConfig?.gender !== 'male' && !isFoundMale)) {
              chosenVoice = found;
            }
          }
        }

        // If no valid match, pick target voice based on avatar gender
        if (!chosenVoice) {
          chosenVoice = pickTargetVoice(voices, avatarConfig?.gender);
        }

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        utterance.onend = () => {
          setIsSpeaking(false);
          setCurrentViseme(null);
          if (visemeIntervalRef.current) clearInterval(visemeIntervalRef.current);
          // Only mark topic teaching as finished if this utterance was the actual lesson explanation!
          if (isTopicLesson) {
            setIsTopicTeachingOver(true);
          }
        };

        utterance.onerror = (e) => {
          console.warn('Speech synthesis utterance error:', e);
          setIsSpeaking(false);
          setCurrentViseme(null);
          if (isTopicLesson) {
            setIsTopicTeachingOver(true);
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      // Slight delay avoids Windows Chrome/Edge audio drop after cancel()
      setTimeout(() => {
        doSpeak();
      }, 50);
    }

    // Viseme Lip-Sync Animation Engine
    if (visemes && visemes.length > 0) {
      let frameIdx = 0;
      if (visemeIntervalRef.current) clearInterval(visemeIntervalRef.current);

      visemeIntervalRef.current = setInterval(() => {
        if (frameIdx < visemes.length) {
          setCurrentViseme(visemes[frameIdx]);
          frameIdx++;
        } else {
          clearInterval(visemeIntervalRef.current);
          setIsSpeaking(false);
          setCurrentViseme(null);
        }
      }, 100);
    } else {
      setTimeout(() => setIsSpeaking(false), 5000);
    }
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
          const lower = transcript.toLowerCase();
          // If active doubt is showing and student says "yes", "clear", "continue", or "resume", automatically resume!
          if (activeDoubt && (lower.includes('clear') || lower.includes('yes') || lower.includes('continue') || lower.includes('resume') || lower.includes('samajh gaya') || lower.includes('theek hai'))) {
            setStudentDoubtText('');
            handleResumeLessonAfterDoubt(true);
            return;
          }
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
      }

      speakTeacherResponse(evalData.teacher_verbal_response, []);

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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px' }}>
      {/* Top Header Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBackToSetup && (
            <button
              onClick={handleExitToSetup}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Exit to Setup
            </button>
          )}
          <div className="tv-mode-badge">
            <Tv size={14} /> Android STB / TV Remote Ready
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Student: <strong style={{ color: 'var(--text-main)' }}>{childName}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Star Counter Badge */}
          <div className="glass-card" style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)' }}>
            <Star size={18} fill="var(--accent-gold)" color="var(--accent-gold)" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{stars} Stars</span>
          </div>
        </div>
      </div>

      {/* Main Classroom Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '24px',
        alignItems: 'stretch',
        marginBottom: '24px'
      }}>
        {/* Left Column: Real Photo Indian Teacher Avatar */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <AvatarCanvas 
            avatarConfig={avatarConfig}
            currentViseme={currentViseme}
            isSpeaking={isSpeaking}
            isListening={isListening}
            isThinking={isThinking}
          />
        </div>

        {/* Right Column: Visual Slide Board & Teacher Dialogue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SlideBoard 
            slide={currentResponse?.slide}
            topicTitle={currentTopic?.title}
            chapterTitle={lessonPlan?.chapter_title}
            realWorldAnalogy={currentTopic?.real_world_analogy}
            teacherName={avatarConfig?.name}
          />

          {/* Active Doubt Clarification Box (when teacher is answering child's query) */}
          {activeDoubt ? (
            <div style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(99, 102, 241, 0.1) 100%)',
              borderRadius: '16px',
              border: '2px solid var(--accent-gold)',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <HelpCircle size={22} color="var(--accent-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Clarifying {childName}'s Doubt: "{activeDoubt?.query || 'Question'}"
                    </span>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: 1.5, fontWeight: 500 }}>
                      <strong style={{ color: 'var(--accent-purple)' }}>{avatarConfig?.name || 'Teacher'}:</strong> "{typeof activeDoubt?.explanation === 'string' ? activeDoubt.explanation : (activeDoubt?.explanation?.teacher_explanation || JSON.stringify(activeDoubt?.explanation || ''))}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Comprehension Confirmation & Continue Actions */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid rgba(245, 158, 11, 0.25)',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Is this clear now, {childName}?
                </span>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleResumeLessonAfterDoubt(true)}
                    className="btn-primary"
                    style={{
                      padding: '10px 20px',
                      fontSize: '0.92rem',
                      background: '#059669',
                      borderColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={18} /> Yes, I am clear! Resume teaching from where we stopped
                  </button>

                  <button
                    type="button"
                    onClick={() => handleResumeLessonAfterDoubt(false)}
                    className="btn-secondary"
                    style={{
                      padding: '10px 18px',
                      fontSize: '0.88rem',
                      color: '#B45309',
                      borderColor: 'var(--accent-gold)',
                      background: '#FFFFFF'
                    }}
                  >
                    <RefreshCw size={15} /> Explain more simply
                  </button>
                </div>
              </div>
            </div>
          ) : currentResponse?.speech_text ? (
            <div style={{
              padding: '12px 18px',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              fontSize: '0.9rem',
              color: 'var(--text-main)',
              textAlign: 'left',
              lineHeight: '1.5',
              maxHeight: '120px',
              overflowY: 'auto',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💬</span>
              <div>
                <strong style={{ color: 'var(--accent-purple)' }}>{avatarConfig?.name || 'Teacher'}:</strong> "{currentResponse.speech_text}"
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Student Comprehension Check Bar - Appears ONLY when current topic teaching is over */}
      {isTopicTeachingOver && !isQuizReady && !evalResult && (
        <div className="glass-panel" style={{
          padding: '20px 24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '2px solid var(--accent-purple)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '16px',
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Smile size={28} color="var(--accent-purple)" />
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {childName}, is everything clear to you in this topic?
              </h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Can we go ahead to check your knowledge of this topic, or would you like {avatarConfig?.name || 'Teacher'} to re-explain?
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              type="button"
              onClick={() => handleFeedbackCheck(true)}
              disabled={isFeedbackSubmitting}
              className="btn-primary"
              style={{
                padding: '12px 22px',
                fontSize: '0.92rem',
                background: '#059669',
                borderColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
              }}
            >
              <CheckCircle2 size={18} /> Yes, it's clear! Let's check knowledge
            </button>

            <button 
              type="button"
              onClick={() => handleFeedbackCheck(false)}
              disabled={isFeedbackSubmitting}
              className="btn-secondary"
              style={{
                padding: '12px 20px',
                fontSize: '0.88rem',
                borderColor: 'var(--accent-gold)',
                color: '#B45309',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw size={16} /> Re-explain this topic simply
            </button>
          </div>
        </div>
      )}

      {/* Interactive Doubt Clarification Box */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} /> Ask {avatarConfig.name || 'Miss Priya'} Any Doubt (Voice or Text)
        </h3>

        <form onSubmit={handleAskDoubt} style={{ display: 'flex', gap: '10px', marginBottom: doubtsList.length > 0 ? '16px' : '0' }}>
          <input 
            type="text" 
            placeholder={`Ask a question (e.g., "${avatarConfig.name}, can you explain this concept again?")`}
            value={studentDoubtText}
            onChange={(e) => setStudentDoubtText(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              color: 'var(--text-main)',
              fontSize: '0.95rem',
              outline: 'none'
            }}
          />
          <button 
            type="button" 
            onClick={startVoiceInput}
            className="btn-secondary"
            style={{
              background: isListening ? 'rgba(239, 68, 68, 0.15)' : '#FFFFFF',
              borderColor: isListening ? '#EF4444' : '#CBD5E1',
              color: isListening ? '#DC2626' : 'var(--text-main)',
              fontWeight: isListening ? 800 : 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Mic size={18} color={isListening ? '#EF4444' : 'var(--text-main)'} className={isListening ? 'animate-pulse' : ''} />
            {isListening ? 'Listening...' : 'Speak'}
          </button>
          <button type="submit" className="btn-primary" disabled={isThinking}>
            {isThinking ? <Brain size={18} /> : <><Send size={18} /> Ask Teacher</>}
          </button>
          {pendingLessonResponse && (
            <button
              type="button"
              onClick={() => handleResumeLessonAfterDoubt(true)}
              className="btn-primary"
              style={{
                background: '#059669',
                borderColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="Resume teaching from the exact sentence where we paused"
            >
              <CheckCircle2 size={16} /> Resume Teaching
            </button>
          )}
        </form>

        {/* Doubts History Notebook */}
        {doubtsList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
            {doubtsList.map((d, idx) => (
              <div key={idx} className="glass-card" style={{ padding: '12px 16px', fontSize: '0.85rem' }}>
                <p style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '4px' }}>
                  ❓ {childName}'s Doubt: "{d.query}"
                </p>
                <p style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>
                  💬 {avatarConfig?.name || 'Teacher'}: "{typeof d.explanation === 'string' ? d.explanation : (d.explanation?.teacher_explanation || JSON.stringify(d.explanation || ''))}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Remedial Re-explanation Banner */}
      {evalResult && !evalResult.is_correct && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1.5px solid #EF4444',
          borderRadius: '16px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <AlertCircle size={24} color="#EF4444" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#DC2626', marginBottom: '2px' }}>
              💡 Adaptive Remedial Review: {avatarConfig?.name || 'Teacher'} is re-explaining this concept!
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
              {avatarConfig?.name || 'Your teacher'} doesn't advance until {childName} understands 100%! Listen to the re-explanation above and try the follow-up question below.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Section: Question & D-Pad Remote Navigation (Visible ONLY when topic teaching is over) */}
      {currentResponse?.question && (isQuizReady || evalResult) && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}>
                Question {currentResponse.question_index || 1} of {currentResponse.total_topic_questions || 1}
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <HelpCircle color="var(--accent-purple)" size={22} /> {currentResponse.question.question_text}
              </h3>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '8px' }}>
              Use <strong style={{ color: 'var(--accent-purple)' }}>[↑] [↓] Arrow Keys</strong> & <strong style={{ color: 'var(--accent-purple)' }}>[ENTER]</strong> on TV Remote
            </div>
          </div>

          {/* Option Cards with TV D-Pad Focus Rings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {currentResponse.question.options.map((optionText, idx) => {
              const isFocused = focusedOptionIdx === idx;
              const isSelected = selectedOption === idx;

              return (
                <button
                  key={idx}
                  disabled={isEvaluating || (evalResult && evalResult.is_correct)}
                  onClick={() => handleOptionSubmit(idx)}
                  className={`glass-card dpad-focusable ${isFocused ? 'dpad-focused' : ''}`}
                  style={{
                    padding: '18px 16px',
                    textAlign: 'left',
                    cursor: (isEvaluating || (evalResult && evalResult.is_correct)) ? 'not-allowed' : 'pointer',
                    opacity: (isEvaluating || (evalResult && evalResult.is_correct)) ? 0.75 : 1,
                    borderRadius: '14px',
                    color: 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '90px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isFocused ? 'var(--accent-purple)' : 'var(--text-subtle)' }}>
                      Option {idx + 1}
                    </span>
                    {isSelected && <CheckCircle size={18} color="var(--accent-green)" />}
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                    {optionText}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Interactive Socratic Lesson with {avatarConfig.name} &bull; Checkpoint {currentResponse.question_index || 1}/{currentResponse.total_topic_questions || 1}
            </span>

            {evalResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  fontWeight: 700,
                  color: evalResult.is_correct ? 'var(--accent-green)' : 'var(--accent-gold)'
                }}>
                  {evalResult.is_correct 
                    ? (evalResult.topic_completed ? '🎉 Topic Mastered! Outstanding!' : '✨ Shabash! Correct! Loading next question...') 
                    : '💡 Re-explaining Concept...'}
                </span>

                {evalResult.is_correct && evalResult.topic_completed && (
                  <button onClick={handleNextTopic} className="btn-primary">
                    Next Topic <ArrowRight size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
