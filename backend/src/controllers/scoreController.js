const Score = require('../models/Score');
const Match = require('../models/Match');
const MatchJudge = require('../models/MatchJudge');
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
// @access  Private/Judge or Organizer/Table Worker
const createScore = async (req, res, next) => {
  try {
    let judge = null;
    
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
        message: 'Only judges, organizers, or admins can submit scores'
      });
    }

    const { match_id, participant_id, technical_score, performance_score, yuko, ippon, waza_ari, chukoku, keikoku, hansoku_chui, hansoku, jogai } = req.body;

    // Verify match exists
    const match = await Match.findById(match_id).populate('category_id').populate('tournament_id');
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
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
      const tournamentOrganizerId = match.tournament_id?.organizer_id?._id || match.tournament_id?.organizer_id;
      if (String(tournamentOrganizerId) !== String(organizer._id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to submit scores for this tournament'
        });
      }
    }

    // Verify judge is assigned to this match (via MatchJudge)
    const matchJudge = await MatchJudge.findOne({
      match_id: match_id,
      judge_id: judge._id
    });

    if (!matchJudge) {
      return res.status(403).json({
        success: false,
        message: 'The selected judge is not assigned to this match. Only assigned judges can score matches.'
      });
    }

    // Calculate final score based on match type
    let final_score = 0;
    const isKumite = match.match_type === 'Kumite' || match.match_type === 'Team Kumite';
    
    if (isKumite) {
      // For Kumite: calculate from points and penalties
      // Yuko = 1 point, Waza-ari = 2 points, Ippon = 3 points
      const points = ((yuko || 0) * 1) + ((waza_ari || 0) * 2) + ((ippon || 0) * 3);
      const penaltyDeduction = ((chukoku || 0) * 0.5) + 
                               ((keikoku || 0) * 1) + 
                               ((hansoku_chui || 0) * 1.5) + 
                               ((hansoku || 0) * 2) +
                               ((jogai || 0) * 0.25);
      final_score = Math.max(0, Math.min(10, points - penaltyDeduction));
    } else {
      // For Kata: average of technical and performance
      final_score = (parseFloat(technical_score) + parseFloat(performance_score)) / 2;
    }

    // Check if score already exists
    let score = await Score.findOne({
      match_id,
      participant_id,
      judge_id: judge._id
    });

    // Prepare score data
    const scoreData = {
      match_id,
      participant_id,
      judge_id: judge._id,
      final_score,
      comments: req.body.comments || ''
    };

    if (isKumite) {
      // For Kumite: use calculated scores and include point/penalty details
      scoreData.technical_score = final_score; // Same as final for Kumite
      scoreData.performance_score = final_score; // Same as final for Kumite
      scoreData.yuko = yuko || 0;
      scoreData.waza_ari = waza_ari || 0;
      scoreData.ippon = ippon || 0;
      scoreData.chukoku = chukoku || 0;
      scoreData.keikoku = keikoku || 0;
      scoreData.hansoku_chui = hansoku_chui || 0;
      scoreData.hansoku = hansoku || 0;
      scoreData.jogai = jogai || 0;
    } else {
      // For Kata: use provided technical and performance scores
      const techScore = parseFloat(technical_score);
      const perfScore = parseFloat(performance_score);
      
      if (isNaN(techScore) || isNaN(perfScore) || techScore < 0 || techScore > 10 || perfScore < 0 || perfScore > 10) {
        return res.status(400).json({
          success: false,
          message: 'Technical and performance scores are required and must be between 0 and 10 for Kata matches'
        });
      }
      
      scoreData.technical_score = techScore;
      scoreData.performance_score = perfScore;
    }

    if (score) {
      // Update existing score
      Object.assign(score, scoreData);
      score.scored_at = new Date();
      await score.save();
    } else {
      // Create new score
      score = await Score.create(scoreData);
    }

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

