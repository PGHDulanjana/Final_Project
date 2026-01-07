import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { registrationService } from '../../services/registrationService';
import { categoryService } from '../../services/categoryService';
import { playerService } from '../../services/playerService';
import { coachService } from '../../services/coachService';
import kataPerformanceService from '../../services/kataPerformanceService';
import Layout from '../../components/Layout';
import { FiTarget, FiRefreshCw, FiAward, FiTrendingUp } from 'react-icons/fi';
import { toast } from 'react-toastify';

const KataPlayerLists = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [players, setPlayers] = useState([]);
  const [kataPerformances, setKataPerformances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        if (user?._id) {
          loadData();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      
      const [registrationsRes, categoriesRes, playersRes] = await Promise.all([
        registrationService.getRegistrations(),
        categoryService.getCategories(),
        playerService.getPlayers(),
      ]);

      const allRegistrations = registrationsRes.data || [];
      const allCategories = categoriesRes.data || [];
      
      // Extract players data - handle nested response structure
      let allPlayers = [];
      if (playersRes) {
        if (Array.isArray(playersRes)) {
          allPlayers = playersRes;
        } else if (playersRes.data && Array.isArray(playersRes.data)) {
          allPlayers = playersRes.data;
        } else if (
          playersRes.data &&
          playersRes.data.data &&
          Array.isArray(playersRes.data.data)
        ) {
          allPlayers = playersRes.data.data;
        }
      }

      // Get coach profile to match players
      let coachProfile = null;
      try {
        const coachesRes = await coachService.getCoaches();
        let allCoaches = [];
        if (coachesRes) {
          if (Array.isArray(coachesRes)) {
            allCoaches = coachesRes;
          } else if (coachesRes.data && Array.isArray(coachesRes.data)) {
            allCoaches = coachesRes.data;
          } else if (
            coachesRes.data &&
            coachesRes.data.data &&
            Array.isArray(coachesRes.data.data)
          ) {
            allCoaches = coachesRes.data.data;
          }
        }
        coachProfile = allCoaches.find((c) => {
          const coachUserId = c.user_id?._id || c.user_id;
          const userIdStr = String(user._id);
          const coachUserIdStr = String(coachUserId);
          return coachUserIdStr === userIdStr || coachUserId === user._id;
        });
      } catch (error) {
        console.error("Error fetching coach profile:", error);
      }

      // Filter to get coach's players - use same logic as dashboard
      const coachProfileId = coachProfile?._id || user?.coach_id;
      const coachPlayers = allPlayers.filter((p) => {
        let playerCoachId = null;
        if (p.coach_id) {
          if (typeof p.coach_id === "object" && p.coach_id._id) {
            playerCoachId = p.coach_id._id;
          } else if (typeof p.coach_id === "object") {
            playerCoachId = p.coach_id._id || p.coach_id;
          } else {
            playerCoachId = p.coach_id;
          }
        }

        if (playerCoachId && coachProfileId) {
          const playerCoachIdStr = String(playerCoachId).trim();
          const coachProfileIdStr = String(coachProfileId).trim();
          if (playerCoachIdStr === coachProfileIdStr) {
            return true;
          }
        }

        // Fallback: match by user coach_id
        if (user?.coach_id) {
          const playerCoachId = p.coach_id?._id || p.coach_id;
          return String(playerCoachId) === String(user.coach_id) || playerCoachId === user.coach_id;
        }

        return false;
      });

      // Deduplicate players
      const uniquePlayers = [];
      const seenIds = new Set();
      coachPlayers.forEach((player) => {
        const playerId = player?._id ? String(player._id) : null;
        if (playerId && !seenIds.has(playerId)) {
          seenIds.add(playerId);
          uniquePlayers.push(player);
        }
      });

      setPlayers(uniquePlayers);
      setRegistrations(allRegistrations);
      const kataCategories = allCategories.filter(c => 
        c.category_type === 'Kata' || c.category_type === 'Team Kata'
      );
      setCategories(allCategories);

      // Load Kata performances
      if (kataCategories.length > 0) {
        try {
          const kataPromises = kataCategories.map(c => 
            kataPerformanceService.getPerformances({ category_id: c._id })
              .catch((err) => {
                console.error(`Error loading performances for category ${c._id}:`, err);
                return { data: [] };
              })
          );
          const kataResults = await Promise.all(kataPromises);
          const allKataPerformances = kataResults.flatMap(res => {
            if (res && res.data && Array.isArray(res.data)) {
              return res.data;
            }
            if (Array.isArray(res)) {
              return res;
            }
            return [];
          });
          setKataPerformances(allKataPerformances);
        } catch (error) {
          console.error('Error loading Kata performances:', error);
          setKataPerformances([]);
        }
      } else {
        setKataPerformances([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load player lists');
    } finally {
      setLoading(false);
    }
  };

  // Get coach's players' registered Kata events
  const coachPlayerRegistrations = registrations.filter(r => {
    const regPlayerId = r.player_id?._id || r.player_id;
    const isCoachPlayer = players.some(p => p._id === regPlayerId);
    return isCoachPlayer &&
           r.registration_type === 'Individual' &&
           r.approval_status === 'Approved' &&
           r.payment_status === 'Paid';
  });

  const kataEventIds = coachPlayerRegistrations
    .map(r => r.category_id?._id || r.category_id)
    .filter(Boolean);

  const kataCategories = categories.filter(c => 
    (c.category_type === 'Kata' || c.category_type === 'Team Kata') &&
    kataEventIds.some(eventId => 
      c._id?.toString() === eventId?.toString() || c._id === eventId
    )
  );

  // Group Kata performances by category
  const performancesByCategory = {};
  kataCategories.forEach(category => {
    const categoryPerformances = kataPerformances.filter(p => {
      const perfCategoryId = p.category_id?._id || p.category_id;
      return String(perfCategoryId) === String(category._id);
    });
    if (categoryPerformances.length > 0) {
      performancesByCategory[category._id] = {
        category,
        performances: categoryPerformances
      };
    }
  });

  // Always include Kata categories even if no performances yet
  kataCategories.forEach(category => {
    if (!performancesByCategory[category._id]) {
      performancesByCategory[category._id] = {
        category,
        performances: []
      };
    }
  });

  const hasKataEvents = Object.keys(performancesByCategory).length > 0;

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
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Kata Player Lists</h2>
                <p className="text-gray-600">View player lists and round progression for Kata events your players are registered for</p>
              </div>
              <button
                onClick={() => loadData()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {!hasKataEvents ? (
              <div className="text-center py-12">
                <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Kata Events Registered</h3>
                <p className="text-gray-600">Your players need to register and get approved for Kata events to see player lists</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.values(performancesByCategory).map(({ category, performances: categoryPerformances }) => {
                  // Group performances by round
                  const performancesByRound = {};
                  categoryPerformances.forEach(perf => {
                    const round = perf.round || 'First Round';
                    if (!performancesByRound[round]) {
                      performancesByRound[round] = [];
                    }
                    performancesByRound[round].push(perf);
                  });

                  const rounds = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'];

                  return (
                    <div key={category._id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold text-gray-800">{category.category_name}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            {category.category_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {category.participation_type} • {Object.keys(performancesByRound).length} round{Object.keys(performancesByRound).length !== 1 ? 's' : ''} • {categoryPerformances.length} player{categoryPerformances.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {categoryPerformances.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-lg">
                          <p className="text-gray-600">No rounds created yet. The organizer will create rounds for this event.</p>
                        </div>
                      ) : (
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

                            // Sort performances
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
                              <div key={round} className="border border-gray-200 rounded-lg p-6 bg-white">
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
                                    const isCoachPlayer = players.some(p => 
                                      p._id?.toString() === performance.player_id?._id?.toString() ||
                                      p._id === performance.player_id?._id
                                    );
                                    const scoresCount = performance.scores?.length || 0;
                                    
                                    return (
                                      <div
                                        key={performance._id}
                                        className={`rounded-lg p-4 border-2 transition ${
                                          isCoachPlayer
                                            ? 'bg-blue-50 border-blue-400 shadow-md'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                              isCoachPlayer
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
                                                  isCoachPlayer ? 'text-blue-800' : 'text-gray-800'
                                                }`}>
                                                  {playerName}
                                                  {isCoachPlayer && (
                                                    <span className="ml-2 text-xs text-blue-600">(Your Player)</span>
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default KataPlayerLists;

