const KataReport = require('../models/KataReport');
const KataPerformance = require('../models/KataPerformance');
const TournamentCategory = require('../models/TournamentCategory');
const Tournament = require('../models/Tournament');
const Score = require('../models/Score');

// @desc    Generate Kata report for a category
// @route   POST /api/kata-reports/generate
// @access  Private/Organizer
const generateKataReport = async (req, res, next) => {
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

    // Verify it's a Kata event
    if (category.category_type !== 'Kata' && category.category_type !== 'Team Kata') {
      return res.status(400).json({
        success: false,
        message: 'Reports can only be generated for Kata events'
      });
    }

    // Get all performances for this category
    const performances = await KataPerformance.find({ category_id })
      .populate({
        path: 'player_id',
        select: 'user_id belt_rank dojo_name',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .sort({ round: 1, final_score: -1, performance_order: 1 });

    if (performances.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No performances found for this category'
      });
    }

    // Get all scores for these performances
    const performanceIds = performances.map(p => p._id);
    const scores = await Score.find({ kata_performance_id: { $in: performanceIds } })
      .populate({
        path: 'judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name'
        }
      });

    // Group performances by round
    const roundsMap = {};
    performances.forEach(perf => {
      const round = perf.round || 'First Round';
      if (!roundsMap[round]) {
        roundsMap[round] = [];
      }
      roundsMap[round].push(perf);
    });

    // Define round order
    const roundOrder = ['First Round', 'Second Round (Final 8)', 'Third Round (Final 4)', 'Final Round'];
    
    // Build report data
    const reportData = {
      tournament_name: category.tournament_id?.tournament_name || 'Unknown Tournament',
      category_name: category.category_name,
      category_type: category.category_type,
      generated_at: new Date(),
      rounds: roundOrder
        .filter(round => roundsMap[round] && roundsMap[round].length > 0)
        .map(round => {
          const roundPerformances = roundsMap[round];
          
          // Sort by place (for Final 4) or final_score
          const sorted = roundPerformances.sort((a, b) => {
            if (round === 'Third Round (Final 4)') {
              // Sort by place for Final 4
              if (a.place !== null && b.place !== null) {
                return a.place - b.place;
              }
              if (a.place !== null) return -1;
              if (b.place !== null) return 1;
            }
            // Sort by final_score descending
            if (a.final_score === null && b.final_score !== null) return 1;
            if (a.final_score !== null && b.final_score === null) return -1;
            if (a.final_score === null && b.final_score === null) {
              return (a.performance_order || 0) - (b.performance_order || 0);
            }
            return (b.final_score || 0) - (a.final_score || 0);
          });

          return {
            round_name: round,
            players: sorted.map(perf => {
              const playerName = perf.player_id?.user_id
                ? `${perf.player_id.user_id.first_name || ''} ${perf.player_id.user_id.last_name || ''}`.trim() || perf.player_id.user_id.username
                : 'Unknown Player';
              
              // Get scores for this performance
              const perfScores = scores.filter(s => 
                s.kata_performance_id?.toString() === perf._id.toString()
              );

              const judgeScores = perfScores.map(score => {
                const judgeName = score.judge_id?.user_id
                  ? `${score.judge_id.user_id.first_name || ''} ${score.judge_id.user_id.last_name || ''}`.trim() || score.judge_id.user_id.username
                  : 'Unknown Judge';
                return {
                  judge_name: judgeName,
                  score: score.kata_score || 0
                };
              });

              return {
                player_id: perf.player_id?._id || perf.player_id,
                player_name: playerName,
                belt_rank: perf.player_id?.belt_rank || 'N/A',
                dojo_name: perf.player_id?.dojo_name || 'N/A',
                final_score: perf.final_score,
                place: perf.place || null,
                scores: judgeScores,
                performance_order: perf.performance_order
              };
            })
          };
        })
    };

    // Check if report already exists and was published
    const existingReport = await KataReport.findOne({ category_id });
    const wasAlreadyPublished = existingReport && existingReport.is_published;

    // Create or update report using findOneAndUpdate to handle unique index
    const report = await KataReport.findOneAndUpdate(
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
      message: 'Kata report generated and published successfully',
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Kata report for a category
// @route   GET /api/kata-reports/category/:category_id
// @access  Private
const getKataReport = async (req, res, next) => {
  try {
    const { category_id } = req.params;

    const report = await KataReport.findOne({ category_id })
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

// @desc    Get all Kata reports for a tournament
// @route   GET /api/kata-reports/tournament/:tournament_id
// @access  Private
const getTournamentKataReports = async (req, res, next) => {
  try {
    const { tournament_id } = req.params;

    const reports = await KataReport.find({ tournament_id, is_published: true })
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

// @desc    Get Kata reports for a player
// @route   GET /api/kata-reports/player/:player_id
// @access  Private
const getPlayerKataReports = async (req, res, next) => {
  try {
    const { player_id } = req.params;

    // Get all published reports
    const allReports = await KataReport.find({ is_published: true })
      .populate('category_id', 'category_name category_type')
      .populate('tournament_id', 'tournament_name')
      .sort({ createdAt: -1 });

    // Filter reports where this player participated
    const playerReports = allReports.filter(report => {
      if (!report.report_data || !report.report_data.rounds) return false;
      
      return report.report_data.rounds.some(round => 
        round.players.some(player => 
          String(player.player_id) === String(player_id)
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
  generateKataReport,
  getKataReport,
  getTournamentKataReports,
  getPlayerKataReports
};

