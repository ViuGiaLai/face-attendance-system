import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { 
  FiCamera, 
  FiUpload, 
  FiLoader, 
  FiCheckCircle, 
  FiXCircle, 
  FiUser, 
  FiAlertCircle,
  FiVideo,
  FiVideoOff,
  FiImage,
  FiSave
} from 'react-icons/fi';

const WebcamCapture = ({ 
  onCapture, 
  onRegister, // New prop for final registration
  mode = 'recognize', 
  disabled = false,
  className = '',
  currentStep = 0,
  totalSteps = 5
}) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [capturedImages, setCapturedImages] = useState([]); // Store multiple images

  // Handle file upload
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset previous state
    setError(null);
    setCaptureStatus('processing');
    setIsCapturing(true);

    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const imageSrc = reader.result;
          setImgSrc(imageSrc);

          // Call onCapture with the image and index
          if (onCapture) {
            await onCapture(imageSrc, currentStep);
          }

          // Add to captured images list
          setCapturedImages(prev => [...prev, {
            id: Date.now(),
            src: imageSrc,
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
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error handling file upload:', error);
      setCaptureStatus('error');
      setError('Có lỗi xảy ra khi tải ảnh lên.');
      setIsCapturing(false);
    }
  }, [onCapture, currentStep]);

  // Capture from camera
  const captureImage = useCallback(async () => {
    if (!webcamRef.current || isCapturing) return;
    
    setIsCapturing(true);
    setCaptureStatus('processing');
    setError(null);
    
    try {
      // Capture image from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      setImgSrc(imageSrc);
      
      // Call onCapture with the image and current step
      if (onCapture) {
        await onCapture(imageSrc, currentStep);
      }

      // Add to captured images list
      setCapturedImages(prev => [...prev, {
        id: Date.now(),
        src: imageSrc,
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
  }, [isCapturing, onCapture, currentStep]);

  // Handle final registration
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

  // Toggle camera on/off
  const toggleCamera = useCallback(() => {
    if (isCameraActive) {
      // Stop camera when turning off
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject;
        const tracks = stream?.getTracks() || [];
        tracks.forEach(track => track.stop());
      }
    }
    setIsCameraActive(!isCameraActive);
    setImgSrc(null);
    setCaptureStatus('idle');
    setError(null);
  }, [isCameraActive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (webcamRef.current?.video?.srcObject) {
        const stream = webcamRef.current.video.srcObject;
        const tracks = stream?.getTracks() || [];
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Reset current image after success (but keep in capturedImages)
  useEffect(() => {
    if (captureStatus === 'success') {
      const timer = setTimeout(() => {
        setImgSrc(null);
        setCaptureStatus('idle');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [captureStatus]);

  // Remove image from captured list
  const removeImage = useCallback((imageId) => {
    setCapturedImages(prev => prev.filter(img => img.id !== imageId));
  }, []);

  const canRegister = capturedImages.length >= 5;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <FiAlertCircle className="mr-3 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      
      {/* Progress Indicator */}
      {mode === 'register' && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              Tiến trình đăng ký: {capturedImages.length}/5 ảnh
            </span>
            <span className="text-sm text-blue-600">
              {Math.min(100, (capturedImages.length / 5) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (capturedImages.length / 5) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {capturedImages.length < 5 
              ? `Cần chụp thêm ${5 - capturedImages.length} ảnh nữa` 
              : 'Đã đủ số lượng ảnh. Có thể đăng ký ngay!'}
          </p>
        </div>
      )}
      
      {/* Webcam Container */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-lg">
        {isCameraActive ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: 'user'
              }}
              className="w-full h-auto max-h-96 object-cover"
              onUserMediaError={(err) => {
                console.error('Webcam error:', err);
                setError('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.');
                setIsCameraActive(false);
              }}
            />
            
            {/* Status overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm bg-green-500/20 text-green-100 border border-green-500/30">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span>Sẵn sàng chụp ảnh</span>
              </div>
            </div>
          </>
        ) : (
          <div className="aspect-video bg-gray-800 flex items-center justify-center rounded-xl">
            <div className="text-center p-8">
              <FiVideoOff className="mx-auto h-16 w-16 text-gray-500 mb-4" />
              <p className="text-gray-400 text-lg font-medium">Camera đã tắt</p>
              <p className="text-gray-500 text-sm mt-1">Nhấn nút camera để bật lại</p>
            </div>
          </div>
        )}
        
        {/* Camera controls */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={toggleCamera}
            className="p-3 bg-white/10 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/20 transition-all duration-200 border border-white/20"
            title={isCameraActive ? 'Tắt camera' : 'Bật camera'}
          >
            {isCameraActive ? (
              <FiVideoOff className="w-5 h-5 text-white" />
            ) : (
              <FiVideo className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
      
      {/* Controls Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
          
          {/* File Upload Button */}
          <label className={`inline-flex items-center justify-center px-6 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
            isCapturing || !isCameraActive
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
          }`}>
            <FiUpload className="mr-3 w-5 h-5" />
            <span>Tải ảnh lên</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isCapturing || !isCameraActive}
            />
          </label>
          
          {/* Capture Button */}
          <button
            onClick={captureImage}
            disabled={isCapturing || !isCameraActive}
            className={`inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              isCapturing || !isCameraActive
                ? 'bg-blue-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isCapturing ? (
              <>
                <FiLoader className="animate-spin mr-3 w-5 h-5" />
                Đang xử lý...
              </>
            ) : (
              <>
                <FiCamera className="mr-3 w-5 h-5" />
                Chụp ảnh
              </>
            )}
          </button>

          {/* Register Button (only show in register mode when enough images) */}
          {mode === 'register' && canRegister && (
            <button
              onClick={handleRegister}
              disabled={isCapturing}
              className="inline-flex items-center justify-center px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <FiSave className="mr-3 w-5 h-5" />
              Đăng ký ({capturedImages.length} ảnh)
            </button>
          )}
        </div>
        
        {/* Status indicators */}
        <div className="mt-4 space-y-2">
          {captureStatus === 'processing' && (
            <div className="flex items-center justify-center text-blue-600">
              <FiLoader className="animate-spin mr-2" />
              <span>Đang xử lý ảnh, vui lòng chờ...</span>
            </div>
          )}
          
          {captureStatus === 'success' && (
            <div className="flex items-center justify-center text-green-600 bg-green-50 py-2 rounded-lg">
              <FiCheckCircle className="mr-2" />
              <span className="font-medium">
                {mode === 'register' 
                  ? `Đã chụp được ${capturedImages.length} ảnh. Cần ít nhất 5 ảnh để huấn luyện` 
                  : 'Điểm danh thành công!'
                }
              </span>
            </div>
          )}
          
          {captureStatus === 'error' && (
            <div className="flex items-center justify-center text-red-600 bg-red-50 py-2 rounded-lg">
              <FiXCircle className="mr-2" />
              <span>Có lỗi xảy ra. Vui lòng thử lại.</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Captured Images Gallery */}
      {capturedImages.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <FiImage className="mr-2" />
            Ảnh đã chụp ({capturedImages.length} ảnh)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {capturedImages.map((image, index) => (
              <div key={image.id} className="relative group">
                <img 
                  src={image.src} 
                  alt={`Captured ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xóa ảnh"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Current Image Preview */}
      {imgSrc && captureStatus !== 'processing' && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
            Ảnh vừa chụp
          </h3>
          <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <img 
              src={imgSrc} 
              alt="Vừa chụp" 
              className="w-full h-auto max-h-80 object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;