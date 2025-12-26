const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  registration_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration',
    required: false,
    default: null
  },
  tournament_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TournamentCategory',
    required: false
  },
  player_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: false
  },
  coach_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: false
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  transaction_method: {
    type: String,
    required: true,
    enum: ['Card', 'Bank Transfer', 'Cash', 'PayHere']
  },
  transaction_id: {
    type: String,
    required: true,
    unique: true
  },
  scheduled_time: {
    type: Date,
    default: Date.now
  },
  payment_status: {
    type: String,
    required: true,
    enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Refunded', 'Cancelled'],
    default: 'Pending'
  },
  payment_date: {
    type: Date,
    default: null
  },
  payment_gateway: {
    type: String,
    enum: ['PayHere', 'Manual', 'Other'],
    default: 'PayHere'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);

