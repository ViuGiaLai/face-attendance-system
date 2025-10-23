import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Lazy load components for better performance
const Navbar = React.lazy(() => import('./components/Navbar'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Attendance = React.lazy(() => import('./pages/Attendance'));
const AttendanceHistory = React.lazy(() => import('./pages/AttendanceHistory'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));

// Loading component
const Loading = () => <div className="flex items-center justify-center min-h-screen">Loading...</div>;

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Suspense fallback={<Loading />}>
        {user && <Navbar />}
        <div className="app-content p-4">
          <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" /> : <Login />
        } />
        <Route path="/register" element={
          user ? <Navigate to="/" /> : <Register />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/attendance" element={
          <ProtectedRoute>
            <Attendance />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <AttendanceHistory />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />
        {/* Catch-all route */}
        <Route path="*" element={
          <Navigate to="/" replace />
        } />
          </Routes>
        </div>
      </Suspense>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;