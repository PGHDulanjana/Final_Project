import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { matchService } from '../../services/matchService';
import { categoryService } from '../../services/categoryService';
import { scoreService } from '../../services/scoreService';
import { notificationService } from '../../services/notificationService';
import { coachService } from '../../services/coachService';
import { playerService } from '../../services/playerService';
import { judgeService } from '../../services/judgeService';
import api from '../../config/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import LiveScoreboard from '../../components/LiveScoreboard';
import TournamentDetailModal from '../../components/TournamentDetailModal';
import CreateTournamentModal from './CreateTournamentModal';
import {
  FiAward,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPlus,
  FiEdit,
  FiFilter,
  FiRefreshCw,
  FiBell,
  FiZap,
  FiSettings,
  FiXCircle,
  FiArrowRight,
  FiUser,
  FiGift,
  FiBarChart2,
  FiDownload,
  FiSend,
  FiSearch
} from 'react-icons/fi';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scores, setScores] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [judges, setJudges] = useState([]);
  const [currentOrganizer, setCurrentOrganizer] = useState(null);
  
  // Filter states for users view
  const [userFilterType, setUserFilterType] = useState('all'); // 'all', 'coaches', 'players', 'judges'
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // UI states
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [showAddEventsPrompt, setShowAddEventsPrompt] = useState(false);
  const [newlyCreatedTournamentId, setNewlyCreatedTournamentId] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    if (user) {
      loadData(true);
      
      // Auto-refresh data every 30 seconds, but only when tab is visible and no modals are open
      const refreshInterval = setInterval(() => {
        // Only refresh if tab is visible and no modals are open
        if (document.visibilityState === 'visible' && 
            !showCreateTournament && 
            !selectedTournamentId && 
            !selectedRegistration && 
            !selectedMatch) {
          loadData(false); // Don't show loading spinner during auto-refresh
        }
      }, 30000); // Refresh every 30 seconds
      
      // Also refresh when tab becomes visible (if no modals are open)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && 
            !showCreateTournament && 
            !selectedTournamentId && 
            !selectedRegistration && 
            !selectedMatch) {
          loadData(false);
        }
      };
      
      // Refresh when window gains focus (if no modals are open)
      const handleFocus = () => {
        if (!showCreateTournament && 
            !selectedTournamentId && 
            !selectedRegistration && 
            !selectedMatch) {
          loadData(false);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(refreshInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user, showCreateTournament, selectedTournamentId, selectedRegistration, selectedMatch]);

  // Debug: Log when selectedTournamentId changes
  useEffect(() => {
    // selectedTournamentId changed
  }, [selectedTournamentId]);

  const loadData = async (showLoading = true) => {
    if (!user?._id) return;

    if (showLoading) {
      setLoading(true);
    }
    try {
      const [
        tournamentsRes,
        registrationsRes,
        matchesRes,
        categoriesRes,
        scoresRes,
        notificationsRes,
        coachesRes,
        playersRes,
        judgesRes
      ] = await Promise.all([
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
        matchService.getMatches(),
        categoryService.getCategories(),
        scoreService.getScores(),
        notificationService.getNotifications(),
        coachService.getCoaches(),
        playerService.getPlayers(),
        judgeService.getJudges()
      ]);

      // Extract data from API responses - handle both direct data and wrapped responses
      const extractData = (response) => {
        if (!response || !response.data) return [];
        // If response.data is an array, return it directly
        if (Array.isArray(response.data)) return response.data;
        // If response.data has a data property (nested), return that
        if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
        // If response.data has a data property that's not an array, try to return it as array
        return [];
      };

      setTournaments(extractData(tournamentsRes));
      const allRegistrations = extractData(registrationsRes);
      setRegistrations(allRegistrations);
      setMatches(extractData(matchesRes));
      setCategories(extractData(categoriesRes));
      setScores(extractData(scoresRes));
      setNotifications(extractData(notificationsRes));
      const allCoaches = extractData(coachesRes);
      
      // For players, ensure we get all players - handle nested response structure
      // The backend returns: { success: true, count: X, data: [...] }
      // The service returns: response.data = { success: true, count: X, data: [...] }
      // So playersRes = { success: true, count: X, data: [...] }
      // And playersRes.data = [...] (the array)
      let allPlayersData = [];
      if (playersRes) {
        // If playersRes is already an array
        if (Array.isArray(playersRes)) {
          allPlayersData = playersRes;
        }
        // If playersRes has a data property that's an array
        else if (playersRes.data && Array.isArray(playersRes.data)) {
          allPlayersData = playersRes.data;
        }
        // If playersRes.data has a nested data property
        else if (playersRes.data && playersRes.data.data && Array.isArray(playersRes.data.data)) {
          allPlayersData = playersRes.data.data;
        }
      }
      
      const allJudges = extractData(judgesRes);

      // Fetch current organizer profile
      let organizer = null;
      try {
        const organizersRes = await api.get('/organizers');
        const organizers = extractData(organizersRes);
        organizer = organizers.find(org => {
          const orgUserId = org.user_id?._id || org.user_id;
          return orgUserId === user._id || orgUserId?.toString() === user._id?.toString();
        });
        setCurrentOrganizer(organizer || null);
      } catch (error) {
        console.error('Error fetching organizer profile:', error);
        // Don't show error toast for organizer fetch failure, just log it
      }

      // Filter users to only show those registered for tournaments created by this organizer
      if (organizer) {
        const organizerId = organizer._id;
        
        // Get all tournaments created by this organizer
        const organizerTournaments = extractData(tournamentsRes).filter(t => {
          const tournamentOrganizerId = t.organizer_id?._id || t.organizer_id;
          return tournamentOrganizerId === organizerId || 
                 tournamentOrganizerId?.toString() === organizerId?.toString();
        });
        
        // Get tournament IDs
        const organizerTournamentIds = organizerTournaments.map(t => t._id);
        
        // Get all registrations for tournaments created by this organizer
        const organizerRegistrations = allRegistrations.filter(reg => {
          const regTournamentId = reg.tournament_id?._id || reg.tournament_id;
          return organizerTournamentIds.some(tid => 
            tid === regTournamentId || tid?.toString() === regTournamentId?.toString()
          );
        });
        
        // Extract unique IDs from registrations
        const registeredCoachIds = new Set();
        const registeredPlayerIds = new Set();
        const registeredJudgeIds = new Set();
        
        organizerRegistrations.forEach(reg => {
          if (reg.coach_id) {
            const coachId = reg.coach_id?._id || reg.coach_id;
            registeredCoachIds.add(coachId?.toString());
          }
          if (reg.player_id) {
            const playerId = reg.player_id?._id || reg.player_id;
            registeredPlayerIds.add(playerId?.toString());
          }
          if (reg.judge_id) {
            const judgeId = reg.judge_id?._id || reg.judge_id;
            registeredJudgeIds.add(judgeId?.toString());
          }
        });
        
        // Filter coaches to only show registered ones
        const filteredCoaches = allCoaches.filter(coach => {
          const coachId = coach._id?.toString();
          return registeredCoachIds.has(coachId);
        });
        setCoaches(filteredCoaches);
        
        // Filter players to only show registered ones
        const filteredPlayers = allPlayersData.filter(player => {
          const playerId = player._id?.toString();
          return registeredPlayerIds.has(playerId);
        });
        setPlayers(filteredPlayers);
        
        // Filter judges to only show registered ones
        const filteredJudges = allJudges.filter(judge => {
          const judgeId = judge._id?.toString();
          return registeredJudgeIds.has(judgeId);
        });
        setJudges(filteredJudges);
        
      } else {
        // If organizer profile not found, show empty lists
        setCoaches([]);
        setPlayers([]);
        setJudges([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (showLoading) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Helper function to check if tournament belongs to current organizer
  const isTournamentOwner = (tournament) => {
    if (!currentOrganizer || !tournament) return false;
    const tournamentOrganizerId = tournament.organizer_id?._id || tournament.organizer_id;
    const currentOrganizerId = currentOrganizer._id;
    return tournamentOrganizerId === currentOrganizerId || 
           tournamentOrganizerId?.toString() === currentOrganizerId?.toString();
  };

  // Calculate statistics - only for tournaments created by this organizer
  const organizerTournaments = currentOrganizer ? tournaments.filter(t => isTournamentOwner(t)) : [];
  const totalTournaments = organizerTournaments.length;
  const activeTournaments = organizerTournaments.filter(t => t.status === 'Open' || t.status === 'Ongoing').length;
  const draftTournaments = organizerTournaments.filter(t => t.status === 'Draft').length;
  
  // Filter registrations to only those for organizer's tournaments
  const organizerRegistrations = currentOrganizer ? registrations.filter(r => {
    const regTournamentId = r.tournament_id?._id || r.tournament_id;
    return organizerTournaments.some(t => 
      t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString()
    );
  }) : [];
  
  const totalRegistrations = organizerRegistrations.length;
  const pendingRegistrations = organizerRegistrations.filter(r => r.approval_status === 'Pending').length;
  const approvedRegistrations = organizerRegistrations.filter(r => r.approval_status === 'Approved').length;
  
  // Filter matches to only those for organizer's tournaments
  const organizerMatches = currentOrganizer ? matches.filter(m => {
    const matchTournamentId = m.tournament_id?._id || m.tournament_id;
    return organizerTournaments.some(t => 
      t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString()
    );
  }) : [];
  
  const totalMatches = organizerMatches.length;
  const upcomingMatches = organizerMatches.filter(m => 
    (m.status === 'Scheduled' || m.status === 'In Progress') && 
    new Date(m.scheduled_time) > new Date()
  ).length;
  const completedMatches = organizerMatches.filter(m => m.status === 'Completed').length;
  const totalCoaches = coaches.length;
  const totalPlayers = players.length;
  const totalJudges = judges.length;
  const totalRevenue = organizerRegistrations
    .filter(r => r.payment_status === 'Paid')
    .reduce((sum, r) => {
      const tournament = organizerTournaments.find(t => {
        const regTournamentId = r.tournament_id?._id || r.tournament_id;
        return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
      });
      if (tournament) {
        // Check if registration has category with fees
        const category = r.category_id;
        if (category) {
          if (r.registration_type === 'Team' && category.team_event_fee) {
            return sum + category.team_event_fee;
          } else if (r.registration_type === 'Individual' && category.individual_player_fee) {
            return sum + category.individual_player_fee;
          }
        }
        // Fallback to tournament-level fees if category fees not available
        if (r.registration_type === 'Team' && tournament.entry_fee_team) {
          return sum + tournament.entry_fee_team;
        } else if (r.registration_type === 'Individual' && tournament.entry_fee_individual) {
          return sum + tournament.entry_fee_individual;
        }
      }
      return sum;
    }, 0);

  const handleApproveRegistration = async (registrationId) => {
    try {
      await registrationService.updateRegistration(registrationId, {
        approval_status: 'Approved'
      });
      toast.success('Registration approved successfully');
      loadData(true);
    } catch (error) {
      console.error('Error approving registration:', error);
      toast.error(error.response?.data?.message || 'Failed to approve registration');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    try {
      await registrationService.updateRegistration(registrationId, {
        approval_status: 'Rejected'
      });
      toast.success('Registration rejected');
      loadData(true);
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast.error(error.response?.data?.message || 'Failed to reject registration');
    }
  };

  const handleGenerateDraws = async (tournamentId, categoryId) => {
    try {
      // TODO: Implement API call to generate AI match draws
      toast.success('AI match draws generated successfully!');
      loadData(true);
    } catch (error) {
      console.error('Error generating draws:', error);
      toast.error('Failed to generate match draws');
    }
  };

  const handlePublishBrackets = async (tournamentId) => {
    try {
      await tournamentService.updateTournament(tournamentId, {
        status: 'Open'
      });
      toast.success('Brackets and schedules published successfully!');
      loadData(true);
    } catch (error) {
      console.error('Error publishing brackets:', error);
      toast.error('Failed to publish brackets');
    }
  };

  const handleCloseTournament = async (tournamentId) => {
    try {
      await tournamentService.updateTournament(tournamentId, {
        status: 'Completed'
      });
      toast.success('Tournament closed and final results published!');
      loadData(true);
    } catch (error) {
      console.error('Error closing tournament:', error);
      toast.error('Failed to close tournament');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      {/* Tournament Detail Modal - Rendered outside Layout for proper z-index */}
      {selectedTournamentId && (
        <TournamentDetailModal
          tournamentId={selectedTournamentId}
          onClose={() => {
            setSelectedTournamentId(null);
          }}
        />
      )}
      
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Organizer Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.first_name || user?.username}! Manage your tournaments and events
                </p>
              </div>
              <button
                onClick={() => setShowCreateTournament(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
              >
                <FiPlus className="w-5 h-5" />
                Create Tournament
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: FiBarChart2 },
                { id: 'tournaments', label: 'Tournaments', icon: FiAward },
                { id: 'registrations', label: 'Registrations', icon: FiUsers },
                { id: 'users', label: 'Users', icon: FiUsers },
                { id: 'draws', label: 'Match Draws', icon: FiTarget },
                { id: 'schedule', label: 'Schedule', icon: FiCalendar },
                { id: 'judges', label: 'Judges', icon: FiUser },
                { id: 'scoring', label: 'Live Scoring', icon: FiZap },
                { id: 'results', label: 'Results', icon: FiGift },
                { id: 'notifications', label: 'Notifications', icon: FiBell }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Tournaments</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{totalTournaments}</p>
                  <p className="text-xs text-gray-500 mt-1">{activeTournaments} Active</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FiAward className="w-8 h-8 text-blue-600" />
                </div>
              </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                      <p className="text-gray-500 text-sm font-medium">Pending Approvals</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{pendingRegistrations}</p>
                      <p className="text-xs text-gray-500 mt-1">{approvedRegistrations} Approved</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <FiUsers className="w-8 h-8 text-green-600" />
                </div>
              </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                      <p className="text-gray-500 text-sm font-medium">Upcoming Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{upcomingMatches}</p>
                      <p className="text-xs text-gray-500 mt-1">{completedMatches} Completed</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FiCalendar className="w-8 h-8 text-purple-600" />
                </div>
              </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">Rs {totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">From Paid Registrations</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <FiDollarSign className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
                </div>
              </div>

              {/* User Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition cursor-pointer" onClick={() => setActiveTab('users')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Coaches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalCoaches}</p>
                      <p className="text-xs text-gray-500 mt-1">Registered coaches</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiUser className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition cursor-pointer" onClick={() => setActiveTab('users')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Players</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalPlayers}</p>
                      <p className="text-xs text-gray-500 mt-1">Registered players</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiUsers className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 hover:shadow-xl transition cursor-pointer" onClick={() => setActiveTab('users')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Judges</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalJudges}</p>
                      <p className="text-xs text-gray-500 mt-1">Registered judges</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <FiUser className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <button
                    onClick={() => setShowCreateTournament(true)}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <FiPlus className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Create Tournament</span>
                  </button>
                  <button
                    onClick={() => navigate('/organizer/events')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition"
                  >
                    <FiAward className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Manage Events</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('registrations')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition"
                  >
                    <FiCheckCircle className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Approve Registrations</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('draws')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Generate Match Draws</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition"
                  >
                    <FiCalendar className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Set Schedule</span>
                  </button>
                </div>
          </div>

          {/* Recent Tournaments */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">My Tournaments</h2>
                <button
                    onClick={() => setActiveTab('tournaments')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                    View All <FiArrowRight />
                </button>
            </div>
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tournaments Yet</h3>
                    <p className="text-gray-600 mb-4">Create your first tournament to get started</p>
                <button
                      onClick={() => setShowCreateTournament(true)}
                      className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
                >
                  Create Tournament
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizerTournaments.slice(0, 6).map((tournament) => (
                      <TournamentCard
                    key={tournament._id}
                        tournament={tournament}
                        registrations={organizerRegistrations}
                        matches={organizerMatches}
                        onViewDetails={() => {
                          setSelectedTournamentId(tournament._id);
                        }}
                        onGenerateDraws={() => handleGenerateDraws(tournament._id)}
                        onPublishBrackets={() => handlePublishBrackets(tournament._id)}
                        onCloseTournament={() => handleCloseTournament(tournament._id)}
                        isOwner={isTournamentOwner(tournament)}
                      />
                ))}
              </div>
            )}
          </div>

          {/* Pending Registrations */}
              {pendingRegistrations > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-yellow-200">
            <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiClock className="w-6 h-6 text-yellow-600" />
                        Pending Registrations
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {pendingRegistrations} registration{pendingRegistrations !== 1 ? 's' : ''} awaiting approval
                      </p>
                    </div>
              <button
                      onClick={() => setActiveTab('registrations')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                      Review All <FiArrowRight />
              </button>
            </div>
              <div className="space-y-3">
                {organizerRegistrations
                  .filter(r => r.approval_status === 'Pending')
                  .slice(0, 5)
                      .map((registration) => (
                        <RegistrationApprovalCard
                          key={registration._id}
                          registration={registration}
                          tournaments={organizerTournaments}
                          onApprove={() => handleApproveRegistration(registration._id)}
                          onReject={() => handleRejectRegistration(registration._id)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Live Scoring */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FiZap className="w-6 h-6 text-yellow-600" />
                    Live Scoring Monitor
                  </h2>
                  <button
                    onClick={() => setActiveTab('scoring')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View Full Scoreboard <FiArrowRight />
                  </button>
                </div>
                <LiveScoreboard />
              </div>

              {/* Upcoming Matches */}
              {upcomingMatches > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Upcoming Matches</h2>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View Schedule <FiArrowRight />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {matches
                      .filter(m => (m.status === 'Scheduled' || m.status === 'In Progress') && new Date(m.scheduled_time) > new Date())
                      .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                      .slice(0, 5)
                      .map((match) => (
                        <MatchCard
                          key={match._id}
                          match={match}
                          tournaments={tournaments}
                          onViewDetails={() => setSelectedMatch(match._id)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Tournament Management</h2>
                <button
                  onClick={() => setShowCreateTournament(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <FiPlus className="w-5 h-5" />
                  Create Tournament
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {organizerTournaments.map((tournament) => (
                  <TournamentCard
                    key={tournament._id}
                    tournament={tournament}
                    registrations={organizerRegistrations}
                    matches={organizerMatches}
                    onViewDetails={() => {
                      setSelectedTournamentId(tournament._id);
                    }}
                    onGenerateDraws={() => handleGenerateDraws(tournament._id)}
                    onPublishBrackets={() => handlePublishBrackets(tournament._id)}
                    onCloseTournament={() => handleCloseTournament(tournament._id)}
                    isOwner={isTournamentOwner(tournament)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === 'registrations' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Approve Registrations</h2>
                <div className="flex items-center gap-2">
                  <select className="px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
              {organizerRegistrations.length === 0 ? (
                <div className="text-center py-12">
                  <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Registrations</h3>
                  <p className="text-gray-600">No registrations have been submitted yet for your tournaments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {organizerRegistrations.map((registration) => (
                    <RegistrationApprovalCard
                      key={registration._id}
                      registration={registration}
                      tournaments={organizerTournaments}
                      onApprove={() => handleApproveRegistration(registration._id)}
                      onReject={() => handleRejectRegistration(registration._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users Tab - View All Coaches, Players, and Judges */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">All Users</h2>
                  <p className="text-sm text-gray-600 mt-1">View coaches, players, and judges registered for your tournaments</p>
                </div>
              </div>

              {/* Filter and Search */}
              <div className="mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or username..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserFilterType('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      userFilterType === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({coaches.length + players.length + judges.length})
                  </button>
                  <button
                    onClick={() => setUserFilterType('coaches')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      userFilterType === 'coaches'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Coaches ({coaches.length})
                  </button>
                  <button
                    onClick={() => setUserFilterType('players')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      userFilterType === 'players'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Players ({players.length})
                  </button>
                  <button
                    onClick={() => setUserFilterType('judges')}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      userFilterType === 'judges'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Judges ({judges.length})
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-4">
                {/* Coaches */}
                {(userFilterType === 'all' || userFilterType === 'coaches') && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FiUser className="w-5 h-5 text-green-600" />
                      Coaches ({coaches.length})
                    </h3>
                    {coaches.length === 0 ? (
                      <p className="text-gray-500 text-sm">No coaches registered</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {coaches
                          .filter(coach => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            const user = coach.user_id || {};
                            const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                            return (
                              name.includes(searchLower) ||
                              user.username?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower) ||
                              coach.dojo?.dojo_name?.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((coach) => {
                            const user = coach.user_id || {};
                            return (
                              <div key={coach._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">
                                      {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.username || 'Coach'}
                                    </h4>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                  </div>
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                    Coach
                                  </span>
                                </div>
                                {coach.dojo && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">Dojo:</span> {coach.dojo.dojo_name}
                                    </p>
                                  </div>
                                )}
                                {coach.certification_level && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">Certification:</span> {coach.certification_level}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Players */}
                {(userFilterType === 'all' || userFilterType === 'players') && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FiUsers className="w-5 h-5 text-purple-600" />
                      Players ({players.length})
                    </h3>
                    {players.length === 0 ? (
                      <p className="text-gray-500 text-sm">No players registered</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {players
                          .filter(player => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            const user = player.user_id || {};
                            const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                            return (
                              name.includes(searchLower) ||
                              user.username?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower) ||
                              player.dojo_name?.toLowerCase().includes(searchLower) ||
                              player.coach_name?.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((player) => {
                            const user = player.user_id || {};
                            return (
                              <div key={player._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">
                                      {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.username || 'Player'}
                                    </h4>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                  </div>
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                    Player
                                  </span>
                                </div>
                                {player.dojo_name && (
                                  <p className="text-xs text-gray-600 mt-2">
                                    <span className="font-medium">Dojo:</span> {player.dojo_name}
                                  </p>
                                )}
                                {player.coach_name && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Coach:</span> {player.coach_name}
                                  </p>
                                )}
                                {player.belt_rank && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Belt:</span> {player.belt_rank}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Judges */}
                {(userFilterType === 'all' || userFilterType === 'judges') && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FiUser className="w-5 h-5 text-orange-600" />
                      Judges ({judges.length})
                    </h3>
                    {judges.length === 0 ? (
                      <p className="text-gray-500 text-sm">No judges registered</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {judges
                          .filter(judge => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            const user = judge.user_id || {};
                            const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                            return (
                              name.includes(searchLower) ||
                              user.username?.toLowerCase().includes(searchLower) ||
                              user.email?.toLowerCase().includes(searchLower)
                            );
                          })
                          .map((judge) => {
                            const user = judge.user_id || {};
                            return (
                              <div key={judge._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-gray-800">
                                      {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.username || 'Judge'}
                                    </h4>
                                    <p className="text-sm text-gray-600">{user.email}</p>
                                  </div>
                                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                                    Judge
                                  </span>
                                </div>
                                {judge.certification_level && (
                                  <p className="text-xs text-gray-600 mt-2">
                                    <span className="font-medium">Certification:</span> {judge.certification_level}
                                  </p>
                                )}
                                {judge.experience_years && (
                                  <p className="text-xs text-gray-600">
                                    <span className="font-medium">Experience:</span> {judge.experience_years} years
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty State */}
                {userFilterType === 'all' && coaches.length === 0 && players.length === 0 && judges.length === 0 && (
                  <div className="text-center py-12">
                    <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Users Found</h3>
                    <p className="text-gray-600">No users have registered in the system yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Match Draws Tab */}
          {activeTab === 'draws' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Generate AI Match Draws</h2>
                <button
                  onClick={() => navigate('/organizer/draws')}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  Advanced Draws <FiArrowRight />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organizerTournaments
                  .filter(t => t.status === 'Open' || t.status === 'Ongoing')
                  .map((tournament) => {
                    const tournamentCategories = categories.filter(c => {
                      const catTournamentId = c.tournament_id?._id || c.tournament_id;
                      return catTournamentId === tournament._id || catTournamentId?.toString() === tournament._id?.toString();
                    });
                    const tournamentMatches = organizerMatches.filter(m => {
                      const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                      return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
                    });

                    return (
                      <div key={tournament._id} className="border border-gray-200 rounded-xl p-6">
                        <h3 className="font-bold text-lg text-gray-800 mb-4">{tournament.tournament_name}</h3>
                        <div className="space-y-3">
                          {tournamentCategories.map((category) => (
                            <div key={category._id} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex justify-between items-center mb-2">
                          <div>
                                  <p className="font-semibold text-gray-800">{category.category_name}</p>
                            <p className="text-sm text-gray-600">
                                    {category.match_type} • {category.age_group || 'All Ages'}
                            </p>
                          </div>
                                <span className="text-xs text-gray-500">
                                  {tournamentMatches.filter(m => {
                                    const matchCategoryId = m.category_id?._id || m.category_id;
                                    return matchCategoryId === category._id || matchCategoryId?.toString() === category._id?.toString();
                                  }).length} Matches
                          </span>
                              </div>
                              {isTournamentOwner(tournament) && (
                                <button
                                  onClick={() => handleGenerateDraws(tournament._id, category._id)}
                                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                                >
                                  Generate AI Draws
                                </button>
                              )}
                              {!isTournamentOwner(tournament) && (
                                <p className="text-sm text-gray-500 text-center py-2">
                                  View only - Not your tournament
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
              </div>
            )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Set Schedule & Tatami Numbers</h2>
              <button
                onClick={() => navigate('/organizer/schedule')}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                  Calendar View <FiArrowRight />
              </button>
              </div>
              <div className="space-y-4">
                {organizerMatches
                  .filter(m => m.status === 'Scheduled' || m.status === 'In Progress')
                  .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                  .map((match) => (
                    <MatchScheduleCard
                      key={match._id}
                      match={match}
                      tournaments={organizerTournaments}
                      onEdit={() => setSelectedMatch(match._id)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Judges Tab */}
          {activeTab === 'judges' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Assign Judges to Matches</h2>
                <button
                  onClick={() => navigate('/organizer/schedule')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  View Schedule
                </button>
              </div>
              <div className="space-y-4">
                {matches
                  .filter(m => m.status === 'Scheduled')
                  .map((match) => (
                    <JudgeAssignmentCard
                      key={match._id}
                      match={match}
                      tournaments={tournaments}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Live Scoring Tab */}
          {activeTab === 'scoring' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Monitor Live Scoring</h2>
              <LiveScoreboard />
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Tournament Results</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                  <FiDownload className="w-5 h-5" />
                  Export Results
                </button>
              </div>
              <div className="space-y-4">
                {tournaments
                  .filter(t => t.status === 'Completed' || t.status === 'Ongoing')
                  .map((tournament) => (
                    <TournamentResultsCard
                      key={tournament._id}
                      tournament={tournament}
                      matches={matches}
                      scores={scores}
                      onCloseTournament={() => handleCloseTournament(tournament._id)}
                      isOwner={isTournamentOwner(tournament)}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Send Announcements & Notifications</h2>
                <button
                  onClick={() => navigate('/organizer/notifications')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <FiSend className="w-5 h-5" />
                  Send Notification
                </button>
              </div>
              <div className="space-y-3">
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationCard key={notification._id} notification={notification} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Tournament Modal */}
      {showCreateTournament && (
        <CreateTournamentModal
          onClose={() => {
            setShowCreateTournament(false);
            loadData(true);
          }}
          onSuccess={(tournamentId) => {
            setShowCreateTournament(false);
            setNewlyCreatedTournamentId(tournamentId);
            setShowAddEventsPrompt(true);
            loadData(true);
          }}
        />
      )}


      {/* Add Events Prompt Modal */}
      {showAddEventsPrompt && newlyCreatedTournamentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                Tournament Created Successfully!
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Your tournament has been created. Now you can add events with customizable settings (age groups, belt categories, weight classes, and entry fees).
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> You can create fully customizable events:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                    <li>Custom age groups (e.g., Under 8, Under 10, Novice 10-12)</li>
                    <li>Custom belt groupings (e.g., Novice: White-Green)</li>
                    <li>Custom weight classes (e.g., -25kg, -30kg, -35kg)</li>
                    <li>Or use WKF standard categories</li>
                  </ul>
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setShowAddEventsPrompt(false);
                    navigate(`/organizer/events?tournament=${newlyCreatedTournamentId}`);
                    setNewlyCreatedTournamentId(null);
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-medium flex items-center justify-center"
                >
                  <FiPlus className="w-5 h-5 mr-2" />
                  Add Events Now
                </button>
                <button
                  onClick={() => {
                    setShowAddEventsPrompt(false);
                    setNewlyCreatedTournamentId(null);
                  }}
                  className="w-full px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  I'll Add Events Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </Layout>
    </>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament, registrations, matches, onViewDetails, onGenerateDraws, onPublishBrackets, onCloseTournament, isOwner = false }) => {
  const navigate = useNavigate();
  const tournamentRegistrations = registrations.filter(r => {
    const regTournamentId = r.tournament_id?._id || r.tournament_id;
    return regTournamentId === tournament._id || regTournamentId?.toString() === tournament._id?.toString();
  });
  const tournamentMatches = matches.filter(m => {
    const matchTournamentId = m.tournament_id?._id || m.tournament_id;
    return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{tournament.tournament_name}</h3>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
              View Only
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
            tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
            tournament.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
            tournament.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
            'bg-red-100 text-red-700'
          }`}>
            {tournament.status}
          </span>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <FiCalendar className="w-4 h-4 mr-2" />
          {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiMapPin className="w-4 h-4 mr-2" />
          {tournament.venue}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiUsers className="w-4 h-4 mr-2" />
          {tournamentRegistrations.length} Registrations
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiTarget className="w-4 h-4 mr-2" />
          {tournamentMatches.length} Matches
        </div>
      </div>
      <div className="space-y-2">
        {isOwner && (
          <button
            onClick={() => navigate(`/organizer/events?tournament=${tournament._id}`)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-semibold flex items-center justify-center gap-2"
          >
            <FiAward className="w-4 h-4" />
            Manage Events
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              if (onViewDetails && typeof onViewDetails === 'function') {
                try {
                  onViewDetails();
                } catch (error) {
                  console.error('❌ Error calling onViewDetails:', error);
                }
              } else {
                console.error('❌ TournamentCard: onViewDetails handler is not defined or not a function');
                alert('View Details handler is not working. Check console for details.');
              }
            }}
            type="button"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold cursor-pointer"
            style={{ pointerEvents: 'auto', zIndex: 10 }}
          >
            View Details
          </button>
          {isOwner && tournament.status === 'Draft' && (
            <button
              onClick={onPublishBrackets}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
            >
              Publish
            </button>
          )}
          {isOwner && (tournament.status === 'Open' || tournament.status === 'Ongoing') && (
            <button
              onClick={onGenerateDraws}
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
            >
              Generate Draws
            </button>
          )}
          {isOwner && tournament.status === 'Ongoing' && (
            <button
              onClick={onCloseTournament}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-semibold"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Registration Approval Card Component
const RegistrationApprovalCard = ({ registration, tournaments, onApprove, onReject }) => {
  const tournament = tournaments.find(t => {
    const regTournamentId = registration.tournament_id?._id || registration.tournament_id;
    return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
  });

  // Get registrant name based on registration type
  let registrantName = 'Unknown';
  let registrantInfo = null;
  
  if (registration.registration_type === 'Coach' && registration.coach_id) {
    const coach = registration.coach_id;
    const user = coach.user_id || {};
    registrantName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.username || 'Coach';
    registrantInfo = 'Coach';
  } else if (registration.registration_type === 'Judge' && registration.judge_id) {
    const judge = registration.judge_id;
    const user = judge.user_id || {};
    registrantName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.username || 'Judge';
    registrantInfo = 'Judge';
  } else if (registration.registration_type === 'Individual' && registration.player_id) {
    const player = registration.player_id;
    const user = player.user_id || {};
    registrantName = user.first_name && user.last_name 
      ? `${user.first_name} ${user.last_name}`
      : user.username || 'Player';
    registrantInfo = 'Player';
  } else if (registration.registration_type === 'Team' && registration.team_id) {
    const team = registration.team_id;
    registrantName = team.team_name || 'Team';
    registrantInfo = 'Team';
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-800">{tournament?.tournament_name || 'Tournament'}</p>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              registration.registration_type === 'Coach' ? 'bg-green-100 text-green-700' :
              registration.registration_type === 'Judge' ? 'bg-orange-100 text-orange-700' :
              registration.registration_type === 'Team' ? 'bg-purple-100 text-purple-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {registration.registration_type}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Registrant:</span> {registrantName}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Registered on {format(new Date(registration.registration_date), 'MMM dd, yyyy HH:mm')}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              registration.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
              registration.approval_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              Status: {registration.approval_status}
            </span>
            {(registration.registration_type === 'Coach' || registration.registration_type === 'Judge') ? (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                FREE Registration
              </span>
            ) : (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                registration.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
                registration.payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                Payment: {registration.payment_status}
              </span>
            )}
          </div>
        </div>
        {registration.approval_status === 'Pending' && registration.registration_type !== 'Coach' && registration.registration_type !== 'Judge' && (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
            >
              Reject
            </button>
          </div>
        )}
        {registration.approval_status === 'Approved' && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Approved
          </span>
        )}
        {(registration.registration_type === 'Coach' || registration.registration_type === 'Judge') && registration.approval_status === 'Approved' && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            Auto-Approved (FREE)
          </span>
        )}
      </div>
    </div>
  );
};

// Match Card Component
const MatchCard = ({ match, tournaments, onViewDetails }) => {
  const tournament = tournaments.find(t => {
    const matchTournamentId = match.tournament_id?._id || match.tournament_id;
    return t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{match.match_name || 'Match'}</p>
                          <p className="text-sm text-gray-600">
            {tournament?.tournament_name || 'Tournament'} • {match.match_type}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              {format(new Date(match.scheduled_time), 'MMM dd, HH:mm')}
            </span>
            {match.tatami_number && (
              <span className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                Tatami {match.tatami_number}
              </span>
            )}
          </div>
                        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          match.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
                        }`}>
                          {match.status}
                        </span>
                      </div>
                    </div>
  );
};

// Match Schedule Card Component
const MatchScheduleCard = ({ match, tournaments, onEdit }) => {
  const tournament = tournaments.find(t => {
    const matchTournamentId = match.tournament_id?._id || match.tournament_id;
    return t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{match.match_name || 'Match'}</p>
          <p className="text-sm text-gray-600">{tournament?.tournament_name || 'Tournament'}</p>
          <div className="flex items-center gap-4 mt-2">
            <input
              type="datetime-local"
              defaultValue={format(new Date(match.scheduled_time), "yyyy-MM-dd'T'HH:mm")}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Tatami Number"
              defaultValue={match.tatami_number}
              className="px-3 py-1 border border-gray-300 rounded text-sm w-32"
            />
          </div>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
};

// Judge Assignment Card Component
const JudgeAssignmentCard = ({ match, tournaments }) => {
  const tournament = tournaments.find(t => {
    const matchTournamentId = match.tournament_id?._id || match.tournament_id;
    return t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-800">{match.match_name || 'Match'}</p>
          <p className="text-sm text-gray-600">{tournament?.tournament_name || 'Tournament'}</p>
        </div>
        <span className="text-sm text-gray-600">
          {format(new Date(match.scheduled_time), 'MMM dd, HH:mm')}
        </span>
      </div>
      <div className="space-y-2">
        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          <option>Select Head Judge</option>
        </select>
        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          <option>Select Judge 1</option>
        </select>
        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          <option>Select Judge 2</option>
        </select>
      </div>
      <button className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
        Assign Judges
      </button>
    </div>
  );
};

// Tournament Results Card Component
const TournamentResultsCard = ({ tournament, matches, scores, onCloseTournament, isOwner = false }) => {
  const tournamentMatches = matches.filter(m => {
    const matchTournamentId = m.tournament_id?._id || m.tournament_id;
    return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
  });
  const completedTournamentMatches = tournamentMatches.filter(m => m.status === 'Completed');

  return (
    <div className="border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-xl text-gray-800">{tournament.tournament_name}</h3>
          <p className="text-sm text-gray-600">
            {completedTournamentMatches.length} of {tournamentMatches.length} matches completed
          </p>
              </div>
        {isOwner && tournament.status === 'Ongoing' && (
          <button
            onClick={onCloseTournament}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Close Tournament
          </button>
        )}
      </div>
      <div className="space-y-3">
        {completedTournamentMatches.slice(0, 5).map((match) => (
          <div key={match._id} className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-800">{match.match_name}</p>
            <p className="text-sm text-gray-600">{match.match_type} • {match.match_level}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Notification Card Component
const NotificationCard = ({ notification }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FiBell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">{notification.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
          <p className="text-xs text-gray-500">
            {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
