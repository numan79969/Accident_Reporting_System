import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import ResponderDashboard from './components/ResponderDashboard';
import AdminDashboard from './components/AdminDashboard';
import ReportAccident from './components/ReportAccident';
import './App.css';

function RoleDashboard() {
  const role = localStorage.getItem('role');
  if (['police', 'emergency_responder', 'hospital'].includes(role)) {
    return <ResponderDashboard />;
  }
  if (role === 'admin') {
    return <AdminDashboard />;
  }
  return <Dashboard />;
}

function App() {
  return (
    <Router>
      <Navbar />
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportAccident />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
