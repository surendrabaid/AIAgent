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
  const isMutedRef = useRef<boolean>(isMuted);
  const [micVolume, setMicVolume] = useState<number>(0);
  const lastMicVolumeUpdateRef = useRef<number>(0);
  const agentTalkingRef = useRef<boolean>(false);
  const isTurnReceivingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const currentInputTextRef = useRef<string>('');
  const currentOutputTextRef = useRef<string>('');
  const pendingMessageQueueRef = useRef<string[]>([]);
  const flushTranscriptionsRef = useRef<() => void>(() => {});

  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
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

  const startAudioInput = useCallback(() => {
    if (scriptProcessorRef.current || !inputAudioContextRef.current || !streamRef.current) return;

    try {
      const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
      const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);

      scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
        if (!isSetupCompleteRef.current) return; // Gate audio sending until setup is complete
        
        if (isMutedRef.current) {
          const now = Date.now();
          if (now - lastMicVolumeUpdateRef.current > 120) {
            setMicVolume(0);
            lastMicVolumeUpdateRef.current = now;
          }
          return; // Do not send audio if student mic is muted
        }

        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Update real-time microphone volume for UI (scaled 0 - 100)
        const now = Date.now();
        if (now - lastMicVolumeUpdateRef.current > 100) {
          const scaledVol = Math.min(100, Math.round(rms * 450));
          setMicVolume(scaledVol);
          lastMicVolumeUpdateRef.current = now;
        }

        // Noise gate: Ignore absolute background noise / whisper below 0.005
        if (rms < 0.005) {
          // If the user spoke recently (< 1200ms ago), send clean zero PCM frames so Gemini Live's VAD measures silence and generates the response
          const now = performance.now();
          if (lastUserSpeechTimeRef.current > 0 && now - lastUserSpeechTimeRef.current < 1200) {
            const silentData = new Float32Array(inputData.length);
            const pcmBlob = createBlob(silentData);
            if (sessionPromiseRef.current) {
              sessionPromiseRef.current.then((session) => {
                try {
                  session.sendRealtimeInput({ media: pcmBlob });
                } catch (err) {}
              });
            }
          }
          return;
        }

        // Echo gate when avatar is speaking:
        // EchoCancellation in getUserMedia removes most speaker feedback.
        // We only gate tiny residual ambient noise (< 0.015) while the agent is talking,
        // allowing real user speech (> 0.015) to barge in!
        if (agentTalkingRef.current && rms < 0.015) {
          return;
        }

        lastUserSpeechTimeRef.current = performance.now();
        userHasSpokenForNextTurnRef.current = true;

        const pcmBlob = createBlob(inputData);
        if (sessionPromiseRef.current) {
          sessionPromiseRef.current.then((session) => {
            try {
              session.sendRealtimeInput({ media: pcmBlob });
            } catch (err) {
              console.error("[LiveSession] Failed to send realtime audio input:", err);
            }
          });
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(inputAudioContextRef.current.destination);

      mediaSourceRef.current = source;
      scriptProcessorRef.current = scriptProcessor;
      console.log("[LiveSession] Audio input processor successfully started.");
    } catch (err) {
      console.error("[LiveSession] Error attaching audio input processor:", err);
    }
  }, []);

  const initMicrophoneStream = useCallback(async (deviceId?: string) => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) return null;

      const validDeviceId = typeof deviceId === 'string' && deviceId.trim() ? deviceId.trim() : undefined;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          ...(validDeviceId ? { deviceId: { exact: validDeviceId } } : {})
        }
      });

      stream.getAudioTracks().forEach(track => {
        track.enabled = !isMutedRef.current;
      });
      streamRef.current = stream;

      if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputAudioContextRef.current = inputAudioContext;
      }

      if (inputAudioContextRef.current.state === 'suspended') {
        await inputAudioContextRef.current.resume().catch(() => {});
      }

      if (!scriptProcessorRef.current) {
        startAudioInput();
      }

      return stream;
    } catch (micErr: any) {
      console.warn("[LiveSession] Microphone access unavailable or blocked:", micErr);
      streamRef.current = null;
      return null;
    }
  }, [startAudioInput]);

  // Ensure video element plays audio directly through system speakers with full volume
  const unmuteAudio = useCallback(() => {
    if (isPausedRef.current) return;
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      if (videoRef.current.paused && videoRef.current.buffered.length > 0) {
        videoRef.current.play().catch((err) => console.warn("Unmute play error:", err));
      }
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state === 'suspended') {
      inputAudioContextRef.current.resume().catch(() => {});
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

  // Apply selected audio output device directly on video element
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
    };

    applyAudioOutput();
  }, [selectedAudioOutputId, isConnected]);

  // Apply mute state and dynamically initialize/resume microphone when unmuted
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }

    if (!isMuted) {
      if (inputAudioContextRef.current && inputAudioContextRef.current.state === 'suspended') {
        inputAudioContextRef.current.resume().catch(() => {});
      }
      if (isConnected && !streamRef.current) {
        initMicrophoneStream();
      } else if (isConnected && streamRef.current && !scriptProcessorRef.current) {
        startAudioInput();
      }
    } else {
      setMicVolume(0);
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then((session) => {
          try {
            if (typeof (session as any).sendRealtimeInput === 'function') {
              (session as any).sendRealtimeInput({ audioStreamEnd: true });
            }
          } catch (e) {}
        });
      }
    }
  }, [isMuted, isConnected, initMicrophoneStream, startAudioInput]);

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

  // Align video playhead across unbuffered timeline gaps (e.g. between turns or speech pauses)
  const alignPlayheadToBuffer = useCallback((videoElement: HTMLVideoElement) => {
    if (videoElement.buffered.length === 0) return;
    const cur = videoElement.currentTime;
    let inRange = false;
    let nextStart = -1;

    for (let i = 0; i < videoElement.buffered.length; i++) {
      const s = videoElement.buffered.start(i);
      const e = videoElement.buffered.end(i);
      if (cur >= s - 0.05 && cur < e) {
        inRange = true;
        break;
      }
      if (s > cur && (nextStart === -1 || s < nextStart)) {
        nextStart = s;
      }
    }

    // If playhead is in an unbuffered gap, jump across the gap to the next available buffered sample
    if (!inRange && nextStart !== -1) {
      videoElement.currentTime = nextStart + 0.01;
    }
  }, []);

  // Drain video queue safely into SourceBuffer and evict stale buffer behind playhead
  const drainVideoQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    const ms = mseRef.current;
    const videoElement = videoRef.current;
    if (!sb || !ms || ms.readyState !== 'open' || sb.updating || videoQueueRef.current.length === 0) {
      return;
    }

    // Evict old buffer behind playhead in batched chunks (> 8s stale) to prevent QuotaExceededError without thrashing
    if (videoElement && videoElement.currentTime > 10 && sb.buffered.length > 0) {
      try {
        const removeEnd = videoElement.currentTime - 4;
        if (removeEnd - sb.buffered.start(0) > 8) {
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

  // Pre-roll jitter cushion: start playback smoothly with 200ms cushion or turn finish
  const checkAndStartPlayback = useCallback(() => {
    if (isPausedRef.current) return;
    const videoElement = videoRef.current;
    if (!videoElement) return;

    alignPlayheadToBuffer(videoElement);

    if (!videoElement.paused) return;

    let bufferAhead = 0;
    if (videoElement.buffered.length > 0) {
      const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
      bufferAhead = Math.max(0, bufferedEnd - videoElement.currentTime);
    }

    // 200ms cushion or 2 chunks is optimal to eliminate stutter without delaying speech
    const isTurnFinished = !isTurnReceivingRef.current;
    const hasCushion = bufferAhead >= 0.20 || videoQueueRef.current.length >= 2;

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
  }, [alignPlayheadToBuffer]);

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

      // Low-latency gap recovery: automatically jump over timeline gaps to prevent browser stalls
      videoElement.addEventListener("waiting", () => {
        alignPlayheadToBuffer(videoElement);
        if (videoElement.paused) {
          checkAndStartPlayback();
        }
      });

      videoElement.addEventListener("stalled", () => {
        alignPlayheadToBuffer(videoElement);
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

          // Align playhead across any gap between turns or buffered segments
          alignPlayheadToBuffer(videoElement);

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
  }, [drainVideoQueue, checkAndStartPlayback, alignPlayheadToBuffer]);

  const monitoringLoop = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      if (isPausedRef.current) {
        if (!video.paused) {
          video.pause();
        }
        video.muted = true;
        return;
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

      // If video has paused/finished speech and is idle, ensure agentTalking is false
      if (video.paused && agentTalkingRef.current && !isTurnReceivingRef.current && videoQueueRef.current.length === 0) {
        const bufferedEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
        const bufferAhead = Math.max(0, bufferedEnd - video.currentTime);
        if (bufferAhead <= 0.20 || video.ended) {
          agentTalkingRef.current = false;
          setAgentTalking(false);
          flushTranscriptionsRef.current?.();
        }
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

      // Initialize microphone stream
      try {
        await initMicrophoneStream(validDeviceId);
      } catch (micErr: any) {
        console.warn("[LiveSession] Microphone access unavailable or blocked. Continuing in listen-only mode:", micErr);
      }

      videoQueueRef.current = [];
      cachedInitSegmentRef.current = null;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      monitoringLoop();

      const sessionPromise = ai.live.connect({
        model: liveServiceConfiguration.model || LIVE_API_MODEL_NAME,
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            // Do not set isConnecting to false here, wait for setupComplete
            if (streamRef.current && !scriptProcessorRef.current) {
              startAudioInput();
            }
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
              console.log("[LiveSession] Turn interrupted by server - avatar entering listening state");
              isTurnReceivingRef.current = false;
              agentTalkingRef.current = false;
              setAgentTalking(false);
              videoQueueRef.current = [];

              const video = videoRef.current;
              if (video) {
                try {
                  if (video.buffered.length > 0) {
                    const bufEnd = video.buffered.end(video.buffered.length - 1);
                    video.currentTime = Math.max(video.currentTime, bufEnd);
                  }
                  video.pause();
                } catch (e) {
                  console.warn("Interruption fast-forward error:", e);
                }
              }

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
  }, [isConnected, isConnecting, disconnect, initMediaSource, monitoringLoop, initMicrophoneStream, startAudioInput, configOverrides]);

  const switchMicrophone = useCallback(async (deviceId: string) => {
    if (isConnected && streamRef.current) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true
        });

        newStream.getAudioTracks().forEach(track => track.enabled = !isMutedRef.current);
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
  }, [isConnected]);

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

  const pauseSession = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.pause();
    }
    agentTalkingRef.current = false;
    setAgentTalking(false);
  }, []);

  const resumeSession = useCallback(() => {
    isPausedRef.current = false;
    setIsPaused(false);
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
      if (videoRef.current.buffered.length > 0) {
        checkAndStartPlayback();
      }
    }
  }, [checkAndStartPlayback]);

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
    sendTextMessage,
    micVolume,
    pauseSession,
    resumeSession,
    isPaused
  };
};
