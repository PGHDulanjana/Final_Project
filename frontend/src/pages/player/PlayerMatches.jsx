import { useState, useEffect } from 'react';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { registrationService } from '../../services/registrationService';
import { categoryService } from '../../services/categoryService';
import { playerService } from '../../services/playerService';
import kataPerformanceService from '../../services/kataPerformanceService';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { FiTarget, FiRefreshCw, FiAward, FiTrendingUp } from 'react-icons/fi';
import Layout from '../../components/Layout';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';

const PlayerMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kataPerformances, setKataPerformances] = useState([]);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Auto-refresh match draws every 30 seconds
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        if (user?._id) {
          loadData();
        }
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      
      // Get player profile
      let playerProfileData = null;
      try {
        const playersRes = await playerService.getPlayers();
        const allPlayers = playersRes.data || [];
        playerProfileData = allPlayers.find(p => {
          const playerUserId = p.user_id?._id || p.user_id;
          return String(playerUserId) === String(user._id);
        });
        setPlayerProfile(playerProfileData);
      } catch (error) {
        console.error('Error loading player profile:', error);
      }

      // Get all data in parallel
      const [matchesRes, registrationsRes, categoriesRes] = await Promise.all([
        matchService.getMatches(),
        registrationService.getRegistrations(),
        categoryService.getCategories()
      ]);

      setMatches(matchesRes.data || []);
      setRegistrations(registrationsRes.data || []);
      const allCategories = categoriesRes.data || [];
      setCategories(allCategories);

      // Load Kata performances for Kata events
      const kataCategories = allCategories.filter(c => 
        c.category_type === 'Kata' || c.category_type === 'Team Kata'
      );
      
      if (kataCategories.length > 0 && playerProfileData) {
        try {
          console.log('Loading Kata performances for categories:', kataCategories.map(c => c._id));
          const kataPromises = kataCategories.map(c => 
            kataPerformanceService.getPerformances({ category_id: c._id })
              .catch((err) => {
                console.error(`Error loading performances for category ${c._id}:`, err);
                return { data: [] };
              })
          );
          const kataResults = await Promise.all(kataPromises);
          const allKataPerformances = kataResults.flatMap(res => res.data || []);
          console.log('Loaded Kata performances:', allKataPerformances.length, allKataPerformances);
          setKataPerformances(allKataPerformances);
        } catch (error) {
          console.error('Error loading Kata performances:', error);
          setKataPerformances([]);
        }
      } else {
        console.log('No Kata categories or player profile:', { kataCategories: kataCategories.length, playerProfile: !!playerProfileData });
        setKataPerformances([]);
      }
    } catch (error) {
      console.error('Error loading match draws:', error);
    } finally {
      setLoading(false);
    }
  };


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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {(() => {
                    // Check if player has any Kata events registered
                    const hasKataEvents = registrations.some(r => {
                      const regPlayerId = r.player_id?._id || r.player_id;
                      const playerId = playerProfile?._id;
                      const isPlayerReg = (regPlayerId === playerId || regPlayerId?.toString() === playerId?.toString()) &&
                                         r.registration_type === 'Individual' &&
                                         r.approval_status === 'Approved' &&
                                         r.payment_status === 'Paid';
                      if (!isPlayerReg) return false;
                      const category = categories.find(c => {
                        const catId = c._id?.toString();
                        const regCatId = r.category_id?._id?.toString() || r.category_id?.toString();
                        return catId === regCatId;
                      });
                      return category && (category.category_type === 'Kata' || category.category_type === 'Team Kata');
                    });
                    return hasKataEvents ? 'Match Player List' : 'Match Draws';
                  })()}
                </h1>
                <p className="text-gray-600">
                  {(() => {
                    const hasKataEvents = registrations.some(r => {
                      const regPlayerId = r.player_id?._id || r.player_id;
                      const playerId = playerProfile?._id;
                      const isPlayerReg = (regPlayerId === playerId || regPlayerId?.toString() === playerId?.toString()) &&
                                         r.registration_type === 'Individual' &&
                                         r.approval_status === 'Approved' &&
                                         r.payment_status === 'Paid';
                      if (!isPlayerReg) return false;
                      const category = categories.find(c => {
                        const catId = c._id?.toString();
                        const regCatId = r.category_id?._id?.toString() || r.category_id?.toString();
                        return catId === regCatId;
                      });
                      return category && (category.category_type === 'Kata' || category.category_type === 'Team Kata');
                    });
                    return hasKataEvents 
                      ? 'View player lists and round progression for Kata events you are registered for'
                      : 'View match draws for events you are registered for';
                  })()}
                </p>
              </div>
              <button
                onClick={() => loadData()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Match Draws Content */}
          {(() => {
            // Get player's registered events (categories)
            const playerRegisteredEvents = registrations
              .filter(r => {
                const regPlayerId = r.player_id?._id || r.player_id;
                const playerId = playerProfile?._id;
                return (regPlayerId === playerId || regPlayerId?.toString() === playerId?.toString()) &&
                       r.registration_type === 'Individual' &&
                       r.approval_status === 'Approved' &&
                       r.payment_status === 'Paid';
              })
              .map(r => r.category_id?._id || r.category_id)
              .filter(Boolean);

            // Get categories for registered events
            const registeredCategories = categories.filter(c => 
              playerRegisteredEvents.some(eventId => 
                c._id?.toString() === eventId?.toString() || c._id === eventId
              )
            );

            // Group matches and Kata performances by category
            const matchesByCategory = {};
            console.log('Processing categories:', registeredCategories.length);
            console.log('Kata performances available:', kataPerformances.length);
            console.log('Matches available:', matches.length);
            
            registeredCategories.forEach(category => {
              const isKata = category.category_type === 'Kata' || category.category_type === 'Team Kata';
              
              if (isKata) {
                // For Kata events, check for Kata performances
                const eventKataPerformances = kataPerformances.filter(p => {
                  const perfCategoryId = p.category_id?._id || p.category_id;
                  const categoryIdStr = String(category._id);
                  const perfCategoryIdStr = String(perfCategoryId);
                  const matches = categoryIdStr === perfCategoryIdStr;
                  if (matches) {
                    console.log('Found Kata performance for category:', category.category_name, p);
                  }
                  return matches;
                });
                
                console.log(`Category ${category.category_name} (${category._id}): ${eventKataPerformances.length} performances`);
                
                // Always include Kata categories even if no performances yet (so player knows they're registered)
                matchesByCategory[category._id] = {
                  category,
                  matches: [], // No matches for Kata
                  kataPerformances: eventKataPerformances
                };
              } else {
                // For Kumite events, check for matches
                const categoryMatches = matches.filter(m => {
                  const matchCategoryId = m.category_id?._id || m.category_id;
                  return matchCategoryId?.toString() === category._id?.toString() || matchCategoryId === category._id;
                });
                if (categoryMatches.length > 0) {
                  matchesByCategory[category._id] = {
                    category,
                    matches: categoryMatches
                  };
                }
              }
            });

            // For Kata events, always show the category even if no performances yet
            // This allows players to see they're registered and waiting for rounds
            registeredCategories.forEach(category => {
              const isKata = category.category_type === 'Kata' || category.category_type === 'Team Kata';
              if (isKata && !matchesByCategory[category._id]) {
                matchesByCategory[category._id] = {
                  category,
                  matches: [],
                  kataPerformances: []
                };
              }
            });

            const hasMatchDraws = Object.keys(matchesByCategory).length > 0;

            if (registeredCategories.length === 0) {
              return (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Registered Events</h3>
                  <p className="text-gray-600 mb-4">You need to register and get approved for events to see match draws</p>
                </div>
              );
            }

            if (!hasMatchDraws) {
              // Check if there are Kata events registered
              const hasKataEvents = registeredCategories.some(c => 
                c.category_type === 'Kata' || c.category_type === 'Team Kata'
              );
              
              return (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {hasKataEvents ? 'No Player Lists Yet' : 'No Match Draws Yet'}
                  </h3>
                  <p className="text-gray-600">
                    {hasKataEvents 
                      ? 'Player lists and round progression will appear here once the organizer creates rounds for your registered Kata events'
                      : 'Match draws will appear here once the organizer creates them for your registered events'}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-8">
                {Object.values(matchesByCategory).map(({ category, matches: categoryMatches, kataPerformances: categoryKataPerformances }) => {
                  const isKata = category.category_type === 'Kata' || category.category_type === 'Team Kata';
                  const isKumite = category.category_type === 'Kumite' || category.category_type === 'Team Kumite';
                  
                  // Get Kata performances for this category (use from matchesByCategory or filter)
                  const eventKataPerformances = categoryKataPerformances || kataPerformances.filter(p => {
                    const perfCategoryId = p.category_id?._id || p.category_id;
                    return String(perfCategoryId) === String(category._id);
                  });

                  // Group Kata performances by round
                  const performancesByRound = {};
                  eventKataPerformances.forEach(perf => {
                    const round = perf.round || 'First Round';
                    if (!performancesByRound[round]) {
                      performancesByRound[round] = [];
                    }
                    performancesByRound[round].push(perf);
                  });

                  const rounds = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'];
                  
                  return (
                    <div key={category._id} className="bg-white rounded-xl shadow-lg p-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold text-gray-800">{category.category_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            isKata ? 'bg-blue-100 text-blue-700' :
                            isKumite ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {category.category_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {category.participation_type} • {
                            isKata 
                              ? `${Object.keys(performancesByRound).length} round${Object.keys(performancesByRound).length !== 1 ? 's' : ''} • ${eventKataPerformances.length} player${eventKataPerformances.length !== 1 ? 's' : ''}`
                              : `${categoryMatches.length} match${categoryMatches.length !== 1 ? 'es' : ''}`
                          }
                        </p>
                      </div>
                      
                      {isKata && eventKataPerformances.length > 0 ? (
                        // Display Kata rounds with player lists - Kata Event - Round Progression
                        <div className="space-y-6">
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <h4 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                              <FiTrendingUp className="mr-2 text-blue-600" />
                              Kata Event - Round Progression
                            </h4>
                            <p className="text-sm text-gray-600">
                              View players who advanced through each round. Players are ranked by final score.
                            </p>
                          </div>
                          {rounds.map(round => {
                            const roundPerformances = performancesByRound[round] || [];
                            if (roundPerformances.length === 0) return null;

                            // Sort performances: by place (for Final 4), then by final_score, then by performance_order
                            const sortedPerformances = [...roundPerformances].sort((a, b) => {
                              if (round === 'Third Round (Final 4)') {
                                if (a.place !== null && b.place !== null) {
                                  return a.place - b.place;
                                }
                                if (a.place !== null) return -1;
                                if (b.place !== null) return 1;
                              }
                              if (a.final_score === null && b.final_score === null) {
                                return (a.performance_order || 0) - (b.performance_order || 0);
                              }
                              if (a.final_score === null) return 1;
                              if (b.final_score === null) return -1;
                              if (b.final_score !== a.final_score) {
                                return b.final_score - a.final_score;
                              }
                              return (a.performance_order || 0) - (b.performance_order || 0);
                            });

                            return (
                              <div key={round} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FiAward className="w-5 h-5 text-blue-600" />
                                    {round}
                                  </h4>
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                    {roundPerformances.length} Player{roundPerformances.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  {sortedPerformances.map((performance, index) => {
                                    const playerName = performance.player_id?.user_id
                                      ? `${performance.player_id.user_id.first_name || ''} ${performance.player_id.user_id.last_name || ''}`.trim() || performance.player_id.user_id.username
                                      : 'Player';
                                    const isCurrentPlayer = playerProfile && (
                                      performance.player_id?._id?.toString() === playerProfile._id?.toString() ||
                                      performance.player_id?.toString() === playerProfile._id?.toString()
                                    );
                                    const scoresCount = performance.scores?.length || 0;
                                    
                                    return (
                                      <div
                                        key={performance._id}
                                        className={`rounded-lg p-4 border-2 transition ${
                                          isCurrentPlayer
                                            ? 'bg-blue-50 border-blue-400 shadow-md'
                                            : 'bg-white border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                              isCurrentPlayer
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700'
                                            }`}>
                                              {round === 'Third Round (Final 4)' && performance.place
                                                ? performance.place
                                                : index + 1}
                                            </div>
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <p className={`font-semibold ${
                                                  isCurrentPlayer ? 'text-blue-800' : 'text-gray-800'
                                                }`}>
                                                  {playerName}
                                                  {isCurrentPlayer && (
                                                    <span className="ml-2 text-xs text-blue-600">(You)</span>
                                                  )}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                                                <span>Order: {performance.performance_order}</span>
                                                {scoresCount > 0 && (
                                                  <span className="text-blue-600">
                                                    {scoresCount}/5 judges scored
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            {performance.final_score !== null ? (
                                              <div>
                                                <p className="text-2xl font-bold text-green-600">
                                                  {performance.final_score.toFixed(1)}
                                                </p>
                                                <p className="text-xs text-gray-500">Final Score</p>
                                              </div>
                                            ) : (
                                              <div>
                                                <p className="text-lg font-semibold text-gray-400">-</p>
                                                <p className="text-xs text-gray-500">Pending</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : isKata && eventKataPerformances.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">No rounds created yet. The organizer will create rounds for this event.</p>
                        </div>
                      ) : (
                        // Display Kumite match bracket
                        <MatchDrawsBracket 
                          matches={categoryMatches} 
                          category={category}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </Layout>
  );
};

export default PlayerMatches;

