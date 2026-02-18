'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { interviewAPI } from '@/lib/api';
import { 
  Brain, MessageSquare, Sparkles, CheckCircle, Clock, ShieldCheck, 
  Video, Mic, Monitor, Power, Settings, Info, AlertCircle,
  MoreVertical, Volume2, Shield, Zap, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function InterviewSessionPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<Array<{ role: 'ai' | 'human'; text: string }>>([]);
  const [mediaPermissions, setMediaPermissions] = useState({ camera: false, microphone: false, screenShare: false });
  const [showPermissionPopup, setShowPermissionPopup] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const permissionPopupShownRef = useRef(false);
  const [isEnding, setIsEnding] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [faceGateOpen, setFaceGateOpen] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<'unavailable' | 'initializing' | 'active' | 'paused'>('unavailable');
  const [integrityGateOpen, setIntegrityGateOpen] = useState(false);
  const [integrityGateReason, setIntegrityGateReason] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<any>(null);
  const mpFaceDetectorRef = useRef<any>(null);
  const mpInitInFlightRef = useRef(false);
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastFaceSeenAtRef = useRef<number>(Date.now());
  const faceGateOpenRef = useRef(false);
  const integrityGateOpenRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const allowListeningRef = useRef(true);
  const answerInFlightRef = useRef(false);
  const currentQuestionIndexRef = useRef(0);
  const isSpeakingRef = useRef(false);
  const lastSpokenTextRef = useRef('');
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscriptRef = useRef('');
  const lastSpeechEventAtRef = useRef(0);
  const accumulatedFinalRef = useRef('');
  const noResponseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followupCountRef = useRef(0);
  const baseQuestionTextRef = useRef<string | null>(null);
  const activeQuestionIdRef = useRef<number | null>(null);
  const activeQuestionTypeRef = useRef<string | null>(null);
  const isFollowupModeRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const integrityBlockListeningRef = useRef(false);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  const isGeneratingQuestions =
    !!interview &&
    !showPermissionPopup &&
    !isInitialized &&
    (!Array.isArray(interview?.questions) || interview.questions.length === 0);

  useEffect(() => {
    fetchInterview();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (noResponseTimerRef.current) clearTimeout(noResponseTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [interviewId]);

  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!cameraStreamRef.current) return;
    if (!videoRef.current) return;

    if (videoRef.current.srcObject !== cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
    const p = videoRef.current.play?.();
    if (p && typeof (p as any).catch === 'function') {
      (p as any).catch(() => {});
    }
  }, [isInitialized, mediaPermissions.camera]);

  useEffect(() => {
    if (!isInitialized) return;

    console.log('[Camera] isInitialized true, checking video element...');
    const checkAndPlay = () => {
      const videoEl = videoRef.current;
      const stream = cameraStreamRef.current;
      if (!videoEl) {
        console.log('[Camera] videoEl not found, retrying in 100ms...');
        setTimeout(checkAndPlay, 100);
        return;
      }
      if (!stream) {
        console.log('[Camera] stream not found, retrying in 100ms...');
        setTimeout(checkAndPlay, 100);
        return;
      }

      console.log('[Camera] videoEl found, readyState:', videoEl.readyState, 'paused:', videoEl.paused);
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
        console.log('[Camera] srcObject set to stream');
      }

      const ensurePlaying = () => {
        if (!videoEl || !stream) return;
        if (videoEl.readyState < 2) {
          console.log('[Camera] Waiting for readyState >= 2, current:', videoEl.readyState);
          setTimeout(ensurePlaying, 100);
          return;
        }
        if (videoEl.paused || videoEl.ended) {
          console.log('[Camera] Calling play()');
          const p = videoEl.play?.();
          if (p && typeof (p as any).catch === 'function') {
            (p as any).catch((e: any) => {
              console.warn('[Camera] play() error:', e);
            });
          }
        }
      };

      ensurePlaying();

      setTimeout(() => {
        if (!videoEl || !stream) return;
        if (videoEl.paused && videoEl.readyState >= 2) {
          console.log('[Camera] Force-playing video after delay');
          const p = videoEl.play?.();
          if (p && typeof (p as any).catch === 'function') {
            (p as any).catch(() => {});
          }
        }
      }, 500);
    };

    checkAndPlay();
  }, [isInitialized]);

  useEffect(() => {
    faceGateOpenRef.current = faceGateOpen;
  }, [faceGateOpen]);

  useEffect(() => {
    integrityGateOpenRef.current = integrityGateOpen;
  }, [integrityGateOpen]);

  const pauseForFaceGate = () => {
    if (faceGateOpenRef.current) return;
    setFaceGateOpen(true);
    allowListeningRef.current = false;
    stopListening();
    try { window.speechSynthesis.cancel(); } catch {}
  };

  const resumeFromFaceGate = () => {
    if (!faceGateOpenRef.current) return;
    setFaceGateOpen(false);
    allowListeningRef.current = true;
    startListening();
  };

  const requestFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) return;
    try {
      await el.requestFullscreen();
    } catch {
      // ignore (some browsers disallow)
    }
  };

  const pauseForIntegrityGate = (reason: string) => {
    if (integrityGateOpenRef.current) return;
    setIntegrityGateReason(reason);
    setIntegrityGateOpen(true);
    integrityBlockListeningRef.current = true;
    allowListeningRef.current = false;
    stopListening();
    try { window.speechSynthesis.cancel(); } catch {}
  };

  const resumeFromIntegrityGate = async () => {
    setIntegrityGateOpen(false);
    integrityGateOpenRef.current = false;
    integrityBlockListeningRef.current = false;
    await requestFullscreen();
    allowListeningRef.current = true;
    startListening();
  };

  useEffect(() => {
    if (!isInitialized) return;

    const onVisibility = () => {
      if (document.hidden) {
        pauseForIntegrityGate('Tab/window switch detected. Return to the interview to continue.');
      }
    };

    const onBlur = () => {
      pauseForIntegrityGate('Focus lost. Please stay on the interview screen.');
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        pauseForIntegrityGate('Fullscreen exited. Re-enter fullscreen to continue.');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!mediaPermissions.camera) return;

    setFaceDetectionStatus('initializing');

    const initMediapipe = async () => {
      if (mpFaceDetectorRef.current) return;
      if (mpInitInFlightRef.current) return;
      mpInitInFlightRef.current = true;
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const FilesetResolver = (vision as any).FilesetResolver;
        const FaceDetector = (vision as any).FaceDetector;
        if (!FilesetResolver || !FaceDetector) {
          setFaceDetectionStatus('unavailable');
          return;
        }

        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        mpFaceDetectorRef.current = await FaceDetector.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
          },
          runningMode: 'VIDEO'
        });
      } catch (e) {
        console.warn('[FaceDetection] Mediapipe init failed:', e);
        setFaceDetectionStatus('unavailable');
      } finally {
        mpInitInFlightRef.current = false;
      }
    };

    // Cross-browser face detection via MediaPipe Tasks Vision.
    // We keep faceDetectorRef for legacy, but MediaPipe is the primary path.
    void initMediapipe();

    if (!mpFaceDetectorRef.current && !faceDetectorRef.current) {
      // Leave it as initializing; init is async.
      // If it ultimately fails, initMediapipe will set unavailable.
    }
    if (faceIntervalRef.current) return;

    lastFaceSeenAtRef.current = Date.now();

    faceIntervalRef.current = setInterval(async () => {
      const videoEl = videoRef.current;
      const canvasEl = faceCanvasRef.current;
      const detector = faceDetectorRef.current;
      const mpDetector = mpFaceDetectorRef.current;
      if (!videoEl || !canvasEl) return;
      if (!detector && !mpDetector) return;
      if (videoEl.readyState < 2) return;

      const vw = videoEl.videoWidth || 0;
      const vh = videoEl.videoHeight || 0;
      if (!vw || !vh) return;

      const rect = videoEl.getBoundingClientRect();
      const cw = Math.round(rect.width);
      const ch = Math.round(rect.height);
      if (!cw || !ch) return;

      if (canvasEl.width !== cw) canvasEl.width = cw;
      if (canvasEl.height !== ch) canvasEl.height = ch;

      const scaleX = cw / vw;
      const scaleY = ch / vh;

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);

      try {
        let box: any = null;
        if (mpDetector) {
          const result = mpDetector.detectForVideo(videoEl, performance.now());
          const d = result?.detections?.[0];
          box = d?.boundingBox
            ? {
                x: d.boundingBox.originX,
                y: d.boundingBox.originY,
                width: d.boundingBox.width,
                height: d.boundingBox.height
              }
            : null;
        } else if (detector) {
          const faces = await detector.detect(videoEl);
          const face = faces?.[0];
          box = face?.boundingBox || null;
        }

        if (box) {
          lastFaceSeenAtRef.current = Date.now();

          if (faceDetectionStatus !== 'active') setFaceDetectionStatus('active');

          ctx.strokeStyle = 'rgba(37, 99, 235, 0.95)';
          ctx.lineWidth = Math.max(5, Math.round(cw / 100));
          const padding = Math.max(10, Math.round(cw / 40));
          ctx.strokeRect(
            (box.x - padding) * scaleX,
            (box.y - padding) * scaleY,
            (box.width + padding * 2) * scaleX,
            (box.height + padding * 2) * scaleY
          );
          resumeFromFaceGate();
        } else {
          const elapsed = Date.now() - lastFaceSeenAtRef.current;
          if (elapsed > 2000) pauseForFaceGate();
        }
      } catch (err) {
        setFaceDetectionStatus('paused');
        console.warn('[FaceDetection] Detection error:', err);
      }
    }, 500);

    return () => {
      if (faceIntervalRef.current) {
        clearInterval(faceIntervalRef.current);
        faceIntervalRef.current = null;
      }
    };
  }, [isInitialized, mediaPermissions.camera]);

  const fetchInterview = async () => {
    try {
      const data = await interviewAPI.get(interviewId);
      setInterview(data);

      const ready = Array.isArray(data.questions) && data.questions.length > 0;
      if (ready) {
        if (!permissionPopupShownRef.current && !isInitialized) {
          setShowPermissionPopup(true);
          permissionPopupShownRef.current = true;
        }
      } else {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const pollData = await interviewAPI.get(interviewId);
            const pollReady = Array.isArray(pollData.questions) && pollData.questions.length > 0;
            if (pollReady) {
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              if (!permissionPopupShownRef.current && !isInitialized) {
                setShowPermissionPopup(true);
                permissionPopupShownRef.current = true;
              }
            }
          } catch {}
        }, 2000);
        setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            setLoadingError('Calibration timeout. Questions taking too long to synthesize.');
          }
        }, 60000);
      }
    } catch (error) {
      console.error('Error fetching interview:', error);
      setLoadingError('Failed to load session protocol.');
    }
  };

  const fetchNextQuestion = async () => {
    const payload = await interviewAPI.getNextQuestion(interviewId);
    const q = payload?.question;
    if (payload?.done || !q) {
      return { done: true as const, question: null };
    }
    return { done: false as const, question: q };
  };

  const submitAnswerToBackend = async (questionId: number | null, answerText: string) => {
    if (!questionId) return;
    try {
      await interviewAPI.submitAnswer(interviewId, questionId, answerText);
    } catch (e) {
      console.error('Error submitting answer:', e);
    }
  };

  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      cameraStreamRef.current = stream;
      mediaStreamRef.current = stream;
      console.log('[Camera] Stream obtained, videoEl exists:', !!videoRef.current);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('[Camera] srcObject set, readyState:', videoRef.current.readyState, 'paused:', videoRef.current.paused);
        // Poll until video has loaded metadata, then play
        const ensurePlaying = () => {
          const videoEl = videoRef.current;
          if (!videoEl) return;
          console.log('[Camera] Polling readyState:', videoEl.readyState);
          if (videoEl.readyState >= 2) {
            console.log('[Camera] Calling play()');
            const p = videoEl.play?.();
            if (p && typeof (p as any).catch === 'function') {
              (p as any).catch((e: any) => {
                console.warn('[Camera] play() error:', e);
              });
            }
          } else {
            setTimeout(ensurePlaying, 100);
          }
        };
        ensurePlaying();
      }
      setMediaPermissions(prev => ({ ...prev, camera: true, microphone: true }));

      // Screen share is handled via explicit UI action (requestScreenSharePermission)

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          recognitionActiveRef.current = true;
          setIsListening(true);
        };

        recognitionRef.current.onend = () => {
          recognitionActiveRef.current = false;
          setIsListening(false);
        };

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += t;
            } else {
              interimTranscript += t;
            }
          }

          if (finalTranscript) {
            const cleaned = finalTranscript.trim();
            if (cleaned) {
              accumulatedFinalRef.current = `${accumulatedFinalRef.current} ${cleaned}`.trim();
            }
          }

          const combined = `${accumulatedFinalRef.current} ${interimTranscript}`.trim();
          setTranscript(combined);

          if (!combined) return;

          const lastSpoken = (lastSpokenTextRef.current || '').trim();
          const normCombined = combined.toLowerCase().replace(/\s+/g, ' ').trim();
          const normLastSpoken = lastSpoken.toLowerCase().replace(/\s+/g, ' ').trim();
          const combinedPrefix = normCombined.slice(0, 60);
          const spokenPrefix = normLastSpoken.slice(0, 60);
          const looksLikeAiEcho = !!normLastSpoken && (
            normCombined === normLastSpoken ||
            (combinedPrefix.length > 15 && normLastSpoken.includes(combinedPrefix)) ||
            (spokenPrefix.length > 15 && normCombined.includes(spokenPrefix))
          );

          if (looksLikeAiEcho) return;
          if (answerInFlightRef.current) return;
          if (isSpeakingRef.current) return;

          latestTranscriptRef.current = combined;
          lastSpeechEventAtRef.current = Date.now();

          if (noResponseTimerRef.current) {
            clearTimeout(noResponseTimerRef.current);
            noResponseTimerRef.current = null;
          }

          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          silenceTimerRef.current = setTimeout(() => {
            const now = Date.now();
            const elapsedMs = now - lastSpeechEventAtRef.current;
            if (elapsedMs < 5200) return;
            if (answerInFlightRef.current) return;
            if (isSpeakingRef.current) return;

            const finalAnswer = (latestTranscriptRef.current || '').trim();
            if (!finalAnswer) return;

            answerInFlightRef.current = true;
            stopListening();
            handleUserResponse(finalAnswer);
          }, 5500);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        setIsInitialized(true);
      }
    } catch (error) {
      console.error('Error requesting media permissions:', error);
      alert('Please allow camera and microphone access to proceed with the session protocol.');
    }
  };

  const handlePermissionGrant = async () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        recognitionActiveRef.current = true;
        setIsListening(true);
      };

      recognitionRef.current.onend = () => {
        recognitionActiveRef.current = false;
        setIsListening(false);
      };

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t;
          } else {
            interimTranscript += t;
          }
        }

        if (finalTranscript) {
          const cleaned = finalTranscript.trim();
          if (cleaned) {
            accumulatedFinalRef.current = `${accumulatedFinalRef.current} ${cleaned}`.trim();
          }
        }

        const combined = `${accumulatedFinalRef.current} ${interimTranscript}`.trim();
        setTranscript(combined);

        if (!combined) return;

        const lastSpoken = (lastSpokenTextRef.current || '').trim();
        const normCombined = combined.toLowerCase().replace(/\s+/g, ' ').trim();
        const normLastSpoken = lastSpoken.toLowerCase().replace(/\s+/g, ' ').trim();
        const combinedPrefix = normCombined.slice(0, 60);
        const spokenPrefix = normLastSpoken.slice(0, 60);
        const looksLikeAiEcho = !!normLastSpoken && (
          normCombined === normLastSpoken ||
          (combinedPrefix.length > 15 && normLastSpoken.includes(combinedPrefix)) ||
          (spokenPrefix.length > 15 && normCombined.includes(spokenPrefix))
        );

        if (looksLikeAiEcho) return;
        if (answerInFlightRef.current) return;
        if (isSpeakingRef.current) return;

        latestTranscriptRef.current = combined;
        lastSpeechEventAtRef.current = Date.now();

        if (noResponseTimerRef.current) {
          clearTimeout(noResponseTimerRef.current);
          noResponseTimerRef.current = null;
        }

        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          const now = Date.now();
          const elapsedMs = now - lastSpeechEventAtRef.current;
          if (elapsedMs < 5200) return;
          if (answerInFlightRef.current) return;
          if (isSpeakingRef.current) return;

          const finalAnswer = (latestTranscriptRef.current || '').trim();
          if (!finalAnswer) return;

          answerInFlightRef.current = true;
          stopListening();
          handleUserResponse(finalAnswer);
        }, 5500);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    }

    setIsInitialized(true);
    setShowPermissionPopup(false);

    // Ensure camera preview is actually running at session start.
    if (!cameraStreamRef.current) {
      await requestCameraPermission();
    }
    if (cameraStreamRef.current && videoRef.current?.srcObject !== cameraStreamRef.current) {
      if (videoRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
        const p = videoRef.current.play?.();
        if (p && typeof (p as any).catch === 'function') {
          (p as any).catch(() => {});
        }
      }
    }

    await requestFullscreen();

    // One-question-at-a-time flow: questions[] is often empty at this point.
    // Kick off the session by fetching the first question from the backend.
    answerInFlightRef.current = false;
    setTranscript('');
    latestTranscriptRef.current = '';
    accumulatedFinalRef.current = '';
    await askNextQuestion();
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = stream;
      } else {
        stream.getTracks().forEach(track => mediaStreamRef.current?.addTrack(track));
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setMediaPermissions(prev => ({ ...prev, camera: true }));
    } catch (error) {
      console.error('Camera permission denied:', error);
    }
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = stream;
      } else {
        stream.getTracks().forEach(track => mediaStreamRef.current?.addTrack(track));
      }
      if (videoRef.current) {
        if (cameraStreamRef.current) {
          videoRef.current.srcObject = cameraStreamRef.current;
        }
      }
      setMediaPermissions(prev => ({ ...prev, microphone: true }));
    } catch (error) {
      console.error('Microphone permission denied:', error);
    }
  };

  const requestScreenSharePermission = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = screenStream;
      } else {
        screenStream.getTracks().forEach(track => mediaStreamRef.current?.addTrack(track));
      }
      // Keep the on-page preview pinned to the camera stream.
      if (videoRef.current && cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }

      const displayTrack = screenStream.getVideoTracks?.()[0];
      if (displayTrack) {
        displayTrack.onended = () => {
          pauseForIntegrityGate('Screen share stopped. Please re-share your screen to continue.');
          setMediaPermissions(prev => ({ ...prev, screenShare: false }));
        };
      }

      setMediaPermissions(prev => ({ ...prev, screenShare: true }));
    } catch (error) {
      console.error('Screen share permission denied:', error);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) return;
    if (isSpeakingRef.current) return;
    if (!allowListeningRef.current) return;
    if (recognitionActiveRef.current) return;

    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
    }

    noResponseTimerRef.current = setTimeout(() => {
      if (answerInFlightRef.current) return;
      if (isSpeakingRef.current) return;
      if (!allowListeningRef.current) return;

      const finalAnswer = (latestTranscriptRef.current || '').trim();
      if (finalAnswer) return;

      answerInFlightRef.current = true;
      stopListening();
      handleUserResponse('');
    }, 6000);

    if (!isListening && !recognitionActiveRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && (isListening || recognitionActiveRef.current)) {
      try { recognitionRef.current.stop(); } catch {}
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (noResponseTimerRef.current) { clearTimeout(noResponseTimerRef.current); noResponseTimerRef.current = null; }
      recognitionActiveRef.current = false;
      setIsListening(false);
    }
  };

  const speak = async (text: string) => {
    if ('speechSynthesis' in window && !isSpeaking) {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      allowListeningRef.current = false;
      lastSpokenTextRef.current = text;
      stopListening();
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        allowListeningRef.current = true;
        setTimeout(() => { startListening(); }, 500);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        allowListeningRef.current = true;
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const askNextQuestion = async () => {
    const res = await fetchNextQuestion();
    if (res.done || !res.question) {
      speak('The session is complete. Synthesizing performance metrics.');
      setConversation(prev => [...prev, { role: 'ai', text: 'Protocol complete. Finalizing results...' }]);
      setTimeout(() => endInterview(), 4000);
      return;
    }

    const question = res.question;
    setQuestions([question]);
    activeQuestionIdRef.current = question?.id ?? null;
    activeQuestionTypeRef.current = question?.question_type ?? null;
    baseQuestionTextRef.current = question?.question_text ?? null;
    followupCountRef.current = 0;
    isFollowupModeRef.current = false;

    speak(question.question_text);
    setConversation(prev => [...prev, { role: 'ai', text: question.question_text }]);
  };

  const evaluateAnswer = async (questionText: string, answer: string, followupCount: number) => {
    return await interviewAPI.evaluateAnswer(interviewId, {
      question_text: questionText,
      answer: answer,
      followup_count: followupCount,
    });
  };

  const handleUserResponse = async (response: string) => {
    const answerText = response?.trim() ? response : '';

    setConversation(prev => [...prev, { role: 'human', text: answerText || '(No response captured)' }]);

    const activeType = activeQuestionTypeRef.current;
    const isBasic = activeType === 'basic';

    await submitAnswerToBackend(activeQuestionIdRef.current, answerText);

    setTranscript('');
    latestTranscriptRef.current = '';
    accumulatedFinalRef.current = '';

    if (isBasic) {
      answerInFlightRef.current = false;
      setCurrentQuestionIndex(prev => prev + 1);
      currentQuestionIndexRef.current = currentQuestionIndexRef.current + 1;
      await askNextQuestion();
      return;
    }

    try {
      const baseQ = baseQuestionTextRef.current || questions[currentQuestionIndexRef.current]?.question_text || '';
      const evalQ = isFollowupModeRef.current ? (baseQ + `\nFollow-up asked: ${lastSpokenTextRef.current}`) : baseQ;
      const result = await evaluateAnswer(evalQ, answerText, followupCountRef.current);

      if (result.decision === 'followup' && result.followup_question && followupCountRef.current < 2) {
        followupCountRef.current += 1;
        isFollowupModeRef.current = true;
        setConversation(prev => [...prev, { role: 'ai', text: result.followup_question as string }]);
        speak(result.followup_question as string);
        answerInFlightRef.current = false;
        return;
      }
    } catch (e) {
      console.error('Answer evaluation failed, continuing to next question:', e);
    }

  const nextIndex = currentQuestionIndexRef.current + 1;
    currentQuestionIndexRef.current = nextIndex;
    setCurrentQuestionIndex(nextIndex);
    answerInFlightRef.current = false;
    await askNextQuestion();
  };

  const endInterview = async () => {
    setIsEnding(true);
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    try {
      await interviewAPI.end(interviewId);
      router.push(`/interviews/${interviewId}/results`);
    } catch (error) {
      console.error('Error ending interview:', error);
      router.push('/dashboard');
    }
  };

  if (!interview) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-white/90 tracking-tight">Initializing Protocol</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">Syncing Performance Grid...</p>
        </div>
      </div>
    );
  }

  if (isEnding) {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
      <div className="text-center relative z-10">
        <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-pulse">
          <Zap className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Finalizing Session</h2>
        <p className="text-white/40 text-sm font-medium uppercase tracking-widest">Synthesizing performance intelligence...</p>
      </div>
    </div>
  );
}

return (
  <div ref={rootRef} className="min-h-screen bg-[#0F172A] text-white selection:bg-blue-500/30 overflow-hidden relative flex flex-col font-sans">
    <header className="h-16 border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white/90 uppercase tracking-widest leading-none">Live Simulation</h2>
          <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{interview.job_title}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
          <div className={`w-2 h-2 rounded-full animate-pulse ${isListening ? 'bg-emerald-500' : isSpeaking ? 'bg-blue-500' : 'bg-white/20'}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            {isListening ? 'AI Listening' : isSpeaking ? 'AI Speaking' : 'System Idle'}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => endInterview()} className="text-white/40 hover:text-rose-400 hover:bg-rose-500/10 px-4 text-[10px] font-bold uppercase tracking-widest transition-all">
          End Session
        </Button>
      </div>
    </header>

    <AnimatePresence>
      {(isGeneratingQuestions || !!loadingError) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="sticky top-16 z-40"
        >
          <div className="mx-auto max-w-3xl px-6 pt-4">
            <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                    {loadingError ? 'Delayed' : 'Preparing'}
                  </p>
                  <p className="text-sm font-bold text-white/90 tracking-tight">
                    {loadingError ? loadingError : 'Generating your interview questions…'}
                  </p>
                  {!loadingError && (
                    <p className="text-xs text-white/40 font-medium mt-1">
                      This usually takes a few seconds.
                    </p>
                  )}
                </div>
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-blue-600"
                  initial={{ x: '-60%', width: '60%' }}
                  animate={{ x: ['-60%', '100%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-[#0F172A]">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {conversation.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[85%] rounded-[2rem] px-8 py-6 shadow-2xl relative group transition-all ${
                  msg.role === 'ai' ? 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none shadow-blue-600/10'
                }`}>
                  <div className={`absolute -top-3 ${msg.role === 'ai' ? 'left-0' : 'right-0'} px-3 py-1 rounded-full bg-[#1E293B] border border-white/10 text-[8px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors`}>
                    {msg.role === 'ai' ? 'AI Evaluator' : 'Candidate'}
                  </div>
                  <p className="text-sm md:text-base font-medium leading-relaxed tracking-tight">{msg.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={conversationEndRef} />
        </div>

        <div className="p-6 bg-[#0F172A]/50 backdrop-blur-md border-t border-white/5">
          <div className={`rounded-2xl border transition-all duration-500 p-5 flex items-center gap-5 ${
            isListening ? 'bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-white/5 border border-white/10'
          }`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isListening ? 'bg-blue-600 shadow-lg shadow-blue-500/40' : 'bg-white/5'
            }`}>
              <Mic className={`w-5 h-5 ${isListening ? 'text-white' : 'text-white/20'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 transition-colors ${
                isListening ? 'text-blue-400' : 'text-white/30'
              }`}>
                {isListening ? 'Live Transcription' : 'Microphone Inactive'}
              </p>
              <p className={`text-sm font-medium italic truncate transition-colors ${
                transcript ? 'text-white/80' : 'text-white/20'
              }`}>
                {transcript || (isListening ? 'Processing speech signal...' : 'Waiting for system prompt...')}
              </p>
            </div>
            {isListening && (
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 20, 8] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-blue-500 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full md:w-[400px] border-l border-white/5 flex flex-col bg-[#0F172A] p-8 space-y-6">
        <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-black border border-white/10 shadow-2xl group">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale-[0.2] contrast-[1.1] scale-[1.02]" />
          <canvas ref={faceCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <Badge className="bg-black/40 backdrop-blur-md border-white/10 text-white/90 font-bold text-[8px] uppercase tracking-widest px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-2 inline-block" /> Live Stream
            </Badge>
          </div>
          {faceDetectionStatus === 'active' && (
            <div className="absolute bottom-6 left-6 flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 backdrop-blur-md">
                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" /> Focus Locked
                </span>
              </div>
            </div>
          )}
        </div>

        <Card className="bg-white/5 border-white/10 p-6 rounded-3xl shadow-xl">
          <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-6">Simulation Intel</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Status</p>
              <p className="text-xs font-bold text-white/90 uppercase">Active</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-1">Integrity</p>
              <p className="text-xs font-bold text-emerald-400 uppercase">Secure</p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex justify-between items-end mb-3 px-1">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Atmosphere Sync</p>
              <p className="text-[10px] font-bold text-blue-400">98%</p>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: '98%' }} className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
            </div>
          </div>
        </Card>

        <div className="p-6 rounded-3xl bg-blue-600/5 border border-blue-500/10">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Session Protocol</p>
              <p className="text-xs text-white/50 leading-relaxed font-medium">Ensure your face remains within the optical grid for continuous performance validation.</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <AnimatePresence>
      {faceGateOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0F172A]/90 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full">
            <div className="w-24 h-24 rounded-[2.5rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-8 animate-pulse shadow-2xl">
              <Video className="w-10 h-10 text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-3 uppercase tracking-widest">Optical Sync Lost</h2>
            <p className="text-white/50 text-sm leading-relaxed mb-10 font-medium">Please realign your visual profile with the sensor to resume protocol.</p>
          </div>
        </motion.div>
      )}

      {integrityGateOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-[#0F172A]/95 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[3rem] p-12 shadow-2xl text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-4 uppercase tracking-widest">Integrity Violation</h2>
            <p className="text-white/50 text-sm italic mb-10">"{integrityGateReason}"</p>
            <div className="space-y-4 mb-8">
              {!mediaPermissions.screenShare && (
                <Button onClick={requestScreenSharePermission} className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-bold h-14 rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-3">
                  <Monitor className="w-4 h-4" /> Re-sync Display
                </Button>
              )}
              <Button onClick={resumeFromIntegrityGate} disabled={!mediaPermissions.screenShare} className="w-full bg-white disabled:bg-white/5 disabled:text-white/10 text-[#0F172A] font-bold h-14 rounded-2xl text-[11px] uppercase tracking-widest transition-all">Resume Session</Button>
            </div>
          </div>
        </motion.div>
      )}

      {showPermissionPopup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] bg-[#0F172A] flex items-center justify-center p-6 overflow-hidden">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-xl w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-600/40">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-4 uppercase tracking-widest italic">Initialize Simulation</h2>
            <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm mx-auto mb-12">Synchronizing sensors for high-fidelity evaluation. Access to optical, audio, and display streams is required.</p>
            <div className="space-y-4 mb-12 text-left">
              {[
                { icon: Video, label: 'Optical Grid', status: mediaPermissions.camera, action: requestCameraPermission },
                { icon: Mic, label: 'Audio Sensor', status: mediaPermissions.microphone, action: requestMicPermission },
                { icon: Monitor, label: 'Display Sync', status: mediaPermissions.screenShare, action: requestScreenSharePermission }
              ].map((p, i) => (
                <div key={i} onClick={() => !p.status && p.action()} className={`flex items-center justify-between p-5 rounded-3xl transition-all cursor-pointer ${p.status ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white/5 border border-white/10 hover:bg-white/[0.08]'}`}>
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${p.status ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                      <p.icon className={`w-5 h-5 ${p.status ? 'text-emerald-400' : 'text-white/20'}`} />
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-widest ${p.status ? 'text-white/90' : 'text-white/40'}`}>{p.label}</span>
                  </div>
                  {p.status ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold uppercase px-3 py-1 rounded-full border-none">Synced</Badge>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest px-3">Activate</span>
                  )}
                </div>
              ))}
            </div>

            <Button 
              onClick={handlePermissionGrant} 
              disabled={!mediaPermissions.camera || !mediaPermissions.microphone || !mediaPermissions.screenShare}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-white/5 disabled:text-white/20 text-white font-bold h-16 rounded-[2rem] shadow-2xl shadow-blue-600/20 text-[11px] uppercase tracking-[0.2em] transition-all"
            >
              Engage Simulation
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);
}
