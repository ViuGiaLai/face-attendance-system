import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, usersAPI } from '../services/api';

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user.role === 'admin' || user.role === 'teacher') {
      fetchUsers();
    }
    fetchAttendance();
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

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <h1>Lịch sử điểm danh</h1>

      <div className="card">
        <h3>Bộ lọc</h3>
        <form onSubmit={handleFilter}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'end' }}>
            {(user.role === 'admin' || user.role === 'teacher') && (
              <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                <label className="form-label">Người dùng</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="form-input"
                >
                  <option value="">Tất cả người dùng</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
              <label className="form-label">Từ ngày</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
              <label className="form-label">Đến ngày</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <button type="submit" className="btn btn-primary">
                Lọc
              </button>
            </div>

            <div className="form-group">
              <button type="button" onClick={exportToCSV} className="btn btn-success">
                Xuất CSV
              </button>
            </div>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading">Đang tải...</div>
      ) : (
        <div className="card">
          <h3>Kết quả ({attendance.length} bản ghi)</h3>
          {attendance.length === 0 ? (
            <p>Không có dữ liệu điểm danh</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
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
                      <td>{record.user_name}</td>
                      <td>{new Date(record.date).toLocaleDateString('vi-VN')}</td>
                      <td>{new Date(record.time).toLocaleTimeString('vi-VN')}</td>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;