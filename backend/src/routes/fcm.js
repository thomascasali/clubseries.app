const express = require('express');
const router = express.Router();
const { 
  registerToken, 
  unregisterToken,
  subscribeToTeam,
  unsubscribeFromTeam
} = require('../controllers/fcmController');
const { protect } = require('../middleware/auth');

router.post('/register', protect, registerToken);
router.post('/unregister', protect, unregisterToken);
router.post('/subscribe-team', protect, subscribeToTeam);
router.post('/unsubscribe-team', protect, unsubscribeFromTeam);

module.exports = router;