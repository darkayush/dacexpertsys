import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import './index.css';
import { useAuth } from './context/AuthContext';
import { useLenis } from './hooks/useLenis';
import Login from './Login.jsx';
import DacChatbot from './components/DacChatbot.jsx';
import PageLoader from './components/PageLoader.jsx';
import DACLayout from './components/layout/DACLayout.jsx';

// Pages load on first visit, so the login screen does not wait for every page's code.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const AdminSettings = lazy(() => import('./pages/AdminSettings.jsx'));
const RulesWeights = lazy(() => import('./pages/admin/RulesWeights.jsx'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement.jsx'));
const SystemConfig = lazy(() => import('./pages/admin/SystemConfig.jsx'));
const EmailTest = lazy(() => import('./pages/admin/EmailTest.jsx'));
const CaseDetail = lazy(() => import('./pages/CaseDetail.jsx'));
const CaseList = lazy(() => import('./pages/CaseList.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const RegisterCase = lazy(() => import('./pages/warden/RegisterCase.jsx'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard.jsx'));
const StudentPolicy = lazy(() => import('./pages/student/StudentPolicy.jsx'));
const StudentProfile = lazy(() => import('./pages/StudentProfile.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));

/**
 * The single route-level loader (Suspense fallback + auth check). Signed-in
 * users keep the sidebar and top bar while the next page's code loads; it
 * renders only while React is actually waiting, with no added delay.
 */
function RouteLoader() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <PageLoader fullScreen />;
  return (
    <DACLayout>
      <PageLoader />
    </DACLayout>
  );
}

function ProtectedRoute({ children, roles }) {
  const { currentUser, loading, isAuthenticated, role } = useAuth();
  if (loading) return <RouteLoader />;
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
      {/* The single page-transition loader: shown while a page's code chunk loads. */}
      <Suspense fallback={<RouteLoader />} key={location.pathname}>
      <Routes location={location}>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Role aliases requested for login redirection */}
        <Route path="/student-dashboard" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/warden-dashboard" element={<ProtectedRoute roles={['warden']}><Navigate to="/warden/dashboard" replace /></ProtectedRoute>} />
        <Route path="/chief-dashboard" element={<ProtectedRoute roles={['chief_warden']}><Navigate to="/chief-warden/dashboard" replace /></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute roles={['admin']}><Navigate to="/dashboard" replace /></ProtectedRoute>} />

        {/* Admin & DSW */}
        <Route path="/dashboard" element={<ProtectedRoute roles={['admin', 'dsw']}><Dashboard /></ProtectedRoute>} />
        <Route path="/dsw-dashboard" element={<ProtectedRoute roles={['dsw']}><Dashboard /></ProtectedRoute>} />
        <Route path="/cases/:id" element={<ProtectedRoute roles={['admin', 'dsw']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/view-case/:id" element={<ProtectedRoute roles={['admin', 'dsw']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/students/:enrollmentNo" element={<ProtectedRoute roles={['admin', 'dsw', 'warden', 'chief_warden']}><StudentProfile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['student', 'warden', 'chief_warden', 'dsw', 'admin']}><Settings /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/student/dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/cases" element={<ProtectedRoute roles={['student']}><CaseList /></ProtectedRoute>} />
        <Route path="/student/cases/:id" element={<ProtectedRoute roles={['student']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/student/penalty-points" element={<ProtectedRoute roles={['student']}><Navigate to="/student/dashboard" replace /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute roles={['student']}><Profile /></ProtectedRoute>} />
        <Route path="/student/disciplinary-policy" element={<ProtectedRoute roles={['student']}><StudentPolicy /></ProtectedRoute>} />

        {/* Warden */}
        <Route path="/warden/dashboard" element={<ProtectedRoute roles={['warden']}><Dashboard /></ProtectedRoute>} />
        <Route path="/warden/register" element={<ProtectedRoute roles={['warden']}><RegisterCase /></ProtectedRoute>} />
        <Route path="/warden/cases" element={<ProtectedRoute roles={['warden']}><CaseList /></ProtectedRoute>} />
        <Route path="/warden/cases/:id" element={<ProtectedRoute roles={['warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/warden/view/:id" element={<ProtectedRoute roles={['warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/warden/notifications" element={<ProtectedRoute roles={['warden']}><Notifications /></ProtectedRoute>} />
        <Route path="/warden/profile" element={<ProtectedRoute roles={['warden']}><Profile /></ProtectedRoute>} />

        {/* Chief Warden */}
        <Route path="/chief-warden/dashboard" element={<ProtectedRoute roles={['chief_warden']}><Dashboard /></ProtectedRoute>} />
        <Route path="/chief-warden/register" element={<ProtectedRoute roles={['chief_warden']}><RegisterCase /></ProtectedRoute>} />
        <Route path="/chief-warden/cases" element={<ProtectedRoute roles={['chief_warden']}><CaseList /></ProtectedRoute>} />
        <Route path="/chief-warden/cases/:id" element={<ProtectedRoute roles={['chief_warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/chief-warden/view/:id" element={<ProtectedRoute roles={['chief_warden']}><CaseDetail /></ProtectedRoute>} />
        <Route path="/chief-warden/notifications" element={<ProtectedRoute roles={['chief_warden']}><Notifications /></ProtectedRoute>} />
        <Route path="/chief-warden/profile" element={<ProtectedRoute roles={['chief_warden']}><Profile /></ProtectedRoute>} />

        {/* Admin settings — nested inside one shell */}
        <Route path="/admin-settings" element={<ProtectedRoute roles={['admin']}><AdminSettings /></ProtectedRoute>}>
          <Route index element={<Navigate to="rules-weights" replace />} />
          {/* "Rules & Policies" shows the official policy; "System Config" manages rules and weights. */}
          <Route path="rules-weights" element={<SystemConfig />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="system" element={<RulesWeights />} />
          <Route path="email-test" element={<EmailTest />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
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
