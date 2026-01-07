import React, { useState, useEffect, useCallback } from 'react';
import kataPerformanceService from '../services/kataPerformanceService';
import { useAuth } from '../context/AuthContext';
import { initSocket, getSocket } from '../utils/socket';
import { motion } from 'framer-motion';
import { FiZap, FiRefreshCw, FiAward, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

const KataLiveScoreboard = ({ categoryId, categoryName, categoryType }) => {
  const { token } = useAuth();
  const [performances, setPerformances] = useState([]);
  const [selectedRound, setSelectedRound] = useState('First Round');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const rounds = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'];

  const loadScoreboard = useCallback(async () => {
    if (!categoryId) return;
    
    try {
      setLoading(true);
      const response = await kataPerformanceService.getScoreboard(categoryId, selectedRound);
      const scoreboardData = response.data || [];
      
      // Sort by final score (descending), then by performance order
      const sorted = [...scoreboardData].sort((a, b) => {
        if (b.final_score === null && a.final_score === null) return a.performance_order - b.performance_order;
        if (b.final_score === null) return -1;
        if (a.final_score === null) return 1;
        if (b.final_score !== a.final_score) return b.final_score - a.final_score;
        return a.performance_order - b.performance_order;
      });

      setPerformances(sorted);
    } catch (error) {
      console.error('Error loading Kata scoreboard:', error);
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, selectedRound]);

  useEffect(() => {
    if (token) {
      initSocket(token);
    }
    loadScoreboard();

    // Listen for score updates
    const currentSocket = getSocket();
    if (currentSocket) {
      const handleScoreUpdate = (data) => {
        if (data && data.categoryId === categoryId) {
          loadScoreboard();
        }
      };
      currentSocket.on('score-updated', handleScoreUpdate);
      currentSocket.on(`kata-${categoryId}`, handleScoreUpdate);

      return () => {
        currentSocket.off('score-updated', handleScoreUpdate);
        currentSocket.off(`kata-${categoryId}`, handleScoreUpdate);
      };
    }
  }, [token, categoryId, loadScoreboard]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadScoreboard();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, loadScoreboard]);

  const getPlayerName = (performance) => {
    if (performance.player_id?.user_id) {
      const user = performance.player_id.user_id;
      return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Player';
    }
    return 'Player';
  };

  const getPlaceBadge = (index, finalScore) => {
    if (selectedRound === 'Third Round (Final 4)' && finalScore !== null) {
      const places = ['🥇', '🥈', '🥉', '4️⃣'];
      if (index < 4) {
        return (
          <span className="text-2xl mr-2">{places[index]}</span>
        );
      }
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <FiZap className="w-6 h-6 mr-2 text-blue-500" />
              Kata Live Scoreboard
            </h2>
            <p className="text-sm text-gray-600">{categoryName || 'Kata Event'}</p>
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
            onClick={loadScoreboard}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="Refresh"
          >
            <FiRefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Round Selector */}
      <div className="mb-6">
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          {rounds.map((round) => (
            <button
              key={round}
              onClick={() => setSelectedRound(round)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
                selectedRound === round
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {round}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : performances.length === 0 ? (
        <div className="text-center py-12">
          <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Performances</h3>
          <p className="text-gray-600">No performances found for {selectedRound}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-100 rounded-lg font-semibold text-sm text-gray-700">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-3">Player</div>
            <div className="col-span-2 text-center">Judge Scores</div>
            <div className="col-span-2 text-center">Removed</div>
            <div className="col-span-2 text-center">Sum (3)</div>
            <div className="col-span-2 text-center">Final Score</div>
          </div>

          {/* Performance Rows */}
          {performances.map((performance, index) => {
            const playerName = getPlayerName(performance);
            const kataScores = performance.kataScores || [];
            const sortedScores = [...kataScores].sort((a, b) => a - b);
            const highest = performance.highest;
            const lowest = performance.lowest;
            const middleScores = performance.middleScores || [];
            const finalScore = performance.final_score;

            return (
              <motion.div
                key={performance._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`grid grid-cols-12 gap-4 p-4 rounded-lg border-2 transition ${
                  index < 4 && finalScore !== null
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center justify-center">
                  <div className="flex items-center">
                    {getPlaceBadge(index, finalScore)}
                    <span className="text-lg font-bold text-gray-800">
                      {index + 1}
                    </span>
                  </div>
                </div>

                {/* Player Name */}
                <div className="col-span-3 flex items-center">
                  <div>
                    <div className="font-semibold text-gray-800">{playerName}</div>
                    {performance.player_id?.belt_rank && (
                      <div className="text-xs text-gray-500">{performance.player_id.belt_rank}</div>
                    )}
                  </div>
                </div>

                {/* Judge Scores */}
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {sortedScores.length > 0 ? (
                      sortedScores.map((score, idx) => {
                        const isHighest = score === highest;
                        const isLowest = score === lowest;
                        return (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              isHighest || isLowest
                                ? 'bg-red-100 text-red-700 line-through'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                            title={isHighest ? 'Highest (removed)' : isLowest ? 'Lowest (removed)' : 'Used in calculation'}
                          >
                            {score.toFixed(1)}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-gray-400 text-xs">No scores yet</span>
                    )}
                  </div>
                </div>

                {/* Removed Scores */}
                <div className="col-span-2 text-center">
                  {highest !== null && lowest !== null ? (
                    <div className="space-y-1">
                      <div className="text-xs text-red-600">
                        <FiTrendingUp className="inline w-3 h-3 mr-1" />
                        {highest.toFixed(1)}
                      </div>
                      <div className="text-xs text-red-600">
                        <FiTrendingDown className="inline w-3 h-3 mr-1" />
                        {lowest.toFixed(1)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </div>

                {/* Sum of 3 Middle Scores */}
                <div className="col-span-2 text-center">
                  {middleScores.length > 0 ? (
                    <div>
                      <div className="text-sm font-semibold text-gray-700">
                        {middleScores.map(s => s.toFixed(1)).join(' + ')}
                      </div>
                      <div className="text-xs text-gray-500">
                        = {middleScores.reduce((sum, s) => sum + s, 0).toFixed(1)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </div>

                {/* Final Score */}
                <div className="col-span-2 text-center">
                  {finalScore !== null ? (
                    <div className="text-2xl font-bold text-blue-600">
                      {finalScore.toFixed(1)}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Pending</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">📌 Kata Scoring System</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Each judge gives one score between 5.0 - 10.0</li>
          <li>• Remove the highest and lowest scores</li>
          <li>• Sum the remaining 3 scores to get the final score</li>
          <li>• This method reduces bias</li>
        </ul>
      </div>
    </div>
  );
};

export default KataLiveScoreboard;

