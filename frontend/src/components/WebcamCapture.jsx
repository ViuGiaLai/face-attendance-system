import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
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
  FiSquare
} from 'react-icons/fi';

const MODEL_URL = '/models';

const WebcamCapture = ({
  onCapture,
  onRegister,
  mode = 'recognize',
  disabled = false,
  className = '',
  currentStep = 0,
  totalSteps = 5
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
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [hasFace, setHasFace] = useState(false);
  const autoCaptureRef = useRef(null);
  const detectionIntervalRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Không thể tải mô hình nhận diện. Trang sẽ hoạt động ở chế độ cơ bản.');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded || !isCameraActive || !webcamRef.current?.video) return;

    const runDetection = async () => {
      try {
        const video = webcamRef.current.video;
        if (!video || video.readyState < 2) return;

        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 }))
          .withFaceLandmarks();

        setHasFace(detections.length > 0);

        const canvas = canvasRef.current;
        if (canvas) {
          const displaySize = { width: video.offsetWidth, height: video.offsetHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (detections.length > 0) {
            const resized = faceapi.resizeResults(detections, displaySize);
            faceapi.draw.drawDetections(canvas, resized);
            faceapi.draw.drawFaceLandmarks(canvas, resized);

            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            const box = resized[0].detection.box;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
          }
        }
      } catch (err) {
        // skip frame errors silently
      }
    };

    detectionIntervalRef.current = setInterval(runDetection, 200);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [modelsLoaded, isCameraActive]);

  const extractDescriptor = async (imageSrc) => {
    if (!modelsLoaded) return null;
    try {
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (detection) {
        return Array.from(detection.descriptor);
      }
    } catch (err) {
      console.error('Error extracting descriptor:', err);
    }
    return null;
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

          const descriptor = await extractDescriptor(imageSrc);

          if (onCapture) {
            await onCapture(imageSrc, currentStep, descriptor);
          }

          setCapturedImages(prev => [...prev, {
            id: Date.now(),
            src: imageSrc,
            descriptor,
            step: currentStep,
            timestamp: new Date()
          }]);

          setCaptureStatus('success');
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          setCaptureStatus('error');
          setError('Không thể xử lý ảnh. Vui lòng thử lại.');
        } finally {
          setIsCapturing(false);
        }
      };

      reader.onerror = () => {
        setCaptureStatus('error');
        setError('Không thể đọc file. Vui lòng thử lại.');
        setIsCapturing(false);
      };

      reader.readAsDataURL(file);
      event.target.value = '';
    } catch (error) {
      console.error('Error handling file upload:', error);
      setCaptureStatus('error');
      setError('Có lỗi xảy ra khi tải ảnh lên.');
      setIsCapturing(false);
    }
  }, [onCapture, currentStep]);

  const captureImage = useCallback(async () => {
    if (!webcamRef.current || isCapturing) return;
    if (!hasFace) {
      setError('Không phát hiện khuôn mặt. Vui lòng nhìn thẳng vào camera.');
      return;
    }

    setIsCapturing(true);
    setCaptureStatus('processing');
    setError(null);

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);

      const descriptor = await extractDescriptor(imageSrc);

      if (onCapture) {
        await onCapture(imageSrc, currentStep, descriptor);
      }

      setCapturedImages(prev => [...prev, {
        id: Date.now(),
        src: imageSrc,
        descriptor,
        step: currentStep,
        timestamp: new Date()
      }]);

      setCaptureStatus('success');
    } catch (error) {
      console.error('Error capturing image:', error);
      setCaptureStatus('error');
      setError(error.message || 'Có lỗi xảy ra khi chụp ảnh. Vui lòng thử lại.');
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture, currentStep, hasFace]);

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
    } catch (error) {
      setCaptureStatus('error');
      setError('Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
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
    if (captureStatus === 'success') {
      const timer = setTimeout(() => {
        setImgSrc(null);
        setCaptureStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [captureStatus]);

  useEffect(() => {
    if (isAutoCapturing && isCameraActive && !isCapturing && hasFace) {
      autoCaptureRef.current = setInterval(() => {
        captureImage();
      }, 3000);
    } else {
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
        autoCaptureRef.current = null;
      }
    }
    return () => {
      if (autoCaptureRef.current) {
        clearInterval(autoCaptureRef.current);
        autoCaptureRef.current = null;
      }
    };
  }, [isAutoCapturing, isCameraActive, isCapturing, captureImage, hasFace]);

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

      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        maxWidth: 500, margin: '0 auto',
        padding: 20,
      }}>
        {isCameraActive ? (
          <div style={{ position: 'relative' }}>
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
                width: '100%', height: 'auto', maxHeight: 400,
                objectFit: 'cover', borderRadius: 15,
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
                width: '100%', height: '100%',
                borderRadius: 15, pointerEvents: 'none',
              }}
            />

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
                {isAutoCapturing ? 'Đang tự động chụp...' : hasFace ? 'Đã phát hiện khuôn mặt' : 'Đang tìm khuôn mặt...'}
              </span>
            </div>
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
          display: 'flex', gap: 10,
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
                {image.descriptor && (
                  <div style={{
                    position: 'absolute', bottom: 4, right: 4,
                    background: 'rgba(16,185,129,0.8)', color: 'white',
                    padding: '2px 6px', borderRadius: 6,
                    fontSize: 9, fontWeight: 600,
                  }}>
                    OK
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

export default WebcamCapture;
