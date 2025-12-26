import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, loading, isPlayer, isCoach, isJudge, isOrganizer, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on user type
  if (isPlayer || user?.user_type === 'Player') {
    return <Navigate to="/player/matches" replace />;
  }

  if (isCoach || user?.user_type === 'Coach') {
    return <Navigate to="/coach/dashboard" replace />;
  }

  if (isJudge || user?.user_type === 'Judge') {
    return <Navigate to="/judge/dashboard" replace />;
  }

  if (isOrganizer || user?.user_type === 'Organizer') {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  if (isAdmin || user?.user_type === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome, {user.username || user.first_name}!
        </h1>
        <p className="text-gray-600 mb-6">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
};

export default Dashboard;

