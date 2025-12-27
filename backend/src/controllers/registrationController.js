const Registration = require('../models/Registration');
const Tournament = require('../models/Tournament');
const TournamentCategory = require('../models/TournamentCategory');
const Player = require('../models/Player');
const { sendRegistrationConfirmation } = require('../utils/emailService');

// @desc    Get all registrations
// @route   GET /api/registrations
// @access  Private
const getRegistrations = async (req, res, next) => {
  try {
    const { tournament_id, player_id, approval_status } = req.query;
    const query = {};

    if (tournament_id) query.tournament_id = tournament_id;
    if (player_id) query.player_id = player_id;
    if (approval_status) query.approval_status = approval_status;

    // If user is a Player, filter by their player_id
    if (req.user.user_type === 'Player' && !player_id) {
      const Player = require('../models/Player');
      const player = await Player.findOne({ user_id: req.user._id });
      if (player) {
        query.player_id = player._id;
      }
    }

    // If user is a Coach, filter coach registrations by their coach_id
    // This ensures coaches only see their own coach registrations, not other coaches'
    if (req.user.user_type === 'Coach') {
      const Coach = require('../models/Coach');
      const coach = await Coach.findOne({ user_id: req.user._id });
      if (coach) {
        // For Coach registrations, only show this coach's registrations
        // For other registration types (Individual/Team), show all (they'll be filtered by coach's players/teams on frontend)
        // Build the filter: (Coach registration AND this coach) OR (not a Coach registration)
        query.$or = [
          { registration_type: 'Coach', coach_id: coach._id },
          { registration_type: { $ne: 'Coach' } }
        ];
      }
    }

    // If user is a Judge, filter judge registrations by their judge_id
    // This ensures judges only see their own judge registrations, not other judges'
    if (req.user.user_type === 'Judge') {
      const Judge = require('../models/Judge');
      const judge = await Judge.findOne({ user_id: req.user._id });
      if (judge) {
        // For Judge registrations, only show this judge's registrations
        // For other registration types, show all (judges might need to see player/team registrations for matches they're judging)
        // Build the filter: (Judge registration AND this judge) OR (not a Judge registration)
        query.$or = [
          { registration_type: 'Judge', judge_id: judge._id },
          { registration_type: { $ne: 'Judge' } }
        ];
      }
    }

    const registrations = await Registration.find(query)
      .populate('tournament_id', 'tournament_name start_date end_date venue status')
      .populate('category_id', 'category_name individual_player_fee team_event_fee category_type participation_type team_size')
      .populate('player_id', 'user_id')
      .populate('team_id', 'team_name')
      .populate({
        path: 'coach_id',
        select: 'user_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .populate({
        path: 'judge_id',
        select: 'user_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .sort({ registration_date: -1 });

    res.status(200).json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single registration
// @route   GET /api/registrations/:id
// @access  Private
const getRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('tournament_id')
      .populate('player_id')
      .populate({
        path: 'coach_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .populate({
        path: 'judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register for tournament
// @route   POST /api/registrations
// @access  Private
const createRegistration = async (req, res, next) => {
  try {
    console.log('🔵 Registration Controller: Received request body:', req.body);
    console.log('🔵 Registration Controller: User:', {
      _id: req.user?._id,
      user_type: req.user?.user_type,
      username: req.user?.username
    });
    
    const { tournament_id, category_id, registration_type, player_id, team_id, judge_id, coach_id } = req.body;
    
    console.log('🔵 Registration Controller: Extracted data:', {
      tournament_id,
      category_id,
      registration_type,
      player_id,
      team_id,
      judge_id,
      coach_id
    });

    // For Judge and Coach registrations, category_id is optional (they register for the tournament, not specific events)
    // For Individual and Team registrations, category_id is required
    if (registration_type !== 'Judge' && registration_type !== 'Coach' && !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Event is required. Please select an event to register for.'
      });
    }

    // Validate user type matches registration type
    // Players can now register themselves if their coach is registered for the tournament
    // Use let for playerIdToUse since we may need to reassign it
    let playerIdToUse = player_id;
    
    if (registration_type === 'Individual') {
      const Player = require('../models/Player');
      const Coach = require('../models/Coach');
      
      // If player is registering themselves
      if (req.user.user_type === 'Player') {
        // Find player profile
        const playerProfile = await Player.findOne({ user_id: req.user._id }).populate('coach_id');
        
        if (!playerProfile) {
          return res.status(404).json({
            success: false,
            message: 'Player profile not found. Please complete your player profile first.'
          });
        }
        
        // Check if player has a coach assigned (for organizational purposes, but not required for registration)
        const playerCoachId = playerProfile.coach_id?._id || playerProfile.coach_id;
        
        // Use the player's own profile ID
        if (!playerProfile._id) {
          return res.status(500).json({
            success: false,
            message: 'Player profile ID is missing. Please contact support.'
          });
        }
        playerIdToUse = playerProfile._id;
        console.log('🔵 Player self-registration: Set playerIdToUse to:', playerIdToUse);
      } 
      // If coach is registering a player (existing flow)
      else if (req.user.user_type === 'Coach') {
        // Player_id is required for Individual registrations when coach registers
        if (!player_id) {
          return res.status(400).json({
            success: false,
            message: 'Player ID is required when registering a player.'
          });
        }
        
        // Coach is registering a player - verify coach has permission
        const player = await Player.findById(player_id).populate('coach_id');
        
        if (!player) {
          return res.status(404).json({
            success: false,
            message: 'Player not found'
          });
        }
        
        // Verify coach has permission to register this player
        const coachProfile = await Coach.findOne({ user_id: req.user._id });
        
        if (!coachProfile) {
          return res.status(403).json({
            success: false,
            message: 'Coach profile not found'
          });
        }
        
        const playerCoachId = player.coach_id?._id || player.coach_id;
        const isPlayerCoach = playerCoachId && playerCoachId.toString() === coachProfile._id.toString();
        
        // Also check by coach_name if coach_id doesn't match
        let isAuthorized = isPlayerCoach;
        if (!isAuthorized && player.coach_name) {
          const User = require('../models/User');
          const coachUser = await User.findById(req.user._id);
          if (coachUser) {
            const coachFullName = `${coachUser.first_name || ''} ${coachUser.last_name || ''}`.trim().toLowerCase();
            const playerCoachName = (player.coach_name || '').toLowerCase();
            isAuthorized = playerCoachName.includes(coachFullName) || 
                          coachFullName.includes(playerCoachName) ||
                          playerCoachName.includes(coachUser.first_name?.toLowerCase() || '') ||
                          playerCoachName.includes(coachUser.last_name?.toLowerCase() || '');
          }
        }
        
        if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            message: 'You are not authorized to register this player. Player must be under your coaching.'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'Only players and coaches can register for individual events.'
        });
      }
    }
    
    if (registration_type === 'Judge' && req.user.user_type !== 'Judge') {
      return res.status(403).json({
        success: false,
        message: 'Only judges can register as judges for tournaments'
      });
    }
    
    if (registration_type === 'Coach' && req.user.user_type !== 'Coach') {
      return res.status(403).json({
        success: false,
        message: 'Only coaches can register as coaches for tournaments'
      });
    }

    // Verify tournament exists and is open
    const tournament = await Tournament.findById(tournament_id);
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // For Judge and Coach registrations, category_id is optional
    // For Individual and Team registrations, category_id is required
    let category = null;
    if (category_id) {
      category = await TournamentCategory.findById(category_id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const catTournamentId = category.tournament_id?._id || category.tournament_id;
      if (catTournamentId.toString() !== tournament_id.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Event does not belong to the selected tournament'
        });
      }

      // Verify registration type matches event participation type (only for Individual/Team)
      if (registration_type !== 'Judge' && registration_type !== 'Coach' && 
          category.participation_type !== registration_type) {
        return res.status(400).json({
          success: false,
          message: `Registration type must be ${category.participation_type} for this event`
        });
      }
    }

    if (tournament.status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'Tournament is not open for registration'
      });
    }

    if (new Date() > new Date(tournament.registration_deadline)) {
      return res.status(400).json({
        success: false,
        message: 'Registration deadline has passed'
      });
    }

    // For individual registration, playerIdToUse should be set by now
    // (either from req.body for coaches, or set above for players registering themselves)
    // Use playerIdToUse instead of reassigning const player_id
    let playerId = playerIdToUse;
    
    console.log('🔵 Registration: player_id from body:', req.body.player_id);
    console.log('🔵 Registration: playerIdToUse after processing:', playerIdToUse);
    console.log('🔵 Registration: playerId variable:', playerId);
    console.log('🔵 Registration: registration_type:', registration_type);
    console.log('🔵 Registration: user_type:', req.user.user_type);
    
    // Ensure playerId is set for Individual registrations
    if (registration_type === 'Individual' && !playerId && req.user.user_type === 'Player') {
      // Fallback: try to get player profile again if playerId is still not set
      const Player = require('../models/Player');
      const playerProfile = await Player.findOne({ user_id: req.user._id });
      if (playerProfile && playerProfile._id) {
        playerId = playerProfile._id;
        playerIdToUse = playerProfile._id;
        console.log('🔵 Registration: Fallback - Set playerId to:', playerId);
      } else {
        console.error('🔵 Registration: ERROR - Could not find player profile for user:', req.user._id);
        return res.status(500).json({
          success: false,
          message: 'Player profile not found. Please contact support.'
        });
      }
    }
    
    // Final validation for Individual registrations
    if (registration_type === 'Individual' && !playerId) {
      console.error('🔵 Registration: ERROR - playerId is still null/undefined for Individual registration');
      return res.status(400).json({
        success: false,
        message: 'Player ID is required for individual event registration.'
      });
    }
    
    // Verify player exists (if playerId is set)
    if (registration_type === 'Individual' && playerId) {
      const Player = require('../models/Player');
      const player = await Player.findById(playerId);
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }
    }

    // Handle Judge and Coach registrations
    if (registration_type === 'Judge') {
      const Judge = require('../models/Judge');
      let judge = await Judge.findOne({ user_id: req.user._id });
      
      // Auto-create judge profile if it doesn't exist (similar to coach auto-creation)
      if (!judge) {
        try {
          judge = await Judge.create({
            user_id: req.user._id,
            certification_level: 'National', // Default to 'National' (must be a valid enum value)
            experience_years: 0,
            specialization: [], // Default empty array
            is_certified: false,
            is_available: true
          });
          console.log('Auto-created judge profile for registration:', judge._id);
        } catch (createError) {
          console.error('Error auto-creating judge profile:', createError);
          console.error('Create error details:', {
            name: createError.name,
            message: createError.message,
            errors: createError.errors
          });
          return res.status(500).json({
            success: false,
            message: 'Failed to create judge profile. Please contact support.',
            error: process.env.NODE_ENV === 'development' ? createError.message : undefined
          });
        }
      }

      // Validate judge._id exists
      if (!judge || !judge._id) {
        console.error('Judge profile or judge._id is missing:', { judge });
        return res.status(500).json({
          success: false,
          message: 'Judge profile is invalid. Please contact support.'
        });
      }
      
      const finalJudgeId = judge._id;
      console.log('🔵 Judge registration: Using judge_id from profile:', finalJudgeId.toString());

      // Check if already registered for this tournament
      const tournamentIdStr = String(tournament_id);
      const judgeIdStr = String(finalJudgeId);
      
      console.log('🔵 Checking for existing judge registration:', {
        tournament_id: tournamentIdStr,
        judge_id: judgeIdStr,
        registration_type: 'Judge',
        judge_profile_id: finalJudgeId.toString()
      });
      
      const existingRegistration = await Registration.findOne({
        tournament_id: tournament_id,
        registration_type: 'Judge',
        judge_id: finalJudgeId
      });

      if (existingRegistration) {
        // Double-check: verify the judge_id actually matches
        const regJudgeId = existingRegistration.judge_id?.toString();
        if (regJudgeId === judgeIdStr) {
          console.log('⚠️ Judge already registered for tournament:', {
            tournament_id: tournamentIdStr,
            judge_id: judgeIdStr,
            existing_registration_id: existingRegistration._id.toString(),
            existing_judge_id: regJudgeId
          });
          return res.status(400).json({
            success: false,
            message: 'Already registered for this tournament as a judge',
            errors: [{
              field: 'judge_id',
              message: `You are already registered for this tournament. Registration ID: ${existingRegistration._id}`
            }]
          });
        } else {
          // False positive - registration exists but judge_id doesn't match
          console.log('⚠️ Found registration but judge_id mismatch - treating as new registration:', {
            tournament_id: tournamentIdStr,
            expected_judge_id: judgeIdStr,
            found_judge_id: regJudgeId
          });
        }
      }
      
      console.log('✅ No existing registration found, proceeding with judge registration');

      let registration;
      try {
        console.log('Creating judge registration with:', {
          tournament_id: String(tournament_id),
          category_id: null,
          judge_id: String(finalJudgeId),
          registration_type: 'Judge',
          approval_status: 'Approved',
          payment_status: 'Paid'
        });

        // Create registration - explicitly exclude player_id, team_id, coach_id, category_id
        // For sparse indexes to work correctly, we must use undefined (not null) for fields we don't want indexed
        const judgeRegistrationData = {
          tournament_id,
          judge_id: finalJudgeId,
          registration_type: 'Judge',
          approval_status: 'Approved', // Auto-approve judge registrations
          payment_status: 'Paid' // No payment required for judges
        };
        // Explicitly set fields to undefined to avoid null values in sparse indexes
        // This ensures sparse indexes ignore these fields for Judge registrations
        judgeRegistrationData.category_id = undefined; // Judges register for tournament, not specific events
        judgeRegistrationData.player_id = undefined;
        judgeRegistrationData.team_id = undefined;
        judgeRegistrationData.coach_id = undefined;
        
        registration = await Registration.create(judgeRegistrationData);
        
        console.log('✅ Judge registration created successfully:', registration._id);
      } catch (createError) {
        console.error('Judge registration creation error:', createError);
        console.error('Error name:', createError.name);
        console.error('Error code:', createError.code);
        console.error('Error message:', createError.message);
        console.error('Error errors:', createError.errors);
        console.error('Error keyPattern:', createError.keyPattern);
        console.error('Error keyValue:', createError.keyValue);
        
        // Handle duplicate key error (unique index violation)
        if (createError.code === 11000 || createError.code === 11001) {
          // Check the error message to see which index caused the conflict
          const errorMessage = createError.message || '';
          const isJudgeDuplicate = errorMessage.includes('tournament_id_1_judge_id_1') || 
                                   errorMessage.includes('judge_id');
          
          if (isJudgeDuplicate) {
            // Try to find the existing registration
            let duplicateCheck = await Registration.findOne({
              tournament_id: tournament_id,
              registration_type: 'Judge',
              judge_id: finalJudgeId
            });
            
            // If not found, try with string comparison as fallback
            if (!duplicateCheck) {
              const allJudgeRegs = await Registration.find({
                tournament_id: tournament_id,
                registration_type: 'Judge'
              });
              const judgeIdStr = String(finalJudgeId);
              duplicateCheck = allJudgeRegs.find(reg => {
                const regJudgeId = reg.judge_id?._id?.toString() || reg.judge_id?.toString();
                return regJudgeId === judgeIdStr;
              });
            }
            
            if (duplicateCheck) {
              console.log('⚠️ Duplicate judge registration detected:', {
                tournament_id: String(tournament_id),
                judge_id: String(finalJudgeId),
                existing_registration_id: duplicateCheck._id.toString()
              });
              return res.status(400).json({
                success: false,
                message: 'Already registered for this tournament as a judge',
                errors: [{ field: 'judge_id', message: 'You are already registered for this tournament' }]
              });
            } else {
              // Duplicate key error but couldn't find the registration - might be a race condition
              console.warn('⚠️ Duplicate key error but registration not found (possible race condition):', {
                tournament_id: String(tournament_id),
                judge_id: String(finalJudgeId),
                error: errorMessage
              });
              return res.status(400).json({
                success: false,
                message: 'Already registered for this tournament as a judge. Please refresh the page to see your registration.',
                errors: [{ field: 'judge_id', message: 'Duplicate registration detected' }]
              });
            }
          } else {
            // Other duplicate key error (not judge-related)
            console.error('Unique index violation (not judge):', {
              tournament_id,
              judge_id: finalJudgeId,
              error: errorMessage
            });
            return res.status(500).json({
              success: false,
              message: 'Registration failed due to database constraint. Please try again or contact support.',
              error: process.env.NODE_ENV === 'development' ? createError.message : undefined
            });
          }
        }
        
        if (createError.name === 'ValidationError') {
          const validationErrors = Object.values(createError.errors || {}).map(err => ({
            field: err.path,
            message: err.message
          }));
          return res.status(400).json({
            success: false,
            message: 'Validation failed: ' + validationErrors.map(e => `${e.field}: ${e.message}`).join(', '),
            errors: validationErrors
          });
        }
        
        // Re-throw other errors to be handled by outer catch
        throw createError;
      }

      res.status(201).json({
        success: true,
        message: 'Judge registration successful (FREE - No payment required)',
        data: registration
      });
      return;
    }

    if (registration_type === 'Coach') {
      const Coach = require('../models/Coach');
      let coach = await Coach.findOne({ user_id: req.user._id });
      
      // Auto-create coach profile if it doesn't exist (similar to player auto-creation)
      if (!coach) {
        try {
          coach = await Coach.create({
            user_id: req.user._id,
            certification_level: 'Beginner', // Must be a valid enum value
            experience_years: 0
          });
          console.log('Auto-created coach profile for registration:', coach._id);
        } catch (createError) {
          console.error('Error auto-creating coach profile:', createError);
          console.error('Create error details:', {
            name: createError.name,
            message: createError.message,
            errors: createError.errors
          });
          return res.status(500).json({
            success: false,
            message: 'Failed to create coach profile. Please contact support.',
            error: process.env.NODE_ENV === 'development' ? createError.message : undefined
          });
        }
      }

      // Validate coach._id exists
      if (!coach || !coach._id) {
        console.error('Coach profile or coach._id is missing:', { coach });
        return res.status(500).json({
          success: false,
          message: 'Coach profile is invalid. Please contact support.'
        });
      }
      
      // Always use the coach profile found by user_id, ignore any coach_id from request body
      // This ensures we use the correct coach profile associated with the authenticated user
      const finalCoachId = coach._id;
      console.log('🔵 Coach registration: Using coach_id from profile:', finalCoachId.toString());

      // Check if already registered for this tournament
      // Use coach_id as the primary check (most reliable)
      const tournamentIdStr = String(tournament_id);
      const coachIdStr = String(finalCoachId);
      
      console.log('🔵 Checking for existing coach registration:', {
        tournament_id: tournamentIdStr,
        coach_id: coachIdStr,
        registration_type: 'Coach',
        coach_profile_id: finalCoachId.toString()
      });
      
      // Primary check: Find registration by exact coach_id match
      // Use ObjectId for proper matching - try multiple query formats for robustness
      let existingRegistration = await Registration.findOne({
        tournament_id: tournament_id,
        registration_type: 'Coach',
        coach_id: finalCoachId
      });
      
      // If not found, try with string comparison as fallback
      if (!existingRegistration) {
        const allCoachRegs = await Registration.find({
          tournament_id: tournament_id,
          registration_type: 'Coach'
        });
        existingRegistration = allCoachRegs.find(reg => {
          const regCoachId = reg.coach_id?._id?.toString() || reg.coach_id?.toString();
          return regCoachId === coachIdStr;
        });
      }

      if (existingRegistration) {
        // Double-check: verify the coach_id actually matches (handle edge cases)
        const regCoachId = existingRegistration.coach_id?._id?.toString() || existingRegistration.coach_id?.toString();
        if (regCoachId === coachIdStr) {
          console.log('⚠️ Coach already registered for tournament:', {
            tournament_id: tournamentIdStr,
            coach_id: coachIdStr,
            existing_registration_id: existingRegistration._id.toString(),
            existing_coach_id: regCoachId
          });
          return res.status(400).json({
            success: false,
            message: 'Already registered for this tournament as a coach',
            errors: [{
              field: 'coach_id',
              message: `You are already registered for this tournament. Registration ID: ${existingRegistration._id}`
            }]
          });
        } else {
          // False positive - registration exists but coach_id doesn't match
          console.log('⚠️ Found registration but coach_id mismatch - treating as new registration:', {
            tournament_id: tournamentIdStr,
            expected_coach_id: coachIdStr,
            found_coach_id: regCoachId
          });
        }
      }
      
      console.log('✅ No existing registration found, proceeding with registration');

      let registration;
      try {
        console.log('Creating coach registration with:', {
          tournament_id: String(tournament_id),
          category_id: null,
          coach_id: String(finalCoachId),
          registration_type: 'Coach',
          approval_status: 'Approved',
          payment_status: 'Paid'
        });
        
        // Create registration - use undefined for fields not needed to avoid sparse index conflicts
        const coachRegistrationData = {
          tournament_id: tournament_id,
          coach_id: finalCoachId, // Always use the coach profile found by user_id
          registration_type: 'Coach',
          approval_status: 'Approved', // Auto-approve coach registrations
          payment_status: 'Paid' // No payment required for coaches
        };
        // Explicitly set fields to undefined to avoid null values in sparse indexes
        coachRegistrationData.category_id = undefined; // Coaches register for tournament, not specific events
        coachRegistrationData.player_id = undefined;
        coachRegistrationData.team_id = undefined;
        coachRegistrationData.judge_id = undefined;
        
        registration = await Registration.create(coachRegistrationData);
        
        console.log('Coach registration created successfully:', registration._id);
      } catch (createError) {
        console.error('Registration creation error:', createError);
        console.error('Error name:', createError.name);
        console.error('Error code:', createError.code);
        console.error('Error message:', createError.message);
        console.error('Error errors:', createError.errors);
        
        // Handle duplicate key error (unique index violation)
        if (createError.code === 11000 || createError.code === 11001) {
          // Check the error message to see which index caused the conflict
          const errorMessage = createError.message || '';
          const isCoachDuplicate = errorMessage.includes('tournament_id_1_coach_id_1') || 
                                   errorMessage.includes('coach_id');
          
          if (isCoachDuplicate) {
            // Try to find the existing registration
            const duplicateCheck = await Registration.findOne({
              tournament_id: tournament_id,
              registration_type: 'Coach',
              coach_id: finalCoachId
            });
            
            if (duplicateCheck) {
              console.log('⚠️ Duplicate coach registration detected:', {
                tournament_id: String(tournament_id),
                coach_id: String(finalCoachId),
                existing_registration_id: duplicateCheck._id.toString()
              });
              return res.status(400).json({
                success: false,
                message: 'Already registered for this tournament as a coach',
                errors: [{ field: 'coach_id', message: 'You are already registered for this tournament' }]
              });
            } else {
              // Duplicate key error but couldn't find the registration - might be a race condition
              // Still return a user-friendly message
              console.warn('⚠️ Duplicate key error but registration not found (possible race condition):', {
                tournament_id: String(tournament_id),
                coach_id: String(finalCoachId),
                error: errorMessage
              });
              return res.status(400).json({
                success: false,
                message: 'Already registered for this tournament as a coach. Please refresh the page to see your registration.',
                errors: [{ field: 'coach_id', message: 'Duplicate registration detected' }]
              });
            }
          } else {
            // Other duplicate key error (not coach-related)
            console.error('Unique index violation (not coach):', {
              tournament_id,
              coach_id: finalCoachId,
              error: errorMessage
            });
            return res.status(500).json({
              success: false,
              message: 'Registration failed due to database constraint. Please try again or contact support.',
              error: process.env.NODE_ENV === 'development' ? createError.message : undefined
            });
          }
        }
        
        if (createError.name === 'ValidationError') {
          const validationErrors = Object.values(createError.errors || {}).map(err => ({
            field: err.path,
            message: err.message
          }));
          console.error('Validation errors:', validationErrors);
          return res.status(400).json({
            success: false,
            message: 'Validation failed: ' + validationErrors.map(e => `${e.field}: ${e.message}`).join(', '),
            errors: validationErrors
          });
        }
        throw createError;
      }

      res.status(201).json({
        success: true,
        message: 'Coach registration successful (FREE - No payment required)',
        data: registration
      });
      return;
    }

    // For Individual and Team registrations - improved duplicate check
    // Allow re-registration if payment is Pending or Failed
    if (registration_type === 'Individual' && playerId) {
      console.log('🔵 Checking for duplicate Individual registration:', {
        tournament_id,
        category_id,
        player_id: playerId,
        registration_type: 'Individual'
      });
      
      const existingRegistration = await Registration.findOne({
        tournament_id,
        category_id,
        player_id: playerId,
        registration_type: 'Individual'
      });
      
      console.log('🔵 Existing registration found:', existingRegistration ? existingRegistration._id : 'None');

      if (existingRegistration) {
        // Only block if payment is already Paid
        if (existingRegistration.payment_status === 'Paid') {
          return res.status(400).json({
            success: false,
            message: 'Player is already registered and paid for this event',
            errors: [{
              field: 'player_id',
              message: 'This player is already registered and paid for this tournament event'
            }]
          });
        }
        
        // If payment is Pending or Failed, return the existing registration so coach can proceed with payment
        // Don't create a new registration, just return the existing one
        if (existingRegistration.payment_status === 'Pending' || existingRegistration.payment_status === 'Failed') {
          return res.status(200).json({
            success: true,
            message: 'Registration exists with pending payment. Please complete payment.',
            data: existingRegistration,
            requiresPayment: true
          });
        }
      }
    }
    
    if (registration_type === 'Team' && team_id) {
      const existingRegistration = await Registration.findOne({
        tournament_id,
        category_id,
        team_id: team_id,
        registration_type: 'Team'
      });

      if (existingRegistration) {
        // Only block if payment is already Paid
        if (existingRegistration.payment_status === 'Paid') {
          return res.status(400).json({
            success: false,
            message: 'Team is already registered and paid for this event',
            errors: [{
              field: 'team_id',
              message: 'This team is already registered and paid for this tournament event'
            }]
          });
        }
        
        // If payment is Pending or Failed, return the existing registration
        if (existingRegistration.payment_status === 'Pending' || existingRegistration.payment_status === 'Failed') {
          return res.status(200).json({
            success: true,
            message: 'Registration exists with pending payment. Please complete payment.',
            data: existingRegistration,
            requiresPayment: true
          });
        }
      }
    }

    // Determine coach_id for the registration
    let registrationCoachId = req.body.coach_id || null;
    
    // If player is registering themselves, use their coach_id from their profile
    if (req.user.user_type === 'Player' && registration_type === 'Individual' && playerId) {
      const playerProfile = await Player.findById(playerId);
      if (playerProfile && playerProfile.coach_id) {
        registrationCoachId = playerProfile.coach_id._id || playerProfile.coach_id;
      }
    }
    // If coach is registering a player, use the coach's profile ID
    else if (req.user.user_type === 'Coach' && registration_type === 'Individual' && playerId) {
      const Coach = require('../models/Coach');
      const coachProfile = await Coach.findOne({ user_id: req.user._id });
      if (coachProfile) {
        registrationCoachId = coachProfile._id;
      }
    }

    let registration;
    try {
      // Ensure playerId is set for Individual registrations
      // Use playerId (which comes from playerIdToUse) or fallback to player_id from body
      const finalPlayerId = registration_type === 'Individual' ? (playerId || playerIdToUse || player_id) : null;
      
      if (registration_type === 'Individual' && !finalPlayerId) {
        return res.status(400).json({
          success: false,
          message: 'Player ID is required for individual event registration.'
        });
      }
      
      // Build registration object - only include fields that are relevant
      const registrationData = {
        tournament_id,
        category_id: category_id || null,
        registration_type,
        coach_id: registrationCoachId || null
      };
      
      // Only set player_id for Individual registrations
      if (registration_type === 'Individual' && finalPlayerId) {
        registrationData.player_id = finalPlayerId;
      }
      
      // Only set team_id for Team registrations
      if (registration_type === 'Team' && team_id) {
        registrationData.team_id = team_id;
      }
      
      // Only set judge_id for Judge registrations
      if (registration_type === 'Judge' && req.user.user_type === 'Judge') {
        const Judge = require('../models/Judge');
        const judge = await Judge.findOne({ user_id: req.user._id });
        if (judge) {
          registrationData.judge_id = judge._id;
        }
      }
      
      registration = await Registration.create(registrationData);
    } catch (createError) {
      console.error('Registration creation error:', createError);
      console.error('Error details:', {
        code: createError.code,
        keyPattern: createError.keyPattern,
        keyValue: createError.keyValue,
        message: createError.message
      });
      
      // Handle duplicate key error (unique index violation)
      if (createError.code === 11000 || createError.code === 11001) {
        const keyPattern = createError.keyPattern || {};
        const keyValue = createError.keyValue || {};
        
        // Check which index caused the conflict
        if (keyPattern.tournament_id && keyPattern.category_id && keyPattern.player_id) {
          // Individual registration duplicate
          const existingRegistration = await Registration.findOne({
            tournament_id,
            category_id,
            player_id: playerId,
            registration_type: 'Individual'
          });
          
          if (existingRegistration) {
            if (existingRegistration.payment_status === 'Paid') {
              return res.status(400).json({
                success: false,
                message: 'You are already registered and paid for this event',
                errors: [{
                  field: 'player_id',
                  message: 'This player is already registered and paid for this tournament event'
                }]
              });
            } else {
              // Return existing registration for payment completion
              return res.status(200).json({
                success: true,
                message: 'Registration exists with pending payment. Please complete payment.',
                data: existingRegistration,
                requiresPayment: true
              });
            }
          }
        } else if (keyPattern.tournament_id && keyPattern.coach_id) {
          // Coach registration duplicate
          const existingRegistration = await Registration.findOne({
            tournament_id,
            coach_id: registrationCoachId,
            registration_type: 'Coach'
          });
          
          if (existingRegistration) {
            return res.status(400).json({
              success: false,
              message: 'You are already registered for this tournament as a coach',
              errors: [{
                field: 'coach_id',
                message: 'Duplicate coach registration'
              }]
            });
          }
        } else if (keyPattern.tournament_id && keyPattern.judge_id) {
          // Judge registration duplicate
          return res.status(400).json({
            success: false,
            message: 'You are already registered for this tournament as a judge',
            errors: [{
              field: 'judge_id',
              message: 'Duplicate judge registration'
            }]
          });
        } else if (keyPattern.tournament_id && keyPattern.category_id && keyPattern.team_id) {
          // Team registration duplicate
          const existingRegistration = await Registration.findOne({
            tournament_id,
            category_id,
            team_id: team_id,
            registration_type: 'Team'
          });
          
          if (existingRegistration) {
            if (existingRegistration.payment_status === 'Paid') {
              return res.status(400).json({
                success: false,
                message: 'Team is already registered and paid for this event',
                errors: [{
                  field: 'team_id',
                  message: 'This team is already registered and paid for this tournament event'
                }]
              });
            } else {
              return res.status(200).json({
                success: true,
                message: 'Registration exists with pending payment. Please complete payment.',
                data: existingRegistration,
                requiresPayment: true
              });
            }
          }
        }
        
        // Generic duplicate error
        return res.status(400).json({
          success: false,
          message: 'Duplicate registration detected. A registration with these details already exists.',
          errors: [{
            field: Object.keys(keyPattern)[0] || 'registration',
            message: 'A registration with these details already exists'
          }]
        });
      }
      
      // Re-throw if not a duplicate error
      throw createError;
    }

    // Send confirmation email (if function is available)
    if (playerId && registration_type === 'Individual') {
      try {
        const user = await Player.findById(playerId).populate('user_id');
        if (user && user.user_id && user.user_id.email && typeof sendRegistrationConfirmation === 'function') {
          await sendRegistrationConfirmation(user.user_id.email, tournament.tournament_name);
        }
      } catch (emailError) {
        // Don't fail registration if email fails
        console.error('Error sending registration confirmation email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: registration
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + validationErrors.map(e => `${e.field}: ${e.message}`).join(', '),
        errors: validationErrors
      });
    }
    next(error);
  }
};

// @desc    Update registration
// @route   PUT /api/registrations/:id
// @access  Private
const updateRegistration = async (req, res, next) => {
  try {
    let registration = await Registration.findById(req.params.id)
      .populate('tournament_id');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization
    // Get tournament ID (handle both populated and non-populated cases)
    const tournamentId = registration.tournament_id._id || registration.tournament_id;
    const tournament = await Tournament.findById(tournamentId)
      .populate({
        path: 'organizer_id',
        populate: {
          path: 'user_id',
          select: '_id'
        }
      });
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if user is Admin or the organizer of the tournament
    const isAdmin = req.user.user_type === 'Admin';
    const isOrganizer = tournament.organizer_id && 
                       tournament.organizer_id.user_id && 
                       tournament.organizer_id.user_id._id.toString() === req.user._id.toString();
    
    if (!isAdmin && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this registration'
      });
    }

    registration = await Registration.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Registration updated successfully',
      data: registration
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete registration
// @route   DELETE /api/registrations/:id
// @access  Private
const deleteRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate({
        path: 'player_id',
        populate: {
          path: 'user_id',
          select: '_id'
        }
      })
      .populate({
        path: 'coach_id',
        populate: {
          path: 'user_id',
          select: '_id'
        }
      })
      .populate({
        path: 'judge_id',
        populate: {
          path: 'user_id',
          select: '_id'
        }
      })
      .populate('tournament_id');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check authorization: 
    // - Player can cancel their own registration
    // - Coach can cancel their own coach registration
    // - Judge can cancel their own judge registration
    // - Admin can cancel any
    // - Organizer can cancel registrations for their tournaments
    
    // Helper to safely get user_id from populated or non-populated references
    const getUserIdFromRef = async (ref, refType) => {
      if (!ref) return null;
      
      // If populated, ref.user_id should exist
      if (ref.user_id) {
        return ref.user_id._id ? ref.user_id._id.toString() : ref.user_id.toString();
      }
      
      // If not populated but ref is an ObjectId, fetch it
      if (ref.toString && ref.toString().match(/^[0-9a-fA-F]{24}$/)) {
        try {
          let populatedRef = null;
          if (refType === 'coach') {
            const Coach = require('../models/Coach');
            populatedRef = await Coach.findById(ref).populate('user_id', '_id');
          } else if (refType === 'judge') {
            const Judge = require('../models/Judge');
            populatedRef = await Judge.findById(ref).populate('user_id', '_id');
          } else if (refType === 'player') {
            const Player = require('../models/Player');
            populatedRef = await Player.findById(ref).populate('user_id', '_id');
          }
          
          if (populatedRef && populatedRef.user_id) {
            return populatedRef.user_id._id ? populatedRef.user_id._id.toString() : populatedRef.user_id.toString();
          }
        } catch (error) {
          console.error(`Error fetching ${refType} for authorization:`, error);
        }
      }
      
      return null;
    };
    
    const playerUserId = await getUserIdFromRef(registration.player_id, 'player');
    const coachUserId = await getUserIdFromRef(registration.coach_id, 'coach');
    const judgeUserId = await getUserIdFromRef(registration.judge_id, 'judge');
    
    const isPlayer = playerUserId === req.user._id.toString();
    const isCoach = registration.registration_type === 'Coach' && 
                    coachUserId === req.user._id.toString();
    const isJudge = registration.registration_type === 'Judge' && 
                    judgeUserId === req.user._id.toString();
    const isAdmin = req.user.user_type === 'Admin';
    const isOrganizer = req.user.user_type === 'Organizer' && 
      registration.tournament_id?.organizer_id?.toString() === req.user._id.toString();
    
    // Debug logging
    console.log('🔵 deleteRegistration - Authorization check:', {
      registrationId: registration._id,
      registrationType: registration.registration_type,
      reqUserId: req.user._id.toString(),
      reqUserType: req.user.user_type,
      playerUserId,
      coachUserId,
      judgeUserId,
      isPlayer,
      isCoach,
      isJudge,
      isAdmin,
      isOrganizer,
      coachId: registration.coach_id?._id?.toString() || registration.coach_id?.toString(),
      coachPopulated: !!registration.coach_id?.user_id
    });

    if (!isPlayer && !isCoach && !isJudge && !isAdmin && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this registration'
      });
    }

    // Check if payment has been made - if paid, may need refund process
    if (registration.payment_status === 'Paid') {
      // In production, you might want to add a refund process here
      // For now, allow cancellation but note that refunds may apply
    }

    await registration.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRegistrations,
  getRegistration,
  createRegistration,
  updateRegistration,
  deleteRegistration
};

