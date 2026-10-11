import React, { useState, useEffect, useRef } from 'react';
import AvatarCanvas from './AvatarCanvas';
import SlideBoard from './SlideBoard';
import { Volume2, Mic, Tv, ArrowRight, ArrowLeft, Star, Award, CheckCircle, HelpCircle, MessageSquare, Sparkles, Send, Brain, Sliders, RefreshCw, AlertCircle, ThumbsUp, HelpCircle as HelpIcon, Smile } from 'lucide-react';

export default function StudentClassroom({ sessionData, onLessonFinished, onBackToSetup }) {
  const [currentResponse, setCurrentResponse] = useState(sessionData?.current_response || null);
  const [lessonPlan, setLessonPlan] = useState(sessionData?.lesson_plan || null);
  const [avatarConfig, setAvatarConfig] = useState(sessionData?.avatar_config || { gender: 'female', name: 'Miss Priya' });
  const [childName, setChildName] = useState(sessionData?.child_name || 'Timmy');
  
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
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);
  
  // D-Pad Remote Focus State for TV
  const [focusedOptionIdx, setFocusedOptionIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [evalResult, setEvalResult] = useState(null);
  const [stars, setStars] = useState(5);

  const visemeIntervalRef = useRef(null);

  // Load available browser voices asynchronously
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        const indian = voices.find(v => 
          v.lang.toLowerCase().includes('en-in') || 
          v.lang.toLowerCase().includes('hi-in') || 
          v.name.toLowerCase().includes('india') || 
          v.name.toLowerCase().includes('priya') || 
          v.name.toLowerCase().includes('neerja') || 
          v.name.toLowerCase().includes('heera')
        );

        if (indian && !selectedVoiceURI) {
          setSelectedVoiceURI(indian.voiceURI);
        } else if (voices.length > 0 && !selectedVoiceURI) {
          setSelectedVoiceURI(voices[0].voiceURI);
        }
      }
    };

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

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
      speakTeacherResponse(currentResponse.speech_text, currentResponse.visemes);
    }
  }, [currentResponse]);

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
        handleOptionSubmit(focusedOptionIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedOptionIdx, currentResponse]);

  // Speech Synthesis with Selected Voice
  const speakTeacherResponse = (text, visemes) => {
    setIsSpeaking(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = avatarConfig.gender === 'male' ? 0.95 : 1.05;

      const voices = window.speechSynthesis.getVoices();
      let chosenVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      
      if (!chosenVoice) {
        chosenVoice = voices.find(v => 
          v.lang.toLowerCase().includes('en-in') || 
          v.lang.toLowerCase().includes('hi-in') || 
          v.name.toLowerCase().includes('india') || 
          v.name.toLowerCase().includes('priya') || 
          v.name.toLowerCase().includes('neerja') || 
          v.name.toLowerCase().includes('heera')
        );
      }

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentViseme(null);
        if (visemeIntervalRef.current) clearInterval(visemeIntervalRef.current);
      };

      window.speechSynthesis.speak(utterance);
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
      setCurrentResponse(responsePayload);
      speakTeacherResponse(responsePayload.speech_text, responsePayload.visemes);
    } catch (err) {
      console.warn('Feedback check error fallback:', err);
      setIsFeedbackSubmitting(false);
    }
  };

  // Handle Interactive Doubt Clarification
  const handleAskDoubt = async (e) => {
    if (e) e.preventDefault();
    if (!studentDoubtText.trim()) return;

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
      setDoubtsList((prev) => [...prev, { query, explanation: doubtData.teacher_explanation }]);

      speakTeacherResponse(doubtData.teacher_explanation, doubtData.visemes);
    } catch (err) {
      console.warn('Fallback doubt handling:', err);
      setIsThinking(false);
      const fallbackAns = `That is a wonderful question, ${childName}! In this chapter, '${query}' helps us connect all the core ideas together. Let's keep exploring!`;
      setDoubtsList((prev) => [...prev, { query, explanation: fallbackAns }]);
      speakTeacherResponse(fallbackAns, []);
    }
  };

  const triggerVoiceDoubtSim = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const simQuery = `Miss Priya, can you explain this topic again simply?`;
      setStudentDoubtText(simQuery);
    }, 2000);
  };

  const handleOptionSubmit = async (idx) => {
    setSelectedOption(idx);
    
    try {
      const res = await fetch('http://localhost:8000/api/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData?.session_id || 'sess_demo',
          topic_id: currentResponse?.topic_id || 'topic_1',
          submission_type: 'dpad_option',
          selected_option_index: idx
        })
      });

      const evalData = await res.json();
      setEvalResult(evalData);
      
      if (evalData.is_correct) {
        setStars((prev) => prev + 1);
      }

      speakTeacherResponse(evalData.teacher_verbal_response, []);

      if (!evalData.is_correct) {
        setCurrentResponse((prev) => ({
          ...prev,
          speech_text: evalData.teacher_verbal_response
        }));
      }

      if (evalData.lesson_completed) {
        setTimeout(() => {
          onLessonFinished(sessionData?.session_id || 'sess_demo');
        }, 4000);
      }
    } catch (err) {
      console.warn('Backend connection error fallback:', err);
      const isCorrect = idx === 0;
      setEvalResult({
        is_correct: isCorrect,
        teacher_verbal_response: isCorrect 
          ? `Shabash, ${childName}! You got it right!` 
          : `Bahut achha try, ${childName}! Let me re-explain this concept so you understand 100%.`,
        lesson_completed: false
      });
      if (isCorrect) setStars((prev) => prev + 1);
    }
  };

  const handleNextTopic = async () => {
    setSelectedOption(null);
    setEvalResult(null);

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
              onClick={onBackToSetup}
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
          {/* Voice Accent Selector */}
          {availableVoices.length > 0 && (
            <div className="glass-card" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={14} color="var(--accent-purple)" />
              <select 
                value={selectedVoiceURI} 
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '180px'
                }}
              >
                {availableVoices.map((v, idx) => (
                  <option key={idx} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

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
          {currentResponse?.speech_text && (
            <div style={{
              marginTop: '12px',
              padding: '12px 14px',
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid var(--border-glass)',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              textAlign: 'left',
              lineHeight: '1.4',
              maxHeight: '130px',
              overflowY: 'auto',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}>
              💬 <strong>{avatarConfig.name}:</strong> "{currentResponse.speech_text}"
            </div>
          )}
        </div>

        {/* Right Column: Visual Slide Board */}
        <div>
          <SlideBoard 
            slide={currentResponse?.slide}
            topicTitle={currentTopic?.title}
            chapterTitle={lessonPlan?.chapter_title}
            realWorldAnalogy={currentTopic?.real_world_analogy}
          />
        </div>
      </div>

      {/* Student Comprehension Feedback Bar ("Did you understand?") */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(16, 185, 129, 0.06) 100%)',
        border: '1px solid var(--accent-purple)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Smile size={24} color="var(--accent-purple)" />
          <div>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
              {childName}, did you understand what {avatarConfig.name} just taught?
            </h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Give instant feedback to your teacher so she can repeat or re-explain!
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            type="button"
            onClick={() => handleFeedbackCheck(true)}
            disabled={isFeedbackSubmitting}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.88rem', background: '#059669', borderColor: '#059669' }}
          >
            <ThumbsUp size={16} /> Yes, I Understood!
          </button>

          <button 
            type="button"
            onClick={() => handleFeedbackCheck(false)}
            disabled={isFeedbackSubmitting}
            className="btn-secondary"
            style={{ padding: '10px 20px', fontSize: '0.88rem', borderColor: 'var(--accent-gold)', color: '#B45309' }}
          >
            <RefreshCw size={16} /> Please Re-explain in another way!
          </button>
        </div>
      </div>

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
            onClick={triggerVoiceDoubtSim}
            className="btn-secondary"
            style={{ background: isListening ? 'rgba(5, 150, 105, 0.15)' : '#FFFFFF' }}
          >
            <Mic size={18} color={isListening ? 'var(--accent-green)' : 'var(--text-main)'} /> Speak
          </button>
          <button type="submit" className="btn-primary" disabled={isThinking}>
            {isThinking ? <Brain size={18} /> : <><Send size={18} /> Ask Teacher</>}
          </button>
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
                  💬 {avatarConfig.name}: "{d.explanation}"
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
              💡 Adaptive Remedial Review: {avatarConfig.name} is re-explaining this concept!
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
              Miss Priya doesn't advance until {childName} understands 100%! Listen to her re-explanation above and try the follow-up question below.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Section: Question & D-Pad Remote Navigation */}
      {currentResponse?.question && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HelpCircle color="var(--accent-purple)" /> {currentResponse.question.question_text}
            </h3>

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
                  onClick={() => handleOptionSubmit(idx)}
                  className={`glass-card dpad-focusable ${isFocused ? 'dpad-focused' : ''}`}
                  style={{
                    padding: '18px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
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
              Interactive Socratic Lesson with {avatarConfig.name}
            </span>

            {evalResult && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{
                  fontWeight: 700,
                  color: evalResult.is_correct ? 'var(--accent-green)' : 'var(--accent-gold)'
                }}>
                  {evalResult.is_correct ? '✨ Shabash! Correct!' : '💡 Re-explaining Concept...'}
                </span>

                {evalResult.is_correct && (
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
