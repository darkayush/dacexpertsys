import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import { useAuth } from './context/AuthContext';
import { useLenis } from './hooks/useLenis';
import Login from './Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import RegisterCase from './pages/RegisterCase.jsx';
import Reports from './pages/Reports.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import RulesWeights from './pages/admin/RulesWeights.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import SystemConfig from './pages/admin/SystemConfig.jsx';
import ManageCase from './pages/ManageCase.jsx';
import ViewCase from './pages/ViewCase.jsx';

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null;
  return currentUser ? children : <Navigate to="/" replace />;
}

/** Must be inside <BrowserRouter> to use useLocation */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected pages */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/register-case" element={<ProtectedRoute><RegisterCase /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/cases/:token" element={<ProtectedRoute><ManageCase /></ProtectedRoute>} />
        <Route path="/view-case/:token" element={<ProtectedRoute><ViewCase /></ProtectedRoute>} />

        {/* Admin Settings — nested */}
        <Route path="/admin-settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>}>
          <Route index element={<Navigate to="rules-weights" replace />} />
          <Route path="rules-weights" element={<RulesWeights />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="system" element={<SystemConfig />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  useLenis(); // 🌊 boot global smooth scroll
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
