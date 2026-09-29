import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import { useAuth } from './context/AuthContext';
import { useLenis } from './hooks/useLenis';
import Login from './Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reports from './pages/Reports.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import RulesWeights from './pages/admin/RulesWeights.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import SystemConfig from './pages/admin/SystemConfig.jsx';
import ManageCase from './pages/ManageCase.jsx';
import ViewCase from './pages/ViewCase.jsx';
import StudentLayout from './layouts/StudentLayout.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentCases from './pages/student/StudentCases.jsx';
import StudentCaseDetails from './pages/student/StudentCaseDetails.jsx';
import StudentPlaceholder from './pages/student/StudentPlaceholder.jsx';
import WardenDashboard from './pages/warden/WardenDashboard.jsx';
import WardenRegisterCase from './pages/warden/RegisterCase.jsx';
import WardenMyCases from './pages/warden/MyCases.jsx';
import WardenManageCase from './pages/warden/ManageCase.jsx';
import WardenViewCase from './pages/warden/ViewCase.jsx';
import WardenNotifications from './pages/warden/Notifications.jsx';
import WardenProfile from './pages/warden/Profile.jsx';
import ChiefWardenDashboard from './pages/chiefwarden/ChiefWardenDashboard.jsx';
import ChiefWardenRegisterCase from './pages/chiefwarden/RegisterCase.jsx';
import ChiefWardenIncomingCases from './pages/chiefwarden/IncomingCases.jsx';
import ChiefWardenManageCase from './pages/chiefwarden/ManageCase.jsx';
import ChiefWardenViewCase from './pages/chiefwarden/ViewCase.jsx';
import ChiefWardenNotifications from './pages/chiefwarden/Notifications.jsx';
import ChiefWardenProfile from './pages/chiefwarden/Profile.jsx';
import DswDashboard from './pages/dsw/DswDashboard.jsx';
import Settings from './pages/Settings.jsx';
import DacChatbot from './components/DacChatbot.jsx';

function ProtectedRoute({ children, roles }) {
  const { currentUser, loading, isAuthenticated, role } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/" replace />;
  }

  if (roles?.length && !roles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

/** Must be inside <BrowserRouter> to use useLocation */
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Role aliases requested for login redirection */}
        <Route path="/student-dashboard" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/warden-dashboard" element={<ProtectedRoute roles={['warden']}><Navigate to="/warden/dashboard" replace /></ProtectedRoute>} />
        <Route path="/chief-dashboard" element={<ProtectedRoute roles={['chief_warden']}><Navigate to="/chief-warden/dashboard" replace /></ProtectedRoute>} />
        <Route path="/dsw-dashboard" element={<ProtectedRoute roles={['dsw']}><DswDashboard /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute roles={['admin']}><Navigate to="/dashboard" replace /></ProtectedRoute>} />

        {/* Protected pages */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'dsw']}><Dashboard /></ProtectedRoute>} />
        <Route path="/register-case" element={<ProtectedRoute roles={['warden']}><WardenRegisterCase /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['admin', 'dsw']}><Reports /></ProtectedRoute>} />
        <Route path="/cases/:token" element={<ProtectedRoute roles={['admin', 'dsw']}><ManageCase /></ProtectedRoute>} />
        <Route path="/view-case/:token" element={<ProtectedRoute roles={['admin', 'dsw']}><ViewCase /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['student', 'warden', 'chief_warden', 'dsw', 'admin']}><Settings /></ProtectedRoute>} />

        {/* Student area — separate layout */}
        <Route path="/student" element={<ProtectedRoute roles={['student']}><StudentLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="cases" element={<StudentCases />} />
          <Route path="cases/:token" element={<StudentCaseDetails />} />
          <Route path="penalty-points" element={<StudentPlaceholder title="Penalty Points" />} />
          <Route path="profile" element={<StudentPlaceholder title="Profile" />} />
          <Route path="disciplinary-policy" element={<StudentPlaceholder title="Disciplinary Policy" />} />
        </Route>

        {/* Warden area */}
        <Route path="/warden/dashboard" element={<ProtectedRoute roles={['warden']}><WardenDashboard /></ProtectedRoute>} />
        <Route path="/warden/register" element={<ProtectedRoute roles={['warden']}><WardenRegisterCase /></ProtectedRoute>} />
        <Route path="/warden/cases" element={<ProtectedRoute roles={['warden']}><WardenMyCases /></ProtectedRoute>} />
        <Route path="/warden/cases/:id" element={<ProtectedRoute roles={['warden']}><WardenManageCase /></ProtectedRoute>} />
        <Route path="/warden/view/:id" element={<ProtectedRoute roles={['warden']}><WardenViewCase /></ProtectedRoute>} />
        <Route path="/warden/notifications" element={<ProtectedRoute roles={['warden']}><WardenNotifications /></ProtectedRoute>} />
        <Route path="/warden/profile" element={<ProtectedRoute roles={['warden']}><WardenProfile /></ProtectedRoute>} />

        {/* Chief Warden area */}
        <Route path="/chief-warden/dashboard" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenDashboard /></ProtectedRoute>} />
        <Route path="/chief-warden/register" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenRegisterCase /></ProtectedRoute>} />
        <Route path="/chief-warden/cases" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenIncomingCases /></ProtectedRoute>} />
        <Route path="/chief-warden/cases/:id" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenManageCase /></ProtectedRoute>} />
        <Route path="/chief-warden/view/:id" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenViewCase /></ProtectedRoute>} />
        <Route path="/chief-warden/notifications" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenNotifications /></ProtectedRoute>} />
        <Route path="/chief-warden/profile" element={<ProtectedRoute roles={['chief_warden']}><ChiefWardenProfile /></ProtectedRoute>} />

        {/* Admin Settings — nested */}
        <Route path="/admin-settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>}>
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
      <DacChatbot />
    </BrowserRouter>
  );
}
