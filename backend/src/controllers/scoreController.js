const Score = require('../models/Score');
const Match = require('../models/Match');
const Judge = require('../models/Judge');
const { emitScoreUpdate } = require('../utils/socket');

// @desc    Get all scores
// @route   GET /api/scores
// @access  Public
const getScores = async (req, res, next) => {
  try {
    const { match_id, participant_id } = req.query;
    const query = {};

    if (match_id) query.match_id = match_id;
    if (participant_id) query.participant_id = participant_id;

    const scores = await Score.find(query)
      .populate('match_id', 'match_name')
      .populate('judge_id', 'user_id')
      .populate('participant_id')
      .sort({ scored_at: -1 });

    res.status(200).json({
      success: true,
      count: scores.length,
      data: scores
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single score
// @route   GET /api/scores/:id
// @access  Public
const getScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id)
      .populate('match_id')
      .populate('judge_id')
      .populate('participant_id');

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Score not found'
      });
    }

    res.status(200).json({
      success: true,
      data: score
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update score
// @route   POST /api/scores
// @access  Private/Judge
const createScore = async (req, res, next) => {
  try {
    // Check if user is Judge
    if (req.user.user_type !== 'Judge') {
      return res.status(403).json({
        success: false,
        message: 'Only judges can submit scores'
      });
    }

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user._id });
    if (!judge) {
      return res.status(404).json({
        success: false,
        message: 'Judge profile not found'
      });
    }

    const { match_id, participant_id, technical_score, performance_score } = req.body;

    // Calculate final score
    const final_score = (parseFloat(technical_score) + parseFloat(performance_score)) / 2;

    // Check if score already exists
    let score = await Score.findOne({
      match_id,
      participant_id,
      judge_id: judge._id
    });

    if (score) {
      // Update existing score
      score.technical_score = technical_score;
      score.performance_score = performance_score;
      score.final_score = final_score;
      score.comments = req.body.comments || score.comments;
      score.scored_at = new Date();
      await score.save();
    } else {
      // Create new score
      score = await Score.create({
        match_id,
        participant_id,
        judge_id: judge._id,
        technical_score,
        performance_score,
        final_score,
        comments: req.body.comments
      });
    }

    // Get match for socket emission
    const match = await Match.findById(match_id);

    // Emit real-time update
    emitScoreUpdate(match_id, {
      matchId: match_id,
      tournamentId: match.tournament_id,
      participantId: participant_id,
      score: score.toObject()
    });

    res.status(201).json({
      success: true,
      message: 'Score submitted successfully',
      data: score
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update score
// @route   PUT /api/scores/:id
// @access  Private/Judge
const updateScore = async (req, res, next) => {
  try {
    let score = await Score.findById(req.params.id);

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Score not found'
      });
    }

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user._id });
    
    // Check authorization
    if (judge && score.judge_id.toString() !== judge._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this score'
      });
    }

    // Recalculate final score if technical or performance score is updated
    if (req.body.technical_score || req.body.performance_score) {
      const technical = req.body.technical_score || score.technical_score;
      const performance = req.body.performance_score || score.performance_score;
      req.body.final_score = (parseFloat(technical) + parseFloat(performance)) / 2;
    }

    score = await Score.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Emit real-time update
    const match = await Match.findById(score.match_id);
    emitScoreUpdate(score.match_id, {
      matchId: score.match_id,
      tournamentId: match.tournament_id,
      participantId: score.participant_id,
      score: score.toObject()
    });

    res.status(200).json({
      success: true,
      message: 'Score updated successfully',
      data: score
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete score
// @route   DELETE /api/scores/:id
// @access  Private/Judge
const deleteScore = async (req, res, next) => {
  try {
    const score = await Score.findById(req.params.id);

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Score not found'
      });
    }

    // Get judge profile
    const judge = await Judge.findOne({ user_id: req.user._id });
    
    // Check authorization
    if (judge && score.judge_id.toString() !== judge._id.toString() && req.user.user_type !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this score'
      });
    }

    await score.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Score deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getScores,
  getScore,
  createScore,
  updateScore,
  deleteScore
};

