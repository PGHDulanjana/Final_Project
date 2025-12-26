const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  bot_response: {
    type: String,
    maxlength: 2000,
    default: null
  },
  message_type: {
    type: String,
    required: true,
    enum: ['Text', 'Image', 'File', 'System'],
    default: 'Text'
  },
  is_resolved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient querying
chatMessageSchema.index({ sender_id: 1, receiver_id: 1, created_at: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

