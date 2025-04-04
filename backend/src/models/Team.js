const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Serie A Femminile',
      'Serie B Femminile',
      'Serie A Maschile',
      'Serie B Maschile',
      'Eccellenza F',
      'Eccellenza M',
      'Amatoriale F',
      'Amatoriale M',
      'Over 35 F',
      'Over 40 F',
      'Over 43 M',
      'Over 50 M',
      'Under 21 F',
      'Under 21 M'
    ],
  },
  spreadsheetId: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  players: [{
    name: String,
    surname: String,
  }],
  subscriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema);
