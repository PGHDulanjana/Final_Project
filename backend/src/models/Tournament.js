const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  tournament_name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 2000
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  venue_address: {
    type: String,
    required: true,
    trim: true
  },
  // Entry fees removed - fees are now set at category/match level
  rules: {
    type: String,
    maxlength: 5000
  },
  max_participants: {
    type: Number,
    min: 1
  },
  status: {
    type: String,
    required: true,
    enum: ['Draft', 'Open', 'Closed', 'Ongoing', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  registration_deadline: {
    type: Date,
    required: true
  },
  // Bank account details for organizer
  bank_account_holder_name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  bank_name: {
    type: String,
    trim: true,
    maxlength: 200
  },
  bank_account_number: {
    type: String,
    trim: true,
    maxlength: 50
  },
  bank_branch: {
    type: String,
    trim: true,
    maxlength: 200
  },
  bank_swift_code: {
    type: String,
    trim: true,
    maxlength: 20
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Tournament', tournamentSchema);

