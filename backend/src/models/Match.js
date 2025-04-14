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
    required: function() {return !this.isGoldenSet;},
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
  teamACode: {
    type: String,
    enum: ['A', 'B', 'G'],
    default: 'A',
  },
  teamBCode: {
    type: String,
    enum: ['A', 'B', 'G'],
    default: 'A',
  },

  // Risultati ufficiali inseriti dai delegati
  officialScoreA: {
    type: [String],
    default: [],
  },
  officialScoreB: {
    type: [String],
    default: [],
  },
  officialResult: {
    type: String,
    enum: ['pending', 'teamA', 'teamB', 'draw'],
    default: 'pending',
  },

  // Risultati inseriti dagli utenti
  userScoreA: {
    type: [String],
    default: [],
  },
  userScoreB: {
    type: [String],
    default: [],
  },
  userResult: {
    type: String,
    enum: ['pending', 'teamA', 'teamB', 'draw'],
    default: 'pending',
  },

  confirmedByTeamA: {
    type: Boolean,
    default: false,
  },
  confirmedByTeamB: {
    type: Boolean,
    default: false,
  },

  category: {
    type: String,
    required: true,
  },
  isGoldenSet: {
    type: Boolean,
    default: false,
  },
  relatedMatchId: {
    type: String,
    required: false,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  spreadsheetRow: {
    type: Number,
    required: true,
  },
  sheetName: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Metodo per verificare se un match è un golden set
MatchSchema.methods.isGolden = function() {
  return this.isGoldenSet || this.teamACode === 'G' || this.teamBCode === 'G';
};

// Metodo per ottenere il punteggio ufficiale formattato
MatchSchema.methods.getFormattedOfficialScore = function() {
  if (!this.officialScoreA.length || !this.officialScoreB.length) {
    return 'N/A';
  }

  return this.officialScoreA.map((a, i) => `${a}-${this.officialScoreB[i]}`).join(', ');
};

// Metodo per ottenere il punteggio utente formattato
MatchSchema.methods.getFormattedUserScore = function() {
  if (!this.userScoreA.length || !this.userScoreB.length) {
    return 'N/A';
  }

  return this.userScoreA.map((a, i) => `${a}-${this.userScoreB[i]}`).join(', ');
};

module.exports = mongoose.model('Match', MatchSchema);