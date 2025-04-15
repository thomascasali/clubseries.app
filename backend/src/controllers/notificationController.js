const Notification = require('../models/Notification');
const logger = require('../config/logger');

// @desc    Ottieni tutte le notifiche dell'utente corrente
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('team', 'name category')
      .populate('match', 'matchId date time teamA teamB')
      .sort({ createdAt: -1 });
    
    // Conversione sicura dei matchId
    const safeNotifications = notifications.map(notification => {
      const notificationObj = notification.toObject();
      // Assicurati che l'ID del match sia correttamente convertito in stringa
      if (notificationObj.match && notificationObj.match._id) {
        notificationObj.match._id = notificationObj.match._id.toString();
      }
      return notificationObj;
    });
    
    res.status(200).json(safeNotifications);
  } catch (error) {
    const errorInfo = {
      file: 'notificationController.js',
      function: 'getNotifications',
      error: error.message
    };
    logger.error(`Error in getNotifications: ${error.message}`, errorInfo);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Segna una notifica come letta
// @route   PUT /api/notifications/:id
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notifica non trovata' });
    }
    
    // Verifica che la notifica appartenga all'utente
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json({ message: 'Notifica segnata come letta' });
  } catch (error) {
    logger.error(`Error in markAsRead: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Segna tutte le notifiche come lette
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    
    res.status(200).json({ message: 'Tutte le notifiche segnate come lette' });
  } catch (error) {
    logger.error(`Error in markAllAsRead: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Elimina una notifica
// @route   DELETE /api/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notifica non trovata' });
    }
    
    // Verifica che la notifica appartenga all'utente
    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorizzato' });
    }
    
    await notification.deleteOne();
    
    res.status(200).json({ message: 'Notifica eliminata' });
  } catch (error) {
    logger.error(`Error in deleteNotification: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Elimina tutte le notifiche dell'utente corrente
// @route   DELETE /api/notifications/delete-all
// @access  Private
exports.deleteAllNotifications = async (req, res) => {
  try {
    const notificationService = require('../services/notificationService');
    
    const result = await notificationService.deleteAllUserNotifications(req.user._id);
    
    res.status(200).json({
      message: 'Tutte le notifiche sono state eliminate',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error(`Error in deleteAllNotifications: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};