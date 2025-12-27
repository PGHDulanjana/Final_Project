import { useState, useEffect } from 'react';
import { categoryService } from '../../services/categoryService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { playerService } from '../../services/playerService';
import { teamService } from '../../services/teamService';
import { dojoService } from '../../services/dojoService';
import { coachService } from '../../services/coachService';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { matchService } from '../../services/matchService';
import { scoreService } from '../../services/scoreService';
import { paymentService } from '../../services/paymentService';
import { processPayHerePayment, extractCustomerInfo } from '../../utils/payhere';
import { notificationService } from '../../services/notificationService';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import LiveScoreboard from '../../components/LiveScoreboard';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import TournamentDetailModal from '../../components/TournamentDetailModal';
import PlayerDetailsModal from '../../components/PlayerDetailsModal';
import PayHerePaymentModal from '../../components/PayHerePaymentModal';
import {
  FiUsers,
  FiAward,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiCalendar,
  FiTarget,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiDollarSign,
  FiBarChart2,
  FiUserPlus,
  FiX,
  FiBell,
  FiZap,
  FiArrowRight,
  FiUser,
  FiGift,
  FiFilter,
  FiSearch,
  FiDownload,
  FiEye,
  FiMapPin,
  FiRefreshCw
} from 'react-icons/fi';

const CoachDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payments, setPayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [coachDojos, setCoachDojos] = useState([]);
  const [coachDojosData, setCoachDojosData] = useState([]);
  const [coachProfile, setCoachProfile] = useState(null); // Full dojo objects
  const [selectedDojoFilter, setSelectedDojoFilter] = useState('all'); // 'all' or specific dojo name
  const [showDojoModal, setShowDojoModal] = useState(false);
  const [editingDojo, setEditingDojo] = useState(null);
  const [dojoForm, setDojoForm] = useState({
    dojo_name: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip_code: '',
      country: ''
    },
    phone: '',
    description: '',
    established_date: ''
  });

  // UI states
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showRegisterPlayer, setShowRegisterPlayer] = useState(false);
  const [showRegisterTeam, setShowRegisterTeam] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [pendingCategory, setPendingCategory] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [playerDetailsForm, setPlayerDetailsForm] = useState({
    age: '',
    belt_rank: '',
    weight_category: '',
    age_category: '',
    category_type: 'Kata' // Kata or Kumite
  });
  const [showPlayerDetailsModal, setShowPlayerDetailsModal] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState(null);
  const [teamForm, setTeamForm] = useState({
    team_name: '',
    team_type: 'Team Kata',
    description: ''
  });
  const [registrationForm, setRegistrationForm] = useState({
    tournament_id: '',
    category_id: '',
    player_id: '',
    team_id: '',
    registration_type: 'Individual',
    event_type: 'Kata'
  });

  useEffect(() => {
    if (user) {
      loadData();
      
      // Auto-refresh data every 3 seconds to show newly registered players immediately
      const refreshInterval = setInterval(() => {
        // Only refresh if tab is visible (not in background)
        if (!document.hidden) {
          loadData(false); // Don't show loading spinner on auto-refresh
        }
      }, 3000); // Refresh every 3 seconds for faster updates
      
      // Refresh when tab becomes visible (user switches back to tab)
      const handleVisibilityChange = () => {
        if (!document.hidden && user) {
          loadData(false); // Don't show loading spinner
        }
      };
      
      // Refresh when window gains focus
      const handleFocus = () => {
        if (user) {
          loadData(false); // Don't show loading spinner
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearInterval(refreshInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [user]);

  const loadData = async (showLoading = true) => {
    if (!user?._id) return;

    // Only show loading spinner on manual refresh, not auto-refresh
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [
        playersRes,
        teamsRes,
        tournamentsRes,
        registrationsRes,
        matchesRes,
        scoresRes,
        notificationsRes,
        paymentsRes,
        categoriesRes,
        dojosRes
      ] = await Promise.all([
        playerService.getPlayers(),
        teamService.getTeams(),
        tournamentService.getTournaments(), // Fetch all tournaments, filter on frontend
        registrationService.getRegistrations(),
        matchService.getMatches(),
        scoreService.getScores(),
        notificationService.getNotifications(),
        paymentService.getPayments(),
        categoryService.getCategories(),
        dojoService.getDojos()
      ]);

      // Extract players data - handle nested response structure
      // The backend returns: { success: true, count: X, data: [...] }
      // The service returns: response.data = { success: true, count: X, data: [...] }
      let allPlayers = [];
      if (playersRes) {
        if (Array.isArray(playersRes)) {
          allPlayers = playersRes;
        } else if (playersRes.data && Array.isArray(playersRes.data)) {
          allPlayers = playersRes.data;
        } else if (playersRes.data && playersRes.data.data && Array.isArray(playersRes.data.data)) {
          allPlayers = playersRes.data.data;
        }
      }
      
      // Deduplicate players by _id to prevent duplicates from API
      const uniqueAllPlayers = [];
      const seenIds = new Set();
      allPlayers.forEach(player => {
        const playerId = player?._id ? String(player._id) : null;
        if (playerId && !seenIds.has(playerId)) {
          seenIds.add(playerId);
          uniqueAllPlayers.push(player);
        }
      });
      allPlayers = uniqueAllPlayers;
      
      // Extract dojos data - handle nested response structure
      let allDojos = [];
      if (dojosRes) {
        if (Array.isArray(dojosRes)) {
          allDojos = dojosRes;
        } else if (dojosRes.data && Array.isArray(dojosRes.data)) {
          allDojos = dojosRes.data;
        } else if (dojosRes.data && dojosRes.data.data && Array.isArray(dojosRes.data.data)) {
          allDojos = dojosRes.data.data;
        }
      }
      
      // Get coach's dojo information
      // First, find the Coach profile for this user
      // Fetch coaches data separately since it's not in the initial Promise.all
      let coachesRes;
      try {
        coachesRes = await coachService.getCoaches();
      } catch (error) {
        console.error('Error fetching coaches:', error);
        coachesRes = null;
      }
      
      // Extract coaches data - handle nested response structure
      let allCoaches = [];
      if (coachesRes) {
        if (Array.isArray(coachesRes)) {
          allCoaches = coachesRes;
        } else if (coachesRes.data && Array.isArray(coachesRes.data)) {
          allCoaches = coachesRes.data;
        } else if (coachesRes.data && coachesRes.data.data && Array.isArray(coachesRes.data.data)) {
          allCoaches = coachesRes.data.data;
        }
      }
      
      const coachProfile = allCoaches.find(c => {
        const coachUserId = c.user_id?._id || c.user_id;
        const userIdStr = String(user._id);
        const coachUserIdStr = String(coachUserId);
        return coachUserIdStr === userIdStr || coachUserId === user._id;
      });
      
      // Store coach profile for use in tournament filtering
      setCoachProfile(coachProfile);
      
      // Get ALL dojos for this coach
      let coachDojosList = [];
      let coachDojoName = null;
      let coachDojosData = [];
      if (coachProfile) {
        // Get all dojos for this coach
        const allCoachDojos = allDojos.filter(d => {
          const dojoCoachId = d.coach_id?._id || d.coach_id;
          const dojoCoachIdStr = String(dojoCoachId);
          const coachProfileIdStr = String(coachProfile._id);
          return dojoCoachIdStr === coachProfileIdStr || dojoCoachId === coachProfile._id;
        });
        coachDojosData = allCoachDojos;
        coachDojosList = allCoachDojos.map(d => d.dojo_name);
        setCoachDojos(coachDojosList);
        setCoachDojosData(coachDojosData);
        
        // Use first dojo as default for backward compatibility
        if (allCoachDojos.length > 0) {
          coachDojoName = allCoachDojos[0].dojo_name?.toLowerCase().trim();
        }
      }

      // Filter players by coach - check coach_id, coach_name, and dojo_name
      // Build coach's full name variations for better matching
      // Get coach name from user object - handle all possible name fields
      const coachFirstName = (user?.first_name || '').toLowerCase().trim();
      const coachLastName = (user?.last_name || '').toLowerCase().trim();
      const coachUsername = (user?.username || '').toLowerCase().trim();
      
      // Build full name - prefer first+last, fallback to username
      let coachFullName = '';
      if (coachFirstName && coachLastName) {
        coachFullName = `${coachFirstName} ${coachLastName}`;
      } else if (coachFirstName) {
        coachFullName = coachFirstName;
      } else if (coachLastName) {
        coachFullName = coachLastName;
      } else if (coachUsername) {
        coachFullName = coachUsername;
      }
      
      // If we still don't have a name, try to get it from the coach profile
      if (!coachFullName && coachProfile) {
        const coachUser = coachProfile.user_id || {};
        const profileFirstName = (coachUser.first_name || '').toLowerCase().trim();
        const profileLastName = (coachUser.last_name || '').toLowerCase().trim();
        const profileUsername = (coachUser.username || '').toLowerCase().trim();
        
        if (profileFirstName && profileLastName) {
          coachFullName = `${profileFirstName} ${profileLastName}`;
        } else if (profileFirstName) {
          coachFullName = profileFirstName;
        } else if (profileUsername) {
          coachFullName = profileUsername;
        }
      }
      
      // Also create variations: "First Last", "Last First", "First", "Last"
      const coachNameVariations = [];
      if (coachFirstName && coachLastName) {
        coachNameVariations.push(`${coachFirstName} ${coachLastName}`);
        coachNameVariations.push(`${coachLastName} ${coachFirstName}`);
        coachNameVariations.push(coachFirstName);
        coachNameVariations.push(coachLastName);
      } else if (coachFirstName) {
        coachNameVariations.push(coachFirstName);
      } else if (coachLastName) {
        coachNameVariations.push(coachLastName);
      }
      if (coachUsername && !coachNameVariations.includes(coachUsername)) {
        coachNameVariations.push(coachUsername);
      }
      if (coachFullName && !coachNameVariations.includes(coachFullName)) {
        coachNameVariations.push(coachFullName);
      }
      
      // Get coach profile ID for matching
      const coachProfileId = coachProfile?._id;
      
      // CRITICAL: If coach profile not found, we can still match by name and dojo
      // This handles cases where coach profile might not exist but players registered with coach name
      
      
      // STRICT FILTERING: Show ONLY players who belong to THIS coach
      // Method 1: Match by coach_id (most reliable)
      // Method 2: Match by EXACT coach_name AND EXACT dojo_name (strict matching)
      const coachPlayers = allPlayers.filter(p => {
        // Method 1: Direct match by coach_id (most reliable - always show if coach_id matches)
        // Handle both populated and non-populated coach_id
        let playerCoachId = null;
        if (p.coach_id) {
          // If coach_id is populated (object), get its _id
          if (typeof p.coach_id === 'object' && p.coach_id._id) {
            playerCoachId = p.coach_id._id;
          } else if (typeof p.coach_id === 'object') {
            playerCoachId = p.coach_id._id || p.coach_id;
          } else {
            // If coach_id is a string/ObjectId directly (not populated)
            playerCoachId = p.coach_id;
          }
        }
        
        if (playerCoachId && coachProfileId) {
          // Convert both to strings for reliable comparison
          const playerCoachIdStr = String(playerCoachId).trim();
          const coachProfileIdStr = String(coachProfileId).trim();
          
          // STRICT: Only match if IDs are exactly equal
          if (playerCoachIdStr === coachProfileIdStr) {
            return true;
          }
        }
        
        // Method 2: STRICT match by coach_name AND dojo_name
        // CRITICAL: Player MUST have both coach_name and dojo_name to match
        if (!p.coach_name || !p.dojo_name) {
          // Player missing required fields - cannot match
          return false;
        }
        
        // Normalize strings for EXACT comparison (remove extra spaces, lowercase, trim)
        const normalizeString = (str) => String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
        const playerCoachName = normalizeString(p.coach_name);
        const playerDojoName = normalizeString(p.dojo_name);
        
        if (!playerCoachName || !playerDojoName) {
          return false;
        }
        
        // Normalize coach name - use full name for matching
        const normalizedCoachFullName = normalizeString(coachFullName);
        const normalizedCoachFirstName = normalizeString(coachFirstName);
        const normalizedCoachLastName = normalizeString(coachLastName);
        
        if (!normalizedCoachFullName) {
          // Cannot match without coach name
          return false;
        }
        
        // Normalize dojo names for comparison
        const allCoachDojoNames = coachDojosList.map(d => normalizeString(d));
        
        // STRICT NAME MATCHING: Only exact match or very close variations
        // This prevents cross-coach issues (e.g., "Dill" seeing "Dushan's" players)
        let nameMatches = false;
        
        // Strategy 1: EXACT match (case-insensitive, normalized) - MOST RELIABLE
        if (playerCoachName === normalizedCoachFullName) {
          nameMatches = true;
        }
        // Strategy 2: EXACT match with first name only (if coach has single name)
        else if (normalizedCoachFirstName && playerCoachName === normalizedCoachFirstName) {
          nameMatches = true;
        }
        // Strategy 3: EXACT match with last name only (if coach has single name)
        else if (normalizedCoachLastName && playerCoachName === normalizedCoachLastName) {
          nameMatches = true;
        }
        // Strategy 4: BOTH first AND last name present in player's coach_name
        // This is safe because it requires BOTH names to match
        else if (normalizedCoachFirstName && normalizedCoachLastName && 
                 normalizedCoachFirstName.length >= 3 && normalizedCoachLastName.length >= 3) {
          const playerWords = playerCoachName.split(/\s+/);
          const hasFirstName = playerWords.some(w => w === normalizedCoachFirstName);
          const hasLastName = playerWords.some(w => w === normalizedCoachLastName);
          if (hasFirstName && hasLastName) {
            nameMatches = true;
          }
        }
        
        // STRICT DOJO MATCHING: Only exact match
        let dojoMatches = false;
        
        if (allCoachDojoNames.length > 0) {
          // STRICT: Only exact match (case-insensitive, normalized)
          dojoMatches = allCoachDojoNames.some(dojoName => dojoName === playerDojoName);
        } else {
          // If coach has no dojos, allow match by name only (but name must be exact)
          dojoMatches = true;
        }
        
        // FINAL CHECK: Show player ONLY if:
        // 1. Name matches EXACTLY (or both first and last name match)
        // 2. AND dojo matches EXACTLY (or coach has no dojos)
        if (nameMatches && dojoMatches) {
          return true;
        }
        
        // If no match found, player does not belong to this coach
        return false;
      });
      
      // Log all players for debugging with comprehensive analysis
      const playersWithCoachId = allPlayers.filter(p => p.coach_id);
      const playersWithCoachName = allPlayers.filter(p => p.coach_name);
      const playersWithDojoName = allPlayers.filter(p => p.dojo_name);
      const playersWithBoth = allPlayers.filter(p => p.coach_name && p.dojo_name);
      
      // Find players missing coach_name/dojo_name but have coach_id
      const playersNeedingFix = allPlayers.filter(p => {
        const hasCoachId = !!p.coach_id;
        const missingNameOrDojo = !p.coach_name || !p.dojo_name;
        return hasCoachId && missingNameOrDojo;
      });
      
      
      // Show warning if players need fixing
      if (playersNeedingFix.length > 0) {
        console.warn('⚠️ Players with coach_id but missing coach_name/dojo_name:', playersNeedingFix.map(p => ({
          id: p._id,
          name: p.user_id?.first_name + ' ' + p.user_id?.last_name || 'Unknown',
          coach_id: String(p.coach_id?._id || p.coach_id),
          coach_name: p.coach_name || 'MISSING',
          dojo_name: p.dojo_name || 'MISSING',
          note: 'These players need to be updated with coach_name and dojo_name. They can be updated by the coach or admin.'
        })));
      }
      
      
      // Final check: Apply ULTRA LENIENT fallback to catch all players registered with coach name and dojo name
      // This ensures players registered with coach name and dojo name are always shown
      const playersWithCoachOrDojo = allPlayers.filter(p => p.coach_name || p.dojo_name);
      if (coachPlayers.length < playersWithCoachOrDojo.length) {
        
        // STRICT fallback: Include players that match by:
        // 1. coach_id (already matched above, but double-check)
        // 2. STRICT coach_name match (substantial similarity) AND dojo matches
        // This prevents cross-coach matching while still catching legitimate players
        const lenientMatches = allPlayers.filter(p => {
          // Check if already matched
          if (coachPlayers.some(cp => String(cp._id) === String(p._id))) {
            return true;
          }
          
          // Must have both coach_name AND dojo_name
          if (!p.coach_name || !p.dojo_name) {
            return false;
          }
          
          // Check coach_id match
          if (p.coach_id && coachProfileId) {
            const pid = String(p.coach_id?._id || p.coach_id).trim();
            const cid = String(coachProfileId).trim();
            if (pid === cid) {
              return true;
            }
          }
          
          // Check coach_name match (LENIENT - catch all players registered with coach name)
          // CRITICAL: This must work for players registered with coach_name and dojo_name
          if (p.coach_name && coachFullName) {
            const normalize = (str) => String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
            const playerName = normalize(p.coach_name);
            const coachName = normalize(coachFullName);
            const coachFirst = normalize(coachFirstName);
            const coachLast = normalize(coachLastName);
            
            // Match if (STRICT to prevent cross-coach matching):
            // 1. Exact match, OR
            // 2. Player name starts with coach's full name (at least 3 chars), OR
            // 3. Coach name starts with player name (at least 3 chars), OR
            // 4. BOTH first and last name match as words (3+ chars each), OR
            // 5. First name exact match (any length) - if dojo matches, OR
            // 6. Last name exact match (any length) - if dojo matches, OR
            // 7. Exact word match (3+ chars)
            // STRICT: Require exact or starts with to prevent cross-coach issues
            const exactMatch = playerName === coachName;
            const startsWithFullName = coachName.length >= 3 && playerName.startsWith(coachName);
            const coachStartsWithPlayer = playerName.length >= 3 && coachName.startsWith(playerName);
            const bothNamesMatch = coachFirst && coachLast &&
                                   coachFirst.length >= 3 && coachLast.length >= 3 &&
                                   playerName.split(/\s+/).some(w => w === coachFirst || w.startsWith(coachFirst)) &&
                                   playerName.split(/\s+/).some(w => w === coachLast || w.startsWith(coachLast));
            const firstNameExactMatch = coachFirst && playerName === coachFirst;
            const lastNameExactMatch = coachLast && playerName === coachLast;
            
            // Word-by-word match (STRICT - exact word match, 3+ chars)
            const playerNameWords = playerName.split(/\s+/).filter(w => w.length >= 3);
            const coachNameWords = coachName.split(/\s+/).filter(w => w.length >= 3);
            const wordMatch = coachNameWords.length > 0 && coachNameWords.some(cw => 
              playerNameWords.some(pw => cw === pw)
            );
            
            // Match if any of the above conditions are true
            // IMPORTANT: Include exact first/last name matches separately for better handling
            const nameMatches = exactMatch || startsWithFullName || coachStartsWithPlayer || bothNamesMatch || wordMatch;
            const exactSingleNameMatch = firstNameExactMatch || lastNameExactMatch;
            
            // CRITICAL: Handle exact single name matches (like "Indu") more leniently FIRST
            if (exactSingleNameMatch) {
              // Exact first or last name match - show if dojo matches OR coach has no dojos
              if (coachDojosList.length === 0) {
                return true;
              }
              
              // If coach has dojos, dojo must also match (STRICT - exact match only)
              if (p.dojo_name) {
                const normalizeDojo = (str) => String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
                const playerDojo = normalizeDojo(p.dojo_name);
                const dojoMatches = coachDojosList.some(d => {
                  const coachDojo = normalizeDojo(d);
                  // STRICT dojo matching - exact match only to prevent cross-coach issues
                  return playerDojo === coachDojo;
                });
                if (dojoMatches) {
                  return true;
                }
              }
            }
            
            if (nameMatches) {
              // If coach has dojos, dojo must also match (STRICT)
              if (coachDojosList.length === 0) {
                return true;
              }
              
              // If coach has dojos, dojo must also match (STRICT - exact match only)
              if (p.dojo_name) {
                const normalizeDojo = (str) => String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');
                const playerDojo = normalizeDojo(p.dojo_name);
                const dojoMatches = coachDojosList.some(d => {
                  const coachDojo = normalizeDojo(d);
                  // STRICT dojo matching - exact match only to prevent cross-coach issues
                  return playerDojo === coachDojo;
                });
                if (dojoMatches) {
                  return true;
                }
              }
            }
          }
          
          return false;
        });
        
        // Deduplicate players by _id to ensure each player appears only once
        const uniquePlayers = [];
        const seenPlayerIds = new Set();
        
        // First add all strict matches
        coachPlayers.forEach(player => {
          const playerId = String(player._id);
          if (!seenPlayerIds.has(playerId)) {
            seenPlayerIds.add(playerId);
            uniquePlayers.push(player);
          }
        });
        
        // Then add lenient fallback matches that aren't already included
        lenientMatches.forEach(player => {
          const playerId = String(player._id);
          if (!seenPlayerIds.has(playerId)) {
            seenPlayerIds.add(playerId);
            uniquePlayers.push(player);
          }
        });
        
        setPlayers(uniquePlayers);
        
      } else {
        // Deduplicate even the strict matches to be safe
        const uniquePlayers = [];
        const seenPlayerIds = new Set();
        coachPlayers.forEach(player => {
          const playerId = String(player._id);
          if (!seenPlayerIds.has(playerId)) {
            seenPlayerIds.add(playerId);
            uniquePlayers.push(player);
          }
        });
        setPlayers(uniquePlayers);
      }

      // Filter teams by coach
      const coachTeams = (teamsRes.data || []).filter(t => {
        const coachId = t.coach_id?._id || t.coach_id;
        return coachId === user?.coach_id || coachId === user?._id;
      });

      // Get ALL registrations (including coach registrations for tournaments)
      // We need all registrations to filter tournaments in PlayerDetailsModal
      const allRegistrations = registrationsRes.data || [];
      
      // Filter registrations by coach's players/teams (for display in registrations tab)
      const coachRegistrations = allRegistrations.filter(r => {
        const regPlayerId = r.player_id?._id || r.player_id;
        const regTeamId = r.team_id?._id || r.team_id;
        return coachPlayers.some(p => p._id === regPlayerId) || 
               coachTeams.some(t => t._id === regTeamId);
      });

      // Players are already set above with fallback logic
      setTeams(coachTeams);
      
      // Filter tournaments to show only Open or Ongoing (for display in tournaments tab)
      // This ensures newly created tournaments are visible even if they have different initial status
      const allTournaments = tournamentsRes.data || [];
      const availableTournaments = allTournaments.filter(t => 
        t.status === 'Open' || t.status === 'Ongoing'
      );
      
      
      // Set filtered tournaments for display (Open or Ongoing)
      setTournaments(availableTournaments);
      // Pass ALL registrations to PlayerDetailsModal so it can filter by coach registrations
      setRegistrations(allRegistrations);
      
      const currentCoachRegistrations = allRegistrations.filter(r => {
        const regCoachId = r.coach_id?._id || r.coach_id;
        const currentCoachId = user?.coach_id;
        return r.registration_type === 'Coach' && 
               regCoachId && currentCoachId &&
               (String(regCoachId) === String(currentCoachId));
      });
      
      setMatches(matchesRes.data || []);
      setScores(scoresRes.data || []);
      setNotifications(notificationsRes.data || []);
      setPayments(paymentsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalPlayers = players.length;
  const totalTeams = teams.length;
  const totalRegistrations = registrations.length;
  const pendingRegistrations = registrations.filter(r => r.approval_status === 'Pending').length;
  const approvedRegistrations = registrations.filter(r => r.approval_status === 'Approved').length;
  const totalMatches = matches.filter(m => {
    const matchParticipants = m.participants || [];
    return matchParticipants.some(p => 
      players.some(pl => pl._id === (p.player_id?._id || p.player_id)) ||
      teams.some(t => t._id === (p.team_id?._id || p.team_id))
    );
  }).length;
  const upcomingMatches = matches.filter(m => {
    const matchParticipants = m.participants || [];
    const isCoachMatch = matchParticipants.some(p => 
      players.some(pl => pl._id === (p.player_id?._id || p.player_id)) ||
      teams.some(t => t._id === (p.team_id?._id || p.team_id))
    );
    return isCoachMatch && (m.status === 'Scheduled' || m.status === 'In Progress') &&
           new Date(m.scheduled_time) > new Date();
  }).length;
  const totalPayments = payments
    .filter(p => p.status === 'Completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    try {
      await teamService.createTeam({
        ...teamForm,
        coach_id: user?.coach_id || user?._id
      });
      toast.success('Team created successfully!');
      setShowCreateTeam(false);
      setTeamForm({ team_name: '', team_type: 'Team Kata', description: '' });
      loadData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error(error.response?.data?.message || 'Failed to create team');
    }
  };

  const handleRegisterPlayer = async (e) => {
    e.preventDefault();
    if (!registrationForm.category_id) {
      toast.error('Please select an event');
      return;
    }
    if (!registrationForm.player_id) {
      toast.error('Please select a player');
      return;
    }
    if (!registrationForm.tournament_id) {
      toast.error('Please select a tournament');
      return;
    }

    // Check for duplicate registration before attempting to register
    const existingRegistration = registrations.find(r => {
      const regTournamentId = r.tournament_id?._id || r.tournament_id;
      const regCategoryId = r.category_id?._id || r.category_id;
      const regPlayerId = r.player_id?._id || r.player_id;
      
      return regTournamentId === registrationForm.tournament_id &&
             regCategoryId === registrationForm.category_id &&
             regPlayerId === registrationForm.player_id &&
             r.registration_type === 'Individual';
    });

    if (existingRegistration) {
      const player = players.find(p => p._id === registrationForm.player_id);
      const playerName = player?.user_id 
        ? `${player.user_id.first_name || ''} ${player.user_id.last_name || ''}`.trim() || player.user_id.username
        : 'This player';
      
      const category = categories.find(c => c._id === registrationForm.category_id);
      const eventName = category?.category_name || 'this event';
      
      toast.warning(`${playerName} is already registered for ${eventName}. Please select a different player or event.`);
      return;
    }

    try {
      const registrationData = {
        tournament_id: registrationForm.tournament_id,
        category_id: registrationForm.category_id,
        player_id: registrationForm.player_id,
        registration_type: 'Individual'
      };
      
      // Backend automatically determines coach_id for Coach users
      // Only include coach_id if explicitly needed and it's a valid MongoDB ID
      // For Individual registrations by Coaches, backend handles this automatically
      
      console.log('Registering player with data:', registrationData);
      
      // Register the player first
      const registrationResponse = await registrationService.registerForTournament(registrationData);
      const newRegistration = registrationResponse.data || registrationResponse;
      
      // Get the category to check if payment is required
      const category = categories.find(c => c._id === registrationForm.category_id);
      const entryFee = category?.individual_player_fee || 0;
      
      if (entryFee > 0) {
        // Payment required - show payment modal
        setPendingRegistration(newRegistration);
        setPendingCategory(category);
        setShowPaymentModal(true);
        toast.info('Please complete payment to finalize registration');
      } else {
        // No payment required
        toast.success('Player registered successfully!');
        setShowRegisterPlayer(false);
        setRegistrationForm({
          tournament_id: '',
          category_id: '',
          player_id: '',
          team_id: '',
          registration_type: 'Individual',
          event_type: 'Kata'
        });
        loadData();
      }
    } catch (error) {
      console.error('Error registering player:', error);
      
      // Extract error message from various possible locations
      let errorMessage = 'Failed to register player';
      const errorData = error.response?.data || error.data;
      
      if (errorData) {
        // Handle duplicate registration error with a more user-friendly message
        if (errorData.message && (
          errorData.message.toLowerCase().includes('duplicate') ||
          errorData.message.toLowerCase().includes('already registered')
        )) {
          const player = players.find(p => p._id === registrationForm.player_id);
          const playerName = player?.user_id 
            ? `${player.user_id.first_name || ''} ${player.user_id.last_name || ''}`.trim() || player.user_id.username
            : 'This player';
          
          const category = categories.find(c => c._id === registrationForm.category_id);
          const eventName = category?.category_name || 'this event';
          
          errorMessage = `${playerName} is already registered for ${eventName}. Please select a different player or event.`;
        } else if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          // Check for validation errors array
          const validationErrors = errorData.errors.map(err => {
            const msg = err.msg || err.message || '';
            const param = err.param || err.field || '';
            return param ? `${param}: ${msg}` : msg;
          }).join(', ');
          errorMessage = errorData.message ? `${errorData.message} - ${validationErrors}` : validationErrors;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('Error details:', {
        status: error.response?.status || error.status,
        data: errorData,
        fullError: error
      });
      
      toast.error(errorMessage);
    }
  };

  const handleRegisterTeam = async (e) => {
    e.preventDefault();
    if (!registrationForm.category_id) {
      toast.error('Please select an event');
      return;
    }
    try {
      await registrationService.registerForTournament({
        tournament_id: registrationForm.tournament_id,
        category_id: registrationForm.category_id,
        team_id: registrationForm.team_id,
        registration_type: 'Team',
        coach_id: user?.coach_id || user?._id
      });
      toast.success('Team registered successfully!');
      setShowRegisterTeam(false);
      setRegistrationForm({
        tournament_id: '',
        category_id: '',
        player_id: '',
        team_id: '',
        registration_type: 'Team',
        event_type: 'Team Kata'
      });
      loadData();
    } catch (error) {
      console.error('Error registering team:', error);
      toast.error(error.response?.data?.message || 'Failed to register team');
    }
  };

  const handleMakePayment = async (registrationId) => {
    try {
      const registration = registrations.find(r => r._id === registrationId);
      if (!registration) {
        toast.error('Registration not found');
        return;
      }

      const tournament = tournaments.find(t => {
        const regTournamentId = registration.tournament_id?._id || registration.tournament_id;
        return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
      });

      if (!tournament) {
        toast.error('Tournament not found');
        return;
      }

      // Get category fee based on registration type
      const category = categories.find(c => {
        const regCategoryId = registration.category_id?._id || registration.category_id;
        return c._id === regCategoryId || c._id?.toString() === regCategoryId?.toString();
      });
      let amount = 0;
      if (category) {
        if (registration.registration_type === 'Individual') {
          amount = category.individual_player_fee || 0;
        } else if (registration.registration_type === 'Team') {
          amount = category.team_event_fee || 0;
        }
      }

      const paymentRes = await paymentService.createPayment({
        registration_id: registrationId,
        amount: amount,
        transaction_method: 'PayHere'
      });

      // Process PayHere payment
      if (paymentRes.data?.payment_url) {
        window.location.href = paymentRes.data.payment_url;
      } else if (paymentRes.data?.payhere) {
        // Extract customer info from registration
        const customerInfo = extractCustomerInfo(registration);
        
        // Process payment using utility
        const success = processPayHerePayment(paymentRes, {
          items: `Tournament Entry Fee - ${tournament.tournament_name}`,
          customerInfo,
          method: 'form'
        });

        if (!success) {
          toast.error('Failed to redirect to payment gateway. Please try again.');
        }
      } else {
        toast.success('Payment initiated successfully!');
        loadData();
      }
    } catch (error) {
      console.error('Error making payment:', error);
      toast.error(error.response?.data?.message || 'Failed to initiate payment');
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
    <>
      {/* Tournament Detail Modal - Rendered outside Layout for proper z-index */}
      {selectedTournament && (
        <TournamentDetailModal
          tournamentId={selectedTournament}
          onClose={() => {
            setSelectedTournament(null);
          }}
        />
      )}
      
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  Coach Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.first_name || user?.username}! Manage your players, teams, and registrations
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <FiPlus className="w-5 h-5" />
                  Create Team
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: FiBarChart2 },
                { id: 'dojos', label: 'My Dojos', icon: FiMapPin },
                { id: 'players', label: 'Players', icon: FiUsers },
                { id: 'teams', label: 'Teams', icon: FiUser },
                { id: 'registrations', label: 'Registrations', icon: FiCheckCircle },
                { id: 'tournaments', label: 'Tournaments', icon: FiAward },
                { id: 'brackets', label: 'Brackets', icon: FiTarget },
                { id: 'matches', label: 'Matches', icon: FiCalendar },
                { id: 'results', label: 'Results', icon: FiGift },
                { id: 'notifications', label: 'Notifications', icon: FiBell }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Players</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalPlayers}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FiUsers className="w-8 h-8 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total Teams</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{totalTeams}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiUser className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Pending Approvals</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{pendingRegistrations}</p>
                      <p className="text-xs text-gray-500 mt-1">{approvedRegistrations} Approved</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiClock className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Upcoming Matches</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">{upcomingMatches}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <FiCalendar className="w-8 h-8 text-yellow-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition"
                  >
                    <FiPlus className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Create Team</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('players')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition"
                  >
                    <FiUsers className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">Manage Players</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('brackets')}
                    className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition"
                  >
                    <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="font-semibold text-gray-700">View Brackets</span>
                  </button>
                </div>
              </div>

              {/* Pending Registrations */}
              {pendingRegistrations > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-yellow-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FiClock className="w-6 h-6 text-yellow-600" />
                        Pending Approvals
                      </h2>
                      <p className="text-gray-600 text-sm mt-1">
                        {pendingRegistrations} registration{pendingRegistrations !== 1 ? 's' : ''} awaiting organizer approval
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('registrations')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {registrations
                      .filter(r => r.approval_status === 'Pending')
                      .slice(0, 5)
                      .map((registration) => (
                        <RegistrationCard
                          key={registration._id}
                          registration={registration}
                          tournaments={tournaments}
                          players={players}
                          teams={teams}
                          onMakePayment={() => handleMakePayment(registration._id)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* My Players */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">My Players</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        loadData(true);
                        toast.info('Refreshing players...');
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Refresh Players"
                    >
                      <FiRefreshCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setActiveTab('players')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                </div>
                {players.length === 0 ? (
                  <div className="text-center py-12">
                    <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Players Yet</h3>
                    <p className="text-gray-600 mb-2">Players who register to the system and select you as their coach will appear here automatically.</p>
                    <p className="text-sm text-gray-500 mb-4">Once players appear, you can click on them to edit details, register for events, and make payments.</p>
                  </div>
                ) : (
                  (() => {
                    // Group players by dojo
                    const playersByDojo = {};
                    players.forEach(player => {
                      const dojoName = player.dojo_name || 'No Dojo';
                      if (!playersByDojo[dojoName]) {
                        playersByDojo[dojoName] = [];
                      }
                      playersByDojo[dojoName].push(player);
                    });

                    const dojoNames = Object.keys(playersByDojo).sort();
                    const displayPlayers = dojoNames.length > 1 
                      ? dojoNames.slice(0, 2).flatMap(dojoName => playersByDojo[dojoName].slice(0, 3))
                      : players.slice(0, 6);

                    return (
                      <div className="space-y-4">
                        {dojoNames.length > 1 && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              <strong>Players organized by dojo:</strong> {dojoNames.join(', ')}
                            </p>
                          </div>
                        )}
                        {dojoNames.slice(0, 2).map((dojoName) => (
                          <div key={dojoName} className="border-l-4 border-blue-500 pl-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <FiMapPin className="w-4 h-4 text-blue-600" />
                              {dojoName} ({playersByDojo[dojoName].length} player{playersByDojo[dojoName].length !== 1 ? 's' : ''})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {playersByDojo[dojoName].slice(0, 3).map((player) => (
                                <PlayerCard 
                                  key={player._id}
                                  player={player}
                                  registrations={registrations}
                                  tournaments={tournaments}
                                  onClick={() => setSelectedPlayer(player)}
                                />
                              ))}
                            </div>
                            {playersByDojo[dojoName].length > 3 && (
                              <button
                                onClick={() => setActiveTab('players')}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                              >
                                View all {playersByDojo[dojoName].length} players from {dojoName} →
                              </button>
                            )}
                          </div>
                        ))}
                        {dojoNames.length === 1 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {displayPlayers.map((player) => (
                              <PlayerCard 
                                key={player._id}
                                player={player}
                                registrations={registrations}
                                tournaments={tournaments}
                                onClick={() => setSelectedPlayer(player)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* My Teams */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">My Teams</h2>
                  <button
                    onClick={() => setActiveTab('teams')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    View All <FiArrowRight />
                  </button>
                </div>
                {teams.length === 0 ? (
                  <div className="text-center py-12">
                    <FiUser className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Teams Yet</h3>
                    <p className="text-gray-600 mb-4">Create teams for team events</p>
                    <button
                      onClick={() => setShowCreateTeam(true)}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Create Team
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.slice(0, 6).map((team) => (
                      <TeamCard key={team._id} team={team} />
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Matches */}
              {upcomingMatches > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Upcoming Matches</h2>
                    <button
                      onClick={() => setActiveTab('matches')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View Schedule <FiArrowRight />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {matches
                      .filter(m => {
                        const matchParticipants = m.participants || [];
                        const isCoachMatch = matchParticipants.some(p => 
                          players.some(pl => pl._id === (p.player_id?._id || p.player_id)) ||
                          teams.some(t => t._id === (p.team_id?._id || p.team_id))
                        );
                        return isCoachMatch && (m.status === 'Scheduled' || m.status === 'In Progress') &&
                               new Date(m.scheduled_time) > new Date();
                      })
                      .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                      .slice(0, 5)
                      .map((match) => (
                        <MatchCard key={match._id} match={match} tournaments={tournaments} />
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Dojos Tab */}
          {activeTab === 'dojos' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Manage My Dojos</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Add and manage your dojos. Players will see these dojos when registering.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingDojo(null);
                    setDojoForm({
                      dojo_name: '',
                      address: {
                        street: '',
                        city: '',
                        state: '',
                        zip_code: '',
                        country: ''
                      },
                      phone: '',
                      description: '',
                      established_date: ''
                    });
                    setShowDojoModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <FiPlus className="w-5 h-5" />
                  Add Dojo
                </button>
              </div>

              {coachDojosData.length === 0 ? (
                <div className="text-center py-12">
                  <FiMapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Dojos Yet</h3>
                  <p className="text-gray-600 mb-4">
                    Add your first dojo so players can register with your dojo name.
                  </p>
                  <button
                    onClick={() => {
                      setEditingDojo(null);
                      setDojoForm({
                        dojo_name: '',
                        address: {
                          street: '',
                          city: '',
                          state: '',
                          zip_code: '',
                          country: ''
                        },
                        phone: '',
                        description: '',
                        established_date: ''
                      });
                      setShowDojoModal(true);
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    Add Your First Dojo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coachDojosData.map((dojo) => (
                    <div key={dojo._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-1">{dojo.dojo_name}</h3>
                          {dojo.address?.city && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <FiMapPin className="w-4 h-4" />
                              {dojo.address.city}
                              {dojo.address.state && `, ${dojo.address.state}`}
                            </p>
                          )}
                          {dojo.phone && (
                            <p className="text-sm text-gray-600 mt-1">{dojo.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingDojo(dojo);
                              setDojoForm({
                                dojo_name: dojo.dojo_name || '',
                                address: {
                                  street: dojo.address?.street || '',
                                  city: dojo.address?.city || '',
                                  state: dojo.address?.state || '',
                                  zip_code: dojo.address?.zip_code || '',
                                  country: dojo.address?.country || ''
                                },
                                phone: dojo.phone || '',
                                description: dojo.description || '',
                                established_date: dojo.established_date ? format(new Date(dojo.established_date), 'yyyy-MM-dd') : ''
                              });
                              setShowDojoModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Dojo"
                          >
                            <FiEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete "${dojo.dojo_name}"? This action cannot be undone.`)) {
                                try {
                                  await dojoService.deleteDojo(dojo._id);
                                  toast.success('Dojo deleted successfully');
                                  loadData();
                                } catch (error) {
                                  console.error('Error deleting dojo:', error);
                                  toast.error(error.response?.data?.message || 'Failed to delete dojo');
                                }
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete Dojo"
                          >
                            <FiTrash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      {dojo.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{dojo.description}</p>
                      )}
                      {dojo.established_date && (
                        <p className="text-xs text-gray-500 mt-2">
                          Established: {format(new Date(dojo.established_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Players registered: {players.filter(p => {
                            const playerDojoName = (p.dojo_name || '').toLowerCase().trim();
                            return playerDojoName === (dojo.dojo_name || '').toLowerCase().trim();
                          }).length}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Manage Players</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Click on a player to add details, register for events, and make payments
                  </p>
                </div>
                <button
                  onClick={() => {
                    loadData(true);
                    toast.info('Refreshing players...');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  title="Refresh to see newly registered players"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              
              {/* Info Banner - Workflow Guide */}
              <div className="mb-6 space-y-3">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FiUsers className="w-5 h-5" />
                    Player Management Workflow
                  </h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Step 1:</strong> Players register themselves to the system and select you as their coach</p>
                    <p><strong>Step 2:</strong> Players automatically appear in your dashboard (refresh if needed)</p>
                    <p><strong>Step 3:</strong> Click on a player to:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Edit and save player details (age, belt rank, weight category, age category, gender, event preferences)</li>
                      <li>Register players for tournament events</li>
                      <li>Make payments for event registrations</li>
                    </ul>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>💡 Tip:</strong> Players must register first. Once they appear here, you can manage all their tournament activities including payments and event registrations.
                  </p>
                </div>
              </div>

              {/* Dojo Filter */}
              {coachDojos.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Dojo
                  </label>
                  <select
                    value={selectedDojoFilter}
                    onChange={(e) => setSelectedDojoFilter(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Dojos ({players.length} players)</option>
                    {coachDojos.map((dojoName) => {
                      const dojoPlayers = players.filter(p => {
                        const playerDojoName = (p.dojo_name || '').toLowerCase().trim();
                        return playerDojoName === dojoName.toLowerCase().trim();
                      });
                      return (
                        <option key={dojoName} value={dojoName}>
                          {dojoName} ({dojoPlayers.length} players)
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {players.length === 0 ? (
                <div className="text-center py-12">
                  <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Players Found</h3>
                  <p className="text-gray-600 mb-2">
                    No players have registered using your coach name and dojo name yet.
                  </p>
                  <p className="text-sm text-gray-500">
                    Players will appear here automatically when they register with your name and dojo. 
                    You can then click on their name to add details and register them for events.
                  </p>
                </div>
              ) : (
                <>
                  {/* Group players by dojo */}
                  {(() => {
                    // Filter players by selected dojo
                    const filteredPlayers = selectedDojoFilter === 'all' 
                      ? players 
                      : players.filter(p => {
                          const playerDojoName = (p.dojo_name || '').toLowerCase().trim();
                          return playerDojoName === selectedDojoFilter.toLowerCase().trim();
                        });

                    // Group players by dojo
                    const playersByDojo = {};
                    filteredPlayers.forEach(player => {
                      const dojoName = player.dojo_name || 'No Dojo';
                      if (!playersByDojo[dojoName]) {
                        playersByDojo[dojoName] = [];
                      }
                      playersByDojo[dojoName].push(player);
                    });

                    const dojoNames = Object.keys(playersByDojo).sort();

                    return (
                      <div className="space-y-6">
                        {dojoNames.map((dojoName) => (
                          <div key={dojoName} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                  <FiMapPin className="w-5 h-5 text-blue-600" />
                                  {dojoName}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {playersByDojo[dojoName].length} player{playersByDojo[dojoName].length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {playersByDojo[dojoName].map((player) => (
                                <PlayerCard 
                                  key={player._id}
                                  player={player}
                                  registrations={registrations}
                                  tournaments={tournaments}
                                  onClick={() => setSelectedPlayer(player)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Teams Tab */}
          {activeTab === 'teams' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Manage Teams</h2>
                <button
                  onClick={() => setShowCreateTeam(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <FiPlus className="w-5 h-5" />
                  Create Team
                </button>
              </div>
              {teams.length === 0 ? (
                <div className="text-center py-12">
                  <FiUser className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Teams</h3>
                  <p className="text-gray-600 mb-4">Create teams for team events</p>
                  <button
                    onClick={() => setShowCreateTeam(true)}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Create Team
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <TeamCard key={team._id} team={team} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === 'registrations' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Registrations</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRegisterTeam(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <FiPlus className="w-5 h-5" />
                    Register Team
                  </button>
                </div>
              </div>
              {registrations.length === 0 ? (
                <div className="text-center py-12">
                  <FiCheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Registrations</h3>
                  <p className="text-gray-600 mb-4">Register players or teams for tournaments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {registrations.map((registration) => (
                    <RegistrationCard
                      key={registration._id}
                      registration={registration}
                      tournaments={tournaments}
                      players={players}
                      teams={teams}
                      onMakePayment={() => handleMakePayment(registration._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tournaments Tab */}
          {activeTab === 'tournaments' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Tournaments</h2>
              <p className="text-gray-600 mb-6">Register for tournaments to view and register your players/teams for events. Coach registration is FREE.</p>
              
              {/* Separate tournaments into registered and available */}
              {(() => {
                // Get current coach's ID - use coachProfile._id if available, fallback to user.coach_id
                const currentCoachId = coachProfile?._id || user?.coach_id;
                
                
                // Filter registrations to only include current coach's registrations
                const currentCoachRegistrations = registrations.filter(r => {
                  const regCoachId = r.coach_id?._id || r.coach_id;
                  const matches = r.registration_type === 'Coach' && 
                         regCoachId && currentCoachId &&
                         (String(regCoachId) === String(currentCoachId));
                  
                  
                  return matches;
                });
                
                // Get tournament IDs where current coach is registered
                const registeredTournamentIds = new Set(
                  currentCoachRegistrations.map(r => {
                    const regTournamentId = r.tournament_id?._id || r.tournament_id;
                    return regTournamentId ? String(regTournamentId) : null;
                  }).filter(id => id !== null)
                );
                
                // Split tournaments into registered and available
                const registeredTournaments = tournaments.filter(t => 
                  registeredTournamentIds.has(String(t._id))
                );
                // Show all tournaments (regardless of status)
                // Backend will validate if tournament is open for registration
                const availableTournaments = tournaments.filter(t => 
                  !registeredTournamentIds.has(String(t._id))
                );
                
                return (
                  <>
                    {/* Registered Tournaments Section */}
                    {registeredTournaments.length > 0 && (
                      <div className="mb-8">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <FiCheckCircle className="w-5 h-5 text-green-600" />
                          Registered Tournaments ({registeredTournaments.length})
                        </h3>
                        <p className="text-gray-600 mb-4 text-sm">Tournaments you have registered for. You can view events and register your players/teams.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {registeredTournaments.map((tournament) => {
                            // Find the registration for this tournament
                            const coachRegistration = currentCoachRegistrations.find(r => {
                              const regTournamentId = r.tournament_id?._id || r.tournament_id;
                              return regTournamentId === tournament._id || regTournamentId?.toString() === tournament._id?.toString();
                            });
                            
                            return (
                              <TournamentCard
                                key={tournament._id}
                                tournament={tournament}
                                registration={coachRegistration}
                                onSelect={() => {
                                  setSelectedTournament(tournament._id);
                                }}
                                onLeave={async () => {
                                  if (!coachRegistration) {
                                    toast.error('No registration found to leave');
                                    return;
                                  }
                                  
                                  // Confirm before leaving
                                  if (!window.confirm(`Are you sure you want to leave "${tournament.tournament_name}"? You will need to register again to view and register players for events.`)) {
                                    return;
                                  }
                                  
                                  try {
                                    await registrationService.deleteRegistration(coachRegistration._id);
                                    toast.success('Successfully left tournament');
                                    
                                    // Refresh data to update registration status
                                    await loadData(false);
                                  } catch (error) {
                                    console.error('CoachDashboard: Error leaving tournament:', error);
                                    toast.error(error.response?.data?.message || 'Failed to leave tournament');
                                  }
                                }}
                                onRegister={async () => {
                                  try {
                                    // Backend finds coach by user_id automatically
                                    // Don't send coach_id - let backend handle it for consistency
                                    const registrationData = {
                                      tournament_id: tournament._id,
                                      registration_type: 'Coach'
                                    };
                                    
                                    const response = await registrationService.registerForTournament(registrationData);
                                    toast.success('Successfully registered for tournament! Registration is free.');
                                    
                                    // Refresh data to show updated registration status
                                    await loadData(false);
                                    
                                    // Small delay to ensure data is fully refreshed before opening modal
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // Automatically open the tournament details modal after registration to show events
                                    setSelectedTournament(tournament._id);
                                  } catch (error) {
                                    console.error('CoachDashboard: Registration error:', error);
                                    console.error('CoachDashboard: Error response:', error.response?.data);
                                    
                                    // Check if error is "already registered" - this is not really an error, just refresh data
                                    const errorMessage = error.response?.data?.message || error.message || '';
                                    if (errorMessage.includes('Already registered') || errorMessage.includes('already registered') || errorMessage.includes('Duplicate')) {
                                      toast.info('You are already registered for this tournament. Refreshing...');
                                      // Refresh data to show the tournament in registered section
                                      await loadData(false);
                                      return;
                                    }
                                    
                                    // Log the errors array in detail
                                    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                                      console.error('CoachDashboard: Validation errors array:', error.response.data.errors);
                                      error.response.data.errors.forEach((err, index) => {
                                        console.error(`CoachDashboard: Error ${index}:`, {
                                          field: err.field,
                                          message: err.message,
                                          fullError: err
                                        });
                                      });
                                    }
                                    
                                    let errorMessageToShow = 'Failed to register for tournament';
                                    if (error.response?.data) {
                                      const errorData = error.response.data;
                                      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                                        errorMessageToShow = errorData.errors.map(e => {
                                          if (typeof e === 'string') return e;
                                          if (e.message) return `${e.field || 'Field'}: ${e.message}`;
                                          return JSON.stringify(e);
                                        }).join(', ');
                                      } else if (errorData.message) {
                                        errorMessageToShow = errorData.message;
                                      }
                                    } else if (error.message) {
                                      errorMessageToShow = error.message;
                                    }
                                    toast.error(errorMessageToShow);
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Available Tournaments Section */}
                    {availableTournaments.length > 0 && (
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <FiAward className="w-5 h-5 text-blue-600" />
                          Available Tournaments ({availableTournaments.length})
                        </h3>
                        <p className="text-gray-600 mb-4 text-sm">Tournaments available for registration. Register to view events and register your players/teams.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {availableTournaments.map((tournament) => {
                            // No registration for available tournaments
                            return (
                              <TournamentCard
                                key={tournament._id}
                                tournament={tournament}
                                registration={null}
                                onSelect={() => {
                                  setSelectedTournament(tournament._id);
                                }}
                                onLeave={async () => {
                                  toast.error('You are not registered for this tournament');
                                }}
                                onRegister={async () => {
                                  try {
                                    // Backend finds coach by user_id automatically
                                    // Don't send coach_id - let backend handle it for consistency
                                    const registrationData = {
                                      tournament_id: tournament._id,
                                      registration_type: 'Coach'
                                    };
                                    
                                    const response = await registrationService.registerForTournament(registrationData);
                                    toast.success('Successfully registered for tournament! Registration is free.');
                                    
                                    // Refresh data to show updated registration status
                                    await loadData(false);
                                    
                                    // Small delay to ensure data is fully refreshed before opening modal
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    
                                    // Automatically open the tournament details modal after registration to show events
                                    setSelectedTournament(tournament._id);
                                  } catch (error) {
                                    console.error('CoachDashboard: Registration error:', error);
                                    console.error('CoachDashboard: Error response:', error.response?.data);
                                    
                                    // Check if error is "already registered" - this is not really an error, just refresh data
                                    const errorMessage = error.response?.data?.message || error.message || '';
                                    if (errorMessage.includes('Already registered') || errorMessage.includes('already registered') || errorMessage.includes('Duplicate')) {
                                      toast.info('You are already registered for this tournament. Refreshing...');
                                      // Refresh data to show the tournament in registered section
                                      await loadData(false);
                                      return;
                                    }
                                    
                                    // Log the errors array in detail
                                    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                                      console.error('CoachDashboard: Validation errors array:', error.response.data.errors);
                                      error.response.data.errors.forEach((err, index) => {
                                        console.error(`CoachDashboard: Error ${index}:`, {
                                          field: err.field,
                                          message: err.message,
                                          fullError: err
                                        });
                                      });
                                    }
                                    
                                    let errorMessageToShow = 'Failed to register for tournament';
                                    if (error.response?.data) {
                                      const errorData = error.response.data;
                                      if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
                                        errorMessageToShow = errorData.errors.map(e => {
                                          if (typeof e === 'string') return e;
                                          if (e.message) return `${e.field || 'Field'}: ${e.message}`;
                                          return JSON.stringify(e);
                                        }).join(', ');
                                      } else if (errorData.message) {
                                        errorMessageToShow = errorData.message;
                                      }
                                    } else if (error.message) {
                                      errorMessageToShow = error.message;
                                    }
                                    toast.error(errorMessageToShow);
                                  }
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Empty State */}
                    {registeredTournaments.length === 0 && availableTournaments.length === 0 && (
                      <div className="text-center py-12">
                        <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">No Open Tournaments</h3>
                        <p className="text-gray-600">No tournaments are currently open for registration</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Brackets Tab */}
          {activeTab === 'brackets' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">AI-Generated Brackets</h2>
              <div className="space-y-6">
                {tournaments
                  .filter(t => t.status === 'Open' || t.status === 'Ongoing')
                  .map((tournament) => {
                    const tournamentRegistrations = registrations.filter(r => {
                      const regTournamentId = r.tournament_id?._id || r.tournament_id;
                      return regTournamentId === tournament._id || regTournamentId?.toString() === tournament._id?.toString();
                    });
                    const tournamentMatches = matches.filter(m => {
                      const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                      return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
                    });

                    return (
                      <div key={tournament._id} className="border border-gray-200 rounded-xl p-6">
                        <h3 className="font-bold text-xl text-gray-800 mb-4">{tournament.tournament_name}</h3>
                        {tournamentMatches.length > 0 ? (
                          <MatchDrawsBracket matches={tournamentMatches} />
                        ) : (
                          <p className="text-gray-600">Brackets will be generated after organizer approval</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Match Schedule</h2>
              <div className="space-y-3">
                {matches
                  .filter(m => {
                    const matchParticipants = m.participants || [];
                    return matchParticipants.some(p => 
                      players.some(pl => pl._id === (p.player_id?._id || p.player_id)) ||
                      teams.some(t => t._id === (p.team_id?._id || p.team_id))
                    );
                  })
                  .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                  .map((match) => (
                    <MatchCard key={match._id} match={match} tournaments={tournaments} />
                  ))}
              </div>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Live Results</h2>
              <LiveScoreboard />
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Notifications</h2>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <FiBell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Notifications</h3>
                  <p className="text-gray-600">You'll receive notifications about your registrations and matches</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <NotificationCard key={notification._id} notification={notification} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <CreateTeamModal
          isOpen={showCreateTeam}
          onClose={() => {
            setShowCreateTeam(false);
            setTeamForm({ team_name: '', team_type: 'Team Kata', description: '' });
          }}
          onSubmit={handleCreateTeam}
          formData={teamForm}
          setFormData={setTeamForm}
          players={players}
        />
      )}

      {/* Register Player Modal */}
      {showRegisterPlayer && (
        <RegisterPlayerModal
          isOpen={showRegisterPlayer}
          onClose={() => {
            setShowRegisterPlayer(false);
            setRegistrationForm({
              tournament_id: '',
              category_id: '',
              player_id: '',
              team_id: '',
              registration_type: 'Individual',
              event_type: 'Kata'
            });
          }}
          onSubmit={handleRegisterPlayer}
          formData={registrationForm}
          setFormData={setRegistrationForm}
          tournaments={tournaments}
          players={players}
          categories={categories}
        />
      )}

      {/* Register Team Modal */}
      {showRegisterTeam && (
        <RegisterTeamModal
          isOpen={showRegisterTeam}
          onClose={() => {
            setShowRegisterTeam(false);
            setRegistrationForm({
              tournament_id: '',
              category_id: '',
              player_id: '',
              team_id: '',
              registration_type: 'Team',
              event_type: 'Team Kata'
            });
          }}
          onSubmit={handleRegisterTeam}
          formData={registrationForm}
          setFormData={setRegistrationForm}
          tournaments={tournaments}
          teams={teams}
          categories={categories}
        />
      )}

      {/* Payment Modal for Player Registration */}
      {showPaymentModal && pendingRegistration && pendingCategory && (
        <PayHerePaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingRegistration(null);
            setPendingCategory(null);
            // Reload data to show updated registration status
            loadData();
          }}
          registration={{
            ...pendingRegistration,
            // Add category fee information to registration for payment calculation
            category_fee: pendingCategory.individual_player_fee || 0
          }}
          tournament={{
            // Get tournament data
            ...tournaments.find(t => {
              const regTournamentId = pendingRegistration.tournament_id?._id || pendingRegistration.tournament_id;
              return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
            }),
            // Override tournament fees with category-specific fees
            entry_fee_individual: pendingCategory.individual_player_fee || 0,
            entry_fee_team: pendingCategory.team_event_fee || 0
          }}
          onSuccess={async () => {
            toast.success('Payment completed successfully! Player registered for event.');
            setShowPaymentModal(false);
            setPendingRegistration(null);
            setPendingCategory(null);
            setShowRegisterPlayer(false);
            setRegistrationForm({
              tournament_id: '',
              category_id: '',
              player_id: '',
              team_id: '',
              registration_type: 'Individual',
              event_type: 'Kata'
            });
            await loadData();
          }}
        />
      )}

      {/* Dojo Modal */}
      {showDojoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingDojo ? 'Edit Dojo' : 'Add New Dojo'}
              </h2>
              <button
                onClick={() => {
                  setShowDojoModal(false);
                  setEditingDojo(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const dojoData = {
                    dojo_name: dojoForm.dojo_name,
                    address: dojoForm.address,
                    phone: dojoForm.phone || undefined,
                    description: dojoForm.description || undefined,
                    established_date: dojoForm.established_date || undefined
                  };

                  if (editingDojo) {
                    await dojoService.updateDojo(editingDojo._id, dojoData);
                    toast.success('Dojo updated successfully');
                  } else {
                    await dojoService.createDojo(dojoData);
                    toast.success('Dojo created successfully');
                  }
                  
                  setShowDojoModal(false);
                  setEditingDojo(null);
                  loadData();
                } catch (error) {
                  console.error('Error saving dojo:', error);
                  toast.error(error.response?.data?.message || 'Failed to save dojo');
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dojo Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dojoForm.dojo_name}
                  onChange={(e) => setDojoForm({ ...dojoForm, dojo_name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter dojo name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                  <input
                    type="text"
                    value={dojoForm.address.street}
                    onChange={(e) => setDojoForm({
                      ...dojoForm,
                      address: { ...dojoForm.address, street: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={dojoForm.address.city}
                    onChange={(e) => setDojoForm({
                      ...dojoForm,
                      address: { ...dojoForm.address, city: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={dojoForm.address.state}
                    onChange={(e) => setDojoForm({
                      ...dojoForm,
                      address: { ...dojoForm.address, state: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="State/Province"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text"
                    value={dojoForm.address.zip_code}
                    onChange={(e) => setDojoForm({
                      ...dojoForm,
                      address: { ...dojoForm.address, zip_code: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Zip/Postal code"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={dojoForm.address.country}
                    onChange={(e) => setDojoForm({
                      ...dojoForm,
                      address: { ...dojoForm.address, country: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Country"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={dojoForm.phone}
                  onChange={(e) => setDojoForm({ ...dojoForm, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={dojoForm.description}
                  onChange={(e) => setDojoForm({ ...dojoForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description about the dojo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Established Date</label>
                <input
                  type="date"
                  value={dojoForm.established_date}
                  onChange={(e) => setDojoForm({ ...dojoForm, established_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowDojoModal(false);
                    setEditingDojo(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingDojo ? 'Update Dojo' : 'Create Dojo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Player Details Modal - Add Details, Payment, and Event Registration */}
      {selectedPlayer && (
        <PlayerDetailsModal
          player={selectedPlayer}
          user={user}
          onClose={() => {
            setSelectedPlayer(null);
            setPlayerDetailsForm({
              age: '',
              belt_rank: '',
              weight_category: '',
              age_category: '',
              category_type: 'Kata'
            });
          }}
          tournaments={tournaments}
          categories={categories}
          registrations={registrations}
          onUpdatePlayer={async (playerId, updatedPlayerData) => {
            // Update the player in the local state immediately for instant feedback
            setPlayers(prevPlayers => 
              prevPlayers.map(p => 
                p._id === playerId ? { ...p, ...updatedPlayerData } : p
              )
            );
            // Also reload data to ensure consistency
            loadData();
          }}
          onRegisterForEvent={async (playerId, categoryId, tournamentId) => {
            try {
              await registrationService.registerForTournament({
                tournament_id: tournamentId,
                category_id: categoryId,
                player_id: playerId,
                registration_type: 'Individual',
                coach_id: user?.coach_id || user?._id
              });
              toast.success('Player registered for event successfully');
              loadData();
            } catch (error) {
              console.error('Error registering player:', error);
              toast.error(error.response?.data?.message || 'Failed to register player for event');
            }
          }}
          onMakePayment={async (registrationId, amount) => {
            try {
              const registration = registrations.find(r => r._id === registrationId);
              if (!registration) {
                toast.error('Registration not found');
                return;
              }
              
              const category = categories.find(c => {
                const regCategoryId = registration.category_id?._id || registration.category_id;
                return c._id === regCategoryId || c._id?.toString() === regCategoryId?.toString();
              });
              
              const paymentAmount = category?.individual_player_fee || amount;
              
              const paymentRes = await paymentService.createPayment({
                registration_id: registrationId,
                amount: paymentAmount,
                transaction_method: 'PayHere'
              });
              
              // Process PayHere payment
              if (paymentRes.data?.payment_url) {
                window.location.href = paymentRes.data.payment_url;
              } else if (paymentRes.data?.payhere) {
                // Extract customer info from registration
                const customerInfo = extractCustomerInfo(registration);
                
                // Process payment using utility
                const success = processPayHerePayment(paymentRes, {
                  items: `Event Payment - ${category?.category_name || 'Tournament Event'}`,
                  customerInfo,
                  method: 'form'
                });

                if (!success) {
                  toast.error('Failed to redirect to payment gateway. Please try again.');
                }
              } else {
                toast.success('Payment processed successfully');
                loadData();
              }
            } catch (error) {
              console.error('Error processing payment:', error);
              toast.error(error.response?.data?.message || 'Failed to process payment');
            }
          }}
        />
      )}
      </Layout>
    </>
  );
};

// Player Card Component
const PlayerCard = ({ player, onClick, registrations = [], tournaments = [] }) => {
  const user = player.user_id || {};
  
  // Check if player has pending payments for event registrations
  const playerRegistrations = registrations.filter(r => {
    const regPlayerId = r.player_id?._id || r.player_id;
    return regPlayerId === player._id || regPlayerId?.toString() === player._id?.toString();
  });
  
  const hasPendingPayment = playerRegistrations.some(r => r.payment_status === 'Pending');
  
  return (
    <div 
      className={`border rounded-xl p-4 hover:shadow-lg transition cursor-pointer ${
        hasPendingPayment 
          ? 'border-yellow-300 bg-yellow-50' 
          : 'border-gray-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800">
            {user.first_name && user.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : user.username || player.name || 'Player'}
          </h3>
          {hasPendingPayment && (
            <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
              <FiDollarSign className="w-3 h-3" />
              Event Payment Required
            </p>
          )}
        </div>
        <FiEye className="w-5 h-5 text-gray-400 hover:text-blue-600" />
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        {player.dojo_name && (
          <p className="flex items-center gap-1">
            <FiMapPin className="w-4 h-4" />
            <span className="font-medium">Dojo:</span> {player.dojo_name}
          </p>
        )}
        {player.coach_name && (
          <p className="flex items-center gap-1">
            <FiUser className="w-4 h-4" />
            <span className="font-medium">Coach:</span> {player.coach_name}
          </p>
        )}
        {player.age && <p><span className="font-medium">Age:</span> {player.age}</p>}
        {player.belt_rank && <p><span className="font-medium">Belt:</span> {player.belt_rank}</p>}
        {player.gender && (
          <p>
            <span className="font-medium">Gender:</span>{' '}
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
              player.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
            }`}>
              {player.gender === 'Male' ? '♂️ Male' : '♀️ Female'}
            </span>
          </p>
        )}
        {player.weight_category && <p><span className="font-medium">Weight:</span> {player.weight_category}</p>}
        {player.age_category && <p><span className="font-medium">Age Category:</span> {player.age_category}</p>}
        {(player.kata || player.kumite || player.team_kata || player.team_kumite) && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">Event Types:</p>
            <div className="flex flex-wrap gap-1">
              {player.kata && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Kata</span>}
              {player.kumite && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Kumite</span>}
              {player.team_kata && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Team Kata</span>}
              {player.team_kumite && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Team Kumite</span>}
            </div>
          </div>
        )}
        {!player.age && !player.belt_rank && (
          <p className="text-yellow-600 text-xs font-medium mt-2">Click to add details</p>
        )}
      </div>
    </div>
  );
};

// Team Card Component
const TeamCard = ({ team }) => {
  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800">{team.team_name}</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
          {team.team_type}
        </span>
      </div>
      {team.description && (
        <p className="text-sm text-gray-600 mb-3">{team.description}</p>
      )}
      <p className="text-sm text-gray-600">
        Members: {team.members?.length || 0}
      </p>
    </div>
  );
};

// Registration Card Component
const RegistrationCard = ({ registration, tournaments, players, teams, onMakePayment }) => {
  const tournament = tournaments.find(t => {
    const regTournamentId = registration.tournament_id?._id || registration.tournament_id;
    return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
  });
  const player = players.find(p => {
    const regPlayerId = registration.player_id?._id || registration.player_id;
    return p._id === regPlayerId || p._id?.toString() === regPlayerId?.toString();
  });
  const team = teams.find(t => {
    const regTeamId = registration.team_id?._id || registration.team_id;
    return t._id === regTeamId || t._id?.toString() === regTeamId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{tournament?.tournament_name || 'Tournament'}</p>
          <p className="text-sm text-gray-600">
            {registration.registration_type}: {player ? (player.user_id?.first_name || player.name) : (team?.team_name || 'N/A')}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              registration.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
              registration.approval_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {registration.approval_status}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              registration.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
              registration.payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              Payment: {registration.payment_status}
            </span>
          </div>
        </div>
        {registration.approval_status === 'Approved' && registration.payment_status !== 'Paid' && (
          <button
            onClick={onMakePayment}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          >
            Make Payment
          </button>
        )}
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament, registration, onSelect, onRegister, onLeave }) => {
  const isRegistered = !!registration;
  
  const handleViewEvents = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSelect && typeof onSelect === 'function') {
      try {
        onSelect();
      } catch (error) {
        console.error('TournamentCard: Error in onSelect handler:', error);
      }
    } else {
      console.error('TournamentCard: onSelect handler is not defined or not a function');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRegister && typeof onRegister === 'function') {
      try {
        await onRegister();
      } catch (error) {
        console.error('TournamentCard: Error in onRegister handler:', error);
        // Error is already handled in the parent component, but log it here too
      }
    } else {
      console.error('TournamentCard: onRegister handler is not defined or not a function');
      console.error('TournamentCard: Available props:', { tournament: tournament._id, hasRegistration: !!registration, onSelect: !!onSelect });
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{tournament.tournament_name}</h3>
        <p className="text-sm text-gray-600 mb-2">
          <FiCalendar className="inline w-4 h-4 mr-1" />
          {format(new Date(tournament.start_date), 'MMM dd, yyyy')} - {format(new Date(tournament.end_date), 'MMM dd, yyyy')}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
            tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {tournament.status}
          </span>
          {isRegistered && (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
              ✓ Registered (FREE)
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {!isRegistered && (
          <button
            onClick={handleRegister}
            type="button"
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ pointerEvents: 'auto' }}
            disabled={tournament.status !== 'Open'}
            title={tournament.status !== 'Open' ? 'Tournament is not open for registration' : 'Register for Tournament (FREE)'}
          >
            <FiUserPlus className="w-4 h-4" />
            {tournament.status === 'Open' ? 'Register for Tournament (FREE)' : 'Registration Closed'}
          </button>
        )}
        {isRegistered && tournament.status === 'Open' && (
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onLeave && typeof onLeave === 'function') {
                try {
                  await onLeave();
                } catch (error) {
                  console.error('TournamentCard: Error in onLeave handler:', error);
                }
              }
            }}
            type="button"
            className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-rose-700 transition text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            style={{ pointerEvents: 'auto' }}
          >
            <FiX className="w-4 h-4" />
            Leave Tournament
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onSelect) {
              onSelect();
            }
          }}
          type="button"
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          style={{ pointerEvents: 'auto' }}
        >
          <FiEye className="w-4 h-4" />
          {isRegistered ? 'View Events' : 'View Details'}
        </button>
      </div>
    </div>
  );
};

// Match Card Component
const MatchCard = ({ match, tournaments }) => {
  const tournament = tournaments.find(t => {
    const matchTournamentId = match.tournament_id?._id || match.tournament_id;
    return t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{match.match_name || 'Match'}</p>
          <p className="text-sm text-gray-600">
            {tournament?.tournament_name || 'Tournament'} • {match.match_type}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              {format(new Date(match.scheduled_time), 'MMM dd, HH:mm')}
            </span>
            {match.venue_area && (
              <span className="flex items-center gap-1">
                <FiTarget className="w-4 h-4" />
                {match.venue_area}
              </span>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
          match.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {match.status}
        </span>
      </div>
    </div>
  );
};

// Notification Card Component
const NotificationCard = ({ notification }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FiBell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 mb-1">{notification.title}</h4>
          <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
          <p className="text-xs text-gray-500">
            {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Create Team Modal Component
const CreateTeamModal = ({ isOpen, onClose, onSubmit, formData, setFormData, players }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Create Team</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.team_name}
              onChange={(e) => setFormData({ ...formData, team_name: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter team name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.team_type}
              onChange={(e) => setFormData({ ...formData, team_type: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="Team Kata">Team Kata</option>
              <option value="Team Kumite">Team Kumite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Team description (optional)"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Register Player Modal Component
const RegisterPlayerModal = ({ isOpen, onClose, onSubmit, formData, setFormData, tournaments, players, categories }) => {
  const [selectedTournamentCategories, setSelectedTournamentCategories] = useState([]);

  useEffect(() => {
    if (formData.tournament_id && categories) {
      const tournamentCategories = categories.filter(c => {
        const catTournamentId = c.tournament_id?._id || c.tournament_id;
        return catTournamentId === formData.tournament_id || catTournamentId?.toString() === formData.tournament_id?.toString();
      }).filter(c => c.participation_type === 'Individual');
      setSelectedTournamentCategories(tournamentCategories);
    } else {
      setSelectedTournamentCategories([]);
    }
  }, [formData.tournament_id, categories]);

  if (!isOpen) return null;

  const selectedCategory = selectedTournamentCategories.find(c => 
    c._id === formData.category_id || c._id?.toString() === formData.category_id?.toString()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Register Player</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tournament_id}
              onChange={(e) => {
                setFormData({ ...formData, tournament_id: e.target.value, category_id: '' });
              }}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Tournament</option>
              {tournaments.filter(t => t.status === 'Open' || t.status === 'Ongoing').map(t => (
                <option key={t._id} value={t._id}>{t.tournament_name}</option>
              ))}
            </select>
          </div>

          {formData.tournament_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event <span className="text-red-500">*</span>
              </label>
              {selectedTournamentCategories.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  No individual events available for this tournament. Please ask the organizer to create events.
                </div>
              ) : (
                <>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Event</option>
                    {selectedTournamentCategories.map(cat => {
                      const fee = cat.participation_type === 'Individual' 
                        ? cat.individual_player_fee 
                        : cat.team_event_fee;
                      return (
                        <option key={cat._id} value={cat._id}>
                          {cat.category_name} - {cat.category_type} ({cat.age_category}
                          {cat.belt_category ? ` - ${cat.belt_category}` : ''}
                          {cat.weight_category ? ` - ${cat.weight_category}` : ''}) - ${fee?.toFixed(2) || '0.00'}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Matches (rounds) will be generated automatically from registrations in this event</p>
                </>
              )}
              {selectedCategory && (
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900">
                    {selectedCategory.participation_type === 'Individual' 
                      ? `Individual Player Fee: $${selectedCategory.individual_player_fee?.toFixed(2) || '0.00'}`
                      : `Team Event Fee (${selectedCategory.team_size || 3} members): $${selectedCategory.team_event_fee?.toFixed(2) || '0.00'}`}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Registering for this event. Matches will be created after organizer approval.</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Player <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.player_id}
              onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Player</option>
              {players.map(p => {
                const user = p.user_id || {};
                const name = user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user.username || p.name || 'Player';
                return <option key={p._id} value={p._id}>{name}</option>;
              })}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Register Team Modal Component
const RegisterTeamModal = ({ isOpen, onClose, onSubmit, formData, setFormData, tournaments, teams, categories }) => {
  const [selectedTournamentCategories, setSelectedTournamentCategories] = useState([]);

  useEffect(() => {
    if (formData.tournament_id && categories) {
      const tournamentCategories = categories.filter(c => {
        const catTournamentId = c.tournament_id?._id || c.tournament_id;
        return catTournamentId === formData.tournament_id || catTournamentId?.toString() === formData.tournament_id?.toString();
      }).filter(c => c.participation_type === 'Team');
      setSelectedTournamentCategories(tournamentCategories);
    } else {
      setSelectedTournamentCategories([]);
    }
  }, [formData.tournament_id, categories]);

  if (!isOpen) return null;

  const selectedCategory = selectedTournamentCategories.find(c => 
    c._id === formData.category_id || c._id?.toString() === formData.category_id?.toString()
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Register Team</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.tournament_id}
              onChange={(e) => {
                setFormData({ ...formData, tournament_id: e.target.value, category_id: '' });
              }}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select Tournament</option>
              {tournaments.filter(t => t.status === 'Open' || t.status === 'Ongoing').map(t => (
                <option key={t._id} value={t._id}>{t.tournament_name}</option>
              ))}
            </select>
          </div>

          {formData.tournament_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event <span className="text-red-500">*</span>
              </label>
              {selectedTournamentCategories.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  No team events available for this tournament. Please ask the organizer to create team events.
                </div>
              ) : (
                <>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Event</option>
                    {selectedTournamentCategories.map(cat => {
                      const fee = cat.participation_type === 'Individual' 
                        ? cat.individual_player_fee 
                        : cat.team_event_fee;
                      return (
                        <option key={cat._id} value={cat._id}>
                          {cat.category_name} - {cat.category_type} ({cat.age_category}
                          {cat.belt_category ? ` - ${cat.belt_category}` : ''}
                          {cat.weight_category ? ` - ${cat.weight_category}` : ''}) - ${fee?.toFixed(2) || '0.00'}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Matches (rounds) will be generated automatically from registrations in this event</p>
                </>
              )}
              {selectedCategory && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-green-900">
                    {selectedCategory.participation_type === 'Individual' 
                      ? `Individual Player Fee: $${selectedCategory.individual_player_fee?.toFixed(2) || '0.00'}`
                      : `Team Event Fee (${selectedCategory.team_size || 3} members): $${selectedCategory.team_event_fee?.toFixed(2) || '0.00'}`}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Registering for this event. Matches will be created after organizer approval.</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.team_id}
              onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select Team</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.team_name} ({t.team_type})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoachDashboard;
