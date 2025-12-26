const Score = require('../models/Score');
const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');
const { emitScoreUpdate } = require('../utils/socket');

// Get aggregated scores for a match
const getMatchScores = async (matchId) => {
  try {
    const scores = await Score.find({ match_id: matchId })
      .populate('judge_id', 'user_id')
      .populate('participant_id');

    // Group by participant
    const participantScores = {};
    scores.forEach(score => {
      const participantId = score.participant_id._id.toString();
      if (!participantScores[participantId]) {
        participantScores[participantId] = {
          participant: score.participant_id,
          scores: [],
          average: 0
        };
      }
      participantScores[participantId].scores.push({
        judge: score.judge_id,
        technical_score: score.technical_score,
        performance_score: score.performance_score,
        final_score: score.final_score,
        comments: score.comments
      });
    });

    // Calculate averages
    Object.keys(participantScores).forEach(participantId => {
      const scores = participantScores[participantId].scores;
      const sum = scores.reduce((acc, s) => acc + s.final_score, 0);
      participantScores[participantId].average = scores.length > 0 ? sum / scores.length : 0;
    });

    return participantScores;
  } catch (error) {
    throw error;
  }
};

// Submit score and emit update
const submitScore = async (matchId, participantId, judgeId, scoreData) => {
  try {
    const finalScore = (scoreData.technical_score + scoreData.performance_score) / 2;

    let score = await Score.findOne({
      match_id: matchId,
      participant_id: participantId,
      judge_id: judgeId
    });

    if (score) {
      score.technical_score = scoreData.technical_score;
      score.performance_score = scoreData.performance_score;
      score.final_score = finalScore;
      score.comments = scoreData.comments;
      score.scored_at = new Date();
      await score.save();
    } else {
      score = await Score.create({
        match_id: matchId,
        participant_id: participantId,
        judge_id: judgeId,
        ...scoreData,
        final_score: finalScore
      });
    }

    // Emit real-time update
    const match = await Match.findById(matchId);
    emitScoreUpdate(matchId, {
      matchId,
      tournamentId: match.tournament_id,
      participantId,
      score: score.toObject()
    });

    return score;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getMatchScores,
  submitScore
};

