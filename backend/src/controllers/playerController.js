const Player = require('../models/Player');
const User = require('../models/User');
const Coach = require('../models/Coach');

// @desc    Get all players
// @route   GET /api/players
// @access  Public
const getPlayers = async (req, res, next) => {
  try {
    const players = await Player.find()
      .populate('user_id', 'username email first_name last_name profile_picture')
      .populate('coach_id') // Populate fully to include _id for matching
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single player
// @route   GET /api/players/:id
// @access  Public
const getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id)
      .populate('user_id', 'username email first_name last_name phone profile_picture')
      .populate('coach_id');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create player profile
// @route   POST /api/players
// @access  Private
const createPlayer = async (req, res, next) => {
  try {
    // Check if user is Player type
    if (req.user.user_type !== 'Player') {
      return res.status(403).json({
        success: false,
        message: 'Only users with Player type can create player profile'
      });
    }

    // Check if player profile already exists
    const existingPlayer = await Player.findOne({ user_id: req.user._id });
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: 'Player profile already exists'
      });
    }

    const player = await Player.create({
      ...req.body,
      user_id: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Player profile created successfully',
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Private
const updatePlayer = async (req, res, next) => {
  try {
    let player = await Player.findById(req.params.id).populate('coach_id');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check authorization - allow player, admin, or coach
    const isPlayerOwner = player.user_id.toString() === req.user._id.toString();
    const isAdmin = req.user.user_type === 'Admin';
    
    // For coaches: check if player's coach_id matches coach's profile _id
    let isCoach = false;
    if (req.user.user_type === 'Coach') {
      const coachProfile = await Coach.findOne({ user_id: req.user._id });
      
      if (coachProfile) {
        const playerCoachId = player.coach_id?._id || player.coach_id;
        if (playerCoachId && playerCoachId.toString() === coachProfile._id.toString()) {
          isCoach = true;
        }
        // Also allow if player has matching coach_name (for players registered by name)
        if (!isCoach && player.coach_name) {
          const coachUser = await User.findById(req.user._id);
          if (coachUser) {
            const coachFirstName = (coachUser.first_name || '').toLowerCase().trim();
            const coachLastName = (coachUser.last_name || '').toLowerCase().trim();
            const coachUsername = (coachUser.username || '').toLowerCase().trim();
            const playerCoachName = (player.coach_name || '').toLowerCase().trim();
            
            const coachNameMatch = 
              (coachFirstName && playerCoachName.includes(coachFirstName)) ||
              (coachLastName && playerCoachName.includes(coachLastName)) ||
              (coachUsername && playerCoachName.includes(coachUsername)) ||
              (coachFirstName && coachLastName && playerCoachName.includes(`${coachFirstName} ${coachLastName}`));
            
            if (coachNameMatch) {
              isCoach = true;
            }
          }
        }
      }
    }
    
    if (!isPlayerOwner && !isAdmin && !isCoach) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this player'
      });
    }

    player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('user_id', 'username email first_name last_name profile_picture');

    res.status(200).json({
      success: true,
      message: 'Player updated successfully',
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private/Admin
const deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    await player.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer
};

