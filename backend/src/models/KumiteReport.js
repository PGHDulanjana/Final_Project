const mongoose = require('mongoose');

const kumiteReportSchema = new mongoose.Schema({
  tournament_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentCategory',
    required: true
  },
  report_data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
    // Structure:
    // {
    //   tournament_name: String,
    //   category_name: String,
    //   generated_at: Date,
    //   rounds: [
    //     {
    //       round_name: String (Preliminary, Quarterfinal, Semifinal, Final, Bronze),
    //       matches: [
    //         {
    //           match_id: ObjectId,
    //           match_name: String,
    //           scheduled_time: Date,
    //           status: String,
    //           participants: [
    //             {
    //               player_id: ObjectId,
    //               player_name: String,
    //               belt_rank: String,
    //               dojo_name: String,
    //               is_winner: Boolean,
    //               score: { technical_score, performance_score, ippon, waza_ari, etc }
    //             }
    //           ],
    //           winner: { player_id, player_name, etc }
    //         }
    //       ],
    //       advanced_players: [ { player_id, player_name, etc } ] // Players who advanced to next round
    //     }
    //   ],
    //   final_rankings: [
    //     { place: 1, player_id, player_name, medal: 'Gold' },
    //     { place: 2, player_id, player_name, medal: 'Silver' },
    //     { place: 3, player_id, player_name, medal: 'Bronze' },
    //     { place: 3, player_id, player_name, medal: 'Bronze' }
    //   ]
    // }
  },
  is_published: {
    type: Boolean,
    default: false
  },
  published_at: {
    type: Date,
    default: null
  },
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure one report per category (can be updated when regenerated)
kumiteReportSchema.index({ category_id: 1 }, { unique: true });

module.exports = mongoose.model('KumiteReport', kumiteReportSchema);

