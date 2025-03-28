const express = require('express');
const router = express.Router();
const { 
  testConnection,
  getSheetIdForCategory,
  importTeams,
  importMatches,
  syncToSheets,
  syncAllCategories
} = require('../controllers/googleSheetsController');
const { protect, authorize } = require('../middleware/auth');

// Rotte pubbliche (solo per test)
router.get('/test-connection/:spreadsheetId', testConnection);
router.get('/category/:category', getSheetIdForCategory);

// Rotte protette
router.post('/import-teams', protect, authorize('admin', 'super_admin'), importTeams);
router.post('/import-matches', protect, authorize('admin', 'super_admin'), importMatches);
router.post('/sync-to-sheets', protect, authorize('admin', 'super_admin'), syncToSheets);
router.post('/sync-all-categories', protect, authorize('admin', 'super_admin'), syncAllCategories);

module.exports = router;