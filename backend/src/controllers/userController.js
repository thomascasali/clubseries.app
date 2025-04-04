const User = require('../models/User');
const Team = require('../models/Team');
const logger = require('../config/logger');
const fcmService = require('../services/fcmService');

// @desc    Ottenere tutti gli utenti
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json(users);
  } catch (error) {
    logger.error(`Error in getUsers: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ottenere un utente specifico
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    logger.error(`Error in getUserById: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Aggiornare un utente
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, role, isActive } = req.body;

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    
    // Solo gli admin possono modificare ruolo e stato attivazione
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      user.role = role || user.role;
      user.isActive = isActive !== undefined ? isActive : user.isActive;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    logger.error(`Error in updateUser: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Eliminare un utente
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utente non trovato' });
    }

    await user.deleteOne();
    
    res.status(200).json({ message: 'Utente rimosso' });
  } catch (error) {
    logger.error(`Error in deleteUser: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Iscriversi a notifiche per una squadra
// @route   POST /api/users/subscribe
// @access  Private
exports.subscribeToTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    
    // Verificare se la squadra esiste
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Squadra non trovata' });
    }

    const user = await User.findById(req.user._id);
    
    // Verificare se l'utente è già iscritto alla squadra
    if (user.subscribedTeams.includes(teamId)) {
      return res.status(400).json({ message: 'Già iscritto a questa squadra' });
    }

    // Aggiungere la squadra alle iscrizioni dell'utente
    user.subscribedTeams.push(teamId);
    await user.save();

    // Aggiungere l'utente alle sottoscrizioni della squadra
    if (!team.subscriptions.includes(user._id)) {
      team.subscriptions.push(user._id);
      await team.save();
    }

    res.status(200).json({ 
      message: 'Iscrizione alle notifiche effettuata con successo',
      team: {
        _id: team._id,
        name: team.name,
        category: team.category
      }
    });
  } catch (error) {
    logger.error(`Error in subscribeToTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Annullare iscrizione alle notifiche di una squadra
// @route   POST /api/users/unsubscribe
// @access  Private
exports.unsubscribeFromTeam = async (req, res) => {
  try {
    const { teamId } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Verificare se l'utente è iscritto alla squadra
    if (!user.subscribedTeams.includes(teamId)) {
      return res.status(400).json({ message: 'Non iscritto a questa squadra' });
    }

    // Rimuovere la squadra dalle iscrizioni dell'utente
    user.subscribedTeams = user.subscribedTeams.filter(
      id => id.toString() !== teamId
    );
    await user.save();

    // Rimuovere l'utente dalle sottoscrizioni della squadra
    const team = await Team.findById(teamId);
    if (team) {
      team.subscriptions = team.subscriptions.filter(
        id => id.toString() !== user._id.toString()
      );
      await team.save();
    }

    res.status(200).json({ message: 'Iscrizione rimossa con successo' });
  } catch (error) {
    logger.error(`Error in unsubscribeFromTeam: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Ottenere le squadre a cui l'utente è iscritto
// @route   GET /api/users/subscriptions
// @access  Private
exports.getSubscribedTeams = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('subscribedTeams', 'name category');
    
    res.status(200).json(user.subscribedTeams);
  } catch (error) {
    logger.error(`Error in getSubscribedTeams: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Registra un token FCM per l'utente corrente
// @route   POST /api/users/fcm-token
// @access  Private
exports.registerFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token FCM richiesto' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Aggiungi il token solo se non è già presente
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }
    
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
      
      // Iscrivilo ai topic per le squadre a cui è iscritto
      if (user.subscribedTeams && user.subscribedTeams.length > 0) {
        for (const teamId of user.subscribedTeams) {
          try {
            await fcmService.subscribeToTopic(token, `team_${teamId}`);
          } catch (topicError) {
            logger.error(`Error subscribing token to topic team_${teamId}: ${topicError.message}`);
          }
        }
      }
      
      logger.info(`FCM token registered for user ${user._id}`);
    }
    
    res.status(200).json({ 
      message: 'Token FCM registrato con successo',
      tokensCount: user.fcmTokens.length
    });
  } catch (error) {
    logger.error(`Error registering FCM token: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Rimuove un token FCM dell'utente corrente
// @route   DELETE /api/users/fcm-token
// @access  Private
exports.removeFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token FCM richiesto' });
    }
    
    const user = await User.findById(req.user._id);
    
    // Rimuovi il token se presente
    if (user.fcmTokens && user.fcmTokens.includes(token)) {
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();
      
      // Disiscrivilo dai topic delle squadre
      if (user.subscribedTeams && user.subscribedTeams.length > 0) {
        for (const teamId of user.subscribedTeams) {
          try {
            await fcmService.unsubscribeFromTopic(token, `team_${teamId}`);
          } catch (topicError) {
            logger.error(`Error unsubscribing token from topic team_${teamId}: ${topicError.message}`);
          }
        }
      }
      
      logger.info(`FCM token removed for user ${user._id}`);
    }
    
    res.status(200).json({ 
      message: 'Token FCM rimosso con successo',
      tokensCount: user.fcmTokens ? user.fcmTokens.length : 0
    });
  } catch (error) {
    logger.error(`Error removing FCM token: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Invia una notifica di test all'utente corrente
// @route   POST /api/users/test-notification
// @access  Private
exports.testNotification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return res.status(400).json({ 
        message: 'Nessun token FCM registrato per questo utente' 
      });
    }
    
    const notification = {
      title: 'Notifica di test',
      body: 'Questa è una notifica di test dal Club Series'
    };
    
    const data = {
      type: 'test',
      timestamp: new Date().toISOString()
    };
    
    const result = await fcmService.sendToDevices(user.fcmTokens, notification, data);
    
    res.status(200).json({ 
      message: `Notifica inviata con successo a ${result.successCount} dispositivi`,
      failedCount: result.failureCount
    });
  } catch (error) {
    logger.error(`Error sending test notification: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};
