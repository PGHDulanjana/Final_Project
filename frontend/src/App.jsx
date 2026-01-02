import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import PaymentFailed from './pages/PaymentFailed';
import PaymentPending from './pages/PaymentPending';
import PaymentError from './pages/PaymentError';
import Dashboard from './pages/Dashboard';
import Tournaments from './pages/Tournaments';
import Unauthorized from './pages/Unauthorized';
import PlayerDashboard from './pages/player/PlayerDashboard';
import PlayerTournaments from './pages/player/PlayerTournaments';
import PlayerResults from './pages/player/PlayerResults';
import PlayerMatches from './pages/player/PlayerMatches';
import PlayerPerformance from './pages/player/PlayerPerformance';
import PlayerPayments from './pages/player/Payments';
import PlayerProfile from './pages/player/PlayerProfile';
import Notifications from './pages/player/Notifications';
import CoachNotifications from './pages/coach/Notifications';
import JudgeDashboard from './pages/judge/JudgeDashboard';
import ActiveMatches from './pages/judge/ActiveMatches';
import LiveScoring from './pages/judge/LiveScoring';
import ScoredMatches from './pages/judge/ScoredMatches';
import JudgeSchedule from './pages/judge/JudgeSchedule';
import CoachDashboard from './pages/coach/CoachDashboard';
import MyTeams from './pages/coach/MyTeams';
import TeamTournaments from './pages/coach/TeamTournaments';
import TeamStats from './pages/coach/TeamStats';
import Schedule from './pages/coach/Schedule';
import OrganizerDashboard from './pages/organizer/OrganizerDashboard';
import TournamentManagement from './pages/organizer/TournamentManagement';
import MatchDraws from './pages/organizer/MatchDraws';
import Participants from './pages/organizer/Participants';
import OrganizerSchedule from './pages/organizer/OrganizerSchedule';
import OrganizerPayments from './pages/organizer/Payments';
import CategoryManagement from './pages/organizer/CategoryManagement';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRegister from './pages/admin/AdminRegister';
import UserManagement from './pages/admin/UserManagement';
import AdminTournaments from './pages/admin/AdminTournaments';
import Analytics from './pages/admin/Analytics';
import AdminPayments from './pages/admin/AdminPayments';
import Settings from './pages/admin/Settings';
import NotificationManagement from './pages/admin/NotificationManagement';
import { useEffect } from 'react';
import { initSocket, disconnectSocket } from './utils/socket';

const AppRoutes = () => {
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (token && isAuthenticated) {
      // Initialize socket connection
      const socket = initSocket(token);
      
      // Handle visibility change - reconnect when tab becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden && token && isAuthenticated) {
          if (!socket || !socket.connected) {
            initSocket(token);
          }
        }
      };
      
      // Handle online/offline events
      const handleOnline = () => {
        if (!socket || !socket.connected) {
          initSocket(token);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        disconnectSocket();
      };
    } else {
      // Disconnect if not authenticated
      disconnectSocket();
    }
  }, [token, isAuthenticated]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
      <Route path="/admin/register" element={!isAuthenticated ? <AdminRegister /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
      <Route path="/reset-password" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      <Route path="/payment/failed" element={<PaymentFailed />} />
      <Route path="/payment/pending" element={<PaymentPending />} />
      <Route path="/payment/error" element={<PaymentError />} />
      
      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Role-based Routes */}
      <Route
        path="/player/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/tournaments"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerTournaments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/results"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerResults />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/matches"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerMatches />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/performance"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerPerformance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/profile"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerProfile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/payments"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <PlayerPayments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/player/notifications"
        element={
          <ProtectedRoute allowedRoles={['Player']}>
            <Notifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/judge/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Judge']}>
            <JudgeDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/judge/matches"
        element={
          <ProtectedRoute allowedRoles={['Judge']}>
            <ActiveMatches />
          </ProtectedRoute>
        }
      />

      <Route
        path="/judge/scoring"
        element={
          <ProtectedRoute allowedRoles={['Judge']}>
            <LiveScoring />
          </ProtectedRoute>
        }
      />

      <Route
        path="/judge/scored"
        element={
          <ProtectedRoute allowedRoles={['Judge']}>
            <ScoredMatches />
          </ProtectedRoute>
        }
      />

      <Route
        path="/judge/schedule"
        element={
          <ProtectedRoute allowedRoles={['Judge']}>
            <JudgeSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Coach']}>
            <CoachDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/teams"
        element={
          <ProtectedRoute allowedRoles={['Coach']}>
            <MyTeams />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/tournaments"
        element={
          <ProtectedRoute allowedRoles={['Coach']}>
            <TeamTournaments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/stats"
        element={
          <ProtectedRoute allowedRoles={['Coach']}>
            <TeamStats />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/schedule"
        element={
          <ProtectedRoute allowedRoles={['Coach']}>
            <Schedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coach/notifications"
        element={
          <ProtectedRoute allowedRoles={['Coach']}>
            <CoachNotifications />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <OrganizerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/tournaments"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <TournamentManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/draws"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <MatchDraws />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/participants"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <Participants />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/schedule"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <OrganizerSchedule />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/payments"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <OrganizerPayments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/organizer/events"
        element={
          <ProtectedRoute allowedRoles={['Organizer']}>
            <CategoryManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <UserManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/tournaments"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminTournaments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Analytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminPayments />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <NotificationManagement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <Settings />
          </ProtectedRoute>
        }
      />

      {/* Public Tournament View */}
      <Route path="/tournaments" element={<Tournaments />} />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </Router>
    </AuthProvider>
  );
}

export default App;

