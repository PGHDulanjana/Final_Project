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
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import LiveScoreboard from '../../components/LiveScoreboard';
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
  FiPlus
} from 'react-icons/fi';

const JudgeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [assignedMatches, setAssignedMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [scores, setScores] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [judgedMatches, setJudgedMatches] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [judgeProfile, setJudgeProfile] = useState(null);

  // UI states
  const [showScoringPanel, setShowScoringPanel] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [scoringData, setScoringData] = useState({
    technical_score: '',
    performance_score: '',
    // Kumite scoring
    ippon: 0,
    waza_ari: 0,
    chukoku: 0,
    keikoku: 0,
    hansoku_chui: 0,
    hansoku: 0,
    jogai: 0,
    comments: ''
  });

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

      const [matchesRes, scoresRes, notificationsRes, tournamentsRes, categoriesRes, registrationsRes] = await Promise.all([
        matchService.getMatches(),
        scoreService.getScores({ judge_id: user?.judge_id || user?._id }),
        notificationService.getNotifications(),
        tournamentService.getTournaments(),
        categoryService.getCategories(),
        registrationService.getRegistrations({ judge_id: user?.judge_id || user?._id })
      ]);

      const allMatchesData = matchesRes.data || [];
      
      // Filter matches assigned to this judge
      // In a real implementation, you'd check MatchJudge collection
      // For now, we'll show all matches that are scheduled or in progress
      const assigned = allMatchesData.filter(m => 
        m.status === 'Scheduled' || m.status === 'In Progress'
      );

      // Get matches that have been judged by this judge
      const judgedMatchIds = [...new Set((scoresRes.data || []).map(s => s.match_id?._id || s.match_id))];
      const judged = allMatchesData.filter(m => 
        judgedMatchIds.includes(m._id) && m.status === 'Completed'
      );

      setAssignedMatches(assigned);
      setAllMatches(allMatchesData);
      setScores(scoresRes.data || []);
      setNotifications(notificationsRes.data || []);
      setJudgedMatches(judged);
      setTournaments(tournamentsRes.data || []);
      setCategories(categoriesRes.data || []);
      setRegistrations(registrationsRes.data || []);
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

  // Calculate statistics
  const activeMatches = assignedMatches.filter(m => m.status === 'In Progress').length;
  const scheduledMatches = assignedMatches.filter(m => m.status === 'Scheduled').length;
  const totalScores = scores.length;
  const todayScores = scores.filter(s => {
    const scoreDate = new Date(s.scored_at || s.createdAt || new Date());
    const today = new Date();
    return scoreDate.toDateString() === today.toDateString();
  }).length;
  const completedJudgedMatches = judgedMatches.length;

  const handleOpenScoringPanel = (match, participant = null) => {
    setSelectedMatch(match);
    setSelectedParticipant(participant);
    
    // Load existing score if available
    if (participant) {
      const existingScore = scores.find(s => 
        (s.match_id?._id || s.match_id) === match._id &&
        (s.participant_id?._id || s.participant_id) === participant._id
      );
      
      if (existingScore) {
        setScoringData({
          technical_score: existingScore.technical_score || '',
          performance_score: existingScore.performance_score || '',
          ippon: existingScore.ippon || 0,
          waza_ari: existingScore.waza_ari || 0,
          chukoku: existingScore.chukoku || 0,
          keikoku: existingScore.keikoku || 0,
          hansoku_chui: existingScore.hansoku_chui || 0,
          hansoku: existingScore.hansoku || 0,
          jogai: existingScore.jogai || 0,
          comments: existingScore.comments || ''
        });
      } else {
        setScoringData({
          technical_score: '',
          performance_score: '',
          ippon: 0,
          waza_ari: 0,
          chukoku: 0,
          keikoku: 0,
          hansoku_chui: 0,
          hansoku: 0,
          jogai: 0,
          comments: ''
        });
      }
    }
    
    setShowScoringPanel(true);
  };

  const handleSubmitScore = async (e) => {
    e.preventDefault();
    if (!selectedMatch || !selectedParticipant) {
      toast.error('Please select a match and participant');
      return;
    }

    try {
      const isKumite = selectedMatch.match_type === 'Kumite' || selectedMatch.match_type === 'Team Kumite';
      
      // For Kata: use technical and performance scores
      // For Kumite: calculate score from points and penalties
      let technicalScore = 0;
      let performanceScore = 0;

      if (isKumite) {
        // Calculate Kumite score
        // Ippon = 3 points, Waza-ari = 2 points
        // Penalties reduce score
        const points = (scoringData.ippon * 3) + (scoringData.waza_ari * 2);
        const penaltyDeduction = (scoringData.chukoku * 0.5) + 
                                 (scoringData.keikoku * 1) + 
                                 (scoringData.hansoku_chui * 1.5) + 
                                 (scoringData.hansoku * 2) +
                                 (scoringData.jogai * 0.25);
        
        technicalScore = Math.max(0, Math.min(10, points - penaltyDeduction));
        performanceScore = technicalScore; // For Kumite, both are the same
      } else {
        // Kata scoring
        technicalScore = parseFloat(scoringData.technical_score) || 0;
        performanceScore = parseFloat(scoringData.performance_score) || 0;
      }

      if (technicalScore < 0 || technicalScore > 10 || performanceScore < 0 || performanceScore > 10) {
        toast.error('Scores must be between 0 and 10');
        return;
      }

      const scorePayload = {
        match_id: selectedMatch._id,
        participant_id: selectedParticipant._id,
        technical_score: technicalScore,
        performance_score: performanceScore,
        ...(isKumite && {
          ippon: scoringData.ippon,
          waza_ari: scoringData.waza_ari,
          chukoku: scoringData.chukoku,
          keikoku: scoringData.keikoku,
          hansoku_chui: scoringData.hansoku_chui,
          hansoku: scoringData.hansoku,
          jogai: scoringData.jogai
        }),
        comments: scoringData.comments
      };

      await scoreService.submitScore(scorePayload);
      toast.success('Score submitted successfully! Scoreboard updated.');
      
      setShowScoringPanel(false);
      setSelectedMatch(null);
      setSelectedParticipant(null);
      loadData();
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error(error.response?.data?.message || 'Failed to submit score');
    }
  };

  const handleMoveToNextMatch = () => {
    if (!selectedMatch) return;
    
    const currentIndex = assignedMatches.findIndex(m => m._id === selectedMatch._id);
    const nextMatch = assignedMatches[currentIndex + 1];
    
    if (nextMatch) {
      setSelectedMatch(nextMatch);
      setSelectedParticipant(null);
      setScoringData({
        technical_score: '',
        performance_score: '',
        ippon: 0,
        waza_ari: 0,
        chukoku: 0,
        keikoku: 0,
        hansoku_chui: 0,
        hansoku: 0,
        jogai: 0,
        comments: ''
      });
    } else {
      toast.info('No more matches assigned');
      setShowScoringPanel(false);
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
                { id: 'assigned', label: 'Assigned Matches', icon: FiTarget },
                { id: 'scoring', label: 'Scoring Panel', icon: FiEdit },
                { id: 'history', label: 'History', icon: FiCheckCircle },
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
                      <p className="text-gray-500 text-sm font-medium">Active Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{activeMatches}</p>
                      <p className="text-xs text-gray-500 mt-1">{scheduledMatches} Scheduled</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FiZap className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Completed Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{completedJudgedMatches}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiCheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Scores</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalScores}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiAward className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Today's Scores</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{todayScores}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <FiTrendingUp className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => setActiveTab('assigned')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">View Assigned Matches</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('scoring')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition"
                  >
                    <FiEdit className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Open Scoring Panel</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                  >
                    <FiCheckCircle className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">View History</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition"
                  >
                    <FiBell className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Notifications</span>
                  </button>
                </div>
              </div>

              {/* Active Matches */}
              {activeMatches > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Active Matches</h2>
                    <button
                      onClick={() => setActiveTab('assigned')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedMatches
                      .filter(m => m.status === 'In Progress')
                      .slice(0, 6)
                      .map((match) => (
                        <MatchCard
                          key={match._id}
                          match={match}
                          onOpenScoring={() => handleOpenScoringPanel(match)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Live Scoreboard */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Live Scoreboard</h2>
                <LiveScoreboard />
              </div>

              {/* Recent Scores */}
              {scores.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Recent Scores</h2>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View History <FiArrowRight />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technical</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {scores.slice(0, 5).map((score) => (
                          <tr key={score._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {score.match_id?.match_name || 'Match'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {score.technical_score}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {score.performance_score}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                                {score.final_score}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(score.scored_at || score.createdAt || new Date()), 'MMM dd, yyyy HH:mm')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
                  // Backend will validate if tournament is open for registration
                  const allAvailableTournaments = tournaments;
                  
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
                            disabled={tournament.status !== 'Open'}
                            title={tournament.status !== 'Open' ? 'Tournament is not open for registration' : 'Register for Tournament (FREE)'}
                          >
                            {tournament.status === 'Open' ? 'Register for Tournament (FREE)' : 'Registration Closed'}
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
                      
                      {/* Available Tournaments Section */}
                      {unregisteredTournaments.length > 0 && (
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FiAward className="w-5 h-5 text-blue-600" />
                            Available Tournaments ({unregisteredTournaments.length})
                          </h3>
                          <p className="text-gray-600 mb-4 text-sm">Tournaments available for registration. Register to view events and matches, and be assigned to judge matches.</p>
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

          {/* Assigned Matches Tab */}
          {activeTab === 'assigned' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Matches Assigned by Organizer</h2>
              {assignedMatches.length === 0 ? (
                <div className="text-center py-12">
                  <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Assigned Matches</h3>
                  <p className="text-gray-600">You have no matches assigned at the moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedMatches.map((match) => (
                    <MatchCard
                      key={match._id}
                      match={match}
                      onOpenScoring={() => handleOpenScoringPanel(match)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scoring Panel Tab */}
          {activeTab === 'scoring' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Scoring Panel</h2>
                {selectedMatch && (
                  <button
                    onClick={() => handleOpenScoringPanel(selectedMatch)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FiEdit className="w-5 h-5" />
                    Open Scoring
                  </button>
                )}
              </div>
              {!selectedMatch ? (
                <div className="text-center py-12">
                  <FiEdit className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Match</h3>
                  <p className="text-gray-600 mb-4">Select a match from assigned matches to start scoring</p>
                  <button
                    onClick={() => setActiveTab('assigned')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    View Assigned Matches
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <MatchCard match={selectedMatch} />
                  {selectedMatch.participants && selectedMatch.participants.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMatch.participants.map((participant, index) => (
                        <button
                          key={participant._id || index}
                          onClick={() => handleOpenScoringPanel(selectedMatch, participant)}
                          className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                        >
                          <p className="font-semibold text-gray-800">Participant {index + 1}</p>
                          <p className="text-sm text-gray-600">Click to score</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">History of Judged Matches</h2>
              {judgedMatches.length === 0 ? (
                <div className="text-center py-12">
                  <FiCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Judged Matches</h3>
                  <p className="text-gray-600">You haven't judged any matches yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {judgedMatches.map((match) => {
                    const matchScores = scores.filter(s => 
                      (s.match_id?._id || s.match_id) === match._id
                    );
                    return (
                      <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">{match.match_name || 'Match'}</h3>
                            <p className="text-sm text-gray-600">
                              {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            Completed
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Scores submitted: {matchScores.length}</p>
                        </div>
                      </div>
                    );
                  })}
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

      {/* Scoring Panel Modal */}
      {showScoringPanel && selectedMatch && (
        <ScoringPanel
          match={selectedMatch}
          participant={selectedParticipant}
          scoringData={scoringData}
          setScoringData={setScoringData}
          onSubmit={handleSubmitScore}
          onClose={() => {
            setShowScoringPanel(false);
            setSelectedMatch(null);
            setSelectedParticipant(null);
          }}
          onNextMatch={handleMoveToNextMatch}
          hasNextMatch={assignedMatches.findIndex(m => m._id === selectedMatch._id) < assignedMatches.length - 1}
        />
      )}
    </Layout>
  );
};

// Match Card Component
const MatchCard = ({ match, onOpenScoring }) => {
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
      <div className="space-y-2 mb-4">
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
      {onOpenScoring && match.status !== 'Completed' && (
        <button
          onClick={() => onOpenScoring()}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
        >
          Open Scoring Panel
        </button>
      )}
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

// Scoring Panel Component
const ScoringPanel = ({ match, participant, scoringData, setScoringData, onSubmit, onClose, onNextMatch, hasNextMatch }) => {
  const isKumite = match.match_type === 'Kumite' || match.match_type === 'Team Kumite';
  const isKata = match.match_type === 'Kata' || match.match_type === 'Team Kata';

  const handleIncrement = (field) => {
    setScoringData(prev => ({
      ...prev,
      [field]: (prev[field] || 0) + 1
    }));
  };

  const handleDecrement = (field) => {
    setScoringData(prev => ({
      ...prev,
      [field]: Math.max(0, (prev[field] || 0) - 1)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Scoring Panel</h2>
            <p className="text-sm text-gray-600 mt-1">{match.match_name || 'Match'} • {match.match_type}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {/* Kata Scoring */}
          {isKata && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Kata Scoring</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Technical Score (0-10) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={scoringData.technical_score}
                    onChange={(e) => setScoringData({ ...scoringData, technical_score: e.target.value })}
                    required
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Performance Score (0-10) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={scoringData.performance_score}
                    onChange={(e) => setScoringData({ ...scoringData, performance_score: e.target.value })}
                    required
                    min="0"
                    max="10"
                    step="0.1"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Kumite Scoring */}
          {isKumite && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Kumite Scoring</h3>
              
              {/* Points */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">Points</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Ippon (3 points)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement('ippon')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{scoringData.ippon || 0}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement('ippon')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Waza-ari (2 points)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement('waza_ari')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{scoringData.waza_ari || 0}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement('waza_ari')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Penalties */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">Penalties</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Chukoku (-0.5)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement('chukoku')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{scoringData.chukoku || 0}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement('chukoku')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Keikoku (-1)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement('keikoku')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{scoringData.keikoku || 0}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement('keikoku')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Hansoku-Chui (-1.5)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement('hansoku_chui')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{scoringData.hansoku_chui || 0}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement('hansoku_chui')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">Hansoku (-2)</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement('hansoku')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiMinus className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold text-lg">{scoringData.hansoku || 0}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement('hansoku')}
                          className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          <FiPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jogai (Out-of-bounds) */}
              <div>
                <h4 className="text-md font-semibold text-gray-700 mb-3">Jogai (Out-of-bounds)</h4>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Jogai Warnings/Deductions (-0.25 each)</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecrement('jogai')}
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <FiMinus className="w-4 h-4" />
                      </button>
                      <span className="w-12 text-center font-bold text-lg">{scoringData.jogai || 0}</span>
                      <button
                        type="button"
                        onClick={() => handleIncrement('jogai')}
                        className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Score Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Calculated Score:</p>
                <p className="text-2xl font-bold text-blue-700">
                  {(() => {
                    const points = (scoringData.ippon || 0) * 3 + (scoringData.waza_ari || 0) * 2;
                    const penaltyDeduction = (scoringData.chukoku || 0) * 0.5 + 
                                           (scoringData.keikoku || 0) * 1 + 
                                           (scoringData.hansoku_chui || 0) * 1.5 + 
                                           (scoringData.hansoku || 0) * 2 +
                                           (scoringData.jogai || 0) * 0.25;
                    const final = Math.max(0, Math.min(10, points - penaltyDeduction));
                    return final.toFixed(2);
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comments (Optional)
            </label>
            <textarea
              value={scoringData.comments}
              onChange={(e) => setScoringData({ ...scoringData, comments: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add any comments or notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              {hasNextMatch && (
                <button
                  type="button"
                  onClick={onNextMatch}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Next Match
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Results
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JudgeDashboard;
