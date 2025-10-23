import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [todayResponse, statsResponse] = await Promise.all([
        attendanceAPI.today(),
        attendanceAPI.stats({ days: 30, user_id: user.role === 'student' ? user.id : undefined })
      ]);

      setTodayAttendance(todayResponse.data.attendance);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="container">
      <h1>Dashboard</h1>
      
      <div className="card">
        <h2>Xin chào, {user.name}!</h2>
        <p>Vai trò: {user.role === 'student' ? 'Học sinh/Sinh viên' : 
                    user.role === 'teacher' ? 'Giáo viên' : 'Quản trị viên'}</p>
      </div>

      {stats && (
        <div className="card">
          <h3>Thống kê điểm danh (30 ngày gần nhất)</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
              <h4>Số ngày có mặt</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.stats.present_days}</p>
            </div>
            <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
              <h4>Số ngày vắng</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.stats.absent_days}</p>
            </div>
            <div style={{ padding: '15px', background: '#d4edda', borderRadius: '8px' }}>
              <h4>Tỷ lệ điểm danh</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.stats.attendance_rate}%</p>
            </div>
          </div>
        </div>
      )}

      {user.role !== 'student' && (
        <div className="card">
          <h3>Điểm danh hôm nay</h3>
          {todayAttendance.length === 0 ? (
            <p>Chưa có điểm danh nào hôm nay</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Độ tin cậy</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map((record) => (
                  <tr key={record.id}>
                    <td>{record.user_name}</td>
                    <td>{new Date(record.time).toLocaleTimeString()}</td>
                    <td>
                      <span style={{ 
                        color: record.status === 'present' ? 'green' : 'red',
                        fontWeight: 'bold'
                      }}>
                        {record.status === 'present' ? 'Có mặt' : 'Vắng'}
                      </span>
                    </td>
                    <td>{record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;