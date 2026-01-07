import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tatamiService } from '../../services/tatamiService';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { judgeService } from '../../services/judgeService';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import { 
  FiUsers, 
  FiAward, 
  FiCheckCircle, 
  FiXCircle, 
  FiRefreshCw, 
  FiCheck,
  FiSend,
  FiUser,
  FiClock,
  FiMapPin
} from 'react-icons/fi';

const TatamiDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tatami, setTatami] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, players, matches, scoring
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    if (id) {
      loadTatamiData();
    }
  }, [id]);

  const loadTatamiData = async () => {
    setLoading(true);
    try {
      const response = await tatamiService.getTatami(id);
      setTatami(response.data);
      setMatches(response.data.matches || []);
    } catch (error) {
      console.error('Error loading tatami data:', error);
      toast.error('Failed to load tatami dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraws = async () => {
    if (!tatami) return;

    setLoading(true);
    try {
      const result = await matchService.generateDraws(
        tatami.tournament_id._id || tatami.tournament_id,
        tatami.category_id._id || tatami.category_id,
        true
      );

      if (result.success) {
        let message = `Match draws generated! Created ${result.data.matchesCreated || 0} matches.`;
        
        // Add judge assignment information
        if (result.data.judgesAssigned) {
          const { totalJudges, judgesPerMatch, totalAssignments, unconfirmedJudges } = result.data.judgesAssigned;
          if (totalJudges > 0) {
            message += ` ${totalJudges} confirmed judge(s) assigned to all matches (${totalAssignments} total assignments).`;
          } else if (unconfirmedJudges > 0) {
            message += ` Warning: ${unconfirmedJudges} judge(s) assigned but not confirmed. No judges assigned to matches.`;
          } else {
            message += ` No judges assigned to this event.`;
          }
        }
        
        toast.success(message, { autoClose: 6000 });
        await loadTatamiData();
      } else {
        toast.error(result.message || 'Failed to generate match draws');
      }
    } catch (error) {
      console.error('Error generating draws:', error);
      toast.error(error.response?.data?.message || 'Failed to generate match draws');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAssignment = async () => {
    if (!tatami || !user) return;

    try {
      // Find current user's judge ID
      const judgesRes = await judgeService.getJudges();
      const allJudges = judgesRes.data || [];
      const userJudge = allJudges.find(j => {
        const judgeUserId = j.user_id?._id || j.user_id;
        return String(judgeUserId) === String(user._id);
      });

      if (!userJudge) {
        toast.error('Judge profile not found');
        return;
      }

      const response = await tatamiService.confirmJudgeAssignment(id, userJudge._id);
      if (response.success) {
        toast.success('Assignment confirmed! You can now access the tatami dashboard.');
        await loadTatamiData();
      }
    } catch (error) {
      console.error('Error confirming assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to confirm assignment');
    }
  };

  const handleSubmitResults = async () => {
    if (!tatami) return;

    if (!window.confirm('Are you sure you want to submit results? This will lock the event and send results to the organizer for approval.')) {
      return;
    }

    try {
      const response = await tatamiService.submitResults(id);
      if (response.success) {
        toast.success('Results submitted successfully! Organizer will review and approve.');
        await loadTatamiData();
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      toast.error(error.response?.data?.message || 'Failed to submit results');
    }
  };

  const checkTableWorkerAccess = () => {
    if (!tatami || !user) return false;

    // Check if user is organizer or admin
    if (user.user_type === 'Organizer' || user.user_type === 'Admin') {
      return true;
    }

    // Check if user has table worker access
    const hasAccess = tatami.table_worker_access?.some(
      access => String(access.user_id?._id || access.user_id) === String(user._id)
    );

    return hasAccess;
  };

  const checkJudgeAccess = () => {
    if (!tatami || !user) return false;

    // Check if user is an assigned and confirmed judge
    const isAssignedJudge = tatami.assigned_judges?.some(
      judge => {
        const judgeUserId = judge.judge_id?.user_id?._id || judge.judge_id?.user_id;
        return String(judgeUserId) === String(user._id) && judge.is_confirmed;
      }
    );

    return isAssignedJudge;
  };

  const canAccessTatami = () => {
    return checkTableWorkerAccess() || checkJudgeAccess();
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!tatami) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-800 mb-2">Tatami Not Found</h2>
            <p className="text-red-600">The requested tatami does not exist.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const hasTableWorkerAccess = checkTableWorkerAccess();
  const hasJudgeAccess = checkJudgeAccess();
  const canAccess = canAccessTatami();

  // Check if judge needs to confirm assignment
  const needsConfirmation = user && tatami.assigned_judges?.some(judge => {
    const judgeUserId = judge.judge_id?.user_id?._id || judge.judge_id?.user_id;
    return String(judgeUserId) === String(user._id) && !judge.is_confirmed;
  });

  if (!canAccess && needsConfirmation) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <FiAward className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Judge Assignment Confirmation</h2>
              <p className="text-gray-600">
                You have been assigned as a judge for this event. Please confirm your assignment to access the tatami dashboard.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Event Details:</h3>
              <p className="text-gray-700">
                <strong>Tournament:</strong> {tatami.tournament_id?.tournament_name || 'N/A'}
              </p>
              <p className="text-gray-700">
                <strong>Event:</strong> {tatami.category_id?.category_name || 'N/A'}
              </p>
              <p className="text-gray-700">
                <strong>Tatami:</strong> {tatami.tatami_name || `Tatami ${tatami.tatami_number}`}
              </p>
            </div>

            <button
              onClick={handleConfirmAssignment}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center justify-center"
            >
              <FiCheckCircle className="mr-2" />
              Confirm Assignment & Go to Tatami
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <FiXCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-yellow-800 mb-2">Access Denied</h2>
            <p className="text-yellow-700">
              You do not have access to this tatami dashboard. Please contact the organizer for table worker access.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const category = tatami.category_id;
  const tournament = tatami.tournament_id;
  const registeredPlayers = tatami.registeredPlayers || [];

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {tatami.tatami_name || `Tatami ${tatami.tatami_number}`}
              </h1>
              <p className="text-gray-600">
                {tournament?.tournament_name || 'Tournament'} • {category?.category_name || 'Event'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                tatami.status === 'Active' ? 'bg-green-100 text-green-800' :
                tatami.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {tatami.status}
              </span>
              {tatami.results_submitted && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                  Results Submitted
                </span>
              )}
              {tatami.results_approved && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                  Results Approved
                </span>
              )}
            </div>
          </div>

          {/* Event Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <FiUsers className="w-5 h-5" />
                <span className="text-sm">Registered Players</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{registeredPlayers.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <FiAward className="w-5 h-5" />
                <span className="text-sm">Assigned Judges</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {tatami.assigned_judges?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <FiCheckCircle className="w-5 h-5" />
                <span className="text-sm">Confirmed Judges</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {tatami.assigned_judges?.filter(j => j.is_confirmed).length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center space-x-2 text-gray-600 mb-1">
                <FiClock className="w-5 h-5" />
                <span className="text-sm">Matches</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{matches.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'players'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Players ({registeredPlayers.length})
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'matches'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Matches ({matches.length})
              </button>
              {hasTableWorkerAccess && (
                <button
                  onClick={() => setActiveTab('scoring')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'scoring'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Scoring
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Event Details */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Event Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Category Type</p>
                      <p className="font-semibold text-gray-800">{category?.category_type || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Participation Type</p>
                      <p className="font-semibold text-gray-800">{category?.participation_type || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Age Category</p>
                      <p className="font-semibold text-gray-800">{category?.age_category || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Location</p>
                      <p className="font-semibold text-gray-800 flex items-center">
                        <FiMapPin className="mr-2" />
                        {tatami.location || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Judges */}
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Assigned Judges</h3>
                  {tatami.assigned_judges && tatami.assigned_judges.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {tatami.assigned_judges.map((judgeAssignment, idx) => {
                        const judge = judgeAssignment.judge_id;
                        const user = judge?.user_id;
                        const name = user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.username || 'Unknown Judge';

                        return (
                          <div
                            key={idx}
                            className={`border-2 rounded-lg p-4 ${
                              judgeAssignment.is_confirmed
                                ? 'border-green-300 bg-green-50'
                                : 'border-yellow-300 bg-yellow-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FiUser className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-gray-800">{name}</span>
                              </div>
                              {judgeAssignment.is_confirmed ? (
                                <FiCheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <FiClock className="w-5 h-5 text-yellow-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Role: <span className="font-medium">{judgeAssignment.judge_role}</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {judgeAssignment.is_confirmed ? 'Confirmed' : 'Pending Confirmation'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-600">No judges assigned yet</p>
                  )}
                </div>

                {/* Table Worker Actions */}
                {hasTableWorkerAccess && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Table Worker Actions</h3>
                    <div className="flex flex-wrap gap-4">
                      {matches.length === 0 && (
                        <button
                          onClick={handleGenerateDraws}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center"
                        >
                          <FiRefreshCw className="mr-2" />
                          Generate Match Draws
                        </button>
                      )}
                      {matches.length > 0 && tatami.status !== 'Completed' && !tatami.results_submitted && (
                        <button
                          onClick={handleSubmitResults}
                          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center"
                        >
                          <FiSend className="mr-2" />
                          Submit Results
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Players Tab */}
            {activeTab === 'players' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Registered Players</h3>
                {registeredPlayers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {registeredPlayers.map((registration, idx) => {
                      const playerName = registration.player_id?.user_id?.first_name && registration.player_id?.user_id?.last_name
                        ? `${registration.player_id.user_id.first_name} ${registration.player_id.user_id.last_name}`
                        : registration.player_id?.user_id?.username
                        ? registration.player_id.user_id.username
                        : registration.team_id?.team_name
                        ? registration.team_id.team_name
                        : `Player ${idx + 1}`;

                      return (
                        <div
                          key={registration._id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                {registration.registration_type === 'Team' ? (
                                  <FiUsers className="w-4 h-4 text-blue-600 mr-2" />
                                ) : (
                                  <FiUser className="w-4 h-4 text-green-600 mr-2" />
                                )}
                                <h4 className="font-semibold text-gray-800">{playerName}</h4>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p><span className="font-medium">Type:</span> {registration.registration_type}</p>
                                {registration.registration_type === 'Individual' && (
                                  <>
                                    <p><span className="font-medium">Belt:</span> {registration.player_id?.belt_rank || 'N/A'}</p>
                                    <p><span className="font-medium">Dojo:</span> {registration.player_id?.dojo_name || 'N/A'}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No players registered for this event yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Matches Tab */}
            {activeTab === 'matches' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">Match Draws</h3>
                  {hasTableWorkerAccess && matches.length === 0 && (
                    <button
                      onClick={handleGenerateDraws}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center"
                    >
                      <FiRefreshCw className="mr-2" />
                      Generate Draws
                    </button>
                  )}
                </div>
                {matches.length > 0 ? (
                  <MatchDrawsBracket matches={matches} category={category} />
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No match draws generated yet</p>
                    {hasTableWorkerAccess && (
                      <p className="text-sm text-gray-500">Click "Generate Draws" to create match brackets</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Scoring Tab (Table Worker Only) */}
            {activeTab === 'scoring' && hasTableWorkerAccess && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Score Entry</h3>
                <p className="text-gray-600 mb-4">
                  Select a match to enter scores from judges. Scores will be calculated automatically.
                </p>
                {matches.length > 0 ? (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div
                        key={match._id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                        onClick={() => setSelectedMatch(match)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-800">{match.match_name || match.match_level}</h4>
                            <p className="text-sm text-gray-600">
                              {match.participants?.length || 0} participants • {match.status}
                            </p>
                          </div>
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                            Enter Scores
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No matches available for scoring</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TatamiDashboard;

