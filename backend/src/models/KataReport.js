const mongoose = require('mongoose');

const kataReportSchema = new mongoose.Schema({
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
    //       round_name: String,
    //       players: [
    //         {
    //           player_id: ObjectId,
    //           player_name: String,
    //           belt_rank: String,
    //           dojo_name: String,
    //           final_score: Number,
    //           place: Number (for Final 4),
    //           scores: [{ judge_name: String, score: Number }]
    //         }
    //       ]
    //     }
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
// Using unique index allows findOneAndUpdate to work correctly
kataReportSchema.index({ category_id: 1 }, { unique: true });

module.exports = mongoose.model('KataReport', kataReportSchema);

