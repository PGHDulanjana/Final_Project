import React, { useState, useEffect, useCallback, useRef } from 'react';
import { matchService } from '../../services/matchService';
import { categoryService } from '../../services/categoryService';
import { tournamentService } from '../../services/tournamentService';
import { registrationService } from '../../services/registrationService';
import kataPerformanceService from '../../services/kataPerformanceService';
import kataReportService from '../../services/kataReportService';
import kumiteReportService from '../../services/kumiteReportService';
import { toast } from 'react-toastify';
import Layout from '../../components/Layout';
import MatchDrawsBracket from '../../components/MatchDrawsBracket';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FiFilter, FiRefreshCw, FiDownload, FiUsers, FiUser, FiAward, FiTrendingUp, FiFileText } from 'react-icons/fi';

const MatchDraws = () => {
  const [tournaments, setTournaments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [matches, setMatches] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [kataPerformances, setKataPerformances] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [loadingKataPerformances, setLoadingKataPerformances] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [kataReport, setKataReport] = useState(null);
  const [generatingKumiteReport, setGeneratingKumiteReport] = useState(false);
  const [kumiteReport, setKumiteReport] = useState(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadCategoriesForTournament();
    } else {
      setCategories([]);
      setSelectedCategory(null);
    }
  }, [selectedTournament]);

  useEffect(() => {
    if (selectedTournament && selectedCategory) {
      loadMatches();
      loadRegistrations();

      // Load Kata performances if it's a Kata event
      // Use current categories state but don't include it in dependencies to prevent infinite loop
      const categoryData = categories.find(cat => cat._id === selectedCategory);
      if (categoryData && (categoryData.category_type === 'Kata' || categoryData.category_type === 'Team Kata')) {
        loadKataPerformances();
        loadKataReport();
        setKumiteReport(null);
      } else if (categoryData && (categoryData.category_type === 'Kumite' || categoryData.category_type === 'Team Kumite')) {
        loadKumiteReport();
        setKataPerformances([]);
        setKataReport(null);
      } else {
        setKataPerformances([]);
        setKataReport(null);
        setKumiteReport(null);
      }
    } else {
      setMatches([]);
      setRegistrations([]);
      setKataPerformances([]);
      setKataReport(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournament, selectedCategory]); // Removed categories from dependencies to prevent infinite loop

  // Auto-refresh matches when they are updated (e.g., when scores are saved in Event Scoring)
  useEffect(() => {
    if (selectedTournament && selectedCategory) {
      const interval = setInterval(() => {
        loadMatches();
        // Also refresh Kata performances if it's a Kata event
        const categoryData = categories.find(cat => cat._id === selectedCategory);
        if (categoryData && (categoryData.category_type === 'Kata' || categoryData.category_type === 'Team Kata')) {
          loadKataPerformances();
        }
      }, 30000); // Refresh every 30 seconds (increased to reduce load and prevent loops)

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTournament, selectedCategory]); // Removed categories to prevent interval recreation

  const loadTournaments = async () => {
    setLoading(true);
    try {
      // Load all tournaments (not just Open ones) so organizer can generate draws for any tournament
      const tournamentsRes = await tournamentService.getTournaments();
      const allTournaments = tournamentsRes.data || [];
      // Filter out cancelled tournaments as they shouldn't have draws generated
      const activeTournaments = allTournaments.filter(
        t => t.status !== 'Cancelled'
      );
      setTournaments(activeTournaments);
      console.log('✅ Loaded tournaments:', activeTournaments.length);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      toast.error('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesForTournament = async () => {
    if (!selectedTournament) return;

    setLoadingCategories(true);
    try {
      const categoriesRes = await categoryService.getCategories({
        tournament_id: selectedTournament
      });
      const newCategories = categoriesRes.data || [];

      // Check if categories actually changed before updating
      const categoriesChanged = JSON.stringify(newCategories.map(c => c._id)) !==
        JSON.stringify(categories.map(c => c._id));

      if (categoriesChanged) {
        setCategories(newCategories);

        // Reset selected category if it's not in the new list
        if (selectedCategory) {
          const categoryExists = newCategories.some(
            cat => cat._id === selectedCategory
          );
          if (!categoryExists) {
            setSelectedCategory(null);
          }
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories for this tournament');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadMatches = async () => {
    if (!selectedTournament || !selectedCategory) {
      setMatches([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔵 Loading matches for:', {
        tournament: selectedTournament,
        category: selectedCategory
      });

      const matchesRes = await matchService.getMatches({
        tournament_id: selectedTournament,
        category_id: selectedCategory,
      });

      const matchesData = matchesRes.data || [];
      console.log('✅ Loaded matches:', matchesData.length);
      setMatches(matchesData);

      if (matchesData.length === 0) {
        console.log('ℹ️ No matches found. Generate draws to create matches.');
      }
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      toast.error('Failed to load matches');
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    if (!selectedTournament || !selectedCategory) {
      setRegistrations([]);
      return;
    }

    setLoadingRegistrations(true);
    try {
      console.log('🔵 Loading registrations for:', {
        tournament: selectedTournament,
        category: selectedCategory
      });

      const registrationsRes = await registrationService.getRegistrations({
        tournament_id: selectedTournament,
        category_id: selectedCategory,
        approval_status: 'Approved'
      });

      const registrationsData = registrationsRes.data || [];
      console.log('✅ Loaded registrations:', registrationsData.length);
      setRegistrations(registrationsData);
    } catch (error) {
      console.error('❌ Error loading registrations:', error);
      toast.error('Failed to load registered players');
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // Comprehensive refresh function that reloads all data
  const handleRefreshAll = async () => {
    if (!selectedTournament || !selectedCategory) {
      toast.error('Please select a tournament and category');
      return;
    }

    try {
      // Reload registrations first (to get newly approved players)
      await loadRegistrations();

      // Reload matches
      await loadMatches();

      // Reload category-specific data
      const categoryData = categories.find(cat => cat._id === selectedCategory);
      if (categoryData && (categoryData.category_type === 'Kata' || categoryData.category_type === 'Team Kata')) {
        await loadKataPerformances();
        await loadKataReport();
      } else if (categoryData && (categoryData.category_type === 'Kumite' || categoryData.category_type === 'Team Kumite')) {
        await loadKumiteReport();
      }

      toast.success('Data refreshed successfully! Newly approved players are now visible.');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    }
  };

  const loadKataPerformances = async () => {
    if (!selectedCategory) {
      setKataPerformances([]);
      return;
    }

    setLoadingKataPerformances(true);
    try {
      console.log('🔵 Loading Kata performances for category:', selectedCategory);

      const response = await kataPerformanceService.getPerformances({
        category_id: selectedCategory
      });

      const performancesData = response.data || [];
      console.log('✅ Loaded Kata performances:', performancesData.length);
      setKataPerformances(performancesData);
    } catch (error) {
      console.error('❌ Error loading Kata performances:', error);
      toast.error('Failed to load Kata performances');
      setKataPerformances([]);
    } finally {
      setLoadingKataPerformances(false);
    }
  };

  const loadKataReport = async () => {
    if (!selectedCategory) {
      setKataReport(null);
      return;
    }

    try {
      const response = await kataReportService.getReport(selectedCategory);
      if (response.success) {
        setKataReport(response.data);
      } else {
        setKataReport(null);
      }
    } catch (error) {
      // Report doesn't exist yet - that's okay
      setKataReport(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    setGeneratingReport(true);
    try {
      // First, refresh registrations and performances to ensure we have the latest data
      console.log('🔄 Refreshing data before generating report...');
      await loadRegistrations();
      await loadKataPerformances();

      // Small delay to ensure backend has latest data
      await new Promise(resolve => setTimeout(resolve, 300));

      // Now generate the report with latest data
      const response = await kataReportService.generateReport(selectedCategory);

      if (response.success) {
        toast.success('Kata report generated and published successfully! Players and coaches can now view the results.');
        setKataReport(response.data);
        // Reload performances to get latest data
        await loadKataPerformances();
        // Reload report to ensure it's fully up to date
        await loadKataReport();
      } else {
        toast.error(response.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const loadKumiteReport = async () => {
    if (!selectedCategory) {
      setKumiteReport(null);
      return;
    }

    try {
      const response = await kumiteReportService.getReport(selectedCategory);
      if (response.success) {
        setKumiteReport(response.data);
      } else {
        setKumiteReport(null);
      }
    } catch (error) {
      // Report doesn't exist yet - that's okay
      setKumiteReport(null);
    }
  };

  const handleGenerateKumiteReport = async () => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    setGeneratingKumiteReport(true);
    try {
      // First, refresh registrations and matches to ensure we have the latest data
      console.log('🔄 Refreshing data before generating report...');
      await loadRegistrations();
      await loadMatches();

      // Small delay to ensure backend has latest data
      await new Promise(resolve => setTimeout(resolve, 300));

      // Now generate the report with latest data
      const response = await kumiteReportService.generateReport(selectedCategory);

      if (response.success) {
        toast.success('Kumite report generated and published successfully! The report is now visible to organizers, coaches, players, and judges in their dashboards.');
        setKumiteReport(response.data);
        // Reload matches to get latest data
        await loadMatches();
        // Reload report to ensure it's up to date
        await loadKumiteReport();
      } else {
        toast.error(response.message || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating Kumite report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setGeneratingKumiteReport(false);
    }
  };

  const handleGenerateNextRound = async (currentRoundLevel) => {
    if (!selectedCategory) {
      toast.error('Please select a category');
      return;
    }

    try {
      setLoading(true);
      const result = await matchService.generateNextRound(selectedCategory, currentRoundLevel);

      if (result.success) {
        toast.success(result.message || 'Next round generation triggered');
        // Reload matches to show the newly generated ones
        await loadMatches();
      } else {
        toast.error(result.message || 'Failed to generate next round');
      }
    } catch (error) {
      console.error('Error generating next round:', error);
      toast.error(error.response?.data?.message || 'Failed to generate next round');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraws = async () => {
    if (!selectedTournament || !selectedCategory) {
      toast.error('Please select a tournament and category');
      return;
    }

    setLoading(true);
    try {
      console.log('🔵 Frontend: Refreshing registrations before generating draws...', {
        tournament: selectedTournament,
        category: selectedCategory
      });

      // Force reload registrations first to ensure we have the absolute latest registered players
      setLoadingRegistrations(true);
      try {
        const registrationsRes = await registrationService.getRegistrations({
          tournament_id: selectedTournament,
          category_id: selectedCategory,
          approval_status: 'Approved'
        });

        const registrationsData = registrationsRes.data || [];
        console.log('✅ Loaded latest registrations:', registrationsData.length);
        setRegistrations(registrationsData);

        // Count approved and paid players
        const paidPlayers = registrationsData.filter(r =>
          (r.registration_type === 'Individual' || r.registration_type === 'Team') &&
          r.payment_status === 'Paid'
        ).length;

        const totalPlayers = registrationsData.filter(r =>
          r.registration_type === 'Individual' || r.registration_type === 'Team'
        ).length;

        if (paidPlayers === 0) {
          toast.warning(`No paid players found. ${totalPlayers} player(s) registered but payment is pending. Only paid players will be included in draws.`);
        } else {
          toast.info(`Found ${paidPlayers} paid player(s) out of ${totalPlayers} registered. Generating draws with latest data...`, { autoClose: 3000 });
        }
      } catch (regError) {
        console.error('Error loading registrations:', regError);
        toast.warning('Could not refresh registrations, but proceeding with draw generation...');
      } finally {
        setLoadingRegistrations(false);
      }

      // Small delay to ensure backend gets fresh data
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🔵 Frontend: Calling generateDraws API...', {
        tournament: selectedTournament,
        category: selectedCategory
      });

      const result = await matchService.generateDraws(selectedTournament, selectedCategory, true);

      console.log('✅ Frontend: Received response:', result);

      if (result.success) {
        let message = result.data.warning
          ? `Match draws generated! ${result.data.warning}`
          : `Match draws generated successfully using AI! Created ${result.data.matchesCreated || 0} matches.`;

        // Add judge assignment information
        if (result.data.judgesAssigned) {
          const { totalJudges, judgesPerMatch, totalAssignments, unconfirmedJudges } = result.data.judgesAssigned;
          if (totalJudges > 0) {
            message += ` ${totalJudges} confirmed judge(s) assigned to all matches (${totalAssignments} total assignments).`;
          } else if (unconfirmedJudges > 0) {
            message += ` Warning: ${unconfirmedJudges} judge(s) assigned to event but not confirmed. No judges assigned to matches.`;
          } else {
            message += ` No judges assigned to this event.`;
          }
        }

        toast.success(message, { autoClose: 6000 });

        if (result.data.explanation) {
          console.log('📊 Bracket Explanation:', result.data.explanation);
          // Optionally show explanation in a toast or modal
          toast.info(result.data.explanation.substring(0, 100) + '...', { autoClose: 5000 });
        }

        // Reload matches to show the newly generated ones
        await loadMatches();

        // Reload registrations again to show any updates
        await loadRegistrations();

        toast.info('Matches are now available in Event Scoring tab', { autoClose: 3000 });
      } else {
        toast.error(result.message || 'Failed to generate match draws');
      }
    } catch (error) {
      console.error('❌ Frontend: Error generating draws:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Failed to generate match draws. Please check your Gemini API key configuration.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateKataPDF = () => {
    if (!kataPerformances || kataPerformances.length === 0) {
      toast.error('No performance data to generate report');
      return;
    }

    const doc = new jsPDF();
    const tournamentName = tournaments.find(t => t._id === selectedTournament)?.tournament_name || 'Tournament';
    const categoryName = categories.find(c => c._id === selectedCategory)?.category_name || 'Category';
    const timestamp = new Date().toLocaleString();

    // Add Header
    doc.setFontSize(18);
    doc.text('Kata Event Report', 14, 20);

    doc.setFontSize(12);
    doc.text(`Tournament: ${tournamentName}`, 14, 30);
    doc.text(`Category: ${categoryName}`, 14, 38);
    doc.text(`Generated: ${timestamp}`, 14, 46);

    // Group performances by round
    const roundsMap = {};
    kataPerformances.forEach(perf => {
      const round = perf.round || 'First Round';
      if (!roundsMap[round]) {
        roundsMap[round] = [];
      }
      roundsMap[round].push(perf);
    });

    // Define round order
    const roundOrder = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)', 'Final Round'];

    let yPos = 55;

    roundOrder.forEach(roundName => {
      if (!roundsMap[roundName]) return;

      const performances = roundsMap[roundName].sort((a, b) => {
        // Same sorting logic as UI
        if (roundName === 'Third Round (Final 4)') {
          if (a.place !== null && b.place !== null) {
            return a.place - b.place;
          }
          if (a.place !== null) return -1;
          if (b.place !== null) return 1;
        }
        if (a.final_score === null && b.final_score !== null) return 1;
        if (a.final_score !== null && b.final_score === null) return -1;
        if (a.final_score === null && b.final_score === null) {
          return (a.performance_order || 0) - (b.performance_order || 0);
        }
        return (b.final_score || 0) - (a.final_score || 0);
      });

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black
      doc.text(roundName, 14, yPos);
      yPos += 5;

      const tableBody = performances.map((perf, index) => {
        const playerName = perf.player_id?.user_id
          ? `${perf.player_id.user_id.first_name || ''} ${perf.player_id.user_id.last_name || ''}`.trim() || perf.player_id.user_id.username
          : 'Unknown Player';

        const dojo = perf.player_id?.dojo_name || 'N/A';
        const score = perf.final_score !== null && perf.final_score !== undefined ? perf.final_score.toFixed(1) : '-';

        let rank = (index + 1).toString();
        if (roundName === 'Third Round (Final 4)' && perf.place) {
          rank = perf.place === 1 ? '1st (Gold)' : perf.place === 2 ? '2nd (Silver)' : '3rd (Bronze)';
        }

        return [rank, playerName, dojo, score];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Rank', 'Player Name', 'Dojo', 'Score']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { top: 10 },
        didDrawPage: (data) => {
          yPos = data.cursor.y;
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`Kata_Report_${tournamentName}_${categoryName}.pdf`);
    toast.success('Report downloaded successfully');
  };

  const generateBracketPDF = () => {
    if (!matches || matches.length === 0) {
      toast.error('No matches to generate report');
      return;
    }

    const doc = new jsPDF();
    const tournamentName = tournaments.find(t => t._id === selectedTournament)?.tournament_name || 'Tournament';
    const categoryName = categories.find(c => c._id === selectedCategory)?.category_name || 'Category';
    const timestamp = new Date().toLocaleString();

    // Add Header
    doc.setFontSize(18);
    doc.text('Tournament Match Bracket Report', 14, 20);

    doc.setFontSize(12);
    doc.text(`Tournament: ${tournamentName}`, 14, 30);
    doc.text(`Category: ${categoryName}`, 14, 38);
    doc.text(`Generated: ${timestamp}`, 14, 46);

    // Group matches by round (similar functionality to MatchDrawsBracket)
    const roundsMap = {};
    matches.forEach(match => {
      const level = match.match_level || 'Preliminary';
      if (!roundsMap[level]) {
        roundsMap[level] = [];
      }
      roundsMap[level].push(match);
    });

    const roundOrder = ['Preliminary', 'Quarterfinal', 'Semifinal', 'Bronze', 'Final'];
    const sortedRounds = roundOrder.filter(level => roundsMap[level]);

    // Check for any rounds not in standard order (e.g. Round 1, Round 2) and append them
    Object.keys(roundsMap).forEach(level => {
      if (!roundOrder.includes(level)) {
        if (!sortedRounds.includes(level)) {
          // Insert before Semifinal/Final if possible, or just push
          // Simple approach: push to processed list if not exists
          sortedRounds.push(level);
        }
      }
    });

    // Sort to ensure Preliminary -> ... -> Final
    // (Existing sortedRounds is mainly based on explicit order, others appended)

    let yPos = 55;

    sortedRounds.forEach(roundName => {
      const roundMatches = roundsMap[roundName].sort((a, b) => (a.match_name || '').localeCompare(b.match_name || ''));

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black
      doc.text(roundName, 14, yPos);
      yPos += 5;

      const tableBody = roundMatches.map(match => {
        const participant1 = match.participants && match.participants[0]
          ? getParticipantNamePDF(match.participants[0])
          : 'Bye';

        const participant2 = match.participants && match.participants[1]
          ? getParticipantNamePDF(match.participants[1])
          : 'Bye';

        const winnerId = match.winner_id;
        let winnerName = '-';
        if (match.status === 'Completed' && winnerId) {
          // Robust winner finding logic - handle both object and string IDs
          const winnerIdStr = (match.winner_id?._id || match.winner_id)?.toString();

          if (winnerIdStr) {
            const winnerPart = match.participants?.find(p => {
              const pPlayerId = (p.player_id?._id || p.player_id)?.toString();
              const pTeamId = (p.team_id?._id || p.team_id)?.toString();
              const pPartId = p._id?.toString();

              return pPlayerId === winnerIdStr || pTeamId === winnerIdStr || pPartId === winnerIdStr;
            });
            if (winnerPart) winnerName = getParticipantNamePDF(winnerPart);
          }
        }

        return [
          match.match_name || match.match_level,
          participant1,
          participant2,
          match.status,
          winnerName
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Match', 'Participant 1', 'Participant 2', 'Status', 'Winner']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
        margin: { top: 10 },
        didDrawPage: (data) => {
          // Resets yPos if page breaks
          yPos = data.cursor.y;
        }
      });

      yPos = doc.lastAutoTable.finalY + 15;
    });

    doc.save(`Bracket_Report_${tournamentName}_${categoryName}.pdf`);
    toast.success('PDF Report downloaded successfully');
  };

  const getParticipantNamePDF = (participant) => {
    if (participant.player_id?.user_id) {
      const user = participant.player_id.user_id;
      if (user.first_name || user.last_name) {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
      return user.username || 'Unknown Player';
    }
    if (participant.team_id) {
      return participant.team_id.team_name || 'Unknown Team';
    }
    return 'Bye';
  };
  // But we'll keep this for safety in case categories are populated
  const filteredCategories = categories.filter(cat => {
    const catTournamentId = cat.tournament_id?._id || cat.tournament_id;
    return catTournamentId?.toString() === selectedTournament?.toString();
  });

  const selectedCategoryData = categories.find(cat => cat._id === selectedCategory);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Match Draws</h1>
          <p className="text-gray-600">Visualize and manage tournament match brackets</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tournament
              </label>
              <select
                value={selectedTournament || ''}
                onChange={(e) => {
                  setSelectedTournament(e.target.value);
                  setSelectedCategory(null);
                }}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loading ? 'Loading tournaments...' : 'Select Tournament'}
                </option>
                {tournaments.length === 0 && !loading && (
                  <option value="" disabled>No tournaments available</option>
                )}
                {tournaments.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.tournament_name} {t.status ? `(${t.status})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value)}
                disabled={!selectedTournament || loadingCategories}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {loadingCategories ? 'Loading categories...' : 'Select Category'}
                </option>
                {filteredCategories.length === 0 && !loadingCategories && selectedTournament && (
                  <option value="" disabled>No categories found for this tournament</option>
                )}
                {filteredCategories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.category_name} {cat.participation_type ? `(${cat.participation_type})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end space-x-2">
              {selectedCategoryData && (selectedCategoryData.category_type === 'Kata' || selectedCategoryData.category_type === 'Team Kata') ? (
                <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Kata Event:</strong> Players perform individually. No matches needed.
                    Use the <strong>Event Scoring</strong> tab to create Kata performances for rounds.
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={generateBracketPDF}
                    disabled={!selectedTournament || !selectedCategory || matches.length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mr-2"
                  >
                    <FiFileText className="mr-2" />
                    Download Report
                  </button>
                  <button
                    onClick={handleGenerateDraws}
                    disabled={!selectedTournament || !selectedCategory}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <FiRefreshCw className="mr-2" />
                    Generate AI Draws
                  </button>
                </>
              )}
              <button
                onClick={handleRefreshAll}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center"
                title="Refresh all data including newly approved players"
              >
                <FiRefreshCw />
              </button>
            </div>
          </div>
        </div>

        {/* Registered Players Section */}
        {selectedTournament && selectedCategory && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <FiUsers className="mr-2" />
                Registered Players for {selectedCategoryData?.category_name || 'Category'}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                  {loadingRegistrations ? 'Loading...' : `${registrations.length} Registered`}
                </span>
                <button
                  onClick={loadRegistrations}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center text-sm"
                  disabled={loadingRegistrations}
                  title="Refresh registered players list"
                >
                  <FiRefreshCw className={`mr-1 ${loadingRegistrations ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {loadingRegistrations ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600">Loading registered players...</p>
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FiUser className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No players registered for this category yet</p>
                <p className="text-sm text-gray-500">Players need to register and be approved before generating match draws</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {registrations
                  .filter(reg => reg.registration_type === 'Individual' || reg.registration_type === 'Team')
                  .map((registration, index) => {
                    const playerName = registration.player_id?.user_id?.first_name && registration.player_id?.user_id?.last_name
                      ? `${registration.player_id.user_id.first_name} ${registration.player_id.user_id.last_name}`
                      : registration.player_id?.user_id?.username
                        ? registration.player_id.user_id.username
                        : registration.team_id?.team_name
                          ? registration.team_id.team_name
                          : `Player ${index + 1}`;

                    const belt = registration.player_id?.belt_rank || 'N/A';
                    const dojo = registration.player_id?.dojo_name || registration.team_id?.dojo_id?.dojo_name || 'N/A';

                    return (
                      <div
                        key={registration._id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              {registration.registration_type === 'Team' ? (
                                <FiUsers className="w-4 h-4 text-blue-600 mr-2" />
                              ) : (
                                <FiUser className="w-4 h-4 text-green-600 mr-2" />
                              )}
                              <h3 className="font-semibold text-gray-800">{playerName}</h3>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><span className="font-medium">Type:</span> {registration.registration_type}</p>
                              {registration.registration_type === 'Individual' && (
                                <>
                                  <p><span className="font-medium">Belt:</span> {belt}</p>
                                  <p><span className="font-medium">Dojo:</span> {dojo}</p>
                                </>
                              )}
                              {registration.registration_type === 'Team' && (
                                <p><span className="font-medium">Dojo:</span> {dojo}</p>
                              )}
                              <p>
                                <span className="font-medium">Payment:</span>{' '}
                                <span className={`px-2 py-0.5 rounded text-xs ${registration.payment_status === 'Paid'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {registration.payment_status}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Bracket Visualization or Player List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {!selectedTournament || !selectedCategory ? (
            <div className="text-center py-12">
              <FiFilter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Please select a tournament and category to view match draws</p>
            </div>
          ) : selectedCategoryData && (selectedCategoryData.category_type === 'Kata' || selectedCategoryData.category_type === 'Team Kata') ? (
            // Kata Events: Show round progression with players who advanced
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                    <FiTrendingUp className="mr-2 text-blue-600" />
                    Kata Event - Round Progression
                  </h3>
                  <p className="text-sm text-gray-600">
                    View players who advanced through each round. Players are ranked by final score.
                    {kataReport && (
                      <span className="ml-2 text-green-600 font-semibold">
                        ✓ Report Published
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateReport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={generatingReport || !selectedCategory}
                  >
                    <FiFileText className={`mr-2 ${generatingReport ? 'animate-pulse' : ''}`} />
                    {generatingReport ? 'Generating...' : kataReport ? 'Regenerate Report' : 'Generate Report'}
                  </button>
                  {kataReport && (
                    <button
                      onClick={generateKataPDF}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center"
                      title="Download PDF Report"
                    >
                      <FiDownload className="mr-2" />
                      Download PDF
                    </button>
                  )}
                  <button
                    onClick={handleRefreshAll}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                    disabled={loadingKataPerformances || loadingRegistrations}
                    title="Refresh all data including newly approved players"
                  >
                    <FiRefreshCw className={`mr-2 ${(loadingKataPerformances || loadingRegistrations) ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {loadingKataPerformances ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="ml-4 text-gray-600">Loading round progression...</p>
                </div>
              ) : (
                (() => {
                  // Group performances by round
                  const roundsMap = {};
                  kataPerformances.forEach(perf => {
                    const round = perf.round || 'First Round';
                    if (!roundsMap[round]) {
                      roundsMap[round] = [];
                    }
                    roundsMap[round].push(perf);
                  });

                  // Define round order
                  const roundOrder = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)', 'Final Round'];

                  // Sort rounds by order
                  const rounds = roundOrder
                    .filter(round => roundsMap[round] && roundsMap[round].length > 0)
                    .map(round => ({
                      name: round,
                      performances: roundsMap[round].sort((a, b) => {
                        // For Final 4 round, sort by place (ranking) first
                        if (round === 'Third Round (Final 4)') {
                          if (a.place !== null && b.place !== null) {
                            return a.place - b.place; // Sort by place ascending (1st, 2nd, 3rd, 3rd)
                          }
                          if (a.place !== null) return -1;
                          if (b.place !== null) return 1;
                        }
                        // For other rounds, sort by final_score descending, then by performance_order
                        if (a.final_score === null && b.final_score !== null) return 1;
                        if (a.final_score !== null && b.final_score === null) return -1;
                        if (a.final_score === null && b.final_score === null) {
                          return (a.performance_order || 0) - (b.performance_order || 0);
                        }
                        return (b.final_score || 0) - (a.final_score || 0);
                      })
                    }));

                  if (rounds.length === 0) {
                    return (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">No rounds completed yet</p>
                        <p className="text-sm text-gray-500">
                          Use the <strong>Event Scoring</strong> tab to create performances and finalize rounds.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {rounds.map((round, roundIndex) => (
                        <div key={round.name} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <FiAward className="mr-2 text-xl" />
                                <h4 className="text-xl font-bold">{round.name}</h4>
                              </div>
                              <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-semibold">
                                {round.performances.length} Player{round.performances.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="divide-y divide-gray-200">
                            {round.performances.map((perf, index) => {
                              const playerName = perf.player_id?.user_id
                                ? `${perf.player_id.user_id.first_name || ''} ${perf.player_id.user_id.last_name || ''}`.trim() || perf.player_id.user_id.username
                                : 'Unknown Player';

                              const belt = perf.player_id?.belt_rank || 'N/A';
                              const dojo = perf.player_id?.dojo_name || 'N/A';

                              return (
                                <div
                                  key={perf._id}
                                  className={`p-4 hover:bg-gray-50 transition ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                      {/* Display ranking for Final 4, otherwise show position number */}
                                      {round.name === 'Third Round (Final 4)' && perf.place !== null && perf.place !== undefined ? (
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${perf.place === 1 ? 'bg-yellow-400 text-yellow-900' :
                                          perf.place === 2 ? 'bg-gray-300 text-gray-800' :
                                            'bg-orange-300 text-orange-900'
                                          }`}>
                                          {perf.place === 1 ? '🥇' : perf.place === 2 ? '🥈' : '🥉'}
                                        </div>
                                      ) : (
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                          index === 1 ? 'bg-gray-300 text-gray-800' :
                                            index === 2 ? 'bg-orange-300 text-orange-900' :
                                              'bg-blue-100 text-blue-600'
                                          }`}>
                                          {index + 1}
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <FiUser className="w-4 h-4 text-green-600" />
                                          <h4 className="font-semibold text-gray-800">{playerName}</h4>
                                          {/* Display ranking badge for Final 4 */}
                                          {round.name === 'Third Round (Final 4)' && perf.place !== null && perf.place !== undefined && (
                                            <span className={`px-3 py-1 rounded text-xs font-bold ${perf.place === 1 ? 'bg-yellow-200 text-yellow-800' :
                                              perf.place === 2 ? 'bg-gray-200 text-gray-800' :
                                                'bg-orange-200 text-orange-800'
                                              }`}>
                                              {perf.place === 1 ? '🥇 1st Place' :
                                                perf.place === 2 ? '🥈 2nd Place' :
                                                  '🥉 3rd Place'}
                                            </span>
                                          )}
                                          {/* Display medal for other rounds */}
                                          {round.name !== 'Third Round (Final 4)' && index < 3 && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${index === 0 ? 'bg-yellow-200 text-yellow-800' :
                                              index === 1 ? 'bg-gray-200 text-gray-800' :
                                                'bg-orange-200 text-orange-800'
                                              }`}>
                                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                          <span>Belt: {belt}</span>
                                          <span>•</span>
                                          <span>Dojo: {dojo}</span>
                                          {perf.final_score !== null && perf.final_score !== undefined && (
                                            <>
                                              <span>•</span>
                                              <span className="font-semibold text-green-600">
                                                Final Score: {perf.final_score.toFixed(1)}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>
          ) : selectedCategoryData && (selectedCategoryData.category_type === 'Kumite' || selectedCategoryData.category_type === 'Team Kumite') && kumiteReport ? (
            // Kumite Events: Show round progression with matches and winners
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                    <FiTrendingUp className="mr-2 text-blue-600" />
                    Kumite Event - Round Progression
                  </h3>
                  <p className="text-sm text-gray-600">
                    View matches and players who advanced through each round.
                    <span className="ml-2 text-green-600 font-semibold">
                      ✓ Report Published
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateKumiteReport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={generatingKumiteReport || !selectedCategory}
                  >
                    <FiFileText className={`mr-2 ${generatingKumiteReport ? 'animate-pulse' : ''}`} />
                    {generatingKumiteReport ? 'Generating...' : 'Regenerate Report'}
                  </button>
                  <button
                    onClick={handleRefreshAll}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                    disabled={loadingRegistrations}
                    title="Refresh all data including newly approved players"
                  >
                    <FiRefreshCw className={`mr-2 ${loadingRegistrations ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {kumiteReport.report_data && kumiteReport.report_data.rounds && kumiteReport.report_data.rounds.length > 0 ? (
                <div className="space-y-6">
                  {kumiteReport.report_data.rounds.map((round, roundIndex) => (
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
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${match.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                  match.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                  {match.status}
                                </span>
                              </div>
                              {match.scheduled_time && (
                                <p className="text-xs text-gray-500">
                                  {new Date(match.scheduled_time).toLocaleString()}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              {match.participants && match.participants.map((participant, pIndex) => (
                                <div
                                  key={pIndex}
                                  className={`p-3 rounded-lg border-2 ${participant.is_winner
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
                                        <p className="font-semibold text-gray-800">{participant.player_name}</p>
                                        <div className="text-xs text-gray-600 space-x-2">
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
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${participant.result === 'Win' ? 'bg-green-200 text-green-800' :
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

                  {/* Final Rankings */}
                  {kumiteReport.report_data.final_rankings && kumiteReport.report_data.final_rankings.length > 0 && (
                    <div className="border border-yellow-300 rounded-lg overflow-hidden bg-gradient-to-r from-yellow-50 to-orange-50">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4">
                        <div className="flex items-center">
                          <FiAward className="mr-2 text-xl" />
                          <h4 className="text-xl font-bold">Final Rankings</h4>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {kumiteReport.report_data.final_rankings.map((ranking, index) => (
                            <div
                              key={index}
                              className={`p-4 rounded-lg border-2 ${ranking.place === 1 ? 'bg-yellow-100 border-yellow-400' :
                                ranking.place === 2 ? 'bg-gray-100 border-gray-400' :
                                  'bg-orange-100 border-orange-400'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${ranking.place === 1 ? 'bg-yellow-400 text-yellow-900' :
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
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <FiAward className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No matches found in report</p>
                </div>
              )}
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="ml-4 text-gray-600">Loading matches...</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12">
              <FiFilter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No match draws generated yet for this category</p>
              <p className="text-sm text-gray-500 mb-2">
                {registrations.length > 0
                  ? `There are ${registrations.filter(r => r.registration_type === 'Individual' || r.registration_type === 'Team').length} registered players. Click "Generate AI Draws" to create match brackets.`
                  : 'No registered players found. Players need to register first before generating match draws.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Show Generate Report button for Kumite events if no report exists */}
              {selectedCategoryData && (selectedCategoryData.category_type === 'Kumite' || selectedCategoryData.category_type === 'Team Kumite') && !kumiteReport && (
                <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center">
                      <FiFileText className="mr-2 text-blue-600" />
                      Generate Kumite Report
                    </h3>
                    <p className="text-sm text-gray-600">
                      Generate a detailed report showing match results and round progression. This will be visible to coaches and players.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateKumiteReport}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={generatingKumiteReport || !selectedCategory}
                  >
                    <FiFileText className={`mr-2 ${generatingKumiteReport ? 'animate-pulse' : ''}`} />
                    {generatingKumiteReport ? 'Generating...' : 'Generate Report'}
                  </button>
                </div>
              )}

              {/* Check if next round needs to be generated */}
              {(() => {
                const preliminaryMatches = matches.filter(m => m.match_level === 'Preliminary');
                const quarterfinalMatches = matches.filter(m => m.match_level === 'Quarterfinal');
                const semifinalMatches = matches.filter(m => m.match_level === 'Semifinal');
                const finalMatches = matches.filter(m => m.match_level === 'Final');

                // Check if all preliminary matches are completed but quarterfinals don't exist
                const allPreliminaryCompleted = preliminaryMatches.length > 0 &&
                  preliminaryMatches.every(m => m.status === 'Completed') &&
                  quarterfinalMatches.length === 0;

                // Check if all quarterfinal matches are completed but semifinals don't exist
                const allQuarterfinalCompleted = quarterfinalMatches.length > 0 &&
                  quarterfinalMatches.every(m => m.status === 'Completed') &&
                  semifinalMatches.length === 0;

                // Check if all semifinal matches are completed but final doesn't exist
                const allSemifinalCompleted = semifinalMatches.length > 0 &&
                  semifinalMatches.every(m => m.status === 'Completed') &&
                  finalMatches.length === 0;

                if (allPreliminaryCompleted || allQuarterfinalCompleted || allSemifinalCompleted) {
                  const roundToGenerate = allPreliminaryCompleted ? 'Preliminary' :
                    allQuarterfinalCompleted ? 'Quarterfinal' : 'Semifinal';
                  const nextRoundName = allPreliminaryCompleted ? 'Quarterfinal' :
                    allQuarterfinalCompleted ? 'Semifinal' : 'Final';

                  return (
                    <div className="mb-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-yellow-800 mb-1 flex items-center">
                            <FiTrendingUp className="mr-2" />
                            Ready for {nextRoundName} Round
                          </h3>
                          <p className="text-sm text-yellow-700">
                            All {roundToGenerate} matches are completed. Click below to generate {nextRoundName.toLowerCase()} matches with winners.
                          </p>
                        </div>
                        <button
                          onClick={() => handleGenerateNextRound(roundToGenerate)}
                          className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                          {loading ? 'Generating...' : `Generate ${nextRoundName} Matches`}
                        </button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Show Match Draws Bracket for all event types */}
              <MatchDrawsBracket
                matches={matches}
                category={selectedCategoryData}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MatchDraws;

