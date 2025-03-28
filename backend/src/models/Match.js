const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  matchId: {
    type: String,
    required: true,
    unique: true,
  },
  phase: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  court: {
    type: String,
    required: true,
  },
  teamA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  scoreA: {
    type: [String],
    default: [],
  },
  scoreB: {
    type: [String],
    default: [],
  },
  result: {
    type: String,
    enum: ['pending', 'teamA', 'teamB', 'draw'],
    default: 'pending',
  },
  category: {
    type: String,
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  confirmedByTeamA: {
    type: Boolean,
    default: false,
  },
  confirmedByTeamB: {
    type: Boolean,
    default: false,
  },
  spreadsheetRow: {
    type: Number,
  },
  sheetName: {
    type: String,
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Match', MatchSchema);