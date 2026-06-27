import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import WebcamCapture from '../components/WebcamCapture';
import { faceAPI, usersAPI, attendanceAPI, classesAPI } from '../services/api';
import { addToFaceCache, findLocalMatch } from '../utils/faceCache';
import { selectBestImages } from '../utils/imageScorer';
import {
  FiCheckCircle,
  FiXCircle,
  FiUser,
  FiUserPlus,
  FiLoader,
  FiUsers
} from 'react-icons/fi';

const Attendance = () => {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [mode, setMode] = useState('recognize');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

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
      fetchClasses();
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

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getAll();
      setClasses(response.data.classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const handleFaceCapture = async (imageData, stepIndex, faceDescriptor, faceResults) => {
    try {
      setRecognitionResult(null);
      setLoading(true);

      if (mode === 'register') {
        if (!selectedUser) {
          setRecognitionResult({
            success: false,
            message: 'Vui lòng chọn người dùng để đăng ký khuôn mặt'
          });
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
        // Try local cache first
        if (faceDescriptor) {
          const localMatch = findLocalMatch(faceDescriptor);
          if (localMatch) {
            setRecognitionResult({
              success: true,
              message: `Điểm danh thành công cho ${localMatch.user.name}! (offline)`,
              user: { id: localMatch.user.user_id, name: localMatch.user.name },
              confidence: Math.max(0, 1 - localMatch.distance),
              isLocal: true
            });
            attendanceAPI.clearCache();
            setLoading(false);
            return;
          }
        }

        // Multi-face recognition
        if (faceResults && faceResults.length > 1) {
          const descriptors = faceResults.map((r) => r.descriptor);
          const payload = {
            descriptors,
            image_data: imageData,
            class_id: selectedClass || undefined,
          };
          const response = await faceAPI.recognizeMulti(payload);

          if (response.data.results && response.data.results.length > 0) {
            const recognized = response.data.results.filter((r) => r.recognized);
            if (recognized.length > 0) {
              const names = recognized.map((r) => r.user.name).join(', ');
              setRecognitionResult({
                success: true,
                multi: true,
                message: `Điểm danh thành công: ${names}`,
                users: recognized.map((r) => r.user),
                confidence: Math.min(...recognized.map((r) => r.confidence)),
              });
              // Cache recognized faces
              const cacheEntries = recognized.map((r) => ({
                user_id: r.user.id,
                name: r.user.name,
                descriptor: r.descriptor_used,
              }));
              addToFaceCache(cacheEntries);
              attendanceAPI.clearCache();
              setLoading(false);
              return;
            }
          }
        }

        // Single face recognition (fallback)
        const payload = { image_data: imageData, class_id: selectedClass || undefined };
        if (faceDescriptor) payload.face_descriptor = faceDescriptor;

        const response = await faceAPI.recognize(payload);

        if (response.data.recognized) {
          // Cache the recognized face
          if (response.data.user && faceDescriptor) {
            addToFaceCache([{
              user_id: response.data.user.id,
              name: response.data.user.name,
              descriptor: faceDescriptor,
            }]);
          }
          attendanceAPI.clearCache();
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

      // Auto-select best images
      const bestImages = images.length > 5 ? await selectBestImages(images, 5) : images;

      const response = await faceAPI.batchRegister({
        user_id: selectedUser,
        images: bestImages.map(img => img.src),
        descriptors: bestImages.filter(img => img.descriptor).map(img => img.descriptor),
      });

      setRecognitionResult({
        success: true,
        message: `Đăng ký thành công với ${response.data.registered_images} ảnh!`,
        registration_complete: true
      });

      setCurrentStep(0);
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
    setRecognitionResult(null);
    setResetCounter(c => c + 1);
  };

  return (
    <>
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            background: dark ? '#1f2937' : 'white', borderRadius: 20, padding: 40,
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <FiLoader style={{ fontSize: 40, color: '#667eea', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: dark ? '#f3f4f6' : '#374151' }}>Đang xử lý...</p>
          </div>
        </div>
      )}
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem', background: 'transparent' }}>
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
          background: dark ? '#1f2937' : 'white', borderRadius: 12, padding: 4,
          boxShadow: dark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.08)',
          border: dark ? '1px solid #374151' : '1px solid rgba(0,0,0,0.05)',
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
          background: dark ? '#1f2937' : 'white', borderRadius: 16, padding: 24,
          marginBottom: 24, border: `1px solid ${dark ? '#374151' : 'rgba(0,0,0,0.05)'}`,
        }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, color: dark ? '#f3f4f6' : '#374151', marginBottom: 8, fontSize: 15 }}>
              Chọn người dùng để đăng ký khuôn mặt
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px',
                border: `2px solid ${dark ? '#4b5563' : '#e5e7eb'}`, borderRadius: 10,
                fontSize: 16, background: dark ? '#374151' : 'white',
                color: dark ? '#f3f4f6' : '#1f2937', outline: 'none',
              }}
            >
              <option value="">-- Chọn người dùng --</option>
              {users.length === 0 && <option disabled>Đang tải...</option>}
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
              background: dark ? '#1e1b4b' : 'linear-gradient(135deg, #dbeafe, #eff6ff)',
              border: `1px solid ${dark ? '#312e81' : '#dbeafe'}`, borderRadius: 12,
            }}>
              <p style={{ color: dark ? '#a5b4fc' : '#1e40af', fontWeight: 600, marginBottom: 4 }}>
                Đang đăng ký khuôn mặt cho: {users.find(u => u.id === selectedUser)?.name}
              </p>
              <p style={{ color: dark ? '#818cf8' : '#3b82f6', fontSize: 14 }}>
                Hướng dẫn: {steps[currentStep]}
              </p>
            </div>
          )}
        </div>
      )}

      {mode === 'register' && selectedUser && (
        <div style={{
          background: dark ? '#451a03' : 'linear-gradient(135deg, #fef3c7, #fef7cd)',
          border: `1px solid ${dark ? '#b45309' : '#fbbf24'}`, borderRadius: 12,
          padding: 16, marginBottom: 24,
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
              <h3 style={{ color: dark ? '#fbbf24' : '#92400e', fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                Bước {currentStep + 1}: {steps[currentStep]}
              </h3>
              <p style={{ color: dark ? '#f59e0b' : '#b45309', fontSize: 15 }}>
                {currentStep < steps.length - 1
                  ? `Tiếp theo: ${steps[currentStep + 1]}`
                  : 'Đã hoàn thành tất cả các bước!'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === 'recognize' && (user.role === 'admin' || user.role === 'teacher') && (
        <div style={{
          background: dark ? '#1f2937' : 'white', borderRadius: 12, padding: '10px 16px',
          marginBottom: 16, border: `1px solid ${dark ? '#374151' : '#e5e7eb'}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f3f4f6' : '#374151', whiteSpace: 'nowrap' }}>
            Lớp học:
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`,
              background: dark ? '#374151' : '#f9fafb',
              color: dark ? '#f3f4f6' : '#1f2937', fontSize: 13, outline: 'none',
            }}
          >
            <option value="">-- Tất cả lớp (không ghi class) --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
      )}

      <WebcamCapture
        onCapture={handleFaceCapture}
        onRegister={handleFinalRegistration}
        mode={mode}
        disabled={mode === 'register' && !selectedUser}
        currentStep={currentStep}
        totalSteps={steps.length}
        resetKey={resetCounter}
      />

      {recognitionResult && !recognitionResult.registration_complete && (
        <div style={{
          marginTop: 24, padding: 16, borderRadius: 12,
          ...(recognitionResult.success
            ? { background: dark ? '#064e3b' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)', border: `1px solid ${dark ? '#22c55e' : '#22c55e'}` }
            : { background: dark ? '#450a0a' : 'linear-gradient(135deg, #fef2f2, #fecaca)', border: `1px solid ${dark ? '#ef4444' : '#ef4444'}` }),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: recognitionResult.multi ? 12 : 0 }}>
            {recognitionResult.success ? (
              <FiCheckCircle style={{ flexShrink: 0, fontSize: 20, color: dark ? '#86efac' : '#166534' }} />
            ) : (
              <FiXCircle style={{ flexShrink: 0, fontSize: 20, color: dark ? '#fca5a5' : '#991b1b' }} />
            )}
            <div style={{ flex: 1 }}>
              <p style={{
                fontWeight: 600,
                color: recognitionResult.success ? (dark ? '#bbf7d0' : '#166534') : (dark ? '#fca5a5' : '#991b1b'),
              }}>
                {recognitionResult.message}
              </p>
              {recognitionResult.face_encodings_count && (
                <p style={{ fontSize: 14, marginTop: 4, color: recognitionResult.success ? (dark ? '#86efac' : '#15803d') : '#b91c1b' }}>
                  Số ảnh đã đăng ký: {recognitionResult.face_encodings_count}/5
                </p>
              )}
            </div>
            {!recognitionResult.success && mode === 'recognize' && (
              <button onClick={() => setRecognitionResult(null)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 12,
                  border: 'none', cursor: 'pointer', background: '#ef4444', color: 'white',
                  whiteSpace: 'nowrap',
                }}>
                Thử lại
              </button>
            )}
          </div>
          {recognitionResult.multi && recognitionResult.users && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {recognitionResult.users.map((u, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 8,
                  background: dark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
                  fontSize: 13, fontWeight: 500, color: dark ? '#bbf7d0' : '#166534',
                }}>
                  <FiUser size={13} />
                  {u.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {recognitionResult?.registration_complete && (
        <div style={{
          marginTop: 24, padding: 24, textAlign: 'center',
          background: dark ? '#064e3b' : 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
          border: `1px solid ${dark ? '#22c55e' : '#22c55e'}`, borderRadius: 16,
        }}>
          <FiCheckCircle style={{ color: '#22c55e', marginBottom: 16, fontSize: 32 }} />
          <h3 style={{ color: dark ? '#bbf7d0' : '#166534', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            Đăng ký thành công!
          </h3>
          <p style={{ color: dark ? '#86efac' : '#15803d', marginBottom: 16 }}>
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
        background: dark ? '#1e1b4b' : 'linear-gradient(135deg, #dbeafe, #eff6ff)',
        border: `1px solid ${dark ? '#312e81' : '#dbeafe'}`, borderRadius: 16,
        padding: 24,
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: dark ? '#a5b4fc' : '#1e40af', fontSize: 20, fontWeight: 700 }}>
          <FiUser />
          Hướng dẫn sử dụng
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          <div style={{ background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)', padding: 16, borderRadius: 10 }}>
            <h4 style={{ color: dark ? '#c7d2fe' : '#1e40af', fontWeight: 600, marginBottom: 12, fontSize: 16 }}>Để đạt kết quả tốt nhất:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Chụp ít nhất 5-10 ảnh từ các góc độ khác nhau',
                'Đảm bảo khuôn mặt được chiếu sáng tốt và rõ ràng',
                'Giữ khuôn mặt trong khung hình camera',
                'Đứng cách camera khoảng 0.5 - 1 mét',
              ].map((text, i) => (
                <li key={i} style={{ color: dark ? '#e5e7eb' : '#374151', marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ color: '#818cf8', fontWeight: 'bold', marginRight: 8, flexShrink: 0 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
          <div style={{ background: dark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)', padding: 16, borderRadius: 10 }}>
            <h4 style={{ color: dark ? '#c7d2fe' : '#1e40af', fontWeight: 600, marginBottom: 12, fontSize: 16 }}>Lưu ý quan trọng:</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                'Tránh đeo kính râm hoặc che khuất khuôn mặt',
                'Thử các biểu cảm khuôn mặt khác nhau',
                'Chụp trong điều kiện ánh sáng tự nhiên',
                'Đảm bảo camera sạch sẽ và không bị mờ',
              ].map((text, i) => (
                <li key={i} style={{ color: dark ? '#e5e7eb' : '#374151', marginBottom: 8, fontSize: 14, display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ color: '#818cf8', fontWeight: 'bold', marginRight: 8, flexShrink: 0 }}>•</span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
    </>
  );
};

export default Attendance;
