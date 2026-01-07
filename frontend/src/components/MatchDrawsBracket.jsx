import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiAward, FiCheckCircle } from 'react-icons/fi';

const MatchDrawsBracket = ({ matches = [], category = null }) => {
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Build proper bracket tree structure
  const bracketTree = useMemo(() => {
    if (!matches || matches.length === 0) return null;

    // Group matches by round/level
    const roundsMap = {};
    matches.forEach(match => {
      const level = match.match_level || 'Preliminary';
      if (!roundsMap[level]) {
        roundsMap[level] = [];
      }
      roundsMap[level].push(match);
    });

    // Define round order
    const roundOrder = ['Preliminary', 'Quarterfinal', 'Semifinal', 'Bronze', 'Final'];
    
    // Sort rounds by order
    const rounds = roundOrder
      .filter(level => roundsMap[level])
      .map(level => ({
        level,
        matches: roundsMap[level].sort((a, b) => 
          (a.match_name || '').localeCompare(b.match_name || '')
        )
      }));

    // Count total participants
    const allParticipants = new Set();
    matches.forEach(match => {
      (match.participants || []).forEach(p => {
        if (p.player_id?._id) allParticipants.add(p.player_id._id.toString());
        if (p.team_id?._id) allParticipants.add(p.team_id._id.toString());
      });
    });

    return {
      rounds,
      totalParticipants: allParticipants.size
    };
  }, [matches]);

  const getParticipantName = (participant) => {
    if (participant.player_id?.user_id) {
      const user = participant.player_id.user_id;
      if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
      }
      return user.username || 'Unknown Player';
    }
    if (participant.team_id) {
      return participant.team_id.team_name || 'Unknown Team';
    }
    return 'Bye';
  };

  const getMatchStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-50 border-green-400';
      case 'In Progress':
        return 'bg-blue-50 border-blue-400';
      case 'Scheduled':
        return 'bg-yellow-50 border-yellow-400';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  // Participant Slot Component
  const ParticipantSlot = ({ participant, isWinner = false, matchStatus = 'Scheduled' }) => {
    if (!participant) {
      return (
        <div className="h-12 border border-dashed border-gray-300 rounded bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
          BYE
        </div>
      );
    }

    const name = getParticipantName(participant);
    const isCompleted = matchStatus === 'Completed';

    return (
      <div className={`h-12 border-2 rounded flex items-center px-2 ${
        isWinner && isCompleted 
          ? 'bg-yellow-100 border-yellow-500 font-bold' 
          : 'bg-white border-gray-300'
      }`}>
        <div className="flex items-center space-x-1 flex-1 min-w-0">
          {participant.player_id ? (
            <FiUsers className="w-3 h-3 text-blue-600 flex-shrink-0" />
          ) : (
            <FiAward className="w-3 h-3 text-purple-600 flex-shrink-0" />
          )}
          <span className="text-xs font-medium truncate">{name}</span>
        </div>
        {isCompleted && participant.result && (
          <span className="text-xs font-bold text-green-600 ml-1">{participant.result}</span>
        )}
      </div>
    );
  };

  // Match Box Component
  const MatchBox = ({ match, roundIndex, matchIndex, totalMatchesInRound }) => {
    const participants = match.participants || [];
    const winner = match.winner_id;
    const isCompleted = match.status === 'Completed';
    const participant1 = participants.find(p => p.position === 'Player 1' || participants.indexOf(p) === 0);
    const participant2 = participants.find(p => p.position === 'Player 2' || participants.indexOf(p) === 1);

    const isWinner1 = winner && participant1 && (
      participant1.player_id?._id?.toString() === winner.toString() ||
      participant1.team_id?._id?.toString() === winner.toString()
    );
    const isWinner2 = winner && participant2 && (
      participant2.player_id?._id?.toString() === winner.toString() ||
      participant2.team_id?._id?.toString() === winner.toString()
    );

    return (
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: (roundIndex * 0.1) + (matchIndex * 0.05) }}
          className={`border-2 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all ${getMatchStatusColor(match.status)} ${
            isCompleted ? 'ring-2 ring-green-400 ring-opacity-50' : ''
          }`}
          onClick={() => setSelectedMatch(match)}
          style={{ minWidth: '200px' }}
        >
          {/* Match Header */}
          <div className={`text-white text-xs px-2 py-1 text-center font-semibold flex items-center justify-between ${
            match.status === 'Completed' ? 'bg-green-600' : 'bg-gray-800'
          }`}>
            <span className="flex-1">{match.match_name || match.match_level}</span>
            {match.status === 'Completed' && (
              <FiCheckCircle className="w-4 h-4 ml-1 flex-shrink-0" title="Match Completed" />
            )}
          </div>
          
          {/* Status Badge */}
          {match.status === 'Completed' && (
            <div className="bg-green-100 border-b border-green-300 px-2 py-1 text-center">
              <span className="text-xs font-bold text-green-800 flex items-center justify-center">
                <FiCheckCircle className="w-3 h-3 mr-1" />
                COMPLETED
              </span>
            </div>
          )}
          
          {/* Participants */}
          <div className="divide-y divide-gray-200">
            <ParticipantSlot 
              participant={participant1} 
              isWinner={isWinner1}
              matchStatus={match.status}
            />
            <ParticipantSlot 
              participant={participant2} 
              isWinner={isWinner2}
              matchStatus={match.status}
            />
          </div>
          
          {/* Match Info */}
          <div className={`text-xs px-2 py-1 text-center border-t ${
            match.status === 'Completed' 
              ? 'bg-green-50 text-green-700 font-semibold' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {match.status === 'Completed' && match.completed_at ? (
              <div>
                <div className="font-bold">✓ Completed</div>
                <div className="text-xs opacity-75">
                  {new Date(match.completed_at).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ) : match.scheduled_time ? (
              new Date(match.scheduled_time).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            ) : (
              <span className="text-gray-400">Not scheduled</span>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  // Round Column Component
  const RoundColumn = ({ round, matches, roundIndex, totalRounds }) => {
    const isFirstRound = roundIndex === 0;
    const isLastRound = roundIndex === totalRounds - 1;

    return (
      <div className="flex flex-col items-center relative" style={{ minWidth: '220px' }}>
        {/* Round Header */}
        <div className="mb-4 text-center sticky top-0 bg-white z-10 pb-2 border-b-2 border-gray-400 w-full">
          <h3 className="font-bold text-lg text-gray-800">{round}</h3>
          <p className="text-sm text-gray-600">{matches.length} {matches.length === 1 ? 'Match' : 'Matches'}</p>
        </div>

        {/* Matches */}
        <div className="flex flex-col space-y-4 w-full">
          {matches.map((match, matchIndex) => {
            const spacing = 120; // Vertical spacing between matches
            const topPosition = matchIndex * spacing;

            return (
              <div key={match._id || matchIndex} className="relative" style={{ minHeight: `${spacing}px` }}>
                <MatchBox 
                  match={match} 
                  roundIndex={roundIndex}
                  matchIndex={matchIndex}
                  totalMatchesInRound={matches.length}
                />
                
                {/* Connecting lines to next round */}
                {!isLastRound && (
                  <>
                    {/* Horizontal line to the right */}
                    <div 
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 z-0"
                      style={{ 
                        width: '60px',
                        height: '2px',
                        backgroundColor: '#9CA3AF'
                      }}
                    />
                    
                    {/* Vertical connector for pairs */}
                    {matchIndex % 2 === 0 && matchIndex < matches.length - 1 && (
                      <div 
                        className="absolute right-0 z-0"
                        style={{
                          width: '60px',
                          top: '50%',
                          height: `${spacing + 32}px`,
                          borderRight: '2px solid #9CA3AF',
                          borderTop: '2px solid #9CA3AF',
                          borderBottom: '2px solid #9CA3AF'
                        }}
                      />
                    )}
                    
                    {/* Vertical line for odd matches (connects to next round) */}
                    {matchIndex % 2 === 1 && (
                      <div 
                        className="absolute right-0 z-0"
                        style={{
                          width: '60px',
                          top: '50%',
                          height: `${spacing - 32}px`,
                          borderRight: '2px solid #9CA3AF'
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!bracketTree || bracketTree.rounds.length === 0) {
    return (
      <div className="w-full">
        {category && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
            <h2 className="text-2xl font-bold">{category.category_name}</h2>
            <p className="text-sm opacity-90">
              {category.category_type} • {category.weight_category || 'Open'} • {category.belt_category || 'All Belts'}
            </p>
          </div>
        )}
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No matches scheduled yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {category && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
          <h2 className="text-2xl font-bold">{category.category_name}</h2>
          <p className="text-sm opacity-90">
            {category.category_type} • {category.weight_category || 'Open'} • {category.belt_category || 'All Belts'}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {bracketTree.totalParticipants} Participants • Single Elimination Bracket
          </p>
        </div>
      )}

      {/* Bracket Visualization */}
      <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
        <div className="flex justify-start items-start relative" style={{ minWidth: `${bracketTree.rounds.length * 280}px` }}>
          {bracketTree.rounds.map((round, roundIndex) => (
            <React.Fragment key={round.level}>
              <RoundColumn
                round={round.level}
                matches={round.matches}
                roundIndex={roundIndex}
                totalRounds={bracketTree.rounds.length}
              />
              {/* Spacer between rounds */}
              {roundIndex < bracketTree.rounds.length - 1 && (
                <div className="w-8 flex-shrink-0"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

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
            <h3 className="text-2xl font-bold mb-4">{selectedMatch.match_name || selectedMatch.match_level}</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Participants</h4>
                <div className="space-y-2">
                  {selectedMatch.participants?.map((p, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      {getParticipantName(p)}
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
              {selectedMatch.venue_area && (
                <div>
                  <h4 className="font-semibold mb-2">Venue</h4>
                  <p>{selectedMatch.venue_area}</p>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Status</h4>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded font-semibold ${
                    selectedMatch.status === 'Completed' 
                      ? 'bg-green-100 text-green-800 border-2 border-green-400' 
                      : selectedMatch.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-400'
                      : 'bg-gray-100 text-gray-800 border-2 border-gray-400'
                  }`}>
                    {selectedMatch.status === 'Completed' && <FiCheckCircle className="inline w-4 h-4 mr-1" />}
                    {selectedMatch.status}
                  </span>
                  {selectedMatch.status === 'Completed' && selectedMatch.completed_at && (
                    <span className="text-sm text-gray-600">
                      at {new Date(selectedMatch.completed_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              {selectedMatch.status === 'Completed' && selectedMatch.winner_id && (
                <div>
                  <h4 className="font-semibold mb-2">Winner</h4>
                  <div className="p-3 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                    {selectedMatch.participants?.find(p => {
                      const pId = p.player_id?._id || p.team_id?._id;
                      return pId?.toString() === selectedMatch.winner_id?.toString();
                    }) ? (
                      <p className="font-bold text-yellow-800">
                        🏆 {getParticipantName(selectedMatch.participants.find(p => {
                          const pId = p.player_id?._id || p.team_id?._id;
                          return pId?.toString() === selectedMatch.winner_id?.toString();
                        }))}
                      </p>
                    ) : (
                      <p className="text-gray-600">Winner ID: {selectedMatch.winner_id}</p>
                    )}
                  </div>
                </div>
              )}
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
