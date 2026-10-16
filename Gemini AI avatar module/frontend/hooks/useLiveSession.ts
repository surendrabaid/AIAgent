import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage } from '@google/genai';
import { liveServiceConfiguration } from '../resources/live_service_configuration';
import { decode, createBlob } from '../services/audioUtils';
import { ChatMessage } from '../types';

const LIVE_API_MODEL_NAME = 'gemini-live-2.5-flash-native-audio';

export interface LiveConfigOverrides {
  avatarConfig?: { avatarName?: string };
  speechConfig?: {
    languageCode?: string;
    voiceConfig?: { prebuiltVoiceConfig?: { voiceName: string } };
  };
  systemInstruction?: string;
}

export const useLiveSession = (
  selectedAudioOutputId: string,
  isMuted: boolean,
  isVideoEnabled: boolean,
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>,
  configOverrides?: LiveConfigOverrides
) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [isWaitingForVideo, setIsWaitingForVideo] = useState<boolean>(false);
  const [hasVideo, setHasVideo] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [liveInput, setLiveInput] = useState<string>('');
  const [liveOutput, setLiveOutput] = useState<string>('');
  const [agentTalking, setAgentTalking] = useState<boolean>(false);

  const [debugStats, setDebugStats] = useState({
    buffered: 0,
    droppedFrames: 0,
    duration: 0,
    latency: 0,
  });

  const isSetupCompleteRef = useRef<boolean>(false);
  const agentTalkingRef = useRef<boolean>(false);
  const isTurnReceivingRef = useRef<boolean>(false);
  const currentInputTextRef = useRef<string>('');
  const currentOutputTextRef = useRef<string>('');
  const pendingMessageQueueRef = useRef<string[]>([]);
  const flushTranscriptionsRef = useRef<() => void>(() => {});

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const videoSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const videoAnalyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Latency Tracking Refs
  const lastUserSpeechTimeRef = useRef<number>(0);
  const userHasSpokenForNextTurnRef = useRef<boolean>(false);
  const trackingAvatarAudioRef = useRef<boolean>(false);
  const avatarAudioStartPlayheadRef = useRef<number | null>(null);
  const avatarAudioStartPlayheadSystemTimeRef = useRef<number | null>(null);
  const latencyRef = useRef<number>(0);

  // Video Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mseRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const videoQueueRef = useRef<ArrayBuffer[]>([]);
  const cachedInitSegmentRef = useRef<ArrayBuffer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoErrorListenerAddedRef = useRef<boolean>(false);
  const lastStatsUpdateRef = useRef<number>(0);

  useEffect(() => {
    agentTalkingRef.current = agentTalking;
  }, [agentTalking]);

  // Transcriptions flusher
  const flushTranscriptions = useCallback(() => {
    const inputText = currentInputTextRef.current.trim();
    const outputText = currentOutputTextRef.current.trim();

    if (inputText || outputText) {
      setChatHistory(prev => {
        const newHistory = [...prev];
        if (inputText) {
          newHistory.push({
            id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            role: 'user',
            text: inputText,
            isFinal: true
          });
        }
        if (outputText) {
          newHistory.push({
            id: `model-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            role: 'model',
            text: outputText,
            isFinal: true
          });
        }
        return newHistory;
      });

      if (inputText) {
        currentInputTextRef.current = '';
        setLiveInput('');
      }
      if (outputText) {
        currentOutputTextRef.current = '';
        setLiveOutput('');
      }
    }
  }, []);

  useEffect(() => {
    flushTranscriptionsRef.current = flushTranscriptions;
  }, [flushTranscriptions]);

  // Initialize Output AudioContext and MediaElementAudioSourceNode for unblocked audio
  useEffect(() => {
    let ctx = outputAudioContextRef.current;
    if (!ctx || ctx.state === 'closed') {
      try {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputAudioContextRef.current = ctx;
      } catch (e) {
        console.warn("Could not create AudioContext:", e);
      }
    }

    let gain = outputNodeRef.current;
    if (ctx && (!gain || !outputNodeRef.current)) {
      try {
        gain = ctx.createGain();
        gain.connect(ctx.destination);
        outputNodeRef.current = gain;
      } catch (e) {
        console.warn("Could not create GainNode:", e);
      }
    }

    if (ctx && gain && videoRef.current && !videoSourceRef.current) {
      try {
        const source = ctx.createMediaElementSource(videoRef.current);
        videoSourceRef.current = source;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        videoAnalyserRef.current = analyser;
        source.connect(analyser);
        analyser.connect(gain);
      } catch (e) {
        console.warn("Benign MediaElementAudioSourceNode notification:", e);
      }
    }
  }, []);

  // Unmute audio and resume suspended audio contexts on explicit user gesture
  const unmuteAudio = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      if (videoRef.current.paused) {
        videoRef.current.play().catch((err) => console.warn("Unmute play error:", err));
      }
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state === 'suspended') {
      inputAudioContextRef.current.resume().catch(() => {});
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state === 'suspended') {
      outputAudioContextRef.current.resume().catch(() => {});
    }
    setIsAudioBlocked(false);
  }, []);

  // Unlock audio & unmute video on any user gesture in the document
  useEffect(() => {
    const handleUserGesture = () => {
      unmuteAudio();
    };

    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
    };
  }, [unmuteAudio]);

  // Apply selected audio output device
  useEffect(() => {
    const applyAudioOutput = async () => {
      if (!selectedAudioOutputId) return;

      if (videoRef.current && typeof (videoRef.current as any).setSinkId === 'function') {
        try {
          await (videoRef.current as any).setSinkId(selectedAudioOutputId);
        } catch (e) {
          console.warn("Unable to set video output device.", e);
        }
      }

      if (outputAudioContextRef.current && typeof (outputAudioContextRef.current as any).setSinkId === 'function') {
        try {
          await (outputAudioContextRef.current as any).setSinkId(selectedAudioOutputId);
        } catch (e) {
          console.warn("Unable to set audio output device.", e);
        }
      }
    };

    applyAudioOutput();
  }, [selectedAudioOutputId, isConnected]);

  // Apply mute state
  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  // Video Streaming Effect
  useEffect(() => {
    if (isConnected && isVideoEnabled) {
      const canvasEl = document.createElement('canvas');
      const ctx = canvasEl.getContext('2d');

      frameIntervalRef.current = window.setInterval(() => {
        if (!isSetupCompleteRef.current) return; // Gate video sending until setup is complete
        if (!webcamVideoRef.current || !sessionPromiseRef.current) return;
        const videoEl = webcamVideoRef.current;

        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
          let width = videoEl.videoWidth;
          let height = videoEl.videoHeight;
          const maxDim = 768;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvasEl.width = width;
          canvasEl.height = height;
          ctx?.drawImage(videoEl, 0, 0, width, height);

          canvasEl.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const frame = (reader.result as string).split(',')[1];
                  if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                      try {
                        session.sendRealtimeInput({
                          video: {
                            data: frame,
                            mimeType: 'image/jpeg'
                          }
                        });
                      } catch (e) {
                        console.error("Failed to send video frame", e);
                      }
                    });
                  }
                };
                reader.readAsDataURL(blob);
              }
            },
            'image/jpeg',
            0.8
          );
        }
      }, 1000);
    }

    return () => {
      if (frameIntervalRef.current) {
        window.clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [isConnected, isVideoEnabled, webcamVideoRef]);

  // Drain video queue safely into SourceBuffer and evict stale buffer behind playhead
  const drainVideoQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    const ms = mseRef.current;
    const videoElement = videoRef.current;
    if (!sb || !ms || ms.readyState !== 'open' || sb.updating || videoQueueRef.current.length === 0) {
      return;
    }

    // Evict old buffer behind playhead if playback has progressed (> 8s) to prevent QuotaExceededError
    if (videoElement && videoElement.currentTime > 8 && sb.buffered.length > 0) {
      try {
        const removeEnd = videoElement.currentTime - 4;
        if (sb.buffered.start(0) < removeEnd) {
          sb.remove(0, removeEnd);
          return; // updateend will fire when remove finishes and will automatically call drainVideoQueue
        }
      } catch (e) {
        // Benign remove error
      }
    }

    const chunk = videoQueueRef.current.shift();
    if (chunk) {
      try {
        sb.appendBuffer(chunk);
      } catch (e: any) {
        if (e.name === "InvalidStateError") {
          mseRef.current = null;
          sourceBufferRef.current = null;
          videoQueueRef.current = [];
          setError("MediaSource Invalid State");
        } else if (e.name === "QuotaExceededError") {
          videoQueueRef.current.unshift(chunk);
          if (videoElement && videoElement.currentTime > 2 && sb.buffered.length > 0) {
            try {
              sb.remove(0, videoElement.currentTime - 1);
            } catch (err) {}
          }
        } else {
          console.warn("Buffer chunk append warning:", e);
        }
      }
    }
  }, []);

  // Pre-roll jitter cushion: start playback only when enough buffer (or queue) is present
  const checkAndStartPlayback = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoElement.paused) return;

    let bufferAhead = 0;
    if (videoElement.buffered.length > 0) {
      const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
      bufferAhead = Math.max(0, bufferedEnd - videoElement.currentTime);
    }

    // Wait for at least 0.35s cushion, or 3+ queued chunks, or until server turn is complete
    const isTurnFinished = !isTurnReceivingRef.current;
    const hasCushion = bufferAhead >= 0.35 || videoQueueRef.current.length >= 3;

    if ((hasCushion || isTurnFinished) && bufferAhead > 0.04) {
      videoElement.muted = false;
      videoElement.volume = 1.0;
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => {
          if (!videoElement.muted) {
            videoElement.muted = true;
            setIsAudioBlocked(true);
            videoElement.play().catch(() => {});
          }
        });
      }
    }
  }, []);

  const initMediaSource = useCallback(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    if (!window.MediaSource) {
      setError("MediaSource API not supported.");
      return;
    }
    if (mseRef.current) return;

    const mediaSource = new MediaSource();
    mseRef.current = mediaSource;
    videoElement.src = URL.createObjectURL(mediaSource);

    if (!videoErrorListenerAddedRef.current) {
      videoElement.addEventListener("error", (e) => {
        const err = videoElement.error;
        console.warn("[LiveAvatar Video Error event]", err?.code, err?.message);
        // Ignore aborted error (code 1) or when src is empty during reset/disconnect
        if (!err || err.code === 1 || !videoElement.currentSrc) {
          return;
        }
        if (err.code === 3 || err.code === 4) {
          console.error("Fatal decode/source error:", err);
          mseRef.current = null;
          sourceBufferRef.current = null;
          videoQueueRef.current = [];
          setError("Video playback error: " + (err.message || `Code ${err.code}`));
        }
      });
      videoErrorListenerAddedRef.current = true;
    }

    mediaSource.addEventListener("sourceopen", () => {
      try {
        let sourceBuffer = sourceBufferRef.current;
        if (!sourceBuffer && mediaSource.readyState === 'open') {
          const type = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
          if (MediaSource.isTypeSupported(type)) {
            sourceBuffer = mediaSource.addSourceBuffer(type);
          } else {
            sourceBuffer = mediaSource.addSourceBuffer("video/mp4");
          }
          sourceBuffer.mode = "sequence";
          sourceBufferRef.current = sourceBuffer;
        }

        const currentSourceBuffer = sourceBufferRef.current;
        if (!currentSourceBuffer) {
          return;
        }

        // Attach Web Audio MediaElementSource if available
        const ctx = outputAudioContextRef.current;
        const gain = outputNodeRef.current;
        if (ctx && gain && videoElement && !videoSourceRef.current) {
          try {
            const source = ctx.createMediaElementSource(videoElement);
            videoSourceRef.current = source;
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            videoAnalyserRef.current = analyser;
            source.connect(analyser);
            analyser.connect(gain);
          } catch (e) {
            console.warn("Benign MediaElementAudioSourceNode notification:", e);
          }
        }

        // Drain any chunks already queued
        drainVideoQueue();

        currentSourceBuffer.addEventListener("updateend", () => {
          const sb = sourceBufferRef.current;
          const ms = mseRef.current;
          if (!sb || !ms) return;

          if (ms.readyState === 'open' && videoElement.buffered.length > 0) {
            try {
              const end = videoElement.buffered.end(videoElement.buffered.length - 1);
              ms.setLiveSeekableRange(0, end);
            } catch (e) {
              // Ignore
            }
          }

          // Check if pre-roll cushion is ready to start playback
          checkAndStartPlayback();

          // Drain next queued chunk
          drainVideoQueue();
        });
      } catch (e: any) {
        console.error("sourceopen initialization error:", e);
        setError('Failed to initialize video stream.');
      }
    });
  }, [drainVideoQueue, checkAndStartPlayback]);

  const monitoringLoop = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      // --- Latency Check ---
      // Check if we are tracking 3 seconds of audible video playback
      if (trackingAvatarAudioRef.current && videoAnalyserRef.current) {
        if (avatarAudioStartPlayheadRef.current === null) {
          const dataArray = new Float32Array(videoAnalyserRef.current.fftSize);
          videoAnalyserRef.current.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sum / dataArray.length);

          if (rms > 0.02) {
            avatarAudioStartPlayheadRef.current = video.currentTime;
            avatarAudioStartPlayheadSystemTimeRef.current = performance.now();
          }
        } else if (video.currentTime - avatarAudioStartPlayheadRef.current >= 3) {
          if (avatarAudioStartPlayheadSystemTimeRef.current !== null && lastUserSpeechTimeRef.current > 0) {
            latencyRef.current = avatarAudioStartPlayheadSystemTimeRef.current - lastUserSpeechTimeRef.current;
          }
          trackingAvatarAudioRef.current = false;
          avatarAudioStartPlayheadRef.current = null;
          avatarAudioStartPlayheadSystemTimeRef.current = null;
        }
      }

      // --- Adaptive buffer management based on agent talking state ---
      if (video.readyState >= 2 && !video.paused && video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferAhead = bufferedEnd - video.currentTime;

        if (agentTalkingRef.current) {
          // Play smoothly at natural 1.0x rate while teacher is speaking - never skip!
          video.playbackRate = 1.0;

          // If turn delivery from upstream WebSocket is complete,
          // AND video playhead has played through to near the end of the buffered speech:
          if (!isTurnReceivingRef.current && (bufferAhead <= 0.20 || video.ended)) {
            agentTalkingRef.current = false;
            setAgentTalking(false);
            flushTranscriptionsRef.current?.();
          }
        } else {
          // Idle buffer management: gently catch up without abrupt pitch changes
          if (bufferAhead > 2.0) {
            video.playbackRate = 1.10;
          } else if (bufferAhead > 0.8) {
            video.playbackRate = 1.05;
          } else {
            video.playbackRate = 1.0;
          }
        }
      }

      // Check if paused and pre-roll cushion is ready
      if (video.paused && video.buffered.length > 0) {
        checkAndStartPlayback();
      }

      // Throttle debug stats to at most once every 500ms to eliminate 60 FPS React re-renders
      const now = performance.now();
      if (now - lastStatsUpdateRef.current >= 500) {
        lastStatsUpdateRef.current = now;
        let buffered = 0;
        let duration = video.duration;

        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          buffered = bufferedEnd - video.currentTime;
          if (isNaN(duration) || !isFinite(duration)) {
            duration = bufferedEnd;
          }
        } else if (isNaN(duration) || !isFinite(duration)) {
          duration = 0;
        }

        let droppedFrames = 0;
        if (typeof (video as any).getVideoPlaybackQuality === 'function') {
          droppedFrames = (video as any).getVideoPlaybackQuality().droppedVideoFrames;
        }
        setDebugStats({
          buffered: Math.max(0, buffered),
          droppedFrames,
          duration: duration,
          latency: latencyRef.current,
        });
      }
    }
    animationFrameRef.current = requestAnimationFrame(monitoringLoop);
  }, [checkAndStartPlayback]);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    setIsSetupComplete(false);
    isSetupCompleteRef.current = false;
    setIsWaitingForVideo(false);
    setHasVideo(false);
    setIsAudioBlocked(false);

    userHasSpokenForNextTurnRef.current = false;
    trackingAvatarAudioRef.current = false;
    avatarAudioStartPlayheadRef.current = null;
    avatarAudioStartPlayheadSystemTimeRef.current = null;
    latencyRef.current = 0;
    setDebugStats({
      buffered: 0,
      droppedFrames: 0,
      duration: 0,
      latency: 0,
    });

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try {
          session.close();
        } catch (e) {
          setError("Failed to close session");
        }
      });
      sessionPromiseRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (mediaSourceRef.current) {
      mediaSourceRef.current.disconnect();
      mediaSourceRef.current = null;
    }

    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    pendingMessageQueueRef.current = [];
    videoQueueRef.current = [];
    cachedInitSegmentRef.current = null;
    if (mseRef.current && mseRef.current.readyState === 'open') {
      try {
        mseRef.current.endOfStream();
      } catch (e) {
        console.warn("Failed to end stream cleanly:", e);
      }
    }
    if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      videoRef.current.removeAttribute('src');
    }
    sourceBufferRef.current = null;
    mseRef.current = null;
    // Note: Do not clear error here so any fatal connection/mic error remains visible to the user!
  }, []);

  const connect = useCallback(async (deviceId?: string) => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setIsSetupComplete(false);
    isSetupCompleteRef.current = false;
    setIsWaitingForVideo(true);
    setError(null);
    setHasVideo(false);

    setChatHistory([]);
    setLiveInput('');
    setLiveOutput('');
    currentInputTextRef.current = '';
    currentOutputTextRef.current = '';

    userHasSpokenForNextTurnRef.current = false;
    trackingAvatarAudioRef.current = false;
    avatarAudioStartPlayheadRef.current = null;
    avatarAudioStartPlayheadSystemTimeRef.current = null;
    latencyRef.current = 0;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

      // Sanitize deviceId in case a DOM event or non-string was passed
      const validDeviceId = typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : undefined;

      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: validDeviceId ? { deviceId: { exact: validDeviceId } } : true
          });

          stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
          streamRef.current = stream;

          const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          inputAudioContextRef.current = inputAudioContext;
        }
      } catch (micErr: any) {
        console.warn("[LiveSession] Microphone access unavailable or blocked. Continuing in listen-only mode:", micErr);
        streamRef.current = null;
      }

      if (outputAudioContextRef.current?.state === 'suspended') {
        try {
          await outputAudioContextRef.current.resume();
        } catch (audioCtxErr) {
          console.warn("[LiveSession] AudioContext resume waiting for user interaction:", audioCtxErr);
        }
      }

      videoQueueRef.current = [];
      cachedInitSegmentRef.current = null;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      monitoringLoop();

      const startAudioInput = () => {
        if (scriptProcessorRef.current || !inputAudioContextRef.current || !streamRef.current) return;

        const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
        const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
          if (!isSetupCompleteRef.current) return; // Gate audio sending until setup is complete
          if (isMuted) return; // Don't send audio if student mic is muted

          const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);

          // Acoustic echo / barge-in gate: If the teacher avatar is actively speaking,
          // suppress ambient noise and speaker reflections so Gemini doesn't falsely cut itself off!
          if (agentTalkingRef.current && rms < 0.07) {
            return;
          }

          if (rms > 0.01) {
            lastUserSpeechTimeRef.current = performance.now();
            userHasSpokenForNextTurnRef.current = true;
          }

          const pcmBlob = createBlob(inputData);
          if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContextRef.current.destination);

        mediaSourceRef.current = source;
        scriptProcessorRef.current = scriptProcessor;
      };

      const sessionPromise = ai.live.connect({
        model: liveServiceConfiguration.model || LIVE_API_MODEL_NAME,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            // Do not set isConnecting to false here, wait for setupComplete
            startAudioInput();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.setupComplete) {
              setIsSetupComplete(true);
              isSetupCompleteRef.current = true;
              setIsConnecting(false); // Setup is complete, no longer connecting
              if (pendingMessageQueueRef.current.length > 0) {
                const pending = [...pendingMessageQueueRef.current];
                pendingMessageQueueRef.current = [];
                sessionPromiseRef.current?.then((session: any) => {
                  pending.forEach((msg) => {
                    try {
                      if (typeof session.sendClientContent === 'function') {
                        session.sendClientContent({
                          turns: [
                            {
                              role: 'user',
                              parts: [{ text: msg }]
                            }
                          ],
                          turnComplete: true
                        });
                      } else {
                        session.sendRealtimeInput({ text: msg });
                      }
                      setChatHistory(prev => [
                        ...prev,
                        {
                          id: `user-text-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                          role: 'user',
                          text: msg,
                          isFinal: true
                        }
                      ]);
                    } catch (e) {
                      console.warn("Failed to flush pending message:", e);
                    }
                  });
                });
              }
            }

            if (message.serverContent?.outputTranscription) {
              isTurnReceivingRef.current = true;
              if (currentOutputTextRef.current === '') {
                setAgentTalking(true);
                agentTalkingRef.current = true;
              }
              currentOutputTextRef.current += message.serverContent.outputTranscription.text;
              setLiveOutput(currentOutputTextRef.current);
            }

            if (message.serverContent?.inputTranscription) {
              currentInputTextRef.current += message.serverContent.inputTranscription.text;
              setLiveInput(currentInputTextRef.current);
            }

            if (message.serverContent?.interrupted) {
              console.log("[LiveSession] Turn interrupted by server");
              isTurnReceivingRef.current = false;
              agentTalkingRef.current = false;
              setAgentTalking(false);
              videoQueueRef.current = [];
              flushTranscriptions();
            } else if (message.serverContent?.turnComplete) {
              console.log("[LiveSession] Turn complete from server. Video buffer will play through naturally.");
              isTurnReceivingRef.current = false;
              const video = videoRef.current;
              const hasBufferedAudioVideo = video && video.buffered.length > 0 && (video.buffered.end(video.buffered.length - 1) - video.currentTime) > 0.25;
              if (!hasBufferedAudioVideo) {
                agentTalkingRef.current = false;
                setAgentTalking(false);
                flushTranscriptions();
              }
            }

            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData) {
                  const mimeType = part.inlineData.mimeType;
                  const base64Data = part.inlineData.data;

                  if (mimeType.startsWith('video/mp4')) {
                    isTurnReceivingRef.current = true;
                    if (!agentTalkingRef.current) {
                      setAgentTalking(true);
                      agentTalkingRef.current = true;
                    }
                    if (userHasSpokenForNextTurnRef.current) {
                      trackingAvatarAudioRef.current = true;
                      userHasSpokenForNextTurnRef.current = false;
                      avatarAudioStartPlayheadRef.current = null;
                      avatarAudioStartPlayheadSystemTimeRef.current = null;
                    }

                    setHasVideo(true);
                    setIsWaitingForVideo(false);
                    initMediaSource();

                    const uint8Array = decode(base64Data);
                    const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);

                    if (!cachedInitSegmentRef.current) {
                      cachedInitSegmentRef.current = arrayBuffer;
                    }

                    videoQueueRef.current.push(arrayBuffer);
                    drainVideoQueue();
                    checkAndStartPlayback();
                  }
                }
              }
            }
          },
          onerror: (e: any) => {
            console.error('[LiveSession] Connection error event:', e);
            const msg = (e?.message || e?.error?.message || '').toLowerCase();
            if (msg.includes('1008') || msg.includes('auth') || msg.includes('token') || msg.includes('credential')) {
              setError('GCP Authentication failed. Please verify Application Default Credentials or GCP_SERVICE_ACCOUNT_JSON in the server environment.');
            } else {
              setError('Live Avatar connection error. Please verify the Gemini Live proxy is running on port 5001.');
            }
            disconnect();
          },
          onclose: (e: CloseEvent) => {
            console.log('[LiveSession] WebSocket closed:', e.code, e.reason);
            const reason = (e.reason || '').toLowerCase();
            if (e.code === 1008 || reason.includes('token') || reason.includes('authenticat') || reason.includes('credential')) {
              setError('GCP Authentication failed. Please verify Application Default Credentials or GCP_SERVICE_ACCOUNT_JSON in the server environment.');
            } else if (e.code !== 1000 && e.code !== 1005) {
              setError(`Connection closed (code ${e.code}). Click Retry to reconnect.`);
            }
            disconnect();
          },
        },
        config: {
          avatarConfig: configOverrides?.avatarConfig || (liveServiceConfiguration as any).avatarConfig,
          speechConfig: configOverrides?.speechConfig || (liveServiceConfiguration as any).generationConfig?.speechConfig,
          responseModalities: (liveServiceConfiguration as any).generationConfig?.responseModalities,
          systemInstruction: {
            parts: [{ text: (typeof configOverrides?.systemInstruction === 'string' ? configOverrides.systemInstruction : (liveServiceConfiguration as any).systemInstruction) || '' }]
          },
          inputAudioTranscription: (liveServiceConfiguration as any).input_audio_transcription || (liveServiceConfiguration as any).inputAudioTranscription || {},
          outputAudioTranscription: (liveServiceConfiguration as any).output_audio_transcription || (liveServiceConfiguration as any).outputAudioTranscription || {},
          tools: (liveServiceConfiguration as any).tools,
        },
      });

      sessionPromiseRef.current = sessionPromise;
    } catch (err: any) {
      console.error("Connection attempt failed:", err);
      setError(err?.message || "Failed to connect to live avatar");
      disconnect();
    }
  }, [isConnected, isConnecting, disconnect, initMediaSource, monitoringLoop, isMuted, configOverrides]);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (isConnected && streamRef.current) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        });

        newStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        streamRef.current = newStream;

        if (mediaSourceRef.current) {
          mediaSourceRef.current.disconnect();
        }
        streamRef.current.getTracks().forEach(track => track.stop());

        if (inputAudioContextRef.current && scriptProcessorRef.current) {
          const newSource = inputAudioContextRef.current.createMediaStreamSource(newStream);
          newSource.connect(scriptProcessorRef.current);
          mediaSourceRef.current = newSource;
        }
        streamRef.current = newStream;
      } catch (err) {
        setError("Failed to switch microphone.");
      }
    }
  }, [isConnected, isMuted]);

  const sendTextMessage = useCallback((text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    if (!sessionPromiseRef.current || !isSetupCompleteRef.current) {
      pendingMessageQueueRef.current.push(cleanText);
      return;
    }

    sessionPromiseRef.current.then((session) => {
      try {
        if (typeof (session as any).sendClientContent === 'function') {
          (session as any).sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: cleanText }]
              }
            ],
            turnComplete: true
          });
        } else {
          session.sendRealtimeInput({ text: cleanText });
        }

        // Add to chat history immediately for better UX
        setChatHistory(prev => [
          ...prev,
          {
            id: `user-text-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            role: 'user',
            text: cleanText,
            isFinal: true
          }
        ]);
      } catch (e) {
        console.error("Failed to send text message", e);
      }
    });
  }, []);

  return {
    isConnected,
    isConnecting,
    isSetupComplete,
    isWaitingForVideo,
    hasVideo,
    error,
    chatHistory,
    liveInput,
    liveOutput,
    debugStats,
    videoRef,
    agentTalking,
    isAudioBlocked,
    unmuteAudio,
    connect,
    disconnect,
    switchMicrophone,
    sendTextMessage
  };
};
