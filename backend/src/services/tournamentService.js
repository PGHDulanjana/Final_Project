const Tournament = require('../models/Tournament');
const TournamentCategory = require('../models/TournamentCategory');
const Match = require('../models/Match');
const Registration = require('../models/Registration');

// Generate tournament brackets
const generateBrackets = async (categoryId) => {
  try {
    const category = await TournamentCategory.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const registrations = await Registration.find({
      tournament_id: category.tournament_id,
      approval_status: 'Approved',
      payment_status: 'Paid'
    });

    // Simple bracket generation logic
    // This can be enhanced with more complex bracket algorithms
    const participants = registrations.length;
    const rounds = Math.ceil(Math.log2(participants));

    return {
      categoryId,
      participants,
      rounds,
      brackets: []
    };
  } catch (error) {
    throw error;
  }
};

// Get tournament statistics
const getTournamentStats = async (tournamentId) => {
  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const registrations = await Registration.countDocuments({
      tournament_id: tournamentId
    });

    const approvedRegistrations = await Registration.countDocuments({
      tournament_id: tournamentId,
      approval_status: 'Approved'
    });

    const paidRegistrations = await Registration.countDocuments({
      tournament_id: tournamentId,
      payment_status: 'Paid'
    });

    const categories = await TournamentCategory.countDocuments({
      tournament_id: tournamentId
    });

    const matches = await Match.countDocuments({
      tournament_id: tournamentId
    });

    const completedMatches = await Match.countDocuments({
      tournament_id: tournamentId,
      status: 'Completed'
    });

    return {
      totalRegistrations: registrations,
      approvedRegistrations,
      paidRegistrations,
      categories,
      matches,
      completedMatches,
      completionRate: matches > 0 ? (completedMatches / matches) * 100 : 0
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateBrackets,
  getTournamentStats
};

