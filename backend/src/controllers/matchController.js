const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
const getMatches = async (req, res, next) => {
  try {
    const { tournament_id, category_id, status } = req.query;
    const query = {};

    if (tournament_id) query.tournament_id = tournament_id;
    if (category_id) query.category_id = category_id;
    if (status) query.status = status;

    const matches = await Match.find(query)
      .populate('tournament_id', 'tournament_name')
      .populate('category_id', 'category_name')
      .populate('winner_id', 'user_id')
      .sort({ scheduled_time: 1 });

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Public
const getMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('tournament_id')
      .populate('category_id')
      .populate('winner_id');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Get participants
    const participants = await MatchParticipant.find({ match_id: match._id })
      .populate('player_id')
      .populate('team_id');

    res.status(200).json({
      success: true,
      data: {
        ...match.toObject(),
        participants
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create match
// @route   POST /api/matches
// @access  Private/Organizer
const createMatch = async (req, res, next) => {
  try {
    const match = await Match.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Match created successfully',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update match
// @route   PUT /api/matches/:id
// @access  Private
const updateMatch = async (req, res, next) => {
  try {
    let match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // If status is being updated to Completed, set completed_at
    if (req.body.status === 'Completed' && match.status !== 'Completed') {
      req.body.completed_at = new Date();
    }

    match = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Match updated successfully',
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private
const deleteMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Delete participants
    await MatchParticipant.deleteMany({ match_id: match._id });

    await match.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMatches,
  getMatch,
  createMatch,
  updateMatch,
  deleteMatch
};

