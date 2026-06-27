import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, usersAPI } from '../services/api';
import {
  FiFilter, FiDownload, FiSearch, FiCheckCircle, FiXCircle,
  FiUser, FiCalendar, FiRefreshCw
} from 'react-icons/fi';
import '../App.css';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (user.role === 'admin' || user.role === 'teacher') {
        await fetchUsers();
      }
      await fetchAttendance();
      setInitialLoading(false);
    };
    init();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ active_only: true });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedUser) params.user_id = selectedUser;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await attendanceAPI.history(params);
      setAttendance(response.data.attendance);
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchAttendance();
  };

  const exportToCSV = () => {
    const headers = ['Tên', 'Ngày', 'Thời gian', 'Trạng thái', 'Độ tin cậy'];
    const csvData = attendance.map(record => [
      record.user_name,
      record.date,
      record.time,
      record.status === 'present' ? 'Có mặt' : 'Vắng',
      record.confidence ? `${(record.confidence * 100).toFixed(1)}%` : 'N/A'
    ]);
    const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-header-main">
        <div>
          <h1>Lịch sử điểm danh</h1>
          <p>Tra cứu và xuất báo cáo điểm danh</p>
        </div>
        <div className="page-actions">
          <button className="btn-modern success small" onClick={exportToCSV} disabled={attendance.length === 0}>
            <FiDownload size={13} /> Xuất CSV
          </button>
          <button className="btn-modern outline small" onClick={fetchAttendance}>
            <FiRefreshCw size={13} /> Làm mới
          </button>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3><FiFilter size={16} /> Bộ lọc</h3>
        </div>
        <div className="content-card-body">
          <form onSubmit={handleFilter}>
            <div className="filter-bar">
              {(user.role === 'admin' || user.role === 'teacher') && (
                <div className="filter-group">
                  <label>Người dùng</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="filter-input"
                  >
                    <option value="">Tất cả</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="filter-group">
                <label>Từ ngày</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-group">
                <label>Đến ngày</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="filter-actions">
                <button type="submit" className="btn-modern primary small">
                  <FiSearch size={13} /> Tra cứu
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="content-card">
        <div className="content-card-header">
          <h3><FiCalendar size={16} /> Kết quả</h3>
          <span style={{ fontSize: '0.82rem', color: '#6b7280', fontWeight: 500 }}>
            {attendance.length} bản ghi
          </span>
        </div>
        <div className="content-card-body">
          {initialLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="auth-button-spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: '#9ca3af' }}>Đang tải...</p>
            </div>
          ) : attendance.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              <FiCalendar size={32} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
              <p>Không có dữ liệu điểm danh</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Ngày</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Độ tin cậy</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td className="cell-name">{record.user_name}</td>
                      <td>{new Date(record.date).toLocaleDateString('vi-VN')}</td>
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
    </div>
  );
};

export default AttendanceHistory;
