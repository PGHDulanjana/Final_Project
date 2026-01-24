const KataPerformance = require('../models/KataPerformance');
const Score = require('../models/Score');
const TournamentCategory = require('../models/TournamentCategory');
const Tournament = require('../models/Tournament');
const Registration = require('../models/Registration');
const Tatami = require('../models/Tatami');
const Judge = require('../models/Judge');

// @desc    Get all Kata performances for a category
// @route   GET /api/kata-performances
// @access  Private
const getKataPerformances = async (req, res, next) => {
  try {
    const { category_id, round, tournament_id, player_id, status } = req.query;
    const query = {};

    if (category_id) query.category_id = category_id;
    if (round) query.round = round;
    if (tournament_id) query.tournament_id = tournament_id;
    if (player_id) query.player_id = player_id;
    if (status) query.status = status;

    const performances = await KataPerformance.find(query)
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name category_type')
      .populate({
        path: 'player_id',
        select: 'user_id belt_rank dojo_name',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .sort({ round: 1, performance_order: 1 });

    // Get scores for all performances
    const performanceIds = performances.map(p => p._id);
    const scores = await Score.find({ kata_performance_id: { $in: performanceIds } })
      .populate('judge_id', 'user_id')
      .populate({
        path: 'judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name'
        }
      });

    // Attach scores to performances
    const performancesWithScores = performances.map(perf => {
      const perfScores = scores.filter(s => 
        s.kata_performance_id?.toString() === perf._id.toString()
      );
      return {
        ...perf.toObject(),
        scores: perfScores,
        judgeCount: perfScores.length
      };
    });

    res.status(200).json({
      success: true,
      count: performancesWithScores.length,
      data: performancesWithScores
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single Kata performance
// @route   GET /api/kata-performances/:id
// @access  Private
const getKataPerformance = async (req, res, next) => {
  try {
    const performance = await KataPerformance.findById(req.params.id)
      .populate('tournament_id')
      .populate('category_id')
      .populate({
        path: 'player_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Kata performance not found'
      });
    }

    // Get all scores for this performance
    const scores = await Score.find({ kata_performance_id: performance._id })
      .populate({
        path: 'judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .sort({ scored_at: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...performance.toObject(),
        scores
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Kata performances for a round
// @route   POST /api/kata-performances/create-round
// @access  Private/Organizer
const createRoundPerformances = async (req, res, next) => {
  try {
    const { category_id, round, player_ids } = req.body;

    if (!category_id || !round || !player_ids || !Array.isArray(player_ids)) {
      return res.status(400).json({
        success: false,
        message: 'Category ID, round, and player_ids array are required'
      });
    }

    // Verify category exists and is Kata type
    const category = await TournamentCategory.findById(category_id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (category.category_type !== 'Kata' && category.category_type !== 'Team Kata') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is only for Kata events'
      });
    }

    // Check authorization
    const tournament = await Tournament.findById(category.tournament_id);
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tournament.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create performances for this tournament'
        });
      }
    }

    // Validate players are registered for this category
    // Convert player_ids to ObjectIds if they're strings
    const mongoose = require('mongoose');
    const playerObjectIds = player_ids.map(id => {
      try {
        if (mongoose.Types.ObjectId.isValid(id)) {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      } catch (e) {
        console.error('Error converting player_id to ObjectId:', id, e);
        return id;
      }
    });

    console.log(`📊 Creating Kata performances: ${player_ids.length} players requested for ${round}`);
    console.log(`📊 Player IDs:`, player_ids);

    // First, check all registrations for this category (including pending payment)
    const allRegistrations = await Registration.find({
      tournament_id: tournament._id,
      category_id: category_id,
      player_id: { $in: playerObjectIds },
      approval_status: 'Approved'
    });

    console.log(`📊 Found ${allRegistrations.length} approved registrations (including pending payment)`);

    // Filter to only paid registrations
    const paidRegistrations = allRegistrations.filter(r => r.payment_status === 'Paid');
    
    console.log(`📊 Found ${paidRegistrations.length} paid registrations out of ${allRegistrations.length} approved`);

    // Check if we have enough paid registrations
    if (paidRegistrations.length !== player_ids.length) {
      const foundPlayerIds = paidRegistrations.map(r => String(r.player_id?._id || r.player_id));
      const missingPlayerIds = player_ids.filter(id => !foundPlayerIds.includes(String(id)));
      
      // Check which players are missing and why
      const missingDetails = [];
      player_ids.forEach(id => {
        const reg = allRegistrations.find(r => {
          const regPlayerId = r.player_id?._id || r.player_id;
          return String(regPlayerId) === String(id);
        });
        if (!reg) {
          missingDetails.push({ player_id: id, reason: 'Not registered or not approved' });
        } else if (reg.payment_status !== 'Paid') {
          missingDetails.push({ player_id: id, reason: `Payment status: ${reg.payment_status}` });
        }
      });
      
      return res.status(400).json({
        success: false,
        message: `Cannot create performances: ${paidRegistrations.length} out of ${player_ids.length} players have paid registrations. Only players with approved and paid registrations can participate.`,
        details: {
          requested: player_ids.length,
          approved: allRegistrations.length,
          paid: paidRegistrations.length,
          missing: missingDetails
        }
      });
    }

    // Use paid registrations
    const registrations = paidRegistrations;

    // Delete existing performances for this round (if regenerating)
    await KataPerformance.deleteMany({ category_id, round });

    // Create performances
    // Use the player_ids from registrations to ensure we have valid ObjectIds
    const validPlayerIds = registrations.map(r => r.player_id?._id || r.player_id);
    
    const performances = [];
    for (let i = 0; i < validPlayerIds.length; i++) {
      const performance = await KataPerformance.create({
        tournament_id: tournament._id,
        category_id,
        player_id: validPlayerIds[i],
        round,
        performance_order: i + 1,
        status: 'Scheduled'
      });
      performances.push(performance);
    }

    // Populate player info
    const populatedPerformances = await KataPerformance.find({ _id: { $in: performances.map(p => p._id) } })
      .populate({
        path: 'player_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    res.status(201).json({
      success: true,
      message: `Created ${performances.length} performances for ${round}`,
      data: populatedPerformances
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to remove all Kumite fields from a Kata score
const removeKumiteFields = (scoreDoc) => {
  const kumiteFields = ['match_id', 'participant_id', 'technical_score', 'performance_score', 
                       'ippon', 'waza_ari', 'chukoku', 'keikoku', 'hansoku_chui', 'hansoku', 'jogai'];
  kumiteFields.forEach(field => {
    scoreDoc[field] = undefined;
  });
  return scoreDoc;
};

// @desc    Submit Kata score (single score per judge per performance)
// @route   POST /api/kata-performances/:id/score
// @access  Private/Judge or Organizer/Table Worker
const submitKataScore = async (req, res, next) => {
  // Declare variables outside try block for error handler access
  let judge = null;
  let performance = null;
  let performanceId = req.params.id;
  let scoreValue = null;
  
  // List of ALL Kumite fields that must be removed from Kata scores
  // Defined outside try block so error handler can access it
  const kumiteFieldsToRemove = {
    match_id: "",
    participant_id: "",
    technical_score: "",
    performance_score: "",
    ippon: "",
    waza_ari: "",
    chukoku: "",
    keikoku: "",
    hansoku_chui: "",
    hansoku: "",
    jogai: ""
  };
  
  try {
    // Check if user is Judge, Organizer, or Admin
    if (req.user.user_type === 'Judge') {
      // Judge submitting their own score
      judge = await Judge.findOne({ user_id: req.user._id });
      if (!judge) {
        return res.status(404).json({
          success: false,
          message: 'Judge profile not found'
        });
      }
    } else if (req.user.user_type === 'Organizer' || req.user.user_type === 'Admin') {
      // Organizer/Table Worker submitting on behalf of a judge
      const { judge_id } = req.body;
      if (!judge_id) {
        return res.status(400).json({
          success: false,
          message: 'judge_id is required when submitting scores as organizer/table worker'
        });
      }
      judge = await Judge.findById(judge_id);
      if (!judge) {
        return res.status(404).json({
          success: false,
          message: 'Judge not found'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only judges, organizers, or admins can submit Kata scores'
      });
    }

    const { kata_score } = req.body;

    // Validate kata_score
    scoreValue = parseFloat(kata_score);
    if (isNaN(scoreValue) || scoreValue < 5.0 || scoreValue > 10.0) {
      return res.status(400).json({
        success: false,
        message: 'Kata score must be between 5.0 and 10.0'
      });
    }

    // Get performance
    performance = await KataPerformance.findById(performanceId)
      .populate('category_id')
      .populate('tournament_id');

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Kata performance not found'
      });
    }

    // If organizer/table worker, verify they have access to this tournament
    if (req.user.user_type === 'Organizer') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findOne({ user_id: req.user._id });
      if (!organizer) {
        return res.status(403).json({
          success: false,
          message: 'Organizer profile not found'
        });
      }
      const tournamentOrganizerId = performance.tournament_id?.organizer_id?._id || performance.tournament_id?.organizer_id;
      if (String(tournamentOrganizerId) !== String(organizer._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to submit scores for this tournament'
        });
      }
    }

    // Verify judge is assigned to this event (via Tatami)
    const categoryId = performance.category_id?._id || performance.category_id;
    const tatami = await Tatami.findOne({ category_id: categoryId });
    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'No tatami found for this event. Judges must be assigned first.'
      });
    }

    const isAssigned = tatami.assigned_judges && tatami.assigned_judges.some(
      j => j.judge_id && j.judge_id.toString() === judge._id.toString() && j.is_confirmed
    );

    if (!isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'The selected judge is not assigned to this event. Only assigned judges can score performances.'
      });
    }

    // Get player_id - handle both ObjectId and populated object
    const playerId = performance.player_id?._id || performance.player_id;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is missing from performance'
      });
    }

    // First, try to find existing score for this Kata performance
    let score = await Score.findOne({
      kata_performance_id: performanceId,
      judge_id: judge._id,
      player_id: playerId
    });

    // For Kata scores, we ONLY use kata_performance_id, judge_id, player_id, and kata_score
    // We NEVER include any Kumite fields (match_id, participant_id, technical_score, 
    // performance_score, ippon, waza_ari, chukoku, keikoku, hansoku_chui, hansoku, jogai)
    // Kata and Kumite scoring are completely separate systems
    
    if (score) {
      // Update existing Kata score using updateOne to ensure Kumite fields are removed
      await Score.updateOne(
        { _id: score._id },
        {
          $set: {
            kata_performance_id: performanceId,
            judge_id: judge._id,
            player_id: playerId,
            kata_score: scoreValue,
            scored_at: new Date()
          },
          $unset: kumiteFieldsToRemove
        }
      );
      // Reload the score to get the updated version
      score = await Score.findById(score._id);
    } else {
      // CRITICAL: Before creating a new Kata score, we MUST delete ALL scores for this judge
      // that have match_id: null and participant_id: null, as they will conflict with the Kumite index.
      // The Kumite index has a partial filter, but MongoDB may still check it during upsert operations.
      // We need to be aggressive here - delete ANY score for this judge that could conflict.
      // 
      // Strategy: Delete all scores for this judge where:
      // 1. match_id is null or doesn't exist AND
      // 2. participant_id is null or doesn't exist AND
      // 3. It's either not a Kata score OR it's a Kata score for a different performance
      const deleteQuery = {
        judge_id: judge._id,
        $and: [
          {
            $or: [
              { match_id: null },
              { match_id: { $exists: false } }
            ]
          },
          {
            $or: [
              { participant_id: null },
              { participant_id: { $exists: false } }
            ]
          },
          {
            $or: [
              // Not a Kata score at all (corrupted Kumite score)
              { kata_performance_id: { $exists: false } },
              { kata_performance_id: null },
              // Kata score for a different performance (old data)
              { kata_performance_id: { $ne: performanceId } }
            ]
          }
        ]
      };
      
      const deleteResult = await Score.deleteMany(deleteQuery);
      
      if (deleteResult.deletedCount > 0) {
        console.log(`Cleaning up ${deleteResult.deletedCount} conflicting score(s) for judge ${judge._id}`);
      }
      
      // Also try to find and delete any scores that might have the exact conflicting key
      // This is a safety net in case the above query didn't catch everything
      const conflictingKeyScores = await Score.find({
        judge_id: judge._id,
        match_id: null,
        participant_id: null,
        kata_performance_id: { $ne: performanceId }
      });
      
      if (conflictingKeyScores.length > 0) {
        const additionalDelete = await Score.deleteMany({
          _id: { $in: conflictingKeyScores.map(s => s._id) }
        });
        if (additionalDelete.deletedCount > 0) {
          console.log(`Additional cleanup: deleted ${additionalDelete.deletedCount} more conflicting score(s)`);
        }
      }

      // Use findOneAndUpdate with upsert to atomically create/update Kata score
      // CRITICAL: We must NOT include match_id or participant_id in $set at all
      // We only set Kata-specific fields, then $unset all Kumite fields
      try {
        score = await Score.findOneAndUpdate(
          {
            kata_performance_id: performanceId,
            judge_id: judge._id,
            player_id: playerId
          },
          {
            $set: {
              kata_performance_id: performanceId,
              judge_id: judge._id,
              player_id: playerId,
              kata_score: scoreValue,
              scored_at: new Date()
              // DO NOT set match_id or participant_id here - they must not exist in Kata scores
            },
            // Explicitly unset ALL Kumite fields to ensure they're completely removed
            $unset: kumiteFieldsToRemove
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: false // Don't set defaults - we don't want Kumite field defaults
          }
        );
        
        // After creation, ensure Kumite fields are completely removed
        // Do a final update to make absolutely sure they're gone
        await Score.updateOne(
          { _id: score._id },
          { $unset: kumiteFieldsToRemove }
        );
        // Reload to get the clean version
        score = await Score.findById(score._id);
      } catch (createError) {
        // Handle duplicate key errors
        if (createError.code === 11000) {
          const keyPattern = createError.keyPattern || {};
          const keyValue = createError.keyValue || {};
          
          // Check if this is a Kumite index violation (match_id index)
          if (keyPattern.match_id) {
            // This is a Kumite index violation - there's a corrupted score
            // Try to find and delete the conflicting score(s)
            console.error('CRITICAL: Kata score creation triggered Kumite index violation:', {
              performanceId,
              judgeId: judge._id,
              keyValue
            });
            
            // Find all scores for this judge with the conflicting key
            const conflictingScores = await Score.find({
              judge_id: judge._id,
              match_id: keyValue.match_id,
              participant_id: keyValue.participant_id
            });
            
            if (conflictingScores.length > 0) {
              console.log(`Deleting ${conflictingScores.length} corrupted score(s) that conflict with Kumite index`);
              await Score.deleteMany({
                _id: { $in: conflictingScores.map(s => s._id) }
              });
              
              // Retry the creation after cleanup
              try {
                score = await Score.findOneAndUpdate(
                  {
                    kata_performance_id: performanceId,
                    judge_id: judge._id,
                    player_id: playerId
                  },
                  {
                    $set: {
                      kata_performance_id: performanceId,
                      judge_id: judge._id,
                      player_id: playerId,
                      kata_score: scoreValue,
                      scored_at: new Date()
                    },
                    $unset: kumiteFieldsToRemove
                  },
                  {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: false
                  }
                );
                
                // Final cleanup
                await Score.updateOne(
                  { _id: score._id },
                  { $unset: kumiteFieldsToRemove }
                );
                score = await Score.findById(score._id);
              } catch (retryError) {
                console.error('Retry after cleanup also failed:', retryError);
                throw createError; // Throw original error
              }
            } else {
              // Couldn't find conflicting score - this is strange
              console.error('Could not find conflicting score for Kumite index violation:', {
                error: createError.message,
                keyPattern,
                keyValue,
                performanceId,
                judgeId: judge._id,
                playerId
              });
              throw createError;
            }
          } else if (keyPattern.kata_performance_id) {
            // This is a Kata index violation - try to find and update the existing score
            const conflictingScore = await Score.findOne({
              kata_performance_id: performanceId,
              judge_id: judge._id,
              player_id: playerId
            });

            if (conflictingScore) {
              // Update the existing Kata score using updateOne to ensure Kumite fields are removed
              await Score.updateOne(
                { _id: conflictingScore._id },
                {
                  $set: {
                    kata_performance_id: performanceId,
                    judge_id: judge._id,
                    player_id: playerId,
                    kata_score: scoreValue,
                    scored_at: new Date()
                  },
                  $unset: kumiteFieldsToRemove
                }
              );
              // Reload the score
              score = await Score.findById(conflictingScore._id);
            } else {
              // Log the error for debugging
              console.error('Could not find conflicting Kata score:', {
                error: createError.message,
                keyPattern: createError.keyPattern,
                keyValue: createError.keyValue,
                performanceId,
                judgeId: judge._id,
                playerId
              });
              throw createError;
            }
          } else {
            // Unknown duplicate key error
            console.error('Unknown duplicate key error:', createError);
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    }

    // Calculate final score for this performance (remove highest/lowest, sum 3)
    await calculateKataFinalScore(performanceId);

    // Emit real-time update
    const { emitScoreUpdate } = require('../utils/socket');
    const categoryIdForEmit = performance.category_id?._id || performance.category_id;
    emitScoreUpdate(`kata-${categoryIdForEmit}`, {
      performanceId: performanceId,
      categoryId: categoryIdForEmit,
      playerId: playerId,
      score: score.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Kata score submitted successfully',
      data: score
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error submitting Kata score:', {
      code: error.code,
      message: error.message,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      stack: error.stack
    });

    // Handle unique index violations with clearer error messages
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const keyPattern = error.keyPattern || {};
      const keyValue = error.keyValue || {};
      
      // Try to find and fix the conflicting score
      // Note: Kata scores should NEVER trigger match_id index violations
      // If this happens, it means there's corrupted data (a Kata score with match_id set)
      if (keyPattern.kata_performance_id && judge && performance && performanceId && scoreValue !== null) {
        try {
          // Get player_id - handle both ObjectId and populated object
          const playerIdForError = performance?.player_id?._id || performance?.player_id;
          
          if (!playerIdForError) {
            throw new Error('Player ID is missing from performance');
          }
          
          // Find the conflicting Kata score
          const conflictingScore = await Score.findOne({
            kata_performance_id: performanceId,
            judge_id: judge._id,
            player_id: playerIdForError
          });

          if (conflictingScore) {
            // Update the conflicting score using updateOne to ensure Kumite fields are removed
            await Score.updateOne(
              { _id: conflictingScore._id },
              {
                $set: {
                  kata_performance_id: performanceId,
                  judge_id: judge._id,
                  player_id: playerIdForError,
                  kata_score: scoreValue,
                  scored_at: new Date()
                },
                $unset: kumiteFieldsToRemove
              }
            );
            // Reload the score
            const updatedScore = await Score.findById(conflictingScore._id);

            // Calculate final score
            await calculateKataFinalScore(performanceId);

            // Calculate final score
            await calculateKataFinalScore(performanceId);

            // Emit real-time update
            const { emitScoreUpdate } = require('../utils/socket');
            const categoryIdForEmit = performance.category_id?._id || performance.category_id;
            emitScoreUpdate(`kata-${categoryIdForEmit}`, {
              performanceId: performanceId,
              categoryId: categoryIdForEmit,
              playerId: playerIdForError,
              score: updatedScore.toObject()
            });

            return res.status(201).json({
              success: true,
              message: 'Kata score submitted successfully (updated existing score)',
              data: updatedScore
            });
          }
        } catch (fixError) {
          console.error('Error fixing conflicting score:', fixError);
        }
      }
      
      // Check which index was violated
      if (keyPattern.kata_performance_id) {
        // Kata performance index violation - this is expected and should be handled above
        return res.status(400).json({
          success: false,
          message: 'A score already exists for this judge and performance. Please try again.',
          error: error.message
        });
      } else if (keyPattern.match_id) {
        // Match index violation - this should NEVER happen for Kata scores
        // If it does, there's corrupted data (a Kata score incorrectly has match_id set)
        console.error('CRITICAL: Kata score triggered Kumite index violation - data corruption detected:', {
          performanceId,
          judgeId: judge?._id,
          keyValue: error.keyValue
        });
        return res.status(500).json({
          success: false,
          message: 'Data integrity error detected. A Kata score should not have Kumite fields. Please contact support.',
          error: error.message
        });
      } else {
        // Generic duplicate key error
        return res.status(400).json({
          success: false,
          message: 'A duplicate score was detected. Please try again.',
          error: error.message
        });
      }
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', '),
        error: error.message
      });
    }

    // Generic error response
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit Kata score',
      error: error.toString()
    });
  }
};

// @desc    Calculate final score for a Kata performance
// @route   POST /api/kata-performances/:id/calculate-final
// @access  Private
const calculateFinalScore = async (req, res, next) => {
  try {
    const performanceId = req.params.id;
    await calculateKataFinalScore(performanceId);

    const performance = await KataPerformance.findById(performanceId);
    res.status(200).json({
      success: true,
      message: 'Final score calculated',
      data: performance
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate final score (remove highest/lowest, sum 3)
const calculateKataFinalScore = async (performanceId) => {
  const performance = await KataPerformance.findById(performanceId);
  if (!performance) return;

  // Get all scores for this performance
  const scores = await Score.find({ kata_performance_id: performanceId });
  
  if (scores.length < 3) {
    // Need at least 3 scores to calculate
    performance.final_score = null;
    await performance.save();
    return;
  }

  // Extract kata scores
  const kataScores = scores
    .map(s => s.kata_score)
    .filter(s => s != null && s >= 5.0 && s <= 10.0)
    .sort((a, b) => a - b); // Sort ascending

  if (kataScores.length < 3) {
    performance.final_score = null;
    await performance.save();
    return;
  }

  // Remove highest and lowest
  const middleScores = kataScores.slice(1, -1);
  
  // Sum remaining 3 scores (or all if exactly 3, or take middle 3 if more than 5)
  let scoresToSum;
  if (middleScores.length === 3) {
    scoresToSum = middleScores;
  } else if (middleScores.length > 3) {
    // If more than 5 judges, take middle 3
    scoresToSum = middleScores.slice(-3);
  } else {
    // Less than 3 middle scores - use what we have
    scoresToSum = middleScores;
  }

  const finalScore = scoresToSum.reduce((sum, score) => sum + score, 0);
  
  performance.final_score = finalScore;
  await performance.save();

  return finalScore;
};

// @desc    Get Kata live scoreboard for a category/round
// @route   GET /api/kata-performances/scoreboard/:category_id
// @access  Public
const getKataScoreboard = async (req, res, next) => {
  try {
    const { category_id } = req.params;
    const { round } = req.query;

    const query = { category_id };
    if (round) query.round = round;

    const performances = await KataPerformance.find(query)
      .populate({
        path: 'player_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .sort({ round: 1, final_score: -1, performance_order: 1 });

    // Get all scores
    const performanceIds = performances.map(p => p._id);
    const scores = await Score.find({ kata_performance_id: { $in: performanceIds } })
      .populate({
        path: 'judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name'
        }
      });

    // Group scores by performance
    const scoresByPerformance = {};
    scores.forEach(score => {
      const perfId = score.kata_performance_id.toString();
      if (!scoresByPerformance[perfId]) {
        scoresByPerformance[perfId] = [];
      }
      scoresByPerformance[perfId].push(score);
    });

    // Build scoreboard data
    const scoreboard = performances.map(perf => {
      const perfScores = scoresByPerformance[perf._id.toString()] || [];
      const kataScores = perfScores
        .map(s => s.kata_score)
        .filter(s => s != null)
        .sort((a, b) => a - b);

      let highest = null;
      let lowest = null;
      let middleScores = [];

      if (kataScores.length >= 3) {
        highest = kataScores[kataScores.length - 1];
        lowest = kataScores[0];
        middleScores = kataScores.slice(1, -1);
        if (middleScores.length > 3) {
          middleScores = middleScores.slice(-3); // Take last 3 if more than 5 judges
        }
      }

      return {
        ...perf.toObject(),
        scores: perfScores,
        kataScores,
        highest,
        lowest,
        middleScores,
        calculatedFinal: perf.final_score
      };
    });

    res.status(200).json({
      success: true,
      data: scoreboard
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign rankings for Final 4 round
// @route   POST /api/kata-performances/assign-rankings
// @access  Private/Organizer
const assignRankings = async (req, res, next) => {
  try {
    const { category_id, round } = req.body;

    if (!category_id || !round) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and round are required'
      });
    }

    // Only assign rankings for Final 4 round
    if (round !== 'Third Round (Final 4)') {
      return res.status(400).json({
        success: false,
        message: 'Rankings can only be assigned for Third Round (Final 4)'
      });
    }

    // Get all performances for this round
    const performances = await KataPerformance.find({
      category_id,
      round
    }).sort({ final_score: -1, performance_order: 1 });

    if (performances.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No performances found for this round'
      });
    }

    // Assign rankings: 1st, 2nd, 3rd, 3rd (for Final 4)
    // For Final 4: 1st place, 2nd place, 3rd place (tied), 3rd place (tied)
    // This means 3rd and 4th both get place 3
    const rankings = [];
    
    if (performances.length === 4) {
      // Standard Final 4: assign 1st, 2nd, 3rd, 3rd
      rankings.push({ performanceId: performances[0]._id, place: 1 }); // 1st
      rankings.push({ performanceId: performances[1]._id, place: 2 }); // 2nd
      rankings.push({ performanceId: performances[2]._id, place: 3 }); // 3rd (tied)
      rankings.push({ performanceId: performances[3]._id, place: 3 }); // 3rd (tied)
    } else {
      // Handle cases with fewer than 4 players
      let currentPlace = 1;
      for (let i = 0; i < performances.length; i++) {
        const perf = performances[i];
        const nextPerf = performances[i + 1];
        
        // Check if current and next have the same score (tie)
        const isTie = nextPerf && 
                      perf.final_score !== null && 
                      nextPerf.final_score !== null &&
                      perf.final_score === nextPerf.final_score;

        if (currentPlace === 3) {
          // Both 3rd and 4th get place 3
          rankings.push({ performanceId: perf._id, place: 3 });
          if (nextPerf) {
            rankings.push({ performanceId: nextPerf._id, place: 3 });
            i++; // Skip next performance as we've already assigned it
          }
          break;
        } else {
          rankings.push({ performanceId: perf._id, place: currentPlace });
          if (!isTie) {
            currentPlace++;
          }
        }
      }
    }

    // Update performances with rankings
    const updatePromises = rankings.map(({ performanceId, place }) =>
      KataPerformance.updateOne(
        { _id: performanceId },
        { $set: { place } }
      )
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: `Rankings assigned for ${round}`,
      data: {
        rankings: rankings.length,
        round
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Kata performance
// @route   DELETE /api/kata-performances/:id
// @access  Private/Organizer
const deleteKataPerformance = async (req, res, next) => {
  try {
    const performanceId = req.params.id;

    // Get performance
    const performance = await KataPerformance.findById(performanceId)
      .populate('category_id')
      .populate('tournament_id');

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Kata performance not found'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findOne({ user_id: req.user._id });
      if (!organizer) {
        return res.status(403).json({
          success: false,
          message: 'Organizer profile not found'
        });
      }
      const tournamentOrganizerId = performance.tournament_id?.organizer_id?._id || performance.tournament_id?.organizer_id;
      if (String(tournamentOrganizerId) !== String(organizer._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to delete performances for this tournament'
        });
      }
    }

    // Delete all scores associated with this performance
    await Score.deleteMany({ kata_performance_id: performanceId });

    // Delete the performance
    await KataPerformance.findByIdAndDelete(performanceId);

    res.status(200).json({
      success: true,
      message: 'Kata performance deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all Kata performances for a round
// @route   DELETE /api/kata-performances/round/:category_id?round=...
// @access  Private/Organizer
const deleteRoundPerformances = async (req, res, next) => {
  try {
    const category_id = req.params.category_id;
    const { round } = req.query;

    if (!category_id || !round) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and round are required'
      });
    }

    // Get category to verify tournament
    const category = await TournamentCategory.findById(category_id)
      .populate('tournament_id');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findOne({ user_id: req.user._id });
      if (!organizer) {
        return res.status(403).json({
          success: false,
          message: 'Organizer profile not found'
        });
      }
      const tournamentOrganizerId = category.tournament_id?.organizer_id?._id || category.tournament_id?.organizer_id;
      if (String(tournamentOrganizerId) !== String(organizer._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to delete performances for this tournament'
        });
      }
    }

    // Get all performances for this round
    const performances = await KataPerformance.find({ category_id, round });
    const performanceIds = performances.map(p => p._id);

    // Delete all scores associated with these performances
    await Score.deleteMany({ kata_performance_id: { $in: performanceIds } });

    // Delete all performances for this round
    const result = await KataPerformance.deleteMany({ category_id, round });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} performance(s) for ${round}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKataPerformances,
  getKataPerformance,
  createRoundPerformances,
  submitKataScore,
  calculateFinalScore,
  getKataScoreboard,
  calculateKataFinalScore,
  assignRankings,
  deleteKataPerformance,
  deleteRoundPerformances
};

