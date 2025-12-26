import React, { useState, useEffect, useCallback } from 'react';
import { matchService } from '../services/matchService';
import { scoreService } from '../services/scoreService';
import { useAuth } from '../context/AuthContext';
import { initSocket, joinMatch, onScoreUpdate, onMatchStatusUpdate, socket, getSocket } from '../utils/socket';
import { motion } from 'framer-motion';
import { FiZap, FiRefreshCw, FiClock, FiAward } from 'react-icons/fi';
import { format } from 'date-fns';

const LiveScoreboard = () => {
  const { token } = useAuth();
  const [activeMatches, setActiveMatches] = useState([]);
  const [matchScores, setMatchScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadMatchScores = useCallback(async (matchId) => {
    try {
      const scoresRes = await scoreService.getScores({ match_id: matchId });
      const scores = scoresRes.data || [];

      // Organize scores by participant
      const organizedScores = {};
      scores.forEach(score => {
        if (!organizedScores[score.participant_id]) {
          organizedScores[score.participant_id] = {
            technical: 0,
            performance: 0,
            final: 0,
            participant: score.participant_id
          };
        }
        organizedScores[score.participant_id].technical = score.technical_score || 0;
        organizedScores[score.participant_id].performance = score.performance_score || 0;
        organizedScores[score.participant_id].final = score.final_score || 0;
      });

      setMatchScores(prev => ({
        ...prev,
        [matchId]: organizedScores
      }));
    } catch (error) {
      console.error('Error loading match scores:', error);
    }
  }, []);

  const loadActiveMatches = useCallback(async () => {
    try {
      setLoading(true);
      // Get all matches and filter for active ones
      const matchesRes = await matchService.getMatches();
      const allMatches = matchesRes.data || [];
      // Filter for matches that are in progress or scheduled (starting soon)
      const matches = allMatches.filter(m => 
        m.status === 'In Progress' || 
        (m.status === 'Scheduled' && new Date(m.scheduled_time) <= new Date())
      );
      setActiveMatches(matches);

      // Load scores for all active matches
      matches.forEach(match => {
        if (match._id) {
          loadMatchScores(match._id);
          joinMatch(match._id);
        }
      });
    } catch (error) {
      console.error('Error loading active matches:', error);
      setActiveMatches([]);
    } finally {
      setLoading(false);
    }
  }, [loadMatchScores]);

  useEffect(() => {
    // Initialize socket
    if (token) {
      initSocket(token);
    }

    // Load matches on mount
    loadActiveMatches();

    // Listen for score updates
    const handleScoreUpdate = (data) => {
      if (data && (data.matchId || data.match_id)) {
        loadMatchScores(data.matchId || data.match_id);
      }
    };

    // Listen for match status updates
    const handleMatchStatusUpdate = (data) => {
      if (data && (data.matchId || data.match_id)) {
        loadActiveMatches();
      }
    };

    // Set up socket listeners
    const currentSocket = getSocket();
    if (currentSocket) {
      currentSocket.on('score-updated', handleScoreUpdate);
      currentSocket.on('match-status-changed', handleMatchStatusUpdate);
    }

    // Auto-refresh every 5 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadActiveMatches();
      }, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
      // Clean up socket listeners
      if (currentSocket) {
        currentSocket.off('score-updated', handleScoreUpdate);
        currentSocket.off('match-status-changed', handleMatchStatusUpdate);
      }
    };
  }, [token, autoRefresh, loadActiveMatches, loadMatchScores]);


  const getParticipantName = (match, participantId) => {
    const participant = match.participants?.find(p => 
      p._id === participantId || p.player_id?._id === participantId
    );
    if (participant?.player_id) {
      return participant.player_id.first_name 
        ? `${participant.player_id.first_name} ${participant.player_id.last_name || ''}`.trim()
        : participant.player_id.username || 'Player';
    }
    return participant?.team_id?.team_name || 'Participant';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FiZap className="w-6 h-6 mr-2 text-red-500" />
              Live Scoreboard
            </h2>
            <p className="text-sm text-gray-600">Real-time match scores</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={loadActiveMatches}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Refresh"
          >
            <FiRefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeMatches.length === 0 ? (
        <div className="text-center py-12">
          <FiZap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active Matches</h3>
          <p className="text-gray-600">There are currently no matches in progress</p>
        </div>
      ) : (

      <div className="space-y-6">
        {activeMatches.map((match) => {
          const scores = matchScores[match._id] || {};
          const participants = match.participants || [];

          return (
            <motion.div
              key={match._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-red-200 rounded-xl p-6 bg-gradient-to-br from-red-50 to-orange-50"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">{match.match_name}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <FiClock className="w-4 h-4 mr-1" />
                      {format(new Date(match.scheduled_time), 'HH:mm')}
                    </span>
                    {match.category_id && (
                      <span className="flex items-center">
                        <FiAward className="w-4 h-4 mr-1" />
                        {match.category_id.category_name || match.category_id}
                      </span>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-semibold flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                  LIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participants.map((participant, index) => {
                  const participantId = participant._id || participant.player_id?._id || participant.player_id;
                  const participantScores = scores[participantId] || { technical: 0, performance: 0, final: 0 };
                  const participantName = getParticipantName(match, participantId);

                  return (
                    <div
                      key={participantId || index}
                      className="bg-white rounded-lg p-4 border-2 border-gray-200 hover:border-blue-400 transition"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-gray-800">{participantName}</h4>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {participantScores.final.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded p-2">
                          <div className="text-xs text-gray-600 mb-1">Technical</div>
                          <div className="text-lg font-semibold text-blue-700">
                            {participantScores.technical.toFixed(1)}
                          </div>
                        </div>
                        <div className="bg-green-50 rounded p-2">
                          <div className="text-xs text-gray-600 mb-1">Performance</div>
                          <div className="text-lg font-semibold text-green-700">
                            {participantScores.performance.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {participants.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No participants found for this match
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default LiveScoreboard;

