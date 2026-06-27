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

  const handleFaceCapture = async (imageData, stepIndex, faceDescriptor) => {
    try {
      setRecognitionResult(null);
      setLoading(true);

      if (mode === 'register') {
        if (!selectedUser) {
          alert('Vui lòng chọn người dùng để đăng ký khuôn mặt');
          setLoading(false);
          return;
        }

        const payload = {
          image_data: imageData,
          user_id: selectedUser
        };
        if (faceDescriptor) payload.face_descriptor = faceDescriptor;

        const response = await faceAPI.register(payload);

        if (response.data.registration_complete) {
          fetchUsers();
        }

        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          setCurrentStep(0);
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
        const payload = { image_data: imageData };
        if (faceDescriptor) payload.face_descriptor = faceDescriptor;

        const response = await faceAPI.recognize(payload);

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

      const response = await faceAPI.batchRegister({
        user_id: selectedUser,
        images: images.map(img => img.src),
        descriptors: images.filter(img => img.descriptor).map(img => img.descriptor),
      });

      setRecognitionResult({
        success: true,
        message: `Đăng ký thành công với ${images.length} ảnh!`,
        registration_complete: true
      });

      setCurrentStep(0);
      setCapturedImages([]);
      fetchUsers();

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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{
        textAlign: 'center', marginBottom: 32,
        fontSize: 28, fontWeight: 700,
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        {mode === 'register' ? 'Đăng ký khuôn mặt' : 'Nhận diện khuôn mặt'}
      </h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{
          background: 'white', borderRadius: 12, padding: 4,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <button
            onClick={() => setMode('recognize')}
            style={{
              padding: '12px 24px', borderRadius: 8, fontWeight: 600,
              border: 'none', cursor: 'pointer', display: 'inline-flex',
              alignItems: 'center', gap: 8,
              ...(mode === 'recognize'
                ? { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }
                : { background: 'transparent', color: '#6b7280' }),
            }}
          >
            <FiUser />
            Chế độ điểm danh
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              padding: '12px 24px', borderRadius: 8, fontWeight: 600,
              border: 'none', cursor: 'pointer', display: 'inline-flex',
              alignItems: 'center', gap: 8,
              marginLeft: 4,
              ...(mode === 'register'
                ? { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }
                : { background: 'transparent', color: '#6b7280' }),
            }}
          >
            <FiUserPlus />
            Chế độ đăng ký
          </button>
        </div>
      </div>

      {mode === 'register' && (user.role === 'admin' || user.role === 'teacher') && (
        <div style={{
          background: 'white', borderRadius: 16, padding: 24,
          marginBottom: 24,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0,0,0,0.05)',
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 8, fontSize: 15 }}>
              Chọn người dùng để đăng ký khuôn mặt
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px',
                border: '2px solid #e5e7eb', borderRadius: 10,
                fontSize: 16, background: 'white',
                outline: 'none',
              }}
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
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
              border: '1px solid #dbeafe', borderRadius: 12,
            }}>
              <p style={{ color: '#1e40af', fontWeight: 600, marginBottom: 4 }}>
                Đang đăng ký khuôn mặt cho: {users.find(u => u.id === selectedUser)?.name}
              </p>
              <p style={{ color: '#3b82f6', fontSize: 14 }}>
                Hướng dẫn: {steps[currentStep]}
              </p>
            </div>
          )}
        </div>
      )}

      {mode === 'register' && selectedUser && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fef7cd)',
          border: '1px solid #fbbf24', borderRadius: 12,
          padding: 16, marginBottom: 24,
          animation: 'pulseGlow 2s ease-in-out infinite alternate',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{
              background: '#f59e0b', color: 'white', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', flexShrink: 0,
            }}>
              {currentStep + 1}
            </div>
            <div style={{ marginLeft: 16 }}>
              <h3 style={{ color: '#92400e', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                Bước {currentStep + 1}: {steps[currentStep]}
              </h3>
              <p style={{ color: '#b45309', fontSize: 15 }}>
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

      {recognitionResult && (
        <div style={{
          marginTop: 24, padding: 16, borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 12,
          ...(recognitionResult.success
            ? { background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: '1px solid #22c55e' }
            : { background: 'linear-gradient(135deg, #fef2f2, #fecaca)', border: '1px solid #ef4444' }),
        }}>
          {recognitionResult.success ? (
            <FiCheckCircle style={{ flexShrink: 0, fontSize: 20, color: '#166534' }} />
          ) : (
            <FiXCircle style={{ flexShrink: 0, fontSize: 20, color: '#991b1b' }} />
          )}
          <div>
            <p style={{
              fontWeight: 600,
              color: recognitionResult.success ? '#166534' : '#991b1b',
            }}>
              {recognitionResult.message}
            </p>
            {recognitionResult.face_encodings_count && (
              <p style={{ fontSize: 14, marginTop: 4, color: recognitionResult.success ? '#15803d' : '#b91c1b' }}>
                Số ảnh đã đăng ký: {recognitionResult.face_encodings_count}/5
              </p>
            )}
          </div>
        </div>
      )}

      {recognitionResult?.registration_complete && (
        <div style={{
          marginTop: 24, padding: 24, textAlign: 'center',
          background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          border: '1px solid #22c55e', borderRadius: 16,
        }}>
          <FiCheckCircle style={{ color: '#22c55e', marginBottom: 16, fontSize: 32 }} />
          <h3 style={{ color: '#166534', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            Đăng ký thành công!
          </h3>
          <p style={{ color: '#15803d', marginBottom: 16 }}>
            Đã hoàn thành đăng ký khuôn mặt với đủ số lượng ảnh.
          </p>
          <button
            onClick={resetRegistration}
            style={{
              padding: '12px 24px', background: '#22c55e', color: 'white',
              border: 'none', borderRadius: 10, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 15px rgba(34,197,94,0.3)',
            }}
          >
            <FiUserPlus />
            Đăng ký người khác
          </button>
        </div>
      )}

      <div style={{
        marginTop: 32,
        background: 'linear-gradient(135deg, #dbeafe, #eff6ff)',
        border: '1px solid #dbeafe', borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 20px rgba(59,130,246,0.1)',
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#1e40af', fontSize: 20, fontWeight: 700 }}>
          <FiUser />
          Hướng dẫn sử dụng
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          <div style={{ background: 'rgba(255,255,255,0.7)', padding: 16, borderRadius: 10 }}>
            <h4 style={{ color: '#1e40af', fontWeight: 600, marginBottom: 12, fontSize: 16 }}>Để đạt kết quả tốt nhất:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Chụp ít nhất 5-10 ảnh từ các góc độ khác nhau',
                'Đảm bảo khuôn mặt được chiếu sáng tốt và rõ ràng',
                'Giữ khuôn mặt trong khung hình camera',
                'Đứng cách camera khoảng 0.5 - 1 mét',
              ].map((text, i) => (
                <li key={i} style={{ color: '#374151', marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold', marginRight: 8, flexShrink: 0 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.7)', padding: 16, borderRadius: 10 }}>
            <h4 style={{ color: '#1e40af', fontWeight: 600, marginBottom: 12, fontSize: 16 }}>Lưu ý quan trọng:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Tránh đeo kính râm hoặc che khuất khuôn mặt',
                'Thử các biểu cảm khuôn mặt khác nhau',
                'Chụp trong điều kiện ánh sáng tự nhiên',
                'Đảm bảo camera sạch sẽ và không bị mờ',
              ].map((text, i) => (
                <li key={i} style={{ color: '#374151', marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 'bold', marginRight: 8, flexShrink: 0 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
