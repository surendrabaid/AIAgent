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
        if (!mseRef.current) return;
        mseRef.current = null;
        sourceBufferRef.current = null;
        videoQueueRef.current = [];
        setError("Video playback error.");
      });
      videoErrorListenerAddedRef.current = true;
    }

    mediaSource.addEventListener("sourceopen", () => {
      try {
        let sourceBuffer = sourceBufferRef.current;
        if (!sourceBuffer) {
          const type = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
          if (MediaSource.isTypeSupported(type)) {
            sourceBuffer = mediaSource.addSourceBuffer(type);
          } else {
            sourceBuffer = mediaSource.addSourceBuffer("video/mp4");
          }
          sourceBuffer.mode = "sequence";
          sourceBufferRef.current = sourceBuffer;

          const cachedInitSegment = cachedInitSegmentRef.current;
          if (cachedInitSegment && videoQueueRef.current[0] !== cachedInitSegment) {
            videoQueueRef.current.unshift(cachedInitSegment);
          }
        }

        const currentSourceBuffer = sourceBufferRef.current;
        if (!currentSourceBuffer) {
          return;
        }

        if (videoQueueRef.current.length > 0 && !currentSourceBuffer.updating) {
          const chunk = videoQueueRef.current.shift();
          if (chunk) {
            try {
              currentSourceBuffer.appendBuffer(chunk);
            } catch (e) {
              setError("Error setting video stream");
            }
          }
        }

        currentSourceBuffer.addEventListener("updateend", () => {
          const sb = sourceBufferRef.current;
          const ms = mseRef.current;
          if (!sb || !ms) return;

          if (videoElement.paused) {
            const playPromise = videoElement.play();
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                console.warn("Autoplay with sound restricted, playing muted until user gesture:", e);
                if (!videoElement.muted) {
                  videoElement.muted = true;
                  setIsAudioBlocked(true);
                  videoElement.play().catch(() => {});
                }
              });
            }
          }

          if (ms.readyState === 'open' && videoElement.buffered.length > 0) {
            try {
              const end = videoElement.buffered.end(videoElement.buffered.length - 1);
              ms.setLiveSeekableRange(0, end);
            } catch (e) {
              // Ignore
            }
          }

          // --- Explicitly remove unneeded data from the buffer ---
          // We keep 5 seconds of history to prevent playback stalls, but aggressively remove older data.
          if (!sb.updating && videoElement.currentTime > 6) {
            try {
              if (videoElement.buffered.length > 0) {
                const start = videoElement.buffered.start(0);
                const endToRemove = videoElement.currentTime - 5;
                if (endToRemove > start) {
                  sb.remove(start, endToRemove);
                  return;
                }
              }
            } catch (e) {
              // Ignore
            }
          }

          if (videoQueueRef.current.length > 0 && !sb.updating) {
            const chunk = videoQueueRef.current.shift();
            if (chunk) {
              try {
                sb.appendBuffer(chunk);
              } catch (e) {
                setError("Error setting video stream");
              }
            }
          }
        });
      } catch (e: any) {
        setError('Failed to initialize video stream.');
      }
    });
  }, []);

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
          if (!isTurnReceivingRef.current && (bufferAhead <= 0.25 || video.ended)) {
            agentTalkingRef.current = false;
            setAgentTalking(false);
            flushTranscriptionsRef.current?.();
          }
        } else {
          // Idle buffer management: smoothly catch up without hard seek jumps
          if (bufferAhead > 2.0) {
            video.playbackRate = 1.15;
          } else if (bufferAhead > 0.5) {
            video.playbackRate = 1.05;
          } else {
            video.playbackRate = 1.0;
          }
        }
      }

      // Update debug stats
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
    animationFrameRef.current = requestAnimationFrame(monitoringLoop);
  }, []);

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
      videoRef.current.load();
    }
    sourceBufferRef.current = null;
    mseRef.current = null;
  }, []);

  const connect = useCallback(async (deviceId: string) => {
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true
      });

      stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      streamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioContextRef.current = inputAudioContext;

      if (outputAudioContextRef.current?.state === 'suspended') {
        await outputAudioContextRef.current.resume();
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
                      session.sendRealtimeInput({ text: msg });
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

                    const sourceBuffer = sourceBufferRef.current;
                    if (sourceBuffer && !sourceBuffer.updating && videoQueueRef.current.length === 0) {
                      try {
                        sourceBuffer.appendBuffer(arrayBuffer);
                      } catch (e: any) {
                        if (e.name === "InvalidStateError") {
                          mseRef.current = null;
                          sourceBufferRef.current = null;
                          videoQueueRef.current = [];
                          setError("MediaSource Invalid State");
                        } else {
                          videoQueueRef.current.push(arrayBuffer);
                        }
                      }
                    } else {
                      videoQueueRef.current.push(arrayBuffer);
                    }
                  }
                }
              }
            }
          },
          onerror: (e: ErrorEvent) => {
            setError('A connection error occurred.');
            disconnect();
          },
          onclose: (e: CloseEvent) => {
            disconnect();
          },
        },
        config: {
          avatarConfig: configOverrides?.avatarConfig || (liveServiceConfiguration as any).avatarConfig,
          speechConfig: configOverrides?.speechConfig || (liveServiceConfiguration as any).generationConfig?.speechConfig,
          responseModalities: (liveServiceConfiguration as any).generationConfig?.responseModalities,
          systemInstruction: configOverrides?.systemInstruction || (liveServiceConfiguration as any).systemInstruction,
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
        session.sendRealtimeInput({ text: cleanText });

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
