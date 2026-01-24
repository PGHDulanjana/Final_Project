import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import { matchService } from '../../services/matchService';
import { categoryService } from '../../services/categoryService';
import { scoreService } from '../../services/scoreService';
import { notificationService } from '../../services/notificationService';
import { coachService } from '../../services/coachService';
import { playerService } from '../../services/playerService';
import { judgeService } from '../../services/judgeService';
import { tatamiService } from '../../services/tatamiService';
import kataPerformanceService from '../../services/kataPerformanceService';
import api from '../../config/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import Layout from '../../components/Layout';
import TournamentDetailModal from '../../components/TournamentDetailModal';
import CreateTournamentModal from './CreateTournamentModal';
import {
  FiAward,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiPlus,
  FiEdit,
  FiFilter,
  FiRefreshCw,
  FiBell,
  FiZap,
  FiSettings,
  FiXCircle,
  FiX,
  FiMinus,
  FiPlus as FiPlusIcon,
  FiArrowRight,
  FiUser,
  FiGift,
  FiBarChart2,
  FiDownload,
  FiSend,
  FiSearch
} from 'react-icons/fi';

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [tournaments, setTournaments] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [matches, setMatches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [scores, setScores] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [judges, setJudges] = useState([]);
  const [currentOrganizer, setCurrentOrganizer] = useState(null);

  // Filter states for users view
  const [userFilterType, setUserFilterType] = useState('all'); // 'all', 'coaches', 'players', 'judges'
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // UI states
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [showAddEventsPrompt, setShowAddEventsPrompt] = useState(false);
  const [newlyCreatedTournamentId, setNewlyCreatedTournamentId] = useState(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Event scoring states
  const [tatamis, setTatamis] = useState([]);
  const [kataPerformances, setKataPerformances] = useState([]);
  const [showMatchScoringModal, setShowMatchScoringModal] = useState(false);
  const [showKataScoringModal, setShowKataScoringModal] = useState(false);
  const [showKataBulkScoringModal, setShowKataBulkScoringModal] = useState(false);
  const [showKataPerformanceModal, setShowKataPerformanceModal] = useState(false);
  const [selectedCategoryForKataPerformance, setSelectedCategoryForKataPerformance] = useState(null);
  const [selectedCategoryForBulkScoring, setSelectedCategoryForBulkScoring] = useState(null);
  const [selectedRoundForBulkScoring, setSelectedRoundForBulkScoring] = useState('First Round');
  const [selectedMatchForScoring, setSelectedMatchForScoring] = useState(null);
  const [selectedParticipantForScoring, setSelectedParticipantForScoring] = useState(null);
  const [selectedKataPerformanceForScoring, setSelectedKataPerformanceForScoring] = useState(null);
  const [selectedJudgeForScoring, setSelectedJudgeForScoring] = useState(null);
  const [kataScoresByJudge, setKataScoresByJudge] = useState({}); // { judgeId: score }
  const [kataBulkScores, setKataBulkScores] = useState({}); // { performanceId: { judgeId: score } }
  const [scoringData, setScoringData] = useState({
    yuko: 0,
    technical_score: '',
    performance_score: '',
    ippon: 0,
    waza_ari: 0,
    chukoku: 0,
    keikoku: 0,
    hansoku_chui: 0,
    hansoku: 0,
    jogai: 0,
    kata_score: '',
    comments: ''
  });

  useEffect(() => {
    if (user) {
      loadData(true);

      // Auto-refresh data every 30 seconds, but only when tab is visible and no modals are open
      const refreshInterval = setInterval(() => {
        // Only refresh if tab is visible and no modals are open
        if (document.visibilityState === 'visible' &&
          !showCreateTournament &&
          !selectedTournamentId &&
          !selectedRegistration &&
          !selectedMatch) {
          loadData(false); // Don't show loading spinner during auto-refresh
        }
      }, 30000); // Refresh every 30 seconds

      // Also refresh when tab becomes visible (if no modals are open)
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' &&
          !showCreateTournament &&
          !selectedTournamentId &&
          !selectedRegistration &&
          !selectedMatch) {
          loadData(false);
        }
      };

      // Refresh when window gains focus (if no modals are open)
      const handleFocus = () => {
        if (!showCreateTournament &&
          !selectedTournamentId &&
          !selectedRegistration &&
          !selectedMatch) {
          loadData(false);
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
  }, [user, showCreateTournament, selectedTournamentId, selectedRegistration, selectedMatch]);

  // Debug: Log when selectedTournamentId changes
  useEffect(() => {
    // selectedTournamentId changed
  }, [selectedTournamentId]);

  // Load Kata performances when categories and currentOrganizer are available
  useEffect(() => {
    const loadKataPerformances = async () => {
      if (!currentOrganizer || categories.length === 0) return;

      const organizerTournamentIds = tournaments
        .filter(t => isTournamentOwner(t))
        .map(t => t._id);

      if (organizerTournamentIds.length > 0) {
        try {
          const kataPromises = categories
            .filter(c => {
              const catTournamentId = c.tournament_id?._id || c.tournament_id;
              return organizerTournamentIds.some(tid =>
                String(tid) === String(catTournamentId)
              ) && (c.category_type === 'Kata' || c.category_type === 'Team Kata');
            })
            .map(c =>
              kataPerformanceService.getPerformances({ category_id: c._id })
                .catch(() => ({ data: [] }))
            );

          const kataResults = await Promise.all(kataPromises);
          const allKataPerformances = kataResults.flatMap(res => res.data || []);
          setKataPerformances(allKataPerformances);
        } catch (error) {
          console.error('Error loading Kata performances:', error);
          setKataPerformances([]);
        }
      }
    };

    loadKataPerformances();
  }, [currentOrganizer, categories, tournaments]);

  const loadData = async (showLoading = true) => {
    if (!user?._id) return;

    if (showLoading) {
      setLoading(true);
    }
    try {
      const [
        tournamentsRes,
        registrationsRes,
        matchesRes,
        categoriesRes,
        scoresRes,
        notificationsRes,
        coachesRes,
        playersRes,
        judgesRes,
        tatamisRes
      ] = await Promise.all([
        tournamentService.getTournaments(),
        registrationService.getRegistrations(),
        matchService.getMatches(),
        categoryService.getCategories(),
        scoreService.getScores(),
        notificationService.getNotifications(),
        coachService.getCoaches(),
        playerService.getPlayers(),
        judgeService.getJudges(),
        tatamiService.getTatamis().catch(() => ({ data: [] }))
      ]);

      // Extract data from API responses - handle both direct data and wrapped responses
      const extractData = (response) => {
        if (!response || !response.data) return [];
        // If response.data is an array, return it directly
        if (Array.isArray(response.data)) return response.data;
        // If response.data has a data property (nested), return that
        if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
        // If response.data has a data property that's not an array, try to return it as array
        return [];
      };

      setTournaments(extractData(tournamentsRes));
      const allRegistrations = extractData(registrationsRes);
      setRegistrations(allRegistrations);
      setMatches(extractData(matchesRes));
      setCategories(extractData(categoriesRes));
      setScores(extractData(scoresRes));
      setNotifications(extractData(notificationsRes));
      setTatamis(extractData(tatamisRes));

      // Load Kata performances for organizer's tournaments (after organizer is set)
      // This will be handled in a separate useEffect
      const allCoaches = extractData(coachesRes);

      // For players, ensure we get all players - handle nested response structure
      // The backend returns: { success: true, count: X, data: [...] }
      // The service returns: response.data = { success: true, count: X, data: [...] }
      // So playersRes = { success: true, count: X, data: [...] }
      // And playersRes.data = [...] (the array)
      let allPlayersData = [];
      if (playersRes) {
        // If playersRes is already an array
        if (Array.isArray(playersRes)) {
          allPlayersData = playersRes;
        }
        // If playersRes has a data property that's an array
        else if (playersRes.data && Array.isArray(playersRes.data)) {
          allPlayersData = playersRes.data;
        }
        // If playersRes.data has a nested data property
        else if (playersRes.data && playersRes.data.data && Array.isArray(playersRes.data.data)) {
          allPlayersData = playersRes.data.data;
        }
      }

      const allJudges = extractData(judgesRes);

      // Fetch current organizer profile
      let organizer = null;
      try {
        const organizersRes = await api.get('/organizers');
        const organizers = extractData(organizersRes);
        organizer = organizers.find(org => {
          const orgUserId = org.user_id?._id || org.user_id;
          return orgUserId === user._id || orgUserId?.toString() === user._id?.toString();
        });
        setCurrentOrganizer(organizer || null);
      } catch (error) {
        console.error('Error fetching organizer profile:', error);
        // Don't show error toast for organizer fetch failure, just log it
      }

      // Filter users to only show those registered for tournaments created by this organizer
      if (organizer) {
        const organizerId = organizer._id;

        // Get all tournaments created by this organizer
        const organizerTournaments = extractData(tournamentsRes).filter(t => {
          const tournamentOrganizerId = t.organizer_id?._id || t.organizer_id;
          return tournamentOrganizerId === organizerId ||
            tournamentOrganizerId?.toString() === organizerId?.toString();
        });

        // Get tournament IDs
        const organizerTournamentIds = organizerTournaments.map(t => t._id);

        // Get all registrations for tournaments created by this organizer
        const organizerRegistrations = allRegistrations.filter(reg => {
          const regTournamentId = reg.tournament_id?._id || reg.tournament_id;
          return organizerTournamentIds.some(tid =>
            tid === regTournamentId || tid?.toString() === regTournamentId?.toString()
          );
        });

        // Extract unique IDs from registrations
        const registeredCoachIds = new Set();
        const registeredPlayerIds = new Set();
        const registeredJudgeIds = new Set();

        organizerRegistrations.forEach(reg => {
          if (reg.coach_id) {
            const coachId = reg.coach_id?._id || reg.coach_id;
            registeredCoachIds.add(coachId?.toString());
          }
          if (reg.player_id) {
            const playerId = reg.player_id?._id || reg.player_id;
            registeredPlayerIds.add(playerId?.toString());
          }
          if (reg.judge_id) {
            const judgeId = reg.judge_id?._id || reg.judge_id;
            registeredJudgeIds.add(judgeId?.toString());
          }
        });

        // Filter coaches to only show registered ones
        const filteredCoaches = allCoaches.filter(coach => {
          const coachId = coach._id?.toString();
          return registeredCoachIds.has(coachId);
        });
        setCoaches(filteredCoaches);

        // Filter players to only show registered ones
        const filteredPlayers = allPlayersData.filter(player => {
          const playerId = player._id?.toString();
          return registeredPlayerIds.has(playerId);
        });
        setPlayers(filteredPlayers);

        // Filter judges to only show registered ones
        const filteredJudges = allJudges.filter(judge => {
          const judgeId = judge._id?.toString();
          return registeredJudgeIds.has(judgeId);
        });
        setJudges(filteredJudges);

      } else {
        // If organizer profile not found, show empty lists
        setCoaches([]);
        setPlayers([]);
        setJudges([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (showLoading) {
        if (error.response?.status !== 401) {
          toast.error('Failed to load dashboard data');
        }
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Helper function to check if tournament belongs to current organizer
  const isTournamentOwner = (tournament) => {
    if (!currentOrganizer || !tournament) return false;
    const tournamentOrganizerId = tournament.organizer_id?._id || tournament.organizer_id;
    const currentOrganizerId = currentOrganizer._id;
    return tournamentOrganizerId === currentOrganizerId ||
      tournamentOrganizerId?.toString() === currentOrganizerId?.toString();
  };

  // Calculate statistics - only for tournaments created by this organizer
  const organizerTournaments = currentOrganizer ? tournaments.filter(t => isTournamentOwner(t)) : [];
  const totalTournaments = organizerTournaments.length;
  const activeTournaments = organizerTournaments.filter(t => t.status === 'Open' || t.status === 'Ongoing').length;
  const draftTournaments = organizerTournaments.filter(t => t.status === 'Draft').length;

  // Filter registrations to only those for organizer's tournaments
  const organizerRegistrations = currentOrganizer ? registrations.filter(r => {
    const regTournamentId = r.tournament_id?._id || r.tournament_id;
    return organizerTournaments.some(t =>
      t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString()
    );
  }) : [];

  const totalRegistrations = organizerRegistrations.length;
  const pendingRegistrations = organizerRegistrations.filter(r => r.approval_status === 'Pending').length;
  const approvedRegistrations = organizerRegistrations.filter(r => r.approval_status === 'Approved').length;

  // Filter matches to only those for organizer's tournaments
  const organizerMatches = currentOrganizer ? matches.filter(m => {
    const matchTournamentId = m.tournament_id?._id || m.tournament_id;
    return organizerTournaments.some(t =>
      t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString()
    );
  }) : [];

  const totalMatches = organizerMatches.length;
  const upcomingMatches = organizerMatches.filter(m =>
    (m.status === 'Scheduled' || m.status === 'In Progress') &&
    new Date(m.scheduled_time) > new Date()
  ).length;
  const completedMatches = organizerMatches.filter(m => m.status === 'Completed').length;
  const totalCoaches = coaches.length;
  const totalPlayers = players.length;
  const totalJudges = judges.length;
  const totalRevenue = organizerRegistrations
    .filter(r => r.payment_status === 'Paid')
    .reduce((sum, r) => {
      const tournament = organizerTournaments.find(t => {
        const regTournamentId = r.tournament_id?._id || r.tournament_id;
        return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
      });
      if (tournament) {
        // Check if registration has category with fees
        const category = r.category_id;
        if (category) {
          if (r.registration_type === 'Team' && category.team_event_fee) {
            return sum + category.team_event_fee;
          } else if (r.registration_type === 'Individual' && category.individual_player_fee) {
            return sum + category.individual_player_fee;
          }
        }
        // Fallback to tournament-level fees if category fees not available
        if (r.registration_type === 'Team' && tournament.entry_fee_team) {
          return sum + tournament.entry_fee_team;
        } else if (r.registration_type === 'Individual' && tournament.entry_fee_individual) {
          return sum + tournament.entry_fee_individual;
        }
      }
      return sum;
    }, 0);

  const handleApproveRegistration = async (registrationId) => {
    try {
      await registrationService.updateRegistration(registrationId, {
        approval_status: 'Approved'
      });
      toast.success('Registration approved successfully');
      loadData(true);
    } catch (error) {
      console.error('Error approving registration:', error);
      toast.error(error.response?.data?.message || 'Failed to approve registration');
    }
  };

  const handleRejectRegistration = async (registrationId) => {
    try {
      await registrationService.updateRegistration(registrationId, {
        approval_status: 'Rejected'
      });
      toast.success('Registration rejected');
      loadData(true);
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast.error(error.response?.data?.message || 'Failed to reject registration');
    }
  };

  const handleGenerateDraws = async (tournamentId, categoryId) => {
    if (!tournamentId || !categoryId) {
      toast.error('Please select a tournament and category');
      return;
    }

    setLoading(true);
    try {
      // The backend already fetches the latest registrations, but we'll ensure data is fresh
      // by reloading registrations first to show updated player count
      toast.info('Generating match draws with latest registered players...', { autoClose: 2000 });

      const result = await matchService.generateDraws(tournamentId, categoryId, true);

      if (result.success) {
        let message = `Match draws generated! Created ${result.data.matchesCreated || 0} matches.`;

        // Add judge assignment information
        if (result.data.judgesAssigned) {
          const { totalJudges, judgesPerMatch, totalAssignments, unconfirmedJudges } = result.data.judgesAssigned;
          if (totalJudges > 0) {
            message += ` ${totalJudges} confirmed judge(s) assigned to all matches (${totalAssignments} total assignments).`;
          } else if (unconfirmedJudges > 0) {
            message += ` Warning: ${unconfirmedJudges} judge(s) assigned but not confirmed. No judges assigned to matches.`;
          } else {
            message += ` No judges assigned to this event.`;
          }
        }

        toast.success(message, { autoClose: 6000 });

        // Reload all data to show new matches in Live Event Score tab
        await loadData(true);

        // If we're on the Live Event Score tab, show a message
        if (activeTab === 'event-scoring') {
          toast.info('Matches are now available in Live Event Score tab', { autoClose: 3000 });
        }
      } else {
        toast.error(result.message || 'Failed to generate match draws');
      }
    } catch (error) {
      console.error('Error generating draws:', error);
      toast.error(error.response?.data?.message || 'Failed to generate match draws');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishBrackets = async (tournamentId) => {
    try {
      await tournamentService.updateTournament(tournamentId, {
        status: 'Open'
      });
      toast.success('Brackets and schedules published successfully!');
      loadData(true);
    } catch (error) {
      console.error('Error publishing brackets:', error);
      toast.error('Failed to publish brackets');
    }
  };

  const handleCloseTournament = async (tournamentId) => {
    try {
      await tournamentService.updateTournament(tournamentId, {
        status: 'Completed'
      });
      toast.success('Tournament closed and final results published!');
      loadData(true);
    } catch (error) {
      console.error('Error closing tournament:', error);
      toast.error('Failed to close tournament');
    }
  };

  // Event Scoring Functions
  const handleOpenMatchScoring = async (match) => {
    try {
      // Load full match details with participants
      const matchDetails = await matchService.getMatch(match._id);
      setSelectedMatchForScoring(matchDetails.data || match);
      setSelectedParticipantForScoring(null);
      setSelectedJudgeForScoring(null);
      setScoringData({
        technical_score: '',
        performance_score: '',
        yuko: 0,
        ippon: 0,
        waza_ari: 0,
        chukoku: 0,
        keikoku: 0,
        hansoku_chui: 0,
        hansoku: 0,
        jogai: 0,
        comments: ''
      });
      setShowMatchScoringModal(true);
    } catch (error) {
      console.error('Error loading match details:', error);
      toast.error('Failed to load match details');
    }
  };

  const handleOpenKataScoring = (performance) => {
    setSelectedKataPerformanceForScoring(performance);
    setSelectedJudgeForScoring(null);

    // Initialize scores for all judges (if they already have scores, pre-fill them)
    const initialScores = {};
    if (performance.scores && performance.scores.length > 0) {
      performance.scores.forEach(score => {
        const judgeId = score.judge_id?._id || score.judge_id;
        if (judgeId) {
          initialScores[String(judgeId)] = score.kata_score?.toString() || '';
        }
      });
    }
    setKataScoresByJudge(initialScores);

    setScoringData({
      kata_score: '',
      comments: ''
    });
    setShowKataScoringModal(true);
  };

  const handleOpenKataBulkScoring = (category, round = 'First Round') => {
    setSelectedCategoryForBulkScoring(category);
    setSelectedRoundForBulkScoring(round);

    // Load performances for this category and round
    const roundPerformances = kataPerformances.filter(p => {
      const perfCategoryId = p.category_id?._id || p.category_id;
      return String(perfCategoryId) === String(category._id) && p.round === round;
    });

    // Initialize scores for all performances
    const initialBulkScores = {};
    roundPerformances.forEach(perf => {
      const perfId = String(perf._id);
      initialBulkScores[perfId] = {};

      if (perf.scores && perf.scores.length > 0) {
        perf.scores.forEach(score => {
          const judgeId = score.judge_id?._id || score.judge_id;
          if (judgeId) {
            initialBulkScores[perfId][String(judgeId)] = score.kata_score?.toString() || '';
          }
        });
      }
    });

    setKataBulkScores(initialBulkScores);
    setShowKataBulkScoringModal(true);
  };

  const handleSubmitMatchScore = async (judgeId, participantId, scoreData) => {
    if (!selectedMatchForScoring || !participantId || !judgeId) {
      toast.error('Missing required information');
      return;
    }

    try {
      const isKumite = selectedMatchForScoring.match_type === 'Kumite' || selectedMatchForScoring.match_type === 'Team Kumite';

      let technicalScore = 0;
      let performanceScore = 0;

      if (isKumite) {
        // Calculate with Yuko (1), Waza-ari (2), Ippon (3)
        const points = (scoreData.yuko || 0) * 1 + (scoreData.waza_ari || 0) * 2 + (scoreData.ippon || 0) * 3;
        const penaltyDeduction = (scoreData.chukoku || 0) * 0.5 +
          (scoreData.keikoku || 0) * 1 +
          (scoreData.hansoku_chui || 0) * 1.5 +
          (scoreData.hansoku || 0) * 2 +
          (scoreData.jogai || 0) * 0.25;
        technicalScore = Math.max(0, Math.min(10, points - penaltyDeduction));
        performanceScore = technicalScore;
      } else {
        technicalScore = parseFloat(scoreData.technical_score) || 0;
        performanceScore = parseFloat(scoreData.performance_score) || 0;
      }

      const scorePayload = {
        match_id: selectedMatchForScoring._id,
        participant_id: participantId,
        judge_id: judgeId,
        technical_score: technicalScore,
        performance_score: performanceScore,
        ...(isKumite && {
          yuko: scoreData.yuko || 0,
          waza_ari: scoreData.waza_ari || 0,
          ippon: scoreData.ippon || 0,
          chukoku: scoreData.chukoku || 0,
          keikoku: scoreData.keikoku || 0,
          hansoku_chui: scoreData.hansoku_chui || 0,
          hansoku: scoreData.hansoku || 0,
          jogai: scoreData.jogai || 0
        }),
        comments: scoreData.comments || ''
      };

      await scoreService.submitScore(scorePayload);
      toast.success('Score submitted successfully!');
      loadData(false);
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error(error.response?.data?.message || 'Failed to submit score');
    }
  };

  const handleSubmitKataScore = async (e) => {
    e.preventDefault();
    if (!selectedKataPerformanceForScoring) {
      toast.error('Please select a performance');
      return;
    }

    // Validate all scores
    const scoresToSubmit = [];
    const errors = [];

    Object.entries(kataScoresByJudge).forEach(([judgeId, scoreValue]) => {
      if (scoreValue && scoreValue.trim() !== '') {
        const score = parseFloat(scoreValue);
        if (isNaN(score) || score < 5.0 || score > 10.0) {
          errors.push(`Judge ${judgeId}: Score must be between 5.0 and 10.0`);
        } else {
          scoresToSubmit.push({ judgeId, score });
        }
      }
    });

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    if (scoresToSubmit.length === 0) {
      toast.error('Please enter at least one score');
      return;
    }

    try {
      // Submit all scores
      const submitPromises = scoresToSubmit.map(({ judgeId, score }) =>
        api.post(`/kata-performances/${selectedKataPerformanceForScoring._id}/score`, {
          kata_score: score,
          judge_id: judgeId
        })
      );

      await Promise.all(submitPromises);
      toast.success(`Successfully submitted ${scoresToSubmit.length} score(s)!`);
      setShowKataScoringModal(false);
      setSelectedKataPerformanceForScoring(null);
      setKataScoresByJudge({});
      loadData(false);
    } catch (error) {
      console.error('Error submitting Kata scores:', error);
      toast.error(error.response?.data?.message || 'Failed to submit Kata scores');
    }
  };

  const handleCreateKataPerformances = async (round, selectedPlayerIds) => {
    if (!selectedCategoryForKataPerformance || !selectedPlayerIds || selectedPlayerIds.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    try {
      const tournamentId = selectedCategoryForKataPerformance.tournament_id?._id || selectedCategoryForKataPerformance.tournament_id;
      const response = await kataPerformanceService.createRoundPerformances({
        tournament_id: tournamentId,
        category_id: selectedCategoryForKataPerformance._id,
        round: round,
        player_ids: selectedPlayerIds
      });

      if (response.success) {
        toast.success(`Created ${response.data.length} performances for ${round}`);
        setShowKataPerformanceModal(false);
        setSelectedCategoryForKataPerformance(null);
        loadData(false);
      }
    } catch (error) {
      console.error('Error creating Kata performances:', error);
      toast.error(error.response?.data?.message || 'Failed to create Kata performances');
    }
  };

  const handleSavePlayerScores = async (performanceId, scores) => {
    try {
      const submitPromises = Object.entries(scores)
        .filter(([judgeId, scoreValue]) => scoreValue && scoreValue.trim() !== '')
        .map(([judgeId, scoreValue]) => {
          const score = parseFloat(scoreValue);
          if (isNaN(score) || score < 5.0 || score > 10.0) {
            throw new Error(`Invalid score for judge ${judgeId}: ${scoreValue}`);
          }
          return api.post(`/kata-performances/${performanceId}/score`, {
            kata_score: score,
            judge_id: judgeId
          });
        });

      if (submitPromises.length === 0) {
        toast.warning('No scores to save');
        return false;
      }

      await Promise.all(submitPromises);
      toast.success('Scores saved successfully!');
      return true;
    } catch (error) {
      console.error('Error saving player scores:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to save scores';

      toast.error(errorMessage);
      return false;
    }
  };

  const handleFinalizeRound = async () => {
    if (!selectedCategoryForBulkScoring) return;

    try {
      // First, reload performances to get the latest saved scores
      await loadData(false);

      // Wait a bit for data to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get current performances to check which scores are already saved
      const currentPerformances = await kataPerformanceService.getPerformances({
        category_id: selectedCategoryForBulkScoring._id,
        round: selectedRoundForBulkScoring
      });

      // Save any unsaved scores (scores in kataBulkScores that don't match saved scores)
      const unsavedScores = [];
      Object.entries(kataBulkScores).forEach(([performanceId, scores]) => {
        if (!scores || Object.keys(scores).length === 0) return;

        // Find the performance
        const performance = currentPerformances.data.find(p => String(p._id) === performanceId);
        if (!performance) return;

        // Check if any scores are different from saved scores
        const hasUnsavedChanges = Object.entries(scores).some(([judgeId, scoreValue]) => {
          if (!scoreValue || scoreValue.trim() === '') return false;

          // Check if this score is already saved
          const savedScore = performance.scores?.find(s => {
            const sJudgeId = s.judge_id?._id || s.judge_id;
            return String(sJudgeId) === judgeId;
          });

          // If no saved score or saved score is different, it's unsaved
          if (!savedScore) return true;
          const savedValue = savedScore.kata_score?.toString() || '';
          return savedValue !== scoreValue.trim();
        });

        if (hasUnsavedChanges) {
          unsavedScores.push([performanceId, scores]);
        }
      });

      if (unsavedScores.length > 0) {
        toast.info(`Saving ${unsavedScores.length} player score(s) before finalizing...`);
        const savePromises = unsavedScores.map(([performanceId, scores]) =>
          handleSavePlayerScores(performanceId, scores)
        );
        const results = await Promise.all(savePromises);

        if (!results.every(r => r === true)) {
          toast.error('Some scores failed to save. Please check and try again.');
          return;
        }

        // Wait a bit for scores to be saved and calculated
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Reload performances again to get updated final scores
      await loadData(false);

      // Wait a bit for backend to calculate final scores
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get updated performances with final scores
      const updatedPerformances = await kataPerformanceService.getPerformances({
        category_id: selectedCategoryForBulkScoring._id,
        round: selectedRoundForBulkScoring
      });

      // Determine next round and top performers
      let nextRound = null;
      let topCount = 0;

      if (selectedRoundForBulkScoring === 'First Round') {
        nextRound = 'Second Round (Final 8)';
        topCount = 8;
      } else if (selectedRoundForBulkScoring === 'Second Round (Final 8)') {
        nextRound = 'Third Round (Final 4)';
        topCount = 4;
      }

      if (nextRound && topCount > 0) {
        // Sort by final score (descending)
        const performancesWithScores = updatedPerformances.data || updatedPerformances || [];
        const sortedPerformances = performancesWithScores
          .filter(p => p.final_score !== null && p.final_score !== undefined)
          .sort((a, b) => b.final_score - a.final_score)
          .slice(0, topCount);

        if (sortedPerformances.length < topCount) {
          toast.warning(`Only ${sortedPerformances.length} players have final scores. Need ${topCount} for ${nextRound}. Please ensure all players have scores from at least 3 judges.`);
          return;
        }

        // Get player IDs for next round
        const topPlayerIds = sortedPerformances.map(p => {
          const playerId = p.player_id?._id || p.player_id;
          if (!playerId) {
            console.error('Player ID missing for performance:', p);
            return null;
          }
          return String(playerId);
        }).filter(Boolean);

        if (topPlayerIds.length < topCount) {
          toast.error(`Could not get player IDs for all top ${topCount} players. Please try again.`);
          return;
        }

        // Create performances for next round
        const tournamentId = selectedCategoryForBulkScoring.tournament_id?._id || selectedCategoryForBulkScoring.tournament_id;
        const createResponse = await kataPerformanceService.createRoundPerformances({
          tournament_id: tournamentId,
          category_id: selectedCategoryForBulkScoring._id,
          round: nextRound,
          player_ids: topPlayerIds
        });

        if (createResponse.success) {
          toast.success(`Round finalized! Top ${topCount} players advanced to ${nextRound}`);
          setShowKataBulkScoringModal(false);
          setSelectedCategoryForBulkScoring(null);
          setKataBulkScores({});
          await loadData(false);
        } else {
          toast.error(createResponse.message || 'Failed to create performances for next round');
        }
      } else if (selectedRoundForBulkScoring === 'Third Round (Final 4)') {
        // Final 4 round - assign rankings (1st, 2nd, 3rd, 3rd)
        try {
          const rankingResponse = await kataPerformanceService.assignRankings(
            selectedCategoryForBulkScoring._id,
            selectedRoundForBulkScoring
          );

          if (rankingResponse.success) {
            toast.success('Round finalized! Rankings assigned: 1st, 2nd, 3rd, 3rd place');
          } else {
            toast.warning('Round finalized, but rankings could not be assigned. Please try again.');
          }
        } catch (rankingError) {
          console.error('Error assigning rankings:', rankingError);
          toast.warning('Round finalized, but rankings could not be assigned. Please try again.');
        }

        setShowKataBulkScoringModal(false);
        setSelectedCategoryForBulkScoring(null);
        setKataBulkScores({});
        await loadData(false);
      } else {
        toast.success('Round finalized! This is the final round.');
        setShowKataBulkScoringModal(false);
        setSelectedCategoryForBulkScoring(null);
        setKataBulkScores({});
        await loadData(false);
      }
    } catch (error) {
      console.error('Error finalizing round:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        data: error.response?.data
      });
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to finalize round';
      toast.error(errorMessage);
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
      {selectedTournamentId && (
        <TournamentDetailModal
          tournamentId={selectedTournamentId}
          onClose={() => {
            setSelectedTournamentId(null);
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
                    Organizer Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Welcome back, {user?.first_name || user?.username}! Manage your tournaments and events
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateTournament(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition shadow-lg"
                >
                  <FiPlus className="w-5 h-5" />
                  Create Tournament
                </button>
              </div>

              {/* Tabs */}
              <div className="flex space-x-2 border-b border-gray-200 overflow-x-auto">
                {[
                  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
                  { id: 'tournaments', label: 'Tournaments', icon: FiAward },
                  { id: 'registrations', label: 'Registrations', icon: FiUsers },
                  { id: 'users', label: 'Users', icon: FiUsers },
                  { id: 'draws', label: 'Match Draws', icon: FiTarget },
                  { id: 'schedule', label: 'Schedule', icon: FiCalendar },
                  { id: 'judges', label: 'Judges', icon: FiUser },
                  { id: 'event-scoring', label: 'Live Event Score', icon: FiEdit },
                  
                  { id: 'notifications', label: 'Notifications', icon: FiBell }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 font-medium transition whitespace-nowrap ${activeTab === tab.id
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
                        <p className="text-gray-500 text-sm font-medium">Total Tournaments</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{totalTournaments}</p>
                        <p className="text-xs text-gray-500 mt-1">{activeTournaments} Active</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FiAward className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Pending Approvals</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{pendingRegistrations}</p>
                        <p className="text-xs text-gray-500 mt-1">{approvedRegistrations} Approved</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <FiUsers className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Upcoming Matches</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{upcomingMatches}</p>
                        <p className="text-xs text-gray-500 mt-1">{completedMatches} Completed</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <FiCalendar className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">Rs {totalRevenue.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 mt-1">From Paid Registrations</p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <FiDollarSign className="w-8 h-8 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 hover:shadow-xl transition cursor-pointer" onClick={() => setActiveTab('users')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Coaches</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{totalCoaches}</p>
                        <p className="text-xs text-gray-500 mt-1">Registered coaches</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <FiUser className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition cursor-pointer" onClick={() => setActiveTab('users')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Players</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{totalPlayers}</p>
                        <p className="text-xs text-gray-500 mt-1">Registered players</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <FiUsers className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500 hover:shadow-xl transition cursor-pointer" onClick={() => setActiveTab('users')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-sm font-medium">Total Judges</p>
                        <p className="text-3xl font-bold text-gray-800 mt-2">{totalJudges}</p>
                        <p className="text-xs text-gray-500 mt-1">Registered judges</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <FiUser className="w-8 h-8 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <button
                      onClick={() => setShowCreateTournament(true)}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <FiPlus className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="font-semibold text-gray-700">Create Tournament</span>
                    </button>
                    <button
                      onClick={() => navigate('/organizer/events')}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition"
                    >
                      <FiAward className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="font-semibold text-gray-700">Manage Events</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('registrations')}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition"
                    >
                      <FiCheckCircle className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="font-semibold text-gray-700">Approve Registrations</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('draws')}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition"
                    >
                      <FiTarget className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="font-semibold text-gray-700">Generate Match Draws</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('schedule')}
                      className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition"
                    >
                      <FiCalendar className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="font-semibold text-gray-700">Set Schedule</span>
                    </button>
                  </div>
                </div>

                {/* Recent Tournaments */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">My Tournaments</h2>
                    <button
                      onClick={() => setActiveTab('tournaments')}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View All <FiArrowRight />
                    </button>
                  </div>
                  {tournaments.length === 0 ? (
                    <div className="text-center py-12">
                      <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tournaments Yet</h3>
                      <p className="text-gray-600 mb-4">Create your first tournament to get started</p>
                      <button
                        onClick={() => setShowCreateTournament(true)}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition"
                      >
                        Create Tournament
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {organizerTournaments.slice(0, 6).map((tournament) => (
                        <TournamentCard
                          key={tournament._id}
                          tournament={tournament}
                          registrations={organizerRegistrations}
                          matches={organizerMatches}
                          onViewDetails={() => {
                            setSelectedTournamentId(tournament._id);
                          }}
                          onGenerateDraws={() => handleGenerateDraws(tournament._id)}
                          onPublishBrackets={() => handlePublishBrackets(tournament._id)}
                          onCloseTournament={() => handleCloseTournament(tournament._id)}
                          isOwner={isTournamentOwner(tournament)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Registrations */}
                {pendingRegistrations > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-2 border-yellow-200">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                          <FiClock className="w-6 h-6 text-yellow-600" />
                          Pending Registrations
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                          {pendingRegistrations} registration{pendingRegistrations !== 1 ? 's' : ''} awaiting approval
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('registrations')}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        Review All <FiArrowRight />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {organizerRegistrations
                        .filter(r => r.approval_status === 'Pending')
                        .slice(0, 5)
                        .map((registration) => (
                          <RegistrationApprovalCard
                            key={registration._id}
                            registration={registration}
                            tournaments={organizerTournaments}
                            onApprove={() => handleApproveRegistration(registration._id)}
                            onReject={() => handleRejectRegistration(registration._id)}
                          />
                        ))}
                    </div>
                  </div>
                )}


                {/* Upcoming Matches */}
                {upcomingMatches > 0 && (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-gray-800">Upcoming Matches</h2>
                      <button
                        onClick={() => setActiveTab('schedule')}
                        className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        View Schedule <FiArrowRight />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {matches
                        .filter(m => (m.status === 'Scheduled' || m.status === 'In Progress') && new Date(m.scheduled_time) > new Date())
                        .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                        .slice(0, 5)
                        .map((match) => (
                          <MatchCard
                            key={match._id}
                            match={match}
                            tournaments={tournaments}
                            onViewDetails={() => setSelectedMatch(match._id)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Tournaments Tab */}
            {activeTab === 'tournaments' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Tournament Management</h2>
                  <button
                    onClick={() => setShowCreateTournament(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FiPlus className="w-5 h-5" />
                    Create Tournament
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {organizerTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament._id}
                      tournament={tournament}
                      registrations={organizerRegistrations}
                      matches={organizerMatches}
                      onViewDetails={() => {
                        setSelectedTournamentId(tournament._id);
                      }}
                      onGenerateDraws={() => handleGenerateDraws(tournament._id)}
                      onPublishBrackets={() => handlePublishBrackets(tournament._id)}
                      onCloseTournament={() => handleCloseTournament(tournament._id)}
                      isOwner={isTournamentOwner(tournament)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Registrations Tab */}
            {activeTab === 'registrations' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Approve Registrations</h2>
                  <div className="flex items-center gap-2">
                    <select className="px-4 py-2 border border-gray-300 rounded-lg">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
                {organizerRegistrations.length === 0 ? (
                  <div className="text-center py-12">
                    <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Registrations</h3>
                    <p className="text-gray-600">No registrations have been submitted yet for your tournaments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {organizerRegistrations.map((registration) => (
                      <RegistrationApprovalCard
                        key={registration._id}
                        registration={registration}
                        tournaments={organizerTournaments}
                        onApprove={() => handleApproveRegistration(registration._id)}
                        onReject={() => handleRejectRegistration(registration._id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Users Tab - View All Coaches, Players, and Judges */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">All Users</h2>
                    <p className="text-sm text-gray-600 mt-1">View coaches, players, and judges registered for your tournaments</p>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by name, email, or username..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setUserFilterType('all')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${userFilterType === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      All ({coaches.length + players.length + judges.length})
                    </button>
                    <button
                      onClick={() => setUserFilterType('coaches')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${userFilterType === 'coaches'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Coaches ({coaches.length})
                    </button>
                    <button
                      onClick={() => setUserFilterType('players')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${userFilterType === 'players'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Players ({players.length})
                    </button>
                    <button
                      onClick={() => setUserFilterType('judges')}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${userFilterType === 'judges'
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      Judges ({judges.length})
                    </button>
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-4">
                  {/* Coaches */}
                  {(userFilterType === 'all' || userFilterType === 'coaches') && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FiUser className="w-5 h-5 text-green-600" />
                        Coaches ({coaches.length})
                      </h3>
                      {coaches.length === 0 ? (
                        <p className="text-gray-500 text-sm">No coaches registered</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {coaches
                            .filter(coach => {
                              if (!userSearchTerm) return true;
                              const searchLower = userSearchTerm.toLowerCase();
                              const user = coach.user_id || {};
                              const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                              return (
                                name.includes(searchLower) ||
                                user.username?.toLowerCase().includes(searchLower) ||
                                user.email?.toLowerCase().includes(searchLower) ||
                                coach.dojo?.dojo_name?.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((coach) => {
                              const user = coach.user_id || {};
                              return (
                                <div key={coach._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-800">
                                        {user.first_name && user.last_name
                                          ? `${user.first_name} ${user.last_name}`
                                          : user.username || 'Coach'}
                                      </h4>
                                      <p className="text-sm text-gray-600">{user.email}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                      Coach
                                    </span>
                                  </div>
                                  {coach.dojo && (
                                    <div className="mt-2 pt-2 border-t border-gray-100">
                                      <p className="text-xs text-gray-600">
                                        <span className="font-medium">Dojo:</span> {coach.dojo.dojo_name}
                                      </p>
                                    </div>
                                  )}
                                  {coach.certification_level && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      <span className="font-medium">Certification:</span> {coach.certification_level}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Players */}
                  {(userFilterType === 'all' || userFilterType === 'players') && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FiUsers className="w-5 h-5 text-purple-600" />
                        Players ({players.length})
                      </h3>
                      {players.length === 0 ? (
                        <p className="text-gray-500 text-sm">No players registered</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {players
                            .filter(player => {
                              if (!userSearchTerm) return true;
                              const searchLower = userSearchTerm.toLowerCase();
                              const user = player.user_id || {};
                              const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                              return (
                                name.includes(searchLower) ||
                                user.username?.toLowerCase().includes(searchLower) ||
                                user.email?.toLowerCase().includes(searchLower) ||
                                player.dojo_name?.toLowerCase().includes(searchLower) ||
                                player.coach_name?.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((player) => {
                              const user = player.user_id || {};
                              return (
                                <div key={player._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-800">
                                        {user.first_name && user.last_name
                                          ? `${user.first_name} ${user.last_name}`
                                          : user.username || 'Player'}
                                      </h4>
                                      <p className="text-sm text-gray-600">{user.email}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                      Player
                                    </span>
                                  </div>
                                  {player.dojo_name && (
                                    <p className="text-xs text-gray-600 mt-2">
                                      <span className="font-medium">Dojo:</span> {player.dojo_name}
                                    </p>
                                  )}
                                  {player.coach_name && (
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">Coach:</span> {player.coach_name}
                                    </p>
                                  )}
                                  {player.belt_rank && (
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">Belt:</span> {player.belt_rank}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Judges */}
                  {(userFilterType === 'all' || userFilterType === 'judges') && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <FiUser className="w-5 h-5 text-orange-600" />
                        Judges ({judges.length})
                      </h3>
                      {judges.length === 0 ? (
                        <p className="text-gray-500 text-sm">No judges registered</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {judges
                            .filter(judge => {
                              if (!userSearchTerm) return true;
                              const searchLower = userSearchTerm.toLowerCase();
                              const user = judge.user_id || {};
                              const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
                              return (
                                name.includes(searchLower) ||
                                user.username?.toLowerCase().includes(searchLower) ||
                                user.email?.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((judge) => {
                              const user = judge.user_id || {};
                              return (
                                <div key={judge._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-gray-800">
                                        {user.first_name && user.last_name
                                          ? `${user.first_name} ${user.last_name}`
                                          : user.username || 'Judge'}
                                      </h4>
                                      <p className="text-sm text-gray-600">{user.email}</p>
                                    </div>
                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                                      Judge
                                    </span>
                                  </div>
                                  {judge.certification_level && (
                                    <p className="text-xs text-gray-600 mt-2">
                                      <span className="font-medium">Certification:</span> {judge.certification_level}
                                    </p>
                                  )}
                                  {judge.experience_years && (
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium">Experience:</span> {judge.experience_years} years
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty State */}
                  {userFilterType === 'all' && coaches.length === 0 && players.length === 0 && judges.length === 0 && (
                    <div className="text-center py-12">
                      <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">No Users Found</h3>
                      <p className="text-gray-600">No users have registered in the system yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Match Draws Tab */}
            {activeTab === 'draws' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Generate AI Match Draws</h2>
                  <button
                    onClick={() => navigate('/organizer/draws')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Advanced Draws <FiArrowRight />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organizerTournaments
                    .filter(t => t.status === 'Open' || t.status === 'Ongoing')
                    .map((tournament) => {
                      const tournamentCategories = categories.filter(c => {
                        const catTournamentId = c.tournament_id?._id || c.tournament_id;
                        return catTournamentId === tournament._id || catTournamentId?.toString() === tournament._id?.toString();
                      });
                      const tournamentMatches = organizerMatches.filter(m => {
                        const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                        return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
                      });

                      return (
                        <div key={tournament._id} className="border border-gray-200 rounded-xl p-6">
                          <h3 className="font-bold text-lg text-gray-800 mb-4">{tournament.tournament_name}</h3>
                          <div className="space-y-3">
                            {tournamentCategories.map((category) => (
                              <div key={category._id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-800">{category.category_name}</p>
                                    <p className="text-sm text-gray-600">
                                      {category.match_type} • {category.age_group || 'All Ages'}
                                    </p>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {tournamentMatches.filter(m => {
                                      const matchCategoryId = m.category_id?._id || m.category_id;
                                      return matchCategoryId === category._id || matchCategoryId?.toString() === category._id?.toString();
                                    }).length} Matches
                                  </span>
                                </div>
                                {isTournamentOwner(tournament) && (
                                  <button
                                    onClick={() => handleGenerateDraws(tournament._id, category._id)}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                                  >
                                    Generate AI Draws
                                  </button>
                                )}
                                {!isTournamentOwner(tournament) && (
                                  <p className="text-sm text-gray-500 text-center py-2">
                                    View only - Not your tournament
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Set Schedule & Tatami Numbers</h2>
                  <button
                    onClick={() => navigate('/organizer/schedule')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Calendar View <FiArrowRight />
                  </button>
                </div>
                <div className="space-y-4">
                  {organizerMatches
                    .filter(m => m.status === 'Scheduled' || m.status === 'In Progress')
                    .sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time))
                    .map((match) => (
                      <MatchScheduleCard
                        key={match._id}
                        match={match}
                        tournaments={organizerTournaments}
                        onEdit={() => setSelectedMatch(match._id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Judges Tab */}
            {activeTab === 'judges' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Assign Judges to Events</h2>
                  <button
                    onClick={() => navigate('/organizer/events')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FiSettings className="w-5 h-5" />
                    Manage Events & Assign Judges
                  </button>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <p className="text-blue-800 mb-2">
                    <strong>How to Assign Judges:</strong>
                  </p>
                  <p className="text-blue-700 text-sm mb-4">
                    Judges are assigned to events (categories), not individual matches. When you assign judges to an event,
                    they will automatically judge all matches in that event.
                  </p>
                  <ol className="text-blue-700 text-sm space-y-2 list-decimal list-inside">
                    <li>Go to <strong>Event Management</strong> (click the button above or navigate via sidebar)</li>
                    <li>Select a tournament and find the event you want to assign judges to</li>
                    <li>Click the <strong>"Setup Tatami"</strong> button (⚙️ icon) on the event card</li>
                    <li>Assign up to 5 judges to the event</li>
                    <li>Judges will receive notifications and must confirm their assignment</li>
                    <li>Once confirmed, judges will automatically be assigned to all matches in that event</li>
                  </ol>
                </div>
                <div className="space-y-4">
                  {categories.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No events created yet</p>
                      <p className="text-sm text-gray-500 mb-4">Create events in Event Management to assign judges</p>
                      <button
                        onClick={() => navigate('/organizer/events')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Go to Event Management
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map((category) => {
                        const categoryMatches = matches.filter(m => {
                          const matchCategoryId = m.category_id?._id || m.category_id;
                          return String(matchCategoryId) === String(category._id);
                        });
                        return (
                          <div key={category._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                            <h3 className="font-semibold text-gray-800 mb-2">{category.category_name}</h3>
                            <p className="text-sm text-gray-600 mb-2">
                              {category.category_type} • {category.participation_type}
                            </p>
                            <p className="text-xs text-gray-500 mb-3">
                              {categoryMatches.length} match{categoryMatches.length !== 1 ? 'es' : ''}
                            </p>
                            <button
                              onClick={() => navigate(`/organizer/events?tournament=${category.tournament_id?._id || category.tournament_id}`)}
                              className="w-full text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                              Setup Tatami & Assign Judges
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Event Score Tab - Table Worker Scoring */}
            {activeTab === 'event-scoring' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Live Event Score</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Table workers can enter scores for matches based on judge marks shown in real tournaments
                    </p>
                  </div>
                  <button
                    onClick={() => loadData(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FiRefreshCw className="w-5 h-5" />
                    Refresh
                  </button>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded">
                  <p className="text-sm text-blue-800">
                    <strong>How it works:</strong> Judges show their marks in real tournaments. Table workers enter these scores into the system here.
                    Each event has assigned judges. You can score matches and Kata performances for each event.
                  </p>
                </div>

                {organizerTournaments.length === 0 ? (
                  <div className="text-center py-12">
                    <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tournaments</h3>
                    <p className="text-gray-600">Create tournaments and generate match draws to start scoring</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {organizerTournaments
                      .filter(t => t.status === 'Open' || t.status === 'Ongoing')
                      .map((tournament) => {
                        const tournamentCategories = categories.filter(c => {
                          const catTournamentId = c.tournament_id?._id || c.tournament_id;
                          return catTournamentId === tournament._id || catTournamentId?.toString() === tournament._id?.toString();
                        });
                        const tournamentMatches = organizerMatches.filter(m => {
                          const matchTournamentId = m.tournament_id?._id || m.tournament_id;
                          return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
                        });

                        return (
                          <div key={tournament._id} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-xl font-bold text-gray-800">{tournament.tournament_name}</h3>
                                <p className="text-sm text-gray-600">
                                  {tournamentCategories.length} event{tournamentCategories.length !== 1 ? 's' : ''} • {tournamentMatches.length} match{tournamentMatches.length !== 1 ? 'es' : ''}
                                </p>
                              </div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
                                  tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>
                                {tournament.status}
                              </span>
                            </div>

                            {tournamentCategories.length === 0 ? (
                              <div className="text-center py-8 bg-gray-50 rounded-lg">
                                <p className="text-gray-600">No events created yet. Create events to start scoring.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {tournamentCategories.map((category) => {
                                  const eventMatches = tournamentMatches.filter(m => {
                                    const matchCategoryId = m.category_id?._id || m.category_id;
                                    return matchCategoryId === category._id || matchCategoryId?.toString() === category._id?.toString();
                                  });
                                  const isKata = category.category_type === 'Kata' || category.category_type === 'Team Kata';

                                  return (
                                    <div key={category._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                      <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                          <h4 className="font-bold text-lg text-gray-800 mb-1">
                                            {category.category_name}
                                          </h4>
                                          <p className="text-sm text-gray-600">
                                            {category.category_type} • {category.participation_type}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {eventMatches.length} match{eventMatches.length !== 1 ? 'es' : ''}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => navigate(`/organizer/events?tournament=${tournament._id}`)}
                                          className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                                        >
                                          View Event
                                        </button>
                                      </div>

                                      {/* Assigned Judges Section */}
                                      <div className="mb-4">
                                        <p className="text-sm font-semibold text-gray-700 mb-2">Assigned Judges:</p>
                                        {(() => {
                                          const eventTatami = tatamis.find(t => {
                                            const tatamiCategoryId = t.category_id?._id || t.category_id;
                                            return String(tatamiCategoryId) === String(category._id);
                                          });
                                          const assignedJudges = eventTatami?.assigned_judges || [];
                                          const confirmedJudges = assignedJudges.filter(j => j.is_confirmed);

                                          return (
                                            <div className="bg-white rounded p-3 border border-gray-200">
                                              {confirmedJudges.length > 0 ? (
                                                <div className="space-y-2">
                                                  {confirmedJudges.map((judgeAssignment, idx) => {
                                                    const judge = judgeAssignment.judge_id || {};
                                                    const judgeUser = judge.user_id || {};
                                                    const judgeName = judgeUser.first_name && judgeUser.last_name
                                                      ? `${judgeUser.first_name} ${judgeUser.last_name}`
                                                      : judgeUser.username || `Judge ${idx + 1}`;
                                                    return (
                                                      <div key={idx} className="flex items-center justify-between text-xs">
                                                        <span className="text-gray-700">{judgeName}</span>
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                                          Confirmed
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <p className="text-xs text-gray-600">
                                                  No confirmed judges yet. Assign judges in Event Management.
                                                </p>
                                              )}
                                              <button
                                                onClick={() => navigate(`/organizer/events?tournament=${tournament._id}`)}
                                                className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                                              >
                                                View/Assign Judges →
                                              </button>
                                            </div>
                                          );
                                        })()}
                                      </div>

                                      {/* Matches/Performances Section */}
                                      {isKata ? (
                                        <div>
                                          <div className="flex items-center justify-between mb-3">
                                            <p className="text-sm font-semibold text-gray-700">Kata Performances:</p>
                                            <button
                                              onClick={() => {
                                                setSelectedCategoryForKataPerformance(category);
                                                setShowKataPerformanceModal(true);
                                              }}
                                              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                            >
                                              Create Performances
                                            </button>
                                          </div>
                                          {(() => {
                                            const eventKataPerformances = kataPerformances.filter(p => {
                                              const perfCategoryId = p.category_id?._id || p.category_id;
                                              return String(perfCategoryId) === String(category._id);
                                            });

                                            if (eventKataPerformances.length === 0) {
                                              return (
                                                <div className="bg-white rounded p-3 border border-gray-200">
                                                  <p className="text-xs text-gray-600 mb-2">
                                                    No Kata performances created yet. Create performances to start scoring.
                                                  </p>
                                                </div>
                                              );
                                            }

                                            // Group by round
                                            const performancesByRound = {};
                                            eventKataPerformances.forEach(perf => {
                                              if (!performancesByRound[perf.round]) {
                                                performancesByRound[perf.round] = [];
                                              }
                                              performancesByRound[perf.round].push(perf);
                                            });

                                            const rounds = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'];

                                            return (
                                              <div className="space-y-4">
                                                {rounds.map(round => {
                                                  const roundPerformances = performancesByRound[round] || [];
                                                  if (roundPerformances.length === 0) return null;

                                                  return (
                                                    <div key={round} className="bg-white rounded-lg border border-gray-200 p-4">
                                                      <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                          <h5 className="text-sm font-bold text-gray-800">{round}</h5>
                                                          <p className="text-xs text-gray-600">
                                                            {roundPerformances.length} player{roundPerformances.length !== 1 ? 's' : ''}
                                                          </p>
                                                        </div>
                                                        <button
                                                          onClick={() => handleOpenKataBulkScoring(category, round)}
                                                          className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition font-semibold"
                                                        >
                                                          Score All Players
                                                        </button>
                                                      </div>
                                                      <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {roundPerformances
                                                          .sort((a, b) => {
                                                            if (a.final_score === null && b.final_score !== null) return 1;
                                                            if (a.final_score !== null && b.final_score === null) return -1;
                                                            if (a.final_score === null && b.final_score === null) return a.performance_order - b.performance_order;
                                                            return b.final_score - a.final_score;
                                                          })
                                                          .map((performance) => {
                                                            const playerName = performance.player_id?.user_id
                                                              ? `${performance.player_id.user_id.first_name || ''} ${performance.player_id.user_id.last_name || ''}`.trim() || performance.player_id.user_id.username
                                                              : 'Player';
                                                            const scoresCount = performance.scores?.length || 0;
                                                            return (
                                                              <div key={performance._id} className="bg-gray-50 rounded p-2 border border-gray-200 flex items-center justify-between">
                                                                <div className="flex-1">
                                                                  <p className="text-sm font-semibold text-gray-800">{playerName}</p>
                                                                  <div className="flex items-center gap-3 mt-1">
                                                                    <p className="text-xs text-gray-600">
                                                                      Order: {performance.performance_order}
                                                                    </p>
                                                                    {scoresCount > 0 && (
                                                                      <p className="text-xs text-blue-600">
                                                                        {scoresCount}/5 judges scored
                                                                      </p>
                                                                    )}
                                                                    {performance.final_score !== null && (
                                                                      <p className="text-xs text-green-600 font-semibold">
                                                                        Final: {performance.final_score.toFixed(1)}
                                                                      </p>
                                                                    )}
                                                                  </div>
                                                                </div>
                                                                <button
                                                                  onClick={() => handleOpenKataScoring(performance)}
                                                                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                                                >
                                                                  Edit
                                                                </button>
                                                              </div>
                                                            );
                                                          })}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-sm font-semibold text-gray-700 mb-2">Matches:</p>
                                          {eventMatches.length === 0 ? (
                                            <div className="bg-white rounded p-3 border border-gray-200">
                                              <p className="text-xs text-gray-600">
                                                No matches yet. Generate match draws to create matches for this event.
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                              {eventMatches.slice(0, 10).map((match) => {
                                                const isCompleted = match.status === 'Completed';
                                                const winner = match.winner_id;
                                                const winnerParticipant = match.participants?.find(p => {
                                                  const pId = p.player_id?._id || p.team_id?._id;
                                                  return pId?.toString() === winner?.toString();
                                                });

                                                return (
                                                  <div
                                                    key={match._id}
                                                    className={`rounded p-3 border-2 flex items-center justify-between transition ${isCompleted
                                                        ? 'bg-green-50 border-green-400'
                                                        : 'bg-white border-gray-200'
                                                      }`}
                                                  >
                                                    <div className="flex-1">
                                                      <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-semibold text-gray-800">{match.match_name || 'Match'}</p>
                                                        {isCompleted && (
                                                          <FiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" title="Match Completed" />
                                                        )}
                                                      </div>
                                                      <p className="text-xs text-gray-600">
                                                        {format(new Date(match.scheduled_time), 'MMM dd, HH:mm')} •
                                                        <span className={`ml-1 font-semibold ${isCompleted ? 'text-green-700' : 'text-gray-600'
                                                          }`}>
                                                          {match.status}
                                                        </span>
                                                      </p>
                                                      {isCompleted && winnerParticipant && (
                                                        <p className="text-xs text-yellow-700 font-semibold mt-1">
                                                          🏆 Winner: {
                                                            winnerParticipant.player_id?.user_id
                                                              ? `${winnerParticipant.player_id.user_id.first_name || ''} ${winnerParticipant.player_id.user_id.last_name || ''}`.trim() || winnerParticipant.player_id.user_id.username
                                                              : winnerParticipant.team_id?.team_name || 'Unknown'
                                                          }
                                                        </p>
                                                      )}
                                                    </div>
                                                    <button
                                                      onClick={() => handleOpenMatchScoring(match)}
                                                      className={`text-xs px-3 py-1 rounded transition ${isCompleted
                                                          ? 'bg-green-600 text-white hover:bg-green-700'
                                                          : 'bg-green-600 text-white hover:bg-green-700'
                                                        }`}
                                                    >
                                                      {isCompleted ? 'View Match' : 'Score Match'}
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                              {eventMatches.length > 10 && (
                                                <p className="text-xs text-gray-500 text-center pt-2">
                                                  +{eventMatches.length - 10} more matches
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
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
            )}


            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Tournament Results</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    <FiDownload className="w-5 h-5" />
                    Export Results
                  </button>
                </div>
                <div className="space-y-4">
                  {tournaments
                    .filter(t => t.status === 'Completed' || t.status === 'Ongoing')
                    .map((tournament) => (
                      <TournamentResultsCard
                        key={tournament._id}
                        tournament={tournament}
                        matches={matches}
                        scores={scores}
                        onCloseTournament={() => handleCloseTournament(tournament._id)}
                        isOwner={isTournamentOwner(tournament)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Send Announcements & Notifications</h2>
                  <button
                    onClick={() => navigate('/organizer/notifications')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <FiSend className="w-5 h-5" />
                    Send Notification
                  </button>
                </div>
                <div className="space-y-3">
                  {notifications.slice(0, 10).map((notification) => (
                    <NotificationCard key={notification._id} notification={notification} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Tournament Modal */}
        {showCreateTournament && (
          <CreateTournamentModal
            onClose={() => {
              setShowCreateTournament(false);
              loadData(true);
            }}
            onSuccess={(tournamentId) => {
              setShowCreateTournament(false);
              setNewlyCreatedTournamentId(tournamentId);
              setShowAddEventsPrompt(true);
              loadData(true);
            }}
          />
        )}


        {/* Add Events Prompt Modal */}
        {showAddEventsPrompt && newlyCreatedTournamentId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <FiCheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                  Tournament Created Successfully!
                </h2>
                <p className="text-gray-600 text-center mb-6">
                  Your tournament has been created. Now you can add events with customizable settings (age groups, belt categories, weight classes, and entry fees).
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> You can create fully customizable events:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                      <li>Custom age groups (e.g., Under 8, Under 10, Novice 10-12)</li>
                      <li>Custom belt groupings (e.g., Novice: White-Green)</li>
                      <li>Custom weight classes (e.g., -25kg, -30kg, -35kg)</li>
                      <li>Or use WKF standard categories</li>
                    </ul>
                  </p>
                </div>

                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => {
                      setShowAddEventsPrompt(false);
                      navigate(`/organizer/events?tournament=${newlyCreatedTournamentId}`);
                      setNewlyCreatedTournamentId(null);
                    }}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-medium flex items-center justify-center"
                  >
                    <FiPlus className="w-5 h-5 mr-2" />
                    Add Events Now
                  </button>
                  <button
                    onClick={() => {
                      setShowAddEventsPrompt(false);
                      setNewlyCreatedTournamentId(null);
                    }}
                    className="w-full px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    I'll Add Events Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Match Scoring Modal */}
        {showMatchScoringModal && selectedMatchForScoring && (
          <MatchScoringModal
            match={selectedMatchForScoring}
            participant={selectedParticipantForScoring}
            setParticipant={setSelectedParticipantForScoring}
            judge={selectedJudgeForScoring}
            setJudge={setSelectedJudgeForScoring}
            judges={judges}
            tatamis={tatamis}
            category={categories.find(c => {
              const matchCategoryId = selectedMatchForScoring.category_id?._id || selectedMatchForScoring.category_id;
              return String(c._id) === String(matchCategoryId);
            })}
            scoringData={scoringData}
            setScoringData={setScoringData}
            onSubmit={handleSubmitMatchScore}
            loadData={loadData}
            onClose={(shouldRefresh = false) => {
              setShowMatchScoringModal(false);
              setSelectedMatchForScoring(null);
              setSelectedParticipantForScoring(null);
              setSelectedJudgeForScoring(null);
              // Reset scoring data
              setScoringData({
                technical_score: '',
                performance_score: '',
                yuko: 0,
                ippon: 0,
                waza_ari: 0,
                chukoku: 0,
                keikoku: 0,
                hansoku_chui: 0,
                hansoku: 0,
                jogai: 0,
                kata_score: '',
                comments: ''
              });
            }}
            scores={scores}
          />
        )}

        {/* Kata Scoring Modal */}
        {showKataScoringModal && selectedKataPerformanceForScoring && (
          <KataScoringModal
            performance={selectedKataPerformanceForScoring}
            judge={selectedJudgeForScoring}
            setJudge={setSelectedJudgeForScoring}
            judges={judges}
            tatamis={tatamis}
            category={categories.find(c => {
              const perfCategoryId = selectedKataPerformanceForScoring.category_id?._id || selectedKataPerformanceForScoring.category_id;
              return String(c._id) === String(perfCategoryId);
            })}
            kataScoresByJudge={kataScoresByJudge}
            setKataScoresByJudge={setKataScoresByJudge}
            onSubmit={handleSubmitKataScore}
            onClose={() => {
              setShowKataScoringModal(false);
              setSelectedKataPerformanceForScoring(null);
              setSelectedJudgeForScoring(null);
              setKataScoresByJudge({});
            }}
          />
        )}

        {/* Kata Bulk Scoring Modal - All Players at Once */}
        {showKataBulkScoringModal && selectedCategoryForBulkScoring && (
          <KataBulkScoringModal
            category={selectedCategoryForBulkScoring}
            tournament={tournaments.find(t => {
              const catTournamentId = selectedCategoryForBulkScoring.tournament_id?._id || selectedCategoryForBulkScoring.tournament_id;
              return String(t._id) === String(catTournamentId);
            })}
            round={selectedRoundForBulkScoring}
            performances={kataPerformances.filter(p => {
              const perfCategoryId = p.category_id?._id || p.category_id;
              return String(perfCategoryId) === String(selectedCategoryForBulkScoring._id) && p.round === selectedRoundForBulkScoring;
            })}
            judges={judges}
            tatamis={tatamis}
            kataBulkScores={kataBulkScores}
            setKataBulkScores={setKataBulkScores}
            onSavePlayerScores={handleSavePlayerScores}
            onFinalizeRound={handleFinalizeRound}
            onRefresh={async () => {
              // CRITICAL: Refresh kata performances data to get ALL saved scores for ALL players
              // This ensures that when one player's scores are saved, all other players' saved scores
              // remain visible and are displayed correctly
              // Scores must persist until "Finalize & Advance" is clicked
              if (selectedCategoryForBulkScoring) {
                try {
                  // Fetch fresh performances for this category - this includes ALL saved scores
                  const response = await kataPerformanceService.getPerformances({
                    category_id: selectedCategoryForBulkScoring._id
                  });
                  const freshPerformances = response.data || [];

                  // Update kataPerformances state with fresh data
                  // This ensures the performances prop contains all saved scores for all players
                  setKataPerformances(prev => {
                    // Remove old performances for this category and replace with fresh ones
                    const otherPerformances = prev.filter(p => {
                      const perfCategoryId = p.category_id?._id || p.category_id;
                      return String(perfCategoryId) !== String(selectedCategoryForBulkScoring._id);
                    });
                    return [...otherPerformances, ...freshPerformances];
                  });
                } catch (error) {
                  console.error('Error refreshing kata performances:', error);
                  // Fallback to full reload
                  await loadData(false);
                }
              } else {
                // Fallback to full reload
                await loadData(false);
              }
            }}
            onClose={() => {
              setShowKataBulkScoringModal(false);
              setSelectedCategoryForBulkScoring(null);
              setSelectedRoundForBulkScoring('First Round');
              setKataBulkScores({});
            }}
          />
        )}

        {/* Kata Performance Management Modal */}
        {showKataPerformanceModal && selectedCategoryForKataPerformance && (
          <KataPerformanceManagementModal
            category={selectedCategoryForKataPerformance}
            tournament={tournaments.find(t => {
              const catTournamentId = selectedCategoryForKataPerformance.tournament_id?._id || selectedCategoryForKataPerformance.tournament_id;
              return String(t._id) === String(catTournamentId);
            })}
            registrations={registrations}
            kataPerformances={kataPerformances}
            onCreatePerformances={handleCreateKataPerformances}
            onClose={() => {
              setShowKataPerformanceModal(false);
              setSelectedCategoryForKataPerformance(null);
            }}
          />
        )}
      </Layout>
    </>
  );
};

// Match Scoring Modal Component
const MatchScoringModal = ({ match, participant, setParticipant, judge, setJudge, judges, tatamis, category, scoringData, setScoringData, onSubmit, onClose, scores, loadData }) => {
  const isKumite = match.match_type === 'Kumite' || match.match_type === 'Team Kumite';
  const isKata = match.match_type === 'Kata' || match.match_type === 'Team Kata';

  // Get assigned judges for this event
  const eventTatami = category ? tatamis.find(t => {
    const tatamiCategoryId = t.category_id?._id || t.category_id;
    return String(tatamiCategoryId) === String(category._id);
  }) : null;
  const assignedJudges = eventTatami?.assigned_judges?.filter(j => j.is_confirmed) || [];
  const availableJudges = assignedJudges.map(j => {
    const judgeObj = j.judge_id || {};
    return judges.find(judge => String(judge._id) === String(judgeObj._id || judgeObj));
  }).filter(Boolean);

  // For Kumite: Store scores for one unified scoring interface
  const [kumiteScores, setKumiteScores] = useState({}); // { participantId: { yuko, waza_ari, ippon, penalties } }
  const [kumitePenalties, setKumitePenalties] = useState({}); // { participantId: { category1: ['C1', 'K1', ...], category2: ['C2', 'K2', ...] } }
  const [submittingScores, setSubmittingScores] = useState(false);
  const [selectedJudgeForScoring, setSelectedJudgeForScoring] = useState(null); // First judge by default
  const initializedRef = useRef(false); // Track if we've initialized to prevent re-initialization

  // Load existing scores for Kumite - use the first judge's scores
  useEffect(() => {
    if (!isKumite || !match || !match.participants || availableJudges.length === 0) {
      initializedRef.current = false;
      return;
    }

    const matchId = match._id?.toString() || match._id;
    const firstJudge = availableJudges[0];
    const firstJudgeId = firstJudge?._id?.toString() || firstJudge?._id;

    // Set first judge as default (only once)
    if (!selectedJudgeForScoring && firstJudge) {
      setSelectedJudgeForScoring(firstJudge);
      initializedRef.current = false;
      return; // Exit early, will re-run after judge is set
    }

    // Load scores for the selected judge
    const judgeToUse = selectedJudgeForScoring || firstJudge;
    if (!judgeToUse) return;

    const judgeToUseId = judgeToUse._id?.toString() || judgeToUse._id;

    // Prevent re-initialization if we've already loaded for this match and judge
    const initializationKey = `${matchId}_${judgeToUseId}`;
    if (initializedRef.current === initializationKey) {
      return; // Already initialized for this match/judge combination
    }

    const scoresByParticipant = {};
    const penaltiesByParticipant = {};

    match.participants.forEach(participant => {
      const participantIdStr = String(participant._id);
      const participantId = participant._id?.toString() || participant._id;

      const existingScore = scores.find(s => {
        const sMatchId = s.match_id?._id?.toString() || s.match_id?.toString() || s.match_id;
        const sParticipantId = s.participant_id?._id?.toString() || s.participant_id?.toString() || s.participant_id;
        const sJudgeId = s.judge_id?._id?.toString() || s.judge_id?.toString() || s.judge_id;
        return sMatchId === matchId &&
          sParticipantId === participantId &&
          sJudgeId === judgeToUseId;
      });

      if (existingScore) {
        scoresByParticipant[participantIdStr] = {
          yuko: existingScore.yuko || 0,
          waza_ari: existingScore.waza_ari || 0,
          ippon: existingScore.ippon || 0,
          chukoku: existingScore.chukoku || 0,
          keikoku: existingScore.keikoku || 0,
          hansoku_chui: existingScore.hansoku_chui || 0,
          hansoku: existingScore.hansoku || 0,
          jogai: existingScore.jogai || 0,
          comments: existingScore.comments || ''
        };
      } else {
        scoresByParticipant[participantIdStr] = {
          yuko: 0,
          waza_ari: 0,
          ippon: 0,
          chukoku: 0,
          keikoku: 0,
          hansoku_chui: 0,
          hansoku: 0,
          jogai: 0,
          comments: ''
        };
      }

      // Initialize penalties list (start fresh, user can re-apply)
      penaltiesByParticipant[participantIdStr] = {
        category1: [],
        category2: []
      };
    });

    // Update states once with all data
    setKumiteScores(scoresByParticipant);
    setKumitePenalties(penaltiesByParticipant);
    initializedRef.current = initializationKey;
  }, [isKumite, match?._id, match?.participants?.length, availableJudges?.length, selectedJudgeForScoring?._id]);

  const handleKumiteScoreClick = async (participantId, scoreType, value) => {
    // Use first judge if none selected
    const judgeToUse = selectedJudgeForScoring || availableJudges[0];
    if (submittingScores || !judgeToUse) return;

    setSubmittingScores(true);

    try {
      const participantIdStr = String(participantId);
      const currentScore = kumiteScores[participantIdStr] || {
        yuko: 0,
        waza_ari: 0,
        ippon: 0,
        chukoku: 0,
        keikoku: 0,
        hansoku_chui: 0,
        hansoku: 0,
        jogai: 0,
        comments: ''
      };

      const updatedScore = { ...currentScore };
      const currentPenalties = kumitePenalties[participantId] || { category1: [], category2: [] };
      const updatedPenalties = { ...currentPenalties };

      if (scoreType === 'yuko') {
        updatedScore.yuko = Math.max(0, (updatedScore.yuko || 0) + value);
      } else if (scoreType === 'waza_ari') {
        updatedScore.waza_ari = Math.max(0, (updatedScore.waza_ari || 0) + value);
      } else if (scoreType === 'ippon') {
        updatedScore.ippon = Math.max(0, (updatedScore.ippon || 0) + value);
      } else if (scoreType.startsWith('penalty_')) {
        const parts = scoreType.split('_');
        if (parts.length >= 3) {
          const category = parts[1]; // '1' or '2'
          const penaltyType = parts.slice(2).join('_'); // 'chukoku', 'keikoku', etc.

          // Map penalty type to display code
          let penaltyCode = '';
          if (penaltyType === 'chukoku') penaltyCode = 'C' + category;
          else if (penaltyType === 'keikoku') penaltyCode = 'K' + category;
          else if (penaltyType === 'hansoku_chui') penaltyCode = 'HC' + category;
          else if (penaltyType === 'hansoku') penaltyCode = 'H' + category;

          const categoryKey = category === '1' ? 'category1' : 'category2';

          if (value > 0) {
            // Add penalty to the correct category list
            const currentCategoryList = updatedPenalties[categoryKey] || [];
            updatedPenalties[categoryKey] = [...currentCategoryList, penaltyCode];

            // Update score counts (combine both categories for backend)
            if (penaltyType === 'chukoku') {
              updatedScore.chukoku = (updatedScore.chukoku || 0) + 1;
            } else if (penaltyType === 'keikoku') {
              updatedScore.keikoku = (updatedScore.keikoku || 0) + 1;
            } else if (penaltyType === 'hansoku_chui') {
              updatedScore.hansoku_chui = (updatedScore.hansoku_chui || 0) + 1;
            } else if (penaltyType === 'hansoku') {
              updatedScore.hansoku = (updatedScore.hansoku || 0) + 1;
            }
          } else if (value < 0) {
            // Remove last occurrence of this penalty from the correct category
            const penaltyList = updatedPenalties[categoryKey] || [];
            const lastIndex = penaltyList.lastIndexOf(penaltyCode);
            if (lastIndex !== -1) {
              updatedPenalties[categoryKey] = penaltyList.filter((_, idx) => idx !== lastIndex);

              // Update score counts
              if (penaltyType === 'chukoku') {
                updatedScore.chukoku = Math.max(0, (updatedScore.chukoku || 0) - 1);
              } else if (penaltyType === 'keikoku') {
                updatedScore.keikoku = Math.max(0, (updatedScore.keikoku || 0) - 1);
              } else if (penaltyType === 'hansoku_chui') {
                updatedScore.hansoku_chui = Math.max(0, (updatedScore.hansoku_chui || 0) - 1);
              } else if (penaltyType === 'hansoku') {
                updatedScore.hansoku = Math.max(0, (updatedScore.hansoku || 0) - 1);
              }
            }
          }
        }
      }

      // Update penalties state (use string key for consistency)
      setKumitePenalties(prev => ({
        ...prev,
        [participantIdStr]: { ...updatedPenalties }
      }));

      // Update local state
      setKumiteScores(prev => ({
        ...prev,
        [participantIdStr]: updatedScore
      }));

      // Submit score for the first judge (only one update)
      await onSubmit(judgeToUse._id, participantId, updatedScore);
    } catch (error) {
      console.error('Error updating score:', error);
    } finally {
      setSubmittingScores(false);
    }
  };

  const handleClearScores = async (participantId) => {
    // Use first judge if none selected
    const judgeToUse = selectedJudgeForScoring || availableJudges[0];
    if (submittingScores || !judgeToUse) return;

    if (!window.confirm('Are you sure you want to clear all scores for this participant?')) {
      return;
    }

    setSubmittingScores(true);

    try {
      const clearedScore = {
        yuko: 0,
        waza_ari: 0,
        ippon: 0,
        chukoku: 0,
        keikoku: 0,
        hansoku_chui: 0,
        hansoku: 0,
        jogai: 0,
        comments: ''
      };

      // Update local state
      const participantIdStr = String(participantId);
      setKumiteScores(prev => ({
        ...prev,
        [participantIdStr]: clearedScore
      }));

      // Clear penalties
      setKumitePenalties(prev => ({
        ...prev,
        [participantIdStr]: { category1: [], category2: [] }
      }));

      // Submit cleared score for the first judge
      await onSubmit(judgeToUse._id, participantId, clearedScore);
    } catch (error) {
      console.error('Error clearing score:', error);
    } finally {
      setSubmittingScores(false);
    }
  };

  const handleRemovePenalty = async (participantId, category, penaltyCode) => {
    // Use first judge if none selected
    const judgeToUse = selectedJudgeForScoring || availableJudges[0];
    if (submittingScores || !judgeToUse) return;

    setSubmittingScores(true);

    try {
      const participantIdStr = String(participantId);
      const currentScore = kumiteScores[participantIdStr] || {
        yuko: 0,
        waza_ari: 0,
        ippon: 0,
        chukoku: 0,
        keikoku: 0,
        hansoku_chui: 0,
        hansoku: 0,
        jogai: 0,
        comments: ''
      };

      const updatedScore = { ...currentScore };
      const currentPenalties = kumitePenalties[participantIdStr] || { category1: [], category2: [] };
      const updatedPenalties = { ...currentPenalties };

      // Remove penalty from the correct category list
      const categoryKey = category === 1 ? 'category1' : 'category2';
      const penaltyList = updatedPenalties[categoryKey] || [];
      const lastIndex = penaltyList.lastIndexOf(penaltyCode);
      if (lastIndex !== -1) {
        updatedPenalties[categoryKey] = penaltyList.filter((_, idx) => idx !== lastIndex);

        // Update score counts based on penalty type
        if (penaltyCode.startsWith('C')) {
          updatedScore.chukoku = Math.max(0, (updatedScore.chukoku || 0) - 1);
        } else if (penaltyCode.startsWith('K')) {
          updatedScore.keikoku = Math.max(0, (updatedScore.keikoku || 0) - 1);
        } else if (penaltyCode.startsWith('HC')) {
          updatedScore.hansoku_chui = Math.max(0, (updatedScore.hansoku_chui || 0) - 1);
        } else if (penaltyCode.startsWith('H') && !penaltyCode.startsWith('HC')) {
          updatedScore.hansoku = Math.max(0, (updatedScore.hansoku || 0) - 1);
        }
      }

      // Update states
      setKumiteScores(prev => ({
        ...prev,
        [participantIdStr]: updatedScore
      }));

      setKumitePenalties(prev => ({
        ...prev,
        [participantIdStr]: updatedPenalties
      }));

      // Submit updated score
      await onSubmit(judgeToUse._id, participantId, updatedScore);
    } catch (error) {
      console.error('Error removing penalty:', error);
    } finally {
      setSubmittingScores(false);
    }
  };

  // Handle bye match completion (single participant automatically wins)
  const handleCompleteByeMatch = async () => {
    if (submittingScores || !match?.participants || match.participants.length !== 1) {
      return;
    }

    setSubmittingScores(true);

    try {
      const singleParticipant = match.participants[0];
      const participantId = singleParticipant.player_id?._id || singleParticipant.team_id?._id;
      const participantRecordId = singleParticipant._id;

      if (!participantId) {
        toast.error('Cannot complete bye match: Invalid participant');
        return;
      }

      // Update match with winner and completed status
      const matchId = match._id?.toString() || match._id;
      await matchService.updateMatch(matchId, {
        winner_id: participantId,
        status: 'Completed',
        completed_at: new Date(),
        participant_result: {
          participant_id: participantRecordId,
          result: 'Win'
        }
      });

      toast.success('Bye match completed! Player advances to next round.');

      // Close modal
      onClose();

      // Refresh matches after a short delay if loadData is available
      if (loadData && typeof loadData === 'function') {
        setTimeout(() => {
          loadData(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error completing bye match:', error);
      toast.error(error.response?.data?.message || 'Failed to complete bye match');
    } finally {
      setSubmittingScores(false);
    }
  };

  // Save all scores and calculate winner
  const handleSaveScoresAndCalculateWinner = async () => {
    // Check if this is a bye match (only one participant)
    if (match?.participants && match.participants.length === 1) {
      await handleCompleteByeMatch();
      return;
    }

    const judgeToUse = selectedJudgeForScoring || availableJudges[0];
    if (submittingScores || !judgeToUse || !match?.participants || match.participants.length < 2) {
      toast.error('Cannot save scores: Missing judge or participants');
      return;
    }

    setSubmittingScores(true);

    try {
      // Save scores for all participants
      const savePromises = match.participants.map(async (participant) => {
        const participantId = participant._id?.toString() || participant._id;
        const participantIdStr = String(participantId);
        const currentScore = kumiteScores[participantIdStr] || {
          yuko: 0,
          waza_ari: 0,
          ippon: 0,
          chukoku: 0,
          keikoku: 0,
          hansoku_chui: 0,
          hansoku: 0,
          jogai: 0,
          comments: ''
        };

        // Submit score for this participant
        await onSubmit(judgeToUse._id, participantId, currentScore);
      });

      await Promise.all(savePromises);
      toast.success('All scores saved successfully');

      // Calculate winner
      const matchId = match._id?.toString() || match._id;
      const result = await matchService.calculateKumiteMatchWinner(matchId);

      if (result.success) {
        toast.success(`Match completed! Winner: ${result.data.reason}`);
        // Close modal
        onClose();
        // Refresh matches after a short delay if loadData is available
        if (loadData && typeof loadData === 'function') {
          setTimeout(() => {
            loadData(false);
          }, 500);
        }
      } else {
        toast.error(result.message || 'Failed to calculate winner');
      }
    } catch (error) {
      console.error('Error saving scores and calculating winner:', error);
      toast.error(error.response?.data?.message || 'Failed to save scores and calculate winner');
    } finally {
      setSubmittingScores(false);
    }
  };

  const handleIncrement = (field) => {
    setScoringData(prev => ({
      ...prev,
      [field]: (prev[field] || 0) + 1
    }));
  };

  const handleDecrement = (field) => {
    setScoringData(prev => ({
      ...prev,
      [field]: Math.max(0, (prev[field] || 0) - 1)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Score Match</h2>
            <p className="text-sm text-gray-600 mt-1">{match.match_name || 'Match'} • {match.match_type}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {isKumite ? (
          // Kumite: Show all judges with flags, then ONE unified scoring dashboard
          <div className="space-y-6">
            {availableJudges.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  No confirmed judges assigned to this event. Assign judges in Event Management.
                </p>
              </div>
            ) : (
              <>
                {/* Judges Display - Show all judges with flags */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Judges</h3>
                  <div className="grid grid-cols-5 gap-3">
                    {availableJudges.map((judge, judgeIndex) => {
                      const user = judge.user_id || {};
                      const judgeName = user.first_name && user.last_name
                        ? `${user.first_name} ${user.last_name}`
                        : user.username || 'Judge';
                      const judgeRole = assignedJudges.find(j => {
                        const jId = j.judge_id?._id || j.judge_id;
                        return String(jId) === String(judge._id);
                      })?.judge_role || 'Judge';

                      return (
                        <div key={judge._id} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="text-3xl mb-2">🏳️</div>
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 mx-auto mb-2">
                            {judgeIndex + 1}
                          </div>
                          <h4 className="font-semibold text-gray-800 text-sm">{judgeName}</h4>
                          <p className="text-xs text-gray-500">{judgeRole}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ONE Unified Scoring Dashboard */}
                {match.participants && match.participants.length > 0 && (
                  <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Scoring Dashboard</h3>

                    {/* Check if this is a bye match (only one participant) */}
                    {match.participants.length === 1 ? (
                      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                        <div className="text-center mb-4">
                          <div className="text-4xl mb-2">🏆</div>
                          <h4 className="text-xl font-bold text-yellow-800 mb-2">Bye Match</h4>
                          <p className="text-sm text-yellow-700">
                            This player automatically advances to the next round without competing.
                          </p>
                        </div>

                        {/* Show the single participant */}
                        <div className="grid grid-cols-2 gap-4">
                          {(() => {
                            const p = match.participants[0];
                            const participantName = p.player_id?.user_id
                              ? `${p.player_id.user_id.first_name || ''} ${p.player_id.user_id.last_name || ''}`.trim() || p.player_id.user_id.username
                              : p.team_id?.team_name || 'Participant';

                            return (
                              <>
                                <div className="p-4 rounded-lg border-2 bg-red-50 border-red-300">
                                  <div className="text-center">
                                    <div className="inline-block px-4 py-1 rounded font-bold text-sm mb-2 bg-red-600 text-white">
                                      AKA (Red)
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-lg">{participantName}</h4>
                                    {p.player_id?.belt_rank && (
                                      <p className="text-sm text-gray-600">Belt: {p.player_id.belt_rank}</p>
                                    )}
                                    <div className="mt-3 text-green-700 font-bold">
                                      ✓ Advances to Next Round
                                    </div>
                                  </div>
                                </div>

                                <div className="p-4 rounded-lg border-2 border-dashed border-gray-400 bg-gray-100">
                                  <div className="text-center">
                                    <div className="inline-block px-4 py-1 rounded font-bold text-sm mb-2 bg-gray-500 text-white">
                                      AO (Blue)
                                    </div>
                                    <div className="text-4xl text-gray-500 mb-2">BYE</div>
                                    <p className="text-sm text-gray-600 font-semibold">No Opponent</p>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      /* Normal match with 2 participants */
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {match.participants.map((p, idx) => {
                            const participantId = p._id;
                            const participantIdStr = String(participantId);
                            const participantName = p.player_id?.user_id
                              ? `${p.player_id.user_id.first_name || ''} ${p.player_id.user_id.last_name || ''}`.trim() || p.player_id.user_id.username
                              : p.team_id?.team_name || `Participant ${idx + 1}`;
                            const isAka = idx === 0;
                            const participantScore = kumiteScores[participantIdStr] || {
                              yuko: 0,
                              waza_ari: 0,
                              ippon: 0,
                              chukoku: 0,
                              keikoku: 0,
                              hansoku_chui: 0,
                              hansoku: 0,
                              jogai: 0
                            };
                            const totalScore = (participantScore.yuko || 0) * 1 +
                              (participantScore.waza_ari || 0) * 2 +
                              (participantScore.ippon || 0) * 3;
                            const participantPenalties = kumitePenalties[participantIdStr] || { category1: [], category2: [] };

                            return (
                              <div key={participantId} className={`p-4 rounded-lg border-2 ${isAka ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
                                <div className="text-center mb-3">
                                  <div className={`inline-block px-4 py-1 rounded font-bold text-sm mb-2 ${isAka ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                    {isAka ? 'AKA (Red)' : 'AO (Blue)'}
                                  </div>
                                  <h4 className="font-bold text-gray-800 text-lg">{participantName}</h4>
                                  {p.player_id?.belt_rank && (
                                    <p className="text-sm text-gray-600">Belt: {p.player_id.belt_rank}</p>
                                  )}
                                  <div className="text-2xl font-bold text-gray-800 mt-2">
                                    Score: {totalScore}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Y: {participantScore.yuko} W: {participantScore.waza_ari} I: {participantScore.ippon}
                                  </div>
                                </div>

                                {/* Scoring Buttons with Add/Remove */}
                                <div className="space-y-2 mb-3">
                                  {/* Yuko */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleKumiteScoreClick(participantId, 'yuko', -1)}
                                      disabled={submittingScores || (participantScore.yuko || 0) === 0}
                                      className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center min-w-[40px]"
                                      title="Remove Yuko"
                                    >
                                      <FiMinus className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleKumiteScoreClick(participantId, 'yuko', 1)}
                                      disabled={submittingScores}
                                      className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50 font-semibold"
                                    >
                                      Yuko (+1)
                                    </button>
                                    <span className="text-sm font-bold text-gray-700 min-w-[30px] text-center">
                                      {participantScore.yuko || 0}
                                    </span>
                                  </div>
                                  {/* Waza-ari */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleKumiteScoreClick(participantId, 'waza_ari', -1)}
                                      disabled={submittingScores || (participantScore.waza_ari || 0) === 0}
                                      className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center min-w-[40px]"
                                      title="Remove Waza-ari"
                                    >
                                      <FiMinus className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleKumiteScoreClick(participantId, 'waza_ari', 1)}
                                      disabled={submittingScores}
                                      className="flex-1 bg-yellow-500 text-white px-3 py-2 rounded text-sm hover:bg-yellow-600 disabled:opacity-50 font-semibold"
                                    >
                                      Waza-ari (+2)
                                    </button>
                                    <span className="text-sm font-bold text-gray-700 min-w-[30px] text-center">
                                      {participantScore.waza_ari || 0}
                                    </span>
                                  </div>
                                  {/* Ippon */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleKumiteScoreClick(participantId, 'ippon', -1)}
                                      disabled={submittingScores || (participantScore.ippon || 0) === 0}
                                      className="bg-gray-400 text-white px-3 py-2 rounded text-sm hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center min-w-[40px]"
                                      title="Remove Ippon"
                                    >
                                      <FiMinus className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleKumiteScoreClick(participantId, 'ippon', 1)}
                                      disabled={submittingScores}
                                      className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 disabled:opacity-50 font-semibold"
                                    >
                                      Ippon (+3)
                                    </button>
                                    <span className="text-sm font-bold text-gray-700 min-w-[30px] text-center">
                                      {participantScore.ippon || 0}
                                    </span>
                                  </div>
                                </div>

                                {/* Clear All Button */}
                                <div className="mb-3">
                                  <button
                                    type="button"
                                    onClick={() => handleClearScores(participantId)}
                                    disabled={submittingScores || totalScore === 0}
                                    className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
                                    title="Clear all scores for this participant"
                                  >
                                    <FiX className="w-4 h-4" />
                                    Clear All Scores
                                  </button>
                                </div>

                                {/* Penalties Section */}
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold text-gray-700 mb-2">Penalties:</p>

                                  {/* Category 1 Penalties */}
                                  <div className="border border-gray-200 rounded p-2 bg-white">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Category 1 (Excessive Contact):</p>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_1_chukoku', 1)}
                                        disabled={submittingScores}
                                        className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs hover:bg-orange-300 disabled:opacity-50"
                                      >
                                        C1
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_1_keikoku', 1)}
                                        disabled={submittingScores}
                                        className="bg-orange-300 text-orange-900 px-2 py-1 rounded text-xs hover:bg-orange-400 disabled:opacity-50"
                                      >
                                        K1
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_1_hansoku_chui', 1)}
                                        disabled={submittingScores}
                                        className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-300 disabled:opacity-50"
                                      >
                                        HC1
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_1_hansoku', 1)}
                                        disabled={submittingScores}
                                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                                      >
                                        H1
                                      </button>
                                    </div>
                                    {/* Display Category 1 Penalties List */}
                                    <div className="min-h-[40px] border-t border-gray-100 pt-2">
                                      {participantPenalties.category1 && participantPenalties.category1.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {participantPenalties.category1.map((penalty, index) => (
                                            <span
                                              key={index}
                                              className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold"
                                            >
                                              {penalty}
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePenalty(participantId, 1, penalty)}
                                                disabled={submittingScores}
                                                className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                                title="Remove penalty"
                                              >
                                                <FiX className="w-3 h-3" />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic">No penalties</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Category 2 Penalties */}
                                  <div className="border border-gray-200 rounded p-2 bg-white">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">Category 2 (Behavior):</p>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_2_chukoku', 1)}
                                        disabled={submittingScores}
                                        className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs hover:bg-orange-300 disabled:opacity-50"
                                      >
                                        C2
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_2_keikoku', 1)}
                                        disabled={submittingScores}
                                        className="bg-orange-300 text-orange-900 px-2 py-1 rounded text-xs hover:bg-orange-400 disabled:opacity-50"
                                      >
                                        K2
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_2_hansoku_chui', 1)}
                                        disabled={submittingScores}
                                        className="bg-red-200 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-300 disabled:opacity-50"
                                      >
                                        HC2
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleKumiteScoreClick(participantId, 'penalty_2_hansoku', 1)}
                                        disabled={submittingScores}
                                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 disabled:opacity-50"
                                      >
                                        H2
                                      </button>
                                    </div>
                                    {/* Display Category 2 Penalties List */}
                                    <div className="min-h-[40px] border-t border-gray-100 pt-2">
                                      {participantPenalties.category2 && participantPenalties.category2.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                          {participantPenalties.category2.map((penalty, index) => (
                                            <span
                                              key={index}
                                              className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-semibold"
                                            >
                                              {penalty}
                                              <button
                                                type="button"
                                                onClick={() => handleRemovePenalty(participantId, 2, penalty)}
                                                disabled={submittingScores}
                                                className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                                                title="Remove penalty"
                                              >
                                                <FiX className="w-3 h-3" />
                                              </button>
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic">No penalties</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Save Scores and Close Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {match.participants && match.participants.length === 1 ? (
                <button
                  type="button"
                  onClick={handleCompleteByeMatch}
                  disabled={submittingScores}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  {submittingScores ? 'Completing...' : 'Save & Complete Bye Match'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveScoresAndCalculateWinner}
                  disabled={submittingScores}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  {submittingScores ? 'Saving...' : 'Save Scores & Complete Match'}
                </button>
              )}
              <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        ) : (
          // Kata or other: Keep original form with judge selection
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!participant || !judge) {
              toast.error('Please select participant and judge');
              return;
            }
            onSubmit(judge._id, participant._id, scoringData);
          }} className="space-y-6">
            {/* Select Judge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Judge <span className="text-red-500">*</span>
              </label>
              <select
                value={judge?._id || ''}
                onChange={(e) => {
                  const selectedJudge = availableJudges.find(j => String(j._id) === e.target.value);
                  setJudge(selectedJudge || null);
                }}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a judge...</option>
                {availableJudges.map((j) => {
                  const user = j.user_id || {};
                  const name = user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username || 'Judge';
                  return (
                    <option key={j._id} value={j._id}>{name}</option>
                  );
                })}
              </select>
              {availableJudges.length === 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  No confirmed judges assigned to this event. Assign judges in Event Management.
                </p>
              )}
            </div>

            {/* Select Participant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Participant <span className="text-red-500">*</span>
              </label>
              {match.participants && match.participants.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {match.participants.map((p, idx) => {
                    const participantName = p.player_id?.user_id
                      ? `${p.player_id.user_id.first_name || ''} ${p.player_id.user_id.last_name || ''}`.trim() || p.player_id.user_id.username
                      : p.team_id?.team_name || `Participant ${idx + 1}`;
                    const existingScore = judge ? scores.find(s =>
                      (s.match_id?._id || s.match_id) === match._id &&
                      (s.participant_id?._id || s.participant_id) === p._id &&
                      (s.judge_id?._id || s.judge_id) === judge._id
                    ) : null;

                    return (
                      <button
                        key={p._id || idx}
                        type="button"
                        onClick={() => {
                          setParticipant(p);
                          if (existingScore) {
                            setScoringData({
                              technical_score: existingScore.technical_score?.toString() || '',
                              performance_score: existingScore.performance_score?.toString() || '',
                              yuko: existingScore.yuko || 0,
                              ippon: existingScore.ippon || 0,
                              waza_ari: existingScore.waza_ari || 0,
                              chukoku: existingScore.chukoku || 0,
                              keikoku: existingScore.keikoku || 0,
                              hansoku_chui: existingScore.hansoku_chui || 0,
                              hansoku: existingScore.hansoku || 0,
                              jogai: existingScore.jogai || 0,
                              comments: existingScore.comments || ''
                            });
                          } else {
                            setScoringData({
                              technical_score: '',
                              performance_score: '',
                              yuko: 0,
                              ippon: 0,
                              waza_ari: 0,
                              chukoku: 0,
                              keikoku: 0,
                              hansoku_chui: 0,
                              hansoku: 0,
                              jogai: 0,
                              comments: ''
                            });
                          }
                        }}
                        className={`p-4 border-2 rounded-lg transition text-left ${participant?._id === p._id
                            ? 'border-blue-500 bg-blue-50'
                            : existingScore
                              ? 'border-green-300 bg-green-50 hover:border-green-400'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{participantName}</p>
                            <p className="text-sm text-gray-600">{p.position || `Position ${idx + 1}`}</p>
                            {existingScore && (
                              <p className="text-xs text-green-600 mt-1">
                                Scored: {existingScore.final_score?.toFixed(2) || 'N/A'}
                              </p>
                            )}
                          </div>
                          {existingScore && (
                            <FiCheckCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No participants found for this match</p>
              )}
            </div>

            {/* Scoring Fields - Only show if participant and judge selected (for Kata) */}
            {participant && judge && (
              <>
                {isKata && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Kata Scoring</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Technical Score (0-10) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={scoringData.technical_score}
                          onChange={(e) => setScoringData({ ...scoringData, technical_score: e.target.value })}
                          required
                          min="0"
                          max="10"
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Performance Score (0-10) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={scoringData.performance_score}
                          onChange={(e) => setScoringData({ ...scoringData, performance_score: e.target.value })}
                          required
                          min="0"
                          max="10"
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    {scoringData.technical_score && scoringData.performance_score && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Calculated Final Score (Average):</p>
                        <p className="text-2xl font-bold text-blue-700">
                          {((parseFloat(scoringData.technical_score) + parseFloat(scoringData.performance_score)) / 2).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {isKumite && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Kumite Scoring</h3>

                    {/* Points */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Points</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Ippon (3 points)</label>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => handleDecrement('ippon')} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                                <FiMinus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-bold text-lg">{scoringData.ippon || 0}</span>
                              <button type="button" onClick={() => handleIncrement('ippon')} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                                <FiPlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Waza-ari (2 points)</label>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => handleDecrement('waza_ari')} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                                <FiMinus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-bold text-lg">{scoringData.waza_ari || 0}</span>
                              <button type="button" onClick={() => handleIncrement('waza_ari')} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                                <FiPlusIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Penalties */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Penalties</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { field: 'chukoku', label: 'Chukoku (-0.5)' },
                          { field: 'keikoku', label: 'Keikoku (-1)' },
                          { field: 'hansoku_chui', label: 'Hansoku-Chui (-1.5)' },
                          { field: 'hansoku', label: 'Hansoku (-2)' }
                        ].map(({ field, label }) => (
                          <div key={field} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700">{label}</label>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => handleDecrement(field)} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                                  <FiMinus className="w-4 h-4" />
                                </button>
                                <span className="w-12 text-center font-bold text-lg">{scoringData[field] || 0}</span>
                                <button type="button" onClick={() => handleIncrement(field)} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                                  <FiPlusIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Jogai */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-700 mb-3">Jogai (Out-of-bounds)</h4>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700">Jogai Warnings/Deductions (-0.25 each)</label>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleDecrement('jogai')} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-bold text-lg">{scoringData.jogai || 0}</span>
                            <button type="button" onClick={() => handleIncrement('jogai')} className="p-1 bg-gray-200 rounded hover:bg-gray-300">
                              <FiPlusIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Calculated Score */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Calculated Score:</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {(() => {
                          const points = (scoringData.ippon || 0) * 3 + (scoringData.waza_ari || 0) * 2;
                          const penaltyDeduction = (scoringData.chukoku || 0) * 0.5 +
                            (scoringData.keikoku || 0) * 1 +
                            (scoringData.hansoku_chui || 0) * 1.5 +
                            (scoringData.hansoku || 0) * 2 +
                            (scoringData.jogai || 0) * 0.25;
                          const final = Math.max(0, Math.min(10, points - penaltyDeduction));
                          return final.toFixed(2);
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comments (Optional)</label>
                  <textarea
                    value={scoringData.comments}
                    onChange={(e) => setScoringData({ ...scoringData, comments: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any comments or notes..."
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!participant || !judge}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Submit Score
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Kata Scoring Modal Component
const KataScoringModal = ({ performance, judges, tatamis, category, kataScoresByJudge, setKataScoresByJudge, onSubmit, onClose }) => {
  // Get assigned judges for this event
  const eventTatami = category ? tatamis.find(t => {
    const tatamiCategoryId = t.category_id?._id || t.category_id;
    return String(tatamiCategoryId) === String(category._id);
  }) : null;
  const assignedJudges = eventTatami?.assigned_judges?.filter(j => j.is_confirmed) || [];
  const availableJudges = assignedJudges.map(j => {
    const judgeObj = j.judge_id || {};
    return judges.find(judge => String(judge._id) === String(judgeObj._id || judgeObj));
  }).filter(Boolean);

  const playerName = performance.player_id?.user_id
    ? `${performance.player_id.user_id.first_name || ''} ${performance.player_id.user_id.last_name || ''}`.trim() || performance.player_id.user_id.username
    : 'Player';

  // Get existing scores for reference
  const existingScores = {};
  if (performance.scores && performance.scores.length > 0) {
    performance.scores.forEach(score => {
      const judgeId = score.judge_id?._id || score.judge_id;
      if (judgeId) {
        existingScores[String(judgeId)] = score;
      }
    });
  }

  // Calculate preview final score
  const calculatePreviewFinal = () => {
    const allScores = [];
    availableJudges.forEach(judge => {
      const judgeId = String(judge._id);
      const scoreValue = kataScoresByJudge[judgeId];
      if (scoreValue && scoreValue.trim() !== '') {
        const score = parseFloat(scoreValue);
        if (!isNaN(score) && score >= 5.0 && score <= 10.0) {
          allScores.push(score);
        }
      } else if (existingScores[judgeId]) {
        // Include existing scores if new score not entered
        const existingScore = existingScores[judgeId].kata_score;
        if (existingScore !== null && existingScore !== undefined) {
          allScores.push(existingScore);
        }
      }
    });

    if (allScores.length < 3) return null;

    const sortedScores = allScores.sort((a, b) => a - b);
    if (sortedScores.length >= 5) {
      // Remove highest and lowest, sum remaining 3
      const middleScores = sortedScores.slice(1, -1);
      const scoresToSum = middleScores.slice(-3); // Take last 3 if more than 5
      return scoresToSum.reduce((sum, s) => sum + s, 0);
    } else if (sortedScores.length === 3) {
      // If exactly 3, sum all
      return sortedScores.reduce((sum, s) => sum + s, 0);
    } else {
      // If 4 scores, remove highest and lowest, sum remaining 2
      const middleScores = sortedScores.slice(1, -1);
      return middleScores.reduce((sum, s) => sum + s, 0);
    }
  };

  const previewFinal = calculatePreviewFinal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Score Kata Performance</h2>
            <p className="text-sm text-gray-600 mt-1">
              {category?.category_name || 'Kata Event'} • {performance.round}
            </p>
            <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-800">
                Player: <span className="font-normal">{playerName}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Kata Scoring System:</strong> Each judge gives one score between 5.0-10.0.
              Final score is calculated by removing the highest and lowest scores, then summing the remaining 3 scores.
            </p>
          </div>

          {availableJudges.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                No confirmed judges assigned to this event. Assign judges in Event Management.
              </p>
            </div>
          ) : (
            <>
              {/* All Judges Score Inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter Scores for All Judges <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableJudges.map((judge) => {
                    const judgeId = String(judge._id);
                    const user = judge.user_id || {};
                    const judgeName = user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username || 'Judge';
                    const existingScore = existingScores[judgeId];
                    const currentScore = kataScoresByJudge[judgeId] || (existingScore?.kata_score?.toString() || '');

                    return (
                      <div key={judge._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {judgeName}
                          {existingScore && (
                            <span className="ml-2 text-xs text-green-600 font-normal">
                              (Current: {existingScore.kata_score?.toFixed(1)})
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          value={currentScore}
                          onChange={(e) => {
                            setKataScoresByJudge(prev => ({
                              ...prev,
                              [judgeId]: e.target.value
                            }));
                          }}
                          min="5.0"
                          max="10.0"
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                          placeholder="5.0 - 10.0"
                        />
                        {existingScore && !kataScoresByJudge[judgeId] && (
                          <p className="text-xs text-gray-500 mt-1">Existing score will be kept</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Enter scores for all judges. You can submit all at once or update individual scores.
                </p>
              </div>

              {/* Preview Final Score */}
              {previewFinal !== null && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Preview Final Score:</p>
                  <p className="text-3xl font-bold text-green-700">
                    {previewFinal.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    (Calculated from {availableJudges.length} judge score{availableJudges.length !== 1 ? 's' : ''})
                  </p>
                </div>
              )}

              {/* Show existing final score if available */}
              {performance.final_score !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Current Final Score:</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {performance.final_score.toFixed(1)}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={availableJudges.length === 0 || Object.values(kataScoresByJudge).every(v => !v || v.trim() === '')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Submit All Scores
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament, registrations, matches, onViewDetails, onGenerateDraws, onPublishBrackets, onCloseTournament, isOwner = false }) => {
  const navigate = useNavigate();
  const tournamentRegistrations = registrations.filter(r => {
    const regTournamentId = r.tournament_id?._id || r.tournament_id;
    return regTournamentId === tournament._id || regTournamentId?.toString() === tournament._id?.toString();
  });
  const tournamentMatches = matches.filter(m => {
    const matchTournamentId = m.tournament_id?._id || m.tournament_id;
    return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{tournament.tournament_name}</h3>
        <div className="flex items-center gap-2">
          {!isOwner && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
              View Only
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${tournament.status === 'Open' ? 'bg-green-100 text-green-700' :
              tournament.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' :
                tournament.status === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                  tournament.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-red-100 text-red-700'
            }`}>
            {tournament.status}
          </span>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <FiCalendar className="w-4 h-4 mr-2" />
          {format(new Date(tournament.start_date), 'MMM dd, yyyy')}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiMapPin className="w-4 h-4 mr-2" />
          {tournament.venue}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiUsers className="w-4 h-4 mr-2" />
          {tournamentRegistrations.length} Registrations
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <FiTarget className="w-4 h-4 mr-2" />
          {tournamentMatches.length} Matches
        </div>
      </div>
      <div className="space-y-2">
        {isOwner && (
          <button
            onClick={() => navigate(`/organizer/events?tournament=${tournament._id}`)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-semibold flex items-center justify-center gap-2"
          >
            <FiAward className="w-4 h-4" />
            Manage Events
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (onViewDetails && typeof onViewDetails === 'function') {
                try {
                  onViewDetails();
                } catch (error) {
                  console.error('❌ Error calling onViewDetails:', error);
                }
              } else {
                console.error('❌ TournamentCard: onViewDetails handler is not defined or not a function');
                alert('View Details handler is not working. Check console for details.');
              }
            }}
            type="button"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold cursor-pointer"
            style={{ pointerEvents: 'auto', zIndex: 10 }}
          >
            View Details
          </button>
          {isOwner && tournament.status === 'Draft' && (
            <button
              onClick={onPublishBrackets}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
            >
              Publish
            </button>
          )}
          {isOwner && (tournament.status === 'Open' || tournament.status === 'Ongoing') && (
            <button
              onClick={onGenerateDraws}
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-semibold"
            >
              Generate Draws
            </button>
          )}
          {isOwner && tournament.status === 'Ongoing' && (
            <button
              onClick={onCloseTournament}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm font-semibold"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Registration Approval Card Component
const RegistrationApprovalCard = ({ registration, tournaments, onApprove, onReject }) => {
  const tournament = tournaments.find(t => {
    const regTournamentId = registration.tournament_id?._id || registration.tournament_id;
    return t._id === regTournamentId || t._id?.toString() === regTournamentId?.toString();
  });

  // Get registrant name based on registration type
  let registrantName = 'Unknown';
  let registrantInfo = null;

  if (registration.registration_type === 'Coach' && registration.coach_id) {
    const coach = registration.coach_id;
    const user = coach.user_id || {};
    registrantName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || 'Coach';
    registrantInfo = 'Coach';
  } else if (registration.registration_type === 'Judge' && registration.judge_id) {
    const judge = registration.judge_id;
    const user = judge.user_id || {};
    registrantName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || 'Judge';
    registrantInfo = 'Judge';
  } else if (registration.registration_type === 'Individual' && registration.player_id) {
    const player = registration.player_id;
    const user = player.user_id || {};
    registrantName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || 'Player';
    registrantInfo = 'Player';
  } else if (registration.registration_type === 'Team' && registration.team_id) {
    const team = registration.team_id;
    registrantName = team.team_name || 'Team';
    registrantInfo = 'Team';
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-800">{tournament?.tournament_name || 'Tournament'}</p>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${registration.registration_type === 'Coach' ? 'bg-green-100 text-green-700' :
                registration.registration_type === 'Judge' ? 'bg-orange-100 text-orange-700' :
                  registration.registration_type === 'Team' ? 'bg-purple-100 text-purple-700' :
                    'bg-blue-100 text-blue-700'
              }`}>
              {registration.registration_type}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-medium">Registrant:</span> {registrantName}
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Registered on {format(new Date(registration.registration_date), 'MMM dd, yyyy HH:mm')}
          </p>
          <div className="flex items-center gap-4 mt-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${registration.approval_status === 'Approved' ? 'bg-green-100 text-green-700' :
                registration.approval_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
              }`}>
              Status: {registration.approval_status}
            </span>
            {(registration.registration_type === 'Coach' || registration.registration_type === 'Judge') ? (
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                FREE Registration
              </span>
            ) : (
              <span className={`px-2 py-1 rounded text-xs font-medium ${registration.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
                  registration.payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                }`}>
                Payment: {registration.payment_status}
              </span>
            )}
          </div>
        </div>
        {registration.approval_status === 'Pending' && registration.registration_type !== 'Coach' && registration.registration_type !== 'Judge' && (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-semibold"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold"
            >
              Reject
            </button>
          </div>
        )}
        {registration.approval_status === 'Approved' && (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            Approved
          </span>
        )}
        {(registration.registration_type === 'Coach' || registration.registration_type === 'Judge') && registration.approval_status === 'Approved' && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            Auto-Approved (FREE)
          </span>
        )}
      </div>
    </div>
  );
};

// Match Card Component
const MatchCard = ({ match, tournaments, onViewDetails }) => {
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
            {match.tatami_number && (
              <span className="flex items-center gap-1">
                <FiMapPin className="w-4 h-4" />
                Tatami {match.tatami_number}
              </span>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${match.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
            match.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
          }`}>
          {match.status}
        </span>
      </div>
    </div>
  );
};

// Match Schedule Card Component
const MatchScheduleCard = ({ match, tournaments, onEdit }) => {
  const tournament = tournaments.find(t => {
    const matchTournamentId = match.tournament_id?._id || match.tournament_id;
    return t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold text-gray-800">{match.match_name || 'Match'}</p>
          <p className="text-sm text-gray-600">{tournament?.tournament_name || 'Tournament'}</p>
          <div className="flex items-center gap-4 mt-2">
            <input
              type="datetime-local"
              defaultValue={format(new Date(match.scheduled_time), "yyyy-MM-dd'T'HH:mm")}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Tatami Number"
              defaultValue={match.tatami_number}
              className="px-3 py-1 border border-gray-300 rounded text-sm w-32"
            />
          </div>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
};

// Judge Assignment Card Component
const JudgeAssignmentCard = ({ match, tournaments }) => {
  const tournament = tournaments.find(t => {
    const matchTournamentId = match.tournament_id?._id || match.tournament_id;
    return t._id === matchTournamentId || t._id?.toString() === matchTournamentId?.toString();
  });

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-800">{match.match_name || 'Match'}</p>
          <p className="text-sm text-gray-600">{tournament?.tournament_name || 'Tournament'}</p>
        </div>
        <span className="text-sm text-gray-600">
          {format(new Date(match.scheduled_time), 'MMM dd, HH:mm')}
        </span>
      </div>
      <div className="space-y-2">
        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          <option>Select Head Judge</option>
        </select>
        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          <option>Select Judge 1</option>
        </select>
        <select className="w-full px-3 py-2 border border-gray-300 rounded text-sm">
          <option>Select Judge 2</option>
        </select>
      </div>
      <button className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
        Assign Judges
      </button>
    </div>
  );
};

// Tournament Results Card Component
const TournamentResultsCard = ({ tournament, matches, scores, onCloseTournament, isOwner = false }) => {
  const tournamentMatches = matches.filter(m => {
    const matchTournamentId = m.tournament_id?._id || m.tournament_id;
    return matchTournamentId === tournament._id || matchTournamentId?.toString() === tournament._id?.toString();
  });
  const completedTournamentMatches = tournamentMatches.filter(m => m.status === 'Completed');

  return (
    <div className="border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-xl text-gray-800">{tournament.tournament_name}</h3>
          <p className="text-sm text-gray-600">
            {completedTournamentMatches.length} of {tournamentMatches.length} matches completed
          </p>
        </div>
        {isOwner && tournament.status === 'Ongoing' && (
          <button
            onClick={onCloseTournament}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Close Tournament
          </button>
        )}
      </div>
      <div className="space-y-3">
        {completedTournamentMatches.slice(0, 5).map((match) => (
          <div key={match._id} className="bg-gray-50 rounded-lg p-3">
            <p className="font-semibold text-gray-800">{match.match_name}</p>
            <p className="text-sm text-gray-600">{match.match_type} • {match.match_level}</p>
          </div>
        ))}
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

// Kata Performance Management Modal Component
const KataPerformanceManagementModal = ({ category, tournament, registrations, kataPerformances, onCreatePerformances, onClose, onRefresh }) => {
  const [selectedRound, setSelectedRound] = useState('First Round');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingPerformanceId, setDeletingPerformanceId] = useState(null);
  const [deletingRound, setDeletingRound] = useState(false);

  // Refresh registrations when modal opens
  useEffect(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, []);


  const rounds = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)'];

  // Get approved and paid registrations for this category
  const categoryRegistrations = registrations.filter(r => {
    const regCategoryId = r.category_id?._id || r.category_id;
    const regTournamentId = r.tournament_id?._id || r.tournament_id;
    const catTournamentId = category.tournament_id?._id || category.tournament_id;
    return String(regCategoryId) === String(category._id) &&
      String(regTournamentId) === String(catTournamentId) &&
      r.approval_status === 'Approved' &&
      (r.payment_status === 'Paid' || r.registration_type === 'Coach' || r.registration_type === 'Judge') && // Coaches/Judges are free
      r.registration_type === 'Individual';
  });

  // Get existing performances for the selected round
  const existingPerformances = kataPerformances.filter(p => {
    const perfCategoryId = p.category_id?._id || p.category_id;
    return String(perfCategoryId) === String(category._id) && p.round === selectedRound;
  });

  const existingPlayerIds = existingPerformances.map(p => {
    const playerId = p.player_id?._id || p.player_id;
    return String(playerId);
  });

  // Available players (registered but not yet in this round)
  const availablePlayers = categoryRegistrations
    .filter(r => {
      const playerId = r.player_id?._id || r.player_id;
      return playerId && !existingPlayerIds.includes(String(playerId));
    })
    .map(r => ({
      _id: r.player_id?._id || r.player_id,
      registration: r,
      player: r.player_id
    }));

  const handleTogglePlayer = (playerId) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      } else {
        return [...prev, playerId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayerIds.length === availablePlayers.length) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(availablePlayers.map(p => String(p._id)));
    }
  };

  const handleCreate = async () => {
    if (selectedPlayerIds.length === 0) {
      toast.error('Please select at least one player');
      return;
    }

    setLoading(true);
    try {
      await onCreatePerformances(selectedRound, selectedPlayerIds);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePerformance = async (performanceId) => {
    if (!window.confirm('Are you sure you want to delete this performance? This will also delete all associated scores.')) {
      return;
    }

    setDeletingPerformanceId(performanceId);
    try {
      await kataPerformanceService.deletePerformance(performanceId);
      toast.success('Performance deleted successfully');
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting performance:', error);
      toast.error(error.response?.data?.message || 'Failed to delete performance');
    } finally {
      setDeletingPerformanceId(null);
    }
  };

  const handleDeleteAllRound = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${existingPerformances.length} performances for ${selectedRound}? This will also delete all associated scores.`)) {
      return;
    }

    setDeletingRound(true);
    try {
      await kataPerformanceService.deleteRoundPerformances(category._id, selectedRound);
      toast.success(`Deleted all performances for ${selectedRound}`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting round performances:', error);
      toast.error(error.response?.data?.message || 'Failed to delete performances');
    } finally {
      setDeletingRound(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Kata Performances</h2>
            <p className="text-sm text-gray-600 mt-1">
              {category.category_name} • {tournament?.tournament_name || 'Tournament'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Round Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Round <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedRound}
              onChange={(e) => {
                setSelectedRound(e.target.value);
                setSelectedPlayerIds([]); // Reset selection when round changes
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {rounds.map(round => (
                <option key={round} value={round}>{round}</option>
              ))}
            </select>
          </div>

          {/* Existing Performances */}
          {existingPerformances.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-blue-800">
                  Existing Performances for {selectedRound} ({existingPerformances.length}):
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAllRound}
                  disabled={deletingRound}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {deletingRound ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {existingPerformances.map((perf) => {
                  const playerName = perf.player_id?.user_id
                    ? `${perf.player_id.user_id.first_name || ''} ${perf.player_id.user_id.last_name || ''}`.trim() || perf.player_id.user_id.username
                    : 'Player';
                  const isDeleting = deletingPerformanceId === perf._id;
                  return (
                    <div key={perf._id} className="flex items-center gap-1">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {playerName} {perf.final_score !== null && `(${perf.final_score.toFixed(1)})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeletePerformance(perf._id)}
                        disabled={isDeleting || deletingRound}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete this performance"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-blue-600">
                Note: Delete existing performances to recreate them with all players. Click the X button to delete individual performances or "Delete All" to remove all at once.
              </p>
            </div>
          )}

          {/* Available Players */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Select Players for {selectedRound} <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {availablePlayers.length} player{availablePlayers.length !== 1 ? 's' : ''} available
                  {selectedPlayerIds.length > 0 && (
                    <span className="ml-2 text-blue-600 font-semibold">
                      ({selectedPlayerIds.length} selected)
                    </span>
                  )}
                </p>
              </div>
              {availablePlayers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                >
                  {selectedPlayerIds.length === availablePlayers.length ? 'Deselect All' : `Select All (${availablePlayers.length})`}
                </button>
              )}
            </div>

            {availablePlayers.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  {existingPerformances.length > 0
                    ? 'All registered players already have performances for this round.'
                    : 'No approved registrations found for this event.'}
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availablePlayers.map(({ _id, player, registration }) => {
                    const playerName = player?.user_id
                      ? `${player.user_id.first_name || ''} ${player.user_id.last_name || ''}`.trim() || player.user_id.username
                      : 'Player';
                    const isSelected = selectedPlayerIds.includes(String(_id));

                    return (
                      <button
                        key={_id}
                        type="button"
                        onClick={() => handleTogglePlayer(String(_id))}
                        className={`p-3 border-2 rounded-lg text-left transition ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-800">{playerName}</p>
                            {player?.belt_rank && (
                              <p className="text-xs text-gray-600">{player.belt_rank}</p>
                            )}
                          </div>
                          {isSelected && (
                            <FiCheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={selectedPlayerIds.length === 0 || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${selectedPlayerIds.length} Performance${selectedPlayerIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Kata Bulk Scoring Modal Component - Shows all players with all judges
const KataBulkScoringModal = ({ category, tournament, round, performances, judges, tatamis, kataBulkScores, setKataBulkScores, onSavePlayerScores, onFinalizeRound, onClose, onRefresh }) => {
  const [savingPlayerId, setSavingPlayerId] = useState(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [localPerformances, setLocalPerformances] = useState(performances); // Local state for performances

  // Get assigned judges for this event
  const eventTatami = category ? tatamis.find(t => {
    const tatamiCategoryId = t.category_id?._id || t.category_id;
    return String(tatamiCategoryId) === String(category._id);
  }) : null;
  const assignedJudges = eventTatami?.assigned_judges?.filter(j => j.is_confirmed) || [];
  const availableJudges = assignedJudges.map(j => {
    const judgeObj = j.judge_id || {};
    return judges.find(judge => String(judge._id) === String(judgeObj._id || judgeObj));
  }).filter(Boolean);

  // Update local performances when prop changes
  // Use a ref to track previous performances to detect actual changes
  const prevPerformancesForLocalRef = useRef(null);
  useEffect(() => {
    if (!performances || performances.length === 0) {
      if (localPerformances.length > 0) {
        setLocalPerformances([]);
      }
      prevPerformancesForLocalRef.current = performances;
      return;
    }

    // Check if performances actually changed by comparing IDs, score counts, and score values
    // This ensures we detect when individual scores are added/updated
    const createKey = (perfs) => {
      return perfs.map(p => {
        const scoreKey = p.scores && p.scores.length > 0
          ? p.scores.map(s => `${s.judge_id?._id || s.judge_id}:${s.kata_score || ''}`).sort().join(',')
          : 'no-scores';
        return `${p._id}-${p.scores?.length || 0}-${p.final_score || 'null'}-${scoreKey}`;
      }).join('|');
    };

    const currentKey = createKey(performances);
    const prevKey = prevPerformancesForLocalRef.current ? createKey(prevPerformancesForLocalRef.current) : null;

    // Only update if there are actual changes
    if (currentKey !== prevKey) {
      setLocalPerformances(performances);
      prevPerformancesForLocalRef.current = performances;
    }
  }, [performances]);

  // Separate useEffect to populate saved scores, using useRef to track previous state
  const prevPerformancesRef = useRef(null);

  useEffect(() => {
    if (!performances || performances.length === 0) {
      prevPerformancesRef.current = performances;
      return;
    }

    // Check if performances actually changed by comparing IDs and score counts
    const currentKey = performances.map(p => `${p._id}-${p.scores?.length || 0}-${p.final_score || 'null'}`).join('|');
    const prevKey = prevPerformancesRef.current
      ? prevPerformancesRef.current.map(p => `${p._id}-${p.scores?.length || 0}-${p.final_score || 'null'}`).join('|')
      : null;

    // Only update if performances actually changed
    if (currentKey === prevKey) {
      return;
    }

    prevPerformancesRef.current = performances;

    // IMPORTANT: We do NOT populate kataBulkScores with saved scores
    // Saved scores are displayed from performance.scores (existingScores) - that's the source of truth
    // kataBulkScores is ONLY for unsaved input
    // This ensures saved scores are always preserved and displayed correctly
    // We only need to ensure we don't have stale unsaved input that conflicts with saved scores
    setKataBulkScores(prev => {
      const cleaned = { ...prev };
      let hasChanges = false;

      // Clean up any unsaved input that matches saved scores (they're now saved, so remove from unsaved)
      performances.forEach(perf => {
        const perfId = String(perf._id);
        const unsavedInput = cleaned[perfId];

        if (unsavedInput && perf.scores && perf.scores.length > 0) {
          // Get saved scores for this performance
          const savedScores = {};
          perf.scores.forEach(score => {
            const judgeId = score.judge_id?._id || score.judge_id;
            if (judgeId && score.kata_score !== null && score.kata_score !== undefined) {
              savedScores[String(judgeId)] = score.kata_score.toString();
            }
          });

          // Remove any input that matches saved scores (it's no longer "unsaved")
          const cleanedInput = {};
          Object.keys(unsavedInput).forEach(judgeId => {
            const inputValue = unsavedInput[judgeId];
            const savedValue = savedScores[judgeId];

            // Only keep input if it's different from saved (truly unsaved)
            if (inputValue && inputValue.trim() !== '' && inputValue !== savedValue) {
              cleanedInput[judgeId] = inputValue;
            }
          });

          // If all input matches saved scores, clear it (empty object)
          if (Object.keys(cleanedInput).length === 0) {
            if (Object.keys(unsavedInput).length > 0) {
              cleaned[perfId] = {};
              hasChanges = true;
            }
          } else if (JSON.stringify(cleanedInput) !== JSON.stringify(unsavedInput)) {
            cleaned[perfId] = cleanedInput;
            hasChanges = true;
          }
        }
      });

      // Only return new object if there are actual changes to prevent infinite loops
      return hasChanges ? cleaned : prev;
    });
  }, [performances]);

  // Sort performances by performance_order or final_score
  // CRITICAL: Use performances prop directly (not localPerformances) to ensure all saved scores are always displayed
  // localPerformances is only for local state management, but for rendering we need the latest data from props
  const sortedPerformances = [...(performances || [])].sort((a, b) => {
    if (a.final_score === null && b.final_score !== null) return 1;
    if (a.final_score !== null && b.final_score === null) return -1;
    if (a.final_score === null && b.final_score === null) return a.performance_order - b.performance_order;
    return b.final_score - a.final_score; // Sort by final score descending
  });

  const handleScoreChange = (performanceId, judgeId, value) => {
    setKataBulkScores(prev => ({
      ...prev,
      [performanceId]: {
        ...(prev[performanceId] || {}),
        [judgeId]: value
      }
    }));
  };

  const handleSavePlayer = async (performance) => {
    const performanceId = String(performance._id);
    const scores = kataBulkScores[performanceId] || {};

    // Check if there are any scores to save
    const hasScoresToSave = Object.values(scores).some(score => score && score.trim() !== '');
    if (!hasScoresToSave) {
      toast.warning('Please enter at least one score before saving.');
      return;
    }

    setSavingPlayerId(performanceId);
    try {
      const success = await onSavePlayerScores(performanceId, scores);
      if (success) {
        toast.success(`Scores saved for ${performance.player_id?.user_id?.first_name || 'player'}!`);

        // Wait a bit for backend to process and calculate final scores
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh all performances to get updated scores for ALL players
        // This ensures all saved scores are displayed, not just the one we just saved
        if (onRefresh) {
          await onRefresh();
        }

        // Wait for data to refresh and backend to calculate final scores
        // Give enough time for the refresh to complete and state to update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Clear unsaved input for THIS player only
        // CRITICAL: Saved scores will be displayed from performance.scores (existingScores) - NOT from kataBulkScores
        // This ensures other players' saved scores remain untouched
        // The performances prop has been refreshed, so localPerformances will update via useEffect
        setKataBulkScores(prev => {
          const newScores = { ...prev };
          // Only clear unsaved input for the player we just saved
          // Keep all other players' data completely untouched
          newScores[performanceId] = {};
          return newScores;
        });

        // Force a small delay to ensure UI updates with saved scores
        // This ensures React has time to re-render with the updated performance data
        await new Promise(resolve => setTimeout(resolve, 300));
      } else {
        toast.error('Failed to save scores. Please try again.');
      }
    } catch (error) {
      console.error('Error saving player scores:', error);
      toast.error('Failed to save scores. Please try again.');
    } finally {
      setSavingPlayerId(null);
    }
  };

  const handleFinalize = async () => {
    // IMPORTANT: All saved scores must remain visible until this function is called
    // This function finalizes the round and advances to the next round
    // Until this point, all players' individual judge scores should be displayed

    // First, refresh data to ensure we have the latest scores before checking
    if (onRefresh) {
      await onRefresh();
      // Wait a bit for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Use performances prop directly (not sortedPerformances) to ensure we have the latest data
    // Sort performances for checking (same logic as sortedPerformances)
    const performancesToCheck = [...(performances || [])].sort((a, b) => {
      if (a.final_score === null && b.final_score !== null) return 1;
      if (a.final_score !== null && b.final_score === null) return -1;
      if (a.final_score === null && b.final_score === null) return a.performance_order - b.performance_order;
      return b.final_score - a.final_score;
    });

    // Check if all players have scores (either saved or unsaved)
    // CRITICAL: Check saved scores from performance.scores (database) AND unsaved input from kataBulkScores
    // Also check final_score as an indicator that scores have been calculated
    const playersWithoutScores = performancesToCheck.filter(perf => {
      const performanceId = String(perf._id);

      // Check for unsaved scores in kataBulkScores
      const unsavedScores = kataBulkScores[performanceId] || {};
      const hasUnsavedScores = Object.values(unsavedScores).some(score => score && score.trim() !== '');

      // Check for saved scores in performance.scores (from database)
      // This is the PRIMARY check - saved scores are the source of truth
      const savedScores = perf.scores || [];
      const validSavedScores = savedScores.filter(score => {
        const judgeId = score.judge_id?._id || score.judge_id;
        return judgeId && score.kata_score !== null && score.kata_score !== undefined;
      });
      const hasSavedScores = validSavedScores.length >= 3; // Need at least 3 judge scores

      // Check if final_score exists - this is a strong indicator that scores are saved and calculated
      const hasFinalScore = perf.final_score !== null && perf.final_score !== undefined;

      // Player has scores if:
      // 1. Has at least 3 saved scores (from database), OR
      // 2. Has a final_score (indicates scores were saved and calculated), OR
      // 3. Has unsaved scores that need to be saved (but this should be saved first)
      const hasScores = hasSavedScores || hasFinalScore || hasUnsavedScores;

      return !hasScores;
    });

    if (playersWithoutScores.length > 0) {
      // Provide more detailed error message with debugging info
      const playerDetails = playersWithoutScores.map(p => {
        const playerName = p.player_id?.user_id
          ? `${p.player_id.user_id.first_name || ''} ${p.player_id.user_id.last_name || ''}`.trim() || p.player_id.user_id.username
          : 'Player';
        const scoreCount = p.scores?.length || 0;
        const hasFinal = p.final_score !== null && p.final_score !== undefined;
        return `${playerName} (${scoreCount} scores, final: ${hasFinal ? p.final_score : 'none'})`;
      }).join(', ');

      console.warn('Players without sufficient scores:', {
        count: playersWithoutScores.length,
        players: playersWithoutScores.map(p => ({
          id: p._id,
          name: p.player_id?.user_id?.first_name || 'Unknown',
          scoreCount: p.scores?.length || 0,
          finalScore: p.final_score,
          scores: p.scores
        }))
      });

      toast.warning(`Please save scores for all ${playersWithoutScores.length} player(s) before finalizing the round. Each player needs scores from at least 3 judges. Missing: ${playerDetails}`);
      return;
    }

    setIsFinalizing(true);
    try {
      await onFinalizeRound();
      // After finalization, the modal will close and scores will be saved permanently
    } finally {
      setIsFinalizing(false);
    }
  };

  // Calculate preview final score for a performance
  const calculatePreviewFinal = (performance) => {
    const performanceId = String(performance._id);
    const scores = kataBulkScores[performanceId] || {};

    const allScores = [];
    availableJudges.forEach(judge => {
      const judgeId = String(judge._id);
      const scoreValue = scores[judgeId];
      if (scoreValue && scoreValue.trim() !== '') {
        const score = parseFloat(scoreValue);
        if (!isNaN(score) && score >= 5.0 && score <= 10.0) {
          allScores.push(score);
        }
      } else if (performance.scores && performance.scores.length > 0) {
        // Include existing scores if new score not entered
        const existingScore = performance.scores.find(s => {
          const sJudgeId = s.judge_id?._id || s.judge_id;
          return String(sJudgeId) === judgeId;
        });
        if (existingScore && existingScore.kata_score !== null && existingScore.kata_score !== undefined) {
          allScores.push(existingScore.kata_score);
        }
      }
    });

    if (allScores.length < 3) return null;

    const sortedScores = allScores.sort((a, b) => a - b);
    if (sortedScores.length >= 5) {
      // Remove highest and lowest, sum remaining 3
      const middleScores = sortedScores.slice(1, -1);
      const scoresToSum = middleScores.slice(-3); // Take last 3 if more than 5
      return scoresToSum.reduce((sum, s) => sum + s, 0);
    } else if (sortedScores.length === 3) {
      // If exactly 3, sum all
      return sortedScores.reduce((sum, s) => sum + s, 0);
    } else {
      // If 4 scores, remove highest and lowest, sum remaining 2
      const middleScores = sortedScores.slice(1, -1);
      return middleScores.reduce((sum, s) => sum + s, 0);
    }
  };

  // Determine next round info
  const getNextRoundInfo = () => {
    if (round === 'First Round') {
      return { nextRound: 'Second Round (Final 8)', topCount: 8 };
    } else if (round === 'Second Round (Final 8)') {
      return { nextRound: 'Third Round (Final 4)', topCount: 4 };
    }
    return { nextRound: null, topCount: 0 };
  };

  const { nextRound, topCount } = getNextRoundInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Kata Scoring - All Players</h2>
            <p className="text-sm text-gray-600 mt-1">
              {category?.category_name || 'Kata Event'} • {round}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {tournament?.tournament_name || 'Tournament'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>Instructions:</strong> Enter scores for all 5 judges for each player. Click "Save" for each player to save their scores.
            When all players are scored, click "Finalize Round" to advance top {topCount || 'players'} to {nextRound || 'the next round'}.
          </p>
        </div>

        {availableJudges.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              No confirmed judges assigned to this event. Assign judges in Event Management.
            </p>
          </div>
        ) : (
          <>
            {/* Judges Header */}
            <div className="mb-4">
              <div className="grid grid-cols-6 gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 rounded-lg shadow-sm">
                <div className="font-bold text-gray-800 text-sm">Player</div>
                {availableJudges.map(judge => {
                  const user = judge.user_id || {};
                  const judgeName = user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username || 'Judge';
                  return (
                    <div key={judge._id} className="text-center font-bold text-blue-800 text-sm">
                      {judgeName}
                      <div className="text-xs text-blue-600 font-normal mt-1">Judge</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Players and Scores */}
            <div className="space-y-3 mb-6">
              {sortedPerformances.map((performance) => {
                const performanceId = String(performance._id);
                const playerName = performance.player_id?.user_id
                  ? `${performance.player_id.user_id.first_name || ''} ${performance.player_id.user_id.last_name || ''}`.trim() || performance.player_id.user_id.username
                  : 'Player';
                const scores = kataBulkScores[performanceId] || {};
                const previewFinal = calculatePreviewFinal(performance);
                const isSaving = savingPlayerId === performanceId;

                // Get existing saved scores for reference - CRITICAL: This is the source of truth
                // IMPORTANT: These scores come from the database and MUST ALWAYS be displayed after saving
                // This MUST work for ALL players simultaneously, not just the one being saved
                // Scores must persist and remain visible until "Finalize & Advance" is clicked
                const existingScores = {};
                if (performance.scores && Array.isArray(performance.scores) && performance.scores.length > 0) {
                  performance.scores.forEach(score => {
                    // Handle both populated and unpopulated judge_id
                    const judgeId = score.judge_id?._id || score.judge_id;
                    if (judgeId && score.kata_score !== null && score.kata_score !== undefined) {
                      // Convert to string and ensure it's properly formatted
                      const scoreValue = parseFloat(score.kata_score);
                      if (!isNaN(scoreValue) && scoreValue >= 5.0 && scoreValue <= 10.0) {
                        // Store as string for display, but keep the numeric value for calculations
                        // Use String() to ensure consistent key format
                        // CRITICAL: This score MUST be displayed - it's from the database
                        existingScores[String(judgeId)] = scoreValue.toString();
                      }
                    }
                  });
                }


                // Check if player has saved scores
                const hasSavedScores = performance.scores && performance.scores.length > 0;
                const hasEnoughScores = performance.scores && performance.scores.length >= 3;
                const isSaved = hasSavedScores;

                // Check if there are any unsaved changes (scores in kataBulkScores that differ from saved scores)
                const hasUnsavedChanges = Object.keys(scores).some(judgeId => {
                  const inputScore = scores[judgeId]?.trim();
                  const savedScore = existingScores[judgeId];
                  // If there's an input score and it's different from saved, or there's no saved score
                  return inputScore && inputScore !== '' && inputScore !== savedScore;
                });

                return (
                  <div key={performance._id} className={`border rounded-lg p-4 transition ${isSaved ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:shadow-md'}`}>
                    <div className="grid grid-cols-6 gap-2 items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-800">{playerName}</p>
                          {/* Display ranking for Final 4 round */}
                          {round === 'Third Round (Final 4)' && performance.place !== null && performance.place !== undefined && (
                            <span className={`px-3 py-1 text-white text-xs rounded-full font-bold shadow-sm ${performance.place === 1 ? 'bg-yellow-500' :
                                performance.place === 2 ? 'bg-gray-400' :
                                  'bg-orange-500'
                              }`}>
                              {performance.place === 1 ? '🥇 1st Place' :
                                performance.place === 2 ? '🥈 2nd Place' :
                                  '🥉 3rd Place'}
                            </span>
                          )}
                          {isSaved && (
                            <span className={`px-3 py-1 text-white text-xs rounded-full font-bold shadow-sm ${hasEnoughScores ? 'bg-green-600' : 'bg-yellow-500'
                              }`}>
                              {hasEnoughScores ? '✓ Saved' : `${performance.scores.length}/5 Saved`}
                            </span>
                          )}
                          {isSaving && (
                            <span className="px-3 py-1 bg-blue-500 text-white text-xs rounded-full font-bold animate-pulse shadow-sm">
                              Saving...
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-1">Order: {performance.performance_order}</p>
                        {performance.final_score !== null && (
                          <p className="text-sm text-green-700 font-bold mt-1 bg-green-50 px-2 py-1 rounded inline-block">
                            Final Score: {performance.final_score.toFixed(1)}
                          </p>
                        )}
                        {previewFinal !== null && previewFinal !== performance.final_score && !isSaved && (
                          <p className="text-xs text-blue-600 font-semibold mt-1">
                            Preview: {previewFinal.toFixed(1)}
                          </p>
                        )}
                      </div>
                      {availableJudges.map(judge => {
                        const judgeId = String(judge._id);
                        // Get saved score from performance.scores - this is the source of truth
                        const savedScore = existingScores[judgeId];
                        const inputScore = scores[judgeId];

                        // CRITICAL: Display logic - saved scores come from performance.scores, NOT kataBulkScores
                        // IMPORTANT: Saved scores MUST persist and remain visible for ALL players until "Finalize & Advance" is clicked
                        // PRIORITY ORDER:
                        // 1. If there's unsaved input that's DIFFERENT from saved, show input (unsaved) - user is editing
                        // 2. ALWAYS show saved score from performance.scores if available - this is the source of truth
                        // 3. Otherwise, show empty (no score entered yet)

                        // Check if there's unsaved input that differs from saved
                        const hasUnsavedInput = inputScore && inputScore.trim() !== '' && inputScore !== savedScore;

                        // Determine what to display in the input field
                        // CRITICAL: Always show saved score if available - this is the PRIMARY source
                        // Saved scores MUST be displayed for ALL players until finalization
                        // Only show unsaved input if it's DIFFERENT from the saved score
                        let currentScore = '';

                        // Priority 1: If there's a saved score, ALWAYS show it (unless user is editing with different value)
                        // This ensures saved scores persist for all players until finalization
                        if (savedScore && savedScore !== '') {
                          // Check if user has unsaved input that's different
                          if (hasUnsavedInput) {
                            // User is actively editing - show their new input
                            currentScore = inputScore;
                          } else {
                            // No unsaved input OR input matches saved - ALWAYS show saved score
                            // This is critical: saved scores must always be visible
                            currentScore = savedScore;
                          }
                        } else if (inputScore && inputScore.trim() !== '') {
                          // No saved score but user has entered something - show their input
                          currentScore = inputScore;
                        } else {
                          // No saved score and no input - show empty
                          currentScore = '';
                        }

                        // Determine if this field has a saved score
                        const hasExistingScore = savedScore !== undefined && savedScore !== null && savedScore !== '';
                        // Field is saved if it has a saved score AND there's no unsaved input that differs
                        const isFieldSaved = hasExistingScore && !hasUnsavedInput;

                        return (
                          <div key={judge._id} className="flex flex-col items-center gap-1">
                            <input
                              key={`${performanceId}-${judgeId}-${savedScore || 'empty'}`}
                              type="number"
                              value={currentScore || ''}
                              onChange={(e) => handleScoreChange(performanceId, judgeId, e.target.value)}
                              min="5.0"
                              max="10.0"
                              step="0.1"
                              className={`w-full px-2 py-2 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-sm font-semibold ${isFieldSaved
                                  ? 'border-green-500 bg-green-100 text-green-800'
                                  : hasUnsavedInput
                                    ? 'border-blue-400 bg-blue-100 text-blue-800'
                                    : 'border-gray-300 bg-white'
                                }`}
                              placeholder={isFieldSaved ? '' : '5.0-10.0'}
                              readOnly={isFieldSaved}
                              disabled={isFieldSaved}
                            />
                            {isFieldSaved && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-green-700 font-bold">✓ Saved</span>
                              </div>
                            )}
                            {hasUnsavedInput && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-blue-700 font-bold">⚠ Unsaved</span>
                              </div>
                            )}
                            {!isFieldSaved && !hasUnsavedInput && !savedScore && (
                              <span className="text-xs text-gray-400">Enter score</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSavePlayer(performance)}
                        disabled={isSaving || (!hasUnsavedChanges && hasSavedScores)}
                        className={`px-4 py-2 rounded-lg transition text-sm font-semibold ${!hasUnsavedChanges && hasSavedScores
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                          }`}
                      >
                        {isSaving
                          ? 'Saving...'
                          : (!hasUnsavedChanges && hasSavedScores)
                            ? 'All Scores Saved ✓'
                            : hasUnsavedChanges
                              ? 'Save Scores'
                              : 'Save Scores'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Finalize Round Button */}
            <div className="border-t pt-4 mt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Finalize Round</p>
                <p className="text-xs text-blue-700">
                  {nextRound ? (
                    <>After saving all scores, click below to calculate final scores and automatically advance the top {topCount} players to <strong>{nextRound}</strong>.</>
                  ) : (
                    <>This is the final round. Finalize to complete the event.</>
                  )}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={isFinalizing || sortedPerformances.length === 0}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  {isFinalizing ? 'Finalizing...' : nextRound ? `Finalize & Advance to ${nextRound}` : 'Finalize Round'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OrganizerDashboard;
