const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
const getTeams = async (req, res, next) => {
  try {
    const teams = await Team.find()
      .populate('dojo_id', 'dojo_name')
      .populate('coach_id', 'user_id')
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single team
// @route   GET /api/teams/:id
// @access  Public
const getTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('dojo_id')
      .populate('coach_id');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Get team members
    const members = await TeamMember.find({ team_id: team._id })
      .populate('player_id', 'user_id belt_rank');

    res.status(200).json({
      success: true,
      data: {
        ...team.toObject(),
        members
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create team
// @route   POST /api/teams
// @access  Private/Coach
const createTeam = async (req, res, next) => {
  try {
    const team = await Team.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
const updateTeam = async (req, res, next) => {
  try {
    let team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    team = await Team.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      data: team
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private
const deleteTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Delete all team members
    await TeamMember.deleteMany({ team_id: team._id });

    await team.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam
};

