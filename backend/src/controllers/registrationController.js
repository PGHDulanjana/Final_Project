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
    // Allow coaches to register players for Individual events (when player_id is provided)
    if (registration_type === 'Individual') {
      if (player_id) {
        // Coach is registering a player - verify coach has permission
        if (req.user.user_type === 'Coach') {
          const Player = require('../models/Player');
          const player = await Player.findById(player_id).populate('coach_id');
          
          if (!player) {
            return res.status(404).json({
              success: false,
              message: 'Player not found'
            });
          }
          
          // Verify coach has permission to register this player
          const Coach = require('../models/Coach');
          const coachProfile = await Coach.findOne({ user_id: req.user._id });
          
          if (coachProfile) {
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
          }
        } else if (req.user.user_type !== 'Player') {
          return res.status(403).json({
            success: false,
            message: 'Only players or coaches can register for individual events'
          });
        }
      } else if (req.user.user_type !== 'Player') {
        // No player_id provided and user is not a player - they must be registering themselves
        return res.status(403).json({
          success: false,
          message: 'Only players can register themselves individually for tournaments'
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

    // For individual registration, use current user's player profile
    let playerId = player_id;
    if (registration_type === 'Individual' && !playerId) {
      let player = await Player.findOne({ user_id: req.user._id });
      
      // Auto-create player profile if it doesn't exist
      if (!player) {
        // Calculate age category from user's date_of_birth if available
        let ageCategory = '22-34'; // Default age category
        if (req.user.date_of_birth) {
          const today = new Date();
          const birthDate = new Date(req.user.date_of_birth);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 10) ageCategory = 'Under 10';
          else if (age >= 10 && age <= 12) ageCategory = '10-12';
          else if (age >= 13 && age <= 15) ageCategory = '13-15';
          else if (age >= 16 && age <= 17) ageCategory = '16-17';
          else if (age >= 18 && age <= 21) ageCategory = '18-21';
          else if (age >= 22 && age <= 34) ageCategory = '22-34';
          else ageCategory = '35+';
        }
        
        // Create basic player profile with default values
        player = await Player.create({
          user_id: req.user._id,
          belt_rank: 'White', // Default belt rank
          age_category: ageCategory,
          emergency_contact: {
            name: req.user.first_name + ' ' + req.user.last_name,
            phone: req.user.phone || '0000000000',
            relationship: 'Self'
          }
        });
      }
      playerId = player._id;
    }

    // Handle Judge and Coach registrations
    if (registration_type === 'Judge') {
      const Judge = require('../models/Judge');
      let judge = await Judge.findOne({ user_id: req.user._id });
      
      if (!judge) {
        return res.status(404).json({
          success: false,
          message: 'Judge profile not found. Please complete your judge profile first.'
        });
      }

      // Check if already registered for this tournament
      const existingRegistration = await Registration.findOne({
        tournament_id,
        registration_type: 'Judge',
        judge_id: judge._id
      });

      if (existingRegistration) {
        return res.status(400).json({
          success: false,
          message: 'Already registered for this tournament as a judge'
        });
      }

      const registration = await Registration.create({
        tournament_id,
        category_id: null, // Judges register for tournament, not specific events
        judge_id: judge._id,
        registration_type: 'Judge',
        approval_status: 'Approved', // Auto-approve judge registrations
        payment_status: 'Paid' // No payment required for judges
      });

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
            error: createError.message
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

      // Check if already registered for this tournament
      // Use coach_id as the primary check (most reliable)
      const tournamentIdStr = tournament_id.toString();
      const coachIdStr = coach._id.toString();
      
      console.log('🔵 Checking for existing coach registration:', {
        tournament_id: tournamentIdStr,
        coach_id: coachIdStr,
        registration_type: 'Coach',
        coach_profile_id: coach._id.toString()
      });
      
      // Primary check: Find registration by exact coach_id match
      // Use direct query with coach_id (MongoDB will handle ObjectId conversion)
      const existingRegistration = await Registration.findOne({
        tournament_id: tournamentIdStr,
        registration_type: 'Coach',
        coach_id: coachIdStr
      });

      if (existingRegistration) {
        // Double-check: verify the coach_id actually matches (handle edge cases)
        const regCoachId = existingRegistration.coach_id?.toString();
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
          tournament_id,
          category_id: null,
          coach_id: coach._id,
          registration_type: 'Coach',
          approval_status: 'Approved',
          payment_status: 'Paid'
        });
        
        registration = await Registration.create({
          tournament_id,
          category_id: null, // Coaches register for tournament, not specific events
          coach_id: coach._id,
          registration_type: 'Coach',
          approval_status: 'Approved', // Auto-approve coach registrations
          payment_status: 'Paid' // No payment required for coaches
        });
        
        console.log('Coach registration created successfully:', registration._id);
      } catch (createError) {
        console.error('Registration creation error:', createError);
        console.error('Error name:', createError.name);
        console.error('Error code:', createError.code);
        console.error('Error message:', createError.message);
        console.error('Error errors:', createError.errors);
        
        // Handle duplicate key error (unique index violation)
        if (createError.code === 11000 || createError.code === 11001) {
          // Check if this is actually a duplicate for this coach
          const duplicateCheck = await Registration.findOne({
            tournament_id,
            registration_type: 'Coach',
            coach_id: coach._id
          });
          
          if (duplicateCheck) {
            return res.status(400).json({
              success: false,
              message: 'Already registered for this tournament as a coach',
              errors: [{ field: 'coach_id', message: 'Duplicate registration' }]
            });
          } else {
            // Unique index violation but not a duplicate for this coach - might be a data issue
            console.error('Unique index violation but no duplicate found:', {
              tournament_id,
              coach_id: coach._id,
              error: createError.message
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

    // For Individual and Team registrations (existing logic)
    // Check if already registered for this category
    const existingRegistration = await Registration.findOne({
      tournament_id,
      category_id,
      $or: [
        { player_id: playerId },
        { team_id: team_id }
      ]
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event'
      });
    }

    // Determine coach_id for the registration
    let registrationCoachId = req.body.coach_id || null;
    
    // If coach is registering a player, use the coach's profile ID
    if (req.user.user_type === 'Coach' && registration_type === 'Individual' && playerId) {
      const Coach = require('../models/Coach');
      const coachProfile = await Coach.findOne({ user_id: req.user._id });
      if (coachProfile) {
        registrationCoachId = coachProfile._id;
      }
    }

    let registration;
    try {
      registration = await Registration.create({
        tournament_id,
        category_id,
        player_id: registration_type === 'Individual' ? playerId : null,
        team_id: registration_type === 'Team' ? team_id : null,
        registration_type,
        coach_id: registrationCoachId
      });
    } catch (createError) {
      console.error('Registration creation error:', createError);
      
      // Handle duplicate key error (unique index violation)
      if (createError.code === 11000 || createError.code === 11001) {
        // Check what field caused the duplicate
        const duplicateField = Object.keys(createError.keyPattern || {})[0];
        
        if (duplicateField === 'player_id' || duplicateField === 'tournament_id') {
          // Check if player is already registered for this tournament/category
          const existingRegistration = await Registration.findOne({
            tournament_id,
            category_id,
            player_id: registration_type === 'Individual' ? playerId : null
          });
          
          if (existingRegistration) {
            return res.status(400).json({
              success: false,
              message: 'Player is already registered for this event',
              errors: [{
                field: 'player_id',
                message: 'This player is already registered for this tournament event'
              }]
            });
          }
        }
        
        return res.status(400).json({
          success: false,
          message: 'Duplicate registration detected',
          errors: [{
            field: duplicateField || 'registration',
            message: 'A registration with these details already exists'
          }]
        });
      }
      
      // Re-throw if not a duplicate error
      throw createError;
    }

    // Send confirmation email
    if (playerId && registration_type === 'Individual') {
      const user = await Player.findById(playerId).populate('user_id');
      if (user && user.user_id && user.user_id.email) {
        await sendRegistrationConfirmation(user.user_id.email, tournament.tournament_name);
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

