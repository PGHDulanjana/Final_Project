const KumiteReport = require('../models/KumiteReport');
const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');
const TournamentCategory = require('../models/TournamentCategory');
const Score = require('../models/Score');
const Player = require('../models/Player');
const Team = require('../models/Team');

// @desc    Generate Kumite report for a category
// @route   POST /api/kumite-reports/generate
// @access  Private/Organizer
const generateKumiteReport = async (req, res, next) => {
  try {
    const { category_id } = req.body;

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required'
      });
    }

    // Get category and tournament info
    const category = await TournamentCategory.findById(category_id)
      .populate('tournament_id', 'tournament_name');
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Verify it's a Kumite event
    if (category.category_type !== 'Kumite' && category.category_type !== 'Team Kumite') {
      return res.status(400).json({
        success: false,
        message: 'Reports can only be generated for Kumite events'
      });
    }

    // Get all matches for this category
    const matches = await Match.find({ category_id })
      .sort({ match_level: 1, scheduled_time: 1 });

    if (matches.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matches found for this category'
      });
    }

    // Check if all matches are completed (optional - can generate report even if some matches pending)
    const allMatchesCompleted = matches.every(m => m.status === 'Completed');
    const finalMatch = matches.find(m => m.match_level === 'Final');
    const finalMatchCompleted = finalMatch && finalMatch.status === 'Completed';
    
    if (!finalMatchCompleted && allMatchesCompleted === false) {
      // Warn but allow generation if organizer wants to generate partial report
      console.log(`⚠️ Warning: Not all matches are completed. Final match status: ${finalMatch ? finalMatch.status : 'Not found'}`);
    }

    // Get all participants for these matches
    const matchIds = matches.map(m => m._id);
    const participants = await MatchParticipant.find({ match_id: { $in: matchIds } })
      .populate({
        path: 'player_id',
        select: 'user_id belt_rank dojo_name',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .populate({
        path: 'team_id',
        select: 'team_name team_type'
      });

    // Get all scores for these matches
    const scores = await Score.find({ match_id: { $in: matchIds } })
      .populate({
        path: 'participant_id',
        populate: {
          path: 'player_id',
          populate: {
            path: 'user_id',
            select: 'first_name last_name'
          }
        }
      });

    // Group participants by match_id
    const participantsByMatch = {};
    participants.forEach(p => {
      const matchId = p.match_id.toString();
      if (!participantsByMatch[matchId]) {
        participantsByMatch[matchId] = [];
      }
      participantsByMatch[matchId].push(p);
    });

    // Group scores by match_id and participant_id
    const scoresByMatchAndParticipant = {};
    scores.forEach(s => {
      const matchId = s.match_id?.toString();
      const participantId = s.participant_id?.toString();
      if (matchId && participantId) {
        if (!scoresByMatchAndParticipant[matchId]) {
          scoresByMatchAndParticipant[matchId] = {};
        }
        if (!scoresByMatchAndParticipant[matchId][participantId]) {
          scoresByMatchAndParticipant[matchId][participantId] = [];
        }
        scoresByMatchAndParticipant[matchId][participantId].push(s);
      }
    });

    // Group matches by round
    const roundsMap = {};
    matches.forEach(match => {
      const round = match.match_level || 'Preliminary';
      if (!roundsMap[round]) {
        roundsMap[round] = [];
      }
      roundsMap[round].push(match);
    });

    // Define round order
    const roundOrder = ['Preliminary', 'Quarterfinal', 'Semifinal', 'Bronze', 'Final'];
    
    // Build report data
    const reportData = {
      tournament_name: category.tournament_id?.tournament_name || 'Unknown Tournament',
      category_name: category.category_name,
      category_type: category.category_type,
      participation_type: category.participation_type,
      generated_at: new Date(),
      rounds: roundOrder
        .filter(round => roundsMap[round] && roundsMap[round].length > 0)
        .map(round => {
          const roundMatches = roundsMap[round];
          
          const matchesData = roundMatches.map(match => {
            const matchParticipants = participantsByMatch[match._id.toString()] || [];
            
            const participantsData = matchParticipants.map(participant => {
              const isIndividual = category.participation_type === 'Individual';
              let playerName = 'Unknown';
              let beltRank = 'N/A';
              let dojoName = 'N/A';
              
              if (isIndividual && participant.player_id) {
                const user = participant.player_id.user_id;
                playerName = user
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username
                  : 'Unknown Player';
                beltRank = participant.player_id.belt_rank || 'N/A';
                dojoName = participant.player_id.dojo_name || 'N/A';
              } else if (!isIndividual && participant.team_id) {
                playerName = participant.team_id.team_name || 'Unknown Team';
                dojoName = 'Team';
              }

              // Get scores for this participant
              const participantId = participant._id.toString();
              const matchScores = scoresByMatchAndParticipant[match._id.toString()]?.[participantId] || [];
              const participantScore = matchScores.length > 0 ? matchScores[0] : null;

              // Determine winner - check both winner_id and participant result
              let isWinner = false;
              if (match.winner_id) {
                if (isIndividual) {
                  isWinner = participant.player_id?._id?.toString() === match.winner_id.toString();
                } else {
                  // For team matches, winner_id might reference a player, but we check team_id
                  // Also check participant result
                  isWinner = participant.result === 'Win' || 
                    (participant.team_id?._id && match.winner_id.toString() === participant.team_id._id.toString());
                }
              } else {
                // Fallback to participant result
                isWinner = participant.result === 'Win';
              }

              return {
                participant_id: participant._id,
                player_id: participant.player_id?._id || participant.player_id,
                team_id: participant.team_id?._id || participant.team_id,
                player_name: playerName,
                belt_rank: beltRank,
                dojo_name: dojoName,
                is_winner: isWinner,
                result: participant.result || (isWinner ? 'Win' : 'Loss'),
                score: participantScore ? {
                  technical_score: participantScore.technical_score || 0,
                  performance_score: participantScore.performance_score || 0,
                  ippon: participantScore.ippon || 0,
                  waza_ari: participantScore.waza_ari || 0,
                  chukoku: participantScore.chukoku || 0,
                  keikoku: participantScore.keikoku || 0,
                  hansoku_chui: participantScore.hansoku_chui || 0,
                  hansoku: participantScore.hansoku || 0,
                  jogai: participantScore.jogai || 0
                } : null
              };
            });

            // Determine winner info
            let winnerInfo = null;
            if (match.status === 'Completed') {
              // Find winner by checking participant results or winner_id
              const winnerParticipant = matchParticipants.find(p => {
                if (p.result === 'Win') return true;
                if (match.winner_id) {
                  if (category.participation_type === 'Individual') {
                    return p.player_id?._id?.toString() === match.winner_id.toString();
                  } else {
                    return p.team_id?._id?.toString() === match.winner_id.toString() ||
                           (p.player_id?._id?.toString() === match.winner_id.toString() && p.result === 'Win');
                  }
                }
                return false;
              });
              
              if (winnerParticipant) {
                const winnerData = participantsData.find(p => 
                  p.participant_id.toString() === winnerParticipant._id.toString()
                );
                if (winnerData && winnerData.is_winner) {
                  winnerInfo = {
                    player_id: winnerData.player_id,
                    team_id: winnerData.team_id,
                    player_name: winnerData.player_name,
                    belt_rank: winnerData.belt_rank,
                    dojo_name: winnerData.dojo_name
                  };
                }
              }
            }

            return {
              match_id: match._id,
              match_name: match.match_name,
              scheduled_time: match.scheduled_time,
              status: match.status,
              participants: participantsData,
              winner: winnerInfo
            };
          });

          // Get players who advanced (winners from this round)
          const advancedPlayers = [];
          matchesData.forEach(match => {
            if (match.winner && match.status === 'Completed') {
              advancedPlayers.push(match.winner);
            }
          });

          return {
            round_name: round,
            matches: matchesData,
            advanced_players: advancedPlayers
          };
        }),
      final_rankings: []
    };

    // Determine final rankings from Final and Bronze matches
    const finalRound = reportData.rounds.find(r => r.round_name === 'Final');
    const bronzeRound = reportData.rounds.find(r => r.round_name === 'Bronze');
    
    if (finalRound) {
      const finalMatch = finalRound.matches.find(m => m.status === 'Completed');
      const bronzeMatches = bronzeRound?.matches.filter(m => m.status === 'Completed') || [];
      
      if (finalMatch && finalMatch.winner) {
        // 1st place - winner of Final
        reportData.final_rankings.push({
          place: 1,
          player_id: finalMatch.winner.player_id,
          team_id: finalMatch.winner.team_id,
          player_name: finalMatch.winner.player_name,
          belt_rank: finalMatch.winner.belt_rank,
          dojo_name: finalMatch.winner.dojo_name,
          medal: 'Gold'
        });

        // 2nd place - loser of Final
        const finalLoser = finalMatch.participants.find(p => !p.is_winner);
        if (finalLoser) {
          reportData.final_rankings.push({
            place: 2,
            player_id: finalLoser.player_id,
            team_id: finalLoser.team_id,
            player_name: finalLoser.player_name,
            belt_rank: finalLoser.belt_rank,
            dojo_name: finalLoser.dojo_name,
            medal: 'Silver'
          });
        }

        // 3rd place - winners of Bronze matches (can be 2 players)
        bronzeMatches.forEach(bronzeMatch => {
          if (bronzeMatch.winner) {
            reportData.final_rankings.push({
              place: 3,
              player_id: bronzeMatch.winner.player_id,
              team_id: bronzeMatch.winner.team_id,
              player_name: bronzeMatch.winner.player_name,
              belt_rank: bronzeMatch.winner.belt_rank,
              dojo_name: bronzeMatch.winner.dojo_name,
              medal: 'Bronze'
            });
          }
        });
      }
    }

    // Check if report already exists and was published
    const existingReport = await KumiteReport.findOne({ category_id });
    const wasAlreadyPublished = existingReport && existingReport.is_published;

    // Create or update report using findOneAndUpdate
    const report = await KumiteReport.findOneAndUpdate(
      { category_id },
      {
        tournament_id: category.tournament_id?._id || category.tournament_id,
        category_id,
        report_data: reportData,
        generated_by: req.user._id,
        is_published: true,
        published_at: new Date()
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    // Send notifications to players and coaches when report is first published
    if (!wasAlreadyPublished) {
      const { sendBulkNotifications } = require('../services/notificationService');
      const Registration = require('../models/Registration');
      const Player = require('../models/Player');
      const Coach = require('../models/Coach');
      
      // Get all approved registrations for this category
      const registrations = await Registration.find({
        category_id,
        approval_status: 'Approved'
      })
        .populate('player_id', 'user_id coach_id')
        .populate('team_id')
        .populate('coach_id', 'user_id');
      
      const userIdsToNotify = new Set();
      
      // Collect player and coach user IDs
      for (const reg of registrations) {
        if (reg.registration_type === 'Individual' && reg.player_id) {
          const playerUserId = reg.player_id.user_id?._id || reg.player_id.user_id;
          if (playerUserId) {
            userIdsToNotify.add(playerUserId.toString());
          }
          
          // Get coach user ID
          const player = await Player.findById(reg.player_id._id || reg.player_id).populate('coach_id', 'user_id');
          if (player?.coach_id?.user_id) {
            const coachUserId = player.coach_id.user_id._id || player.coach_id.user_id;
            if (coachUserId) {
              userIdsToNotify.add(coachUserId.toString());
            }
          }
        } else if (reg.registration_type === 'Team' && reg.team_id) {
          // For teams, get all team members and coach
          const Team = require('../models/Team');
          const TeamMember = require('../models/TeamMember');
          const team = await Team.findById(reg.team_id).populate('coach_id', 'user_id');
          
          // Get team members
          const teamMembers = await TeamMember.find({ team_id: reg.team_id })
            .populate('player_id', 'user_id');
          
          teamMembers.forEach(member => {
            const playerUserId = member.player_id?.user_id?._id || member.player_id?.user_id;
            if (playerUserId) {
              userIdsToNotify.add(playerUserId.toString());
            }
          });
          
          // Add team coach
          if (team?.coach_id?.user_id) {
            const coachUserId = team.coach_id.user_id._id || team.coach_id.user_id;
            if (coachUserId) {
              userIdsToNotify.add(coachUserId.toString());
            }
          }
        }
      }
      
      // Send notifications
      if (userIdsToNotify.size > 0) {
        const categoryName = category.category_name || 'Event';
        const tournamentName = category.tournament_id?.tournament_name || 'Tournament';
        
        await sendBulkNotifications(
          Array.from(userIdsToNotify),
          'Event Report Finalized',
          `The final report for "${categoryName}" in "${tournamentName}" has been published. View your results now!`,
          'Result'
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Kumite report generated and published successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Kumite report for a category
// @route   GET /api/kumite-reports/category/:category_id
// @access  Private
const getKumiteReport = async (req, res, next) => {
  try {
    const { category_id } = req.params;

    const report = await KumiteReport.findOne({ category_id })
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name category_type')
      .populate('generated_by', 'first_name last_name username');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found for this category'
      });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Kumite reports for a tournament
// @route   GET /api/kumite-reports/tournament/:tournament_id
// @access  Private
const getTournamentKumiteReports = async (req, res, next) => {
  try {
    const { tournament_id } = req.params;

    const reports = await KumiteReport.find({ tournament_id, is_published: true })
      .populate('category_id', 'category_name category_type')
      .populate('generated_by', 'first_name last_name username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Kumite reports for a player
// @route   GET /api/kumite-reports/player/:player_id
// @access  Private
const getPlayerKumiteReports = async (req, res, next) => {
  try {
    const { player_id } = req.params;

    // Get all published reports
    const allReports = await KumiteReport.find({ is_published: true })
      .populate('category_id', 'category_name category_type')
      .populate('tournament_id', 'tournament_name')
      .sort({ createdAt: -1 });

    // Filter reports where this player participated
    const playerReports = allReports.filter(report => {
      if (!report.report_data || !report.report_data.rounds) return false;
      
      return report.report_data.rounds.some(round => 
        round.matches.some(match => 
          match.participants.some(p => 
            String(p.player_id) === String(player_id)
          ) || 
          match.winner?.player_id && String(match.winner.player_id) === String(player_id)
        )
      );
    });

    res.status(200).json({
      success: true,
      count: playerReports.length,
      data: playerReports
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateKumiteReport,
  getKumiteReport,
  getTournamentKumiteReports,
  getPlayerKumiteReports
};

