import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI } from '../services/api';
import {
  FiUser, FiCalendar, FiCheckCircle, FiXCircle,
  FiTrendingUp, FiClock, FiRefreshCw, FiCamera
} from 'react-icons/fi';
import '../App.css';

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
    return (
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="auth-button-spinner" style={{ margin: '0 auto 1rem', width: 40, height: 40, borderWidth: 3 }} />
            <p style={{ color: '#6b7280' }}>Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  const roleLabels = {
    student: 'Học sinh / Sinh viên',
    teacher: 'Giáo viên',
    admin: 'Quản trị viên'
  };

  return (
    <div className="page-container">
      <div className="page-header-main">
        <div>
          <h1>Tổng quan</h1>
          <p>Xin chào, {user.name} · {roleLabels[user.role]}</p>
        </div>
        <div className="page-actions">
          <button className="btn-modern outline small" onClick={fetchDashboardData}>
            <FiRefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green">
              <FiCheckCircle size={22} />
            </div>
            <div className="stat-info">
              <h3>{stats.stats.present_days}</h3>
              <p>Số ngày có mặt</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">
              <FiXCircle size={22} />
            </div>
            <div className="stat-info">
              <h3>{stats.stats.absent_days}</h3>
              <p>Số ngày vắng</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <FiTrendingUp size={22} />
            </div>
            <div className="stat-info">
              <h3>{stats.stats.attendance_rate}%</h3>
              <p>Tỷ lệ điểm danh</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <FiClock size={22} />
            </div>
            <div className="stat-info">
              <h3>{stats.stats.total_days || '—'}</h3>
              <p>Tổng số ngày học</p>
            </div>
          </div>
        </div>
      )}

      {user.role !== 'student' && (
        <div className="content-card">
          <div className="content-card-header">
            <h3><FiCalendar size={16} /> Điểm danh hôm nay</h3>
            <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 500 }}>
              {todayAttendance.length} bản ghi
            </span>
          </div>
          <div className="content-card-body">
            {todayAttendance.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                <FiCamera size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p>Chưa có điểm danh nào hôm nay</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
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
                        <td className="cell-name">{record.user_name}</td>
                        <td>{new Date(record.time).toLocaleTimeString('vi-VN')}</td>
                        <td>
                          <span className={`status-badge ${record.status === 'present' ? 'present' : 'absent'}`}>
                            {record.status === 'present' ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />}
                            {record.status === 'present' ? 'Có mặt' : 'Vắng'}
                          </span>
                        </td>
                        <td>{record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
