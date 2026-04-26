import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';

/**
 * Snapshot-based face emotion detection.
 * 
 * Flow:
 *  1. Camera opens (live preview)
 *  2. 3-second countdown (letting user settle)
 *  3. ONE frame is captured from the video → static canvas
 *  4. face-api runs ONCE on that still image
 *  5. Camera stops — no continuous loop, no tensor leak
 */
export const useFaceEmotion = (isActive = false) => {
  const [isModelLoaded, setIsModelLoaded]   = useState(false);
  const [emotion, setEmotion]               = useState(null);   // null until snapshot done
  const [error, setError]                   = useState(null);
  const [captureCountdown, setCaptureCountdown] = useState(null); // 3 → 2 → 1 → null
  const [isCapturing, setIsCapturing]       = useState(false);  // true while running inference
  const [isComplete, setIsComplete]         = useState(false);  // true after detection done
  const [hasFirstDetection, setHasFirstDetection] = useState(false);
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const bestExprs = useRef({ neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 });

  const isLoadingModels = useRef(false);

  // ── 1. Load models once ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || isModelLoaded || isLoadingModels.current) return;

    const load = async () => {
      isLoadingModels.current = true;
      try {
        // Prefer GPU (WebGL) — silent fallback to CPU if unavailable
        if (faceapi.tf) {
          try { await faceapi.tf.setBackend('webgl'); await faceapi.tf.ready(); } catch {}
        }
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(process.env.PUBLIC_URL + '/models'),
          faceapi.nets.faceExpressionNet.loadFromUri(process.env.PUBLIC_URL + '/models'),
        ]);
        setIsModelLoaded(true);
      } catch (err) {
        console.error('Model load error:', err);
        setError(`Failed to load emotion detection models. Error: ${err.message || err}`);
      } finally {
        isLoadingModels.current = false;
      }
    };

    load();
  }, [isActive, isModelLoaded]);

  // ── 2. Open camera + run snapshot countdown once model is ready ────
  useEffect(() => {
    if (!isActive || !isModelLoaded || isComplete) return;

    let stream;
    let countdownTimer;

    const stopStream = () => {
      // Stop all tracks — this releases the camera hardware
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      // CRITICAL: clear srcObject so browser turns off the camera indicator light
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    // ── Continuous scan logic during countdown ─────────────────────
    const scanFrame = async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        const detections = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 })
          )
          .withFaceExpressions();

        if (detections?.expressions) {
          for (const [emo, val] of Object.entries(detections.expressions)) {
            if (val > (bestExprs.current[emo] || 0)) {
              bestExprs.current[emo] = val;
            }
          }
        }
      } catch (e) {
        console.error('Scan frame error:', e);
      }
    };

    const finalizeEmotion = () => {
      setIsCapturing(true);
      const exprs = bestExprs.current;
      console.log("Accumulated best expressions:", { ...exprs });

      // face-api.js heavily favors 'neutral'. We aggressively reduce its weight so actual emotions shine through.
      if (exprs.neutral) exprs.neutral *= 0.15; 
      // Give a small boost to happy and sad
      if (exprs.happy) exprs.happy *= 1.5;
      if (exprs.sad) exprs.sad *= 1.2;

      let detected = 'neutral';
      const emos = Object.keys(exprs);
      if (emos.length > 0 && Math.max(...Object.values(exprs)) > 0) {
        detected = emos.reduce((a, b) => exprs[a] > exprs[b] ? a : b);
      }

      console.log("Final adjusted emotion:", detected);
      setEmotion(detected);
      setHasFirstDetection(true);
      setIsCapturing(false);
      setIsComplete(true);
      stopStream(); // camera off
    };

    // ── Camera open → 3-second countdown → scan ───────────────
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { max: 15 } },
        });
        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();

          // Reset best expressions
          bestExprs.current = { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0 };
          
          // Start 3-second countdown
          let count = 3;
          setCaptureCountdown(count);
          scanFrame(); // Scan immediately

          countdownTimer = setInterval(() => {
            count--;
            if (count > 0) {
              setCaptureCountdown(count);
              scanFrame(); // Scan again
            } else {
              clearInterval(countdownTimer);
              setCaptureCountdown(null); // countdown done
              finalizeEmotion();
            }
          }, 1000);
        };
      } catch {
        setError('Camera permission denied or camera not available.');
      }
    };

    startCamera();

    return () => {
      clearInterval(countdownTimer);
      stopStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isModelLoaded, isComplete]);

  // ── When deactivated externally, clean up camera ───────────────────
  useEffect(() => {
    if (!isActive && streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [isActive]);

  return {
    isModelLoaded,
    emotion,          // null until snapshot done, then 'happy' | 'sad' | 'neutral' | …
    error,
    videoRef,
    captureCountdown, // 3 → 2 → 1 → null
    isCapturing,      // true while running the single inference
    isComplete,       // true once emotion is locked in
    hasFirstDetection,
  };
};
