import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { notificationService } from '../../services/notificationService';
import { tournamentService } from '../../services/tournamentService';
import { categoryService } from '../../services/categoryService';
import { registrationService } from '../../services/registrationService';
import { judgeService } from '../../services/judgeService';
import { tatamiService } from '../../services/tatamiService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import KataLiveScoreboard from '../../components/KataLiveScoreboard';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import kataPerformanceService from '../../services/kataPerformanceService';
import {
  FiZap,
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiAward,
  FiTrendingUp,
  FiTarget,
  FiX,
  FiBell,
  FiArrowRight,
  FiEdit,
  FiEye,
  FiBarChart2,
  FiUser,
  FiAlertCircle,
  FiMinus,
  FiPlus,
  FiRefreshCw
} from 'react-icons/fi';

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [assignedMatches, setAssignedMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [kataPerformances, setKataPerformances] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [judgeProfile, setJudgeProfile] = useState(null);

  // UI states (removed scoring-related states)

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      // Get judge profile first
      let judgeProfileData = null;
      try {
        const judgesRes = await judgeService.getJudges();
        const allJudges = judgesRes.data || [];
        judgeProfileData = allJudges.find(j => {
          const judgeUserId = j.user_id?._id || j.user_id;
          return String(judgeUserId) === String(user._id);
        });
        setJudgeProfile(judgeProfileData);
      } catch (error) {
        console.error('Error loading judge profile:', error);
      }

      const [matchesRes, notificationsRes, tournamentsRes, categoriesRes, registrationsRes, assignedEventsRes] = await Promise.all([
        matchService.getMatches(),
        notificationService.getNotifications(),
        tournamentService.getTournaments(),
        categoryService.getCategories(),
        registrationService.getRegistrations({ judge_id: user?.judge_id || user?._id }),
        tatamiService.getAssignedEventsForJudge().catch(() => ({ data: [] })) // Fetch assigned events
      ]);

      const allMatchesData = matchesRes.data || [];
      
      // Get events assigned to this judge (via Tatami)
      const assignedEventsData = assignedEventsRes.data || [];
      setAssignedEvents(assignedEventsData);

      // Get matches for assigned events
      const assignedEventCategoryIds = assignedEventsData.map(e => e.event?._id || e.event).filter(Boolean);
      const assigned = allMatchesData.filter(m => {
        const matchCategoryId = m.category_id?._id || m.category_id;
        return assignedEventCategoryIds.some(catId => String(catId) === String(matchCategoryId)) &&
               (m.status === 'Scheduled' || m.status === 'In Progress');
      });


      setAssignedMatches(assigned);
      setAllMatches(allMatchesData);
      setNotifications(notificationsRes.data || []);
      setTournaments(tournamentsRes.data || []);
      const allCategories = categoriesRes.data || [];
      setCategories(allCategories);
      setRegistrations(registrationsRes.data || []);

      // Load Kata performances for assigned Kata events
      const assignedKataEventIds = assignedEventsData
        .filter(e => {
          const event = e.event || {};
          return event.category_type === 'Kata' || event.category_type === 'Team Kata';
        })
        .map(e => e.event?._id || e.event)
        .filter(Boolean);

      if (assignedKataEventIds.length > 0) {
        try {
          const kataPromises = assignedKataEventIds.map(categoryId => 
            kataPerformanceService.getPerformances({ category_id: categoryId })
              .catch((err) => {
                console.error(`Error loading performances for category ${categoryId}:`, err);
                return { data: [] };
              })
          );
          const kataResults = await Promise.all(kataPromises);
          const allKataPerformances = kataResults.flatMap(res => {
            if (res && res.data && Array.isArray(res.data)) {
              return res.data;
            }
            if (Array.isArray(res)) {
              return res;
            }
            return [];
          });
          setKataPerformances(allKataPerformances);
        } catch (error) {
          console.error('Error loading Kata performances:', error);
          setKataPerformances([]);
        }
      } else {
        setKataPerformances([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterForTournament = async (tournamentId) => {
    try {
      // Backend finds judge profile by user_id automatically, so we don't need to send judge_id
      await registrationService.registerForTournament({
        tournament_id: tournamentId,
        registration_type: 'Judge'
      });
      toast.success('Successfully registered for tournament!');
      loadData();
    } catch (error) {
      console.error('Error registering for tournament:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to register for tournament';
      toast.error(errorMessage);
    }
  };

  const handleLeaveTournament = async (registrationId, tournamentName) => {
    // Confirm before leaving
    if (!window.confirm(`Are you sure you want to leave "${tournamentName}"? You will need to register again to be assigned to matches.`)) {
      return;
    }

    try {
      await registrationService.deleteRegistration(registrationId);
      toast.success('Successfully left tournament');
      loadData();
    } catch (error) {
      console.error('Error leaving tournament:', error);
      toast.error(error.response?.data?.message || 'Failed to leave tournament');
    }
  };

  const handleConfirmAssignment = async (tatamiId, eventName, tournamentName) => {
    if (!judgeProfile) {
      toast.error('Judge profile not found');
      return;
    }

    // Show confirmation dialog
    if (!window.confirm(`Confirm your assignment to judge "${eventName}" in "${tournamentName}"?\n\nBy confirming, you agree to judge all matches in this event when draws are generated.`)) {
      return;
    }

    try {
      const response = await tatamiService.confirmJudgeAssignment(tatamiId, judgeProfile._id);
      if (response.success) {
        toast.success('Assignment confirmed successfully! You will be automatically assigned to all matches in this event when draws are generated.');
        loadData(); // Reload to update confirmation status
      }
    } catch (error) {
      console.error('Error confirming assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm assignment');
    }
  };

  // Calculate statistics
  const activeMatches = assignedMatches.filter(m => m.status === 'In Progress').length;
  const scheduledMatches = assignedMatches.filter(m => m.status === 'Scheduled').length;
  const pendingConfirmations = assignedEvents.filter(e => !e.is_confirmed).length;
  const confirmedEvents = assignedEvents.filter(e => e.is_confirmed).length;


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
                  Judge Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.first_name || user?.username}! Score matches and track results
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: FiBarChart2 },
                { id: 'tournaments', label: 'Tournaments', icon: FiAward },
                { id: 'assigned', label: 'Assigned Events', icon: FiTarget },
                { id: 'kumite-match-draws', label: 'Kumite Match Draws', icon: FiTarget },
                { id: 'kata-player-lists', label: 'Kata Player Lists', icon: FiTarget },
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
              <div className={`grid grid-cols-1 md:grid-cols-2 ${assignedEvents.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-8`}>
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Active Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{activeMatches}</p>
                      <p className="text-xs text-gray-500 mt-1">{scheduledMatches} Scheduled</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FiZap className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                {assignedEvents.length > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-cyan-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Confirmed Events</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{confirmedEvents}</p>
                        {pendingConfirmations > 0 && (
                          <p className="text-xs text-yellow-600 mt-1">{pendingConfirmations} pending</p>
                        )}
                      </div>
                      <div className="p-3 bg-cyan-100 rounded-lg">
                        <FiTarget className="w-8 h-8 text-cyan-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pending Confirmations Alert */}
              {pendingConfirmations > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FiAlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-800">
                          {pendingConfirmations} Event{pendingConfirmations > 1 ? 's' : ''} Pending Confirmation
                        </h3>
                        <p className="text-sm text-yellow-700 mt-1">
                          Please confirm your assignments to be automatically assigned to matches when draws are generated.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('assigned')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                    >
                      Confirm Now
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab('assigned')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition relative"
                  >
                    {pendingConfirmations > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {pendingConfirmations}
                      </span>
                    )}
                    <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">View Assigned Events</span>
                    {pendingConfirmations > 0 && (
                      <span className="text-xs text-red-600 mt-1">{pendingConfirmations} pending</span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/judge/matches')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition"
                  >
                    <FiZap className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Active Matches</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('kumite-match-draws')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-red-500 hover:bg-red-50 transition"
                  >
                    <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Kumite Draws</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('kata-player-lists')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Kata Lists</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition"
                  >
                    <FiBell className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Notifications</span>
                  </button>
                  <button
                    onClick={() => navigate('/judge/schedule')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition"
                  >
                    <FiCalendar className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Schedule</span>
                  </button>
                </div>
              </div>

              {/* Upcoming Matches */}
              {assignedMatches.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Upcoming Matches</h2>
                    <button
                      onClick={() => navigate('/judge/matches')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {assignedMatches
                      .filter(m => m.status === 'Scheduled' && new Date(m.scheduled_time) > new Date())
                      .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                      .slice(0, 5)
                      .map((match) => (
                        <div key={match._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 mb-1">
                                {match.match_name || `${match.match_type || 'Match'} - ${match.match_level || 'Level'}`}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <FiCalendar className="w-4 h-4" />
                                  {format(new Date(match.scheduled_time), 'MMM dd, yyyy')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <FiClock className="w-4 h-4" />
                                  {format(new Date(match.scheduled_time), 'HH:mm')}
                                </div>
                                {match.category_id?.category_name && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    {match.category_id.category_name}
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
                      ))}
                    {assignedMatches.filter(m => m.status === 'Scheduled' && new Date(m.scheduled_time) > new Date()).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <FiCalendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p>No upcoming matches scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Assigned Events Summary */}
              {assignedEvents.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Assigned Events</h2>
                    <button
                      onClick={() => setActiveTab('assigned')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedEvents.slice(0, 6).map((assignedEvent) => {
                      const event = assignedEvent.event || {};
                      const tournament = assignedEvent.tournament || {};
                      return (
                        <div key={assignedEvent._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-800 mb-1">{event.category_name || 'Event'}</h3>
                              <p className="text-sm text-gray-600 mb-2">{tournament.tournament_name || 'Tournament'}</p>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  event.category_type === 'Kata' || event.category_type === 'Team Kata' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {event.category_type || 'Event'}
                                </span>
                                {assignedEvent.is_confirmed ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    Confirmed
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Notifications */}
              {notifications.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Recent Notifications</h2>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notification) => (
                      <div key={notification._id} className="border-l-4 border-blue-500 bg-blue-50 rounded p-4 hover:bg-blue-100 transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">{notification.title || 'Notification'}</h3>
                            <p className="text-sm text-gray-600">{notification.message || notification.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(new Date(notification.createdAt || notification.created_at), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{assignedMatches.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Assigned to you</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiCheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Completed Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {assignedMatches.filter(m => m.status === 'Completed').length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Scored successfully</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiAward className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Tournaments</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">
                        {new Set(assignedEvents.map(e => {
                          const tournament = e.tournament || {};
                          return tournament._id || tournament;
                        }).filter(Boolean)).size}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Active tournaments</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <FiAward className="w-8 h-8 text-orange-600" />
                    </div>
                  </div>
                </div>
              </div>

            </>
          )}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Tournaments</h2>
                <p className="text-gray-600 mb-6">Register for tournaments to be assigned to matches. View events and matches for each tournament. Registration is FREE for judges.</p>
                
                {(() => {
                  // Get current judge's profile ID
                  const currentJudgeId = judgeProfile?._id;
                  
                  // Filter registrations to only include THIS judge's registrations
                  // Backend should already filter by judge_id, but add frontend check for safety
                  const judgeRegistrations = registrations.filter(r => {
                    // Must be a Judge registration
                    if (r.registration_type !== 'Judge') return false;
                    
                    // If we have judge profile, verify the registration belongs to this judge
                    if (currentJudgeId) {
                      const regJudgeId = r.judge_id?._id || r.judge_id;
                      if (!regJudgeId) return false;
                      // Match by judge profile ID
                      return String(regJudgeId) === String(currentJudgeId);
                    }
                    
                    // If no judge profile found, backend filtering should handle it
                    // But we'll still filter to be safe - only show if judge_id exists
                    const regJudgeId = r.judge_id?._id || r.judge_id;
                    return !!regJudgeId; // Backend should have filtered, so if judge_id exists, it's likely for this judge
                  });
                  
                  console.log('Judge dashboard - Filtered registrations:', {
                    currentJudgeId,
                    totalRegistrations: registrations.length,
                    judgeRegistrations: judgeRegistrations.length,
                    judgeRegDetails: judgeRegistrations.map(r => ({
                      regId: r._id,
                      judgeId: r.judge_id?._id || r.judge_id,
                      tournamentId: r.tournament_id?._id || r.tournament_id,
                      tournamentName: r.tournament_id?.tournament_name
                    }))
                  });
                  
                  // Get tournament IDs where THIS judge is registered
                  const registeredTournamentIds = new Set(
                    judgeRegistrations.map(r => {
                      const regTournamentId = r.tournament_id?._id || r.tournament_id;
                      return regTournamentId ? String(regTournamentId) : null;
                    }).filter(id => id !== null)
                  );
                  
                  // Show all tournaments (regardless of status)
                  // Judges should see all tournaments to register for them
                  const allAvailableTournaments = tournaments.filter(t => 
                    // Show tournaments that are Open, Draft, or Ongoing
                    // Exclude only Cancelled and Completed tournaments
                    t.status !== 'Cancelled' && t.status !== 'Completed'
                  );
                  
                  // Split tournaments into registered and available
                  const registeredTournaments = allAvailableTournaments.filter(t => 
                    registeredTournamentIds.has(String(t._id))
                  );
                  const unregisteredTournaments = allAvailableTournaments.filter(t => 
                    !registeredTournamentIds.has(String(t._id))
                  );
                  
                  const TournamentCard = ({ tournament, isRegistered, registration }) => {
                    const tournamentCategories = categories.filter(c => {
                      const catTournamentId = c.tournament_id?._id || c.tournament_id;
                      return catTournamentId === tournament._id || catTournamentId?.toString() === tournament._id?.toString();
                    });
                    const tournamentMatches = allMatches.filter(m => {
                      const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                      return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
                    });

                    return (
                      <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-800 mb-1">{tournament.tournament_name}</h3>
                            <p className="text-sm text-gray-600">
                              {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
                            tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {tournament.status}
                          </span>
                        </div>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Events:</span> {tournamentCategories.length}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">Matches:</span> {tournamentMatches.length}
                          </p>
                          {isRegistered && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                              ✓ Registered (FREE)
                            </span>
                          )}
                        </div>
                        {!isRegistered && (
                          <button
                            onClick={() => handleRegisterForTournament(tournament._id)}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={tournament.status === 'Cancelled' || tournament.status === 'Completed'}
                            title={tournament.status === 'Cancelled' || tournament.status === 'Completed' ? 'Tournament is cancelled or completed' : 'Register for Tournament (FREE)'}
                          >
                            {tournament.status === 'Cancelled' || tournament.status === 'Completed' 
                              ? 'Tournament Unavailable' 
                              : 'Register for Tournament (FREE)'}
                          </button>
                        )}
                        {isRegistered && registration && (
                          <button
                            onClick={() => handleLeaveTournament(registration._id, tournament.tournament_name)}
                            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-semibold mb-2"
                          >
                            Leave Tournament
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedTournament(tournament)}
                          className={`w-full ${(!isRegistered && tournament.status === 'Open') || (isRegistered && registration) ? 'mt-2' : ''} border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-semibold`}
                        >
                          View Details
                        </button>
                      </div>
                    );
                  };
                  
                  return (
                    <>
                      {/* Registered Tournaments Section */}
                      {registeredTournaments.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                            Registered Tournaments ({registeredTournaments.length})
                          </h3>
                          <p className="text-gray-600 mb-4 text-sm">Tournaments you have registered for. You can view events and matches, and be assigned to judge matches.</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {registeredTournaments.map((tournament) => {
                              const registration = judgeRegistrations.find(r => {
                                const regTournamentId = r.tournament_id?._id || r.tournament_id;
                                return regTournamentId === tournament._id || regTournamentId?.toString() === tournament._id?.toString();
                              });
                              return (
                                <TournamentCard
                                  key={tournament._id}
                                  tournament={tournament}
                                  isRegistered={true}
                                  registration={registration}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Available Tournaments Section - Always show if there are unregistered tournaments */}
                      {unregisteredTournaments.length > 0 && (
                        <div className="mb-8">
                          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiAward className="w-5 h-5 text-blue-600" />
                            Available Tournaments ({unregisteredTournaments.length})
                          </h3>
                          <p className="text-gray-600 mb-4 text-sm">Tournaments available for registration. Click "Register for Tournament (FREE)" to register. After registration, the tournament will appear in your Registered Tournaments section.</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {unregisteredTournaments.map((tournament) => (
                              <TournamentCard
                                key={tournament._id}
                                tournament={tournament}
                                isRegistered={false}
                                registration={null}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Show message if no available tournaments but there are registered ones */}
                      {unregisteredTournaments.length === 0 && registeredTournaments.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                          <p className="text-blue-800 text-sm">
                            <FiAward className="w-4 h-4 inline mr-2" />
                            You have registered for all available tournaments. Check back later for new tournaments.
                          </p>
                        </div>
                      )}
                      
                      {/* Empty State */}
                      {registeredTournaments.length === 0 && unregisteredTournaments.length === 0 && (
                        <div className="text-center py-12">
                          <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tournaments Available</h3>
                          <p className="text-gray-600">No tournaments are currently available for registration</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Tournament Details Modal */}
              {selectedTournament && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-800">{selectedTournament.tournament_name}</h2>
                      <button
                        onClick={() => setSelectedTournament(null)}
                        className="text-gray-400 hover:text-gray-600 transition"
                      >
                        <FiX className="w-6 h-6" />
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="mb-6">
                        <p className="text-gray-600 mb-2">
                          <span className="font-semibold">Dates:</span> {format(new Date(selectedTournament.start_date), 'MMM dd, yyyy')} - {format(new Date(selectedTournament.end_date), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-gray-600 mb-2">
                          <span className="font-semibold">Location:</span> {selectedTournament.location || 'TBA'}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-semibold">Status:</span> {selectedTournament.status}
                        </p>
                      </div>

                      {/* Events Created by Organizer */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <FiAward className="w-5 h-5" />
                          Events Created by {(() => {
                            const organizer = selectedTournament?.organizer_id;
                            if (organizer?.user_id) {
                              const organizerUser = organizer.user_id;
                              if (organizerUser.first_name && organizerUser.last_name) {
                                return `${organizerUser.first_name} ${organizerUser.last_name}`;
                              } else if (organizerUser.username) {
                                return organizerUser.username;
                              }
                            }
                            if (organizer?.organization_name) {
                              return organizer.organization_name;
                            }
                            return 'Organizer';
                          })()} ({categories.filter(c => {
                            const catTournamentId = c.tournament_id?._id || c.tournament_id;
                            return catTournamentId === selectedTournament._id || catTournamentId?.toString() === selectedTournament._id?.toString();
                          }).length})
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          All events created by the organizer for this tournament. As a judge, you can view all events to understand the tournament structure.
                        </p>
                        {categories.filter(c => {
                          const catTournamentId = c.tournament_id?._id || c.tournament_id;
                          return catTournamentId === selectedTournament._id || catTournamentId?.toString() === selectedTournament._id?.toString();
                        }).length === 0 ? (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-gray-600">No events created yet by the organizer</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {categories.filter(c => {
                              const catTournamentId = c.tournament_id?._id || c.tournament_id;
                              return catTournamentId === selectedTournament._id || catTournamentId?.toString() === selectedTournament._id?.toString();
                            }).map((category) => (
                              <div key={category._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition bg-white">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold text-gray-800 flex-1">{category.category_name}</h4>
                                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold whitespace-nowrap ml-2">
                                    {category.category_type}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><span className="font-medium">Participation:</span> {category.participation_type}</p>
                                  {category.age_category && <p><span className="font-medium">Age:</span> {category.age_category}</p>}
                                  {category.belt_category && <p><span className="font-medium">Belt:</span> {category.belt_category}</p>}
                                  {category.use_custom_belt_levels && category.belt_level_group && (
                                    <p><span className="font-medium">Belt Group:</span> {category.belt_level_group}</p>
                                  )}
                                  {(category.category_type === 'Kumite' || category.category_type === 'Team Kumite') && category.weight_category && (
                                    <p><span className="font-medium">Weight:</span> {category.weight_category}</p>
                                  )}
                                  {category.gender && <p><span className="font-medium">Gender:</span> {category.gender}</p>}
                                  {category.is_open_event && (
                                    <p><span className="font-medium text-yellow-600">Open Event</span> (No restrictions)</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Matches */}
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <FiTarget className="w-5 h-5" />
                          Matches ({allMatches.filter(m => {
                            const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                            return matchTournamentId === selectedTournament._id || matchTournamentId?.toString() === selectedTournament._id?.toString();
                          }).length})
                        </h3>
                        {allMatches.filter(m => {
                          const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                          return matchTournamentId === selectedTournament._id || matchTournamentId?.toString() === selectedTournament._id?.toString();
                        }).length === 0 ? (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-gray-600">No matches scheduled yet</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {allMatches.filter(m => {
                              const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                              return matchTournamentId === selectedTournament._id || matchTournamentId?.toString() === selectedTournament._id?.toString();
                            }).map((match) => (
                              <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-gray-800">{match.match_name || 'Match'}</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                    match.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
                                    match.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {match.status}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><span className="font-medium">Type:</span> {match.match_type}</p>
                                  <p><span className="font-medium">Scheduled:</span> {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}</p>
                                  {match.venue_area && <p><span className="font-medium">Venue:</span> {match.venue_area}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assigned Events Tab */}
          {activeTab === 'assigned' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Events Assigned by Organizer</h2>
              {assignedEvents.length === 0 ? (
                <div className="text-center py-12">
                  <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assigned Events</h3>
                  <p className="text-gray-600">You have no events assigned at the moment. Organizers will assign you to events when they set up tournaments.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedEvents.map((assignment) => {
                    const event = assignment.event;
                    const tournament = assignment.tournament;
                    if (!event || !tournament) return null;
                    
                    return (
                      <div
                        key={assignment._id}
                        className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow bg-white"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-800 mb-1">
                              {event.category_name || 'Event'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {tournament.tournament_name || 'Tournament'}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            assignment.status === 'Active' ? 'bg-green-100 text-green-700' :
                            assignment.status === 'Setup' ? 'bg-yellow-100 text-yellow-700' :
                            assignment.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {assignment.status || 'Setup'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <FiAward className="w-4 h-4 mr-2" />
                            <span className="font-medium">Type:</span>
                            <span className="ml-2">{event.category_type || 'N/A'}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FiUser className="w-4 h-4 mr-2" />
                            <span className="font-medium">Participation:</span>
                            <span className="ml-2">{event.participation_type || 'N/A'}</span>
                          </div>
                          {assignment.tatami_name && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiTarget className="w-4 h-4 mr-2" />
                              <span className="font-medium">Tatami:</span>
                              <span className="ml-2">{assignment.tatami_name} (#{assignment.tatami_number})</span>
                            </div>
                          )}
                          {assignment.location && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiCalendar className="w-4 h-4 mr-2" />
                              <span className="font-medium">Location:</span>
                              <span className="ml-2">{assignment.location}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-600">
                            <FiUser className="w-4 h-4 mr-2" />
                            <span className="font-medium">Role:</span>
                            <span className="ml-2">{assignment.judge_role || 'Judge'}</span>
                          </div>
                          {tournament.start_date && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FiCalendar className="w-4 h-4 mr-2" />
                              <span className="font-medium">Tournament Date:</span>
                              <span className="ml-2">{format(new Date(tournament.start_date), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          {assignment.is_confirmed ? (
                            <span className="text-sm text-green-600 font-medium flex items-center">
                              <FiCheckCircle className="w-4 h-4 mr-1" />
                              Confirmed
                            </span>
                          ) : (
                            <span className="text-sm text-yellow-600 font-medium flex items-center">
                              <FiClock className="w-4 h-4 mr-1" />
                              Pending Confirmation
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {!assignment.is_confirmed && (
                              <button
                                onClick={() => handleConfirmAssignment(assignment._id, event.category_name, tournament.tournament_name)}
                                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition flex items-center gap-1 shadow-sm"
                                title="Confirm your assignment to this event"
                              >
                                <FiCheckCircle className="w-4 h-4" />
                                Confirm
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedTournament(tournament);
                                setActiveTab('tournaments');
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                            >
                              View Details <FiArrowRight className="w-4 h-4 ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


          {/* Kumite Match Draws Tab */}
          {activeTab === 'kumite-match-draws' && (() => {
            // Get assigned Kumite events
            const assignedKumiteEvents = assignedEvents.filter(e => {
              const event = e.event || {};
              return event.category_type === 'Kumite' || event.category_type === 'Team Kumite';
            });

            // Get matches for assigned Kumite events
            const kumiteEventIds = assignedKumiteEvents.map(e => e.event?._id || e.event).filter(Boolean);
            const kumiteMatches = allMatches.filter(m => {
              const matchCategoryId = m.category_id?._id || m.category_id;
              return kumiteEventIds.some(eventId => 
                String(matchCategoryId) === String(eventId) || matchCategoryId === eventId
              );
            });

            // Group matches by category
            const matchesByCategory = {};
            assignedKumiteEvents.forEach(assignedEvent => {
              const event = assignedEvent.event || {};
              const categoryId = event._id || event;
              const categoryMatches = kumiteMatches.filter(m => {
                const matchCategoryId = m.category_id?._id || m.category_id;
                return String(matchCategoryId) === String(categoryId) || matchCategoryId === categoryId;
              });
              if (categoryMatches.length > 0 || categoryId) {
                matchesByCategory[categoryId] = {
                  category: event,
                  matches: categoryMatches
                };
              }
            });

            const hasKumiteEvents = Object.keys(matchesByCategory).length > 0;

            return (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Kumite Match Draws</h2>
                    <p className="text-gray-600">View match draws for Kumite events you are assigned to judge</p>
                  </div>
                  <button
                    onClick={() => loadData()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {!hasKumiteEvents ? (
                  <div className="text-center py-12">
                    <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Kumite Events Assigned</h3>
                    <p className="text-gray-600">You need to be assigned to Kumite events to see match draws</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.values(matchesByCategory).map(({ category, matches: categoryMatches }) => {
                      return (
                        <div key={category._id || category} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-2xl font-bold text-gray-800">{category.category_name || 'Event'}</h3>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                {category.category_type || 'Kumite'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {category.participation_type || 'Individual'} • {categoryMatches.length} match{categoryMatches.length !== 1 ? 'es' : ''}
                            </p>
                          </div>
                          
                          {categoryMatches.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-lg">
                              <p className="text-gray-600">No match draws yet. The organizer will create match draws for this event.</p>
                            </div>
                          ) : (
                            <MatchDrawsBracket 
                              matches={categoryMatches} 
                              category={category}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Kata Player Lists Tab */}
          {activeTab === 'kata-player-lists' && (() => {
            // Get assigned Kata events
            const assignedKataEvents = assignedEvents.filter(e => {
              const event = e.event || {};
              return event.category_type === 'Kata' || event.category_type === 'Team Kata';
            });

            // Group Kata performances by category
            const performancesByCategory = {};
            assignedKataEvents.forEach(assignedEvent => {
              const event = assignedEvent.event || {};
              const categoryId = event._id || event;
              const categoryPerformances = kataPerformances.filter(p => {
                const perfCategoryId = p.category_id?._id || p.category_id;
                return String(perfCategoryId) === String(categoryId) || perfCategoryId === categoryId;
              });
              if (categoryPerformances.length > 0 || categoryId) {
                performancesByCategory[categoryId] = {
                  category: event,
                  performances: categoryPerformances
                };
              }
            });

            // Always include Kata categories even if no performances yet
            assignedKataEvents.forEach(assignedEvent => {
              const event = assignedEvent.event || {};
              const categoryId = event._id || event;
              if (!performancesByCategory[categoryId]) {
                performancesByCategory[categoryId] = {
                  category: event,
                  performances: []
                };
              }
            });

            const hasKataEvents = Object.keys(performancesByCategory).length > 0;

            return (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Kata Player Lists</h2>
                    <p className="text-gray-600">View player lists and round progression for Kata events you are assigned to judge</p>
                  </div>
                  <button
                    onClick={() => loadData()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                {!hasKataEvents ? (
                  <div className="text-center py-12">
                    <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Kata Events Assigned</h3>
                    <p className="text-gray-600">You need to be assigned to Kata events to see player lists</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.values(performancesByCategory).map(({ category, performances: categoryPerformances }) => {
                      // Group performances by round
                      const performancesByRound = {};
                      categoryPerformances.forEach(perf => {
                        const round = perf.round || 'First Round';
                        if (!performancesByRound[round]) {
                          performancesByRound[round] = [];
                        }
                        performancesByRound[round].push(perf);
                      });

                      const rounds = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'];

                      return (
                        <div key={category._id || category} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                          <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-2xl font-bold text-gray-800">{category.category_name || 'Event'}</h3>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                {category.category_type || 'Kata'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {category.participation_type || 'Individual'} • {Object.keys(performancesByRound).length} round{Object.keys(performancesByRound).length !== 1 ? 's' : ''} • {categoryPerformances.length} player{categoryPerformances.length !== 1 ? 's' : ''}
                            </p>
                          </div>

                          {categoryPerformances.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-lg">
                              <p className="text-gray-600">No rounds created yet. The organizer will create rounds for this event.</p>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="mb-4 pb-4 border-b border-gray-200">
                                <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                                  <FiTrendingUp className="mr-2 text-blue-600" />
                                  Kata Event - Round Progression
                                </h4>
                                <p className="text-sm text-gray-600">
                                  View players who advanced through each round. Players are ranked by final score.
                                </p>
                              </div>
                              {rounds.map(round => {
                                const roundPerformances = performancesByRound[round] || [];
                                if (roundPerformances.length === 0) return null;

                                // Sort performances
                                const sortedPerformances = [...roundPerformances].sort((a, b) => {
                                  if (round === 'Third Round (Final 4)') {
                                    if (a.place !== null && b.place !== null) {
                                      return a.place - b.place;
                                    }
                                    if (a.place !== null) return -1;
                                    if (b.place !== null) return 1;
                                  }
                                  if (a.final_score === null && b.final_score === null) {
                                    return (a.performance_order || 0) - (b.performance_order || 0);
                                  }
                                  if (a.final_score === null) return 1;
                                  if (b.final_score === null) return -1;
                                  if (b.final_score !== a.final_score) {
                                    return b.final_score - a.final_score;
                                  }
                                  return (a.performance_order || 0) - (b.performance_order || 0);
                                });

                                return (
                                  <div key={round} className="border border-gray-200 rounded-lg p-6 bg-white">
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <FiAward className="w-5 h-5 text-blue-600" />
                                        {round}
                                      </h4>
                                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                        {roundPerformances.length} Player{roundPerformances.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      {sortedPerformances.map((performance, index) => {
                                        const playerName = performance.player_id?.user_id
                                          ? `${performance.player_id.user_id.first_name || ''} ${performance.player_id.user_id.last_name || ''}`.trim() || performance.player_id.user_id.username
                                          : 'Player';
                                        const scoresCount = performance.scores?.length || 0;
                                        
                                        return (
                                          <div
                                            key={performance._id}
                                            className="rounded-lg p-4 border-2 bg-gray-50 border-gray-200 transition"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-4 flex-1">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-200 text-gray-700">
                                                  {round === 'Third Round (Final 4)' && performance.place
                                                    ? performance.place
                                                    : index + 1}
                                                </div>
                                                <div className="flex-1">
                                                  <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-gray-800">
                                                      {playerName}
                                                    </p>
                                                  </div>
                                                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                                    <span>Order: {performance.performance_order}</span>
                                                    {scoresCount > 0 && (
                                                      <span className="text-blue-600">
                                                        {scoresCount}/5 judges scored
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                {performance.final_score !== null ? (
                                                  <div>
                                                    <p className="text-2xl font-bold text-green-600">
                                                      {performance.final_score.toFixed(1)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Final Score</p>
                                                  </div>
                                                ) : (
                                                  <div>
                                                    <p className="text-lg font-semibold text-gray-400">-</p>
                                                    <p className="text-xs text-gray-500">Pending</p>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h2>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <FiBell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Notifications</h3>
                  <p className="text-gray-600">You'll receive notifications about match assignments and updates</p>
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

    </Layout>
  );
};

// Match Card Component
const MatchCard = ({ match }) => {
  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{match.match_name || 'Match'}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          match.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {match.status}
        </span>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Type:</span> {match.match_type}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-semibold">Level:</span> {match.match_level}
        </p>
        <div className="flex items-center text-sm text-gray-600">
          <FiClock className="w-4 h-4 mr-1" />
          {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}
        </div>
        {match.venue_area && (
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Venue:</span> {match.venue_area}
          </p>
        )}
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


export default JudgeDashboard;
