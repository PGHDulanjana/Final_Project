import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiAward, FiChevronRight } from 'react-icons/fi';

const MatchDrawsBracket = ({ matches = [], category = null }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Organize matches into bracket structure
  const organizeBracket = (matches) => {
    if (!matches || matches.length === 0) return { rounds: [] };

    // Group matches by round/level
    const roundsMap = {};
    matches.forEach(match => {
      const level = match.match_level || 'Round 1';
      if (!roundsMap[level]) {
        roundsMap[level] = [];
      }
      roundsMap[level].push(match);
    });

    // Convert to array and sort
    const rounds = Object.keys(roundsMap)
      .sort()
      .map(level => ({
        level,
        matches: roundsMap[level].sort((a, b) => 
          new Date(a.scheduled_time) - new Date(b.scheduled_time)
        )
      }));

    return { rounds };
  };

  const { rounds } = organizeBracket(matches);

  const getMatchStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 border-green-500 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 border-blue-500 text-blue-800';
      case 'Scheduled':
        return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const MatchCard = ({ match, roundIndex, matchIndex }) => {
    const participants = match.participants || [];
    const winner = match.winner_id;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: (roundIndex * 0.1) + (matchIndex * 0.05) }}
        className={`relative border-2 rounded-lg p-4 mb-4 cursor-pointer hover:shadow-lg transition-all ${
          getMatchStatusColor(match.status)
        }`}
        onClick={() => setSelectedMatch(match)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold">{match.match_name || `Match ${matchIndex + 1}`}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            match.status === 'Completed' ? 'bg-green-200' :
            match.status === 'In Progress' ? 'bg-blue-200' :
            'bg-yellow-200'
          }`}>
            {match.status}
          </span>
        </div>

        <div className="space-y-2">
          {participants.map((participant, idx) => {
            const isWinner = winner && (
              participant.player_id?._id === winner ||
              participant.team_id?._id === winner
            );
            const participantName = participant.player_id?.user_id?.username ||
                                   participant.team_id?.team_name ||
                                   `Participant ${idx + 1}`;

            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded ${
                  isWinner ? 'bg-yellow-200 font-bold' : 'bg-white'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {participant.player_id ? (
                    <FiUsers className="w-4 h-4" />
                  ) : (
                    <FiAward className="w-4 h-4" />
                  )}
                  <span>{participantName}</span>
                </div>
                {match.status === 'Completed' && participant.result && (
                  <span className="text-sm font-semibold">{participant.result}</span>
                )}
              </div>
            );
          })}
        </div>

        {match.scheduled_time && (
          <div className="mt-2 text-xs text-gray-600">
            {new Date(match.scheduled_time).toLocaleString()}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      {category && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
          <h2 className="text-2xl font-bold">{category.category_name}</h2>
          <p className="text-sm opacity-90">
            {category.category_type} • {category.weight_category || 'Open'} • {category.belt_category || 'All Belts'}
          </p>
        </div>
      )}

      {rounds.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No matches scheduled yet</p>
        </div>
      ) : (
        <div className="flex space-x-4 pb-4">
          {rounds.map((round, roundIndex) => (
            <div key={round.level} className="flex-shrink-0" style={{ minWidth: '280px' }}>
              <div className="sticky top-0 bg-white z-10 mb-4 pb-2 border-b-2 border-gray-300">
                <h3 className="text-lg font-bold text-gray-800">{round.level}</h3>
                <p className="text-sm text-gray-600">{round.matches.length} matches</p>
              </div>
              <div>
                {round.matches.map((match, matchIndex) => (
                  <MatchCard
                    key={match._id}
                    match={match}
                    roundIndex={roundIndex}
                    matchIndex={matchIndex}
                  />
                ))}
              </div>
              {roundIndex < rounds.length - 1 && (
                <div className="flex items-center justify-center my-4">
                  <FiChevronRight className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMatch(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-4">{selectedMatch.match_name}</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Participants</h4>
                <div className="space-y-2">
                  {selectedMatch.participants?.map((p, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      {p.player_id?.user_id?.username || p.team_id?.team_name || `Participant ${idx + 1}`}
                    </div>
                  ))}
                </div>
              </div>
              {selectedMatch.scheduled_time && (
                <div>
                  <h4 className="font-semibold mb-2">Scheduled Time</h4>
                  <p>{new Date(selectedMatch.scheduled_time).toLocaleString()}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Status</h4>
                <span className={`px-3 py-1 rounded ${getMatchStatusColor(selectedMatch.status)}`}>
                  {selectedMatch.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedMatch(null)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MatchDrawsBracket;

