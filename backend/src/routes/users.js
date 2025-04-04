const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser,
  subscribeToTeam,
  unsubscribeFromTeam,
  getSubscribedTeams,
  registerFcmToken,
  removeFcmToken,
  testNotification
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin', 'super_admin'), getUsers);
router.get('/subscriptions', protect, getSubscribedTeams);
router.post('/subscribe', protect, subscribeToTeam);
router.post('/unsubscribe', protect, unsubscribeFromTeam);
router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, removeFcmToken);
router.post('/test-notification', protect, testNotification);
router.get('/:id', protect, getUserById);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteUser);

module.exports = router;