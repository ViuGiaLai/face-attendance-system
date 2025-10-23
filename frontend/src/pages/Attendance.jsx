import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import WebcamCapture from '../components/WebcamCapture';
import { faceAPI, usersAPI } from '../services/api';
import { 
  FiCheckCircle, 
  FiXCircle, 
  FiUser, 
  FiUserPlus 
} from 'react-icons/fi';

const Attendance = () => {
  const { user } = useAuth();
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [mode, setMode] = useState('recognize');
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedImages, setCapturedImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const steps = [
    'Nhìn thẳng vào camera',
    'Quay đầu sang trái một chút',
    'Quay đầu sang phải một chút',
    'Ngẩng đầu lên nhẹ',
    'Cúi đầu xuống nhẹ',
    'Nghiêng đầu sang trái',
    'Nghiêng đầu sang phải',
    'Mỉm cười nhẹ',
    'Mở mắt to',
    'Nhắm mắt lại'
  ];

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'teacher') {
      fetchUsers();
    }
  }, [user.role]);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ active_only: true });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFaceCapture = async (imageData, stepIndex) => {
    try {
      setRecognitionResult(null);
      setLoading(true);

      if (mode === 'register') {
        if (!selectedUser) {
          alert('Vui lòng chọn người dùng để đăng ký khuôn mặt');
          setLoading(false);
          return;
        }

        const response = await faceAPI.register({
          image_data: imageData,
          user_id: selectedUser
        });

        // Refresh user list after successful registration
        if (response.data.registration_complete) {
          fetchUsers();
        }

        // Move to next step or loop back
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          setCurrentStep(0); // Loop back to start
        }

        setRecognitionResult({
          success: true,
          message: response.data.message || `Đã chụp được ${response.data.face_encodings_count} ảnh. Cần ít nhất 5 ảnh để huấn luyện`,
          face_encodings_count: response.data.face_encodings_count,
          registration_complete: response.data.registration_complete,
          currentStep: currentStep + 1,
          totalSteps: steps.length
        });

      } else {
        // Recognition mode
        const response = await faceAPI.recognize({
          image_data: imageData
        });

        if (response.data.recognized) {
          setRecognitionResult({
            success: true,
            message: `Điểm danh thành công cho ${response.data.user.name}!`,
            user: response.data.user,
            confidence: response.data.confidence
          });
        } else {
          setRecognitionResult({
            success: false,
            message: response.data.message || 'Không nhận diện được khuôn mặt. Vui lòng thử lại.'
          });
        }
      }
    } catch (error) {
      console.error('Error processing face:', error);
      setRecognitionResult({
        success: false,
        message: error.response?.data?.error || 'Có lỗi xảy ra. Vui lòng thử lại.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalRegistration = async (images) => {
    try {
      setLoading(true);
      
      // Send all images to backend for final registration
      const response = await faceAPI.batchRegister({
        user_id: selectedUser,
        images: images.map(img => img.src)
      });

      setRecognitionResult({
        success: true,
        message: `Đăng ký thành công với ${images.length} ảnh!`,
        registration_complete: true
      });

      // Reset after successful registration
      setCurrentStep(0);
      setCapturedImages([]);
      fetchUsers(); // Refresh user list

    } catch (error) {
      console.error('Error in final registration:', error);
      setRecognitionResult({
        success: false,
        message: error.response?.data?.error || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetRegistration = () => {
    setCurrentStep(0);
    setCapturedImages([]);
    setRecognitionResult(null);
  };

  return (
    <div className="attendance-container">
      <h1 className="page-header">
        {mode === 'register' ? 'Đăng ký khuôn mặt' : 'Nhận diện khuôn mặt'}
      </h1>

      {/* Mode Selection */}
      <div className="mode-tabs">
        <div className="tabs-container">
          <button
            onClick={() => setMode('recognize')}
            className={`action-button ${mode === 'recognize' ? 'primary' : 'secondary'}`}
          >
            <FiUser className="mr-2" />
            Chế độ điểm danh
          </button>
          <button
            onClick={() => setMode('register')}
            className={`action-button ${mode === 'register' ? 'primary' : 'secondary'} ml-2`}
          >
            <FiUserPlus className="mr-2" />
            Chế độ đăng ký
          </button>
        </div>
      </div>

      {mode === 'register' && (user.role === 'admin' || user.role === 'teacher') && (
        <div className="user-form">
          <div className="form-group">
            <label className="form-label">Chọn người dùng để đăng ký khuôn mặt</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="form-input"
            >
              <option value="">-- Chọn người dùng --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          {selectedUser && (
            <div className="user-info-card">
              <p className="user-info-text">
                Đang đăng ký khuôn mặt cho: {users.find(u => u.id === selectedUser)?.name}
              </p>
              <p className="user-instruction">
                Hướng dẫn: {steps[currentStep]}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Current Step Instruction */}
      {mode === 'register' && selectedUser && (
        <div className="step-instruction">
          <div className="step-header">
            <div className="step-number">{currentStep + 1}</div>
            <div className="step-content">
              <h3 className="step-title">Bước {currentStep + 1}: {steps[currentStep]}</h3>
              <p className="step-description">
                {currentStep < steps.length - 1 
                  ? `Tiếp theo: ${steps[currentStep + 1]}`
                  : 'Đã hoàn thành tất cả các bước!'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <WebcamCapture 
        onCapture={handleFaceCapture}
        onRegister={handleFinalRegistration}
        mode={mode}
        disabled={mode === 'register' && !selectedUser}
        currentStep={currentStep}
        totalSteps={steps.length}
      />

      {/* Result Message */}
      {recognitionResult && (
        <div className={`result-message ${
          recognitionResult.success ? 'status-success' : 'status-error'
        }`}>
          <div className="flex items-center">
            {recognitionResult.success ? (
              <FiCheckCircle className="mr-3 text-xl" />
            ) : (
              <FiXCircle className="mr-3 text-xl" />
            )}
            <div>
              <p>{recognitionResult.message}</p>
              {recognitionResult.face_encodings_count && (
                <p className="text-sm mt-1">
                  Số ảnh đã đăng ký: {recognitionResult.face_encodings_count}/5
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Registration Complete Message */}
      {recognitionResult?.registration_complete && (
        <div className="registration-complete">
          <FiCheckCircle className="success-icon" />
          <h3>Đăng ký thành công!</h3>
          <p>Đã hoàn thành đăng ký khuôn mặt với đủ số lượng ảnh.</p>
          <button
            onClick={resetRegistration}
            className="action-button success mt-4"
          >
            <FiUserPlus className="mr-2" />
            Đăng ký người khác
          </button>
        </div>
      )}

      {/* User Guide */}
      <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
          <FiUser className="mr-2" />
          Hướng dẫn sử dụng
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Để đạt kết quả tốt nhất:</h4>
            <ul className="text-blue-600 space-y-1 text-sm">
              <li>• Chụp ít nhất 5-10 ảnh từ các góc độ khác nhau</li>
              <li>• Đảm bảo khuôn mặt được chiếu sáng tốt và rõ ràng</li>
              <li>• Giữ khuôn mặt trong khung hình camera</li>
              <li>• Đứng cách camera khoảng 0.5 - 1 mét</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-blue-700 mb-2">Lưu ý quan trọng:</h4>
            <ul className="text-blue-600 space-y-1 text-sm">
              <li>• Tránh đeo kính râm hoặc che khuất khuôn mặt</li>
              <li>• Thử các biểu cảm khuôn mặt khác nhau</li>
              <li>• Chụp trong điều kiện ánh sáng tự nhiên</li>
              <li>• Đảm bảo camera sạch sẽ và không bị mờ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;