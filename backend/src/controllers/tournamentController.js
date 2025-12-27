const Tournament = require('../models/Tournament');
const Organizer = require('../models/Organizer');
const User = require('../models/User');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
const getTournaments = async (req, res, next) => {
  try {
    const { status, organizer_id } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }
    if (organizer_id) {
      query.organizer_id = organizer_id;
    }

    // If user is an Organizer and no organizer_id is specified, filter by their organizer profile
    if (req.user && req.user.user_type === 'Organizer' && !organizer_id) {
      const organizer = await Organizer.findOne({ user_id: req.user._id });
      if (organizer) {
        query.organizer_id = organizer._id;
      }
    }

    const tournaments = await Tournament.find(query)
      .populate({
        path: 'organizer_id',
        select: 'organization_name user_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      })
      .sort({ start_date: -1 });

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
// @access  Public
const getTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate({
        path: 'organizer_id',
        select: 'organization_name user_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Private/Organizer
const createTournament = async (req, res, next) => {
  try {
    // Check if user is Organizer
    if (req.user.user_type !== 'Organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can create tournaments'
      });
    }

    // Find or create organizer profile
    let organizer = await Organizer.findOne({ user_id: req.user._id });
    if (!organizer) {
      // Get user details for better organization name
      const user = await User.findById(req.user._id);
      const orgName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}'s Organization`
        : `${user?.username || 'Organizer'}'s Organization`;
      
      // Generate unique license number
      let licenseNumber;
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        licenseNumber = `ORG-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const existing = await Organizer.findOne({ license_number: licenseNumber });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create organizer profile. Please try again.'
        });
      }

      // Auto-create organizer profile if it doesn't exist
      try {
        organizer = await Organizer.create({
          user_id: req.user._id,
          organization_name: orgName,
          license_number: licenseNumber,
          is_verified: false
        });
        console.log('Auto-created organizer profile:', organizer._id);
      } catch (error) {
        console.error('Error creating organizer profile:', error);
        // If creation fails (e.g., duplicate), try to find it again
        organizer = await Organizer.findOne({ user_id: req.user._id });
        if (!organizer) {
          console.error('Failed to create or find organizer profile for user:', req.user._id);
          return res.status(500).json({
            success: false,
            message: 'Failed to create organizer profile. Please contact support or ensure your organizer profile is set up.'
          });
        }
      }
    }

    // Ensure dates are properly formatted
    const tournamentData = {
      ...req.body,
      organizer_id: organizer._id,
      start_date: new Date(req.body.start_date),
      end_date: new Date(req.body.end_date),
      registration_deadline: new Date(req.body.registration_deadline)
    };

    // Remove undefined/null values for optional fields
    if (!tournamentData.description) delete tournamentData.description;
    if (!tournamentData.rules) delete tournamentData.rules;
    if (!tournamentData.max_participants) delete tournamentData.max_participants;
    if (!tournamentData.bank_account_holder_name) delete tournamentData.bank_account_holder_name;
    if (!tournamentData.bank_name) delete tournamentData.bank_name;
    if (!tournamentData.bank_account_number) delete tournamentData.bank_account_number;
    if (!tournamentData.bank_branch) delete tournamentData.bank_branch;
    if (!tournamentData.bank_swift_code) delete tournamentData.bank_swift_code;

    console.log('🔵 Creating tournament with data:', {
      tournament_name: tournamentData.tournament_name,
      organizer_id: tournamentData.organizer_id,
      start_date: tournamentData.start_date,
      end_date: tournamentData.end_date,
      registration_deadline: tournamentData.registration_deadline,
      status: tournamentData.status || 'Draft'
    });

    const tournament = await Tournament.create(tournamentData);

    console.log('✅ Tournament created successfully:', tournament._id);
    
    // Verify tournament was saved by querying it back
    const savedTournament = await Tournament.findById(tournament._id);
    if (!savedTournament) {
      console.error('❌ Tournament was not saved to database!');
      return res.status(500).json({
        success: false,
        message: 'Tournament creation failed. Please try again.'
      });
    }
    console.log('✅ Verified tournament saved to database:', savedTournament._id);

    // Populate organizer details before sending response
    const populatedTournament = await Tournament.findById(tournament._id)
      .populate({
        path: 'organizer_id',
        select: 'organization_name user_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username'
        }
      });

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: populatedTournament
    });
  } catch (error) {
    console.error('❌ Error creating tournament:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      code: error.code
    });
    next(error);
  }
};

// @desc    Update tournament
// @route   PUT /api/tournaments/:id
// @access  Private
const updateTournament = async (req, res, next) => {
  try {
    let tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check authorization
    const organizer = await Organizer.findById(tournament.organizer_id);
    if (organizer.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this tournament'
      });
    }

    tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('organizer_id');

    res.status(200).json({
      success: true,
      message: 'Tournament updated successfully',
      data: tournament
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
// @access  Private
const deleteTournament = async (req, res, next) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check authorization
    const organizer = await Organizer.findById(tournament.organizer_id);
    if (organizer.user_id.toString() !== req.user._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this tournament'
      });
    }

    await tournament.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament
};

