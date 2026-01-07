import React from 'react';
import { FiAward, FiTrendingUp, FiUser, FiFileText, FiCalendar } from 'react-icons/fi';
import { format } from 'date-fns';

const KataReportView = ({ report }) => {
  if (!report || !report.report_data) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No report available yet</p>
      </div>
    );
  }

  const { tournament_name, category_name, generated_at, rounds } = report.report_data;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Report Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center">
              <FiFileText className="mr-2 text-blue-600" />
              Kata Event Report
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
      <div className="space-y-6">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FiAward className="mr-2 text-xl" />
                  <h4 className="text-xl font-bold">{round.round_name}</h4>
                </div>
                <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-semibold">
                  {round.players.length} Player{round.players.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {round.players.map((player, playerIndex) => (
                <div
                  key={playerIndex}
                  className={`p-4 ${
                    round.round_name === 'Third Round (Final 4)' && player.place === 1
                      ? 'bg-gradient-to-r from-yellow-50 to-transparent'
                      : round.round_name === 'Third Round (Final 4)' && player.place === 2
                      ? 'bg-gradient-to-r from-gray-50 to-transparent'
                      : round.round_name === 'Third Round (Final 4)' && player.place === 3
                      ? 'bg-gradient-to-r from-orange-50 to-transparent'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Ranking Badge for Final 4 */}
                      {round.round_name === 'Third Round (Final 4)' && player.place !== null && player.place !== undefined ? (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${
                          player.place === 1 ? 'bg-yellow-400 text-yellow-900' :
                          player.place === 2 ? 'bg-gray-300 text-gray-800' :
                          'bg-orange-300 text-orange-900'
                        }`}>
                          {player.place === 1 ? '🥇' : player.place === 2 ? '🥈' : '🥉'}
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          playerIndex === 0 ? 'bg-yellow-400 text-yellow-900' :
                          playerIndex === 1 ? 'bg-gray-300 text-gray-800' :
                          playerIndex === 2 ? 'bg-orange-300 text-orange-900' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {playerIndex + 1}
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FiUser className="w-4 h-4 text-green-600" />
                          <h4 className="font-semibold text-gray-800">{player.player_name}</h4>
                          {/* Ranking badge for Final 4 */}
                          {round.round_name === 'Third Round (Final 4)' && player.place !== null && player.place !== undefined && (
                            <span className={`px-3 py-1 rounded text-xs font-bold ${
                              player.place === 1 ? 'bg-yellow-200 text-yellow-800' :
                              player.place === 2 ? 'bg-gray-200 text-gray-800' :
                              'bg-orange-200 text-orange-800'
                            }`}>
                              {player.place === 1 ? '🥇 1st Place' :
                               player.place === 2 ? '🥈 2nd Place' :
                               '🥉 3rd Place'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>Belt: {player.belt_rank}</span>
                          <span>•</span>
                          <span>Dojo: {player.dojo_name}</span>
                          {player.final_score !== null && player.final_score !== undefined && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-green-600">
                                Final Score: {player.final_score.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Judge Scores */}
                        {player.scores && player.scores.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-gray-500 font-medium">Judge Scores:</span>
                            {player.scores.map((score, scoreIndex) => (
                              <span
                                key={scoreIndex}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold"
                              >
                                {score.judge_name}: {score.score.toFixed(1)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KataReportView;

