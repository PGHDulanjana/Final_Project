import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from './ProfileDropdown';
import SideNav from './SideNav';
import NotificationCenter from './NotificationCenter';

const Layout = ({ children, showSideNav = true }) => {
  const { isAdmin, isPlayer, isJudge, isCoach, isOrganizer, user } = useAuth();

  const getDashboardLink = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isPlayer) return '/player/matches';
    if (isJudge) return '/judge/dashboard';
    if (isCoach) return '/coach/dashboard';
    if (isOrganizer) return '/organizer/dashboard';
    return '/dashboard';
  };

  const getRole = () => {
    if (isAdmin) return 'Admin';
    if (isPlayer) return 'Player';
    if (isJudge) return 'Judge';
    if (isCoach) return 'Coach';
    if (isOrganizer) return 'Organizer';
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to={getDashboardLink()} className="text-2xl font-bold text-blue-600">
                XpertKarate
              </Link>
              {!showSideNav && (
                <div className="ml-10 flex items-center space-x-4">
                  {isJudge && (
                    <Link
                      to="/judge/scoring"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Scoring
                    </Link>
                  )}
                  {isCoach && (
                    <Link
                      to="/coach/teams"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      My Teams
                    </Link>
                  )}
                  {isOrganizer && (
                    <Link
                      to="/organizer/tournaments"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Manage Tournaments
                    </Link>
                  )}
                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Users
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end space-x-3 ml-auto">
              <NotificationCenter />
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Side Navigation */}
        {showSideNav && user && getRole() && (
          <SideNav role={getRole()} />
        )}

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${showSideNav && user ? 'ml-64' : ''}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

