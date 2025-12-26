import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { FiTrendingUp, FiAward, FiTarget } from 'react-icons/fi';
import { format } from 'date-fns';

const PlayerPerformance = () => {
  const { user } = useAuth();
  const [performanceData, setPerformanceData] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    averageScore: 0,
    recentMatches: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, [user]);

  const loadPerformanceData = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const matchesRes = await matchService.getMatches({ status: 'Completed' });
      const completedMatches = matchesRes.data || [];

      let wins = 0, losses = 0, draws = 0;
      const scores = [];
      const recentMatchesData = [];

      for (const match of completedMatches) {
        const matchDetailsRes = await matchService.getMatch(match._id);
        const participants = matchDetailsRes.data?.participants || [];

        const playerParticipant = participants.find(
          p => p.player_id?._id === user.player_id || p.player_id === user.player_id
        );

        if (playerParticipant) {
          // Determine result
          if (match.winner_id === user.player_id || match.winner_id === playerParticipant._id) {
            wins++;
          } else if (match.winner_id) {
            losses++;
          } else {
            draws++;
          }

          // Get scores
          const scoresRes = await scoreService.getScores({
            match_id: match._id,
            participant_id: playerParticipant._id,
          });
          const matchScores = scoresRes.data || [];
          
          if (matchScores.length > 0) {
            const avgScore = matchScores.reduce((sum, s) => sum + (s.final_score || 0), 0) / matchScores.length;
            scores.push(avgScore);

            recentMatchesData.push({
              matchName: match.match_name || 'Match',
              date: match.scheduled_time,
              score: avgScore.toFixed(1),
              result: match.winner_id === user.player_id || match.winner_id === playerParticipant._id ? 'Win' : 
                      match.winner_id ? 'Loss' : 'Draw'
            });
          }
        }
      }

      // Calculate average score
      const averageScore = scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

      // Sort recent matches by date (newest first) and take last 5
      recentMatchesData.sort((a, b) => new Date(b.date) - new Date(a.date));

      setPerformanceData({
        totalMatches: completedMatches.length,
        wins,
        losses,
        draws,
        averageScore: averageScore.toFixed(1),
        recentMatches: recentMatchesData.slice(0, 5)
      });
    } catch (error) {
      console.error('Error loading performance data:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              My Performance
            </h1>
            <p className="text-gray-600">Overview of your tournament performance</p>
          </div>

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
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Matches</h2>
              <div className="space-y-4">
                {performanceData.recentMatches.map((match, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{match.matchName}</h3>
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
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            match.result === 'Win'
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
      </div>
    </Layout>
  );
};

export default PlayerPerformance;
