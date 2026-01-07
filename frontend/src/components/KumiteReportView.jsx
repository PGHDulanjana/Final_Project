import React from 'react';
import { FiAward, FiTrendingUp, FiUser, FiFileText, FiCalendar, FiUsers } from 'react-icons/fi';
import { format } from 'date-fns';

const KumiteReportView = ({ report }) => {
  if (!report || !report.report_data) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No report available yet</p>
      </div>
    );
  }

  const { tournament_name, category_name, generated_at, rounds, final_rankings } = report.report_data;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Report Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <FiFileText className="mr-2 text-red-600" />
              Kumite Event Report
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {tournament_name} • {category_name}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center text-sm text-gray-600">
              <FiCalendar className="mr-1" />
              {format(new Date(generated_at), 'MMM dd, yyyy HH:mm')}
            </div>
            <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              ✓ Published
            </span>
          </div>
        </div>
      </div>

      {/* Rounds */}
      {rounds && rounds.length > 0 && (
        <div className="space-y-6 mb-6">
          {rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FiAward className="mr-2 text-xl" />
                    <h4 className="text-xl font-bold">{round.round_name}</h4>
                  </div>
                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-semibold">
                    {round.matches.length} Match{round.matches.length !== 1 ? 'es' : ''}
                  </span>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {round.matches.map((match, matchIndex) => (
                  <div key={matchIndex} className="p-4 hover:bg-gray-50 transition">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-gray-800">{match.match_name}</h5>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          match.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          match.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {match.status}
                        </span>
                      </div>
                      {match.scheduled_time && (
                        <p className="text-xs text-gray-500">
                          {format(new Date(match.scheduled_time), 'MMM dd, yyyy HH:mm')}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {match.participants && match.participants.map((participant, pIndex) => (
                        <div
                          key={pIndex}
                          className={`p-3 rounded-lg border-2 ${
                            participant.is_winner
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1">
                              {participant.is_winner && (
                                <span className="text-xl">🏆</span>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  {report.report_data.participation_type === 'Team' ? (
                                    <FiUsers className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <FiUser className="w-4 h-4 text-green-600" />
                                  )}
                                  <p className="font-semibold text-gray-800">{participant.player_name}</p>
                                </div>
                                <div className="text-xs text-gray-600 space-x-2 mt-1">
                                  {participant.belt_rank && participant.belt_rank !== 'N/A' && (
                                    <span>Belt: {participant.belt_rank}</span>
                                  )}
                                  <span>Dojo: {participant.dojo_name}</span>
                                </div>
                                {participant.score && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Score: {participant.score.technical_score || 0} / {participant.score.performance_score || 0}
                                    {(participant.score.ippon > 0 || participant.score.waza_ari > 0) && (
                                      <span className="ml-2">
                                        (Ippon: {participant.score.ippon}, Waza-ari: {participant.score.waza_ari})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                participant.result === 'Win' ? 'bg-green-200 text-green-800' :
                                participant.result === 'Loss' ? 'bg-red-200 text-red-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {participant.result || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {match.winner && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-semibold text-green-700">
                          🏆 Winner: {match.winner.player_name}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {round.advanced_players && round.advanced_players.length > 0 && (
                <div className="bg-blue-50 border-t border-blue-200 px-6 py-3">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    Advanced to Next Round ({round.advanced_players.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {round.advanced_players.map((player, index) => (
                      <span key={index} className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-700">
                        {player.player_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Final Rankings */}
      {final_rankings && final_rankings.length > 0 && (
        <div className="border border-yellow-300 rounded-lg overflow-hidden bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4">
            <div className="flex items-center">
              <FiAward className="mr-2 text-xl" />
              <h4 className="text-xl font-bold">Final Rankings</h4>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {final_rankings.map((ranking, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    ranking.place === 1 ? 'bg-yellow-100 border-yellow-400' :
                    ranking.place === 2 ? 'bg-gray-100 border-gray-400' :
                    'bg-orange-100 border-orange-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      ranking.place === 1 ? 'bg-yellow-400 text-yellow-900' :
                      ranking.place === 2 ? 'bg-gray-300 text-gray-800' :
                      'bg-orange-300 text-orange-900'
                    }`}>
                      {ranking.place === 1 ? '🥇' : ranking.place === 2 ? '🥈' : '🥉'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800">{ranking.player_name}</p>
                      <p className="text-sm text-gray-600">{ranking.medal} Medal</p>
                      {ranking.belt_rank && ranking.belt_rank !== 'N/A' && (
                        <p className="text-xs text-gray-500">Belt: {ranking.belt_rank}</p>
                      )}
                      {ranking.dojo_name && (
                        <p className="text-xs text-gray-500">Dojo: {ranking.dojo_name}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KumiteReportView;

