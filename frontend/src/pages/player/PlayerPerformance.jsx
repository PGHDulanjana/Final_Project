import React, { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { playerService } from '../../services/playerService';
import kataPerformanceService from '../../services/kataPerformanceService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import { FiTrendingUp, FiAward, FiTarget, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';

const PlayerPerformance = () => {
  const { user } = useAuth();
  const [playerProfile, setPlayerProfile] = useState(null);
  const [kumiteStats, setKumiteStats] = useState({
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    averageScore: 0,
    recentMatches: []
  });
  const [kataStats, setKataStats] = useState({
    totalPerformances: 0,
    wins: 0,
    losses: 0,
    averageScore: 0,
    recentPerformances: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlayerProfile();
    }
  }, [user]);

  useEffect(() => {
    if (playerProfile) {
      loadPerformanceData();
    }
  }, [playerProfile]);

  const loadPlayerProfile = async () => {
    if (!user?._id) return;

    // Check if player_id is already in user object (from key auth changes)
    if (user.player_id) {
      // It might be an object or ID string
      const id = user.player_id._id || user.player_id;
      // We can use this directly, or fetch full profile if needed.
      // Ideally, fetch full profile to ensure we have dojo info etc.
      try {
        const playersRes = await playerService.getPlayers();
        const allPlayers = playersRes.data || [];
        // Robust ID comparison
        const profile = allPlayers.find(p => {
          const pId = p._id;
          const pUserId = p.user_id?._id || p.user_id;
          return String(pId) === String(id) || String(pUserId) === String(user._id);
        });
        setPlayerProfile(profile);
        return;
      } catch (error) {
        console.error('Error fetching player details:', error);
      }
    }

    // Fallback: search by user_id
    try {
      const playersRes = await playerService.getPlayers();
      const allPlayers = playersRes.data || [];
      const profile = allPlayers.find(p => {
        const playerUserId = p.user_id?._id || p.user_id;
        return String(playerUserId) === String(user._id);
      });
      setPlayerProfile(profile);
    } catch (error) {
      console.error('Error loading player profile:', error);
    }
  };

  const loadPerformanceData = async () => {
    if (!user?._id || !playerProfile?._id) return;

    setLoading(true);
    try {
      const playerId = playerProfile._id;

      // Load Kumite matches and Kata performances in parallel
      // Remove 'status: Completed' filter to ensure we get all records, 
      // then we'll filter by those that actually have scores/results.
      const [matchesRes, kataPerformancesRes] = await Promise.all([
        matchService.getMatches({}),
        kataPerformanceService.getPerformances({ player_id: playerId })
      ]);

      const completedMatches = matchesRes.data || [];
      // Service returns { success: true, data: [...] }, so access .data
      const completedKataPerformances = kataPerformancesRes.data || [];

      // ========== KUMITE STATISTICS ==========
      let kumiteWins = 0, kumiteLosses = 0, kumiteDraws = 0;
      const kumiteScores = [];
      const kumiteRecentMatches = [];

      for (const match of completedMatches) {
        // Only process Kumite matches
        if (match.match_type !== 'Kumite' && match.match_type !== 'Team Kumite') {
          continue;
        }

        // Only count match if it is completed OR has a winner declared
        // This allows ongoing tournaments to show finished bouts
        if (match.status !== 'Completed' && !match.winner_id) {
          continue;
        }

        // Use participants directly from the match object (populated in list)
        // const matchDetailsRes = await matchService.getMatch(match._id);
        // const participants = matchDetailsRes.data?.participants || [];
        const participants = match.participants || [];

        const playerParticipant = participants.find(p => {
          // Individual check
          const pPlayerId = p.player_id?._id?.toString() || p.player_id?.toString();
          if (pPlayerId === playerId.toString()) return true;

          // Team check
          if (p.team_id) {
            // 1. Check if members list is populated and contains user
            if (p.team_id.members && Array.isArray(p.team_id.members)) {
              const foundInMembers = p.team_id.members.some(member => {
                const mPlayerId = member.player_id?._id?.toString() || member.player_id?.toString();
                const mUserId = member.player_id?.user_id?._id?.toString() || member.player_id?.user_id?.toString();
                return (mPlayerId && String(mPlayerId) === String(playerId)) || (mUserId && String(mUserId) === String(user._id));
              });
              if (foundInMembers) return true;
            }

            // 2. Fallback: Check if participant team_id matches player's team_id (if player has one)
            if (playerProfile.team_id) {
              const pTeamId = p.team_id._id?.toString() || p.team_id.toString();
              const myTeamId = playerProfile.team_id._id?.toString() || playerProfile.team_id.toString();
              if (pTeamId === myTeamId) return true;
            }
          }
          return false;
        });

        if (playerParticipant) {
          // Determine result
          const matchWinnerId = match.winner_id?._id?.toString() || match.winner_id?.toString();

          let isWinner = false;

          if (matchWinnerId) {
            // Check if I am the winner (Individual)
            const myPlayerId = playerParticipant.player_id?._id?.toString() || playerParticipant.player_id?.toString();
            if (myPlayerId && matchWinnerId === myPlayerId) isWinner = true;

            // Check if my team is the winner
            const myTeamId = playerParticipant.team_id?._id?.toString() || playerParticipant.team_id?.toString();
            if (myTeamId && matchWinnerId === myTeamId) isWinner = true;

            // Fallback to result field
            if (playerParticipant.result === 'Win') isWinner = true;
          }

          if (isWinner) {
            kumiteWins++;
          } else if (match.winner_id) {
            kumiteLosses++; // Someone else won
          } else {
            kumiteDraws++;
          }

          // Get scores for Kumite (calculate from points)
          // Note: Team scores are usually per team, we'll try to get score for this participation record
          const scoresRes = await scoreService.getScores({
            match_id: match._id,
            participant_id: playerParticipant._id,
          });
          const matchScores = scoresRes.data || [];

          let avgPoints = 0;
          if (matchScores.length > 0) {
            // For Kumite: calculate total points (Yuko=1, Waza-ari=2, Ippon=3)
            let totalPoints = 0;
            matchScores.forEach(score => {
              const points = (score.yuko || 0) * 1 + (score.waza_ari || 0) * 2 + (score.ippon || 0) * 3;
              totalPoints += points;
            });
            avgPoints = totalPoints / matchScores.length;
            kumiteScores.push(avgPoints);
          } else if (user.team_id) {
            // If no individual score but team match, maybe show 0 or skip score
            // Keeping 0 for now
            kumiteScores.push(0);
          }

          kumiteRecentMatches.push({
            eventName: match.match_name || 'Match',
            eventType: 'Kumite',
            date: match.scheduled_time || match.completed_at,
            score: avgPoints.toFixed(1),
            result: isWinner ? 'Win' : (match.winner_id ? 'Loss' : 'Draw')
          });
        }
      }

      // Calculate Kumite average score
      const kumiteAverageScore = kumiteScores.length > 0
        ? kumiteScores.reduce((sum, s) => sum + s, 0) / kumiteScores.length
        : 0;

      // Sort Kumite matches by date
      kumiteRecentMatches.sort((a, b) => new Date(b.date) - new Date(a.date));

      // ========== KATA STATISTICS ==========
      let kataWins = 0, kataLosses = 0;
      const kataScores = [];
      const kataRecentPerformances = [];

      // Group Kata performances by category and round to determine winners
      const performancesByCategory = {};
      completedKataPerformances.forEach(perf => {
        const categoryId = perf.category_id?._id?.toString() || perf.category_id?.toString();
        if (!performancesByCategory[categoryId]) {
          performancesByCategory[categoryId] = {};
        }
        const round = perf.round || 'First Round';
        if (!performancesByCategory[categoryId][round]) {
          performancesByCategory[categoryId][round] = [];
        }
        performancesByCategory[categoryId][round].push(perf);
      });

      // Process each Kata performance
      for (const perf of completedKataPerformances) {
        if (perf.final_score !== null && perf.final_score !== undefined) {
          kataScores.push(perf.final_score);

          // Determine if this player won in this round
          const categoryId = perf.category_id?._id?.toString() || perf.category_id?.toString();
          const round = perf.round || 'First Round';
          const roundPerformances = performancesByCategory[categoryId]?.[round] || [];

          // Sort by final_score descending to find winners
          const sortedPerformances = [...roundPerformances].sort((a, b) =>
            (b.final_score || 0) - (a.final_score || 0)
          );

          // Check if this player is in top positions (winners)
          const playerIndex = sortedPerformances.findIndex(p =>
            (p.player_id?._id?.toString() || p.player_id?.toString()) === playerId.toString()
          );

          // For Final 4 round, top 4 are winners (1st, 2nd, 3rd, 3rd)
          // For other rounds, top performers advance
          if (round === 'Third Round (Final 4)') {
            // Top 4 are winners
            if (playerIndex < 4 && playerIndex >= 0) {
              kataWins++;
            } else if (playerIndex >= 0) {
              kataLosses++;
            }
          } else {
            // For other rounds, top half or top performers advance (considered wins)
            const topCount = Math.ceil(sortedPerformances.length / 2);
            if (playerIndex < topCount && playerIndex >= 0) {
              kataWins++;
            } else if (playerIndex >= 0) {
              kataLosses++;
            }
          }

          kataRecentPerformances.push({
            eventName: perf.category_id?.category_name || 'Kata Event',
            eventType: 'Kata',
            round: round,
            date: perf.completed_at || perf.createdAt,
            score: perf.final_score.toFixed(1),
            place: perf.place || null,
            result: (playerIndex < 4 && round === 'Third Round (Final 4)') ||
              (playerIndex < Math.ceil(sortedPerformances.length / 2) && round !== 'Third Round (Final 4)')
              ? 'Win' : 'Loss'
          });
        }
      }

      // Calculate Kata average score
      const kataAverageScore = kataScores.length > 0
        ? kataScores.reduce((sum, s) => sum + s, 0) / kataScores.length
        : 0;

      // Sort Kata performances by date
      kataRecentPerformances.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Update state
      setKumiteStats({
        totalMatches: kumiteRecentMatches.length,
        wins: kumiteWins,
        losses: kumiteLosses,
        draws: kumiteDraws,
        averageScore: kumiteAverageScore.toFixed(1),
        recentMatches: kumiteRecentMatches.slice(0, 5)
      });

      setKataStats({
        totalPerformances: completedKataPerformances.length,
        wins: kataWins,
        losses: kataLosses,
        averageScore: kataAverageScore.toFixed(1),
        recentPerformances: kataRecentPerformances.slice(0, 5)
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

          {/* KUMITE PERFORMANCE SECTION */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <FiTarget className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-800">Kumite Performance</h2>
            </div>

            {/* Kumite Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Matches</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kumiteStats.totalMatches}</p>
                  </div>
                  <FiTarget className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Wins</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kumiteStats.wins}</p>
                  </div>
                  <FiAward className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Losses</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kumiteStats.losses}</p>
                  </div>
                  <FiTarget className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Avg Points</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kumiteStats.averageScore}</p>
                  </div>
                  <FiTrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Recent Kumite Matches */}
            {kumiteStats.recentMatches.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Kumite Matches</h3>
                <div className="space-y-3">
                  {kumiteStats.recentMatches.map((match, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{match.eventName}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(match.date), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Points</p>
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
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <FiTarget className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No Kumite matches completed yet</p>
              </div>
            )}
          </div>

          {/* KATA PERFORMANCE SECTION */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <FiUsers className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Kata Performance</h2>
            </div>

            {/* Kata Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Performances</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kataStats.totalPerformances}</p>
                  </div>
                  <FiUsers className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Wins</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kataStats.wins}</p>
                  </div>
                  <FiAward className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Losses</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kataStats.losses}</p>
                  </div>
                  <FiTarget className="w-8 h-8 text-red-600" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Avg Score</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{kataStats.averageScore}</p>
                  </div>
                  <FiTrendingUp className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Recent Kata Performances */}
            {kataStats.recentPerformances.length > 0 ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Kata Performances</h3>
                <div className="space-y-3">
                  {kataStats.recentPerformances.map((perf, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{perf.eventName} - {perf.round}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {format(new Date(perf.date), 'MMM dd, yyyy HH:mm')}
                          {perf.place && ` • Place: ${perf.place}${perf.place === 1 ? 'st' : perf.place === 2 ? 'nd' : perf.place === 3 ? 'rd' : 'th'}`}
                        </p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Score</p>
                          <p className="text-lg font-bold text-gray-800">{perf.score}</p>
                        </div>
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${perf.result === 'Win'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                              }`}
                          >
                            {perf.result}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No Kata performances completed yet</p>
              </div>
            )}
          </div>

          {/* Overall Summary (if both have data) */}
          {(kumiteStats.totalMatches > 0 || kataStats.totalPerformances > 0) && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-2xl font-bold mb-4">Overall Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-blue-100 text-sm">Total Events</p>
                  <p className="text-3xl font-bold">{kumiteStats.totalMatches + kataStats.totalPerformances}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Total Wins</p>
                  <p className="text-3xl font-bold">{kumiteStats.wins + kataStats.wins}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Total Losses</p>
                  <p className="text-3xl font-bold">{kumiteStats.losses + kataStats.losses}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-sm">Win Rate</p>
                  <p className="text-3xl font-bold">
                    {((kumiteStats.totalMatches + kataStats.totalPerformances) > 0
                      ? (((kumiteStats.wins + kataStats.wins) / (kumiteStats.totalMatches + kataStats.totalPerformances)) * 100).toFixed(1)
                      : 0)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No Data Message */}
          {kumiteStats.totalMatches === 0 && kataStats.totalPerformances === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiTrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Performance Data Yet</h3>
              <p className="text-gray-600">Complete matches and performances to see your statistics here</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlayerPerformance;
