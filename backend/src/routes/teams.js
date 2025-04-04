const express = require('express');
const router = express.Router();
const { 
  getTeams, 
  getTeamsByCategory, 
  getTeamById, 
  createTeam, 
  updateTeam, 
  deleteTeam 
} = require('../controllers/teamController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getTeams);
router.get('/category/:category', getTeamsByCategory);
router.get('/:id', getTeamById);
router.post('/', protect, authorize('admin', 'super_admin'), createTeam);
router.put('/:id', protect, authorize('admin', 'super_admin'), updateTeam);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteTeam);

module.exports = router;
