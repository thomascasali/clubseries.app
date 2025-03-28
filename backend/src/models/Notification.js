const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
  },
  type: {
    type: String,
    enum: ['match_scheduled', 'match_updated', 'result_entered', 'result_confirmed', 'result_rejected'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  read: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
  },
  errorDetails: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
