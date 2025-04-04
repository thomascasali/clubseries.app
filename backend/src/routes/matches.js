const express = require('express');
const router = express.Router();
const { 
  getMatches, 
  getMatchById, 
  createMatch, 
  updateMatch,
  submitMatchResult,
  confirmMatchResult
} = require('../controllers/matchController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getMatches);
router.get('/:id', getMatchById);
router.post('/', protect, authorize('admin', 'super_admin'), createMatch);
router.put('/:id', protect, authorize('admin', 'super_admin'), updateMatch);
router.post('/:id/result', submitMatchResult);
router.post('/:id/confirm', confirmMatchResult);

module.exports = router;
