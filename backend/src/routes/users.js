const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  subscribeToTeam,
  unsubscribeFromTeam,
  getSubscribedTeams
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'super_admin'), getUsers);
router.get('/subscriptions', protect, getSubscribedTeams);
router.post('/subscribe', protect, subscribeToTeam);
router.post('/unsubscribe', protect, unsubscribeFromTeam);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteUser);

module.exports = router;
