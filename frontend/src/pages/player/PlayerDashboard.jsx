import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { notificationService } from '../../services/notificationService';
import { playerService } from '../../services/playerService';
import { categoryService } from '../../services/categoryService';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import LiveScoreboard from '../../components/LiveScoreboard';
import TournamentDetailModal from '../../components/TournamentDetailModal';
import ChatbotPopup from '../../components/ChatbotPopup';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import {
  FiCalendar,
  FiClock,
  FiMapPin,
  FiUsers,
  FiAward,
  FiBell,
  FiArrowRight,
  FiEye,
  FiTarget,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiTrendingUp
} from 'react-icons/fi';

const PlayerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scores, setScores] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [playerMatches, setPlayerMatches] = useState([]);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [performanceData, setPerformanceData] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    averageScore: 0,
    recentMatches: []
  });

  // UI states
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [activeTab, setActiveTab] = useState('matches');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Auto-refresh match draws when on match draws tab
  useEffect(() => {
    if (activeTab === 'matches' && user) {
      // Refresh data every 30 seconds when on match draws tab
      const interval = setInterval(() => {
        if (user?._id) {
          loadData();
        }
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const loadData = async () => {
    if (!user?._id) return;

    try {
      setLoading(true);

      // Get player profile to find coach
      let playerProfileData = null;
      try {
        const playersRes = await playerService.getPlayers();
        const allPlayers = playersRes.data || [];
        playerProfileData = allPlayers.find(p => {
          const playerUserId = p.user_id?._id || p.user_id;
          return String(playerUserId) === String(user._id);
        });
        setPlayerProfile(playerProfileData);
      } catch (error) {
        console.error('Error loading player profile:', error);
      }

      const [tournamentsRes, registrationsRes, matchesRes, categoriesRes, scoresRes, notificationsRes] = await Promise.all([
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
        matchService.getMatches(),
        categoryService.getCategories(),
        scoreService.getScores(),
        notificationService.getNotifications({ user_id: user._id, unread_only: true })
      ]);

      const allTournaments = tournamentsRes.data || [];
      const allRegistrations = registrationsRes.data || [];

      // Show all tournaments created by organizers (not filtered by coach registration)
      // Players can see all tournaments, but can only register for events in tournaments where their coach is registered
      setTournaments(allTournaments);

      setRegistrations(allRegistrations);
      setMatches(matchesRes.data || []);
      setCategories(categoriesRes.data || []);
      setScores(scoresRes.data || []);
      setNotifications(notificationsRes.data || []);

      // Process player matches
      const processedMatches = processPlayerMatches(matchesRes.data || [], scoresRes.data || []);
      setPlayerMatches(processedMatches);

      // Calculate performance data
      const perfData = calculatePerformanceData(processedMatches.filter(m => m.isCompleted), scoresRes.data || []);
      setPerformanceData(perfData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (error.response?.status !== 401) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const processPlayerMatches = (allMatches, allScores) => {
    return allMatches
      .map(match => {
        // Find if player is a participant
        const participants = match.participants || [];
        const playerParticipant = participants.find(p => {
          const playerUserId = p.player_id?.user_id?._id || p.player_id?.user_id;
          return playerUserId === user?._id || playerUserId?.toString() === user?._id?.toString();
        });

        if (!playerParticipant) return null;

        // Get opponent
        const opponent = participants.find(p => {
          const playerUserId = p.player_id?.user_id?._id || p.player_id?.user_id;
          return playerUserId !== user?._id && playerUserId?.toString() !== user?._id?.toString();
        });

        // Get match scores
        const matchScores = allScores.filter(
          s => s.match_id?._id === match._id || s.match_id === match._id
        );

        return {
          ...match,
          playerParticipant,
          opponent,
          matchScores,
          isUpcoming: new Date(match.scheduled_time) > new Date() && match.status !== 'Completed',
          isCompleted: match.status === 'Completed'
        };
      })
      .filter(Boolean);
  };

  const calculatePerformanceData = (completedMatches, allScores) => {
    let wins = 0, losses = 0, draws = 0;
    const scores = [];
    const recentMatchesData = [];

    completedMatches.forEach(match => {
      // Determine result
      const isWinner = match.winner_id && (
        match.winner_id._id?.toString() === (match.playerParticipant.player_id?._id?.toString() || match.playerParticipant.player_id) ||
        match.winner_id?.toString() === (match.playerParticipant.player_id?._id?.toString() || match.playerParticipant.player_id)
      );

      if (isWinner) {
        wins++;
      } else if (match.winner_id) {
        losses++;
      } else {
        draws++;
      }

      // Get player's scores for this match
      const playerScores = match.matchScores?.filter(s => {
        const participantId = s.participant_id?._id || s.participant_id;
        return participantId?.toString() === (match.playerParticipant._id?.toString() || match.playerParticipant._id);
      }) || [];

      if (playerScores.length > 0) {
        const avgScore = playerScores.reduce((sum, s) => sum + (s.final_score || 0), 0) / playerScores.length;
        scores.push(avgScore);

        recentMatchesData.push({
          matchName: match.match_name || 'Match',
          date: match.scheduled_time,
          score: avgScore.toFixed(1),
          result: isWinner ? 'Win' : (match.winner_id ? 'Loss' : 'Draw')
        });
      }
    });

    // Calculate average score
    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

    // Sort recent matches by date (newest first) and take last 5
    recentMatchesData.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      totalMatches: completedMatches.length,
      wins,
      losses,
      draws,
      averageScore: averageScore.toFixed(1),
      recentMatches: recentMatchesData.slice(0, 5)
    };
  };

  // Filter data
  const approvedRegistrations = registrations.filter(r => r.approval_status === 'Approved');
  const pendingRegistrations = registrations.filter(r => r.approval_status === 'Pending');
  const upcomingMatches = playerMatches.filter(m => m.isUpcoming);
  const completedMatches = playerMatches.filter(m => m.isCompleted);
  const todayMatches = upcomingMatches.filter(m => {
    const matchDate = new Date(m.scheduled_time);
    const today = new Date();
    return matchDate.toDateString() === today.toDateString();
  });

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
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Player Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.first_name || user?.username}! Track your tournaments, matches, and results
                </p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => navigate('/player/notifications')}
                  className="relative px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <FiBell className="w-5 h-5" />
                  Notifications
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'events', label: 'My Events', icon: FiAward },
                { id: 'matches', label: 'Match Draws', icon: FiTarget },
                { id: 'results', label: 'My Results', icon: FiTarget },
                { id: 'performance', label: 'Performance', icon: FiTrendingUp },
                { id: 'notifications', label: 'Notifications', icon: FiBell }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 font-medium transition whitespace-nowrap ${activeTab === tab.id
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

          {/* My Events Tab - Show Registered Events */}
          {activeTab === 'events' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">My Events</h2>
                  <p className="text-gray-600">
                    All tournaments and events. You can register for events in tournaments where your coach is registered.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/player/tournaments')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                >
                  <FiAward className="w-5 h-5" />
                  View All Tournaments
                </button>
              </div>

              {tournaments.length === 0 ? (
                <div className="text-center py-12">
                  <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tournaments Available</h3>
                  <p className="text-gray-600 mb-4">
                    No tournaments have been created yet. Check back later for upcoming tournaments.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {tournaments.map((tournament) => {
                    const tournamentRegistrations = registrations.filter(r => {
                      const regTournamentId = r.tournament_id?._id || r.tournament_id;
                      const regPlayerId = r.player_id?._id || r.player_id;
                      const playerId = playerProfile?._id;
                      return (regTournamentId === tournament._id || regTournamentId?.toString() === tournament._id?.toString()) &&
                        (regPlayerId === playerId || regPlayerId?.toString() === playerId?.toString()) &&
                        r.registration_type === 'Individual';
                    });

                    return (
                      <div key={tournament._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg text-gray-800">{tournament.tournament_name}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
                                tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                              }`}>
                              {tournament.status}
                            </span>
                            <button
                              onClick={() => setSelectedTournamentId(tournament._id)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2"
                            >
                              <FiEye className="w-4 h-4" />
                              View Events
                            </button>
                          </div>
                        </div>
                        {tournamentRegistrations.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Your Registered Events ({tournamentRegistrations.length})</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {tournamentRegistrations.map((registration) => {
                                const category = registration.category_id || {};
                                const isIndividual = registration.registration_type === 'Individual';

                                return (
                                  <div
                                    key={registration._id}
                                    className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition"
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex-1">
                                        <h5 className="font-semibold text-gray-800 mb-1">{category.category_name || 'Event'}</h5>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className={`px-2 py-1 rounded text-xs font-semibold ${category.category_type === 'Kata' || category.category_type === 'Team Kata'
                                              ? 'bg-blue-100 text-blue-700'
                                              : 'bg-red-100 text-red-700'
                                            }`}>
                                            {category.category_type || 'Event'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1 mb-3">
                                      {category.age_category && <p><span className="font-medium">Age:</span> {category.age_category}</p>}
                                      {category.belt_category && <p><span className="font-medium">Belt:</span> {category.belt_category}</p>}
                                      {category.weight_category && <p><span className="font-medium">Weight:</span> {category.weight_category}</p>}
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${registration.approval_status === 'Approved'
                                          ? 'bg-green-100 text-green-700'
                                          : registration.approval_status === 'Pending'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {registration.approval_status}
                                      </span>
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${registration.payment_status === 'Paid'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {registration.payment_status === 'Paid' ? 'Paid' : 'Payment Pending'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {tournaments.length > 0 && registrations.filter(r => {
                const regPlayerId = r.player_id?._id || r.player_id;
                const playerId = playerProfile?._id;
                return (regPlayerId === playerId || regPlayerId?.toString() === playerId?.toString()) &&
                  r.registration_type === 'Individual';
              }).length === 0 && (
                  <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-gray-700 mb-4">
                      You haven't registered for any events yet. Click "View Events" on any tournament above to see available events and register.
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">My Performance</h2>

              {/* Performance Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{performanceData.totalMatches}</p>
                    </div>
                    <FiTarget className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Wins</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{performanceData.wins}</p>
                    </div>
                    <FiAward className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Losses</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{performanceData.losses}</p>
                    </div>
                    <FiTarget className="w-8 h-8 text-red-600" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Average Score</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{performanceData.averageScore}</p>
                    </div>
                    <FiTrendingUp className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Recent Matches */}
              {performanceData.recentMatches.length > 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Recent Matches</h3>
                  <div className="space-y-4">
                    {performanceData.recentMatches.map((match, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{match.matchName}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {format(new Date(match.date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Score</p>
                            <p className="text-lg font-bold text-gray-800">{match.score}</p>
                          </div>
                          <div>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${match.result === 'Win'
                                  ? 'bg-green-100 text-green-700'
                                  : match.result === 'Loss'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                            >
                              {match.result}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <FiTrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Performance Data Yet</h3>
                  <p className="text-gray-600">Complete matches to see your performance statistics here</p>
                </div>
              )}
            </div>
          )}

          {/* Match Draws Tab */}
          {activeTab === 'matches' && (() => {
            // Get player's registered events (categories)
            const playerRegisteredEvents = registrations
              .filter(r => {
                const regPlayerId = r.player_id?._id || r.player_id;
                const playerId = playerProfile?._id;
                return (regPlayerId === playerId || regPlayerId?.toString() === playerId?.toString()) &&
                  r.registration_type === 'Individual' &&
                  r.approval_status === 'Approved' &&
                  r.payment_status === 'Paid';
              })
              .map(r => r.category_id?._id || r.category_id)
              .filter(Boolean);

            // Get categories for registered events
            const registeredCategories = categories.filter(c =>
              playerRegisteredEvents.some(eventId =>
                c._id?.toString() === eventId?.toString() || c._id === eventId
              )
            );

            // Group matches by category
            const matchesByCategory = {};
            registeredCategories.forEach(category => {
              const categoryMatches = matches.filter(m => {
                const matchCategoryId = m.category_id?._id || m.category_id;
                return matchCategoryId?.toString() === category._id?.toString() || matchCategoryId === category._id;
              });
              if (categoryMatches.length > 0) {
                matchesByCategory[category._id] = {
                  category,
                  matches: categoryMatches
                };
              }
            });

            const hasMatchDraws = Object.keys(matchesByCategory).length > 0;

            return (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Match Draws</h2>
                    <p className="text-gray-600">
                      View match draws for events you are registered for
                    </p>
                  </div>
                  <button
                    onClick={() => loadData()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <FiTarget className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {registeredCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Registered Events</h3>
                    <p className="text-gray-600 mb-4">You need to register and get approved for events to see match draws</p>
                    <button
                      onClick={() => setActiveTab('events')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      View My Events
                    </button>
                  </div>
                ) : !hasMatchDraws ? (
                  <div className="text-center py-12">
                    <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Match Draws Yet</h3>
                    <p className="text-gray-600">Match draws will appear here once the organizer creates them for your registered events</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.values(matchesByCategory).map(({ category, matches: categoryMatches }) => {
                      const isKata = category.category_type === 'Kata' || category.category_type === 'Team Kata';
                      const isKumite = category.category_type === 'Kumite' || category.category_type === 'Team Kumite';

                      return (
                        <div key={category._id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xl font-bold text-gray-800">{category.category_name}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isKata ? 'bg-blue-100 text-blue-700' :
                                  isKumite ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {category.category_type}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {category.participation_type} • {categoryMatches.length} match{categoryMatches.length !== 1 ? 'es' : ''}
                            </p>
                          </div>

                          <MatchDrawsBracket
                            matches={categoryMatches}
                            category={category}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Match History & Results</h2>
              {completedMatches.length === 0 ? (
                <div className="text-center py-12">
                  <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Completed Matches</h3>
                  <p className="text-gray-600">Your match results will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {completedMatches.map((match) => (
                    <DetailedResultCard key={match._id} match={match} user={user} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h2>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <FiBell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Notifications</h3>
                  <p className="text-gray-600">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <NotificationCard key={notification._id} notification={notification} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tournament Detail Modal */}
      {selectedTournamentId && (
        <TournamentDetailModal
          tournamentId={selectedTournamentId}
          onClose={() => setSelectedTournamentId(null)}
        />
      )}

      {/* Chatbot Popup */}
      <ChatbotPopup />
    </Layout>
  );
};

// Match Card Component
const MatchCard = ({ match, user, onViewDetails }) => {
  const opponent = match.opponent;
  const opponentName = opponent?.player_id?.user_id?.first_name
    ? `${opponent.player_id.user_id.first_name} ${opponent.player_id.user_id.last_name || ''}`
    : 'TBD';

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition bg-gradient-to-br from-white to-blue-50">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{match.match_name || 'Match'}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${match.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
            match.status === 'In Progress' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
          }`}>
          {match.status}
        </span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <FiClock className="w-4 h-4 mr-2" />
          {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}
        </div>
        {match.tatami_number && (
          <div className="flex items-center text-sm text-gray-600">
            <FiMapPin className="w-4 h-4 mr-2" />
            Tatami {match.tatami_number}
          </div>
        )}
        <div className="flex items-center text-sm text-gray-600">
          <FiUsers className="w-4 h-4 mr-2" />
          vs {opponentName}
        </div>
      </div>
      <button
        onClick={onViewDetails || (() => { })}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
      >
        View Details
      </button>
    </div>
  );
};

// Detailed Match Card Component
const DetailedMatchCard = ({ match, user }) => {
  const opponent = match.opponent;
  const opponentName = opponent?.player_id?.user_id?.first_name
    ? `${opponent.player_id.user_id.first_name} ${opponent.player_id.user_id.last_name || ''}`
    : 'TBD';

  return (
    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-800 mb-2">{match.match_name || 'Match'}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FiCalendar className="w-4 h-4" />
              {format(new Date(match.scheduled_time), 'MMM dd, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              {format(new Date(match.scheduled_time), 'HH:mm')}
            </span>
            {match.tatami_number && (
              <span className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                Tatami {match.tatami_number}
              </span>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${match.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' :
            match.status === 'In Progress' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
          }`}>
          {match.status}
        </span>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">You</p>
            <p className="font-semibold text-gray-800">
              {user?.first_name} {user?.last_name}
            </p>
          </div>
          <div className="text-2xl font-bold text-gray-400">VS</div>
          <div className="text-right">
            <p className="text-sm text-gray-600 mb-1">Opponent</p>
            <p className="font-semibold text-gray-800">{opponentName}</p>
          </div>
        </div>
      </div>
      {match.tournament_id && (
        <div className="text-sm text-gray-600 mb-2">
          Tournament: {match.tournament_id.tournament_name || 'Tournament'}
        </div>
      )}
    </div>
  );
};

// Result Card Component
const ResultCard = ({ match, user }) => {
  const opponent = match.opponent;
  const opponentName = opponent?.player_id?.user_id?.first_name
    ? `${opponent.player_id.user_id.first_name} ${opponent.player_id.user_id.last_name || ''}`
    : 'TBD';

  const playerScore = match.matchScores?.find(s => {
    const participantId = s.participant_id?._id || s.participant_id;
    return participantId?.toString() === (match.playerParticipant._id?.toString() || match.playerParticipant._id);
  });

  const opponentScore = match.matchScores?.find(s => {
    const participantId = s.participant_id?._id || s.participant_id;
    return participantId?.toString() !== (match.playerParticipant._id?.toString() || match.playerParticipant._id);
  });

  const isWinner = match.winner_id && (
    match.winner_id._id?.toString() === (match.playerParticipant.player_id?._id?.toString() || match.playerParticipant.player_id) ||
    match.winner_id?.toString() === (match.playerParticipant.player_id?._id?.toString() || match.playerParticipant.player_id)
  );

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition bg-gradient-to-br from-white to-yellow-50">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{match.match_name || 'Match'}</h3>
        {isWinner ? (
          <FiCheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <FiXCircle className="w-6 h-6 text-red-600" />
        )}
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between bg-gray-50 rounded p-2">
          <span className="text-sm font-medium">You</span>
          <span className="font-bold">{playerScore?.final_score || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded p-2">
          <span className="text-sm font-medium">{opponentName}</span>
          <span className="font-bold">{opponentScore?.final_score || 'N/A'}</span>
        </div>
      </div>
      <div className={`text-center py-2 rounded-lg font-semibold ${isWinner ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
        {isWinner ? 'Winner' : 'Lost'}
      </div>
    </div>
  );
};

// Detailed Result Card Component
const DetailedResultCard = ({ match, user }) => {
  const opponent = match.opponent;
  const opponentName = opponent?.player_id?.user_id?.first_name
    ? `${opponent.player_id.user_id.first_name} ${opponent.player_id.user_id.last_name || ''}`
    : 'TBD';

  const playerScore = match.matchScores?.find(s => {
    const participantId = s.participant_id?._id || s.participant_id;
    return participantId?.toString() === (match.playerParticipant._id?.toString() || match.playerParticipant._id);
  });

  const opponentScore = match.matchScores?.find(s => {
    const participantId = s.participant_id?._id || s.participant_id;
    return participantId?.toString() !== (match.playerParticipant._id?.toString() || match.playerParticipant._id);
  });

  const isWinner = match.winner_id && (
    match.winner_id._id?.toString() === (match.playerParticipant.player_id?._id?.toString() || match.playerParticipant.player_id) ||
    match.winner_id?.toString() === (match.playerParticipant.player_id?._id?.toString() || match.playerParticipant.player_id)
  );

  return (
    <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-800 mb-2">{match.match_name || 'Match'}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{format(new Date(match.scheduled_time), 'MMM dd, yyyy')}</span>
            {match.tatami_number && <span>Tatami {match.tatami_number}</span>}
          </div>
        </div>
        {isWinner ? (
          <div className="flex items-center gap-2 text-green-600">
            <FiAward className="w-6 h-6" />
            <span className="font-semibold">Winner</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <FiXCircle className="w-6 h-6" />
            <span className="font-semibold">Lost</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">You</p>
          <p className="font-bold text-xl text-blue-600">{playerScore?.final_score || 'N/A'}</p>
          {playerScore && (
            <div className="text-xs text-gray-600 mt-2">
              Technical: {playerScore.technical_score || 'N/A'} |
              Performance: {playerScore.performance_score || 'N/A'}
            </div>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">{opponentName}</p>
          <p className="font-bold text-xl text-gray-600">{opponentScore?.final_score || 'N/A'}</p>
          {opponentScore && (
            <div className="text-xs text-gray-600 mt-2">
              Technical: {opponentScore.technical_score || 'N/A'} |
              Performance: {opponentScore.performance_score || 'N/A'}
            </div>
          )}
        </div>
      </div>
      {playerScore?.comments && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 italic">
          "{playerScore.comments}"
        </div>
      )}
    </div>
  );
};

// Registration Card Component
const RegistrationCard = ({ registration, onViewDetails }) => {
  const tournament = registration.tournament_id;
  const tournamentName = tournament?.tournament_name || 'Tournament';

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition cursor-pointer"
      onClick={onViewDetails || (() => { })}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{tournamentName}</h3>
        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
          {registration.approval_status}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <FiCalendar className="w-4 h-4 mr-2" />
          {tournament?.start_date && format(new Date(tournament.start_date), 'MMM dd, yyyy')}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiMapPin className="w-4 h-4 mr-2" />
          {tournament?.venue || 'Venue TBD'}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiUsers className="w-4 h-4 mr-2" />
          Type: {registration.registration_type || 'Individual'}
        </div>
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament, onViewDetails }) => {
  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{tournament.tournament_name}</h3>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
          Open
        </span>
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
      </div>
      <button
        onClick={onViewDetails}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
      >
        View Details
      </button>
    </div>
  );
};

// Notification Card Component
const NotificationCard = ({ notification }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white">
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

export default PlayerDashboard;
