const Match = require('../models/Match');
const MatchParticipant = require('../models/MatchParticipant');
const Score = require('../models/Score');
const TournamentResult = require('../models/TournamentResult');
const { emitMatchStatusUpdate } = require('../utils/socket');

// Calculate match winner based on scores
const calculateMatchWinner = async (matchId) => {
  try {
    const match = await Match.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const participants = await MatchParticipant.find({ match_id: matchId });
    const scores = await Score.find({ match_id: matchId });

    // Group scores by participant
    const participantScores = {};
    scores.forEach(score => {
      if (!participantScores[score.participant_id]) {
        participantScores[score.participant_id] = [];
      }
      participantScores[score.participant_id].push(score.final_score);
    });

    // Calculate average scores
    const participantAverages = {};
    Object.keys(participantScores).forEach(participantId => {
      const scores = participantScores[participantId];
      const sum = scores.reduce((a, b) => a + b, 0);
      participantAverages[participantId] = sum / scores.length;
    });

    // Find winner (highest average score)
    let winnerId = null;
    let highestScore = 0;
    Object.keys(participantAverages).forEach(participantId => {
      if (participantAverages[participantId] > highestScore) {
        highestScore = participantAverages[participantId];
        winnerId = participantId;
      }
    });

    // Update match with winner
    if (winnerId) {
      const winnerParticipant = await MatchParticipant.findById(winnerId);
      match.winner_id = winnerParticipant.participant_type === 'Individual' 
        ? winnerParticipant.player_id 
        : null;
      match.status = 'Completed';
      match.completed_at = new Date();
      await match.save();

      // Update participant results
      await MatchParticipant.updateMany(
        { match_id: matchId },
        { 
          result: { $cond: [{ $eq: ['$_id', winnerId] }, 'Win', 'Loss'] }
        }
      );

      // Emit real-time update
      emitMatchStatusUpdate(matchId, match.tournament_id, {
        matchId,
        status: 'Completed',
        winnerId: match.winner_id
      });
    }

    return {
      winnerId,
      scores: participantAverages
    };
  } catch (error) {
    throw error;
  }
};

// Generate match schedule
const generateMatchSchedule = async (categoryId) => {
  try {
    const category = await TournamentCategory.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // This is a simplified schedule generation
    // In production, this would be more complex with proper bracket logic
    const matches = await Match.find({ category_id: categoryId })
      .sort({ scheduled_time: 1 });

    return matches;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  calculateMatchWinner,
  generateMatchSchedule
};

