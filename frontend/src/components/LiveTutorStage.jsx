import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useLiveSession } from '../live-avatar/hooks/useLiveSession';
import { LiveAvatarCanvas } from '../live-avatar/components/LiveAvatarCanvas';
import { Volume2, VolumeX, Mic, MicOff, RefreshCw, Signal, Radio, Sparkles, CheckCircle2, AlertCircle, User, Award } from 'lucide-react';

const AVATAR_BASE = 'https://www.gstatic.com/pantheon/images/aiplatform/vertex_ai_studio/avatars';

const LiveTutorStage = forwardRef(({
  avatarConfig,
  childName = 'Student',
  mood = 'idle',
  onAgentTalkingChange,
  onDoubtAnswered,
  isSpeakingFallback = false,
}, ref) => {
  const gender = avatarConfig?.gender || 'female';
  const tutorName = avatarConfig?.name || (gender === 'male' ? 'Mr. Rajesh' : 'Miss Priya');

  // Build persona for LiveAvatarCanvas
  const activePersona = {
    id: gender === 'male' ? 'jay_tutor' : 'carmen_tutor',
    name: tutorName,
    title: gender === 'male' ? 'Lead STEM & Concept Mentor' : 'Lead Educator & Mentor',
    specialty: 'Science & Mathematics',
    voiceName: (gender === 'male' ? 'fenrir' : 'kore'),
    avatarName: gender === 'male' ? 'Jay' : 'Carmen',
    imageUrl: gender === 'male' ? '/indian_male_teacher.png' : '/indian_female_teacher.png',
    themeColor: gender === 'male' ? 'from-blue-600 to-indigo-600' : 'from-pink-600 to-indigo-600',
    description: 'Patient, warm, and explains complex concepts with intuitive real-world analogies.',
    accentQuote: "Let's explore and discover together!"
  };

  const systemInstruction = `You are "${tutorName}", an enthusiastic, warm, world-class 1-on-1 AI Home Tutor teaching ${childName}.
Your primary goal is to guide ${childName} through their lesson with deep comprehension, interactive encouragement, and joy.

LESSON TEACHING PROTOCOL:
- When asked to explain a topic, deliver a clear, concise, conversational explanation in 3 to 4 spoken sentences.
- Speak directly to ${childName} warmly and with natural inflection.
- Use intuitive, vivid real-world analogies suitable for the student's level.

CHECKPOINT QUIZ PROTOCOL:
- When given a question, read it aloud clearly and enthusiastically.
- When an answer result is received:
  1. If correct: Cheer warmly and celebrate! ("Awesome job, ${childName}!", "Bingo! That is spot on!").
  2. If incorrect: Be gentle, empathetic, and encouraging ("Close guess, ${childName}! Here is the key trick...").
  3. Keep the feedback punchy and conversational (2-3 sentences).

DOUBT CLARIFICATION PROTOCOL:
- When ${childName} asks a doubt or question, explain it warmly and clearly.`;

  const configOverrides = {
    avatarConfig: {
      avatarName: activePersona.avatarName
    },
    speechConfig: {
      languageCode: 'en-US',
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: activePersona.voiceName
        }
      }
    },
    systemInstruction
  };

  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const webcamVideoRef = useRef(null);

  const {
    isConnected,
    isConnecting,
    isWaitingForVideo,
    hasVideo,
    error,
    liveInput,
    liveOutput,
    agentTalking,
    videoRef,
    connect,
    disconnect,
    sendTextMessage
  } = useLiveSession('', isMuted, false, webcamVideoRef, configOverrides);

  // Auto-connect to live session on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  // Forward imperative handle to parent
  useImperativeHandle(ref, () => ({
    sendPrompt: (text) => {
      if (isConnected) {
        sendTextMessage(text);
        return true;
      }
      return false;
    },
    isConnected,
    hasVideo,
    agentTalking,
    reconnect: () => connect(),
    disconnect: () => disconnect()
  }), [isConnected, hasVideo, agentTalking, sendTextMessage, connect, disconnect]);

  // Notify parent of agentTalking state changes
  useEffect(() => {
    if (onAgentTalkingChange) {
      onAgentTalkingChange(agentTalking);
    }
  }, [agentTalking, onAgentTalkingChange]);

  // Audio spectrum simulation during speech
  useEffect(() => {
    let interval;
    if (agentTalking || isSpeakingFallback) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.8 + 0.2);
      }, 120);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [agentTalking, isSpeakingFallback]);

  // Detect spoken doubts from student and teacher responses
  const lastCapturedUserTextRef = useRef('');
  useEffect(() => {
    if (!agentTalking && liveInput && liveOutput && liveInput !== lastCapturedUserTextRef.current) {
      lastCapturedUserTextRef.current = liveInput;
      if (onDoubtAnswered) {
        onDoubtAnswered(liveInput, liveOutput);
      }
    }
  }, [agentTalking, liveInput, liveOutput, onDoubtAnswered]);

  const effectiveTalking = agentTalking || isSpeakingFallback;

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Live Video Stage Container */}
      <div 
        className="glass-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: '380px',
          borderRadius: '24px',
          overflow: 'hidden',
          border: effectiveTalking 
            ? '2px solid rgba(16, 185, 129, 0.8)' 
            : isConnected
            ? '2px solid rgba(99, 102, 241, 0.4)'
            : '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: effectiveTalking 
            ? '0 0 35px rgba(16, 185, 129, 0.35), 0 20px 50px rgba(0,0,0,0.6)' 
            : '0 20px 50px rgba(0, 0, 0, 0.5)',
          background: '#090D16',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Top Video Overlay Bar: LIVE Status & WebRTC Signal */}
        <div style={{
          position: 'absolute',
          top: '14px',
          left: '14px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
          pointerEvents: 'none'
        }}>
          {/* Live Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            border: isConnected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FFF',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444',
              boxShadow: isConnected ? '0 0 10px #10B981' : '0 0 10px #EF4444'
            }} />
            <Radio size={12} color={isConnected ? '#10B981' : '#EF4444'} /> 
            {isConnected ? 'LIVE • Gemini 3.8' : isConnecting ? 'Connecting Live Stream...' : 'Offline Fallback'}
          </div>

          {/* WebRTC HD & Signal Badge */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--accent-cyan)',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Signal size={12} color="var(--accent-cyan)" /> 
            {hasVideo ? '24 FPS Video • 28ms' : isConnected ? 'Audio Stream Ready' : 'AI Studio'}
          </div>
        </div>

        {/* Real Live Avatar Canvas (Gemini 3.8 Live Video + Smooth Rigging Fallback) */}
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <LiveAvatarCanvas
            persona={activePersona}
            mood={mood}
            agentTalking={effectiveTalking}
            isConnected={isConnected}
            videoRef={videoRef}
            hasVideo={hasVideo}
          />
        </div>

        {/* Bottom Video Name Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '14px',
          left: '14px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '6px 14px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 20
        }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: effectiveTalking ? '#10B981' : isConnected ? '#3B82F6' : '#6B7280'
          }} />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF', lineHeight: '1.1' }}>
              {tutorName}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
              ✨ Gemini Live Tutor
            </p>
          </div>
        </div>

        {/* Live Audio Spectrum Waveform Indicator (Bottom Right of Video) */}
        <div style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '8px 12px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          height: '32px',
          zIndex: 20
        }}>
          {[0.4, 0.7, 0.3, 0.9, 0.5, 0.8, 0.2].map((heightFactor, idx) => (
            <div 
              key={idx}
              style={{
                width: '3px',
                height: effectiveTalking ? `${Math.max(4, audioLevel * 22 * heightFactor)}px` : '4px',
                background: effectiveTalking ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.3)',
                borderRadius: '2px',
                transition: 'height 0.1s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Video Call Controls Toolbar (Mic Toggle & Reconnect) */}
      <div className="glass-card" style={{
        marginTop: '12px',
        padding: '8px 16px',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        background: '#FFFFFF',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Connection status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: isConnected ? '#10B981' : isConnecting ? '#F59E0B' : '#EF4444', 
            boxShadow: isConnected ? '0 0 8px #10B981' : '0 0 8px #EF4444',
            display: 'inline-block' 
          }} /> 
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {isConnected ? 'Live Avatar Ready' : isConnecting ? 'Establishing Stream...' : 'Offline Mode'}
          </span>
        </div>

        {/* Interactive Controls: Mic mute & Reconnect */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsMuted(prev => !prev)}
            style={{
              background: isMuted ? '#FEE2E2' : '#F1F5F9',
              border: isMuted ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: isMuted ? '#DC2626' : 'var(--text-main)',
              transition: 'all 0.2s ease'
            }}
            title={isMuted ? 'Unmute Student Microphone' : 'Mute Student Microphone'}
          >
            {isMuted ? <MicOff size={14} color="#DC2626" /> : <Mic size={14} color="#059669" />}
            <span>{isMuted ? 'Muted' : 'Mic On'}</span>
          </button>

          {!isConnected && !isConnecting && (
            <button
              onClick={() => connect()}
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: '10px',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--accent-purple)'
              }}
              title="Reconnect Gemini Live Stream"
            >
              <RefreshCw size={13} />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default LiveTutorStage;
