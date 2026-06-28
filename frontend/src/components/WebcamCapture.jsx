import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useFaceModels } from '../context/FaceModelContext';
import { playSuccess, playError, playBeep, vibrate } from '../utils/sounds';
import { scoreImage } from '../utils/imageScorer';
import {
  checkChallenge, CHALLENGES, computeEAR, estimateHeadPose,
  getHeadPoseLabel, detectScreenSpoof
} from '../utils/liveness';
import {
  FiCamera,
  FiUpload,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiVideo,
  FiVideoOff,
  FiImage,
  FiSave,
  FiPlay,
  FiSquare,
  FiMaximize2,
  FiMinimize2,
  FiEye,
  FiSmile,
  FiArrowLeft,
  FiArrowRight,
} from 'react-icons/fi';

const WebcamCapture = ({
  onCapture,
  onRegister,
  onCaptureMulti,
  mode = 'recognize',
  disabled = false,
  className = '',
  currentStep = 0,
  totalSteps = 5,
  resetKey
}) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const { modelsLoaded, faceapi } = useFaceModels();
  const [hasFace, setHasFace] = useState(false);
  const autoCaptureRef = useRef(null);
  const countdownRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cameraContainerRef = useRef(null);
  const [faceCount, setFaceCount] = useState(0);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const earHistoryRef = useRef([]);
  const faceCountRef = useRef(0);
  const [livenessMessage, setLivenessMessage] = useState('');
  const [livenessChallenge, setLivenessChallenge] = useState(0);
  const [livenessCompleted, setLivenessCompleted] = useState(new Set());
  const [currentPose, setCurrentPose] = useState(null);
  const [challengeStatus, setChallengeStatus] = useState('waiting');
  const [spoofScore, setSpoofScore] = useState(null);
  const [spoofChecked, setSpoofChecked] = useState(false);

  // Toggle maximized view (CSS-only, no browser fullscreen API)
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Liveness: compute EAR (Eye Aspect Ratio)
  const computeEAR = useCallback((landmarks) => {
    const getEye = (points, idx) => ({
      x: points[idx].x, y: points[idx].y
    });
    const leftIdx = [36, 37, 38, 39, 40, 41];
    const rightIdx = [42, 43, 44, 45, 46, 47];
    const calcEAR = (eye) => {
      const a = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
      const b = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
      const c = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
      return (a + b) / (2 * c);
    };
    const leftEye = leftIdx.map(i => getEye(landmarks, i));
    const rightEye = rightIdx.map(i => getEye(landmarks, i));
    return (calcEAR(leftEye) + calcEAR(rightEye)) / 2;
  }, []);

  // Detection loop – optimized with refs + throttled state updates
  useEffect(() => {
    if (!modelsLoaded || !isCameraActive || !webcamRef.current?.video) return;

    const hasFaceRef = { current: false };
    const poseRef = { current: null };

    const runDetection = async () => {
      try {
        const video = webcamRef.current.video;
        if (!video || video.readyState < 2) return;

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 });
        const needLandmarks = mode === 'register';
        const detections = needLandmarks
          ? await faceapi.detectAllFaces(video, options).withFaceLandmarks()
          : await faceapi.detectAllFaces(video, options);

        const faceDetected = detections.length > 0;

        // Throttle React state – only update when value changes
        if (faceDetected !== hasFaceRef.current) {
          hasFaceRef.current = faceDetected;
          setHasFace(faceDetected);
        }
        if (detections.length !== faceCountRef.current) {
          faceCountRef.current = detections.length;
          setFaceCount(detections.length);
        }

        // Liveness + pose (register mode only)
        if (needLandmarks && faceDetected && detections[0].landmarks) {
          const landmarks = detections[0].landmarks.positions;
          const pose = estimateHeadPose(landmarks);
          poseRef.current = pose;
          setCurrentPose(pose);

          const ear = computeEAR(landmarks);
          const history = earHistoryRef.current;
          history.push(ear);
          if (history.length > 15) history.shift();

          const challenge = CHALLENGES[livenessChallenge];
          if (challenge && !livenessCompleted.has(challenge.id)) {
            const { passed } = checkChallenge(challenge.id, landmarks, earHistoryRef.current);
            if (passed) {
              setChallengeStatus('passed');
              const next = new Set(livenessCompleted);
              next.add(challenge.id);
              setLivenessCompleted(next);
              if (livenessChallenge < CHALLENGES.length - 1) {
                setTimeout(() => {
                  setLivenessChallenge(prev => prev + 1);
                  setChallengeStatus('waiting');
                }, 600);
              } else {
                setLivenessPassed(true);
                setLivenessMessage('✓ Xác thực hoàn tất');
              }
            } else {
              setChallengeStatus('waiting');
            }
          }
        }

        // Canvas drawing (no state updates)
        const canvas = canvasRef.current;
        if (!canvas) return;
        const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!faceDetected) return;

        const resized = faceapi.resizeResults(detections, displaySize);

        for (const det of resized) {
          const box = det.detection.box;
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);

          ctx.fillStyle = 'rgba(34,197,94,0.85)';
          ctx.font = 'bold 12px sans-serif';
          const scoreStr = `${Math.round(det.detection.score * 100)}%`;
          const textW = ctx.measureText(scoreStr).width;
          ctx.fillRect(box.x, box.y - 22, textW + 12, 20);
          ctx.fillStyle = 'white';
          ctx.fillText(scoreStr, box.x + 6, box.y - 8);
        }

        // Only draw landmarks + head pose in register mode
        if (needLandmarks) {
          faceapi.draw.drawFaceLandmarks(canvas, resized);

          if (poseRef.current && resized.length > 0) {
            const box = resized[0].detection.box;
            const cx = box.x + box.width / 2;
            const cy = box.y + box.height / 2;
            const len = 30 + Math.abs(poseRef.current.yaw * 5); // dynamic length
            const dx = poseRef.current.yaw * len;
            const dy = poseRef.current.pitch * len;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + dx, cy + dy);
            ctx.strokeStyle = livenessPassed ? '#22c55e' : '#f59e0b';
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx + dx, cy + dy, 5, 0, Math.PI * 2);
            ctx.fillStyle = livenessPassed ? '#22c55e' : '#f59e0b';
            ctx.fill();
          }
        }
      } catch (err) {
        // skip frame errors silently
      }
    };

    detectionIntervalRef.current = setInterval(runDetection, 333);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, isCameraActive, mode]);

  // Extract ALL descriptors (multi-face)
  const extractAllDescriptors = async (imageSrc) => {
    if (!modelsLoaded) return [];
    try {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptors();
      return detections.map((d) => ({
        descriptor: Array.from(d.descriptor),
        score: d.detection.score,
        box: d.detection.box,
      }));
    } catch (err) {
      console.error('Error extracting descriptors:', err);
      return [];
    }
  };

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError(null);
    setCaptureStatus('processing');
    setIsCapturing(true);

    try {
      const reader = new FileReader();

      reader.onloadend = async () => {
        try {
          const imageSrc = reader.result;
          setImgSrc(imageSrc);

          const faceResults = await extractAllDescriptors(imageSrc);
          const descriptor = faceResults.length > 0 ? faceResults[0].descriptor : null;

          if (onCapture) {
            await onCapture(imageSrc, currentStep, descriptor, faceResults);
          }

          setCapturedImages(prev => [...prev, {
            id: Date.now(),
            src: imageSrc,
            descriptor,
            score: faceResults.length > 0 ? faceResults[0].score : 0,
            faceResults,
            step: currentStep,
            timestamp: new Date()
          }]);

          setCaptureStatus('success');
          playSuccess();
          vibrate(100);
        } catch (error) {
          setCaptureStatus('error');
          setError('Không thể xử lý ảnh. Vui lòng thử lại.');
          playError();
        } finally {
          setIsCapturing(false);
        }
      };

      reader.onerror = () => {
        setCaptureStatus('error');
        setError('Không thể đọc file. Vui lòng thử lại.');
        playError();
        setIsCapturing(false);
      };

      reader.readAsDataURL(file);
      event.target.value = '';
    } catch (error) {
      setCaptureStatus('error');
      setError('Có lỗi xảy ra khi tải ảnh lên.');
      playError();
      setIsCapturing(false);
    }
  }, [onCapture, currentStep]);

  const captureImage = useCallback(async (skipLivenessCheck = false) => {
    if (!webcamRef.current || isCapturing) return;
    if (!hasFace) {
      setError('Không phát hiện khuôn mặt. Vui lòng nhìn thẳng vào camera.');
      return;
    }

    // Liveness check for register mode
    if (mode === 'register' && !skipLivenessCheck && !livenessPassed) {
      const next = CHALLENGES[livenessChallenge];
      setError(next ? `Vui lòng: ${next.instruction}` : 'Vui lòng hoàn thành xác thực trước khi chụp');
      return;
    }

    setIsCapturing(true);
    setCaptureStatus('processing');
    setError(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);

      // Spoof detection
      const spoof = await detectScreenSpoof(imageSrc);
      setSpoofScore(spoof.score);
      setSpoofChecked(true);
      if (!spoof.isReal && !skipLivenessCheck) {
        setError(`Phát hiện giả mạo (${Math.round(spoof.score * 100)}%). Vui lòng sử dụng khuôn mặt thật.`);
        setIsCapturing(false);
        return;
      }

      // Score image quality
      const qualityScore = await scoreImage(imageSrc);
      const faceResults = await extractAllDescriptors(imageSrc);
      const descriptor = faceResults.length > 0 ? faceResults[0].descriptor : null;
      const finalScore = faceResults.length > 0 ? (faceResults[0].score + qualityScore) / 2 : qualityScore;

      if (onCapture) {
        await onCapture(imageSrc, currentStep, descriptor, faceResults);
      }
      if (onCaptureMulti && faceResults.length > 1) {
        await onCaptureMulti(faceResults);
      }

      setCapturedImages(prev => [...prev, {
        id: Date.now(),
        src: imageSrc,
        descriptor,
        score: finalScore,
        faceResults,
        step: currentStep,
        timestamp: new Date()
      }]);

      // Reset liveness for next capture
      setLivenessPassed(false);
      setLivenessChallenge(0);
      setLivenessCompleted(new Set());
      setChallengeStatus('waiting');
      setCurrentPose(null);
      earHistoryRef.current = [];

      setCaptureStatus('success');
      playSuccess();
      vibrate(100);
    } catch (error) {
      setCaptureStatus('error');
      setError(error.message || 'Có lỗi xảy ra khi chụp ảnh. Vui lòng thử lại.');
      playError();
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture, onCaptureMulti, currentStep, hasFace, mode, livenessPassed]);

  const handleRegister = useCallback(async () => {
    if (capturedImages.length === 0) {
      setError('Vui lòng chụp ít nhất một ảnh trước khi đăng ký');
      return;
    }

    try {
      setCaptureStatus('processing');
      if (onRegister) {
        await onRegister(capturedImages);
      }
      setCaptureStatus('success');
      playSuccess();
      vibrate([100, 50, 100]);
    } catch (error) {
      setCaptureStatus('error');
      setError('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
      playError();
    }
  }, [capturedImages, onRegister]);

  const toggleCamera = useCallback(() => {
    if (isCameraActive) {
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject;
        const tracks = stream?.getTracks() || [];
        tracks.forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    }
    setIsCameraActive(!isCameraActive);
    setImgSrc(null);
    setCaptureStatus('idle');
    setError(null);
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject;
        const tracks = stream?.getTracks() || [];
        tracks.forEach(track => track.stop());
      }
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (resetKey) {
      setCapturedImages([]);
      setImgSrc(null);
      setCaptureStatus('idle');
      setError(null);
      setLivenessPassed(false);
      setLivenessChallenge(0);
      setLivenessCompleted(new Set());
      setChallengeStatus('waiting');
      setCurrentPose(null);
      setSpoofScore(null);
      setSpoofChecked(false);
      earHistoryRef.current = [];
    }
  }, [resetKey]);

  useEffect(() => {
    if (captureStatus === 'success') {
      const timer = setTimeout(() => {
        setImgSrc(null);
        setCaptureStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [captureStatus]);

  useEffect(() => {
    if (!isAutoCapturing || !isCameraActive || !hasFace) {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      setCountdown(null);
      return;
    }

    const startCycle = () => {
      if (isCapturing) return;
      setCountdown(3);
      const interval = 1000;
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
            captureImage(true);
            playBeep();
            setTimeout(() => setCountdown(null), 500);
            return null;
          }
          return prev - 1;
        });
      }, interval);
    };

    startCycle();
    const loopRef = setInterval(startCycle, 4000);

    return () => {
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
      clearInterval(loopRef);
      setCountdown(null);
    };
  }, [isAutoCapturing, isCameraActive, hasFace, captureImage]);

  const toggleAutoCapture = useCallback(() => {
    if (isAutoCapturing) {
      setIsAutoCapturing(false);
    } else {
      if (!isCameraActive) {
        setError('Vui lòng bật camera trước khi chụp tự động');
        return;
      }
      setIsAutoCapturing(true);
    }
  }, [isAutoCapturing, isCameraActive]);

  const removeImage = useCallback((imageId) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const canRegister = capturedImages.length >= 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!modelsLoaded && (
        <div style={{ padding: 12, background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 12, textAlign: 'center', fontSize: 13, color: '#92400e' }}>
          <FiLoader style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Đang tải mô hình nhận diện khuôn mặt...
        </div>
      )}

      {error && (
        <div style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FiAlertCircle style={{ marginRight: 12, color: '#ef4444', flexShrink: 0 }} />
            <span style={{ color: '#991b1b' }}>{error}</span>
          </div>
        </div>
      )}

      {mode === 'register' && (
        <div style={{
          background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
          borderRadius: 16, padding: 20,
          border: '1px solid #dbeafe',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1e40af' }}>
              Tiến trình đăng ký: {capturedImages.length}/5 ảnh
            </span>
            <span style={{ fontSize: 14, color: '#3b82f6' }}>
              {Math.min(100, (capturedImages.length / 5) * 100)}%
            </span>
          </div>
          <div style={{ width: '100%', height: 8, background: '#dbeafe', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
              borderRadius: 4,
              transition: 'width 0.5s ease-in-out',
              width: `${Math.min(100, (capturedImages.length / 5) * 100)}%`,
            }}></div>
          </div>
          <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 8 }}>
            {capturedImages.length < 5
              ? `Cần chụp thêm ${5 - capturedImages.length} ảnh nữa`
              : 'Đã đủ số lượng ảnh. Có thể đăng ký ngay!'}
          </p>
        </div>
      )}

      <div ref={cameraContainerRef} style={{
        position: 'relative',
        background: isFullscreen ? '#000' : 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: isFullscreen ? 0 : 20, overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: isFullscreen ? '100%' : 500,
        margin: '0 auto',
        padding: isFullscreen ? 0 : 20,
        ...(isFullscreen
          ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, maxWidth: '100%', zIndex: 9999 }
          : {}),
      }}>
        {isCameraActive ? (
          <div style={{ position: 'relative', height: isFullscreen ? '100vh' : 'auto' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              mirrored
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: 'user'
              }}
              style={{
                width: '100%', height: isFullscreen ? '100vh' : 'auto',
                maxHeight: isFullscreen ? '100vh' : 400,
                objectFit: isFullscreen ? 'contain' : 'cover',
                borderRadius: isFullscreen ? 0 : 15,
              }}
              onUserMediaError={(err) => {
                console.error('Webcam error:', err);
                setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
                setIsCameraActive(false);
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: '100%', height: isFullscreen ? '100vh' : '100%',
                borderRadius: isFullscreen ? 0 : 15, pointerEvents: 'none',
              }}
            />

            {countdown !== null && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 15,
                zIndex: 10,
              }}>
                <div style={{
                  width: 100, height: 100,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                }}>
                  <span style={{ fontSize: 48, fontWeight: 800, color: '#1f2937' }}>
                    {countdown}
                  </span>
                </div>
              </div>
            )}

            {/* Liveness challenge overlay for register mode */}
            {mode === 'register' && !livenessPassed && (
              <div style={{
                position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
                background: challengeStatus === 'passed' ? 'rgba(34,197,94,0.9)' : 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '8px 20px', borderRadius: 16,
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                zIndex: 10, display: 'flex', alignItems: 'center', gap: 8,
                backdropFilter: 'blur(4px)',
              }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: challengeStatus === 'passed' ? '#22c55e' : '#f59e0b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>
                  {challengeStatus === 'passed' ? '✓' : livenessChallenge + 1}
                </span>
                <span>
                  {challengeStatus === 'passed'
                    ? '✓ Hoàn thành!'
                    : CHALLENGES[livenessChallenge]?.instruction || 'Xác thực...'}
                </span>
                {currentPose && challengeStatus !== 'passed' && (
                  <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>
                    ({getHeadPoseLabel(currentPose.yaw, currentPose.pitch)})
                  </span>
                )}
              </div>
            )}
            {/* Challenge progress dots */}
            {mode === 'register' && !livenessPassed && (
              <div style={{
                position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', gap: 6, zIndex: 10,
              }}>
                {CHALLENGES.map((ch, i) => (
                  <div key={ch.id} style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: livenessCompleted.has(ch.id) ? '#22c55e'
                      : i === livenessChallenge ? '#f59e0b'
                      : 'rgba(255,255,255,0.4)',
                    transition: 'all 0.3s',
                    transform: i === livenessChallenge ? 'scale(1.3)' : 'scale(1)',
                  }} />
                ))}
              </div>
            )}
            {mode === 'register' && livenessPassed && (
              <div style={{
                position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(34,197,94,0.9)',
                color: 'white', padding: '4px 16px', borderRadius: 16,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                zIndex: 10, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <FiSmile size={14} /> ✓ Xác thực hoàn tất
              </div>
            )}

            <div style={{
              position: 'absolute', bottom: 20,
              left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              padding: '8px 20px', borderRadius: 25,
              boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isAutoCapturing ? '#ef4444' : hasFace ? '#22c55e' : '#f59e0b',
                animation: 'pulse 2s infinite',
              }}></div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                {countdown !== null
                  ? `Chụp sau ${countdown}s...`
                  : isAutoCapturing
                    ? 'Đang tự động chụp...'
                    : mode === 'register' && !livenessPassed
                      ? `Xác thực ${livenessCompleted.size}/${CHALLENGES.length}`
                      : hasFace
                        ? `${faceCount} khuôn mặt`
                        : 'Đang tìm khuôn mặt...'}
              </span>
              {mode === 'register' && currentPose && !livenessPassed && (
                <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>
                  {currentPose.yaw > 0.15 ? '← Trái' : currentPose.yaw < -0.15 ? 'Phải →' : '•'}
                </span>
              )}
            </div>
            {/* Floating controls in fullscreen */}
            {isFullscreen && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding: '40px 20px 20px',
                display: 'flex', justifyContent: 'center', gap: 12, zIndex: 20,
              }}>
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.2)',
                  ...(isCapturing || !isCameraActive ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                }}>
                  <FiUpload size={14} /> Tải ảnh
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={handleFileUpload} disabled={isCapturing || !isCameraActive} />
                </label>
                <button onClick={captureImage}
                  disabled={isCapturing || !isCameraActive || !hasFace}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 24px', borderRadius: 12,
                    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    ...(isCapturing || !isCameraActive || !hasFace ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                  }}>
                  <FiCamera size={14} /> Chụp
                </button>
                <button onClick={toggleAutoCapture} disabled={isCapturing}
                  style={{
                    padding: '10px 20px', borderRadius: 12, fontSize: 13,
                    fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: isAutoCapturing ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)',
                    color: isAutoCapturing ? '#fca5a5' : 'white',
                  }}>
                  {isAutoCapturing ? <><FiSquare size={14} style={{ marginRight: 8 }} />Dừng</>
                    : <><FiPlay size={14} style={{ marginRight: 8 }} />Tự động</>}
                </button>
                <button onClick={toggleFullscreen}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: 'none',
                    background: 'rgba(255,255,255,0.15)', color: 'white',
                    cursor: 'pointer', alignSelf: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <FiMinimize2 size={16} />
                </button>
              </div>
            )}
            </div>
          ) : (
            <div style={{
              aspectRatio: '640/480', background: '#1f2937',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 15,
            }}>
              <div style={{ textAlign: 'center', padding: 32 }}>
                <FiVideoOff style={{ margin: '0 auto', height: 64, width: 64, color: '#6b7280', marginBottom: 16 }} />
                <p style={{ color: '#9ca3af', fontSize: 18, fontWeight: 500 }}>Camera đã tắt</p>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>Nhấn nút camera để bật lại</p>
              </div>
            </div>
          )}

          <div style={{
            position: 'absolute', top: 20, right: 20,
            display: 'flex', flexDirection: 'column', gap: 10, zIndex: 15,
          }}>
            <button
              onClick={toggleCamera}
              style={{
                width: 44, height: 44, border: 'none', borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
              }}
            >
              {isCameraActive ? (
                <FiVideoOff style={{ color: '#374151' }} />
              ) : (
                <FiVideo style={{ color: '#374151' }} />
              )}
            </button>
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              style={{
                width: 44, height: 44, border: 'none', borderRadius: '50%',
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(10px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
              }}
            >
              {isFullscreen ? (
                <FiMinimize2 style={{ color: '#374151' }} />
              ) : (
                <FiMaximize2 style={{ color: '#374151' }} />
              )}
            </button>
          </div>
      </div>

      <div style={{
        background: 'white', borderRadius: 20, padding: 24,
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'row',
          justifyContent: 'center', alignItems: 'center',
          gap: 16, flexWrap: 'wrap',
        }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 24px',
            border: '2px dashed #e2e8f0', borderRadius: 12,
            cursor: 'pointer', transition: 'all 0.3s ease',
            background: '#f8fafc', fontWeight: 500, color: '#64748b',
            fontSize: 14,
            ...(isCapturing || !isCameraActive
              ? { opacity: 0.6, cursor: 'not-allowed' }
              : {}),
          }}>
            <FiUpload style={{ marginRight: 12 }} />
            <span>Tải ảnh lên</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={isCapturing || !isCameraActive}
            />
          </label>

          <button
            onClick={captureImage}
            disabled={isCapturing || !isCameraActive || !hasFace}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 28px', borderRadius: 12,
              fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              ...(isCapturing || !isCameraActive || !hasFace
                ? { background: '#93c5fd', color: 'white', cursor: 'not-allowed' }
                : {
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    color: 'white',
                    boxShadow: '0 8px 20px rgba(59,130,246,0.3)',
                  }),
            }}
          >
            {isCapturing ? (
              <>
                <FiLoader style={{ marginRight: 12, animation: 'spin 1s linear infinite' }} />
                Đang xử lý...
              </>
            ) : (
              <>
                <FiCamera style={{ marginRight: 12 }} />
                Chụp ảnh
              </>
            )}
          </button>

          <button
            onClick={toggleAutoCapture}
            disabled={!isCameraActive}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 28px', borderRadius: 12,
              fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
              ...(isAutoCapturing
                ? { background: '#ef4444', color: 'white', boxShadow: '0 8px 20px rgba(239,68,68,0.3)' }
                : isCameraActive
                  ? { background: '#8b5cf6', color: 'white', boxShadow: '0 8px 20px rgba(139,92,246,0.3)' }
                  : { background: '#c4b5fd', color: 'white', cursor: 'not-allowed' }),
            }}
          >
            {isAutoCapturing ? (
              <><FiSquare style={{ marginRight: 12 }} />Dừng</>
            ) : (
              <><FiPlay style={{ marginRight: 12 }} />Tự động</>
            )}
          </button>

          {mode === 'register' && canRegister && (
            <button
              onClick={handleRegister}
              disabled={isCapturing}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '14px 28px', borderRadius: 12,
                fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
              }}
            >
              <FiSave style={{ marginRight: 12 }} />
              Đăng ký ({capturedImages.length} ảnh)
            </button>
          )}
        </div>

        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {captureStatus === 'processing' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e40af', padding: 8, background: '#eff6ff', borderRadius: 12, border: '1px solid #dbeafe' }}>
              <FiLoader style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontWeight: 500 }}>Đang xử lý ảnh, vui lòng chờ...</span>
            </div>
          )}

          {captureStatus === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#166534', padding: 8, background: '#dcfce7', borderRadius: 12, border: '1px solid #bbf7d0' }}>
              <FiCheckCircle style={{ marginRight: 8 }} />
              <span style={{ fontWeight: 500 }}>
                {mode === 'register'
                  ? `Đã chụp được ${capturedImages.length} ảnh. Cần ít nhất 5 ảnh để huấn luyện`
                  : 'Điểm danh thành công!'
                }
              </span>
            </div>
          )}

          {captureStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991b1b', padding: 8, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
              <FiXCircle style={{ marginRight: 8 }} />
              <span style={{ fontWeight: 500 }}>Có lỗi xảy ra. Vui lòng thử lại.</span>
            </div>
          )}
        </div>
      </div>

      {capturedImages.length > 0 && (
        <div style={{
          background: 'white', borderRadius: 20, padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiImage />
            Ảnh đã chụp ({capturedImages.length} ảnh)
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 16,
          }}>
            {capturedImages.map((image, index) => (
              <div key={image.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img
                  src={image.src}
                  alt={`Captured ${index + 1}`}
                  style={{ width: '100%', height: 100, objectFit: 'cover', border: '2px solid #e2e8f0', borderRadius: 12 }}
                />
                <button
                  onClick={() => removeImage(image.id)}
                  style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 24, height: 24,
                    background: '#ef4444', color: 'white',
                    border: 'none', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                  }}
                  title="Xóa ảnh"
                >
                  ×
                </button>
                <div style={{
                  position: 'absolute', bottom: 4, left: 4,
                  background: 'rgba(0,0,0,0.7)', color: 'white',
                  padding: '2px 6px', borderRadius: 6,
                  fontSize: 10, fontWeight: 600,
                }}>
                  {index + 1}
                </div>
                {image.score !== undefined && (
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4,
                    background: image.score > 0.6 ? 'rgba(16,185,129,0.8)' : 'rgba(251,191,36,0.8)',
                    color: 'white',
                    padding: '2px 6px', borderRadius: 6,
                    fontSize: 9, fontWeight: 600,
                  }}>
                    {Math.round(image.score * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {imgSrc && captureStatus !== 'processing' && (
        <div style={{
          background: 'white', borderRadius: 20, padding: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16, textAlign: 'center' }}>
            Ảnh vừa chụp
          </h3>
          <div style={{
            border: '3px solid #e2e8f0', borderRadius: 12,
            overflow: 'hidden', background: '#f8fafc',
          }}>
            <img
              src={imgSrc}
              alt="Vừa chụp"
              style={{ width: '100%', height: 'auto', maxHeight: 320, objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(WebcamCapture);
