const mongoose = require('mongoose');

const SheetTrackingSchema = new mongoose.Schema({
  spreadsheetId: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  lastChecked: {
    type: Date,
    default: Date.now,
  },
  lastModified: {
    type: Date,
  },
  matchesHash: {
    type: String,
  },
  resultsHash: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('SheetTracking', SheetTrackingSchema);