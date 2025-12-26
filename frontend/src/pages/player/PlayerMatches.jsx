import { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import Layout from '../../components/Layout';

const PlayerMatches = () => {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [matches, setMatches] = useState([]);
  const [playerMatches, setPlayerMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get all matches
      const matchesRes = await matchService.getMatches();
      const allMatches = matchesRes.data || [];

      // Get all scores to help determine results
      const scoresRes = await scoreService.getScores();
      const allScores = scoresRes.data || [];

      // Get detailed match data with participants
      const matchesWithDetails = await Promise.all(
        allMatches.map(async (match) => {
          try {
            const matchDetail = await matchService.getMatch(match._id);
            return matchDetail.data || match;
          } catch (error) {
            return match;
          }
        })
      );

      // Process matches to find player's matches
      const processedMatches = processPlayerMatches(matchesWithDetails, allScores, user);
      setMatches(allMatches);
      setPlayerMatches(processedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const processPlayerMatches = (matches, scores, currentUser) => {
    const playerMatchesList = [];

    matches.forEach((match) => {
      const participants = match.participants || [];
      
      // Find if current user is a participant
      const playerParticipant = participants.find(p => {
        const playerUserId = p.player_id?.user_id?._id || p.player_id?.user_id;
        return playerUserId === currentUser?._id || playerUserId?.toString() === currentUser?._id?.toString();
      });

      if (playerParticipant) {
        // Get opponent
        const opponent = participants.find(p => {
          const playerUserId = p.player_id?.user_id?._id || p.player_id?.user_id;
          return playerUserId !== currentUser?._id && playerUserId?.toString() !== currentUser?._id?.toString();
        });

        // Get scores for this match
        const matchScores = scores.filter(
          score => score.match_id?._id === match._id || score.match_id === match._id
        );

        // Determine result
        let result = 'Pending';
        let score = null;

        if (match.status === 'Completed') {
          // Check participant result first
          if (playerParticipant.result) {
            result = playerParticipant.result;
          } else if (match.winner_id) {
            // Check if player is winner
            const playerId = playerParticipant.player_id?._id || playerParticipant.player_id;
            const winnerId = match.winner_id?._id || match.winner_id;
            result = playerId?.toString() === winnerId?.toString() ? 'Win' : 'Loss';
          } else if (matchScores.length > 0) {
            // Calculate from scores
            const playerScores = matchScores.filter(s => {
              const participantId = s.participant_id?._id || s.participant_id;
              return participantId?.toString() === (playerParticipant._id?.toString() || playerParticipant._id);
            });
            const opponentScores = matchScores.filter(s => {
              const participantId = s.participant_id?._id || s.participant_id;
              return participantId?.toString() !== (playerParticipant._id?.toString() || playerParticipant._id);
            });

            if (playerScores.length > 0 && opponentScores.length > 0) {
              const playerAvg = playerScores.reduce((sum, s) => sum + (s.final_score || 0), 0) / playerScores.length;
              const opponentAvg = opponentScores.reduce((sum, s) => sum + (s.final_score || 0), 0) / opponentScores.length;
              result = playerAvg > opponentAvg ? 'Win' : playerAvg < opponentAvg ? 'Loss' : 'Draw';
              score = `${playerAvg.toFixed(1)}-${opponentAvg.toFixed(1)}`;
            }
          }
        }

        // Get opponent name
        const opponentName = opponent?.player_id?.user_id 
          ? `${opponent.player_id.user_id.first_name || ''} ${opponent.player_id.user_id.last_name || ''}`.trim() || 'Opponent'
          : opponent?.team_id?.team_name || 'Opponent';

        playerMatchesList.push({
          id: match._id,
          tournament: match.tournament_id?.tournament_name || 'Tournament',
          opponent: opponentName,
          category: match.category_id?.category_name || match.match_type || 'Category',
          date: format(new Date(match.scheduled_time), 'yyyy-MM-dd'),
          time: format(new Date(match.scheduled_time), 'hh:mm a'),
          venue: match.venue_area || match.tournament_id?.venue || 'Venue TBD',
          status: match.status === 'Completed' ? 'Completed' : match.status === 'In Progress' ? 'In Progress' : 'Upcoming',
          result: result,
          score: score,
          round: match.match_level || 'Match',
          matchType: match.match_type,
          scheduledTime: match.scheduled_time,
        });
      }
    });

    return playerMatchesList.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
  };

  const filteredMatches = playerMatches.filter(match => {
    const matchesFilter = filterStatus === 'all' || match.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = match.tournament.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.opponent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         match.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const upcomingCount = playerMatches.filter(m => m.status === 'Upcoming').length;
  const completedCount = playerMatches.filter(m => m.status === 'Completed').length;
  const winCount = playerMatches.filter(m => m.result === 'Win').length;
  const lossCount = playerMatches.filter(m => m.result === 'Loss').length;

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
              My Matches
            </h1>
            <p className="text-gray-600">View your upcoming and completed matches</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Matches</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{playerMatches.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-cyan-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{upcomingCount}</p>
                </div>
                <div className="p-3 bg-cyan-100 rounded-lg">
                  <svg className="w-8 h-8 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Wins</p>
                  <p className="text-3xl font-bold text-gray-800 mt-2">{winCount}</p>
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
                  <p className="text-3xl font-bold text-gray-800 mt-2">{lossCount}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by tournament, opponent, or category..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('upcoming')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'upcoming' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`flex-1 px-4 py-2 rounded-lg font-semibold transition duration-200 ${
                    filterStatus === 'completed' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div key={match.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className={`h-2 ${
                  match.status === 'Upcoming' || match.status === 'Scheduled' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}></div>
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{match.tournament}</h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                          {match.round}
                        </span>
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                          {match.category}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          match.status === 'Upcoming' || match.status === 'Scheduled' ? 'bg-cyan-100 text-cyan-700' : 
                          match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {match.status}
                        </span>
                        {match.result !== 'Pending' && match.result && (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            match.result === 'Win' ? 'bg-green-100 text-green-700' : 
                            match.result === 'Loss' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {match.result} {match.score ? `(${match.score})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-gray-600 mb-1">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">{match.date}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">{match.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'Y'}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">You</p>
                        <p className="font-bold text-gray-800">{user?.first_name || user?.username || 'You'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-2xl font-bold text-gray-400">VS</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                        {match.opponent.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Opponent</p>
                        <p className="font-bold text-gray-800">{match.opponent}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-semibold">{match.venue}</span>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition duration-200 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMatches.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Matches Found</h3>
              <p className="text-gray-600">No matches match your current filter criteria.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlayerMatches;

