const User = require('../models/User');
const logger = require('../config/logger');
const fcmService = require('../services/fcmService');

// @desc    Registra un token FCM per l'utente
// @route   POST /api/fcm/register
// @access  Private
exports.registerToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token FCM mancante' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Verifica se il token esiste già
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
      
      // Sottoscrivi il token ai topic delle squadre seguite dall'utente
      if (user.subscribedTeams && user.subscribedTeams.length > 0) {
        try {
          for (const teamId of user.subscribedTeams) {
            await fcmService.subscribeToTopic(token, `team_${teamId}`);
          }
          logger.info(`FCM token subscribed to ${user.subscribedTeams.length} team topics`);
        } catch (topicError) {
          logger.error(`Error subscribing to team topics: ${topicError.message}`);
        }
      }
      
      logger.info(`FCM token registered for user ${user._id}`);
    }
    
    res.status(200).json({ message: 'Token FCM registrato con successo' });
  } catch (error) {
    logger.error(`Error in registerToken: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rimuove un token FCM per l'utente
// @route   POST /api/fcm/unregister
// @access  Private
exports.unregisterToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token FCM mancante' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Rimuovi il token se esiste
    if (user.fcmTokens.includes(token)) {
      // Disiscrivilo dai topic delle squadre
      if (user.subscribedTeams && user.subscribedTeams.length > 0) {
        try {
          for (const teamId of user.subscribedTeams) {
            await fcmService.unsubscribeFromTopic(token, `team_${teamId}`);
          }
        } catch (error) {
          logger.error(`Error unsubscribing from team topics: ${error.message}`);
        }
      }
      
      // Rimuovi dalla lista dei token
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();
      
      logger.info(`FCM token unregistered for user ${user._id}`);
    }
    
    res.status(200).json({ message: 'Token FCM rimosso con successo' });
  } catch (error) {
    logger.error(`Error in unregisterToken: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Quando un utente si iscrive a una squadra, lo iscrive anche ai topic FCM
// @route   POST /api/fcm/subscribe-team
// @access  Private
exports.subscribeToTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ message: 'ID squadra mancante' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Se l'utente ha token FCM, iscrivili al topic della squadra
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      try {
        await fcmService.subscribeToTopic(user.fcmTokens, `team_${teamId}`);
        logger.info(`User ${user._id} FCM tokens subscribed to team topic ${teamId}`);
      } catch (error) {
        logger.error(`Error subscribing to team topic: ${error.message}`);
      }
    }
    
    res.status(200).json({ message: 'Iscrizione al topic FCM completata' });
  } catch (error) {
    logger.error(`Error in subscribeToTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Quando un utente si disiscrive da una squadra, lo disiscrive anche dai topic FCM
// @route   POST /api/fcm/unsubscribe-team
// @access  Private
exports.unsubscribeFromTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ message: 'ID squadra mancante' });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    // Se l'utente ha token FCM, disiscrivili dal topic della squadra
    if (user.fcmTokens && user.fcmTokens.length > 0) {
      try {
        await fcmService.unsubscribeFromTopic(user.fcmTokens, `team_${teamId}`);
        logger.info(`User ${user._id} FCM tokens unsubscribed from team topic ${teamId}`);
      } catch (error) {
        logger.error(`Error unsubscribing from team topic: ${error.message}`);
      }
    }
    
    res.status(200).json({ message: 'Disiscrizione dal topic FCM completata' });
  } catch (error) {
    logger.error(`Error in unsubscribeFromTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};