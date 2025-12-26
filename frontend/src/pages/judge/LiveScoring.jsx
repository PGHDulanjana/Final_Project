import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { FiZap, FiUsers, FiAward, FiSave, FiRefreshCw } from 'react-icons/fi';
import { initSocket, disconnectSocket, socket } from '../../utils/socket';
import { format } from 'date-fns';

const LiveScoring = () => {
  const { user } = useAuth();
  const [activeMatches, setActiveMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadActiveMatches();
    
    // Initialize socket for real-time updates
    if (user) {
      initSocket();
      
      socket?.on('scoreUpdate', (data) => {
        toast.info(`Score updated for ${data.match_name}`);
        loadActiveMatches();
      });

      socket?.on('matchStatusChange', (data) => {
        toast.info(`Match ${data.match_name} status changed to ${data.status}`);
        loadActiveMatches();
      });
    }

    return () => {
      disconnectSocket();
    };
  }, [user]);

  const loadActiveMatches = async () => {
    setLoading(true);
    try {
      const matchesRes = await matchService.getMatches({
        status: 'In Progress',
      });
      setActiveMatches(matchesRes.data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load active matches');
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = async (match) => {
    setSelectedMatch(match);
    try {
      const scoresRes = await scoreService.getScores({ match_id: match._id });
      const matchScores = scoresRes.data || [];
      
      // Organize scores by participant
      const organizedScores = {};
      match.participants?.forEach(participant => {
        const participantScores = matchScores.filter(s => s.participant_id === participant._id);
        organizedScores[participant._id] = {
          technical: participantScores.length > 0 ? participantScores[0].technical_score : 0,
          performance: participantScores.length > 0 ? participantScores[0].performance_score : 0,
        };
      });
      
      setScores(organizedScores);
    } catch (error) {
      console.error('Error loading scores:', error);
      toast.error('Failed to load scores');
    }
  };

  const handleScoreChange = (participantId, field, value) => {
    setScores(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const calculateFinalScore = (participantId) => {
    const participantScores = scores[participantId];
    if (!participantScores) return 0;
    return (participantScores.technical || 0) + (participantScores.performance || 0);
  };

  const handleSubmitScores = async () => {
    if (!selectedMatch) return;

    setSaving(true);
    try {
      const scorePromises = Object.keys(scores).map(participantId => {
        const participantScores = scores[participantId];
        const finalScore = calculateFinalScore(participantId);
        
        return scoreService.createScore({
          match_id: selectedMatch._id,
          participant_id: participantId,
          judge_id: user?.judge_id || user?._id,
          technical_score: participantScores.technical || 0,
          performance_score: participantScores.performance || 0,
          final_score: finalScore,
        });
      });

      await Promise.all(scorePromises);
      
      // Emit socket event for real-time update
      socket?.emit('scoreSubmitted', {
        match_id: selectedMatch._id,
        judge_id: user?.judge_id || user?._id,
      });

      toast.success('Scores submitted successfully!');
      setScores({});
      loadActiveMatches();
    } catch (error) {
      console.error('Error submitting scores:', error);
      toast.error('Failed to submit scores');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Live Scoring</h1>
          <p className="text-gray-600">Enter scores for active matches in real-time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Matches List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Active Matches</h2>
              <button
                onClick={loadActiveMatches}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FiRefreshCw />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : activeMatches.length === 0 ? (
              <div className="text-center py-12">
                <FiZap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active matches</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeMatches.map(match => (
                  <motion.div
                    key={match._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedMatch?._id === match._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleMatchSelect(match)}
                  >
                    <h3 className="font-semibold text-gray-800 mb-1">{match.match_name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{match.category_id?.category_name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {format(new Date(match.scheduled_time), 'HH:mm')}
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {match.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Scoring Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
            {selectedMatch ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedMatch.match_name}</h2>
                  <p className="text-gray-600">
                    {selectedMatch.category_id?.category_name} • {format(new Date(selectedMatch.scheduled_time), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>

                <div className="space-y-6">
                  {selectedMatch.participants?.map((participant, index) => {
                    const participantName = participant.player_id?.user_id?.username ||
                                          participant.team_id?.team_name ||
                                          `Participant ${index + 1}`;
                    const participantId = participant._id;
                    const participantScores = scores[participantId] || { technical: 0, performance: 0 };
                    const finalScore = calculateFinalScore(participantId);

                    return (
                      <motion.div
                        key={participantId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-6 border-2 border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center mb-4">
                          <FiUsers className="w-6 h-6 text-blue-600 mr-3" />
                          <h3 className="text-xl font-bold text-gray-800">{participantName}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Technical Score (0-10)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={participantScores.technical}
                              onChange={(e) => handleScoreChange(participantId, 'technical', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Performance Score (0-10)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              value={participantScores.performance}
                              onChange={(e) => handleScoreChange(participantId, 'performance', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-700">Final Score:</span>
                            <motion.span
                              key={finalScore}
                              initial={{ scale: 1.2, color: '#3b82f6' }}
                              animate={{ scale: 1, color: '#1e40af' }}
                              className="text-3xl font-bold text-blue-700"
                            >
                              {finalScore.toFixed(1)}
                            </motion.span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedMatch(null);
                      setScores({});
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitScores}
                    disabled={saving || Object.keys(scores).length === 0}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <FiSave className="mr-2" />
                    {saving ? 'Saving...' : 'Submit Scores'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select a match to start scoring</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LiveScoring;

