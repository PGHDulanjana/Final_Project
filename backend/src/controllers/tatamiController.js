const Tatami = require('../models/Tatami');
const TournamentCategory = require('../models/TournamentCategory');
const Tournament = require('../models/Tournament');
const Judge = require('../models/Judge');
const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');
const Registration = require('../models/Registration');

// @desc    Get all tatamis for a tournament
// @route   GET /api/tatamis
// @access  Private
const getTatamis = async (req, res, next) => {
  try {
    const { tournament_id, category_id } = req.query;
    const query = {};

    if (tournament_id) query.tournament_id = tournament_id;
    if (category_id) query.category_id = category_id;

    const tatamis = await Tatami.find(query)
      .populate('tournament_id', 'tournament_name start_date end_date')
      .populate('category_id', 'category_name category_type participation_type')
      .populate('assigned_judges.judge_id', 'user_id certification_level')
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .populate('table_worker_access.user_id', 'first_name last_name username email user_type')
      .sort({ tatami_number: 1 });

    res.status(200).json({
      success: true,
      count: tatamis.length,
      data: tatamis
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single tatami
// @route   GET /api/tatamis/:id
// @access  Private
const getTatami = async (req, res, next) => {
  try {
    const tatami = await Tatami.findById(req.params.id)
      .populate('tournament_id')
      .populate('category_id')
      .populate('assigned_judges.judge_id')
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .populate('table_worker_access.user_id', 'first_name last_name username email user_type');

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Get matches for this category
    const matches = await Match.find({ category_id: tatami.category_id })
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name')
      .sort({ scheduled_time: 1 });

    // Get participants for all matches
    const matchIds = matches.map(m => m._id);
    const allParticipants = await MatchParticipant.find({ match_id: { $in: matchIds } })
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
        select: 'team_name dojo_id',
        populate: {
          path: 'dojo_id',
          select: 'dojo_name'
        }
      });

    // Group participants by match_id
    const participantsByMatch = {};
    allParticipants.forEach(participant => {
      const matchId = participant.match_id.toString();
      if (!participantsByMatch[matchId]) {
        participantsByMatch[matchId] = [];
      }
      participantsByMatch[matchId].push(participant);
    });

    // Attach participants to matches
    const matchesWithParticipants = matches.map(match => {
      const matchObj = match.toObject();
      matchObj.participants = participantsByMatch[match._id.toString()] || [];
      return matchObj;
    });

    // Get registered players for this category
    const registrations = await Registration.find({
      tournament_id: tatami.tournament_id,
      category_id: tatami.category_id,
      approval_status: 'Approved',
      registration_type: { $in: ['Individual', 'Team'] }
    })
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
        select: 'team_name dojo_id',
        populate: {
          path: 'dojo_id',
          select: 'dojo_name'
        }
      });

    res.status(200).json({
      success: true,
      data: {
        ...tatami.toObject(),
        matches: matchesWithParticipants,
        registeredPlayers: registrations
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create tatami (assign event to tatami)
// @route   POST /api/tatamis
// @access  Private/Organizer
const createTatami = async (req, res, next) => {
  try {
    const { tournament_id, category_id, tatami_number, tatami_name, location, assigned_judges } = req.body;

    if (!tournament_id || !category_id || !tatami_number) {
      return res.status(400).json({
        success: false,
        message: 'Tournament ID, Category ID, and Tatami Number are required'
      });
    }

    // Verify tournament and category exist
    const tournament = await Tournament.findById(tournament_id);
    const category = await TournamentCategory.findById(category_id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check authorization - only organizer of the tournament can create tatamis
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tournament.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to create tatamis for this tournament'
        });
      }
    }

    // Check if tatami already exists for this category
    const existingTatami = await Tatami.findOne({ tournament_id, category_id });
    if (existingTatami) {
      return res.status(400).json({
        success: false,
        message: 'Tatami already exists for this event'
      });
    }

    // Validate assigned judges
    if (assigned_judges && Array.isArray(assigned_judges)) {
      for (const judgeAssignment of assigned_judges) {
        const judge = await Judge.findById(judgeAssignment.judge_id);
        if (!judge) {
          return res.status(400).json({
            success: false,
            message: `Judge with ID ${judgeAssignment.judge_id} not found`
          });
        }
      }
    }

    const tatami = await Tatami.create({
      tournament_id,
      category_id,
      tatami_number,
      tatami_name: tatami_name || `Tatami ${tatami_number}`,
      location: location || `Area ${tatami_number}`,
      assigned_judges: assigned_judges || [],
      status: 'Setup'
    });

    const populatedTatami = await Tatami.findById(tatami._id)
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name category_type')
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      });

    res.status(201).json({
      success: true,
      message: 'Tatami created successfully',
      data: populatedTatami
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Tatami already exists for this event'
      });
    }
    next(error);
  }
};

// @desc    Update tatami
// @route   PUT /api/tatamis/:id
// @access  Private/Organizer
const updateTatami = async (req, res, next) => {
  try {
    const tatami = await Tatami.findById(req.params.id)
      .populate('tournament_id');

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tatami.tournament_id.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this tatami'
        });
      }
    }

    // Update tatami
    const updatedTatami = await Tatami.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name category_type')
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      });

    res.status(200).json({
      success: true,
      message: 'Tatami updated successfully',
      data: updatedTatami
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign judges to tatami
// @route   POST /api/tatamis/:id/assign-judges
// @access  Private/Organizer
const assignJudges = async (req, res, next) => {
  try {
    const { judges } = req.body; // Array of { judge_id, judge_role }

    if (!judges || !Array.isArray(judges) || judges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Judges array is required'
      });
    }

    const tatami = await Tatami.findById(req.params.id)
      .populate('tournament_id');

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tatami.tournament_id.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to assign judges to this tatami'
        });
      }
    }

    // Validate judges
    for (const judgeAssignment of judges) {
      const judge = await Judge.findById(judgeAssignment.judge_id);
      if (!judge) {
        return res.status(400).json({
          success: false,
          message: `Judge with ID ${judgeAssignment.judge_id} not found`
        });
      }
    }

    // Update assigned judges
    tatami.assigned_judges = judges.map(j => ({
      judge_id: j.judge_id,
      judge_role: j.judge_role || 'Judge',
      is_confirmed: false,
      assigned_at: new Date()
    }));

    await tatami.save();

    const populatedTatami = await Tatami.findById(tatami._id)
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      });

    res.status(200).json({
      success: true,
      message: 'Judges assigned successfully',
      data: populatedTatami
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm judge assignment
// @route   POST /api/tatamis/:id/confirm-judge/:judgeId
// @access  Private/Judge
const confirmJudgeAssignment = async (req, res, next) => {
  try {
    const tatami = await Tatami.findById(req.params.id);

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Check if user is a judge
    if (req.user.user_type !== 'Judge') {
      return res.status(403).json({
        success: false,
        message: 'Only judges can confirm their assignment'
      });
    }

    // Find judge profile
    const Judge = require('../models/Judge');
    const judgeProfile = await Judge.findOne({ user_id: req.user._id });

    if (!judgeProfile) {
      return res.status(404).json({
        success: false,
        message: 'Judge profile not found'
      });
    }

    // Find judge assignment
    const judgeAssignment = tatami.assigned_judges.find(
      j => j.judge_id.toString() === judgeProfile._id.toString()
    );

    if (!judgeAssignment) {
      return res.status(404).json({
        success: false,
        message: 'You are not assigned to this tatami'
      });
    }

    // Confirm assignment
    judgeAssignment.is_confirmed = true;
    judgeAssignment.confirmed_at = new Date();
    await tatami.save();

    const populatedTatami = await Tatami.findById(tatami._id)
      .populate('tournament_id', 'tournament_name organizer_id')
      .populate('category_id', 'category_name category_type')
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .populate({
        path: 'tournament_id.organizer_id',
        populate: {
          path: 'user_id',
          select: '_id'
        }
      });

    // Send notification to organizer when judge confirms
    const { createAndSendNotification } = require('../services/notificationService');
    const tournament = populatedTatami.tournament_id;
    const category = populatedTatami.category_id;
    const judgeUser = judgeProfile.user_id;
    
    if (tournament?.organizer_id?.user_id) {
      const organizerUserId = tournament.organizer_id.user_id._id || tournament.organizer_id.user_id;
      const judgeName = judgeUser?.first_name && judgeUser?.last_name
        ? `${judgeUser.first_name} ${judgeUser.last_name}`
        : judgeUser?.username || 'Judge';
      const eventName = category?.category_name || 'Event';
      const tournamentName = tournament?.tournament_name || 'Tournament';
      
      await createAndSendNotification(
        organizerUserId.toString(),
        'Judge Assignment Confirmed',
        `${judgeName} has confirmed their assignment to judge "${eventName}" in "${tournamentName}".`,
        'System'
      );
    }

    res.status(200).json({
      success: true,
      message: 'Judge assignment confirmed',
      data: populatedTatami
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grant table worker access
// @route   POST /api/tatamis/:id/grant-table-worker-access
// @access  Private/Organizer
const grantTableWorkerAccess = async (req, res, next) => {
  try {
    const { user_id, access_type } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tatami = await Tatami.findById(req.params.id)
      .populate('tournament_id');

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tatami.tournament_id.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to grant table worker access'
        });
      }
    }

    // Check if access already exists
    const existingAccess = tatami.table_worker_access.find(
      a => a.user_id.toString() === user_id.toString()
    );

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        message: 'Table worker access already granted to this user'
      });
    }

    // Add table worker access
    tatami.table_worker_access.push({
      user_id,
      access_type: access_type || 'Table Worker',
      granted_at: new Date(),
      granted_by: req.user._id
    });

    await tatami.save();

    const populatedTatami = await Tatami.findById(tatami._id)
      .populate('table_worker_access.user_id', 'first_name last_name username email user_type');

    res.status(200).json({
      success: true,
      message: 'Table worker access granted',
      data: populatedTatami
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit results
// @route   POST /api/tatamis/:id/submit-results
// @access  Private/Table Worker or Organizer
const submitResults = async (req, res, next) => {
  try {
    const tatami = await Tatami.findById(req.params.id)
      .populate('tournament_id');

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Check authorization - table worker or organizer
    let hasAccess = false;

    if (req.user.user_type === 'Admin' || req.user.user_type === 'Organizer') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tatami.tournament_id.organizer_id);
      if (organizer && organizer.user_id.toString() === req.user._id.toString()) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      // Check if user has table worker access
      const tableWorkerAccess = tatami.table_worker_access.find(
        a => a.user_id.toString() === req.user._id.toString()
      );
      if (tableWorkerAccess) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit results for this tatami'
      });
    }

    // Check if results already submitted
    if (tatami.results_submitted) {
      return res.status(400).json({
        success: false,
        message: 'Results have already been submitted for this tatami'
      });
    }

    // Get all matches for this category
    const matches = await Match.find({ category_id: tatami.category_id })
      .populate('winner_id');

    // Check if all matches are completed
    const incompleteMatches = matches.filter(m => m.status !== 'Completed');
    if (incompleteMatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot submit results: ${incompleteMatches.length} match(es) are not completed`
      });
    }

    // Submit results
    tatami.results_submitted = true;
    tatami.results_submitted_at = new Date();
    tatami.status = 'Completed';
    await tatami.save();

    res.status(200).json({
      success: true,
      message: 'Results submitted successfully. Organizer will review and approve.',
      data: tatami
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve results
// @route   POST /api/tatamis/:id/approve-results
// @access  Private/Organizer
const approveResults = async (req, res, next) => {
  try {
    const tatami = await Tatami.findById(req.params.id)
      .populate('tournament_id');

    if (!tatami) {
      return res.status(404).json({
        success: false,
        message: 'Tatami not found'
      });
    }

    // Check authorization
    if (req.user.user_type !== 'Admin') {
      const Organizer = require('../models/Organizer');
      const organizer = await Organizer.findById(tatami.tournament_id.organizer_id);
      if (!organizer || organizer.user_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to approve results for this tatami'
        });
      }
    }

    if (!tatami.results_submitted) {
      return res.status(400).json({
        success: false,
        message: 'Results have not been submitted yet'
      });
    }

    if (tatami.results_approved) {
      return res.status(400).json({
        success: false,
        message: 'Results have already been approved'
      });
    }

    // Approve results
    tatami.results_approved = true;
    tatami.results_approved_at = new Date();
    tatami.results_approved_by = req.user._id;
    await tatami.save();

    res.status(200).json({
      success: true,
      message: 'Results approved successfully',
      data: tatami
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get events assigned to a judge
// @route   GET /api/tatamis/judge/assigned-events
// @access  Private/Judge
const getAssignedEventsForJudge = async (req, res, next) => {
  try {
    // Check if user is a judge
    if (req.user.user_type !== 'Judge') {
      return res.status(403).json({
        success: false,
        message: 'Only judges can access their assigned events'
      });
    }

    // Find judge profile
    const judgeProfile = await Judge.findOne({ user_id: req.user._id });

    if (!judgeProfile) {
      return res.status(404).json({
        success: false,
        message: 'Judge profile not found'
      });
    }

    // Find all tatamis where this judge is assigned
    const tatamis = await Tatami.find({
      'assigned_judges.judge_id': judgeProfile._id
    })
      .populate('tournament_id', 'tournament_name start_date end_date venue status')
      .populate('category_id', 'category_name category_type participation_type individual_player_fee team_event_fee')
      .populate({
        path: 'assigned_judges.judge_id',
        populate: {
          path: 'user_id',
          select: 'first_name last_name username email'
        }
      })
      .sort({ 'tournament_id.start_date': -1, tatami_number: 1 });

    // Format the response to show events (categories) with their tournament and tatami info
    const assignedEvents = tatamis.map(tatami => {
      const judgeAssignment = tatami.assigned_judges.find(
        j => j.judge_id._id.toString() === judgeProfile._id.toString() ||
             j.judge_id.toString() === judgeProfile._id.toString()
      );

      return {
        _id: tatami._id,
        event: tatami.category_id, // This is the TournamentCategory (event)
        tournament: tatami.tournament_id,
        tatami_number: tatami.tatami_number,
        tatami_name: tatami.tatami_name,
        location: tatami.location,
        status: tatami.status,
        judge_role: judgeAssignment?.judge_role || 'Judge',
        is_confirmed: judgeAssignment?.is_confirmed || false,
        confirmed_at: judgeAssignment?.confirmed_at || null,
        assigned_at: judgeAssignment?.assigned_at || null
      };
    });

    res.status(200).json({
      success: true,
      count: assignedEvents.length,
      data: assignedEvents
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTatamis,
  getTatami,
  createTatami,
  updateTatami,
  assignJudges,
  confirmJudgeAssignment,
  grantTableWorkerAccess,
  submitResults,
  approveResults,
  getAssignedEventsForJudge
};

