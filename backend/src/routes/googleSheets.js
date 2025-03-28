const express = require('express');
const router = express.Router();
const { 
  testConnection, 
  syncTeams, 
  syncMatches,
  syncResults,
  syncAll
} = require('../controllers/googleSheetsController');
const { protect, authorize } = require('../middleware/auth');

// Proteggere tutte le route con autenticazione e autorizzazione admin
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Route per testare la connessione
router.get('/test/:category', testConnection);

// Route per sincronizzare i team
router.post('/sync/teams/:category', syncTeams);

// Route per sincronizzare le partite
router.post('/sync/matches/:category', syncMatches);

// Route per sincronizzare i risultati
router.post('/sync/results/:category', syncResults);

// Route per sincronizzare tutto
router.post('/sync/all', syncAll);

module.exports = router;