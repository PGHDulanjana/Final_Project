import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { matchService } from '../../services/matchService';
import { registrationService } from '../../services/registrationService';
import { categoryService } from '../../services/categoryService';
import { playerService } from '../../services/playerService';
import { coachService } from '../../services/coachService';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import Layout from '../../components/Layout';
import { FiTarget, FiRefreshCw } from 'react-icons/fi';
import { toast } from 'react-toastify';

const KumiteMatchDraws = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [players, setPlayers] = useState([]);
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
      
      const [matchesRes, registrationsRes, categoriesRes, playersRes] = await Promise.all([
        matchService.getMatches(),
        registrationService.getRegistrations(),
        categoryService.getCategories(),
        playerService.getPlayers(),
      ]);

      const allMatches = matchesRes.data || [];
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
      setMatches(allMatches);
      setRegistrations(allRegistrations);
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load match draws');
    } finally {
      setLoading(false);
    }
  };

  // Get coach's players' registered Kumite events
  const coachPlayerRegistrations = registrations.filter(r => {
    const regPlayerId = r.player_id?._id || r.player_id;
    const isCoachPlayer = players.some(p => p._id === regPlayerId);
    return isCoachPlayer &&
           r.registration_type === 'Individual' &&
           r.approval_status === 'Approved' &&
           r.payment_status === 'Paid';
  });

  const kumiteEventIds = coachPlayerRegistrations
    .map(r => r.category_id?._id || r.category_id)
    .filter(Boolean);

  const kumiteCategories = categories.filter(c => 
    (c.category_type === 'Kumite' || c.category_type === 'Team Kumite') &&
    kumiteEventIds.some(eventId => 
      c._id?.toString() === eventId?.toString() || c._id === eventId
    )
  );

  // Group matches by category
  const matchesByCategory = {};
  kumiteCategories.forEach(category => {
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
  });

  // Always include Kumite categories even if no matches yet
  kumiteCategories.forEach(category => {
    if (!matchesByCategory[category._id]) {
      matchesByCategory[category._id] = {
        category,
        matches: []
      };
    }
  });

  const hasKumiteEvents = Object.keys(matchesByCategory).length > 0;

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
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Kumite Match Draws</h2>
                <p className="text-gray-600">View match draws for Kumite events your players are registered for</p>
              </div>
              <button
                onClick={() => loadData()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {!hasKumiteEvents ? (
              <div className="text-center py-12">
                <FiTarget className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Kumite Events Registered</h3>
                <p className="text-gray-600">Your players need to register and get approved for Kumite events to see match draws</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.values(matchesByCategory).map(({ category, matches: categoryMatches }) => {
                  return (
                    <div key={category._id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-2xl font-bold text-gray-800">{category.category_name}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            {category.category_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {category.participation_type} • {categoryMatches.length} match{categoryMatches.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                      
                      {categoryMatches.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-lg">
                          <p className="text-gray-600">No match draws yet. The organizer will create match draws for this event.</p>
                        </div>
                      ) : (
                        <MatchDrawsBracket 
                          matches={categoryMatches} 
                          category={category}
                        />
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

export default KumiteMatchDraws;

