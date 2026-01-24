import { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import kataPerformanceService from '../../services/kataPerformanceService';
import { playerService } from '../../services/playerService';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import Layout from '../../components/Layout';

const PlayerResults = () => {
  const { user } = useAuth();
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. First get the Player Profile ID 
      // Check if player_id is already in user object
      let playerId = null;
      if (user.player_id) {
        playerId = user.player_id._id || user.player_id;
      } else {
        // Fallback fetch
        try {
          const playersRes = await playerService.getPlayers();
          const allPlayers = playersRes.data || [];
          const profile = allPlayers.find(p => {
            const pUserId = p.user_id?._id || p.user_id;
            return String(pUserId) === String(user._id);
          });
          if (profile) playerId = profile._id;
        } catch (e) { console.error(e); }
      }

      // Get matches (Removed strict status filter to show ongoing)
      const matchesRes = await matchService.getMatches({});
      const completedMatches = matchesRes.data || [];

      // Get all scores
      const scoresRes = await scoreService.getScores();
      const allScores = scoresRes.data || [];

      // Get Kata performances
      let kataPerformances = [];
      if (playerId) {
        try {
          const kataRes = await kataPerformanceService.getPerformances({
            player_id: playerId
          });
          // Ensure we only process those with a final score
          kataPerformances = (kataRes.data || []).filter(p => p.final_score !== null && p.final_score !== undefined);
        } catch (err) {
          console.error("Error fetching Kata performances", err);
        }
      }

      setMatches(completedMatches);
      setScores(allScores);

      // Process results from matches and scores
      const processedResults = processResults(completedMatches, allScores, kataPerformances, playerId);
      setResults(processedResults);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  const processResults = (matches, allScores, kataPerformances, playerId) => {
    if (!user) return [];

    const resultsList = [];
    const userId = user._id;

    // --- Process KUMITE Matches ---
    matches.forEach((match) => {
      // 1. Find if the current user participated in this match
      // Check both individual (player_id -> user_id) and team (team_id -> members -> player_id -> user_id)
      let myParticipantId = null;
      let myParticipant = null;

      const myParticipation = match.participants?.find(p => {
        // Individual check
        if (p.player_id && (p.player_id.user_id?._id === userId || p.player_id.user_id === userId)) {
          return true;
        }
        // Team check (if populated)
        if (p.team_id) {
          // 1. Check members
          if (p.team_id.members && Array.isArray(p.team_id.members)) {
            const inMembers = p.team_id.members.some(member =>
              (member.player_id?.user_id?._id === userId || member.player_id?.user_id === userId || member.player_id === userId)
            );
            if (inMembers) return true;
          }
          // 2. Fallback Team ID check
          // We might not have playerProfile here easily unless we passed it, but let's assume Members check is sufficient for Results page usually, 
          // or we rely on the fact we are looking for *my* matches.
        }
        return false;
      });

      if (!myParticipation) return; // Skip

      // Identified the user's participation record
      myParticipantId = myParticipation._id;
      myParticipant = myParticipation;

      // 2. Get all scores for this match to determine ranking
      const matchScores = allScores.filter(
        score => score.match_id?._id === match._id || score.match_id === match._id
      );

      // Check for explicit result or score existence
      const matchWinnerIdStr = match.winner_id?._id?.toString() || match.winner_id?.toString();
      let isWin = false;
      let explicitResult = 'Participated'; // Default

      if (matchWinnerIdStr) {
        const myPlayerId = myParticipant.player_id?._id?.toString() || myParticipant.player_id?.toString();
        const myTeamId = myParticipant.team_id?._id?.toString() || myParticipant.team_id?.toString();

        if ((myPlayerId && matchWinnerIdStr === myPlayerId) || (myTeamId && matchWinnerIdStr === myTeamId)) {
          isWin = true;
        }
      }
      if (myParticipant.result === 'Win') isWin = true;

      // If match is not completed and no winner, but I have scores, show as Pending/Participated?
      // Or just 'Completed' if it has scores? 
      // Let's use scores to determine if we should show it at all? 
      // The user wants to see "Round progression".

      if (isWin) explicitResult = 'Win';
      else if (match.winner_id) explicitResult = 'Loss';

      // ... (Score calculation logic same as before) ...
      let avgScore = 0;
      if (matchScores.length > 0) {
        // ...
        const myScores = matchScores.filter(s => s.participant_id?._id === myParticipantId || s.participant_id === myParticipantId);
        if (myScores.length > 0) {
          // ... sum ...
          const total = myScores.reduce((sum, s) => sum + (s.final_score || 0), 0);
          avgScore = total / myScores.length;
        }
      }

      // Only add to list if we have a score OR a result OR match is completed
      if (avgScore > 0 || explicitResult !== 'Participated' || match.status === 'Completed') {
        resultsList.push({
          id: `${match._id}-${myParticipantId}`,
          tournament: match.tournament_id?.tournament_name || 'Tournament',
          category: match.category_id?.category_name || match.match_type || 'Category',
          date: format(new Date(match.completed_at || match.scheduled_time), 'yyyy-MM-dd'),
          result: explicitResult,
          score: avgScore.toFixed(1),
          placement: isWin ? '1st Place' : '2nd Place', // simplified
          points: isWin ? 100 : 50,
          round: match.match_level || 'Final',
          matchType: match.match_type,
          finalScore: avgScore,
        });
      }
    });

    // --- Process KATA Performances ---
    if (kataPerformances && kataPerformances.length > 0) {
      kataPerformances.forEach(perf => {
        const round = perf.round || 'First Round';
        let explicitResult = 'Participated';
        let points = 25;
        let placement = 'Participant';

        if (perf.place) {
          placement = perf.place === 1 ? '1st Place' : perf.place === 2 ? '2nd Place' : perf.place === 3 ? '3rd Place' : `${perf.place}th Place`;
          if (perf.place === 1) { explicitResult = 'Win'; points = 100; }
          else if (perf.place === 2) { explicitResult = 'Runner Up'; points = 75; }
          else if (perf.place === 3) { explicitResult = '3rd Place'; points = 50; }
        }

        if (round === 'Third Round (Final 4)' && perf.place && perf.place <= 3) {
          explicitResult = 'Win';
        }

        resultsList.push({
          id: `kata-${perf._id}`,
          tournament: perf.category_id?.tournament_id?.tournament_name || 'Tournament',
          category: perf.category_id?.category_name || 'Kata',
          date: format(new Date(perf.completed_at || perf.createdAt), 'yyyy-MM-dd'),
          result: explicitResult,
          score: (perf.final_score || 0).toFixed(2),
          placement: placement,
          points: points,
          round: round,
          matchType: 'Kata',
          finalScore: perf.final_score
        });
      });
    }

    return resultsList.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredResults = results.filter(result => {
    const matchesCategory = filterCategory === 'all' ||
      result.category.toLowerCase().includes(filterCategory.toLowerCase()) ||
      result.matchType?.toLowerCase().includes(filterCategory.toLowerCase());
    const matchesYear = filterYear === 'all' || result.date.startsWith(filterYear);
    return matchesCategory && matchesYear;
  });

  const totalPoints = results.reduce((sum, result) => sum + result.points, 0);
  const totalWins = results.filter(r => r.result === 'Win').length;
  const totalLosses = results.filter(r => r.result === 'Loss').length;
  const firstPlaceCount = results.filter(r => r.placement === '1st Place').length;

  // Get unique years for filter
  const years = Array.from(new Set(results.map(r => r.date.split('-')[0]))).sort((a, b) => parseInt(b) - parseInt(a));

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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              My Results
            </h1>
            <p className="text-gray-600">View your competition results and performance history</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Competitions</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{results.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Wins</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{totalWins}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Losses</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{totalLosses}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">1st Place Finishes</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{firstPlaceCount}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Points</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{totalPoints}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="category-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Category</label>
                <select
                  id="category-filter"
                  name="category-filter"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  <option value="kata">Kata</option>
                  <option value="kumite">Kumite</option>
                  <option value="team">Team Events</option>
                </select>
              </div>
              <div>
                <label htmlFor="year-filter" className="block text-sm font-semibold text-gray-700 mb-2">Filter by Year</label>
                <select
                  id="year-filter"
                  name="year-filter"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value="all">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Tournament</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Result</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Placement</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResults.map((result, index) => (
                    <tr key={result.id} className={index % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'} style={{ transition: 'background-color 0.2s' }}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-800">{result.tournament}</div>
                          <div className="text-sm text-gray-500">{result.round}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                          {result.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{result.date}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.result === 'Win' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {result.result} ({result.score})
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${result.placement === '1st Place' ? 'bg-yellow-100 text-yellow-700' :
                          result.placement === '2nd Place' ? 'bg-gray-200 text-gray-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                          {result.placement}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                          +{result.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredResults.length === 0 && (
              <div className="p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Results Found</h3>
                <p className="text-gray-600">No results match your current filter criteria.</p>
              </div>
            )}
          </div>

          {/* Performance Chart */}
          {results.length > 0 && (
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Performance Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Win/Loss Ratio</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-green-600">Wins</span>
                        <span className="text-sm font-bold text-gray-800">
                          {totalWins} ({results.length > 0 ? Math.round((totalWins / results.length) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${results.length > 0 ? (totalWins / results.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-red-600">Losses</span>
                        <span className="text-sm font-bold text-gray-800">
                          {totalLosses} ({results.length > 0 ? Math.round((totalLosses / results.length) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-red-500 to-orange-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${results.length > 0 ? (totalLosses / results.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Placement Distribution</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-yellow-600">1st Place</span>
                        <span className="text-sm font-bold text-gray-800">
                          {firstPlaceCount} ({results.length > 0 ? Math.round((firstPlaceCount / results.length) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-yellow-500 to-amber-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${results.length > 0 ? (firstPlaceCount / results.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-600">2nd/3rd Place</span>
                        <span className="text-sm font-bold text-gray-800">
                          {results.length - firstPlaceCount} ({results.length > 0 ? Math.round(((results.length - firstPlaceCount) / results.length) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-gradient-to-r from-gray-400 to-gray-600 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${results.length > 0 ? ((results.length - firstPlaceCount) / results.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlayerResults;

